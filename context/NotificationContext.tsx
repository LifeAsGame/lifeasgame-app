"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import { MOCK_NOTIFICATIONS } from "@/lib/api/mock/notifications.mock";
import { USE_MOCK } from "@/lib/api/client";
import type { NotificationEvent } from "@/shared/api/types";

interface NotificationContextValue {
  notifications: NotificationEvent[];
  unreadCount: number;
  addNotification: (event: NotificationEvent) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>(
    USE_MOCK ? MOCK_NOTIFICATIONS : [],
  );

  const addNotification = useCallback((event: NotificationEvent) => {
    setNotifications((prev) => [event, ...prev].slice(0, 50));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useSSE(addNotification, true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
