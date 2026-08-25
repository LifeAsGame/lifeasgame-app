"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import type { AdminPlayerDataSource } from "../api/player.source";
import type { AdminPlayerInfo, AdminPlayerSummary } from "./model";

type Intent = { kind: "lookup"; id: number } | { kind: "detail"; id: number };
type PlayerLoadError = { status: number | null; message: string; kind: Intent["kind"] };

export function usePlayerLookup(enabled: boolean, dataSource: AdminPlayerDataSource) {
  const [summary, setSummary] = useState<AdminPlayerSummary | null>(null);
  const [detail, setDetail] = useState<AdminPlayerInfo | null>(null);
  const [loading, setLoading] = useState<Intent["kind"] | null>(null);
  const [error, setError] = useState<PlayerLoadError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const lastIntent = useRef<Intent | null>(null);

  const run = useCallback(async (intent: Intent) => {
    const current = ++requestId.current;
    lastIntent.current = intent;
    setLoading(intent.kind);
    setError(null);
    if (intent.kind === "lookup") {
      setSummary(null);
      setDetail(null);
      setLoadedAt(null);
    } else {
      setDetail(null);
    }
    try {
      if (intent.kind === "lookup") {
        const next = await dataSource.lookupByUserId(intent.id);
        if (next.userId !== intent.id) throw new Error("Player lookup response did not match the requested User ID.");
        if (current === requestId.current) {
          setSummary(next);
          setLoadedAt(new Date());
        }
        return next;
      }
      const next = await dataSource.getByPlayerId(intent.id);
      if (next.playerId !== intent.id) throw new Error("Player detail response did not match the requested Player ID.");
      if (current === requestId.current) {
        setDetail(next);
        setLoadedAt(new Date());
      }
      return next;
    } catch (caught) {
      if (current === requestId.current) {
        const status = caught instanceof ApiError ? caught.status : null;
        if (status === 401 || status === 403) {
          setSummary(null);
          setDetail(null);
          setLoadedAt(null);
        }
        setError({ status, message: caught instanceof Error ? caught.message : "Unable to load Player.", kind: intent.kind });
      }
      return undefined;
    } finally {
      if (current === requestId.current) setLoading(null);
    }
  }, [dataSource]);

  useEffect(() => {
    if (!enabled) {
      requestId.current += 1;
      lastIntent.current = null;
      setSummary(null);
      setDetail(null);
      setLoading(null);
      setError(null);
      setLoadedAt(null);
    }
    return () => { requestId.current += 1; };
  }, [enabled]);

  return {
    summary,
    detail,
    loading,
    error,
    loadedAt,
    lookupByUserId: (userId: number) => run({ kind: "lookup", id: userId }),
    openDetail: (playerId: number) => run({ kind: "detail", id: playerId }),
    retry: () => lastIntent.current ? run(lastIntent.current) : Promise.resolve(undefined),
    closeDetail: () => { setDetail(null); setError(null); },
  };
}
