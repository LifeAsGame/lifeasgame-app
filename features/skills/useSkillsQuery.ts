"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getPlayerSkillsApi, getSkillCatalogApi } from "@/lib/api/endpoints/skills.api";
import type { PlayerSkillInfo, SkillCatalogInfo } from "@/shared/api/types";

export function useSkillsQuery() {
  const [skills, setSkills] = useState<PlayerSkillInfo[]>([]);
  const [catalog, setCatalog] = useState<SkillCatalogInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const [nextSkills, nextCatalog] = await Promise.all([getPlayerSkillsApi(), getSkillCatalogApi()]);
      if (current === requestId.current) {
        setSkills(nextSkills);
        setCatalog(nextCatalog);
      }
    } catch (caught) {
      if (current === requestId.current) {
        setError(caught instanceof Error ? caught.message : "Unable to load Skills.");
      }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => { requestId.current += 1; };
  }, [reload]);

  return { skills, catalog, loading, error, reload };
}
