"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getCharacterSheetApi } from "@/lib/api/endpoints/player.api";
import type { CharacterSheet } from "@/shared/api/types";

export function useCharacterSheet(enabled: boolean) {
  const [data, setData] = useState<CharacterSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await getCharacterSheetApi();
      if (current === requestId.current) setData(next);
      return next;
    } catch (caught) {
      if (current === requestId.current) {
        setError(caught instanceof Error ? caught.message : "Unable to load Player context.");
      }
      return undefined;
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
    else {
      requestId.current += 1;
      setData(null);
      setLoading(false);
      setError(null);
    }
  }, [enabled, reload]);

  return { data, loading, error, reload };
}
