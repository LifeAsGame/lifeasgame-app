import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalPage, JournalSubtype, QuickRecordRequest } from "@/shared/api/types";
import { getJournalDetailApi, listJournalApi, quickRecordApi } from "./api";
import { journalMock, MOCK_JOURNAL_ENTRIES, resetJournalMock } from "./mock";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

const emptyPage: JournalPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

describe("Journal을 실제 backend에서 읽을 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJournalMock();
    client.apiGet.mockResolvedValue(emptyPage);
    client.apiPost.mockResolvedValue({ sourceType: "COLLECTION", sourceId: 31, recordedAt: "2026-08-14T00:00:00Z", replay: false });
  });

  describe("목록 filter와 server page를 요청하면", () => {
    it("self endpoint에 Role/subtype/page/size만 안전하게 encode하고 ApiResponse result를 사용한다", async () => {
      const result = await listJournalApi({ primaryRoleId: 31, subtype: "MEMORY/NOTE" as JournalSubtype, page: 2, size: 5 });

      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/lifelogs?primaryRoleId=31&subtype=MEMORY%2FNOTE&page=2&size=5");
      expect(client.apiGet.mock.calls[0][0]).not.toContain("playerId");
      expect(result).toBe(emptyPage);
    });

    it("All filters에서는 identity query 없이 page/size만 전송한다", async () => {
      await listJournalApi({ page: 0, size: 20 });

      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/lifelogs?page=0&size=20");
    });
  });

  describe("Journal detail을 선택하면", () => {
    it("sourceId가 아니라 lifeLogId로 canonical detail endpoint를 호출한다", async () => {
      client.apiGet.mockResolvedValueOnce({ lifeLogId: 104 });

      await getJournalDetailApi(104);

      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/lifelogs/104");
    });
  });

  describe("Quick Record를 저장하면", () => {
    it("self endpoint에 exact payload와 Idempotency-Key만 전달한다", async () => {
      const body: QuickRecordRequest = {
        type: "COLLECTION",
        lifeLogSubtype: "MEMORY",
        primaryRoleId: 31,
        collection: { category: "BOOK", title: "Private title", quantity: 1 },
      };

      await quickRecordApi(body, "quick-key-31");

      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/lifelogs/quick-record", body, {
        headers: { "Idempotency-Key": "quick-key-31" },
      });
      expect(body).not.toHaveProperty("playerId");
      expect(body).not.toHaveProperty("userId");
      expect(body.collection).not.toHaveProperty("lifeLogSubtype");
      expect(body.collection).not.toHaveProperty("primaryRoleId");
      expect(body.collection).not.toHaveProperty("roleEventId");
      expect(body).not.toHaveProperty("reflectionScope");
      expect(body).not.toHaveProperty("roleEventId");
    });
  });

  describe("mock mode contract를 사용하면", () => {
    it("세 physical source와 QUICK entryMode, nullable legacy metadata만 제공한다", () => {
      const sourceTypes = MOCK_JOURNAL_ENTRIES.map(({ sourceType }) => sourceType as string);
      const quick = MOCK_JOURNAL_ENTRIES.find(({ entryMode }) => entryMode === "QUICK")!;
      const legacy = MOCK_JOURNAL_ENTRIES.find(({ entryMode }) => entryMode === null)!;

      expect(new Set(sourceTypes)).toEqual(new Set(["COLLECTION", "EXERCISE", "MEDIA"]));
      expect(sourceTypes).not.toContain("QUICK");
      expect(quick.sourceType).toBe("EXERCISE");
      expect(legacy).toEqual(expect.objectContaining({ subtype: null, entryMode: null, reflectionScope: null, primaryRoleId: null, roleEventId: null }));
    });

    it("filter와 paging 후에도 server mock order와 lifeLogId detail identity를 유지한다", () => {
      const firstPage = journalMock.page({ page: 0, size: 2 });
      const rolePage = journalMock.page({ primaryRoleId: 2, page: 0, size: 20 });

      expect(firstPage.content.map(({ lifeLogId }) => lifeLogId)).toEqual([104, 103]);
      expect(firstPage).toEqual(expect.objectContaining({ page: 0, size: 2, totalElements: 4, totalPages: 2 }));
      expect(rolePage.content.map(({ lifeLogId }) => lifeLogId)).toEqual([102]);
      expect(journalMock.detail(103)).toEqual(expect.objectContaining({ lifeLogId: 103, sourceType: "EXERCISE", entryMode: "QUICK" }));
    });

    it("같은 key/payload는 같은 Source를 replay하고 Journal authority에 한 번만 기록한다", () => {
      const body: QuickRecordRequest = {
        type: "EXERCISE",
        lifeLogSubtype: "ACTIVITY",
        exercise: { category: "RUNNING", durationMinutes: 1, exercisedOn: "2026-08-14", distanceKm: 0, calories: 0 },
      };

      const first = journalMock.quickRecord(body, "same-key");
      const replay = journalMock.quickRecord(body, "same-key");
      const page = journalMock.page({ page: 0, size: 20 });
      const matches = page.content.filter((entry) => entry.sourceType === first.sourceType && entry.sourceId === first.sourceId);

      expect(first.replay).toBe(false);
      expect(replay).toEqual({ ...first, replay: true });
      expect(matches).toHaveLength(1);
      expect(matches[0].entryMode).toBe("QUICK");
      expect(matches[0].lifeLogId).not.toBe(first.sourceId);
      expect(matches[0].preview).toEqual(expect.objectContaining({ distanceKm: 0, calories: 0 }));
      expect(journalMock.detail(matches[0].lifeLogId)).toEqual(expect.objectContaining({ sourceId: first.sourceId }));
    });
  });
});
