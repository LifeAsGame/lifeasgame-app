import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  blockFollowApi,
  followApi,
  getFollowersApi,
  getFollowingsApi,
  muteFollowApi,
  unblockFollowApi,
  unfollowApi,
  unmuteFollowApi,
} from "./api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Connections API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    client.apiPost.mockResolvedValue(undefined);
  });

  it("uses canonical envelope-aware reads and follow mutation routes", async () => {
    await getFollowingsApi(2, 20);
    await getFollowersApi(3, 10);
    await followApi({ targetPlayerId: 284 });
    await unfollowApi(11);
    await muteFollowApi(12);
    await unmuteFollowApi(13);
    await blockFollowApi(14);
    await unblockFollowApi(15);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/connections/followings?page=2&size=20");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/connections/followers?page=3&size=10");
    expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/follows", { targetPlayerId: 284 });
    expect(client.apiPost.mock.calls.slice(1)).toEqual([
      ["/api/v1/follows/11/unfollow", {}],
      ["/api/v1/follows/12/mute", {}],
      ["/api/v1/follows/13/unmute", {}],
      ["/api/v1/follows/14/block", {}],
      ["/api/v1/follows/15/unblock", {}],
    ]);
  });
});
