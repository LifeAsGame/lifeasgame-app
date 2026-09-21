"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import type { ChatMessage, FriendChatChannel } from "@/shared/api/types";
import { getFriendChannelsApi, getFriendMessagesApi, openFriendChannelApi, sendFriendMessageApi } from "./api";

const PAGE_SIZE = 50;
const messageOf = (caught: unknown) => caught instanceof Error ? caught.message : "Direct Chat is unavailable.";
const isBlocked = (caught: unknown) => caught instanceof ApiError && caught.status === 403 && caught.code === "SOC-403-CHAT-DIRECT-BLOCKED";
const blockedMessage = "Direct Chat is blocked for this conversation. You can still read its messages.";
const blockedOpenMessage = "Could not open the requested Direct Chat because it is blocked. Existing conversations remain available.";
const dedupe = (items: ChatMessage[]) => Array.from(new Map(items.map((item) => [item.id, item])).values());

export function useDirectChat() {
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
  const [draft, setDraft] = useState("");
  const [sendingChannels, setSendingChannels] = useState<Set<number>>(() => new Set());
  const [blockedChannels, setBlockedChannels] = useState<Set<number>>(() => new Set());
  const [sendError, setSendError] = useState<string | null>(null);
  const [openingPeerId, setOpeningPeerId] = useState<number | null>(null);
  const [openError, setOpenError] = useState<{ peerPlayerId: number; message: string; blocked: boolean } | null>(null);
  const channelsRequest = useRef(0);
  const messagesRequest = useRef(0);
  const selectionIntent = useRef(0);
  const selectedRef = useRef<number | null>(null);
  const sendLocked = useRef(new Set<number>());
  const openLocked = useRef(false);

  const reloadChannels = useCallback(async () => {
    const request = ++channelsRequest.current;
    setChannelsLoading(true);
    try {
      const result = await getFriendChannelsApi();
      if (request !== channelsRequest.current) return;
      setChannels(result);
      setChannelsError(null);
      return result;
    } catch (caught) {
      if (request === channelsRequest.current) setChannelsError(messageOf(caught));
    } finally {
      if (request === channelsRequest.current) setChannelsLoading(false);
    }
  }, []);

  const loadLatest = useCallback(async (channelId: number) => {
    const request = ++messagesRequest.current;
    setOlderLoading(false);
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const page = await getFriendMessagesApi(channelId, null, PAGE_SIZE);
      if (request !== messagesRequest.current || selectedRef.current !== channelId) return;
      setMessages(dedupe(page.messages));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      if (request === messagesRequest.current && selectedRef.current === channelId) setMessagesError(messageOf(caught));
    } finally {
      if (request === messagesRequest.current && selectedRef.current === channelId) setMessagesLoading(false);
    }
  }, []);

  const selectChannel = useCallback(async (channelId: number) => {
    selectionIntent.current += 1;
    selectedRef.current = channelId;
    setSelectedChannelId(channelId);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setOlderLoading(false);
    setDraft("");
    setSendError(null);
    setOpenError(null);
    await loadLatest(channelId);
  }, [loadLatest]);

  const loadOlder = useCallback(async () => {
    const channelId = selectedRef.current;
    if (channelId === null || nextCursor === null || olderLoading) return;
    const cursor = nextCursor;
    const request = ++messagesRequest.current;
    setOlderLoading(true);
    setMessagesError(null);
    try {
      const page = await getFriendMessagesApi(channelId, cursor, PAGE_SIZE);
      if (request !== messagesRequest.current || selectedRef.current !== channelId) return;
      setMessages((current) => dedupe([...page.messages, ...current]));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      if (request === messagesRequest.current && selectedRef.current === channelId) setMessagesError(messageOf(caught));
    } finally {
      if (request === messagesRequest.current && selectedRef.current === channelId) setOlderLoading(false);
    }
  }, [nextCursor, olderLoading]);

  const openFriendChat = useCallback(async (peerPlayerId: number) => {
    setOpen(true);
    if (openLocked.current) return;
    const intent = selectionIntent.current;
    openLocked.current = true;
    setOpeningPeerId(peerPlayerId);
    setOpenError(null);
    try {
      const opened = await openFriendChannelApi(peerPlayerId);
      const canonical = await reloadChannels();
      if (!canonical?.some(({ channelId }) => channelId === opened.id)) throw new Error("The canonical friend channel is unavailable.");
      if (selectionIntent.current !== intent) return;
      await selectChannel(opened.id);
    } catch (caught) {
      const blocked = isBlocked(caught);
      const channelId = channels.find(({ peer }) => peer.playerId === peerPlayerId)?.channelId;
      if (blocked && channelId !== undefined) setBlockedChannels((current) => new Set(current).add(channelId));
      if (selectionIntent.current !== intent) return;
      setOpenError({ peerPlayerId, message: blocked ? blockedOpenMessage : messageOf(caught), blocked });
    } finally {
      openLocked.current = false;
      setOpeningPeerId(null);
    }
  }, [channels, reloadChannels, selectChannel]);

  const send = useCallback(async (retryBlocked = false) => {
    const channelId = selectedRef.current;
    const content = draft.trim();
    const selected = channels.find((channel) => channel.channelId === channelId);
    if (channelId === null || !content || !selected || selected.readOnly || sendLocked.current.has(channelId) || (blockedChannels.has(channelId) && !retryBlocked)) return false;
    sendLocked.current.add(channelId);
    setSendingChannels((current) => new Set(current).add(channelId));
    setSendError(null);
    try {
      const saved = await sendFriendMessageApi(channelId, content);
      setBlockedChannels((current) => { const next = new Set(current); next.delete(channelId); return next; });
      if (selectedRef.current === channelId) {
        setMessages((current) => dedupe([...current, saved]));
        setDraft("");
      }
      return true;
    } catch (caught) {
      const blocked = isBlocked(caught);
      const error = blocked ? blockedMessage : messageOf(caught);
      if (blocked) setBlockedChannels((current) => new Set(current).add(channelId));
      else {
        try {
          const latest = await getFriendMessagesApi(channelId, null, PAGE_SIZE);
          if (selectedRef.current === channelId) {
            setMessages((current) => dedupe([...current, ...latest.messages]));
          }
        } catch {
          // The original send error remains authoritative; the draft and history stay intact.
        }
      }
      if (selectedRef.current === channelId) setSendError(error);
      return false;
    } finally {
      sendLocked.current.delete(channelId);
      setSendingChannels((current) => { const next = new Set(current); next.delete(channelId); return next; });
    }
  }, [blockedChannels, channels, draft]);

  useEffect(() => { void reloadChannels(); }, [reloadChannels]);

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
    blocked: selectedChannelId !== null && blockedChannels.has(selectedChannelId),
    sendError,
    send,
    retryBlockedSend: () => send(true),
    openingPeerId,
    openError,
    openFriendChat,
  };
}

export type DirectChatState = ReturnType<typeof useDirectChat>;
