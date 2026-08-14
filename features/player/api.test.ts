import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerAchievementInfo, PlayerCertificationInfo, PlayerInfo, PlayerTitleInfo } from "@/shared/api/types";
import {
  deletePlayerCertificationApi,
  getCertificationCatalogApi,
  getPlayerAchievementApi,
  getPlayerAchievementsApi,
  getPlayerCertificationsApi,
  getCurrentPlayerApi,
  getPlayerTitlesApi,
  registerPlayerCertificationApi,
  updatePlayerCertificationApi,
  setRepresentativeTitleApi,
} from "./api";
import { achievementMock, certificationMock, resetCertificationMock, resetTitleMock, titleMock } from "./mock";

const client = vi.hoisted(() => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPatch: vi.fn(), apiPost: vi.fn() }));

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

describe("Current Player Certification API를 사용할 때", () => {
  const owned: PlayerCertificationInfo = { certificationId: 3, name: "Kubernetes Administrator", issuer: "CNCF", category: "DevOps", acquiredDate: null, expiresDate: null, grantedAt: "2026-08-14T00:00:00Z" };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCertificationMock();
  });

  it("envelope-aware helpers로 exact five operations와 bodies만 전송한다", async () => {
    client.apiGet.mockResolvedValueOnce({ infos: [{ certificationId: 3, name: owned.name, issuer: owned.issuer, category: owned.category }] }).mockResolvedValueOnce({ infos: [owned] });
    client.apiPost.mockResolvedValue({ certificationId: 3, acquiredDate: null, expiresDate: null });
    client.apiPatch.mockResolvedValue({ certificationId: 3, acquiredDate: "2026-08-01", expiresDate: null });
    client.apiDelete.mockResolvedValue(3);

    await getCertificationCatalogApi();
    await getPlayerCertificationsApi();
    await registerPlayerCertificationApi(3, {});
    await updatePlayerCertificationApi(3, { acquiredDate: "2026-08-01" });
    await deletePlayerCertificationApi(3);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/certifications");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/players/certifications");
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/players/certifications/3", {});
    expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/players/certifications/3", { acquiredDate: "2026-08-01" });
    expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/certifications/3");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toMatch(/playerId|userId|\/players\/me\/certifications/);
  });

  it("mock는 catalog/owned를 분리하고 duplicate, preserve, date order, delete semantics를 지킨다", () => {
    expect(certificationMock.catalog()).toHaveLength(4);
    expect(certificationMock.owned()).toHaveLength(2);
    expect(() => certificationMock.register(1, {})).toThrow("Certification already registered.");

    certificationMock.register(3, { acquiredDate: "2026-08-01" });
    expect(certificationMock.update(3, { expiresDate: null })).toEqual({ certificationId: 3, acquiredDate: "2026-08-01", expiresDate: null });
    expect(() => certificationMock.update(3, { expiresDate: "2026-07-31" })).toThrow("Expiration date cannot be before acquired date.");
    expect(certificationMock.delete(3)).toBe(3);
    expect(certificationMock.owned().some(({ certificationId }) => certificationId === 3)).toBe(false);
  });
});

describe("Current Player Title API를 사용할 때", () => {
  const player = { playerId: 7, representativeTitleId: 31 } as PlayerInfo;
  const title: PlayerTitleInfo = { titleId: 31, code: "VANGUARD", name: "Vanguard", category: "Combat", descMd: "Leads from the front.", acquiredAt: "2026-08-14T00:00:00Z" };

  beforeEach(() => {
    vi.clearAllMocks();
    resetTitleMock();
  });

  it("exact Current Player/list GET과 body 없는 PATCH만 호출하고 list envelope를 푼다", async () => {
    client.apiGet.mockResolvedValueOnce(player).mockResolvedValueOnce({ infos: [title] });
    client.apiPatch.mockResolvedValue({ titleId: 31 });

    expect(await getCurrentPlayerApi()).toEqual(player);
    expect(await getPlayerTitlesApi()).toEqual([title]);
    expect(await setRepresentativeTitleApi(31)).toEqual({ titleId: 31 });

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/players");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/players/titles");
    expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/players/titles/31", undefined);
    expect([...client.apiGet.mock.calls, ...client.apiPatch.mock.calls].flat().join(" ")).not.toMatch(/playerId|userId|\/players\/me\/|\/api\/v1\/titles/);
  });

  it("mock authority는 acquired ID만 대표로 설정하고 Current Player에 반영한다", () => {
    const nextId = titleMock.titles()[1].titleId;
    expect(titleMock.setRepresentative(nextId)).toEqual({ titleId: nextId });
    expect(titleMock.player().representativeTitleId).toBe(nextId);
    expect(() => titleMock.setRepresentative(999_999)).toThrow("Acquired Title not found.");
  });
});
