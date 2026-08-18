import { USE_MOCK, apiGet, apiPut } from "../client";
import { MOCK_USER_INFO } from "../mock/user.mock";
import type { UserInfo } from "../types";

export async function getUserInfoApi(): Promise<UserInfo> {
  if (USE_MOCK) return MOCK_USER_INFO;
  return apiGet<UserInfo>("/api/v1/users/me");
}

export async function updateNicknameApi(nickname: string): Promise<void> {
  if (USE_MOCK) return;
  await apiPut("/api/v1/users/me/nickname", { nickname });
}

export async function changePasswordApi(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  if (USE_MOCK) return;
  await apiPut("/api/v1/users/me/password", data);
}
