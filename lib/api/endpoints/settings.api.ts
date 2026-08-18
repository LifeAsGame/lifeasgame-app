import { USE_MOCK, apiGet, apiPatch } from "../client";
import { settingsMock } from "../mock/settings.mock";
import type { UpdateUserSettingsRequest, UserSettingsResponse } from "@/shared/api/types";

export async function getSettingsApi(): Promise<UserSettingsResponse> {
  return USE_MOCK ? settingsMock.get() : apiGet<UserSettingsResponse>("/api/v1/users/me/settings");
}

export async function updateSettingsApi(request: UpdateUserSettingsRequest): Promise<UserSettingsResponse> {
  return USE_MOCK ? settingsMock.patch(request) : apiPatch<UserSettingsResponse>("/api/v1/users/me/settings", request);
}
