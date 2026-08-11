import { USE_MOCK, apiPost } from "@/shared/api/client";

export type RegisterPlayerRequest = { name: string; gender: string };
export type CreatedPlayerWithToken = {
  id: number;
  accessToken: string;
  refreshToken: string;
};

export async function registerPlayerApi(body: RegisterPlayerRequest): Promise<CreatedPlayerWithToken> {
  if (USE_MOCK) {
    const id = Date.now();
    return { id, accessToken: `mock-player-access-${id}`, refreshToken: `mock-player-refresh-${id}` };
  }
  return apiPost<CreatedPlayerWithToken>("/api/v1/players/register", body);
}
