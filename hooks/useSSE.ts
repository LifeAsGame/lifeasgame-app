"use client";

import { useEffect, useRef, useCallback } from "react";
import { USE_MOCK } from "@/lib/api/client";
import { SSE_EVENT_SCENARIOS } from "@/lib/api/mock/notifications.mock";
import { tokenStorage } from "@/shared/api/tokenStorage";
import type { NotificationEvent } from "@/shared/api/types";

type SSEHandler = (event: NotificationEvent) => void;

export function useSSE(onEvent: SSEHandler, enabled = true) {
  const handlerRef = useRef(onEvent);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!enabled) return;

    if (USE_MOCK) {
      // Simulate SSE events at random intervals in mock mode
      let idx = 0;
      const scheduleNext = () => {
        const delay = 8000 + Math.random() * 12000; // 8~20 seconds
        const timer = setTimeout(() => {
          const scenario = SSE_EVENT_SCENARIOS[idx % SSE_EVENT_SCENARIOS.length];
          idx++;
          const event: NotificationEvent = {
            ...scenario,
            id: `sse-${Date.now()}`,
            occurredAt: new Date().toISOString(),
            read: false,
          };
          handlerRef.current(event);
          scheduleNext();
        }, delay);
        return timer;
      };
      const timer = scheduleNext();
      cleanup.current = () => clearTimeout(timer);
      return;
    }

    // Real SSE connection
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const token = tokenStorage.read()?.accessToken;
    const url = token
      ? `${BASE_URL}/api/v1/sse/events?token=${encodeURIComponent(token)}`
      : `${BASE_URL}/api/v1/sse/events`;

    const source = new EventSource(url);

    source.onmessage = (e) => {
      try {
        const event: NotificationEvent = JSON.parse(e.data);
        handlerRef.current(event);
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      source.close();
      // Reconnect after 5s
      const timer = setTimeout(connect, 5000);
      cleanup.current = () => clearTimeout(timer);
    };

    cleanup.current = () => source.close();
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => cleanup.current?.();
  }, [connect]);
}
