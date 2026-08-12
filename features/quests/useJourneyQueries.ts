"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { QuestAcceptance, QuestBlueprint, QuestRoute } from "@/shared/api/types";
import { listMyQuestRoutesApi, listPlayerQuestsApi, listQuestCatalogApi, listQuestRoutesApi } from "./api";

export type QueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<T | undefined>;
};

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function useQuery<T>(enabled: boolean, initial: T, load: () => Promise<T>, fallback: string): QueryState<T> {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await load();
      if (currentRequestId === requestId.current) setData(next);
      return next;
    } catch (caught) {
      if (currentRequestId === requestId.current) setError(errorMessage(caught, fallback));
      return undefined;
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [fallback, load]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { data, loading, error, reload };
}

const loadAcceptances = () => listPlayerQuestsApi();
const loadCatalog = () => listQuestCatalogApi();
const loadRoutes = async () => {
  const [catalog, mine] = await Promise.all([listQuestRoutesApi(), listMyQuestRoutesApi()]);
  return { catalog, mine };
};

export function useJourneyQueries(enabled: boolean) {
  const current = useQuery<QuestAcceptance[]>(enabled, [], loadAcceptances, "Unable to load current Quests.");
  const catalog = useQuery<QuestBlueprint[]>(enabled, [], loadCatalog, "Unable to load Quest catalog.");
  const routes = useQuery<{ catalog: QuestRoute[]; mine: QuestRoute[] }>(enabled, { catalog: [], mine: [] }, loadRoutes, "Unable to load Quest Routes.");

  return { current, catalog, routes };
}
