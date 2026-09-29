"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useRoleQuery<T>(initial: T, load: () => Promise<T>, enabled = true) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError(null);
    try {
      const next = await load();
      if (id !== request.current) return;
      setData(next); return next;
    } catch (caught) {
      if (id === request.current) setError(caught instanceof Error ? caught.message : "조회하지 못했습니다.");
    } finally { if (id === request.current) setLoading(false); }
  }, [load]);
  useEffect(() => {
    const counter = request;
    if (enabled) void refresh();
    return () => { counter.current++; };
  }, [enabled, refresh]);
  return { data, loading, error, refresh };
}
