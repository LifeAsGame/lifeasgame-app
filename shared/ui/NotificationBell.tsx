"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/context/NotificationContext";
import type { NotificationEvent, NotificationEventType } from "@/shared/api/types";

const TYPE_META: Record<NotificationEventType, { color: string; icon: string }> = {
  FRIEND_ONLINE:      { color: "rgba(74,222,128,0.85)",  icon: "●" },
  FRIEND_OFFLINE:     { color: "rgba(140,140,160,0.7)",  icon: "●" },
  MAIL_RECEIVED:      { color: "rgba(74,158,255,0.85)",  icon: "✉" },
  QUEST_PROGRESS:     { color: "rgba(218,178,55,0.9)",   icon: "⚔" },
  QUEST_COMPLETED:    { color: "rgba(218,178,55,0.9)",   icon: "✓" },
  QUEST_REWARD_READY: { color: "rgba(248,197,78,1)",     icon: "★" },
  PARTY_INVITE:       { color: "rgba(74,158,255,0.85)",  icon: "◈" },
  GUILD_INVITE:       { color: "rgba(74,158,255,0.85)",  icon: "◈" },
  LISTING_SOLD:       { color: "rgba(74,222,128,0.85)",  icon: "◆" },
  SKILL_LEVELUP:      { color: "rgba(74,222,128,0.85)",  icon: "↑" },
  ACHIEVEMENT_UNLOCK: { color: "rgba(248,197,78,1)",     icon: "★" },
  SYSTEM_NOTICE:      { color: "rgba(160,160,180,0.6)",  icon: "!" },
};

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.floor(diffHr / 24)}일 전`;
}

function NotifRow({ n }: { n: NotificationEvent }) {
  const meta = TYPE_META[n.type];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 14px",
        borderBottom: "1px solid rgba(200,165,50,0.08)",
        background: n.read ? "transparent" : "rgba(218,178,55,0.04)",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `1.5px solid ${meta.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: meta.color,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: n.read ? 400 : 600,
            color: n.read ? "rgba(185,172,140,0.75)" : "rgba(235,218,175,0.95)",
            lineHeight: 1.35,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {n.title}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(160,148,115,0.7)",
            marginTop: 2,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {n.body}
        </div>
      </div>
      <div style={{ fontSize: 9, color: "rgba(140,128,100,0.55)", flexShrink: 0, marginTop: 2 }}>
        {timeAgo(n.occurredAt)}
      </div>
    </motion.div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!open) markAllRead();
    setOpen((prev) => !prev);
  };

  const recent = notifications.slice(0, 10);

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <motion.button
        type="button"
        onClick={handleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: `1.5px solid ${unreadCount > 0 ? "rgba(248,197,78,0.65)" : "rgba(160,140,100,0.28)"}`,
          background: open
            ? "rgba(30,26,18,0.98)"
            : "linear-gradient(135deg, rgba(20,17,12,0.97), rgba(16,14,10,0.96))",
          boxShadow: unreadCount > 0 ? "0 0 10px rgba(248,197,78,0.15)" : "none",
          color: "rgba(235,218,175,0.88)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          position: "relative",
          outline: "none",
        }}
        aria-label={`알림 ${unreadCount}건`}
      >
        ◈
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                background: "rgba(248,197,78,1)",
                color: "#1a1200",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            style={{
              position: "absolute",
              top: 42,
              right: -8,
              width: 292,
              background: "linear-gradient(155deg, rgba(14,12,8,0.99) 0%, rgba(18,16,11,0.98) 100%)",
              border: "1px solid rgba(200,165,50,0.32)",
              borderRadius: 8,
              boxShadow: "0 12px 40px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(218,178,55,0.05)",
              zIndex: 9990,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 14px 8px",
                borderBottom: "1px solid rgba(200,165,50,0.15)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(218,178,55,0.85)",
                  letterSpacing: "0.1em",
                }}
              >
                NOTIFICATIONS
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    style={{
                      fontSize: 9,
                      color: "rgba(160,140,100,0.65)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 4px",
                    }}
                  >
                    전체 삭제
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {recent.length === 0 ? (
                <div
                  style={{
                    padding: "24px 14px",
                    textAlign: "center",
                    fontSize: 11,
                    color: "rgba(160,148,115,0.55)",
                  }}
                >
                  알림이 없습니다
                </div>
              ) : (
                recent.map((n) => <NotifRow key={n.id} n={n} />)
              )}
            </div>

            {/* Footer scan line */}
            <div
              style={{
                height: 2,
                background: "linear-gradient(90deg, transparent, rgba(218,178,55,0.25), transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
