import { describe, expect, it } from "vitest";

import { DEFAULT_SUB_SELECTIONS, MAIN_NAV_ITEMS, SUBMENUS_BY_MAIN } from "./config";

describe("primary Orb navigation을 구성할 때", () => {
  describe("Home을 default world surface로 사용하면", () => {
    it("Home Orb를 추가하지 않는다", () => {
      expect(MAIN_NAV_ITEMS.some(({ id }) => (id as string) === "home")).toBe(false);
    });
  });

  describe("unsupported Skills capability를 제외하면", () => {
    it("Skills Orb와 submenu를 production navigation에 노출하지 않는다", () => {
      expect(MAIN_NAV_ITEMS.some(({ id }) => (id as string) === "skills")).toBe(false);
      expect("skills" in SUBMENUS_BY_MAIN).toBe(false);
    });
  });

  describe("Journey 정책을 적용하면", () => {
    it("Quest Orb를 Current/Catalog/Routes로 구성하고 Party/Guild Quest를 노출하지 않는다", () => {
      expect(MAIN_NAV_ITEMS.find(({ id }) => id === "quests")).toEqual({ id: "quests", label: "여정", slotLabel: "QU" });
      expect(SUBMENUS_BY_MAIN.quests.map(({ id }) => id)).toEqual(["current", "catalog", "routes"]);
    });
  });

  describe("Role과 모임을 분리하면", () => {
    it("개인 Role과 공유 Guild/Party에 각각 진입한다", () => {
      const role = MAIN_NAV_ITEMS.find(({ id }) => id === "role");

      expect(role).toEqual({ id: "role", label: "인물 · 역할", slotLabel: "RL" });
      expect(MAIN_NAV_ITEMS.find(({ id }) => id === "social")).toEqual({ id: "social", label: "모임", slotLabel: "SO" });
      expect(SUBMENUS_BY_MAIN.social.map(({ id }) => id)).toEqual(["guilds", "parties", "role-parties"]);
      expect(SUBMENUS_BY_MAIN.role.map(({ id }) => id)).toEqual(["overview", "relations", "events", "parties"]);
      expect(DEFAULT_SUB_SELECTIONS.role).toBeNull();
    });
  });

  describe("LifeLog에 unified Journal을 추가하면", () => {
    it("Journal을 먼저 노출하고 기존 source-specific surface를 모두 유지한다", () => {
      expect(SUBMENUS_BY_MAIN.lifelog.map(({ id }) => id)).toEqual(["journal", "collection", "media", "exercise"]);
    });
  });

  describe("Exchange IA를 노출하면", () => {
    it("market internal key를 유지하고 Wallet/Shop/Trade만 표시한다", () => {
      expect(MAIN_NAV_ITEMS.find(({ id }) => id === "market")).toEqual({ id: "market", label: "거래소", slotLabel: "EX" });
      expect(SUBMENUS_BY_MAIN.market.map(({ id }) => id)).toEqual(["wallet", "shop", "trade"]);
    });
  });

  describe("System capability를 노출하면", () => {
    it("실제 Options와 Logout만 선택 가능하고 Help placeholder를 노출하지 않는다", () => {
      expect(SUBMENUS_BY_MAIN.system.map(({ id }) => id)).toEqual(["options", "logout"]);
    });
  });
});
