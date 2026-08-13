import { USE_MOCK, apiDelete, apiGet, apiGetRaw, apiPost, apiPostRaw } from "@/shared/api/client";
import type {
  CollectionCreateRequest,
  CollectionCreated,
  CollectionDeleted,
  CollectionInfo,
  CollectionSearchParams,
  CollectionUpdateRequest,
  JournalDetail,
  JournalListParams,
  JournalPage,
  QuickRecordRequest,
  QuickRecordResult,
} from "@/shared/api/types";
import { collectionMock, journalMock } from "./mock";

const COLLECTION_PATH = "/api/v1/players/collections";

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
