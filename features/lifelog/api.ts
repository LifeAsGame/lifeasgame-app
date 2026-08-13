import { USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import type { JournalDetail, JournalListParams, JournalPage, QuickRecordRequest, QuickRecordResult } from "@/shared/api/types";
import { journalMock } from "./mock";

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
