"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayerInfo, PlayerTitleInfo } from "@/shared/api/types";
import { TOKEN_CHANGED_EVENT, tokenStorage } from "@/shared/api/tokenStorage";
import { AWARD_SOURCE_EVENT, awardReadChanged, recentAwardSource } from "./awardEvents";
import { clearRepresentativeTitleApi, getActivatedContentApi, getCurrentPlayerApi, getPlayerTitlesApi, setRepresentativeTitleApi } from "./api";
import type { ActivatedContentEntry } from "./activation";

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useTitleQueries() {
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [titles, setTitles] = useState<PlayerTitleInfo[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [titlesError, setTitlesError] = useState<string | null>(null);
  const [activated, setActivated] = useState<ActivatedContentEntry[]>([]);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [view, setView] = useState<"owned" | "catalog">("owned");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedActivation, setSelectedActivation] = useState<ActivatedContentEntry | null>(null);
  const mutationLocked = useRef(false);
  const [pendingMutation, setPendingMutation] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const playerRequestId = useRef(0);
  const titlesRequestId = useRef(0);
  const activationRequestId = useRef(0);
  const sessionPlayerId = useRef(tokenStorage.read()?.playerId ?? null);
  const ownedSignature = useRef<string | null>(null);

  const loadPlayer = useCallback(async () => {
    const requestId = ++playerRequestId.current;
    setPlayerLoading(true);
    setPlayerError(null);
    try {
      const next = await getCurrentPlayerApi();
      if (requestId === playerRequestId.current) setPlayer(next);
      return requestId === playerRequestId.current ? next : undefined;
    } catch (caught) {
      if (requestId === playerRequestId.current) setPlayerError(message(caught, "플레이어를 불러오지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === playerRequestId.current) setPlayerLoading(false);
    }
  }, []);

  const loadTitles = useCallback(async () => {
    const requestId = ++titlesRequestId.current;
    setTitlesLoading(true);
    setTitlesError(null);
    try {
      const next = await getPlayerTitlesApi();
      if (requestId === titlesRequestId.current) {
        setTitles(next);
        const signature = next.map(({ titleId }) => titleId).sort((a, b) => a - b).join(",");
        if (ownedSignature.current !== null && ownedSignature.current !== signature) awardReadChanged();
        ownedSignature.current = signature;
      }
      return requestId === titlesRequestId.current ? next : undefined;
    } catch (caught) {
      if (requestId === titlesRequestId.current) setTitlesError(message(caught, "획득한 칭호를 불러오지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === titlesRequestId.current) setTitlesLoading(false);
    }
  }, []);

  const loadActivation = useCallback(async () => {
    const requestId = ++activationRequestId.current;
    setActivationLoading(true); setActivationError(null);
    try {
      const page = await getActivatedContentApi();
      if (requestId === activationRequestId.current) setActivated(page.entries.filter(({ kind }) => kind === "TITLE"));
      return requestId === activationRequestId.current ? page : undefined;
    } catch (caught) {
      if (requestId === activationRequestId.current) setActivationError(message(caught, "활성 칭호 상태를 불러오지 못했습니다."));
      return undefined;
    } finally { if (requestId === activationRequestId.current) setActivationLoading(false); }
  }, []);

  useEffect(() => {
    void Promise.all([loadPlayer(), loadTitles(), loadActivation()]);
    const playerRequests = playerRequestId;
    const titleRequests = titlesRequestId;
    const activationRequests = activationRequestId;
    const invalidate = () => {
      const nextPlayerId = tokenStorage.read()?.playerId ?? null;
      if (nextPlayerId === sessionPlayerId.current) return;
      sessionPlayerId.current = nextPlayerId;
      playerRequestId.current++; titlesRequestId.current++; activationRequestId.current++; ownedSignature.current = null;
      mutationLocked.current = false;
      setPendingMutation(false); setMutationError(null);
      setPlayer(null); setTitles([]); setActivated([]); setSelectedId(null); setSelectedActivation(null);
      void Promise.all([loadPlayer(), loadTitles(), loadActivation()]);
    };
    window.addEventListener(TOKEN_CHANGED_EVENT, invalidate);
    return () => { playerRequests.current++; titleRequests.current++; activationRequests.current++; window.removeEventListener(TOKEN_CHANGED_EVENT, invalidate); };
  }, [loadPlayer, loadTitles, loadActivation]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const refresh = () => { const playerId = sessionPlayerId.current; void loadTitles(); void loadPlayer(); void loadActivation(); timers.push(setTimeout(() => { if (sessionPlayerId.current === playerId) { void loadTitles(); void loadActivation(); } }, 900), setTimeout(() => { if (sessionPlayerId.current === playerId) { void loadTitles(); void loadActivation(); } }, 2200)); };
    window.addEventListener(AWARD_SOURCE_EVENT, refresh);
    if (recentAwardSource()) refresh();
    return () => { window.removeEventListener(AWARD_SOURCE_EVENT, refresh); timers.forEach(clearTimeout); };
  }, [loadTitles, loadPlayer, loadActivation]);

  const select = (titleId: number) => {
    if (titles.some((title) => title.titleId === titleId)) { setSelectedId(titleId); setSelectedActivation(null); }
  };

  const selectActivation = (entry: ActivatedContentEntry) => { setSelectedId(entry.definitionId); setSelectedActivation(entry); };

  const clearSelection = () => { setSelectedId(null); setSelectedActivation(null); };

  const setRepresentative = async (titleId: number): Promise<boolean> => {
    if (mutationLocked.current || !player || player.representativeTitleId === titleId || !titles.some((title) => title.titleId === titleId)) return false;
    const accountId = sessionPlayerId.current;
    mutationLocked.current = true;
    setPendingMutation(true);
    setMutationError(null);
    try {
      await setRepresentativeTitleApi(titleId);
      if (accountId !== sessionPlayerId.current) return false;
      const [refreshed, owned, activation] = await Promise.all([loadPlayer(), loadTitles(), loadActivation()]);
      if (accountId !== sessionPlayerId.current) return false;
      if (!refreshed || !owned || !activation) {
        setMutationError("대표 칭호 변경 후 최신 상태를 모두 확인하지 못했습니다. 다시 조회해 주세요.");
        return false;
      }
      awardReadChanged();
      return true;
    } catch (caught) {
      if (accountId === sessionPlayerId.current) {
        await Promise.all([loadPlayer(), loadTitles(), loadActivation()]);
        setMutationError(`대표 칭호 설정 결과를 확인하지 못했습니다. 다시 조회한 상태를 확인해 주세요. ${message(caught, "")}`.trim());
      }
      return false;
    } finally {
      mutationLocked.current = false;
      if (accountId === sessionPlayerId.current) setPendingMutation(false);
    }
  };

  const clearRepresentative = async (): Promise<boolean> => {
    if (mutationLocked.current || !player || player.representativeTitleId === null) return false;
    const accountId = sessionPlayerId.current;
    mutationLocked.current = true;
    setPendingMutation(true);
    setMutationError(null);
    try {
      await clearRepresentativeTitleApi();
      if (accountId !== sessionPlayerId.current) return false;
      const [refreshed, owned, activation] = await Promise.all([loadPlayer(), loadTitles(), loadActivation()]);
      if (accountId !== sessionPlayerId.current) return false;
      if (!refreshed || !owned || !activation) { setMutationError("대표 칭호 해제 후 최신 상태를 모두 확인하지 못했습니다. 다시 조회해 주세요."); return false; }
      awardReadChanged();
      return true;
    } catch (caught) {
      if (accountId === sessionPlayerId.current) {
        await Promise.all([loadPlayer(), loadTitles(), loadActivation()]);
        setMutationError(`대표 칭호 해제 결과를 확인하지 못했습니다. 다시 조회한 상태를 확인해 주세요. ${message(caught, "")}`.trim());
      }
      return false;
    } finally { mutationLocked.current = false; if (accountId === sessionPlayerId.current) setPendingMutation(false); }
  };

  return {
    player: { data: player, loading: playerLoading, error: playerError, reload: loadPlayer },
    titles: { items: titles, loading: titlesLoading, error: titlesError, reload: loadTitles },
    activated: { items: activated, loading: activationLoading, error: activationError, reload: loadActivation },
    view, setView,
    representativeTitleId: player?.representativeTitleId ?? null,
    selectedId,
    selected: titles.find((title) => title.titleId === selectedId) ?? null,
    selectedActivation,
    select,
    selectActivation,
    clearSelection,
    pendingMutation,
    mutationError,
    setRepresentative,
    clearRepresentative,
  };
}
