import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { composeEquipmentSlots } from "./model";
import GearShell from "./GearShell";

const hook = vi.hoisted(() => ({ current: {} as ReturnType<typeof makeState> }));

vi.mock("./useEquipmentQueries", () => ({ useEquipmentQueries: () => hook.current }));
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, slotLabel, subtitle, disabled, onClick }: { label: string; slotLabel: string; subtitle?: string; disabled?: boolean; onClick?: () => void }) => (
    <button type="button" disabled={disabled} onClick={onClick}>{label} · {slotLabel} · {subtitle}</button>
  ),
}));

const currentBlade: InventoryEntry = {
  itemInstanceId: 501,
  slotIndex: 1,
  itemId: 101,
  itemName: "Current Blade",
  category: "WEAPON",
  type: "SWORD",
  rarity: "RARE",
  stackable: false,
  maxStack: 1,
  quantity: 1,
  bound: true,
  durability: 80,
  instanceAttrs: { atk: 10 },
};
const newBlade: InventoryEntry = { ...currentBlade, itemInstanceId: 502, slotIndex: 2, itemId: 102, itemName: "New Blade", rarity: "EPIC" };
const armor: InventoryEntry = { ...currentBlade, itemInstanceId: 601, slotIndex: 3, itemId: 201, itemName: "Chest Armor", category: "ARMOR", type: "CHEST" };
const equipment: EquipmentSlotInfo[] = [
  { slotId: 21, slotCode: "MAIN_HAND", slotName: "Main Hand", slotCategory: "WEAPON", slotRole: "MAIN", itemInstanceId: null },
  { slotId: 22, slotCode: "OFF_HAND", slotName: "Off Hand", slotCategory: "WEAPON", slotRole: "OFFHAND", itemInstanceId: 501 },
  { slotId: 31, slotCode: "CHEST", slotName: "Chest", slotCategory: "CHEST", slotRole: "SINGLE", itemInstanceId: 999 },
];

function makeState(slotData = equipment, entries = [currentBlade, newBlade, armor]) {
  return {
    equipment: { data: slotData, loading: false, error: null as string | null, reload: vi.fn() },
    inventory: { data: { entries }, loading: false, error: null as string | null, reload: vi.fn() },
    slots: composeEquipmentSlots(slotData, entries),
    pendingKey: null as string | null,
    mutationError: null as string | null,
    equip: vi.fn(),
    unequip: vi.fn(),
  };
}

describe("Gear surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    hook.current = makeState();
  });

  describe("여러 Weapon slot 중 target을 선택해 교체하면", () => {
    it("명시한 empty slot과 candidate를 확인한 뒤 실제 slotId로 equip한다", () => {
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Weapon/ }));
      fireEvent.click(screen.getByRole("button", { name: /Main Hand/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Blade/ }));
      fireEvent.click(screen.getByRole("button", { name: "Equip" }));

      expect(window.confirm).toHaveBeenCalledWith("Equip New Blade to Main Hand?");
      expect(hook.current.equip).toHaveBeenCalledWith(21, 502);
    });

    it("candidate만 선택해서는 equip하지 않고 명시한 실제 slotId로만 요청한다", () => {
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Weapon/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Blade/ }));
      expect(screen.queryByRole("button", { name: "Equip" })).not.toBeInTheDocument();
      expect(hook.current.equip).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Off Hand/ }));
      fireEvent.click(screen.getByRole("button", { name: "Equip" }));

      expect(window.confirm).toHaveBeenCalledWith("Replace Current Blade in Off Hand with New Blade?");
      expect(hook.current.equip).toHaveBeenCalledWith(22, 502);
      expect(hook.current.equip).not.toHaveBeenCalledWith(1, expect.anything());
    });
  });

  describe("occupied slot의 Inventory enrichment가 없으면", () => {
    it("empty로 표시하지 않고 itemInstanceId를 보존하며 slotId로 unequip한다", () => {
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      const slot = screen.getByRole("button", { name: /Chest.*Item details unavailable.*itemInstanceId 999/ });
      expect(slot).not.toHaveTextContent("Empty");
      fireEvent.click(slot);

      expect(screen.getByText("Equipped: Item details unavailable · itemInstanceId 999")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Unequip" }));

      expect(window.confirm).toHaveBeenCalledWith("Unequip itemInstanceId 999 from Chest?");
      expect(hook.current.unequip).toHaveBeenCalledWith(31);
    });
  });

  describe("Equipment 또는 Inventory query가 비정상이면", () => {
    it("loading, error/retry, no-slot, no-candidate state를 각각 표시한다", () => {
      hook.current = makeState([], []);
      hook.current.equipment.loading = true;
      hook.current.inventory.loading = true;
      const { rerender } = render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Weapon/ }));
      expect(screen.getByText("Loading Equipment...")).toBeInTheDocument();
      expect(screen.getByText("Loading Inventory candidates...")).toBeInTheDocument();

      hook.current = makeState([], []);
      hook.current.equipment.error = "Equipment unavailable";
      hook.current.inventory.error = "Inventory unavailable";
      rerender(<GearShell />);
      expect(screen.getAllByRole("alert").map((node) => node.textContent)).toEqual(["Equipment unavailable", "Inventory unavailable"]);
      fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
      fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[1]);
      expect(hook.current.equipment.reload).toHaveBeenCalledTimes(1);
      expect(hook.current.inventory.reload).toHaveBeenCalledTimes(1);

      hook.current = makeState([], []);
      rerender(<GearShell />);
      expect(screen.getByText("No matching Equipment slots.")).toBeInTheDocument();
      expect(screen.getByText("No candidate Items.")).toBeInTheDocument();
    });
  });

  describe("authoritative reload에서 selection identity가 사라지면", () => {
    it("removed candidate와 removed slot selection을 순서대로 clear한다", async () => {
      const { rerender } = render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Weapon/ }));
      fireEvent.click(screen.getByRole("button", { name: /Off Hand/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Blade/ }));
      expect(screen.getByText(/Candidate: New Blade/)).toBeInTheDocument();

      hook.current = makeState(equipment, [currentBlade, armor]);
      rerender(<GearShell />);
      await waitFor(() => expect(screen.getByText("Select an Inventory candidate to equip.")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: "Equip" })).toBeDisabled();

      hook.current = makeState([equipment[0], equipment[2]], [currentBlade, armor]);
      rerender(<GearShell />);
      await waitFor(() => expect(screen.queryByText("Slot ID: 22")).not.toBeInTheDocument());
    });
  });
});
