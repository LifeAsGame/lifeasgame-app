"use client";

import { useCallback, useEffect, useState } from "react";

import type { PlayerGrowthOverview } from "@/shared/api/types";
import { getPlayerGrowthApi } from "./api";

export function useGrowthQuery() {
  const [data, setData] = useState<PlayerGrowthOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getPlayerGrowthApi();
      setData(next);
      return next;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Growth.");
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void retry(); }, [retry]);

  return { data, loading, error, retry };
}
