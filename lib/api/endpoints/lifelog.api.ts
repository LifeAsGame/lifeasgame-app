import { USE_MOCK, apiGet, apiPost } from "../client";
import { MOCK_MEDIA_LOGS } from "../mock/lifelog.mock";
import type { MediaLogInfo } from "../types";

export async function getMediaLogsApi(): Promise<MediaLogInfo[]> {
  if (USE_MOCK) return MOCK_MEDIA_LOGS;
  const res = await apiGet<{ items: MediaLogInfo[] }>("/api/v1/lifelogs/me/media");
  return res.items;
}

export async function createMediaLogApi(data: {
  category: string;
  title: string;
  originalTitle: string | null;
  totalEpisode: number;
  status: string;
  rating: number | null;
  tags: string[];
  startedOn: string | null;
}): Promise<MediaLogInfo> {
  if (USE_MOCK) {
    const newEntry: MediaLogInfo = {
      id: Date.now(),
      playerId: 6,
      ...data,
      currentEpisode: 0,
      rewatchCount: 0,
      finishedOn: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newEntry;
  }
  return apiPost<MediaLogInfo>("/api/v1/lifelogs/me/media", data);
}
