"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import type { ChatMessage, FriendChatChannel } from "@/shared/api/types";
import { getFriendChannelsApi, getFriendMessagesApi, markFriendReadApi, openFriendChannelApi, sendFriendMessageApi } from "./api";
import { connectFriendChat } from "./realtime";

const PAGE_SIZE = 50;
const messageOf = (caught: unknown) => caught instanceof Error ? caught.message : "직접 채팅을 사용할 수 없습니다.";
const isBlocked = (caught: unknown) => caught instanceof ApiError && caught.status === 403 && caught.code === "SOC-403-CHAT-DIRECT-BLOCKED";
const blockedMessage = "이 대화는 차단되어 있습니다. 기존 메시지는 읽을 수 있습니다.";
const blockedOpenMessage = "차단된 대화를 열 수 없습니다. 기존 대화는 계속 이용할 수 있습니다.";
const dedupe = (items: ChatMessage[]) => Array.from(new Map(items.map((item) => [item.id, item])).values())
  .sort((a, b) => a.id - b.id);

export function useDirectChat(accountId?: number | null, playerId?: number | null) {
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<FriendChatChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [olderLoading, setOlderLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, { value: string; revision: number }>>({});
  const [sendingChannels, setSendingChannels] = useState<Set<number>>(() => new Set());
  const [blockedPeers, setBlockedPeers] = useState<Set<number>>(() => new Set());
  const [sendError, setSendError] = useState<string | null>(null);
  const [openingPeerId, setOpeningPeerId] = useState<number | null>(null);
  const [openError, setOpenError] = useState<{ peerPlayerId: number; message: string; blocked: boolean } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting" | "failed" | null>(null);
  const channelsRequest = useRef(0);
  const messagesRequest = useRef(0);
  const selectionIntent = useRef(0);
  const selectedRef = useRef<number | null>(null);
  const sendLocked = useRef(new Set<number>());
  const openLocked = useRef(false);
  const accountGeneration = useRef(0);
  const pendingKeys = useRef(new Map<number, { revision: number; content: string; key: string }>());
  const readTargets = useRef(new Map<number, number>());
  const readInFlight = useRef(new Set<number>());
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = channels.find(({ channelId }) => channelId === selectedChannelId);
  const draft = selectedChannelId === null ? "" : drafts[selectedChannelId]?.value ?? "";
  const channelIds = channels.map(({ channelId }) => channelId).join(",");

  const setDraft = useCallback((value: string) => {
    const channelId = selectedRef.current;
    if (channelId === null) return;
    setDrafts((current) => ({
      ...current,
      [channelId]: { value, revision: (current[channelId]?.revision ?? 0) + 1 },
    }));
  }, []);

  const reloadChannels = useCallback(async () => {
    const request = ++channelsRequest.current;
    const generation = accountGeneration.current;
    setChannelsLoading(true);
    try {
      const result = await getFriendChannelsApi();
      if (request !== channelsRequest.current || generation !== accountGeneration.current) return;
      setChannels((current) => result.map((channel) => {
        const prior = current.find(({ channelId }) => channelId === channel.channelId);
        return prior ? {
          ...channel,
          lastReadMessageId: Math.max(channel.lastReadMessageId ?? 0, prior.lastReadMessageId ?? 0) || null,
          peerLastReadMessageId: Math.max(channel.peerLastReadMessageId ?? 0, prior.peerLastReadMessageId ?? 0) || null,
        } : channel;
      }));
      setChannelsError(null);
      return result;
    } catch (caught) {
      if (request === channelsRequest.current && generation === accountGeneration.current) setChannelsError(messageOf(caught));
    } finally {
      if (request === channelsRequest.current && generation === accountGeneration.current) setChannelsLoading(false);
    }
  }, []);

  const loadLatest = useCallback(async (channelId: number) => {
    const request = ++messagesRequest.current;
    const generation = accountGeneration.current;
    setOlderLoading(false);
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const page = await getFriendMessagesApi(channelId, null, PAGE_SIZE);
      if (request !== messagesRequest.current || selectedRef.current !== channelId || generation !== accountGeneration.current) return;
      setMessages((current) => dedupe([...page.messages, ...current]));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      if (request === messagesRequest.current && selectedRef.current === channelId && generation === accountGeneration.current) setMessagesError(messageOf(caught));
    } finally {
      if (request === messagesRequest.current && selectedRef.current === channelId && generation === accountGeneration.current) setMessagesLoading(false);
    }
  }, []);

  const selectChannel = useCallback(async (channelId: number) => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = null;
    readTargets.current.clear();
    selectionIntent.current += 1;
    selectedRef.current = channelId;
    setSelectedChannelId(channelId);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setOlderLoading(false);
    setSendError(null);
    setOpenError(null);
    await loadLatest(channelId);
  }, [loadLatest]);

  const loadOlder = useCallback(async () => {
    const channelId = selectedRef.current;
    if (channelId === null || nextCursor === null || olderLoading) return;
    const cursor = nextCursor;
    const request = ++messagesRequest.current;
    const generation = accountGeneration.current;
    setOlderLoading(true);
    setMessagesError(null);
    try {
      const page = await getFriendMessagesApi(channelId, cursor, PAGE_SIZE);
      if (request !== messagesRequest.current || selectedRef.current !== channelId || generation !== accountGeneration.current) return;
      setMessages((current) => dedupe([...page.messages, ...current]));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      if (request === messagesRequest.current && selectedRef.current === channelId && generation === accountGeneration.current) setMessagesError(messageOf(caught));
    } finally {
      if (request === messagesRequest.current && selectedRef.current === channelId && generation === accountGeneration.current) setOlderLoading(false);
    }
  }, [nextCursor, olderLoading]);

  const openFriendChat = useCallback(async (peerPlayerId: number) => {
    if (accountId === null) return;
    setOpen(true);
    if (openLocked.current) return;
    const intent = selectionIntent.current;
    const generation = accountGeneration.current;
    openLocked.current = true;
    setOpeningPeerId(peerPlayerId);
    setOpenError(null);
    try {
      const opened = await openFriendChannelApi(peerPlayerId);
      const canonical = await reloadChannels();
      if (generation !== accountGeneration.current) return;
      if (!canonical?.some(({ channelId }) => channelId === opened.id)) throw new Error("친구 대화를 불러올 수 없습니다.");
      if (selectionIntent.current !== intent || generation !== accountGeneration.current) return;
      await selectChannel(opened.id);
    } catch (caught) {
      const blocked = isBlocked(caught);
      if (generation !== accountGeneration.current) return;
      if (blocked) setBlockedPeers((current) => new Set(current).add(peerPlayerId));
      if (selectionIntent.current !== intent) return;
      setOpenError({ peerPlayerId, message: blocked ? blockedOpenMessage : messageOf(caught), blocked });
    } finally {
      if (generation === accountGeneration.current) {
        openLocked.current = false;
        setOpeningPeerId(null);
      }
    }
  }, [accountId, reloadChannels, selectChannel]);

  const send = useCallback(async (retryBlocked = false) => {
    if (accountId === null) return false;
    const channelId = selectedRef.current;
    const generation = accountGeneration.current;
    const selected = channels.find((channel) => channel.channelId === channelId);
    const currentDraft = channelId === null ? undefined : drafts[channelId];
    const content = currentDraft?.value.trim();
    if (channelId === null || !currentDraft || !content || !selected || selected.readOnly || sendLocked.current.has(channelId) || (blockedPeers.has(selected.peer.playerId) && !retryBlocked)) return false;
    sendLocked.current.add(channelId);
    setSendingChannels((current) => new Set(current).add(channelId));
    setSendError(null);
    try {
      const previous = pendingKeys.current.get(channelId);
      const pending = previous?.revision === currentDraft.revision && previous.content === content
        ? previous : { revision: currentDraft.revision, content, key: crypto.randomUUID() };
      pendingKeys.current.set(channelId, pending);
      const saved = await sendFriendMessageApi(channelId, content, pending.key);
      if (generation !== accountGeneration.current) return false;
      if (pendingKeys.current.get(channelId) === pending) pendingKeys.current.delete(channelId);
      setBlockedPeers((current) => { const next = new Set(current); next.delete(selected.peer.playerId); return next; });
      setDrafts((current) => {
        if (current[channelId]?.revision !== currentDraft.revision) return current;
        const next = { ...current };
        delete next[channelId];
        return next;
      });
      if (selectedRef.current === channelId) {
        setMessages((current) => dedupe([...current, saved]));
      }
      return true;
    } catch (caught) {
      if (generation !== accountGeneration.current) return false;
      const blocked = isBlocked(caught);
      const error = blocked ? blockedMessage : messageOf(caught);
      if (blocked) setBlockedPeers((current) => new Set(current).add(selected.peer.playerId));
      else {
        try {
          const latest = await getFriendMessagesApi(channelId, null, PAGE_SIZE);
          if (selectedRef.current === channelId && generation === accountGeneration.current) {
            setMessages((current) => dedupe([...current, ...latest.messages]));
          }
        } catch {
          // The original send error remains authoritative; the draft and history stay intact.
        }
      }
      if (selectedRef.current === channelId && generation === accountGeneration.current) setSendError(error);
      return false;
    } finally {
      if (generation === accountGeneration.current) {
        sendLocked.current.delete(channelId);
        setSendingChannels((current) => { const next = new Set(current); next.delete(channelId); return next; });
      }
    }
  }, [accountId, blockedPeers, channels, drafts]);

  const markVisibleRead = useCallback((messageId: number) => {
    const channelId = selectedRef.current;
    if (channelId === null || !open || document.hidden || accountId === null) return;
    const current = channels.find((item) => item.channelId === channelId)?.lastReadMessageId ?? 0;
    if (messageId <= Math.max(current, readTargets.current.get(channelId) ?? 0)) return;
    readTargets.current.set(channelId, messageId);
    if (readTimer.current) clearTimeout(readTimer.current);
    const generation = accountGeneration.current;
    const flush = async () => {
      readTimer.current = null;
      if (generation !== accountGeneration.current || selectedRef.current !== channelId || !open || document.hidden) {
        readTargets.current.delete(channelId);
        return;
      }
      if (readInFlight.current.has(channelId)) {
        readTimer.current = setTimeout(flush, 250);
        return;
      }
      const target = readTargets.current.get(channelId);
      if (!target) return;
      readInFlight.current.add(channelId);
      try {
        await markFriendReadApi(channelId, target);
        if (generation !== accountGeneration.current) return;
        setChannels((currentChannels) => currentChannels.map((item) => item.channelId === channelId
          ? { ...item, lastReadMessageId: Math.max(item.lastReadMessageId ?? 0, target) }
          : item));
        void reloadChannels();
      } catch {
        if (readTargets.current.get(channelId) === target) readTargets.current.delete(channelId);
      } finally {
        readInFlight.current.delete(channelId);
      }
    };
    readTimer.current = setTimeout(flush, 250);
  }, [accountId, channels, open, reloadChannels]);

  useEffect(() => {
    const channelId = selectedChannelId;
    if (!open || accountId == null || !channelIds) return;
    const generation = accountGeneration.current;
    let stopped = false;
    let recoveryId = 0;
    const recover = async () => {
      if (channelId === null) return;
      const currentRecovery = ++recoveryId;
      const live = () => !stopped && currentRecovery === recoveryId && generation === accountGeneration.current && selectedRef.current === channelId;
      let cursor: number | null = null;
      for (;;) {
        try {
          const page = await getFriendMessagesApi(channelId, cursor, PAGE_SIZE);
          if (!live()) return;
          setMessages((current) => dedupe([...page.messages, ...current]));
          if (!page.hasMore) break;
          if (page.nextCursor === null || (cursor !== null && page.nextCursor >= cursor)) {
            setConnectionStatus("failed");
            return;
          }
          cursor = page.nextCursor;
        } catch {
          if (live()) setConnectionStatus("failed");
          return;
        }
      }
      try {
        const fresh = await getFriendMessagesApi(channelId, null, PAGE_SIZE);
        if (!live()) return;
        messagesRequest.current += 1;
        setMessages((current) => dedupe([...fresh.messages, ...current]));
        setMessagesLoading(false);
        setOlderLoading(false);
        setHasMore(false);
        setNextCursor(null);
        void reloadChannels();
      } catch {
        if (live()) setConnectionStatus("failed");
      }
    };
    const disconnect = connectFriendChat(channelIds.split(",").map(Number), (event) => {
      if (generation !== accountGeneration.current) return;
      if (event.eventType === "MESSAGE_CREATED") {
        if (event.channelId === selectedRef.current) setMessages((current) => dedupe([...current, event]));
      } else if (event.playerId === playerId) {
        setChannels((current) => current.map((item) => item.channelId === event.channelId
          ? { ...item, lastReadMessageId: Math.max(item.lastReadMessageId ?? 0, event.lastReadMessageId) } : item));
      } else {
        setChannels((current) => current.map((item) => item.channelId === event.channelId
          ? { ...item, peerLastReadMessageId: Math.max(item.peerLastReadMessageId ?? 0, event.lastReadMessageId) } : item));
      }
      void reloadChannels();
    }, setConnectionStatus, () => { void recover(); });
    return () => { stopped = true; recoveryId += 1; disconnect(); };
  }, [accountId, channelIds, open, playerId, reloadChannels, selectedChannelId]);

  useEffect(() => {
    accountGeneration.current += 1;
    channelsRequest.current += 1;
    messagesRequest.current += 1;
    selectionIntent.current += 1;
    selectedRef.current = null;
    sendLocked.current.clear();
    openLocked.current = false;
    pendingKeys.current.clear();
    readTargets.current.clear();
    readInFlight.current.clear();
    if (readTimer.current) clearTimeout(readTimer.current);
    setOpen(false);
    setChannels([]);
    setChannelsLoading(false);
    setChannelsError(null);
    setSelectedChannelId(null);
    setMessages([]);
    setMessagesLoading(false);
    setMessagesError(null);
    setHasMore(false);
    setNextCursor(null);
    setOlderLoading(false);
    setDrafts({});
    setSendingChannels(new Set());
    setBlockedPeers(new Set());
    setSendError(null);
    setOpeningPeerId(null);
    setOpenError(null);
    setConnectionStatus(null);
    if (accountId !== null) void reloadChannels();
  }, [accountId, reloadChannels]);

  useEffect(() => { if (open && openingPeerId === null && accountId != null) void reloadChannels(); }, [accountId, open, openingPeerId, reloadChannels]);

  return {
    open,
    setOpen,
    channels,
    channelsLoading,
    channelsError,
    channelsRetry: reloadChannels,
    selectedChannelId,
    selectChannel,
    messages,
    messagesLoading,
    messagesError,
    loadLatest: () => selectedRef.current === null ? Promise.resolve() : loadLatest(selectedRef.current),
    hasMore,
    nextCursor,
    olderLoading,
    loadOlder,
    draft,
    setDraft,
    sending: selectedChannelId !== null && sendingChannels.has(selectedChannelId),
    blocked: selected ? blockedPeers.has(selected.peer.playerId) : false,
    sendError,
    connectionStatus,
    markVisibleRead,
    send,
    retryBlockedSend: () => send(true),
    openingPeerId,
    openError,
    openFriendChat,
  };
}

export type DirectChatState = ReturnType<typeof useDirectChat>;
