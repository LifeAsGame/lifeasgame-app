import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { composeEquipmentSlots } from "./model";
import GearShell from "./GearShell";

const hook = vi.hoisted(() => ({ current: {} as ReturnType<typeof makeState> }));
vi.mock("./useEquipmentQueries", () => ({ useEquipmentQueries: () => hook.current }));
vi.mock("./EquipmentArtwork", () => ({ default: () => <span>artwork</span> }));
vi.mock("@/shared/ui/useSaoConfirm", () => ({ useSaoConfirm: () => ({ confirm: async () => true, dialog: null }) }));

const head: EquipmentSlotInfo = { slotId: 21, slotCode: "HEAD", slotName: "Head", slotCategory: "HEAD", slotRole: "SINGLE", itemInstanceId: null };
const body: EquipmentSlotInfo = { slotId: 22, slotCode: "BODY", slotName: "Body", slotCategory: null, slotRole: null, itemInstanceId: null };
const item: InventoryEntry = {
  itemInstanceId: 501, slotIndex: 3, itemId: 101, itemName: "기록자의 모자", category: "ARMOR", type: "HELMET",
  rarity: "RARE", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: null, instanceAttrs: {},
};

function makeState(slotData = [head, body], entries = [item]) {
  return {
    equipment: { data: slotData, loading: false, error: null as string | null, reload: vi.fn(), getRequestId: vi.fn() },
    inventory: { data: { entries }, loading: false, error: null as string | null, reload: vi.fn(), getRequestId: vi.fn() },
    slots: composeEquipmentSlots(slotData, entries),
    pendingKey: null as string | null,
    mutationError: null as string | null,
    equip: vi.fn(),
    unequip: vi.fn(),
  };
}

describe("Gear server slot panels", () => {
  beforeEach(() => { vi.clearAllMocks(); hook.current = makeState(); });

  it("renders actual slot rows, supports only mapped slot actions, and keeps three panel stages", async () => {
    render(<GearShell />);
    expect(screen.getByRole("button", { name: /Head.*비어 있음/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Body.*비어 있음/ })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Body.*비어 있음/ }));
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(2);
    expect(screen.getAllByText("이 슬롯은 현재 장착 명령을 지원하지 않습니다.")).toHaveLength(2);
    fireEvent.click(document.querySelector('[data-kind="slot"]') as HTMLButtonElement);
    expect(screen.queryByRole("button", { name: "장착" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "선택한 슬롯으로" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Head.*비어 있음/ }));
    fireEvent.click(screen.getByRole("button", { name: /기록자의 모자/ }));
    expect(document.querySelectorAll('[data-stage-key^="inventory-gear-"]')).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "장착" }));
    await waitFor(() => expect(hook.current.equip).toHaveBeenCalledWith(21, 501));
  });

  it("preserves selected slot and disables actions when refreshed reads fail", () => {
    const { rerender } = render(<GearShell />);
    fireEvent.click(screen.getByRole("button", { name: /Head.*비어 있음/ }));
    fireEvent.click(screen.getByRole("button", { name: /기록자의 모자/ }));
    hook.current = makeState();
    hook.current.equipment.error = "장비 조회 실패";
    rerender(<GearShell />);
    expect(document.querySelector('[data-stage-key="inventory-gear-action"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "장착" })).toBeDisabled();
    expect(screen.getAllByRole("alert").some((node) => node.textContent?.includes("장비 조회 실패"))).toBe(true);
  });

  it("clears only a slot removed by the authoritative response", async () => {
    const { rerender } = render(<GearShell />);
    fireEvent.click(screen.getByRole("button", { name: /Head.*비어 있음/ }));
    hook.current = makeState([body], [item]);
    rerender(<GearShell />);
    await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-gear-workspace"]')).not.toBeInTheDocument());
  });
});
