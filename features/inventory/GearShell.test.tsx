import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { composeEquipmentSlots } from "./model";
import GearShell from "./GearShell";

const hook = vi.hoisted(() => ({ current: {} as ReturnType<typeof makeState> }));

vi.mock("./useEquipmentQueries", () => ({ useEquipmentQueries: () => hook.current }));

const currentHelmet: InventoryEntry = {
  itemInstanceId: 501,
  slotIndex: 1,
  itemId: 101,
  itemName: "Current Helmet",
  category: "ARMOR",
  type: "HELMET",
  rarity: "RARE",
  stackable: false,
  maxStack: 1,
  quantity: 1,
  bound: true,
  durability: 80,
  instanceAttrs: { atk: 10 },
};
const newHelmet: InventoryEntry = { ...currentHelmet, itemInstanceId: 502, slotIndex: 2, itemId: 102, itemName: "New Helmet", rarity: "EPIC" };
const armor: InventoryEntry = { ...currentHelmet, itemInstanceId: 601, slotIndex: 3, itemId: 201, itemName: "Chest Armor", type: "CHEST" };
const newArmor: InventoryEntry = { ...armor, itemInstanceId: 604, slotIndex: 4, itemId: 204, itemName: "New Chest Armor", rarity: "EPIC" };
const boots: InventoryEntry = { ...armor, itemInstanceId: 602, itemName: "Windrunner Boots", type: "ETC" };
const incompatibleArmor: InventoryEntry = { ...armor, itemInstanceId: 603, itemName: "Wrong Armor", type: "RING" };
const equipment: EquipmentSlotInfo[] = [
  { slotId: 21, slotCode: "HEAD", slotName: "Head", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 22, slotCode: "BODY", slotName: "Body", slotCategory: null, slotRole: null, itemInstanceId: 601 },
  { slotId: 31, slotCode: "WRIST", slotName: "Wrist", slotCategory: null, slotRole: null, itemInstanceId: 999 },
  { slotId: 41, slotCode: "FEET", slotName: "Feet", slotCategory: null, slotRole: null, itemInstanceId: 602 },
];

function makeState(slotData = equipment, entries = [currentHelmet, newHelmet, armor, newArmor]) {
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

function expectData(label: string, value: string) {
  expect(screen.getByText(label).nextElementSibling).toHaveTextContent(value);
}

describe("Gear surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    hook.current = makeState();
  });

  it("renders all nine eager semantic slots with nullable metadata and keeps TITLE outside Gear", () => {
    const semanticEquipment = [
      ...equipment,
      { slotId: 42, slotCode: "NECK", slotName: "Neck", slotCategory: null, slotRole: null, itemInstanceId: null },
      { slotId: 43, slotCode: "RING_LEFT", slotName: "Ring", slotCategory: null, slotRole: null, itemInstanceId: null },
      { slotId: 44, slotCode: "AURA", slotName: "Aura", slotCategory: null, slotRole: null, itemInstanceId: null },
      { slotId: 45, slotCode: "PROFILE_FRAME", slotName: "Profile Frame", slotCategory: null, slotRole: null, itemInstanceId: null },
      { slotId: 46, slotCode: "BADGE", slotName: "Badge", slotCategory: null, slotRole: null, itemInstanceId: null },
      { slotId: 47, slotCode: "TITLE", slotName: "Title", slotCategory: null, slotRole: null, itemInstanceId: null },
    ];
    hook.current = makeState(semanticEquipment.map((slot) => ({ ...slot, itemInstanceId: null })), []);
    render(<GearShell />);

    fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
    for (const name of ["Head", "Body", "Wrist"]) {
      expect(screen.getByRole("button", { name: new RegExp(`${name}.*Empty`) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: /Accessory/ }));
    for (const name of ["Neck", "Ring", "Aura", "Profile Frame", "Badge"]) {
      expect(screen.getByRole("button", { name: new RegExp(`${name}.*Empty`) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: /Boots/ }));
    expect(screen.getByRole("button", { name: /Feet.*Empty/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Title.*Empty/ })).not.toBeInTheDocument();
  });

  it("keeps Parts -> combined workspace -> Action within three stable stages and honors Back/reset", async () => {
    render(<GearShell />);
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
    const workspace = document.querySelector('[data-stage-key="inventory-gear-workspace"]');
    expect(workspace).toBeInTheDocument();
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Head/ }));
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /New Helmet/ }));
    const action = document.querySelector('[data-stage-key="inventory-gear-action"]');
    fireEvent.click(screen.getByRole("button", { name: /Chest Armor.*itemInstanceId 601/ }));
    expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).toBe(action);

    fireEvent.click(screen.getByRole("button", { name: "Back to Armor Workspace" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument());
    expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).toBe(workspace);

    fireEvent.click(screen.getByRole("button", { name: /Accessory/ }));
    expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).toBe(workspace);
    expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Gear Parts" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).not.toBeInTheDocument());
  });

  describe("여러 semantic Armor slot 중 target을 선택해 교체하면", () => {
    it("명시한 empty slot과 candidate를 확인한 뒤 실제 slotId로 equip한다", () => {
      render(<GearShell />);
      expect(document.querySelector('[data-stage-key="inventory-gear-parts"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-gear-slots"]')).not.toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-gear-candidates"]')).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Equipment Slots" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Inventory Candidates" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Head/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Helmet/ }));
      fireEvent.click(screen.getByRole("button", { name: "Equip" }));

      expect(window.confirm).toHaveBeenCalledWith("Equip New Helmet to Head?");
      expect(hook.current.equip).toHaveBeenCalledWith(21, 502);
    });

    it("candidate만 선택해서는 equip하지 않고 명시한 실제 slotId로만 요청한다", () => {
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Chest Armor/ }));
      expect(screen.queryByRole("button", { name: "Equip" })).not.toBeInTheDocument();
      expect(hook.current.equip).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Body/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Chest Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: "Equip" }));

      expect(window.confirm).toHaveBeenCalledWith("Replace Chest Armor in Body with New Chest Armor?");
      expect(hook.current.equip).toHaveBeenCalledWith(22, 604);
      expect(hook.current.equip).not.toHaveBeenCalledWith(1, expect.anything());
    });
  });

  describe("occupied slot의 Inventory enrichment가 없으면", () => {
    it("empty로 표시하지 않고 itemInstanceId를 보존하며 slotId로 unequip한다", () => {
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      const slot = screen.getByRole("button", { name: /Wrist.*Item details unavailable.*itemInstanceId 999/ });
      expect(slot).not.toHaveTextContent("Empty");
      fireEvent.click(slot);

      expectData("Equipped", "Item details unavailable · itemInstanceId 999");
      fireEvent.click(screen.getByRole("button", { name: "Unequip" }));

      expect(window.confirm).toHaveBeenCalledWith("Unequip itemInstanceId 999 from Wrist?");
      expect(hook.current.unequip).toHaveBeenCalledWith(31);
    });
  });

  describe("선택한 pair의 호환성을 현재 계약으로 증명할 수 없으면", () => {
    it("설명을 표시하고 Equip을 막지만 occupied slot의 Unequip은 허용한다", () => {
      hook.current = makeState(equipment, [currentHelmet, newHelmet, armor, newArmor, boots]);
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Boots/ }));
      fireEvent.click(screen.getByRole("button", { name: /Feet/ }));
      fireEvent.click(screen.getByRole("button", { name: /Windrunner Boots.*itemInstanceId 602/ }));

      expect(screen.getByRole("alert")).toHaveTextContent("Compatibility is not available for this slot in the current item contract.");
      expect(screen.getByRole("button", { name: "Equip" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Equip" }));
      expect(hook.current.equip).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Unequip" }));
      expect(hook.current.unequip).toHaveBeenCalledWith(41);
    });

    it("INCOMPATIBLE reason을 표시하고 Equip을 비활성화한다", () => {
      hook.current = makeState(equipment, [currentHelmet, newHelmet, armor, newArmor, incompatibleArmor]);
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: /Body.*Chest Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: /Wrong Armor.*itemInstanceId 603/ }));

      expect(screen.getByRole("alert")).toHaveTextContent("INCOMPATIBLE: This item is incompatible with the selected Equipment slot.");
      expect(screen.getByRole("button", { name: "Equip" })).toBeDisabled();
    });
  });

  describe("Equipment 또는 Inventory query가 비정상이면", () => {
    it("loading, error/retry, no-slot, no-candidate state를 각각 표시한다", () => {
      hook.current = makeState([], []);
      hook.current.equipment.loading = true;
      hook.current.inventory.loading = true;
      const { rerender } = render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
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
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: /Body/ }));
      fireEvent.click(screen.getByRole("button", { name: /New Chest Armor/ }));
      expectData("Candidate", "New Chest Armor");

      hook.current = makeState(equipment, [currentHelmet, newHelmet, armor]);
      rerender(<GearShell />);
      await waitFor(() => expectData("Candidate", "Select an Inventory candidate to equip."));
      expect(screen.getByRole("button", { name: "Equip" })).toBeDisabled();

      hook.current = makeState([equipment[0], equipment[2]], [currentHelmet, newHelmet, armor]);
      rerender(<GearShell />);
      await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument());
    });
  });
});
