import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HobbyCatalogInfo, PlayerAchievementInfo, PlayerCertificationInfo, PlayerHobbyInfo, PlayerInfo, PlayerTitleInfo } from "@/shared/api/types";
import {
  deletePlayerCertificationApi,
  deletePlayerHobbyApi,
  getCertificationCatalogApi,
  getPlayerAchievementApi,
  getPlayerAchievementsApi,
  getPlayerCertificationsApi,
  getCurrentPlayerApi,
  getHobbyCatalogApi,
  getPlayerHobbiesApi,
  getPlayerTitlesApi,
  registerPlayerCertificationApi,
  registerPlayerHobbyApi,
  updatePlayerCertificationApi,
  setRepresentativeTitleApi,
  updatePlayerHobbyApi,
} from "./api";
import { achievementMock, certificationMock, hobbyMock, resetCertificationMock, resetHobbyMock, resetTitleMock, titleMock } from "./mock";

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

describe("Current Player Hobby API를 사용할 때", () => {
  const catalog: HobbyCatalogInfo = { hobbyId: 3, name: "Running", category: "Fitness" };
  const owned: PlayerHobbyInfo = { ...catalog, customName: "Morning Run", detail: null, proficiency: 60, status: "PAUSED", startedOn: null, xp: 1200 };

  beforeEach(() => {
    vi.clearAllMocks();
    resetHobbyMock();
  });

  it("envelope-aware helpers로 exact five operations와 changed body만 전송한다", async () => {
    client.apiGet.mockResolvedValueOnce({ infos: [catalog] }).mockResolvedValueOnce({ infos: [owned] });
    client.apiPost.mockResolvedValue(owned);
    client.apiPatch.mockResolvedValue({ ...owned, status: "ACTIVE" });
    client.apiDelete.mockResolvedValue(3);

    await getHobbyCatalogApi();
    await getPlayerHobbiesApi();
    await registerPlayerHobbyApi(3, { customName: "Morning Run", proficiency: 60, status: "PAUSED" });
    await updatePlayerHobbyApi(3, { status: "ACTIVE" });
    await deletePlayerHobbyApi(3);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/hobbies");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/players/hobbies");
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/players/hobbies/3", { customName: "Morning Run", proficiency: 60, status: "PAUSED" });
    expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/players/hobbies/3", { status: "ACTIVE" });
    expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/hobbies/3");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toMatch(/playerId|userId|\/players\/me\/hobbies/);
  });

  it("mock는 catalog/owned 분리, exact status, bounds, partial preserve, duplicate와 delete를 지킨다", () => {
    expect(hobbyMock.catalog()).toHaveLength(4);
    expect(hobbyMock.owned()).toHaveLength(2);
    expect(() => hobbyMock.register(1, { customName: "Duplicate", proficiency: 1, status: "ACTIVE" })).toThrow("Hobby already registered.");
    hobbyMock.register(3, { customName: "Run", proficiency: 50, status: "DROPPED" });
    expect(hobbyMock.update(3, { proficiency: 60 })).toMatchObject({ customName: "Run", proficiency: 60, status: "DROPPED", startedOn: null });
    expect(() => hobbyMock.update(3, { proficiency: 101 })).toThrow("Proficiency must be between 0 and 100.");
    expect(hobbyMock.delete(3)).toBe(3);
  });
});
