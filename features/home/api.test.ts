import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHomeApi } from "./api";
import { MOCK_HOME_SUMMARY } from "./mock";

const client = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Home world summary를 backend에서 읽을 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue(MOCK_HOME_SUMMARY);
  });

  describe("authenticated Home을 요청하면", () => {
    it("identity나 query 없이 정확히 GET /api/v1/home result를 사용한다", async () => {
      const result = await getHomeApi();

      expect(client.apiGet).toHaveBeenCalledOnce();
      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/home");
      expect(client.apiGet.mock.calls[0][0]).not.toMatch(/[?]|playerId|userId/);
      expect(result).toBe(MOCK_HOME_SUMMARY);
    });

    it("composed Home result shape를 그대로 반환한다", async () => {
      const result = await getHomeApi();

      expect(result).toEqual(expect.objectContaining({
        generatedAt: expect.any(String),
        recentJournal: expect.any(Array),
        recentAchievements: expect.any(Array),
        journey: expect.objectContaining({ currentQuests: expect.any(Array), selectedRoutes: expect.any(Array) }),
        roleActivity30d: expect.objectContaining({ roles: expect.any(Array) }),
      }));
    });
  });

  describe("Home mock contract를 사용하면", () => {
    it("backend casing과 nullable metadata를 지키고 page/detail 전용 field를 추가하지 않는다", () => {
      const quick = MOCK_HOME_SUMMARY.recentJournal.find(({ entryMode }) => entryMode === "QUICK")!;

      expect(quick).toEqual(expect.objectContaining({ sourceType: "COLLECTION", subtype: null, roleEventId: null }));
      expect(quick).not.toHaveProperty("sourceId");
      expect(MOCK_HOME_SUMMARY.journey.currentQuests.map(({ status }) => status)).toEqual(["GOAL_REACHED", "IN_PROGRESS"]);
      expect(MOCK_HOME_SUMMARY.journey.selectedRoutes).toHaveLength(2);
      expect(MOCK_HOME_SUMMARY.roleActivity30d).toEqual(expect.objectContaining({ assignedRecords: 8, unassignedRecords: 2, totalRecords: 10 }));
      expect(MOCK_HOME_SUMMARY.roleActivity30d.roles.some(({ roleName }) => roleName === null)).toBe(true);
    });
  });
});
