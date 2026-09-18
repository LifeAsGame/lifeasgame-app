"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { NotificationInfo, NotificationType } from "@/shared/api/types";
import { notificationPopupPosition, type FloatingPosition } from "@/shared/lib/viewport";
import RuntimeFidelityStyles from "@/shared/ui/RuntimeFidelityStyles";
import UtilityPortal from "@/shared/ui/UtilityPortal";
import { useNotifications } from "./useNotifications";

const TYPE_META: Record<NotificationType, { icon: string; label: string; tone: string }> = {
  MAIL_RECEIVED: { icon: "✉", label: "Mail received", tone: "info" },
  QUEST_PROGRESS: { icon: "⚔", label: "Quest progress", tone: "pending" },
  QUEST_COMPLETED: { icon: "✓", label: "Quest completed", tone: "success" },
  QUEST_REWARD_READY: { icon: "★", label: "Quest reward ready", tone: "pending" },
  LISTING_SOLD: { icon: "◆", label: "Listing sold", tone: "success" },
  ACHIEVEMENT_UNLOCK: { icon: "★", label: "Achievement unlocked", tone: "selected" },
  SYSTEM_NOTICE: { icon: "!", label: "System notice", tone: "neutral" },
};
const UNKNOWN_TYPE_META = { icon: "!", label: "Notification", tone: "neutral" };

function isKnownNotificationType(type: string): type is NotificationType {
  return Object.prototype.hasOwnProperty.call(TYPE_META, type);
}

function metaFor(type: string) {
  return isKnownNotificationType(type) ? TYPE_META[type] : UNKNOWN_TYPE_META;
}

export function NotificationTimestamp({ occurredAt }: { occurredAt: string }) {
  const label = occurredAt.replace("T", " ").replace(/:\d{2}(?:\.\d+)?Z$/, " UTC");
  return <time dateTime={occurredAt}>{label}</time>;
}

function TypeMark({ notification }: { notification: NotificationInfo }) {
  const meta = metaFor(notification.type);
  return <span role="img" aria-label={meta.label} title={meta.label} className="lag-notification-type-mark" data-tone={meta.tone}>{meta.icon}</span>;
}

function NotificationRow({ notification, pending, selected, onSelect, onMarkRead }: {
  notification: NotificationInfo;
  pending: boolean;
  selected: boolean;
  onSelect: (id: number, trigger: HTMLButtonElement) => void;
  onMarkRead: (id: number) => void;
}) {
  const meta = metaFor(notification.type);
  return (
    <article className="lag-notification-row" data-read={notification.read} data-selected={selected}>
      <button type="button" className="lag-notification-select" aria-pressed={selected} onClick={(event) => onSelect(notification.id, event.currentTarget)}>
        <TypeMark notification={notification} />
        <span className="lag-notification-copy">
          <span className="lag-notification-row-meta"><span>{meta.label}</span><span>{notification.read ? "Read" : "Unread"}</span></span>
          <strong>{notification.title}</strong>
          <span className="lag-notification-body">{notification.body}</span>
          <span className="lag-notification-time"><NotificationTimestamp occurredAt={notification.occurredAt} /></span>
        </span>
        <span className="lag-notification-arrow" aria-hidden>→</span>
      </button>
      {!notification.read ? <button type="button" className="lag-notification-action" disabled={pending} onClick={() => onMarkRead(notification.id)}>{pending ? "Saving..." : "Mark read"}</button> : null}
    </article>
  );
}

export function NotificationBell() {
  const state = useNotifications();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusOnOpenRef = useRef(false);
  const focusInboxRef = useRef(false);
  const restoreTriggerFocusRef = useRef(false);
  const [popupPosition, setPopupPosition] = useState<FloatingPosition | null>(null);
  const selected = state.inbox.find(({ id }) => id === selectedId) ?? null;

  const dismiss = useCallback(() => {
    focusOnOpenRef.current = false;
    focusInboxRef.current = false;
    setOpen(false);
    setSelectedId(null);
  }, []);

  const close = useCallback(() => {
    restoreTriggerFocusRef.current = true;
    dismiss();
  }, [dismiss]);

  const placePopup = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    const popup = popupRef.current;
    if (!anchor || !popup) return;
    setPopupPosition(notificationPopupPosition(anchor, { width: popup.offsetWidth, height: popup.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placePopup();
    const observer = typeof ResizeObserver === "undefined" || !popupRef.current ? null : new ResizeObserver(placePopup);
    if (popupRef.current) observer?.observe(popupRef.current);
    window.addEventListener("resize", placePopup);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", placePopup);
    };
  }, [open, placePopup]);

  useLayoutEffect(() => {
    if (!open) return;
    const surface = panelRef.current?.closest<HTMLElement>(".lag-app-surface");
    if (!surface) return;
    const inert = surface.getAttribute("inert");
    const ariaHidden = surface.getAttribute("aria-hidden");
    surface.setAttribute("inert", "");
    surface.setAttribute("aria-hidden", "true");
    return () => {
      if (inert === null) surface.removeAttribute("inert");
      else surface.setAttribute("inert", inert);
      if (ariaHidden === null) surface.removeAttribute("aria-hidden");
      else surface.setAttribute("aria-hidden", ariaHidden);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open && restoreTriggerFocusRef.current) {
      restoreTriggerFocusRef.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useLayoutEffect(() => {
    if (open && popupPosition && focusOnOpenRef.current) {
      focusOnOpenRef.current = false;
      closeRef.current?.focus({ preventScroll: true });
    }
  }, [open, popupPosition]);

  useLayoutEffect(() => {
    if (open && selectedId === null && focusInboxRef.current) {
      focusInboxRef.current = false;
      (selectedTriggerRef.current ?? closeRef.current)?.focus({ preventScroll: true });
    }
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !popupRef.current?.contains(target)) dismiss();
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [dismiss, open]);

  useEffect(() => {
    if (!open) return;
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !popupRef.current) return;
      const focusable = Array.from(popupRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!popupRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKey);
    return () => document.removeEventListener("keydown", handleDialogKey);
  }, [close, open]);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!open && !state.inboxLoaded && !state.inboxLoading) void state.loadInbox();
    if (open) close();
    else {
      focusOnOpenRef.current = event.detail === 0;
      setPopupPosition(null);
      setOpen(true);
    }
  };

  const selectNotification = (id: number, trigger: HTMLButtonElement) => {
    selectedTriggerRef.current = trigger;
    setSelectedId(id);
  };

  const returnToInbox = () => {
    focusInboxRef.current = true;
    setSelectedId(null);
  };

  return (
    <div ref={panelRef} className="lag-notification-anchor">
      <RuntimeFidelityStyles />
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        whileHover={reducedMotion ? undefined : { scale: 1.06 }}
        whileTap={reducedMotion ? undefined : { scale: 0.94 }}
        aria-label={`Notifications, ${state.unreadCount} unread`}
        aria-expanded={open}
        title="Notifications"
        className="lag-utility-button lag-notification-trigger"
        data-active={open}
        data-unread={state.unreadCount > 0}
      >
        <span aria-hidden>◈</span>
        <AnimatePresence>
          {state.unreadCount > 0 ? <motion.span className="lag-notification-badge" key="badge" initial={reducedMotion ? false : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: reducedMotion ? 0 : 0.12 }}>{state.unreadCount > 9 ? "9+" : state.unreadCount}</motion.span> : null}
        </AnimatePresence>
      </motion.button>

      <UtilityPortal>
        <AnimatePresence>
          {open ? (
            <>
              <motion.div
                aria-hidden
                className="lag-notification-backdrop"
                key="notification-backdrop"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.16 }}
              />
              <motion.div
                ref={popupRef}
                role="dialog"
                aria-modal="true"
                aria-label="Notifications"
                key="notification-dropdown"
                initial={reducedMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
                className="lag-notification-dropdown"
                data-detail={selected !== null}
                data-view={selected ? "detail" : "inbox"}
                style={{ position: "fixed", left: popupPosition?.x ?? 16, top: popupPosition?.y ?? 16, zIndex: 600100, visibility: popupPosition ? "visible" : "hidden" }}
              >
              <header className="lag-notification-header">
                <div><span>Current Player</span><h2>Notifications</h2></div>
                <div>
                  <button type="button" disabled={state.markAllPending} onClick={() => void state.markAllRead()} className="lag-notification-action">{state.markAllPending ? "Saving..." : "Mark all read"}</button>
                  <button ref={closeRef} type="button" aria-label="Close Notifications" onClick={close} className="lag-notification-action">Close</button>
                </div>
              </header>

              {state.unreadError ? <div className="lag-notification-feedback-row"><p role="alert" className="lag-notification-feedback" data-state="error">{state.unreadError}</p><button type="button" className="lag-notification-action" onClick={() => void state.unreadRetry()}>Retry count</button></div> : null}
              {state.inboxError ? <div className="lag-notification-feedback-row"><p role="alert" className="lag-notification-feedback" data-state="error">{state.inboxError}</p><button type="button" className="lag-notification-action" onClick={() => void state.inboxRetry()}>Retry</button></div> : null}
              {state.mutationError ? <p role="alert" className="lag-notification-feedback" data-state="error">{state.mutationError}</p> : null}

              <div className="lag-notification-composition">
                <section className="lag-notification-inbox" aria-label="Notification inbox">
                  <div className="lag-notification-summary"><span>Durable inbox</span><strong>{state.unreadCount} unread</strong></div>
                  <div className="lag-notification-list">
                    {state.inboxLoading ? <p role="status" className="lag-notification-empty">Loading notifications...</p> : null}
                    {!state.inboxLoading && state.inboxLoaded && state.inbox.length === 0 ? <p className="lag-notification-empty">No notifications</p> : null}
                    {state.inbox.map((notification) => <NotificationRow key={notification.id} notification={notification} pending={state.pendingId === notification.id} selected={selectedId === notification.id} onSelect={selectNotification} onMarkRead={(id) => void state.markRead(id)} />)}
                    {state.hasMore ? <button type="button" className="lag-notification-load-older" disabled={state.olderLoading} onClick={() => void state.loadOlder()}>{state.olderLoading ? "Loading..." : "Load older"}</button> : null}
                  </div>
                </section>

                {selected ? (
                  <section className="lag-notification-detail" aria-label="Notification detail">
                    <header><button type="button" className="lag-notification-action" onClick={returnToInbox}>← Back to inbox</button><span>{selected.read ? "Read" : "Unread"}</span></header>
                    <div className="lag-notification-detail-content">
                      <TypeMark notification={selected} />
                      <span>{metaFor(selected.type).label}</span>
                      <h3>{selected.title}</h3>
                      <p>{selected.body}</p>
                      <div><NotificationTimestamp occurredAt={selected.occurredAt} /></div>
                      {!selected.read ? <button type="button" className="lag-notification-action" disabled={state.pendingId === selected.id} onClick={() => void state.markRead(selected.id)}>{state.pendingId === selected.id ? "Saving..." : "Mark read"}</button> : <span className="lag-notification-read-state">Read</span>}
                    </div>
                  </section>
                ) : null}
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </UtilityPortal>
    </div>
  );
}
