import { beforeEach, describe, expect, it } from "vitest";

import { connectionsMock } from "./mock";

describe("directed Connections authority", () => {
  beforeEach(() => connectionsMock.reset());

  it("derives both views, hides inbound flags, and reactivates the same outbound follow ID", () => {
    const initialFollowers = connectionsMock.listFollowers(0, 20).contents;
    const mutual = initialFollowers.find(({ peer }) => peer.playerId === 7)!;
    const inboundOnly = initialFollowers.find(({ peer }) => peer.playerId === 34)!;

    expect(mutual).toEqual(expect.objectContaining({ followedBack: true, outboundFollowId: 1 }));
    expect(inboundOnly).toEqual({ peer: expect.objectContaining({ playerId: 34 }), followedBack: false, outboundFollowId: null });
    expect(inboundOnly).not.toHaveProperty("muted");
    expect(inboundOnly).not.toHaveProperty("blocked");

    const created = connectionsMock.follow(inboundOnly.peer.playerId);
    expect(connectionsMock.listFollowers(0, 20).contents.find(({ peer }) => peer.playerId === 34)?.outboundFollowId).toBe(created.id);
    connectionsMock.unfollow(created.id);
    const reactivated = connectionsMock.follow(inboundOnly.peer.playerId);

    expect(reactivated.id).toBe(created.id);
    expect(connectionsMock.listFollowings(0, 20).contents.some(({ followId }) => followId === created.id)).toBe(true);
  });

  it("preserves active flags and blocked state when reactivating a stopped row", () => {
    connectionsMock.block(2);
    const active = connectionsMock.follow(13);
    expect(active).toMatchObject({ id: 2, state: "FOLLOWING", muted: true, blocked: true });

    connectionsMock.mute(1);
    connectionsMock.block(1);
    connectionsMock.unfollow(1);
    const reactivated = connectionsMock.follow(7);
    expect(reactivated).toMatchObject({ id: 1, state: "FOLLOWING", muted: false, blocked: true });
  });
});
