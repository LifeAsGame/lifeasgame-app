import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_INVENTORY_ITEMS } from "@/lib/api/mock/inventory.mock";
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
const armor: InventoryEntry = { ...currentHelmet, itemInstanceId: 601, slotIndex: 3, itemId: 201, itemName: "Chest Armor", type: "CHEST" };
const equipment: EquipmentSlotInfo[] = [
  { slotId: 21, slotCode: "HEAD", slotName: "Head", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 22, slotCode: "BODY", slotName: "Body", slotCategory: null, slotRole: null, itemInstanceId: 601 },
  { slotId: 31, slotCode: "WRIST", slotName: "Wrist", slotCategory: null, slotRole: null, itemInstanceId: 999 },
  { slotId: 41, slotCode: "FEET", slotName: "Feet", slotCategory: null, slotRole: null, itemInstanceId: 602 },
];

function makeState(slotData = equipment, entries = [currentHelmet, armor]) {
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
    const headButton = screen.getByRole("button", { name: /Head/ });
    fireEvent.click(headButton);
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(3);

    const action = document.querySelector('[data-stage-key="inventory-gear-action"]');
    const bodyButton = screen.getByRole("button", { name: /Body.*Chest Armor/ });
    fireEvent.click(bodyButton);
    expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).toBe(action);

    fireEvent.click(screen.getByRole("button", { name: "Back to Armor Workspace" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument());
    expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).toBe(workspace);
    await waitFor(() => expect(bodyButton).toHaveFocus());

    const accessoryButton = screen.getByRole("button", { name: /Accessory/ });
    fireEvent.click(accessoryButton);
    expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).toBe(workspace);
    expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Gear Parts" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).not.toBeInTheDocument());
    await waitFor(() => expect(accessoryButton).toHaveFocus());
  });

  describe("current Consumer Equipment Item content가 gated이면", () => {
    it("legacy HELMET/CHEST Inventory rows를 candidate나 Equip action으로 노출하지 않는다", () => {
      hook.current = makeState(equipment.map((slot) => ({ ...slot, itemInstanceId: null })), MOCK_INVENTORY_ITEMS);
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));

      expect(screen.getByText("Equipment Item content is unavailable. Gear is read-only.")).toBeInTheDocument();
      expect(screen.queryByText("Frontliner's Helm")).not.toBeInTheDocument();
      expect(screen.queryByText("Black Coat of Midnight")).not.toBeInTheDocument();
      expect(document.querySelectorAll('[data-kind="candidate"]')).toHaveLength(0);

      fireEvent.click(screen.getByRole("button", { name: /Head/ }));
      expectData("Candidate", "Unavailable in the current Consumer Gear slice");
      expectData("Compatibility", "Not available");
      expect(screen.queryByRole("button", { name: "Equip" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Unequip" })).not.toBeInTheDocument();
      expect(hook.current.equip).not.toHaveBeenCalled();
      expect(hook.current.unequip).not.toHaveBeenCalled();
    });

    it("API-shaped historical occupied slot은 truthful read-only detail로 표시하고 Unequip을 노출하지 않는다", () => {
      hook.current = makeState([equipment[2]], []);
      render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      const slot = screen.getByRole("button", { name: /Wrist.*Item details unavailable.*itemInstanceId 999/ });
      expect(slot).not.toHaveTextContent("Empty");
      fireEvent.click(slot);

      expectData("Equipped", "Item details unavailable · itemInstanceId 999");
      expect(screen.getByRole("status")).toHaveTextContent("Equipment Item content is unavailable. Gear is read-only.");
      expect(screen.queryByRole("button", { name: "Unequip" })).not.toBeInTheDocument();
      expect(hook.current.unequip).not.toHaveBeenCalled();
    });
  });

  describe("Equipment 또는 Inventory query가 비정상이면", () => {
    it("existing slots 재조회 실패 시 이전 값을 명시하고 Retry한다", () => {
      const { rerender } = render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: "Refresh Equipment" }));
      expect(hook.current.equipment.reload).toHaveBeenCalledTimes(1);

      hook.current = makeState();
      hook.current.equipment.error = "Equipment GET failed";
      rerender(<GearShell />);
      expect(screen.getByText(/Previously loaded slots are shown below/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Wrist/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(hook.current.equipment.reload).toHaveBeenCalledTimes(1);
    });

    it("loading, error/retry, no-slot, no-candidate state를 각각 표시한다", () => {
      hook.current = makeState([], []);
      hook.current.equipment.loading = true;
      hook.current.inventory.loading = true;
      const { rerender } = render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      expect(screen.getByText("Loading Equipment...")).toBeInTheDocument();
      expect(screen.queryByText("Loading Inventory candidates...")).not.toBeInTheDocument();
      expect(screen.getByText("Equipment Item content is unavailable. Gear is read-only.")).toBeInTheDocument();

      hook.current = makeState([], []);
      hook.current.equipment.error = "Equipment unavailable";
      hook.current.inventory.error = "Inventory unavailable";
      rerender(<GearShell />);
      expect(screen.getAllByRole("alert").map((node) => node.textContent)).toEqual(["Equipment unavailable"]);
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(hook.current.equipment.reload).toHaveBeenCalledTimes(1);
      expect(hook.current.inventory.reload).not.toHaveBeenCalled();

      hook.current = makeState([], []);
      rerender(<GearShell />);
      expect(screen.getByText("No matching Equipment slots.")).toBeInTheDocument();
      expect(screen.queryByText("No candidate Items.")).not.toBeInTheDocument();
    });
  });

  describe("authoritative reload에서 selection identity가 사라지면", () => {
    it("removed slot selection을 clear한다", async () => {
      const { rerender } = render(<GearShell />);
      fireEvent.click(screen.getByRole("button", { name: /Armor/ }));
      fireEvent.click(screen.getByRole("button", { name: /Body/ }));

      hook.current = makeState([equipment[0], equipment[2]], [currentHelmet, armor]);
      rerender(<GearShell />);
      await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument());
    });
  });
});
