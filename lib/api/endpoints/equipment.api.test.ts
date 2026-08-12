import { beforeEach, describe, expect, it, vi } from "vitest";

import { equipGearApi, getEquippedGearApi, unequipGearApi } from "./equipment.api";
import { equipmentMock } from "../mock/equipment.mock";

const client = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Equipment를 실제 backend에 연결할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipmentMock.reset();
  });

  describe("현재 player의 equipment infos를 조회하면", () => {
    it("result.infos를 exact endpoint에서 꺼내 반환한다", async () => {
      const infos = [{ slotId: 42, slotCode: "RING_LEFT", slotName: "Left Ring", slotCategory: "RING", slotRole: "LEFT", itemInstanceId: null }];
      client.apiGet.mockResolvedValue({ infos });

      await expect(getEquippedGearApi()).resolves.toEqual(infos);
      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/players/equipment");
    });
  });

  describe("명시적으로 선택한 slot을 변경하면", () => {
    it("equip은 실제 slotId path와 itemInstanceId body를 사용한다", async () => {
      client.apiPut.mockResolvedValue({ slotId: 42, itemInstanceId: 501 });

      await equipGearApi(42, 501);

      expect(client.apiPut).toHaveBeenCalledWith("/api/v1/players/equipment/42", { itemInstanceId: 501 });
    });

    it("unequip은 itemInstanceId가 아닌 실제 slotId path를 사용한다", async () => {
      client.apiDelete.mockResolvedValue({ slotId: 42 });

      await unequipGearApi(42);

      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/equipment/42");
    });
  });

  describe("mock equipment contract를 사용하면", () => {
    it("API DTO에는 composed item metadata가 없고 mutation은 itemInstanceId만 바꾼다", () => {
      const before = equipmentMock.infos().infos[0];
      equipmentMock.equip(before.slotId, 999);
      const after = equipmentMock.infos().infos[0];

      expect(Object.keys(before)).toEqual(["slotId", "slotCode", "slotName", "slotCategory", "slotRole", "itemInstanceId"]);
      expect(after).toEqual({ ...before, itemInstanceId: 999 });
      expect(after).not.toHaveProperty("itemName");
      expect(after).not.toHaveProperty("itemRarity");
      expect(after).not.toHaveProperty("itemAttrs");
    });
  });
});
