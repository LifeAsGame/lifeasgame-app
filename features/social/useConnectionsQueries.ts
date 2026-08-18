"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ConnectionFollower, ConnectionFollowing, ConnectionPage } from "@/shared/api/types";
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

const PAGE_SIZE = 20;
const emptyPage = <T,>(page = 0): ConnectionPage<T> => ({ contents: [], page, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
const errorMessage = (caught: unknown) => caught instanceof Error ? caught.message : "Unable to update Connections.";

export function useConnectionsQueries() {
  const [activeTab, setActiveTab] = useState<"followings" | "followers">("followings");
  const [followingPage, setFollowingPage] = useState(0);
  const [followerPage, setFollowerPage] = useState(0);
  const [followings, setFollowings] = useState<ConnectionPage<ConnectionFollowing>>(emptyPage());
  const [followers, setFollowers] = useState<ConnectionPage<ConnectionFollower>>(emptyPage());
  const [loading, setLoading] = useState({ followings: false, followers: false });
  const [queryErrors, setQueryErrors] = useState({ followings: null as string | null, followers: null as string | null });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const mutationLocked = useRef(false);

  const reloadFollowings = useCallback(async () => {
    setLoading((state) => ({ ...state, followings: true }));
    try {
      const page = await getFollowingsApi(followingPage, PAGE_SIZE);
      setFollowings(page);
      setQueryErrors((errors) => ({ ...errors, followings: null }));
      return page;
    } catch (caught) {
      setQueryErrors((errors) => ({ ...errors, followings: errorMessage(caught) }));
    } finally {
      setLoading((state) => ({ ...state, followings: false }));
    }
  }, [followingPage]);

  const reloadFollowers = useCallback(async () => {
    setLoading((state) => ({ ...state, followers: true }));
    try {
      const page = await getFollowersApi(followerPage, PAGE_SIZE);
      setFollowers(page);
      setQueryErrors((errors) => ({ ...errors, followers: null }));
      return page;
    } catch (caught) {
      setQueryErrors((errors) => ({ ...errors, followers: errorMessage(caught) }));
    } finally {
      setLoading((state) => ({ ...state, followers: false }));
    }
  }, [followerPage]);

  useEffect(() => { void reloadFollowings(); }, [reloadFollowings]);
  useEffect(() => { void reloadFollowers(); }, [reloadFollowers]);

  const mutate = async (key: string, request: () => Promise<unknown>, both: boolean) => {
    if (mutationLocked.current) return;
    mutationLocked.current = true;
    setPendingKey(key);
    setMutationError(null);
    try {
      await request();
    } catch (caught) {
      setMutationError(errorMessage(caught));
    } finally {
      await (both ? Promise.all([reloadFollowings(), reloadFollowers()]) : reloadFollowings());
      mutationLocked.current = false;
      setPendingKey(null);
    }
  };

  const followBack = (follower: ConnectionFollower) =>
    mutate(`follow-${follower.peer.playerId}`, () => followApi({ targetPlayerId: follower.peer.playerId }), true);
  const unfollowFollowing = (following: ConnectionFollowing) =>
    mutate(`unfollow-${following.followId}`, () => unfollowApi(following.followId), true);
  const unfollowFollower = (follower: ConnectionFollower) => follower.outboundFollowId === null
    ? Promise.resolve()
    : mutate(`unfollow-${follower.outboundFollowId}`, () => unfollowApi(follower.outboundFollowId!), true);
  const toggleMute = (following: ConnectionFollowing) =>
    mutate(`mute-${following.followId}`, () => following.muted ? unmuteFollowApi(following.followId) : muteFollowApi(following.followId), false);
  const toggleBlock = (following: ConnectionFollowing) =>
    mutate(`block-${following.followId}`, () => following.blocked ? unblockFollowApi(following.followId) : blockFollowApi(following.followId), false);

  return {
    activeTab,
    setActiveTab,
    followingPage,
    setFollowingPage,
    followerPage,
    setFollowerPage,
    followings,
    followers,
    loading,
    queryErrors,
    reloadFollowings,
    reloadFollowers,
    mutationError,
    pendingKey,
    followBack,
    unfollowFollowing,
    unfollowFollower,
    toggleMute,
    toggleBlock,
  };
}
