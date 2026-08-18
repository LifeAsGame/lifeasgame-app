import { USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import type { ConnectionFollower, ConnectionFollowing, ConnectionPage, FollowInfo } from "@/shared/api/types";
import { connectionsMock } from "./mock";

export function getFollowingsApi(page = 0, size = 20): Promise<ConnectionPage<ConnectionFollowing>> {
  return USE_MOCK
    ? Promise.resolve(connectionsMock.listFollowings(page, size))
    : apiGet<ConnectionPage<ConnectionFollowing>>(`/api/v1/connections/followings?page=${page}&size=${size}`);
}

export function getFollowersApi(page = 0, size = 20): Promise<ConnectionPage<ConnectionFollower>> {
  return USE_MOCK
    ? Promise.resolve(connectionsMock.listFollowers(page, size))
    : apiGet<ConnectionPage<ConnectionFollower>>(`/api/v1/connections/followers?page=${page}&size=${size}`);
}

export function followApi(body: { targetPlayerId: number }): Promise<FollowInfo> {
  return USE_MOCK
    ? Promise.resolve(connectionsMock.follow(body.targetPlayerId))
    : apiPost<FollowInfo>("/api/v1/follows", body);
}

function followCommand(followId: number, command: "unfollow" | "mute" | "unmute" | "block" | "unblock") {
  if (USE_MOCK) {
    connectionsMock[command](followId);
    return Promise.resolve();
  }
  return apiPost<void>(`/api/v1/follows/${followId}/${command}`, {});
}

export const unfollowApi = (followId: number) => followCommand(followId, "unfollow");
export const muteFollowApi = (followId: number) => followCommand(followId, "mute");
export const unmuteFollowApi = (followId: number) => followCommand(followId, "unmute");
export const blockFollowApi = (followId: number) => followCommand(followId, "block");
export const unblockFollowApi = (followId: number) => followCommand(followId, "unblock");
