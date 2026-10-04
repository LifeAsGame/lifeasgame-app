import { answerDialog } from "@/shared/ui/dialogTest";
import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const utilityItem: InventoryEntry = { ...item, itemInstanceId: 503, slotIndex: 4, itemId: 103, itemName: "Server Utility", category: "CONSUMABLE", type: "ETC", rarity: "COMMON", instanceAttrs: { active: false, nested: { source: "server" }, tags: ["a", "b"] } };

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

function expectData(label: string, value: string) {
  expect(screen.getByText(label).nextElementSibling).toHaveTextContent(value);
}

describe("Inventory Items와 Inbox surface를 사용할 때", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getInventoryApi.mockResolvedValue(inventory);
    api.getMailboxApi.mockResolvedValue(mailbox);
    api.claimMailApi.mockResolvedValue(undefined);
    api.deleteMailApi.mockResolvedValue(undefined);
  });

  it("uses semantic Inventory/Gear classes without screenshot-only data or theme branches", () => {
    const inventorySource = readFileSync("features/inventory/InventoryShell.tsx", "utf8");
    const gearSource = readFileSync("features/inventory/GearShell.tsx", "utf8");
    expect(`${inventorySource}\n${gearSource}`).not.toMatch(/\bSAO\b|PanelCard|GoldRow|MK300|Telecaster|Notebook|Owned Lv\.|MEMORY filter|LETTER filter|data-theme/i);

    const css = readFileSync("app/globals.css", "utf8");
    const fidelityCss = css.slice(css.indexOf("/* v7 Inventory/Gear"), css.indexOf(".lag-semantic-controls"));
    expect(fidelityCss).toContain("repeat(auto-fill, minmax(150px, 1fr))");
    expect(fidelityCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  });

  describe("Items를 조회하고 itemInstanceId로 선택하면", () => {
    it("real category에서 filter를 만들고 즉시 적용하며 제외된 detail을 닫는다", async () => {
      api.getInventoryApi.mockResolvedValue({ entries: [item, secondItem, utilityItem] });
      render(<InventoryShell surface="items" />);

      expect(await screen.findAllByTestId("inventory-entry")).toHaveLength(3);
      expect(screen.getByRole("button", { name: "전체 아이템" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "소모품" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "무기" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "추억" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Server Sword/ }));
      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "소모품" }));

      expect(screen.getAllByTestId("inventory-entry")).toHaveLength(1);
      expect(screen.getByRole("button", { name: /Server Utility/ })).toBeInTheDocument();
      await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).not.toBeInTheDocument());
    });

    it("primitive와 nested instanceAttrs를 안전한 key/value로 표시한다", async () => {
      api.getInventoryApi.mockResolvedValue({ entries: [utilityItem] });
      render(<InventoryShell surface="items" />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Utility/ }));

      expectData("active", "false");
      expectData("nested", '{"source":"server"}');
      expectData("tags", '["a","b"]');
    });

    it("loading 후 server list/detail을 표시하고 generic sell/remove action은 노출하지 않는다", async () => {
      const response = deferred<InventoryEntriesResponse>();
      api.getInventoryApi.mockReturnValue(response.promise);
      render(<InventoryShell surface="items" />);
      expect(screen.getByText("아이템을 불러오는 중…")).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-items-list"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).not.toBeInTheDocument();

      await act(async () => {
        response.resolve(inventory);
        await response.promise;
      });
      fireEvent.click(await screen.findByRole("button", { name: /Server Sword/ }));

      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).toBeInTheDocument();
      expectData("보유 번호", "501");
      expectData("내구도", "0");
      expectData("atk", "12");
      expect(screen.queryByRole("button", { name: /sell|remove/i })).not.toBeInTheDocument();
    });

    it("error의 Retry가 authoritative empty Items state를 표시한다", async () => {
      api.getInventoryApi.mockRejectedValueOnce(new Error("Items unavailable")).mockResolvedValueOnce({ entries: [] });
      render(<InventoryShell surface="items" />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Items unavailable");
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));

      expect(await screen.findByText("보유한 아이템이 없습니다.")).toBeInTheDocument();
    });

    it("existing Items 재조회 실패 시 이전 값을 명시하고 Retry로 복구한다", async () => {
      render(<InventoryShell surface="items" />);
      expect(await screen.findByRole("button", { name: /Server Sword/ })).toBeInTheDocument();
      api.getInventoryApi.mockRejectedValueOnce(new Error("Items GET failed")).mockResolvedValueOnce({ entries: [secondItem] });

      fireEvent.click(screen.getByRole("button", { name: "아이템 다시 조회" }));
      expect(await screen.findByText(/이전에 조회한 항목입니다/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Server Sword/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
      expect(await screen.findByRole("button", { name: /Second Sword/ })).toBeInTheDocument();
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
      focus.mockClear();
      fireEvent.click(entries[1]);
      expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).toBe(detail);
      expectData("보유 번호", "502");
      expect(focus).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "아이템 목록으로" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="inventory-items-detail"]')).not.toBeInTheDocument());
      expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "inventory-items-list", align: "back" } });
      await waitFor(() => expect(entries[1]).toHaveFocus());
      fireEvent.click(screen.getByRole("button", { name: "인벤토리로" }));
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
    it("mail 교체는 stable detail frame 안의 content만 바꾼다", async () => {
      const secondMail = { ...mail, mailId: 702, slotIndex: 5, itemId: 302, itemName: "Second Server Mail" };
      api.getMailboxApi.mockResolvedValue({ entries: [mail, secondMail] });
      render(<InventoryShell surface="inbox" />);

      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));
      const detail = document.querySelector('[data-stage-key="inventory-inbox-detail"]');
      fireEvent.click(screen.getByRole("button", { name: /Second Server Mail/ }));

      expect(document.querySelector('[data-stage-key="inventory-inbox-detail"]')).toBe(detail);
      expectData("수신 번호", "702");
    });

    it("loading 후 server list/detail과 nullable durability를 표시한다", async () => {
      const response = deferred<MailboxEntriesResponse>();
      api.getMailboxApi.mockReturnValue(response.promise);
      render(<InventoryShell surface="inbox" />);
      expect(screen.getByText("수신함을 불러오는 중…")).toBeInTheDocument();

      await act(async () => {
        response.resolve(mailbox);
        await response.promise;
      });
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));

      expectData("수신 번호", "701");
      expectData("칸 번호", "4");
      expectData("내구도", "기록 없음");
    });

    it("error의 Retry가 authoritative empty Inbox state를 표시한다", async () => {
      api.getMailboxApi.mockRejectedValueOnce(new Error("Inbox unavailable")).mockResolvedValueOnce({ entries: [] });
      render(<InventoryShell surface="inbox" />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Inbox unavailable");
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));

      expect(await screen.findByText("수신한 아이템이 없습니다.")).toBeInTheDocument();
    });
  });

  describe("Inbox claim을 확인하면", () => {
    it("failed recovery blocks another stale mail's Claim and Delete on screen", async () => {
      const secondMail = { ...mail, mailId: 702, slotIndex: 5, itemName: "Second Server Mail" };
      api.getMailboxApi.mockResolvedValue({ entries: [mail, secondMail] });
      render(<InventoryShell surface="inbox" />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));
      api.getMailboxApi.mockRejectedValueOnce(new Error("Mailbox GET failed"));

      fireEvent.click(screen.getByRole("button", { name: "수령" }));
    await answerDialog();
      expect(await screen.findByText(/Claim succeeded, but Mailbox or Inventory could not be refreshed/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Second Server Mail/ }));
      expect(screen.queryByRole("button", { name: "수령" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
      expect(api.claimMailApi).toHaveBeenCalledTimes(1);
      expect(api.deleteMailApi).not.toHaveBeenCalled();

      api.getMailboxApi.mockResolvedValue({ entries: [secondMail] });
      fireEvent.click(within(document.querySelector('[data-stage-key="inventory-inbox-detail"]') as HTMLElement).getByRole("button", { name: "다시 조회" }));
      expect(await screen.findByRole("button", { name: "수령" })).toBeInTheDocument();
    });

    it("confirmed Claim 뒤 Mailbox GET 실패를 성공으로 안내하고 stale action을 막는다", async () => {
      render(<InventoryShell surface="inbox" />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));
      api.getMailboxApi.mockRejectedValueOnce(new Error("Mailbox GET failed")).mockResolvedValueOnce({ entries: [] });
      api.getInventoryApi.mockResolvedValue({ entries: [{ ...item, quantity: 2 }] });

      fireEvent.click(screen.getByRole("button", { name: "수령" }));
    await answerDialog();
      expect(await screen.findByText(/Claim succeeded, but Mailbox or Inventory could not be refreshed/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "수령" })).not.toBeInTheDocument();
      fireEvent.click(within(document.querySelector('[data-stage-key="inventory-inbox-detail"]') as HTMLElement).getByRole("button", { name: "다시 조회" }));

      expect(await screen.findByText("수신한 아이템이 없습니다.")).toBeInTheDocument();
      expect(api.claimMailApi).toHaveBeenCalledTimes(1);
    });

    it("authoritative payload를 한 번만 보내고 pending 동안 duplicate action을 막은 뒤 두 list를 reload한다", async () => {
      const request = deferred<void>();
      api.claimMailApi.mockReturnValue(request.promise);
      render(<InventoryShell surface="inbox" onBack={() => {}} />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));

      fireEvent.click(screen.getByRole("button", { name: "수령" }));
    await answerDialog();
      expect(api.claimMailApi).toHaveBeenCalledWith({ slotIndex: 4, quantity: 3 });
      expect(screen.getByRole("button", { name: "처리 중…" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
      expect(api.deleteMailApi).not.toHaveBeenCalled();

      api.getInventoryApi.mockResolvedValue({ entries: [{ ...item, quantity: 2 }] });
      api.getMailboxApi.mockResolvedValue({ entries: [] });
      await act(async () => {
        request.resolve();
        await request.promise;
      });

      await waitFor(() => expect(screen.getByText("수신한 아이템이 없습니다.")).toBeInTheDocument());
      await waitFor(() => expect(screen.getByRole("button", { name: "인벤토리로" })).toHaveFocus());
      expect(api.getInventoryApi).toHaveBeenCalledTimes(2);
      expect(api.getMailboxApi).toHaveBeenCalledTimes(2);
    });

    it("Delete 확인은 선택한 mail의 slotIndex로 요청하고 mailbox를 reload한다", async () => {
      render(<InventoryShell surface="inbox" />);
      fireEvent.click(await screen.findByRole("button", { name: /Server Potion/ }));
      api.getMailboxApi.mockResolvedValue({ entries: [] });

      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog();
      await waitFor(() => expect(api.deleteMailApi).toHaveBeenCalledWith({ slotIndex: 4 }));
      await waitFor(() => expect(screen.getByText("수신한 아이템이 없습니다.")).toBeInTheDocument());
      expect(api.getInventoryApi).toHaveBeenCalledTimes(1);
      expect(api.getMailboxApi).toHaveBeenCalledTimes(2);
    });
  });
});
