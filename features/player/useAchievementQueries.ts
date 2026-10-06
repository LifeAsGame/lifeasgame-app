"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import { TOKEN_CHANGED_EVENT, tokenStorage } from "@/shared/api/tokenStorage";
import { AWARD_SOURCE_EVENT, awardReadChanged, recentAwardSource } from "./awardEvents";
import { getActivatedContentApi, getPlayerAchievementApi, getPlayerAchievementsApi } from "./api";
import type { ActivatedContentEntry } from "./activation";

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useAchievementQueries() {
  const [items, setItems] = useState<PlayerAchievementInfo[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [activated, setActivated] = useState<ActivatedContentEntry[]>([]);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [view, setView] = useState<"owned" | "catalog">("owned");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedActivation, setSelectedActivation] = useState<ActivatedContentEntry | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [detail, setDetail] = useState<PlayerAchievementInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestId = useRef(0);
  const listRequestId = useRef(0);
  const activationRequestId = useRef(0);
  const sessionPlayerId = useRef(tokenStorage.read()?.playerId ?? null);
  const ownedSignature = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const next = await getPlayerAchievementsApi();
      if (requestId === listRequestId.current) {
        setItems(next);
        const signature = next.map(({ achievementId }) => achievementId).sort((a, b) => a - b).join(",");
        if (ownedSignature.current !== null && ownedSignature.current !== signature) awardReadChanged();
        ownedSignature.current = signature;
      }
      return requestId === listRequestId.current ? next : undefined;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "획득한 업적을 불러오지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, []);

  const reloadActivation = useCallback(async () => {
    const requestId = ++activationRequestId.current;
    setActivationLoading(true); setActivationError(null);
    try {
      const page = await getActivatedContentApi();
      if (requestId === activationRequestId.current) setActivated(page.entries.filter(({ kind }) => kind === "ACHIEVEMENT"));
      return requestId === activationRequestId.current ? page : undefined;
    } catch (caught) {
      if (requestId === activationRequestId.current) setActivationError(message(caught, "활성 업적 상태를 불러오지 못했습니다."));
      return undefined;
    } finally { if (requestId === activationRequestId.current) setActivationLoading(false); }
  }, []);

  useEffect(() => {
    void reload();
    void reloadActivation();
    const listRequests = listRequestId;
    const activationRequests = activationRequestId;
    const detailRequests = detailRequestId;
    const invalidate = () => {
      const nextPlayerId = tokenStorage.read()?.playerId ?? null;
      if (nextPlayerId === sessionPlayerId.current) return;
      sessionPlayerId.current = nextPlayerId;
      listRequestId.current++; activationRequestId.current++; detailRequestId.current++; ownedSignature.current = null;
      setItems([]); setActivated([]); setDetail(null); setSelectedId(null); setSelectedActivation(null);
      void reload(); void reloadActivation();
    };
    window.addEventListener(TOKEN_CHANGED_EVENT, invalidate);
    return () => { listRequests.current++; activationRequests.current++; detailRequests.current++; window.removeEventListener(TOKEN_CHANGED_EVENT, invalidate); };
  }, [reload, reloadActivation]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const refresh = () => {
      const playerId = sessionPlayerId.current;
      void reload();
      void reloadActivation();
      timers.push(setTimeout(() => { if (sessionPlayerId.current === playerId) { void reload(); void reloadActivation(); } }, 900), setTimeout(() => { if (sessionPlayerId.current === playerId) { void reload(); void reloadActivation(); } }, 2200));
    };
    window.addEventListener(AWARD_SOURCE_EVENT, refresh);
    if (recentAwardSource()) refresh();
    return () => { window.removeEventListener(AWARD_SOURCE_EVENT, refresh); timers.forEach(clearTimeout); };
  }, [reload, reloadActivation]);

  const loadDetail = useCallback(async (achievementId: number) => {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const next = await getPlayerAchievementApi(achievementId);
      if (requestId === detailRequestId.current) setDetail(next);
      return requestId === detailRequestId.current ? next : undefined;
    } catch (caught) {
      if (requestId === detailRequestId.current) setDetailError(message(caught, "업적 상세를 불러오지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const select = useCallback((achievementId: number) => {
    selectedIdRef.current = achievementId;
    setSelectedId(achievementId);
    setSelectedActivation(null);
    setDetail(null);
    void loadDetail(achievementId);
  }, [loadDetail]);

  const selectActivation = (entry: ActivatedContentEntry) => {
    detailRequestId.current++;
    selectedIdRef.current = entry.definitionId;
    setSelectedId(entry.definitionId);
    setSelectedActivation(entry);
    setDetail(null); setDetailError(null);
  };

  const clearSelection = () => {
    detailRequestId.current += 1;
    selectedIdRef.current = null;
    setSelectedId(null);
    setSelectedActivation(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  return {
    list: { items, loading: listLoading, error: listError, reload },
    activated: { items: activated, loading: activationLoading, error: activationError, reload: reloadActivation },
    view, setView,
    detail: {
      data: detail,
      loading: detailLoading,
      error: detailError,
      retry: () => selectedIdRef.current === null ? Promise.resolve(undefined) : loadDetail(selectedIdRef.current),
    },
    selectedId,
    selectedActivation,
    select,
    selectActivation,
    clearSelection,
  };
}
