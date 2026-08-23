import { describe, expect, it } from "vitest";

import { DEFAULT_SUB_SELECTIONS, MAIN_NAV_ITEMS, SUBMENUS_BY_MAIN } from "./config";

describe("primary Orb navigation을 구성할 때", () => {
  describe("Home을 default world surface로 사용하면", () => {
    it("Home Orb를 추가하지 않는다", () => {
      expect(MAIN_NAV_ITEMS.some(({ id }) => (id as string) === "home")).toBe(false);
    });
  });

  describe("Journey 정책을 적용하면", () => {
    it("Quest Orb를 Current/Catalog/Routes로 구성하고 Party/Guild Quest를 노출하지 않는다", () => {
      expect(MAIN_NAV_ITEMS.find(({ id }) => id === "quests")).toEqual({ id: "quests", label: "Journey", slotLabel: "QU" });
      expect(SUBMENUS_BY_MAIN.quests.map(({ id }) => id)).toEqual(["current", "catalog", "routes"]);
    });
  });

  describe("현재 Role 정책을 적용하면", () => {
    it("Social 자리에 Role/RL을 노출하고 Role surface를 세 개로 제한한다", () => {
      const role = MAIN_NAV_ITEMS.find(({ id }) => id === "role");

      expect(role).toEqual({ id: "role", label: "Role", slotLabel: "RL" });
      expect(MAIN_NAV_ITEMS.some(({ id }) => id === "social")).toBe(false);
      expect(SUBMENUS_BY_MAIN.role.map(({ id }) => id)).toEqual(["overview", "relations", "events"]);
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
      expect(MAIN_NAV_ITEMS.find(({ id }) => id === "market")).toEqual({ id: "market", label: "Exchange", slotLabel: "EX" });
      expect(SUBMENUS_BY_MAIN.market.map(({ id }) => id)).toEqual(["wallet", "shop", "trade"]);
    });
  });
});
