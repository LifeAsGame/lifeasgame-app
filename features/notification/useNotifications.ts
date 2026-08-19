"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificationInfo } from "@/shared/api/types";
import { getNotificationsApi, getUnreadCountApi, markAllNotificationsReadApi, markNotificationReadApi } from "./api";

const PAGE_SIZE = 20;
const messageOf = (caught: unknown) => caught instanceof Error ? caught.message : "Notifications are unavailable.";
const dedupe = (items: NotificationInfo[]) => Array.from(new Map(items.map((item) => [item.id, item])).values());

export function useNotifications() {
  const [inbox, setInbox] = useState<NotificationInfo[]>([]);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [olderLoading, setOlderLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [unreadError, setUnreadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [markAllPending, setMarkAllPending] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const inboxLocked = useRef(false);
  const olderLocked = useRef(false);
  const mutationLocked = useRef(false);

  const loadUnread = useCallback(async () => {
    setUnreadLoading(true);
    try {
      const result = await getUnreadCountApi();
      setUnreadCount(result.unreadCount);
      setUnreadError(null);
    } catch (caught) {
      setUnreadError(messageOf(caught));
    } finally {
      setUnreadLoading(false);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    if (inboxLocked.current) return;
    inboxLocked.current = true;
    setInboxLoading(true);
    setInboxError(null);
    try {
      const page = await getNotificationsApi(null, PAGE_SIZE);
      setInbox(dedupe(page.notifications));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
      setInboxLoaded(true);
    } catch (caught) {
      setInboxError(messageOf(caught));
    } finally {
      inboxLocked.current = false;
      setInboxLoading(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    if (nextCursor === null || olderLocked.current) return;
    olderLocked.current = true;
    setOlderLoading(true);
    setInboxError(null);
    try {
      const page = await getNotificationsApi(nextCursor, PAGE_SIZE);
      setInbox((current) => dedupe([...current, ...page.notifications]));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setInboxError(messageOf(caught));
    } finally {
      olderLocked.current = false;
      setOlderLoading(false);
    }
  }, [nextCursor]);

  const markRead = useCallback(async (id: number) => {
    if (mutationLocked.current) return false;
    // ponytail: one notification command at a time; use per-row locks only if parallel reads matter.
    mutationLocked.current = true;
    setPendingId(id);
    setMutationError(null);
    try {
      await markNotificationReadApi(id);
      setInbox((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      await loadUnread();
      return true;
    } catch (caught) {
      setMutationError(messageOf(caught));
      return false;
    } finally {
      mutationLocked.current = false;
      setPendingId(null);
    }
  }, [loadUnread]);

  const markAllRead = useCallback(async () => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    setMarkAllPending(true);
    setMutationError(null);
    try {
      await markAllNotificationsReadApi();
      setInbox((current) => current.map((item) => ({ ...item, read: true })));
      await loadUnread();
      return true;
    } catch (caught) {
      setMutationError(messageOf(caught));
      return false;
    } finally {
      mutationLocked.current = false;
      setMarkAllPending(false);
    }
  }, [loadUnread]);

  useEffect(() => { void loadUnread(); }, [loadUnread]);

  return {
    inbox,
    inboxLoaded,
    inboxLoading,
    inboxError,
    loadInbox,
    inboxRetry: inboxLoaded ? loadOlder : loadInbox,
    hasMore,
    nextCursor,
    olderLoading,
    loadOlder,
    unreadCount,
    unreadLoading,
    unreadError,
    unreadRetry: loadUnread,
    pendingId,
    markAllPending,
    mutationError,
    markRead,
    markAllRead,
  };
}

export type NotificationsState = ReturnType<typeof useNotifications>;
