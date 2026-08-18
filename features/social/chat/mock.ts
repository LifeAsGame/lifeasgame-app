import type { ChatChannel, ChatMessage, ChatMessagePage, FriendChatChannel } from "@/shared/api/types";
import { connectionsMock } from "../mock";

const CURRENT_PLAYER_ID = 6;
const peers = {
  7: { playerId: 7, name: "Asuna", job: "Fencer", level: 76 },
  13: { playerId: 13, name: "Klein", job: "Samurai", level: 65 },
  34: { playerId: 34, name: "Lisbeth", job: "Blacksmith", level: 60 },
  42: { playerId: 42, name: "Silica", job: null, level: 55 },
} as const;

const initialChannels: FriendChatChannel[] = [
  { channelId: 101, peer: peers[7], readOnly: false },
  { channelId: 102, peer: peers[13], readOnly: true },
];
const initialMessages: Record<number, ChatMessage[]> = {
  101: Array.from({ length: 55 }, (_, index) => ({
    id: index + 1,
    channelId: 101,
    senderId: index % 2 === 0 ? 7 : CURRENT_PLAYER_ID,
    content: `Canonical message ${index + 1}`,
    edited: false,
    createdAt: `2026-08-18T00:${String(index).padStart(2, "0")}:00Z`,
  })),
  102: [],
};

let channels = initialChannels.map((channel) => ({ ...channel, peer: { ...channel.peer } }));
let messages = Object.fromEntries(Object.entries(initialMessages).map(([id, list]) => [id, list.map((message) => ({ ...message }))])) as Record<number, ChatMessage[]>;

function requireChannel(channelId: number) {
  const channel = channels.find(({ channelId: id }) => id === channelId);
  if (!channel) throw new Error("Friend channel not found.");
  return channel;
}

export const directChatMock = {
  reset() {
    channels = initialChannels.map((channel) => ({ ...channel, peer: { ...channel.peer } }));
    messages = Object.fromEntries(Object.entries(initialMessages).map(([id, list]) => [id, list.map((message) => ({ ...message }))])) as Record<number, ChatMessage[]>;
  },
  listChannels() {
    return channels.map((channel) => ({ ...channel, peer: { ...channel.peer } }));
  },
  openFriend(peerPlayerId: number): ChatChannel {
    if (!connectionsMock.isMutual(peerPlayerId)) throw new Error("This player is no longer a mutual connection.");
    let channel = channels.find(({ peer }) => peer.playerId === peerPlayerId);
    if (!channel) {
      const peer = peers[peerPlayerId as keyof typeof peers];
      if (!peer) throw new Error("Player not found.");
      channel = { channelId: Math.max(100, ...channels.map(({ channelId }) => channelId)) + 1, peer, readOnly: false };
      channels = [...channels, channel];
      messages[channel.channelId] = [];
    }
    return { id: channel.channelId, type: "FRIEND", name: channel.peer.name, contextId: null, readOnly: channel.readOnly, role: "MEMBER" };
  },
  listMessages(channelId: number, cursor: number | null, size: number): ChatMessagePage {
    requireChannel(channelId);
    const eligible = (messages[channelId] ?? []).filter(({ id }) => cursor === null || id < cursor);
    const page = eligible.slice(-Math.max(1, Math.min(size, 100)));
    const hasMore = eligible.length > page.length;
    return { messages: page.map((message) => ({ ...message })), hasMore, nextCursor: hasMore ? page[0]?.id ?? null : null };
  },
  sendMessage(channelId: number, content: string): ChatMessage {
    const channel = requireChannel(channelId);
    if (channel.readOnly) throw new Error("This channel is read-only.");
    if (!content.trim()) throw new Error("Message content is required.");
    const created = {
      id: Math.max(0, ...Object.values(messages).flat().map(({ id }) => id)) + 1,
      channelId,
      senderId: CURRENT_PLAYER_ID,
      content,
      edited: false,
      createdAt: new Date().toISOString(),
    };
    messages[channelId] = [...(messages[channelId] ?? []), created];
    return { ...created };
  },
};
