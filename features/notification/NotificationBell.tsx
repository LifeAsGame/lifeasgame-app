"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { NotificationInfo, NotificationType } from "@/shared/api/types";
import { notificationPopupPosition, type FloatingPosition } from "@/shared/lib/viewport";
import UtilityPortal from "@/shared/ui/UtilityPortal";
import { useNotifications } from "./useNotifications";

const TYPE_META: Record<NotificationType, { color: string; icon: string; label: string }> = {
  MAIL_RECEIVED: { color: "var(--lag-state-info)", icon: "✉", label: "Mail received" },
  QUEST_PROGRESS: { color: "var(--lag-state-pending)", icon: "⚔", label: "Quest progress" },
  QUEST_COMPLETED: { color: "var(--lag-state-success)", icon: "✓", label: "Quest completed" },
  QUEST_REWARD_READY: { color: "var(--lag-amber)", icon: "★", label: "Quest reward ready" },
  LISTING_SOLD: { color: "var(--lag-state-success)", icon: "◆", label: "Listing sold" },
  ACHIEVEMENT_UNLOCK: { color: "var(--lag-state-selected)", icon: "★", label: "Achievement unlocked" },
  SYSTEM_NOTICE: { color: "var(--lag-text-2)", icon: "!", label: "System notice" },
};
const UNKNOWN_TYPE_META = { color: "var(--lag-text-2)", icon: "!", label: "Notification" };

function isKnownNotificationType(type: string): type is NotificationType {
  return Object.prototype.hasOwnProperty.call(TYPE_META, type);
}

export function NotificationTimestamp({ occurredAt }: { occurredAt: string }) {
  const label = occurredAt.replace("T", " ").replace(/:\d{2}(?:\.\d+)?Z$/, " UTC");
  return <time dateTime={occurredAt}>{label}</time>;
}

function NotificationRow({ notification, pending, onMarkRead }: {
  notification: NotificationInfo;
  pending: boolean;
  onMarkRead: (id: number) => void;
}) {
  const meta = isKnownNotificationType(notification.type) ? TYPE_META[notification.type] : UNKNOWN_TYPE_META;
  return (
    <motion.article
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 14px",
        borderBottom: "1px solid var(--lag-divider)",
        background: notification.read ? "transparent" : "var(--lag-selected-surface)",
      }}
    >
      <span role="img" aria-label={meta.label} title={meta.label} style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${meta.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: meta.color, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 11, fontWeight: notification.read ? 400 : 600, color: notification.read ? "var(--lag-text-2)" : "var(--lag-text)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notification.title}</strong>
        <p style={{ fontSize: 10, color: "var(--lag-text-2)", marginTop: 2, lineHeight: 1.3 }}>{notification.body}</p>
        <div style={{ marginTop: 4, fontSize: 9, color: "var(--lag-meta)" }}><NotificationTimestamp occurredAt={notification.occurredAt} /></div>
      </div>
      {!notification.read ? <button type="button" className="lag-button-secondary" disabled={pending} onClick={() => onMarkRead(notification.id)} style={{ padding: "3px 6px", fontSize: 9, cursor: pending ? "default" : "pointer", opacity: pending ? 0.5 : 1 }}>{pending ? "Saving..." : "Mark read"}</button> : null}
    </motion.article>
  );
}

export function NotificationBell() {
  const state = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState<FloatingPosition | null>(null);

  const placePopup = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    const popup = popupRef.current?.getBoundingClientRect();
    if (!anchor || !popup) return;
    setPopupPosition(notificationPopupPosition(
      anchor,
      { width: popup.width, height: popup.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placePopup();
    const observer = typeof ResizeObserver === "undefined" || !popupRef.current
      ? null
      : new ResizeObserver(placePopup);
    if (popupRef.current) observer?.observe(popupRef.current);
    window.addEventListener("resize", placePopup);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", placePopup);
    };
  }, [open, placePopup]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    if (!open && !state.inboxLoaded && !state.inboxLoading) void state.loadInbox();
    setOpen((current) => !current);
  };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`알림 ${state.unreadCount}건`}
        aria-expanded={open}
        title="Notifications"
        className="lag-utility-button lag-notification-trigger"
        style={{
          borderColor: state.unreadCount > 0 || open ? "var(--lag-focus)" : "var(--lag-control-border)",
          background: open ? "var(--lag-selected-surface)" : "var(--lag-control-bg)",
          boxShadow: state.unreadCount > 0 ? "0 0 10px color-mix(in srgb, var(--lag-focus) 24%, transparent)" : "none",
          cursor: "pointer",
          fontSize: 14,
          position: "relative",
        }}
      >
        ◈
        <AnimatePresence>
          {state.unreadCount > 0 ? <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: "var(--lag-state-error)", color: "var(--lag-text)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>{state.unreadCount > 9 ? "9+" : state.unreadCount}</motion.span> : null}
        </AnimatePresence>
      </motion.button>

      <UtilityPortal>
        <AnimatePresence>
          {open ? (
          <motion.div
            ref={popupRef}
            role="dialog"
            aria-label="Notifications"
            key="notification-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="lag-notification-dropdown"
            style={{
              position: "fixed",
              left: popupPosition?.x ?? 16,
              top: popupPosition?.y ?? 16,
              width: "min(320px, calc(100vw - 32px))",
              borderRadius: "var(--lag-radius-md)",
              zIndex: 600100,
              overflow: "hidden",
              visibility: popupPosition ? "visible" : "hidden",
            }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 14px 8px", background: "var(--lag-panel-2)", borderBottom: "1px solid var(--lag-divider)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--lag-text)", letterSpacing: "0.1em" }}>NOTIFICATIONS</span>
              <button type="button" disabled={state.markAllPending} onClick={() => void state.markAllRead()} style={{ fontSize: 9, color: "var(--lag-text-2)", background: "none", border: 0, cursor: "pointer", opacity: state.markAllPending ? 0.45 : 1 }}>{state.markAllPending ? "Saving..." : "모두 읽음"}</button>
            </header>

            {state.unreadError ? <div style={{ padding: "8px 14px" }}><p role="alert" style={{ fontSize: 10, color: "var(--lag-state-error)" }}>{state.unreadError}</p><button type="button" className="lag-button-secondary" onClick={() => void state.unreadRetry()} style={{ fontSize: 9 }}>Retry count</button></div> : null}
            {state.inboxError ? <div style={{ padding: "8px 14px" }}><p role="alert" style={{ fontSize: 10, color: "var(--lag-state-error)" }}>{state.inboxError}</p><button type="button" className="lag-button-secondary" onClick={() => void state.inboxRetry()} style={{ fontSize: 9 }}>Retry</button></div> : null}
            {state.mutationError ? <p role="alert" style={{ padding: "8px 14px", fontSize: 10, color: "var(--lag-state-error)" }}>{state.mutationError}</p> : null}

            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {state.inboxLoading ? <p style={{ padding: "24px 14px", textAlign: "center", fontSize: 11, color: "var(--lag-text-2)" }}>Loading...</p> : null}
              {!state.inboxLoading && state.inboxLoaded && state.inbox.length === 0 ? <p style={{ padding: "24px 14px", textAlign: "center", fontSize: 11, color: "var(--lag-text-2)" }}>알림이 없습니다</p> : null}
              {state.inbox.map((notification) => <NotificationRow key={notification.id} notification={notification} pending={state.pendingId === notification.id} onMarkRead={(id) => void state.markRead(id)} />)}
              {state.hasMore ? <button type="button" className="lag-button-secondary" disabled={state.olderLoading} onClick={() => void state.loadOlder()} style={{ display: "block", margin: "8px auto", padding: "4px 8px", fontSize: 9 }}>{state.olderLoading ? "Loading..." : "Load older"}</button> : null}
            </div>
            <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--lag-focus), transparent)" }} />
          </motion.div>
          ) : null}
        </AnimatePresence>
      </UtilityPortal>
    </div>
  );
}
