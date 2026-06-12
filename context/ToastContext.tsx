"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NotificationEventType } from "@/shared/api/types";

type ToastVariant = "success" | "error" | "info" | "warning" | "quest" | "system";

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (opts: Omit<Toast, "id">) => void;
  showNotificationToast: (type: NotificationEventType, title: string, body: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { border: string; glow: string; icon: string }> = {
  success: {
    border: "rgba(74,222,128,0.7)",
    glow: "rgba(74,222,128,0.15)",
    icon: "✓",
  },
  error: {
    border: "rgba(224,62,99,0.7)",
    glow: "rgba(224,62,99,0.15)",
    icon: "✕",
  },
  info: {
    border: "rgba(74,158,255,0.7)",
    glow: "rgba(74,158,255,0.15)",
    icon: "i",
  },
  warning: {
    border: "rgba(251,191,36,0.7)",
    glow: "rgba(251,191,36,0.15)",
    icon: "!",
  },
  quest: {
    border: "rgba(218,178,55,0.8)",
    glow: "rgba(218,178,55,0.18)",
    icon: "⚔",
  },
  system: {
    border: "rgba(160,160,180,0.5)",
    glow: "rgba(160,160,180,0.1)",
    icon: "◈",
  },
};

const NOTIFICATION_TYPE_MAP: Record<NotificationEventType, ToastVariant> = {
  FRIEND_ONLINE: "info",
  FRIEND_OFFLINE: "system",
  MAIL_RECEIVED: "info",
  QUEST_PROGRESS: "quest",
  QUEST_COMPLETED: "quest",
  QUEST_REWARD_READY: "quest",
  PARTY_INVITE: "info",
  GUILD_INVITE: "info",
  LISTING_SOLD: "success",
  SKILL_LEVELUP: "success",
  ACHIEVEMENT_UNLOCK: "success",
  SYSTEM_NOTICE: "system",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const style = VARIANT_STYLES[toast.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onRemove, toast.duration ?? 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      onClick={onRemove}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 6,
        border: `1px solid ${style.border}`,
        background: `linear-gradient(135deg, rgba(12,10,6,0.97) 0%, rgba(20,18,13,0.95) 100%)`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.5), inset 0 0 24px ${style.glow}`,
        minWidth: 260,
        maxWidth: 340,
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* gold scan line */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${style.border} 50%, transparent 100%)`,
          opacity: 0.15,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `1.5px solid ${style.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: style.border,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {style.icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(235,218,175,0.96)",
            letterSpacing: "0.04em",
            lineHeight: 1.3,
          }}
        >
          {toast.title}
        </div>
        {toast.body && (
          <div
            style={{
              fontSize: 11,
              color: "rgba(190,175,138,0.80)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {toast.body}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((opts: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
  }, []);

  const showNotificationToast = useCallback(
    (type: NotificationEventType, title: string, body: string) => {
      showToast({ variant: NOTIFICATION_TYPE_MAP[type], title, body, duration: 5000 });
    },
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, showNotificationToast }}>
      {children}
      {/* Toast container — top right */}
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <ToastItem toast={t} onRemove={() => remove(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
