"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage, FriendChatChannel } from "@/shared/api/types";
import { getFriendChannelsApi, getFriendMessagesApi, openFriendChannelApi, sendFriendMessageApi } from "./api";

const PAGE_SIZE = 50;
const messageOf = (caught: unknown) => caught instanceof Error ? caught.message : "Direct Chat is unavailable.";
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
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [openingPeerId, setOpeningPeerId] = useState<number | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const channelsRequest = useRef(0);
  const messagesRequest = useRef(0);
  const selectedRef = useRef<number | null>(null);
  const sendLocked = useRef(false);
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
    selectedRef.current = channelId;
    setSelectedChannelId(channelId);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setOlderLoading(false);
    setDraft("");
    setSendError(null);
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
    openLocked.current = true;
    setOpeningPeerId(peerPlayerId);
    setOpenError(null);
    try {
      const opened = await openFriendChannelApi(peerPlayerId);
      const canonical = await reloadChannels();
      if (!canonical?.some(({ channelId }) => channelId === opened.id)) throw new Error("The canonical friend channel is unavailable.");
      await selectChannel(opened.id);
    } catch (caught) {
      setOpenError(messageOf(caught));
    } finally {
      openLocked.current = false;
      setOpeningPeerId(null);
    }
  }, [reloadChannels, selectChannel]);

  const send = useCallback(async () => {
    const channelId = selectedRef.current;
    const content = draft.trim();
    const selected = channels.find((channel) => channel.channelId === channelId);
    if (channelId === null || !content || !selected || selected.readOnly || sendLocked.current) return false;
    sendLocked.current = true;
    setSending(true);
    setSendError(null);
    try {
      const saved = await sendFriendMessageApi(channelId, content);
      if (selectedRef.current === channelId) {
        setMessages((current) => dedupe([...current, saved]));
        setDraft("");
      }
      return true;
    } catch (caught) {
      const error = messageOf(caught);
      try {
        const latest = await getFriendMessagesApi(channelId, null, PAGE_SIZE);
        if (selectedRef.current === channelId) {
          setMessages((current) => dedupe([...current, ...latest.messages]));
        }
      } catch {
        // The original send error remains authoritative; the draft and history stay intact.
      }
      if (selectedRef.current === channelId) setSendError(error);
      return false;
    } finally {
      sendLocked.current = false;
      setSending(false);
    }
  }, [channels, draft]);

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
    sending,
    sendError,
    send,
    openingPeerId,
    openError,
    openFriendChat,
  };
}

export type DirectChatState = ReturnType<typeof useDirectChat>;
