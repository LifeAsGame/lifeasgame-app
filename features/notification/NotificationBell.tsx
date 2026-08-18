"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { NotificationInfo, NotificationType } from "@/shared/api/types";
import { useNotifications } from "./useNotifications";

const TYPE_META: Record<NotificationType, { color: string; icon: string }> = {
  MAIL_RECEIVED: { color: "rgba(74,158,255,0.85)", icon: "✉" },
  QUEST_PROGRESS: { color: "rgba(218,178,55,0.9)", icon: "⚔" },
  QUEST_COMPLETED: { color: "rgba(218,178,55,0.9)", icon: "✓" },
  QUEST_REWARD_READY: { color: "rgba(248,197,78,1)", icon: "★" },
  LISTING_SOLD: { color: "rgba(74,222,128,0.85)", icon: "◆" },
  ACHIEVEMENT_UNLOCK: { color: "rgba(248,197,78,1)", icon: "★" },
  SYSTEM_NOTICE: { color: "rgba(160,160,180,0.6)", icon: "!" },
};

export function NotificationTimestamp({ occurredAt }: { occurredAt: string }) {
  const label = occurredAt.replace("T", " ").replace(/:\d{2}(?:\.\d+)?Z$/, " UTC");
  return <time dateTime={occurredAt}>{label}</time>;
}

function NotificationRow({ notification, pending, onMarkRead }: {
  notification: NotificationInfo;
  pending: boolean;
  onMarkRead: (id: number) => void;
}) {
  const meta = TYPE_META[notification.type];
  return (
    <motion.article
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 14px",
        borderBottom: "1px solid rgba(200,165,50,0.08)",
        background: notification.read ? "transparent" : "rgba(218,178,55,0.04)",
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${meta.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: meta.color, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 11, fontWeight: notification.read ? 400 : 600, color: notification.read ? "rgba(185,172,140,0.75)" : "rgba(235,218,175,0.95)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis" }}>{notification.title}</strong>
        <p style={{ fontSize: 10, color: "rgba(160,148,115,0.7)", marginTop: 2, lineHeight: 1.3 }}>{notification.body}</p>
        <div style={{ marginTop: 4, fontSize: 9, color: "rgba(140,128,100,0.55)" }}><NotificationTimestamp occurredAt={notification.occurredAt} /></div>
      </div>
      {!notification.read ? <button type="button" disabled={pending} onClick={() => onMarkRead(notification.id)} style={{ border: "1px solid rgba(200,165,50,0.24)", background: "rgba(218,178,55,0.07)", color: "rgba(190,175,138,0.88)", borderRadius: 4, padding: "3px 6px", fontSize: 9, cursor: pending ? "default" : "pointer", opacity: pending ? 0.5 : 1 }}>{pending ? "Saving..." : "Mark read"}</button> : null}
    </motion.article>
  );
}

export function NotificationBell() {
  const state = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
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
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`알림 ${state.unreadCount}건`}
        aria-expanded={open}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: `1.5px solid ${state.unreadCount > 0 ? "rgba(248,197,78,0.65)" : "rgba(160,140,100,0.28)"}`,
          background: open ? "rgba(30,26,18,0.98)" : "linear-gradient(135deg, rgba(20,17,12,0.97), rgba(16,14,10,0.96))",
          boxShadow: state.unreadCount > 0 ? "0 0 10px rgba(248,197,78,0.15)" : "none",
          color: "rgba(235,218,175,0.88)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          position: "relative",
        }}
      >
        ◈
        <AnimatePresence>
          {state.unreadCount > 0 ? <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: "rgba(248,197,78,1)", color: "#1a1200", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>{state.unreadCount > 9 ? "9+" : state.unreadCount}</motion.span> : null}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            key="notification-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            style={{ position: "absolute", top: 42, right: -8, width: 320, background: "linear-gradient(155deg, rgba(14,12,8,0.99) 0%, rgba(18,16,11,0.98) 100%)", border: "1px solid rgba(200,165,50,0.32)", borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(218,178,55,0.05)", zIndex: 9990, overflow: "hidden" }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 14px 8px", borderBottom: "1px solid rgba(200,165,50,0.15)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(218,178,55,0.85)", letterSpacing: "0.1em" }}>NOTIFICATIONS</span>
              <button type="button" disabled={state.markAllPending} onClick={() => void state.markAllRead()} style={{ fontSize: 9, color: "rgba(190,175,138,0.88)", background: "none", border: 0, cursor: "pointer", opacity: state.markAllPending ? 0.45 : 1 }}>{state.markAllPending ? "Saving..." : "모두 읽음"}</button>
            </header>

            {state.unreadError ? <div style={{ padding: "8px 14px" }}><p role="alert" style={{ fontSize: 10, color: "rgba(224,62,99,0.9)" }}>{state.unreadError}</p><button type="button" onClick={() => void state.unreadRetry()} style={{ fontSize: 9 }}>Retry count</button></div> : null}
            {state.inboxError ? <div style={{ padding: "8px 14px" }}><p role="alert" style={{ fontSize: 10, color: "rgba(224,62,99,0.9)" }}>{state.inboxError}</p><button type="button" onClick={() => void state.inboxRetry()} style={{ fontSize: 9 }}>Retry</button></div> : null}
            {state.mutationError ? <p role="alert" style={{ padding: "8px 14px", fontSize: 10, color: "rgba(224,62,99,0.9)" }}>{state.mutationError}</p> : null}

            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {state.inboxLoading ? <p style={{ padding: "24px 14px", textAlign: "center", fontSize: 11, color: "rgba(160,148,115,0.55)" }}>Loading...</p> : null}
              {!state.inboxLoading && state.inboxLoaded && state.inbox.length === 0 ? <p style={{ padding: "24px 14px", textAlign: "center", fontSize: 11, color: "rgba(160,148,115,0.55)" }}>알림이 없습니다</p> : null}
              {state.inbox.map((notification) => <NotificationRow key={notification.id} notification={notification} pending={state.pendingId === notification.id} onMarkRead={(id) => void state.markRead(id)} />)}
              {state.hasMore ? <button type="button" disabled={state.olderLoading} onClick={() => void state.loadOlder()} style={{ display: "block", margin: "8px auto", padding: "4px 8px", fontSize: 9 }}>{state.olderLoading ? "Loading..." : "Load older"}</button> : null}
            </div>
            <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(218,178,55,0.25), transparent)" }} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
