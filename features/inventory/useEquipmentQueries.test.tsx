import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EquipmentSlotInfo, InventoryEntriesResponse, InventoryEntry } from "@/shared/api/types";
import { ApiError } from "@/shared/api/client";
import { useEquipmentQueries } from "./useEquipmentQueries";

const equipmentApi = vi.hoisted(() => ({
  equipGearApi: vi.fn(),
  getEquippedGearApi: vi.fn(),
  unequipGearApi: vi.fn(),
}));
const inventoryApi = vi.hoisted(() => ({
  claimMailApi: vi.fn(),
  deleteMailApi: vi.fn(),
  getInventoryApi: vi.fn(),
  getMailboxApi: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/equipment.api", () => equipmentApi);
vi.mock("@/lib/api/endpoints/inventory.api", () => inventoryApi);

const item: InventoryEntry = {
  itemInstanceId: 501,
  slotIndex: 3,
  itemId: 101,
  itemName: "Server Sword",
  category: "WEAPON",
  type: "SWORD",
  rarity: "RARE",
  stackable: false,
  maxStack: 1,
  quantity: 1,
  bound: true,
  durability: 88,
  instanceAttrs: { atk: 12 },
};
const inventory: InventoryEntriesResponse = { entries: [item] };
const slots: EquipmentSlotInfo[] = [
  { slotId: 21, slotCode: "MAIN_HAND", slotName: "Main Hand", slotCategory: "WEAPON", slotRole: "MAIN", itemInstanceId: null },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("Gear server query state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipmentApi.getEquippedGearApi.mockResolvedValue(slots);
    equipmentApi.equipGearApi.mockResolvedValue({ slotId: 21, itemInstanceId: 501 });
    equipmentApi.unequipGearApi.mockResolvedValue({ slotId: 21 });
    inventoryApi.getInventoryApi.mockResolvedValue(inventory);
  });

  describe("Gear read model을 처음 불러오면", () => {
    it("Equipment와 좁은 Inventory query만 호출하고 Mailbox는 조회하지 않는다", async () => {
      const { result } = renderHook(() => useEquipmentQueries());

      await waitFor(() => expect(result.current.slots).toHaveLength(1));
      expect(result.current.slots[0].item).toBeNull();
      expect(equipmentApi.getEquippedGearApi).toHaveBeenCalledTimes(1);
      expect(inventoryApi.getInventoryApi).toHaveBeenCalledTimes(1);
      expect(inventoryApi.getMailboxApi).not.toHaveBeenCalled();
    });
  });

  describe("Equip 결과가 성공인지 확정되지 않으면", () => {
    it("duplicate submit을 막고 Equipment와 Inventory를 authoritative reload한다", async () => {
      const request = deferred<{ slotId: number; itemInstanceId: number }>();
      equipmentApi.equipGearApi.mockReturnValue(request.promise);
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(result.current.slots).toHaveLength(1));

      let mutation!: Promise<void>;
      act(() => {
        mutation = result.current.equip(21, 501);
        void result.current.equip(21, 501);
      });
      expect(equipmentApi.equipGearApi).toHaveBeenCalledTimes(1);
      expect(result.current.slots[0].slot.itemInstanceId).toBeNull();
      equipmentApi.getEquippedGearApi.mockResolvedValue([{ ...slots[0], itemInstanceId: 501 }]);

      await act(async () => {
        request.reject(new Error("connection lost"));
        await mutation;
      });

      expect(equipmentApi.getEquippedGearApi).toHaveBeenCalledTimes(2);
      expect(inventoryApi.getInventoryApi).toHaveBeenCalledTimes(2);
      expect(result.current.slots[0].slot.itemInstanceId).toBe(501);
      expect(result.current.slots[0].item?.itemName).toBe("Server Sword");
      expect(result.current.mutationError).toContain("Server state was reloaded");
    });
  });

  describe("Unequip을 요청하면", () => {
    it("duplicate submit을 막고 ambiguous failure 후에도 두 authoritative query를 reload한다", async () => {
      const occupied = [{ ...slots[0], itemInstanceId: 501 }];
      const request = deferred<{ slotId: number }>();
      equipmentApi.getEquippedGearApi.mockResolvedValue(occupied);
      equipmentApi.unequipGearApi.mockReturnValue(request.promise);
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(result.current.slots[0]?.slot.itemInstanceId).toBe(501));

      let mutation!: Promise<void>;
      act(() => {
        mutation = result.current.unequip(21);
        void result.current.unequip(21);
      });
      expect(equipmentApi.unequipGearApi).toHaveBeenCalledTimes(1);
      equipmentApi.getEquippedGearApi.mockResolvedValue(slots);

      await act(async () => {
        request.reject(new Error("response lost"));
        await mutation;
      });

      expect(result.current.slots[0].slot.itemInstanceId).toBeNull();
      expect(equipmentApi.getEquippedGearApi).toHaveBeenCalledTimes(2);
      expect(inventoryApi.getInventoryApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("backend가 Equip을 명시적으로 거절하면", () => {
    it("server message를 표시하고 authoritative reload state를 유지한다", async () => {
      equipmentApi.equipGearApi.mockRejectedValue(new ApiError(409, "PEQ-409", "Item is already equipped"));
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(result.current.slots).toHaveLength(1));

      await act(async () => { await result.current.equip(21, 501); });

      expect(result.current.mutationError).toBe("Equipment request was rejected. Server state was reloaded. Item is already equipped");
      expect(equipmentApi.getEquippedGearApi).toHaveBeenCalledTimes(2);
      expect(inventoryApi.getInventoryApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("pre-mutation Equipment request가 recovery 뒤에 끝나면", () => {
    it("stale success가 recovery state를 덮어쓰지 않는다", async () => {
      const stale = deferred<EquipmentSlotInfo[]>();
      const recovered = [{ ...slots[0], itemInstanceId: 501 }];
      equipmentApi.getEquippedGearApi.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(recovered);
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(equipmentApi.getEquippedGearApi).toHaveBeenCalledTimes(1));

      await act(async () => { await result.current.equip(21, 501); });
      expect(result.current.equipment.data).toEqual(recovered);

      await act(async () => {
        stale.resolve(slots);
        await stale.promise;
      });
      expect(result.current.equipment.data).toEqual(recovered);
      expect(result.current.equipment.error).toBeNull();
    });

    it("stale error가 recovery state와 loading/error를 바꾸지 않는다", async () => {
      const stale = deferred<EquipmentSlotInfo[]>();
      const recovered = [{ ...slots[0], itemInstanceId: 501 }];
      equipmentApi.getEquippedGearApi.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(recovered);
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(equipmentApi.getEquippedGearApi).toHaveBeenCalledTimes(1));

      await act(async () => { await result.current.equip(21, 501); });
      await act(async () => {
        stale.reject(new Error("stale equipment failure"));
        await stale.promise.catch(() => undefined);
      });

      expect(result.current.equipment.data).toEqual(recovered);
      expect(result.current.equipment.loading).toBe(false);
      expect(result.current.equipment.error).toBeNull();
    });
  });

  describe("pre-mutation Inventory request가 recovery 뒤에 끝나면", () => {
    it("stale success가 recovered Inventory enrichment를 덮어쓰지 않는다", async () => {
      const stale = deferred<InventoryEntriesResponse>();
      const recovered = { entries: [{ ...item, itemName: "Recovered Sword" }] };
      inventoryApi.getInventoryApi.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(recovered);
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(inventoryApi.getInventoryApi).toHaveBeenCalledTimes(1));

      await act(async () => { await result.current.equip(21, 501); });
      expect(result.current.inventory.data).toEqual(recovered);

      await act(async () => {
        stale.resolve(inventory);
        await stale.promise;
      });
      expect(result.current.inventory.data).toEqual(recovered);
      expect(result.current.inventory.error).toBeNull();
    });

    it("stale error가 recovered Inventory data/loading/error를 바꾸지 않는다", async () => {
      const stale = deferred<InventoryEntriesResponse>();
      const recovered = { entries: [{ ...item, itemName: "Recovered Sword" }] };
      inventoryApi.getInventoryApi.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(recovered);
      const { result } = renderHook(() => useEquipmentQueries());
      await waitFor(() => expect(inventoryApi.getInventoryApi).toHaveBeenCalledTimes(1));

      await act(async () => { await result.current.equip(21, 501); });
      await act(async () => {
        stale.reject(new Error("stale Inventory failure"));
        await stale.promise.catch(() => undefined);
      });

      expect(result.current.inventory.data).toEqual(recovered);
      expect(result.current.inventory.loading).toBe(false);
      expect(result.current.inventory.error).toBeNull();
    });
  });
});
