"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayerInfo, PlayerTitleInfo } from "@/shared/api/types";
import { getCurrentPlayerApi, getPlayerTitlesApi, setRepresentativeTitleApi } from "./api";

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mutationLocked = useRef(false);
  const [pendingMutation, setPendingMutation] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadPlayer = useCallback(async () => {
    setPlayerLoading(true);
    setPlayerError(null);
    try {
      const next = await getCurrentPlayerApi();
      setPlayer(next);
      return next;
    } catch (caught) {
      setPlayerError(message(caught, "Unable to load Current Player."));
      return undefined;
    } finally {
      setPlayerLoading(false);
    }
  }, []);

  const loadTitles = useCallback(async () => {
    setTitlesLoading(true);
    setTitlesError(null);
    try {
      const next = await getPlayerTitlesApi();
      setTitles(next);
      setSelectedId((current) => current !== null && next.some(({ titleId }) => titleId === current) ? current : null);
      return next;
    } catch (caught) {
      setTitlesError(message(caught, "Unable to load acquired Titles."));
      return undefined;
    } finally {
      setTitlesLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.all([loadPlayer(), loadTitles()]); }, [loadPlayer, loadTitles]);

  const select = (titleId: number) => {
    if (titles.some((title) => title.titleId === titleId)) setSelectedId(titleId);
  };

  const clearSelection = () => setSelectedId(null);

  const setRepresentative = async (titleId: number): Promise<boolean> => {
    if (mutationLocked.current || player?.representativeTitleId === titleId || !titles.some((title) => title.titleId === titleId)) return false;
    mutationLocked.current = true;
    setPendingMutation(true);
    setMutationError(null);
    try {
      await setRepresentativeTitleApi(titleId);
      const refreshed = await loadPlayer();
      if (!refreshed) {
        setMutationError("Representative Title changed, but Current Player authority could not be reloaded.");
        return false;
      }
      return true;
    } catch (caught) {
      setMutationError(message(caught, "Unable to set representative Title."));
      return false;
    } finally {
      mutationLocked.current = false;
      setPendingMutation(false);
    }
  };

  return {
    player: { data: player, loading: playerLoading, error: playerError, reload: loadPlayer },
    titles: { items: titles, loading: titlesLoading, error: titlesError, reload: loadTitles },
    representativeTitleId: player?.representativeTitleId ?? null,
    selectedId,
    selected: titles.find((title) => title.titleId === selectedId) ?? null,
    select,
    clearSelection,
    pendingMutation,
    mutationError,
    setRepresentative,
  };
}
