"use client";

import { useCallback, useEffect, useState } from "react";

import type { RoleDetail } from "@/shared/api/types";
import { listRolesApi } from "./api";

export function useRoles(enabled: boolean) {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRoles(await listRolesApi());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { roles, isLoading, error, refresh };
}
