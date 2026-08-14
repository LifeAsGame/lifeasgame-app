"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import { getPlayerAchievementApi, getPlayerAchievementsApi } from "./api";

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useAchievementQueries() {
  const [items, setItems] = useState<PlayerAchievementInfo[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [detail, setDetail] = useState<PlayerAchievementInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestId = useRef(0);

  const reload = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const next = await getPlayerAchievementsApi();
      setItems(next);
      return next;
    } catch (caught) {
      setListError(message(caught, "Unable to load acquired Achievements."));
      return undefined;
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const loadDetail = useCallback(async (achievementId: number) => {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const next = await getPlayerAchievementApi(achievementId);
      if (requestId === detailRequestId.current) setDetail(next);
      return next;
    } catch (caught) {
      if (requestId === detailRequestId.current) setDetailError(message(caught, "Unable to load acquired Achievement."));
      return undefined;
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const select = useCallback((achievementId: number) => {
    selectedIdRef.current = achievementId;
    setSelectedId(achievementId);
    setDetail(null);
    void loadDetail(achievementId);
  }, [loadDetail]);

  return {
    list: { items, loading: listLoading, error: listError, reload },
    detail: {
      data: detail,
      loading: detailLoading,
      error: detailError,
      retry: () => selectedIdRef.current === null ? Promise.resolve(undefined) : loadDetail(selectedIdRef.current),
    },
    selectedId,
    select,
  };
}
