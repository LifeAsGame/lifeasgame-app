import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import { getPlayerAchievementApi, getPlayerAchievementsApi } from "./api";
import { achievementMock } from "./mock";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

const achievement: PlayerAchievementInfo = {
  achievementId: 31,
  code: "FIRST_STEP",
  name: "First Step",
  category: "GROWTH",
  descMd: "Completed the first step.",
  acquiredAt: "2026-08-14T00:00:00Z",
};

describe("Current Player Achievement API를 사용할 때", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envelope-aware client로 exact list/detail paths만 호출하고 list infos를 반환한다", async () => {
    client.apiGet.mockResolvedValueOnce({ infos: [achievement] }).mockResolvedValueOnce(achievement);

    const list = await getPlayerAchievementsApi();
    const detail = await getPlayerAchievementApi(31);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/players/achievements");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/players/achievements/31");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toMatch(/playerId|userId|catalog|\/players\/me\/achievements/);
    expect(list).toEqual([achievement]);
    expect(detail).toEqual(achievement);
  });

  it("mock acquired authority는 exact fields, stable order, unknown-ID not-found를 유지한다", () => {
    const list = achievementMock.list();
    const first = list[0];

    expect(Object.keys(first)).toEqual(["achievementId", "code", "name", "category", "descMd", "acquiredAt"]);
    expect(achievementMock.detail(first.achievementId)).toEqual(first);
    expect(achievementMock.list().map(({ achievementId }) => achievementId)).toEqual(list.map(({ achievementId }) => achievementId));
    expect(() => achievementMock.detail(999_999)).toThrow("Acquired Achievement not found.");
  });
});
