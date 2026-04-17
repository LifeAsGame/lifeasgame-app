import { USE_MOCK, apiDelete, apiGet, apiPost } from "../client";
import {
  MOCK_COLLECTIONS,
  MOCK_EXERCISES,
  MOCK_MEDIA_LOGS,
} from "../mock/lifelog.mock";
import type { CollectionInfo, ExerciseInfo, MediaLogInfo } from "../types";

export async function getExercisesApi(): Promise<ExerciseInfo[]> {
  if (USE_MOCK) return MOCK_EXERCISES;
  const res = await apiGet<{ items: ExerciseInfo[] }>("/api/v1/lifelogs/me/exercises");
  return res.items;
}

export async function createExerciseApi(data: {
  category: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories: number | null;
  exercisedOn: string;
  memo: string | null;
}): Promise<ExerciseInfo> {
  if (USE_MOCK) {
    const newEntry: ExerciseInfo = {
      id: Date.now(),
      playerId: 6,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newEntry;
  }
  return apiPost<ExerciseInfo>("/api/v1/lifelogs/me/exercises", data);
}

export async function deleteExerciseApi(id: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/lifelogs/me/exercises/${id}`);
}

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

export async function getCollectionsApi(): Promise<CollectionInfo[]> {
  if (USE_MOCK) return MOCK_COLLECTIONS;
  const res = await apiGet<{ items: CollectionInfo[] }>("/api/v1/lifelogs/me/collections");
  return res.items;
}

export async function createCollectionApi(data: {
  category: string;
  title: string;
  originalTitle: string | null;
  quantity: number | null;
  conditionNote: string | null;
  acquiredFrom: string | null;
  tags: string[];
}): Promise<CollectionInfo> {
  if (USE_MOCK) {
    const newEntry: CollectionInfo = {
      id: Date.now(),
      playerId: 6,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newEntry;
  }
  return apiPost<CollectionInfo>("/api/v1/lifelogs/me/collections", data);
}

export async function deleteCollectionApi(id: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/lifelogs/me/collections/${id}`);
}
