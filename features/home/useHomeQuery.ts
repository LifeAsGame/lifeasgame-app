"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getHomeApi } from "./api";
import { AWARD_CHANGED_EVENT, AWARD_SOURCE_EVENT } from "@/features/player/awardEvents";
import { ACHIEVEMENT_CONDITIONS } from "@/features/player/activation";
import { getActivatedContentApi } from "@/features/player/api";
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
      let confirmed = next;
      if (next.recentAchievements.some(({ code }) => code in ACHIEVEMENT_CONDITIONS)) {
        const activation = await getActivatedContentApi().catch(() => null);
        if (activation) confirmed = {
          ...next,
          recentAchievements: next.recentAchievements.map((achievement) => {
            const entry = activation.entries.find(({ code, status }) => code === achievement.code && status === "ACQUIRED");
            return entry?.acquiredAt ? { ...achievement, acquiredAt: entry.acquiredAt } : achievement;
          }),
        };
      }
      if (currentRequestId === requestId.current) setData(confirmed);
      return confirmed;
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

  useEffect(() => {
    if (!active) return;
    const refresh = () => { void reload(); };
    window.addEventListener(AWARD_SOURCE_EVENT, refresh);
    window.addEventListener(AWARD_CHANGED_EVENT, refresh);
    return () => { window.removeEventListener(AWARD_SOURCE_EVENT, refresh); window.removeEventListener(AWARD_CHANGED_EVENT, refresh); };
  }, [active, reload]);

  return { data, loading, error, reload };
}
