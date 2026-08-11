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
    it("catalog/list/detail의 raw response path와 status query를 그대로 사용한다", async () => {
      client.apiGetRaw
        .mockResolvedValueOnce({ blueprints: [] })
        .mockResolvedValueOnce({ acceptances: [] })
        .mockResolvedValueOnce({ code: "Q_ONE", acceptance: null });

      await listQuestCatalogApi();
      await listPlayerQuestsApi("GOAL_REACHED");
      await getPlayerQuestApi("Q_ONE");

      expect(client.apiGetRaw).toHaveBeenNthCalledWith(1, "/api/v1/quests/catalog");
      expect(client.apiGetRaw).toHaveBeenNthCalledWith(2, "/api/v1/players/quests?status=GOAL_REACHED");
      expect(client.apiGetRaw).toHaveBeenNthCalledWith(3, "/api/v1/players/quests/Q_ONE");
    });
  });

  describe("Quest mutation 계약을 사용하면", () => {
    it("accept/manual-check/DELETE cancel의 path와 body만 전송하고 reward endpoint를 만들지 않는다", async () => {
      await acceptQuestApi("Q_ONE");
      await manualCheckQuestApi("Q_ONE");
      await cancelQuestApi("Q_ONE", "Changed direction");

      expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/players/quests/Q_ONE", { partyId: null, guildId: null });
      expect(client.apiPost).toHaveBeenNthCalledWith(2, "/api/v1/players/quests/Q_ONE/manual-check", {});
      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/quests/Q_ONE", { reason: "Changed direction" });
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
    it("현재 P0 DTO와 단일 active Route만 제공하고 legacy 상태를 노출하지 않는다", () => {
      resetJourneyMock();
      const quests = journeyMock.acceptances();
      const routes = journeyMock.routes();

      expect(quests.map(({ status }) => status)).toEqual(expect.arrayContaining(["IN_PROGRESS", "GOAL_REACHED", "COMPLETED", "CANCELED"]));
      expect(quests.map(({ status }) => status)).not.toEqual(expect.arrayContaining(["PENDING", "CANCELLED", "EXPIRED"]));
      expect(quests[0]).toEqual(expect.objectContaining({ progressValue: expect.any(Number), completionPolicy: expect.any(String) }));
      expect(routes).toHaveLength(1);
      expect(routes[0].code).toBe("ROUTE_RECORD_START");
    });
  });
});
