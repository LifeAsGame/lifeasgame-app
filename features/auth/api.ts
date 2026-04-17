import { USE_MOCK, apiPost } from "@/shared/api/client";
import { MOCK_USERS } from "./mock";
import type { AuthUser } from "@/shared/api/types";

export async function loginApi(email: string, password: string): Promise<AuthUser> {
  if (USE_MOCK) {
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!found) throw new Error("Invalid email or password.");
    return { id: found.id, email: found.email, nickname: found.nickname, role: found.role };
  }
  return apiPost<AuthUser>("/api/v1/auth/login", { email, password });
}

export async function logoutApi(): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/auth/logout", {});
}
