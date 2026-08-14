import { USE_MOCK, apiDelete, apiGet, apiGetRaw, apiPatch, apiPost, apiPostRaw } from "@/shared/api/client";
import type {
  CollectionCreateRequest,
  CollectionCreated,
  CollectionDeleted,
  CollectionInfo,
  CollectionSearchParams,
  CollectionUpdateRequest,
  ExerciseCreateRequest,
  ExerciseCreated,
  ExerciseDeleted,
  ExerciseInfo,
  ExerciseSearchParams,
  ExerciseUpdateRequest,
  JournalDetail,
  JournalListParams,
  JournalPage,
  MediaCreateRequest,
  MediaCreated,
  MediaDeleted,
  MediaInfo,
  MediaSearchParams,
  MediaUpdateRequest,
  QuickRecordRequest,
  QuickRecordResult,
} from "@/shared/api/types";
import { collectionMock, exerciseMock, journalMock, mediaMock } from "./mock";

const COLLECTION_PATH = "/api/v1/players/collections";
const EXERCISE_PATH = "/api/v1/players/exercises";
const MEDIA_PATH = "/api/v1/players/media";

export function recentMediaApi(limit: number): Promise<MediaInfo[]> {
  return USE_MOCK ? Promise.resolve(mediaMock.recent(limit)) : apiGetRaw<MediaInfo[]>(`${MEDIA_PATH}/recent?limit=${limit}`);
}

export function searchMediaApi(params: MediaSearchParams): Promise<MediaInfo[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.status) query.set("status", params.status);
  if (params.titleLike) query.set("titleLike", params.titleLike);
  query.set("page", String(params.page));
  query.set("size", String(params.size));
  return USE_MOCK ? Promise.resolve(mediaMock.search(params)) : apiGetRaw<MediaInfo[]>(`${MEDIA_PATH}/search?${query}`);
}

export function createMediaApi(body: MediaCreateRequest): Promise<MediaCreated> {
  return USE_MOCK ? Promise.resolve().then(() => mediaMock.create(body)) : apiPostRaw<MediaCreated>(MEDIA_PATH, body);
}

export function updateMediaApi(mediaId: number, body: MediaUpdateRequest): Promise<MediaInfo> {
  return USE_MOCK ? Promise.resolve().then(() => mediaMock.update(mediaId, body)) : apiPatch<MediaInfo>(`${MEDIA_PATH}/${mediaId}`, body);
}

export function deleteMediaApi(mediaId: number): Promise<MediaDeleted> {
  return USE_MOCK ? Promise.resolve().then(() => mediaMock.delete(mediaId)) : apiDelete<MediaDeleted>(`${MEDIA_PATH}/${mediaId}`);
}

export function recentExercisesApi(limit: number): Promise<ExerciseInfo[]> {
  return USE_MOCK
    ? Promise.resolve(exerciseMock.recent(limit))
    : apiGetRaw<ExerciseInfo[]>(`${EXERCISE_PATH}/recent?limit=${limit}`);
}

export function searchExercisesApi(params: ExerciseSearchParams): Promise<ExerciseInfo[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  query.set("page", String(params.page));
  query.set("size", String(params.size));
  return USE_MOCK
    ? Promise.resolve(exerciseMock.search(params))
    : apiGetRaw<ExerciseInfo[]>(`${EXERCISE_PATH}/search?${query}`);
}

export function getExerciseApi(exerciseId: number): Promise<ExerciseInfo> {
  return USE_MOCK
    ? Promise.resolve().then(() => exerciseMock.get(exerciseId))
    : apiGet<ExerciseInfo>(`${EXERCISE_PATH}/${exerciseId}`);
}

export function createExerciseApi(body: ExerciseCreateRequest): Promise<ExerciseCreated> {
  return USE_MOCK
    ? Promise.resolve().then(() => exerciseMock.create(body))
    : apiPostRaw<ExerciseCreated>(EXERCISE_PATH, body);
}

export function updateExerciseApi(exerciseId: number, body: ExerciseUpdateRequest): Promise<ExerciseInfo> {
  return USE_MOCK
    ? Promise.resolve().then(() => exerciseMock.update(exerciseId, body))
    : apiPostRaw<ExerciseInfo>(`${EXERCISE_PATH}/${exerciseId}`, body);
}

export function deleteExerciseApi(exerciseId: number): Promise<ExerciseDeleted> {
  return USE_MOCK
    ? Promise.resolve().then(() => exerciseMock.delete(exerciseId))
    : apiDelete<ExerciseDeleted>(`${EXERCISE_PATH}/${exerciseId}`);
}

export function recentCollectionsApi(limit: number): Promise<CollectionInfo[]> {
  return USE_MOCK
    ? Promise.resolve(collectionMock.recent(limit))
    : apiGetRaw<CollectionInfo[]>(`${COLLECTION_PATH}/recent?limit=${limit}`);
}

export function searchCollectionsApi(params: CollectionSearchParams): Promise<CollectionInfo[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.titleLike) query.set("titleLike", params.titleLike);
  query.set("page", String(params.page));
  query.set("size", String(params.size));
  return USE_MOCK
    ? Promise.resolve(collectionMock.search(params))
    : apiGetRaw<CollectionInfo[]>(`${COLLECTION_PATH}/search?${query}`);
}

export function getCollectionApi(collectionId: number): Promise<CollectionInfo> {
  return USE_MOCK
    ? Promise.resolve().then(() => collectionMock.get(collectionId))
    : apiGet<CollectionInfo>(`${COLLECTION_PATH}/${collectionId}`);
}

export function createCollectionApi(body: CollectionCreateRequest): Promise<CollectionCreated> {
  return USE_MOCK
    ? Promise.resolve().then(() => collectionMock.create(body))
    : apiPostRaw<CollectionCreated>(COLLECTION_PATH, body);
}

export function updateCollectionApi(collectionId: number, body: CollectionUpdateRequest): Promise<CollectionInfo> {
  return USE_MOCK
    ? Promise.resolve().then(() => collectionMock.update(collectionId, body))
    : apiPostRaw<CollectionInfo>(`${COLLECTION_PATH}/${collectionId}`, body);
}

export function deleteCollectionApi(collectionId: number): Promise<CollectionDeleted> {
  return USE_MOCK
    ? Promise.resolve().then(() => collectionMock.delete(collectionId))
    : apiDelete<CollectionDeleted>(`${COLLECTION_PATH}/${collectionId}`);
}

export function listJournalApi(params: JournalListParams): Promise<JournalPage> {
  if (USE_MOCK) return Promise.resolve(journalMock.page(params));
  const query = new URLSearchParams();
  if (params.primaryRoleId !== undefined) query.set("primaryRoleId", String(params.primaryRoleId));
  if (params.subtype !== undefined) query.set("subtype", params.subtype);
  query.set("page", String(params.page));
  query.set("size", String(params.size));
  return apiGet<JournalPage>(`/api/v1/lifelogs?${query}`);
}

export function getJournalDetailApi(lifeLogId: number): Promise<JournalDetail> {
  return USE_MOCK
    ? Promise.resolve(journalMock.detail(lifeLogId))
    : apiGet<JournalDetail>(`/api/v1/lifelogs/${lifeLogId}`);
}

export function quickRecordApi(body: QuickRecordRequest, idempotencyKey: string): Promise<QuickRecordResult> {
  return USE_MOCK
    ? Promise.resolve().then(() => journalMock.quickRecord(body, idempotencyKey))
    : apiPost<QuickRecordResult>("/api/v1/lifelogs/quick-record", body, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
}
