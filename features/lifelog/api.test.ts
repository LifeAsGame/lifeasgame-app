import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalPage, JournalSubtype } from "@/shared/api/types";
import { getJournalDetailApi, listJournalApi } from "./api";
import { journalMock, MOCK_JOURNAL_ENTRIES } from "./mock";

const client = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

const emptyPage: JournalPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

describe("Journal을 실제 backend에서 읽을 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue(emptyPage);
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
  });
});
