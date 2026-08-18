import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionFollower, ConnectionFollowing, ConnectionPage } from "@/shared/api/types";
import { useConnectionsQueries } from "./useConnectionsQueries";

const api = vi.hoisted(() => ({
  blockFollowApi: vi.fn(),
  followApi: vi.fn(),
  getFollowersApi: vi.fn(),
  getFollowingsApi: vi.fn(),
  muteFollowApi: vi.fn(),
  unblockFollowApi: vi.fn(),
  unfollowApi: vi.fn(),
  unmuteFollowApi: vi.fn(),
}));

vi.mock("./api", () => api);

const following: ConnectionFollowing = { followId: 81, peer: { playerId: 901, name: "Peer", job: "Mage", level: 7 }, muted: false, blocked: false };
const follower: ConnectionFollower = { peer: { playerId: 902, name: "Follower", job: null, level: 5 }, followedBack: false, outboundFollowId: null };
const followingPage: ConnectionPage<ConnectionFollowing> = { contents: [following], page: 0, size: 20, totalElements: 41, totalPages: 3 };
const followerPage: ConnectionPage<ConnectionFollower> = { contents: [follower], page: 0, size: 20, totalElements: 1, totalPages: 1 };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("Connections query and mutation state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getFollowingsApi.mockResolvedValue(followingPage);
    api.getFollowersApi.mockResolvedValue(followerPage);
    for (const name of ["blockFollowApi", "followApi", "muteFollowApi", "unblockFollowApi", "unfollowApi", "unmuteFollowApi"] as const) api[name].mockResolvedValue(undefined);
  });

  it("keeps directional pages separate, locks mutations, and reloads canonical views without optimistic rows", async () => {
    const mutation = deferred();
    api.followApi.mockReturnValue(mutation.promise);
    const { result } = renderHook(() => useConnectionsQueries());
    await waitFor(() => expect(result.current.followings).toEqual(followingPage));
    await waitFor(() => expect(result.current.followers).toEqual(followerPage));

    act(() => {
      void result.current.followBack(follower);
      void result.current.unfollowFollowing(following);
    });
    expect(api.followApi).toHaveBeenCalledTimes(1);
    expect(api.unfollowApi).not.toHaveBeenCalled();
    expect(result.current.followers.contents).toEqual([follower]);

    api.getFollowingsApi.mockResolvedValue({ ...followingPage, contents: [] });
    api.getFollowersApi.mockResolvedValue({ ...followerPage, contents: [{ ...follower, followedBack: true, outboundFollowId: 99 }] });
    await act(async () => { mutation.resolve(); await mutation.promise; });
    await waitFor(() => expect(result.current.pendingKey).toBeNull());

    expect(api.getFollowingsApi).toHaveBeenCalledTimes(2);
    expect(api.getFollowersApi).toHaveBeenCalledTimes(2);
    expect(result.current.followings.contents).toEqual([]);
    expect(result.current.followers.contents[0].outboundFollowId).toBe(99);

    act(() => result.current.setFollowingPage(1));
    await waitFor(() => expect(api.getFollowingsApi).toHaveBeenLastCalledWith(1, 20));
    expect(result.current.followerPage).toBe(0);

    await act(async () => { await result.current.unfollowFollowing(following); });
    expect(api.unfollowApi).toHaveBeenLastCalledWith(81);

    const mutual = { ...follower, followedBack: true, outboundFollowId: 82 };
    await act(async () => { await result.current.unfollowFollower(mutual); });
    expect(api.unfollowApi).toHaveBeenLastCalledWith(82);
    expect(api.unfollowApi).not.toHaveBeenCalledWith(mutual.peer.playerId);

    const calls = api.unfollowApi.mock.calls.length;
    await act(async () => { await result.current.unfollowFollower({ ...mutual, outboundFollowId: null }); });
    expect(api.unfollowApi).toHaveBeenCalledTimes(calls);
  });

  it("keeps directional read failures independent and retries only the active direction", async () => {
    api.getFollowingsApi.mockRejectedValueOnce(new Error("followings failed"));
    const { result } = renderHook(() => useConnectionsQueries());

    await waitFor(() => expect(result.current.queryErrors.followings).toBe("followings failed"));
    await waitFor(() => expect(result.current.followers).toEqual(followerPage));
    expect(result.current.queryErrors.followers).toBeNull();

    act(() => result.current.setActiveTab("followers"));
    expect(result.current.queryErrors[result.current.activeTab]).toBeNull();
    api.getFollowersApi.mockRejectedValueOnce(new Error("followers failed"));
    await act(async () => { await result.current.reloadFollowers(); });
    expect(result.current.followers).toEqual(followerPage);
    expect(result.current.queryErrors.followers).toBe("followers failed");

    api.getFollowingsApi.mockResolvedValueOnce(followingPage);
    await act(async () => { await result.current.reloadFollowings(); });
    expect(result.current.followings).toEqual(followingPage);
    expect(result.current.queryErrors.followings).toBeNull();
    expect(result.current.queryErrors.followers).toBe("followers failed");
  });
});
