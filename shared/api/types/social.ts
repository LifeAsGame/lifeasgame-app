export interface FollowInfo {
  id: number;
  playerId: number;
  targetPlayerId: number;
  state: string;
  muted: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionPeer {
  playerId: number;
  name: string;
  job: string | null;
  level: number;
}

export interface ConnectionFollowing {
  followId: number;
  peer: ConnectionPeer;
  muted: boolean;
  blocked: boolean;
}

export interface ConnectionFollower {
  peer: ConnectionPeer;
  followedBack: boolean;
  outboundFollowId: number | null;
}

export interface ConnectionPage<T> {
  contents: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type FriendChatPeer = ConnectionPeer;

export interface FriendChatChannel {
  channelId: number;
  peer: FriendChatPeer;
  readOnly: boolean;
}

export interface ChatChannel {
  id: number;
  type: string;
  name: string;
  contextId: number | null;
  readOnly: boolean;
  role: string;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  senderId: number;
  content: string;
  edited: boolean;
  createdAt: string;
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: number | null;
}
