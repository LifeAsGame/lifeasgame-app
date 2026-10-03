import { Client, ReconnectionTimeMode } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { BASE_URL } from "@/shared/api/client";
import { AUTH_EXPIRED_EVENT, TOKEN_CHANGED_EVENT, tokenStorage } from "@/shared/api/tokenStorage";
import type { ChatMessage } from "@/shared/api/types";

export type ChatEvent =
  | (ChatMessage & { eventType: "MESSAGE_CREATED"; clientMessageId?: string | null })
  | { eventType: "READ_UPDATED"; channelId: number; playerId: number; lastReadMessageId: number };

export function connectFriendChat(channelIds: number[], onEvent: (event: ChatEvent) => void, onStatus: (status: "connecting" | "connected" | "reconnecting" | "failed") => void, onConnected: () => void): () => void {
  let stopped = false;
  let authFailed = false;
  const client = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    debug: () => {},
    beforeConnect: () => {
      const token = tokenStorage.read()?.accessToken;
      if (!token) {
        authFailed = true;
        onStatus("failed");
        void client.deactivate();
        return;
      }
      client.connectHeaders = { Authorization: `Bearer ${token}` };
    },
    onConnect: () => {
      if (stopped) return;
      for (const channelId of channelIds) {
        client.subscribe(`/topic/social/chat/${channelId}`, (frame) => {
          try {
            const event = JSON.parse(frame.body) as ChatEvent;
            if (event.channelId !== channelId) return;
            if (event.eventType === "MESSAGE_CREATED" && Number.isSafeInteger(event.id) && Number.isSafeInteger(event.senderId) && typeof event.content === "string" && typeof event.createdAt === "string") onEvent(event);
            if (event.eventType === "READ_UPDATED" && Number.isSafeInteger(event.playerId) && Number.isSafeInteger(event.lastReadMessageId)) onEvent(event);
          } catch {
            // Ignore malformed frames; REST recovery remains authoritative.
          }
        });
      }
      onStatus("connected");
      onConnected();
    },
    onStompError: () => {
      authFailed = true;
      onStatus("failed");
      void client.deactivate();
    },
    onWebSocketClose: () => {
      if (stopped || authFailed || !tokenStorage.read()) return;
      onStatus("reconnecting");
    },
  });
  const restart = () => {
    if (stopped) return;
    authFailed = false;
    void client.deactivate().then(() => {
      if (!stopped && tokenStorage.read()) {
        onStatus("connecting");
        client.activate();
      }
    });
  };
  const expire = () => { authFailed = true; onStatus("failed"); void client.deactivate(); };
  window.addEventListener(TOKEN_CHANGED_EVENT, restart);
  window.addEventListener(AUTH_EXPIRED_EVENT, expire);
  if (!tokenStorage.read()) {
    onStatus("failed");
    return () => {
      window.removeEventListener(TOKEN_CHANGED_EVENT, restart);
      window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
    };
  }
  onStatus("connecting");
  client.activate();
  return () => {
    stopped = true;
    window.removeEventListener(TOKEN_CHANGED_EVENT, restart);
    window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
    void client.deactivate();
  };
}
