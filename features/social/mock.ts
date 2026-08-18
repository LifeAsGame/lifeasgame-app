import type {
  ConnectionFollower,
  ConnectionFollowing,
  ConnectionPage,
  ConnectionPeer,
  FollowInfo,
} from "@/shared/api/types";

const CURRENT_PLAYER_ID = 6;
const timestamp = "2026-08-18T00:00:00Z";

const peers: Record<number, ConnectionPeer> = {
  7: { playerId: 7, name: "Asuna", job: "Fencer", level: 76 },
  13: { playerId: 13, name: "Klein", job: "Samurai", level: 65 },
  21: { playerId: 21, name: "Agil", job: "Warrior", level: 72 },
  34: { playerId: 34, name: "Lisbeth", job: "Blacksmith", level: 60 },
  42: { playerId: 42, name: "Silica", job: null, level: 55 },
};

type StoredFollow = FollowInfo;

const initialFollows: StoredFollow[] = [
  { id: 1, playerId: 6, targetPlayerId: 7, state: "FOLLOWING", muted: false, blocked: false, createdAt: timestamp, updatedAt: timestamp },
  { id: 2, playerId: 6, targetPlayerId: 13, state: "FOLLOWING", muted: true, blocked: false, createdAt: timestamp, updatedAt: timestamp },
  { id: 3, playerId: 6, targetPlayerId: 21, state: "STOPPED", muted: false, blocked: false, createdAt: timestamp, updatedAt: timestamp },
  { id: 4, playerId: 7, targetPlayerId: 6, state: "FOLLOWING", muted: false, blocked: false, createdAt: timestamp, updatedAt: timestamp },
  { id: 5, playerId: 34, targetPlayerId: 6, state: "FOLLOWING", muted: false, blocked: false, createdAt: timestamp, updatedAt: timestamp },
  { id: 6, playerId: 42, targetPlayerId: 6, state: "FOLLOWING", muted: true, blocked: true, createdAt: timestamp, updatedAt: timestamp },
];

let follows = initialFollows.map((follow) => ({ ...follow }));

function pageOf<T>(contents: T[], page: number, size: number): ConnectionPage<T> {
  const start = page * size;
  return {
    contents: contents.slice(start, start + size),
    page,
    size,
    totalElements: contents.length,
    totalPages: Math.ceil(contents.length / Math.max(size, 1)),
  };
}

function requireFollow(followId: number): StoredFollow {
  const follow = follows.find(({ id }) => id === followId);
  if (!follow) throw new Error("Follow not found.");
  return follow;
}

function update(followId: number, changes: Partial<StoredFollow>) {
  const current = requireFollow(followId);
  const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
  follows = follows.map((follow) => follow.id === followId ? updated : follow);
}

export const connectionsMock = {
  reset() {
    follows = initialFollows.map((follow) => ({ ...follow }));
  },
  listFollowings(page: number, size: number) {
    const contents = follows
      .filter(({ playerId, state }) => playerId === CURRENT_PLAYER_ID && state === "FOLLOWING")
      .map<ConnectionFollowing>((follow) => ({
        followId: follow.id,
        peer: peers[follow.targetPlayerId],
        muted: follow.muted,
        blocked: follow.blocked,
      }));
    return pageOf(contents, page, size);
  },
  listFollowers(page: number, size: number) {
    const contents = follows
      .filter(({ targetPlayerId, state }) => targetPlayerId === CURRENT_PLAYER_ID && state === "FOLLOWING")
      .map<ConnectionFollower>((follow) => {
        const reverse = follows.find(({ playerId, targetPlayerId, state }) =>
          playerId === CURRENT_PLAYER_ID && targetPlayerId === follow.playerId && state === "FOLLOWING");
        return {
          peer: peers[follow.playerId],
          followedBack: Boolean(reverse),
          outboundFollowId: reverse?.id ?? null,
        };
      });
    return pageOf(contents, page, size);
  },
  isMutual(peerPlayerId: number) {
    return follows.some(({ playerId, targetPlayerId, state }) =>
      playerId === CURRENT_PLAYER_ID && targetPlayerId === peerPlayerId && state === "FOLLOWING")
      && follows.some(({ playerId, targetPlayerId, state }) =>
        playerId === peerPlayerId && targetPlayerId === CURRENT_PLAYER_ID && state === "FOLLOWING");
  },
  follow(targetPlayerId: number): FollowInfo {
    const existing = follows.find(({ playerId, targetPlayerId: target }) =>
      playerId === CURRENT_PLAYER_ID && target === targetPlayerId);
    if (existing) {
      if (existing.state === "STOPPED") update(existing.id, { state: "FOLLOWING", muted: false });
      return requireFollow(existing.id);
    }
    const created: StoredFollow = {
      id: Math.max(0, ...follows.map(({ id }) => id)) + 1,
      playerId: CURRENT_PLAYER_ID,
      targetPlayerId,
      state: "FOLLOWING",
      muted: false,
      blocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    follows = [...follows, created];
    return created;
  },
  unfollow(followId: number) { update(followId, { state: "STOPPED" }); },
  mute(followId: number) { update(followId, { muted: true }); },
  unmute(followId: number) { update(followId, { muted: false }); },
  block(followId: number) { update(followId, { blocked: true }); },
  unblock(followId: number) { update(followId, { blocked: false }); },
};
