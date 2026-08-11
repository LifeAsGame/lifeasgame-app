import { USE_MOCK, apiPost } from "@/shared/api/client";

export type CreateRoleRequest = { roleType: string; name: string; description: string };
export type RoleDetail = CreateRoleRequest & { id: number; status: string };

export async function createRoleApi(body: CreateRoleRequest): Promise<RoleDetail> {
  if (USE_MOCK) return { id: Date.now(), status: "ACTIVE", ...body };
  return apiPost<RoleDetail>("/api/v1/roles", body);
}
