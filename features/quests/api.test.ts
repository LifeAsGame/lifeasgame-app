import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptQuestApi,
  advanceQuestRouteApi,
  cancelQuestApi,
  getMyQuestRouteApi,
  getMyQuestRouteStepApi,
  getPlayerQuestApi,
  getQuestRouteApi,
  listMyQuestRoutesApi,
  listPlayerQuestsApi,
  listQuestCatalogApi,
  listQuestRoutesApi,
  manualCheckQuestApi,
  selectQuestRouteApi,
} from "./api";
import { journeyMock, resetJourneyMock } from "./mock";
import type { QuestStatus } from "@/shared/api/types";

const client = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiGetRaw: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Journey API를 실제 backend에 연결할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const request of Object.values(client)) request.mockResolvedValue({});
  });

  describe("Quest query 계약을 사용하면", () => {
    it("catalog/list/detail의 raw response path에서 status와 questCode를 encode한다", async () => {
      client.apiGetRaw
        .mockResolvedValueOnce({ blueprints: [] })
        .mockResolvedValueOnce({ acceptances: [] })
        .mockResolvedValueOnce({ code: "Q/ONE ?", acceptance: null });

      await listQuestCatalogApi();
      await listPlayerQuestsApi("GOAL/REACHED" as QuestStatus);
      await getPlayerQuestApi("Q/ONE ?");

      expect(client.apiGetRaw).toHaveBeenNthCalledWith(1, "/api/v1/quests/catalog");
      expect(client.apiGetRaw).toHaveBeenNthCalledWith(2, "/api/v1/players/quests?status=GOAL%2FREACHED");
      expect(client.apiGetRaw).toHaveBeenNthCalledWith(3, "/api/v1/players/quests/Q%2FONE%20%3F");
    });
  });

  describe("Quest mutation 계약을 사용하면", () => {
    it("encoded questCode path와 typed body만 전송하고 reward endpoint를 만들지 않는다", async () => {
      await acceptQuestApi("Q/ONE ?");
      await manualCheckQuestApi("Q/ONE ?");
      await cancelQuestApi("Q/ONE ?", "Changed direction");

      expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/players/quests/Q%2FONE%20%3F", { partyId: null, guildId: null });
      expect(client.apiPost).toHaveBeenNthCalledWith(2, "/api/v1/players/quests/Q%2FONE%20%3F/manual-check", {});
      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/quests/Q%2FONE%20%3F", { reason: "Changed direction" });
      expect([...client.apiPost.mock.calls, ...client.apiDelete.mock.calls].some(([path]) => String(path).includes("reward"))).toBe(false);
    });
  });

  describe("QuestRoute query 계약을 사용하면", () => {
    it("catalog/detail과 my route/current step endpoint를 구분한다", async () => {
      client.apiGet
        .mockResolvedValueOnce({ routes: [] })
        .mockResolvedValueOnce({ id: 7 })
        .mockResolvedValueOnce({ routes: [] })
        .mockResolvedValueOnce({ id: 7 })
        .mockResolvedValueOnce({ routeId: 7, step: { id: 9 } });

      await listQuestRoutesApi();
      await getQuestRouteApi(7);
      await listMyQuestRoutesApi();
      await getMyQuestRouteApi(7);
      await getMyQuestRouteStepApi(7, 9);

      expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/quest-routes");
      expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/quest-routes/7");
      expect(client.apiGet).toHaveBeenNthCalledWith(3, "/api/v1/quest-routes/my");
      expect(client.apiGet).toHaveBeenNthCalledWith(4, "/api/v1/quest-routes/my/7");
      expect(client.apiGet).toHaveBeenNthCalledWith(5, "/api/v1/quest-routes/my/7/steps/9");
    });
  });

  describe("QuestRoute mutation 계약을 사용하면", () => {
    it("selection과 expectedStepId 기반 advance를 독립 endpoint로 보낸다", async () => {
      await selectQuestRouteApi(7);
      await advanceQuestRouteApi(7, 9);

      expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/quest-routes/7/select", {});
      expect(client.apiPost).toHaveBeenNthCalledWith(2, "/api/v1/quest-routes/my/7/advance", { expectedStepId: 9 });
    });
  });

  describe("mock mode 계약을 구성하면", () => {
    beforeEach(resetJourneyMock);

    it("현재 P0 DTO와 단일 active Route만 제공하고 legacy 상태를 노출하지 않는다", () => {
      const quests = journeyMock.acceptances();
      const routes = journeyMock.routes();
      const statuses = quests.map(({ status }) => status as string);

      expect(statuses).toEqual(expect.arrayContaining(["IN_PROGRESS", "GOAL_REACHED", "COMPLETED", "CANCELED"]));
      expect(statuses).not.toContain("PENDING");
      expect(statuses).not.toContain("CANCELLED");
      expect(statuses).not.toContain("EXPIRED");
      expect(quests[0]).toEqual(expect.objectContaining({ progressValue: expect.any(Number), completionPolicy: expect.any(String) }));
      expect(routes).toHaveLength(1);
      expect(routes[0].code).toBe("ROUTE_RECORD_START");
    });

    it("IN_PROGRESS와 GOAL_REACHED manual-check를 COMPLETED로 전환한다", () => {
      const inProgress = journeyMock.accept("Q_RECOVERY_REST_TEN");

      expect(inProgress.status).toBe("IN_PROGRESS");
      expect(journeyMock.manualCheck(inProgress.code).status).toBe("COMPLETED");
      expect(journeyMock.manualCheck("Q_GROWTH_ONE_FOCUS").status).toBe("COMPLETED");
    });

    it("COMPLETED manual-check를 idempotent no-op으로 처리해 timestamps를 보존한다", () => {
      vi.useFakeTimers();
      vi.setSystemTime("2026-08-11T01:00:00Z");
      const completed = journeyMock.manualCheck("Q_GROWTH_ONE_FOCUS");
      vi.setSystemTime("2026-08-12T01:00:00Z");
      const repeated = journeyMock.manualCheck("Q_GROWTH_ONE_FOCUS");
      vi.useRealTimers();

      expect(repeated.goalReachedAt).toBe(completed.goalReachedAt);
      expect(repeated.completedAt).toBe(completed.completedAt);
    });

    it("CANCELED cancel은 no-op이고 COMPLETED cancel은 거절한다", () => {
      const canceledBefore = journeyMock.acceptances().find(({ code }) => code === "Q_RECORD_WEEKLY_LOOKBACK")!;

      journeyMock.cancel(canceledBefore.code);
      journeyMock.cancel(canceledBefore.code);

      expect(journeyMock.acceptances().find(({ id }) => id === canceledBefore.id)).toEqual(canceledBefore);
      expect(() => journeyMock.cancel("Q_RECORD_FIRST_TRACE")).toThrow("Quest cannot be canceled.");
    });
  });
});
