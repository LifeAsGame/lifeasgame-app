import { USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import type { ChatChannel, ChatMessage, ChatMessagePage, FriendChatChannel } from "@/shared/api/types";
import { directChatMock } from "./mock";

export function getFriendChannelsApi(): Promise<FriendChatChannel[]> {
  return USE_MOCK ? Promise.resolve(directChatMock.listChannels()) : apiGet("/api/v1/chat/channels/friends");
}

export function openFriendChannelApi(peerPlayerId: number): Promise<ChatChannel> {
  return USE_MOCK
    ? Promise.resolve(directChatMock.openFriend(peerPlayerId))
    : apiPost(`/api/v1/chat/channels/friend/${peerPlayerId}`, {});
}

export function getFriendMessagesApi(channelId: number, cursor: number | null = null, size = 50): Promise<ChatMessagePage> {
  const query = cursor === null ? `size=${size}` : `cursor=${cursor}&size=${size}`;
  return USE_MOCK
    ? Promise.resolve(directChatMock.listMessages(channelId, cursor, size))
    : apiGet(`/api/v1/chat/channels/${channelId}/messages?${query}`);
}

export function sendFriendMessageApi(channelId: number, content: string, clientMessageId: string): Promise<ChatMessage> {
  return USE_MOCK
    ? Promise.resolve(directChatMock.sendMessage(channelId, content))
    : apiPost(`/api/v1/chat/channels/${channelId}/messages`, { content, clientMessageId }, { retry: false });
}

export function markFriendReadApi(channelId: number, lastReadMessageId: number): Promise<{ lastReadMessageId: number | null; peerLastReadMessageId: number | null; unreadCount: number }> {
  return USE_MOCK
    ? Promise.resolve({ lastReadMessageId, peerLastReadMessageId: null, unreadCount: 0 })
    : apiPost(`/api/v1/chat/channels/${channelId}/read`, { lastReadMessageId });
}
