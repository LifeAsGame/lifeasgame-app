import { USE_MOCK, apiGet, apiPut } from "../client";
import { MOCK_USER_INFO, MOCK_USER_SETTINGS } from "../mock/user.mock";
import type { UserInfo, UserSettings } from "../types";

export async function getUserInfoApi(): Promise<UserInfo> {
  if (USE_MOCK) return MOCK_USER_INFO;
  return apiGet<UserInfo>("/api/v1/users/me");
}

export async function getUserSettingsApi(): Promise<UserSettings> {
  if (USE_MOCK) return MOCK_USER_SETTINGS;
  return apiGet<UserSettings>("/api/v1/users/me/settings");
}

export async function updateUserSettingsApi(settings: Partial<UserSettings>): Promise<UserSettings> {
  if (USE_MOCK) return { ...MOCK_USER_SETTINGS, ...settings };
  return apiPut<UserSettings>("/api/v1/users/me/settings", settings);
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
