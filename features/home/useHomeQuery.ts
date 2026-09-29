"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getHomeApi } from "./api";
import type { HomeSummary } from "./model";

export function useHomeQuery(active = true) {
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await getHomeApi();
      if (currentRequestId === requestId.current) setData(next);
      return next;
    } catch (caught) {
      if (currentRequestId === requestId.current) {
        setError(caught instanceof Error ? caught.message : "홈 요약을 불러오지 못했습니다.");
      }
      return undefined;
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void reload();
    return () => { requestId.current += 1; };
  }, [active, reload]);

  return { data, loading, error, reload };
}
