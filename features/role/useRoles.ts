"use client";

import type { RoleDetail } from "@/shared/api/types";
import { listRolesApi } from "./api";
import { useRoleQuery } from "./useRoleQuery";

export function useRoles(enabled: boolean) {
  const query = useRoleQuery<RoleDetail[]>([], listRolesApi, enabled);
  return { roles: query.data, isLoading: query.loading, error: query.error, refresh: async () => { await query.refresh(); } };
}
