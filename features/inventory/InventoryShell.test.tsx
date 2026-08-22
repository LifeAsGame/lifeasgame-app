import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InventoryEntriesResponse, InventoryEntry, MailboxEntriesResponse, MailEntry } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import InventoryShell from "./InventoryShell";

const api = vi.hoisted(() => ({
  claimMailApi: vi.fn(),
  deleteMailApi: vi.fn(),
  getInventoryApi: vi.fn(),
  getMailboxApi: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/inventory.api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, slotLabel, subtitle, onClick }: { label: string; slotLabel: string; subtitle?: string; onClick?: () => void }) => (
    <button type="button" data-testid="inventory-entry" onClick={onClick}>{label} · {slotLabel} · {subtitle}</button>
  ),
}));

const item: InventoryEntry = {
  itemInstanceId: 501,
  slotIndex: 2,
  itemId: 101,
  itemName: "Server Sword",
  category: "WEAPON",
  type: "SWORD",
  rarity: "RARE",
  stackable: false,
  maxStack: 1,
  quantity: 1,
  bound: true,
  durability: 0,
  instanceAttrs: { atk: 12 },
};
const secondItem: InventoryEntry = { ...item, itemInstanceId: 502, slotIndex: 3, itemId: 102, itemName: "Second Sword" };

const mail: MailEntry = {
  mailId: 701,
  slotIndex: 4,
  itemId: 301,
  itemName: "Server Potion",
  category: "CONSUMABLE",
  type: "POTION",
  rarity: "COMMON",
  stackable: true,
  maxStack: 99,
  quantity: 3,
  bound: false,
  durability: null,
  instanceAttrs: {},
};

const inventory: InventoryEntriesResponse = { entries: [item] };
const mailbox: MailboxEntriesResponse = { entries: [mail] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("Inventory Items와 Inbox surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.getInventoryApi.mockResolvedValue(inventory);
    api.getMailboxApi.mockResolvedValue(mailbox);
    api.claimMailApi.mockResolvedValue(undefined);
    api.deleteMailApi.mockResolvedValue(undefined);
  });

  describe("Items를 조회하고 itemInstanceId로 선택하면", () => {
    it("loading 후 server list/detail을 표시하고 generic sell/remove action은 노출하지 않는다", async () => {
      const response = deferred<InventoryEntriesResponse>();
      api.getInventoryApi.mockReturnValue(response.promise);
      render(<InventoryShell surface="items" />);
      expect(screen.getByText("Loading Items...")).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-items-list"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).not.toBeInTheDocument();

      await act(async () => {
        response.resolve(inventory);
        await response.promise;
      });
      fireEvent.click(await screen.findByRole("button", { name: /Server Sword/ }));

      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).toBeInTheDocument();
      expect(screen.getByText("Item instance ID: 501")).toBeInTheDocument();
      expect(screen.getByText("Durability: 0")).toBeInTheDocument();
      expect(screen.getByText(/Instance attrs:.*"atk":12/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /sell|remove/i })).not.toBeInTheDocument();
    });

    it("error의 Retry가 authoritative empty Items state를 표시한다", async () => {
      api.getInventoryApi.mockRejectedValueOnce(new Error("Items unavailable")).mockResolvedValueOnce({ entries: [] });
      render(<InventoryShell surface="items" />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Items unavailable");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("No Items.")).toBeInTheDocument();
    });

    it("item 교체는 detail frame을 유지하고 Back은 list를 focus하며 submenu 전환은 stale detail을 닫는다", async () => {
      api.getInventoryApi.mockResolvedValue({ entries: [item, secondItem] });
      const focus = vi.fn();
      const onBack = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      const view = render(<InventoryShell surface="items" onBack={onBack} />);
      const entries = await screen.findAllByTestId("inventory-entry");

      fireEvent.click(entries[0]);
      const detail = document.querySelector('[data-stage-key="inventory-items-detail"]');
      expect(detail).toBeInTheDocument();
      fireEvent.click(entries[1]);
      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).toBe(detail);
      expect(screen.getByText("Item instance ID: 502")).toBeInTheDocument();

      focus.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Back to Items" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).not.toBeInTheDocument());
      expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "inventory-items-list", align: "center" } });
      fireEvent.click(screen.getByRole("button", { name: "Back to Inventory" }));
      expect(onBack).toHaveBeenCalledTimes(1);

      fireEvent.click(entries[0]);
      view.rerender(<InventoryShell surface="inbox" onBack={onBack} />);
      expect(document.querySelector('[data-stage-key="inventory-inbox-detail"]:not([aria-hidden="true"])')).not.toBeInTheDocument();
      view.rerender(<InventoryShell surface="items" onBack={onBack} />);
      expect(document.querySelector('[data-stage-key="inventory-items-detail"]:not([aria-hidden="true"])')).not.toBeInTheDocument();
      window.removeEventListener(STAGE_FOCUS_EVENT, focus);
    });
  });

  describe("Inbox를 조회하고 mailId로 선택하면", () => {
    it("loading 후 server list/detail과 nullable durability를 표시한다", async () => {
      const response = deferred<MailboxEntriesResponse>();
      api.getMailboxApi.mockReturnValue(response.promise);
      render(<InventoryShell surface="inbox" />);
      expect(screen.getByText("Loading Inbox...")).toBeInTheDocument();

      await act(async () => {
        response.resolve(mailbox);
        await response.promise;
      });
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));

      expect(screen.getByText("Mail ID: 701")).toBeInTheDocument();
      expect(screen.getByText("Slot index: 4")).toBeInTheDocument();
      expect(screen.getByText("Durability: Not recorded")).toBeInTheDocument();
    });

    it("error의 Retry가 authoritative empty Inbox state를 표시한다", async () => {
      api.getMailboxApi.mockRejectedValueOnce(new Error("Inbox unavailable")).mockResolvedValueOnce({ entries: [] });
      render(<InventoryShell surface="inbox" />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Inbox unavailable");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("No mail.")).toBeInTheDocument();
    });
  });

  describe("Inbox claim을 확인하면", () => {
    it("authoritative payload를 한 번만 보내고 pending 동안 duplicate action을 막은 뒤 두 list를 reload한다", async () => {
      const request = deferred<void>();
      api.claimMailApi.mockReturnValue(request.promise);
      render(<InventoryShell surface="inbox" />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));

      fireEvent.click(screen.getByRole("button", { name: "Claim" }));
      expect(window.confirm).toHaveBeenCalledWith("Claim Server Potion x3?");
      expect(api.claimMailApi).toHaveBeenCalledWith({ slotIndex: 4, quantity: 3 });
      expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(api.deleteMailApi).not.toHaveBeenCalled();

      api.getInventoryApi.mockResolvedValue({ entries: [{ ...item, quantity: 2 }] });
      api.getMailboxApi.mockResolvedValue({ entries: [] });
      await act(async () => {
        request.resolve();
        await request.promise;
      });

      await waitFor(() => expect(screen.getByText("No mail.")).toBeInTheDocument());
      expect(api.getInventoryApi).toHaveBeenCalledTimes(2);
      expect(api.getMailboxApi).toHaveBeenCalledTimes(2);
    });

    it("Delete 확인은 선택한 mail의 slotIndex로 요청하고 mailbox를 reload한다", async () => {
      render(<InventoryShell surface="inbox" />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));
      api.getMailboxApi.mockResolvedValue({ entries: [] });

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(window.confirm).toHaveBeenCalledWith("Delete Server Potion mail?");
      await waitFor(() => expect(api.deleteMailApi).toHaveBeenCalledWith({ slotIndex: 4 }));
      await waitFor(() => expect(screen.getByText("No mail.")).toBeInTheDocument());
      expect(api.getInventoryApi).toHaveBeenCalledTimes(1);
      expect(api.getMailboxApi).toHaveBeenCalledTimes(2);
    });
  });
});
