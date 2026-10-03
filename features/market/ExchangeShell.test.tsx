import { answerDialog } from "@/shared/ui/dialogTest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InventoryEntry, ListingSummary, ShopItem, ShopPurchaseSummary, TradeSummary, WalletBalance } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import ExchangeShell from "./ExchangeShell";

const api = vi.hoisted(() => ({
  getItemApi: vi.fn(),
  getWalletApi: vi.fn(),
  getShopItemsApi: vi.fn(),
  getShopPurchasesApi: vi.fn(),
  getOpenListingsApi: vi.fn(),
  getMyListingsApi: vi.fn(),
  getTradesApi: vi.fn(),
  initiateShopPurchaseApi: vi.fn(),
  confirmShopPurchaseApi: vi.fn(),
  createListingApi: vi.fn(),
  cancelListingApi: vi.fn(),
  reserveListingApi: vi.fn(),
  purchaseListingApi: vi.fn(),
  getInventoryApi: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/market.api", () => api);
vi.mock("@/shared/api/items", () => ({ getItemApi: api.getItemApi }));
vi.mock("@/lib/api/endpoints/inventory.api", () => ({ getInventoryApi: api.getInventoryApi }));

const shopItems: ShopItem[] = [
  { id: 1, itemId: 1010, price: 45_000, currency: "GOLD", available: true, globalStockLimit: null, perPlayerLimit: 1, reservationTtlSec: 300 },
  { id: 3, itemId: 5010, price: 4_200, currency: "GOLD", available: false, globalStockLimit: null, perPlayerLimit: null, reservationTtlSec: null },
];
const reservedPurchase: ShopPurchaseSummary = { id: 41, shopItemId: 1, quantity: 1, status: "RESERVED", reservationToken: "canonical-shop-token", reservationExpiresAt: "2026-08-23T01:00:00Z" };
const requestedPurchase: ShopPurchaseSummary = { id: 40, shopItemId: 1, quantity: 1, status: "REQUESTED", reservationToken: null, reservationExpiresAt: null };
const openListings: ListingSummary[] = [
  { id: 101, itemId: 1003, sellerId: 7, price: 35_000, currency: "GOLD", status: "OPEN" },
  { id: 201, itemId: 3011, sellerId: 24, price: 1_800, currency: "GEM", status: "OPEN" },
];
const inventory: InventoryEntry[] = [
  { itemInstanceId: 4, slotIndex: 3, itemId: 2002, itemName: "Bound Boots", category: "ARMOR", type: "ETC", rarity: "RARE", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 72, instanceAttrs: {} },
  { itemInstanceId: 5, slotIndex: 4, itemId: 3001, itemName: "Owned Potion Stack", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, quantity: 42, bound: false, durability: null, instanceAttrs: {} },
];
const trades: TradeSummary[] = [
  { id: 301, listingId: 88, buyerId: 7, sellerId: 24, price: 28_000, currency: "GOLD" },
  { id: 302, listingId: 56, buyerId: 13, sellerId: 7, price: 45, currency: "GEM" },
];
const wallet = (gold = 284_500, goldHeld = 1_200, gem = 75, gemHeld = 5): WalletBalance => ({
  amount: gold,
  currency: "GOLD",
  balances: [
    { currency: "GOLD", available: gold, held: goldHeld },
    { currency: "GEM", available: gem, held: gemHeld },
  ],
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("canonical Exchange surfaces", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002")
      .mockReturnValue("00000000-0000-4000-8000-000000000003");
    api.getItemApi.mockRejectedValue(new Error("상품 이름 조회 실패"));
    api.getWalletApi.mockResolvedValue(wallet());
    api.getShopItemsApi.mockResolvedValue(shopItems);
    api.getShopPurchasesApi.mockResolvedValue([]);
    api.getOpenListingsApi.mockResolvedValue(openListings);
    api.getMyListingsApi.mockResolvedValue([openListings[0]]);
    api.getTradesApi.mockResolvedValue(trades);
    api.getInventoryApi.mockResolvedValue({ entries: inventory });
    api.initiateShopPurchaseApi.mockResolvedValue({ id: 41 });
    api.confirmShopPurchaseApi.mockResolvedValue({ reservationToken: "canonical-shop-token", expiresAt: "2026-08-23T01:00:00Z" });
    api.createListingApi.mockResolvedValue({ id: 77 });
    api.cancelListingApi.mockResolvedValue(undefined);
    api.reserveListingApi.mockResolvedValue({ reservationToken: "listing-token", holdId: "hold-201", expiresAt: "2026-08-23T01:00:00Z" });
    api.purchaseListingApi.mockResolvedValue({ id: 401, listingId: 201, buyerId: 7, sellerId: 24, price: 1_800, currency: "GEM" });
  });

  it("빈 시스템 상점에서도 결제 준비 상태와 사용자 간 거래 가능 상태를 구분한다", async () => {
    api.getShopItemsApi.mockResolvedValue([]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    expect(await screen.findByText("시스템 상점 상품이 없습니다. 결제는 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByText("시스템 상점은 준비 중입니다. 사용자 간 거래는 이용할 수 있습니다.")).toBeInTheDocument();
  });

  it("수량 snapshot과 전체 가격을 표시하고 이름 실패를 목록 실패로 바꾸지 않는다", async () => {
    const listings = [1, 7, null, undefined].map((saleQuantity, index) => ({ ...openListings[1], id: 201 + index, ...(saleQuantity === undefined ? {} : { saleQuantity }) }));
    api.getOpenListingsApi.mockResolvedValue(listings);
    api.getMyListingsApi.mockResolvedValue(listings);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "마켓플레이스" }));
    await screen.findByRole("button", { name: /수량 7/ });
    expect(screen.getByRole("button", { name: /수량 1/ })).toHaveTextContent("1,800 GEM");
    expect(screen.getByRole("button", { name: /과거 기록 없음/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /서버 필드 미제공/ })).toBeInTheDocument();
    await waitFor(() => expect(api.getItemApi).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /수량 7/ }));
    expect(screen.getByText("총 가격").nextElementSibling).toHaveTextContent("1,800 GEM");
    expect(screen.getByText("수량").nextElementSibling).toHaveTextContent("수량 7");
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    expect((await screen.findByText("예약 수량")).nextElementSibling).toHaveTextContent("수량 7");
    fireEvent.click(screen.getByRole("button", { name: "내 매물" }));
    fireEvent.click(screen.getByRole("button", { name: /수량 7/ }));
    expect(screen.getByText("수량").nextElementSibling).toHaveTextContent("수량 7");
  });

  it("renders real Wallet loading/error/retry without generated history", async () => {
    api.getWalletApi.mockRejectedValueOnce(new Error("Wallet unavailable")).mockResolvedValueOnce(wallet(80, 20, 7, 3));
    render(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("확인된 잔액이 없습니다.");
    expect(screen.queryByRole("button", { name: "GOLD 잔액" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));

    const gold = await screen.findByRole("button", { name: "GOLD 잔액" });
    const gem = screen.getByRole("button", { name: "GEM 잔액" });
    expect(gold).toHaveTextContent("GOLD 사용 가능80GOLD예약 보류20 GOLD");
    expect(gem).toHaveTextContent("GEM 사용 가능7GEM예약 보류3 GEM");
    fireEvent.click(gold);
    expect(screen.getByText("사용 가능").nextElementSibling).toHaveTextContent("80 GOLD");
    fireEvent.click(screen.getByRole("button", { name: "지갑으로" }));
    await waitFor(() => expect(gold).toHaveFocus());
    expect(screen.queryByText(/transaction|monthly|reserved balance/i)).not.toBeInTheDocument();
  });

  it("shows loading before confirmation and renders both real zero balances", async () => {
    const pending = deferred<WalletBalance>();
    api.getWalletApi.mockReturnValueOnce(pending.promise);
    render(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("지갑을 불러오는 중…");
    expect(screen.queryByRole("button", { name: "GOLD 잔액" })).not.toBeInTheDocument();
    pending.resolve(wallet(0, 0, 0, 0));

    const gold = await screen.findByRole("button", { name: "GOLD 잔액" });
    expect(gold).toHaveTextContent("GOLD 사용 가능0GOLD예약 보류0 GOLD");
    expect(screen.getByRole("button", { name: "GEM 잔액" })).toHaveTextContent("GEM 사용 가능0GEM예약 보류0 GEM");
    expect(screen.queryByText("확인된 잔액이 없습니다.")).not.toBeInTheDocument();
  });

  it("labels the last confirmed balances during refresh and after refresh failure", async () => {
    const pending = deferred<WalletBalance>();
    api.getWalletApi.mockResolvedValueOnce(wallet(80, 20, 7, 3)).mockReturnValueOnce(pending.promise);
    const view = render(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    await screen.findByRole("button", { name: "GOLD 잔액" });

    view.rerender(<ExchangeShell surface="trade" playerId={7} onBack={vi.fn()} />);
    view.rerender(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("지갑을 갱신 중입니다. 마지막 확인 잔액을 표시합니다.");
    expect(screen.getByRole("button", { name: "GOLD 잔액" })).toHaveTextContent("80");
    pending.resolve(wallet(0, 0, 0, 0));
    await waitFor(() => expect(screen.getByRole("button", { name: "GEM 잔액" })).toHaveTextContent("0"));

    view.rerender(<ExchangeShell surface="trade" playerId={7} onBack={vi.fn()} />);
    api.getWalletApi.mockRejectedValueOnce(new Error("Refresh failed"));
    view.rerender(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Refresh failed 마지막 확인 잔액을 표시합니다.");
    expect(screen.getByRole("button", { name: "GOLD 잔액" })).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "GEM 잔액" })).toHaveTextContent("0");
  });

  it("keeps System Shop checkout unavailable and one detail frame during replacement", async () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    const detail = document.querySelector('[data-stage-key="market-stage-2"]');
    expect(detail).toBeInTheDocument();
    expect(screen.getByText("전체 재고 한도").nextElementSibling).toHaveTextContent("없음");
    expect(screen.queryByRole("button", { name: "Reserve / Start purchase" })).not.toBeInTheDocument();
    expect(screen.getByText("시스템 상점 결제는 준비 중입니다.")).toBeInTheDocument();

    focus.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Item #5010/ }));
    expect(document.querySelector('[data-stage-key="market-stage-2"]')).toBe(detail);
    expect(screen.queryByRole("button", { name: "Purchase" })).not.toBeInTheDocument();
    expect(screen.getByText("현재 구매할 수 없는 상품입니다.")).toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("moves from Shop category to list and returns from detail to its parent", async () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    focus.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "마켓플레이스" }));

    expect(document.querySelector('[data-stage-key="market-stage-3"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "시스템 상점으로" })).not.toBeInTheDocument();
    expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "market-stage-2", align: "forward" } });

    fireEvent.click(screen.getByRole("button", { name: /Item #3011/ }));
    focus.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "마켓플레이스로" }));

    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus.mock.calls[0][0]).toMatchObject({ detail: { key: "market-stage-2", align: "back" } });
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("keeps an existing RESERVED purchase readable without exposing confirmation", async () => {
    api.getShopPurchasesApi.mockResolvedValue([reservedPurchase]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByText("구매 번호")).toBeInTheDocument();
    expect(screen.getByText("구매 번호").nextElementSibling).toHaveTextContent("41");
    expect(screen.getByText("상태").nextElementSibling).toHaveTextContent("예약됨");
    expect(screen.getByText("예약 만료").nextElementSibling).not.toHaveTextContent("예약 없음");
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();
    expect(api.confirmShopPurchaseApi).not.toHaveBeenCalled();
  });

  it("shows COMPLETED as transaction status without claiming item delivery", async () => {
    api.getShopPurchasesApi.mockResolvedValueOnce([requestedPurchase]).mockResolvedValue([{ ...requestedPurchase, status: "COMPLETED" }]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByRole("button", { name: "구매 상태 다시 조회" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reserve / Start purchase" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "구매 상태 다시 조회" }));

    expect(await screen.findByText("거래 상태는 완료지만 아이템 배송은 확인되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getByText("상태").nextElementSibling).toHaveTextContent("완료");
    expect(screen.queryByText("Purchase completed.")).not.toBeInTheDocument();
    expect(api.confirmShopPurchaseApi).not.toHaveBeenCalled();
  });

  it("keeps a read-only reservation visible after Back and reopening the same item", async () => {
    api.getShopPurchasesApi.mockResolvedValue([reservedPurchase]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    expect(await screen.findByText("구매 번호")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "시스템 상점으로" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByText("구매 번호")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();
  });

  it("reloads purchase history and restores the reservation after Shop surface re-entry", async () => {
    api.getShopPurchasesApi.mockResolvedValue([reservedPurchase]);
    const view = render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    expect(await screen.findByText("구매 번호")).toBeInTheDocument();

    view.rerender(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    expect(await screen.findByText("284,500")).toBeInTheDocument();
    view.rerender(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    await waitFor(() => expect(api.getShopPurchasesApi).toHaveBeenCalledTimes(2));
    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByText("구매 번호")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();
  });

  it("does not restore COMPLETED, CANCELED, or EXPIRED purchases as pending", async () => {
    api.getShopPurchasesApi.mockResolvedValue([
      { ...reservedPurchase, id: 51, status: "COMPLETED" },
      { ...reservedPurchase, id: 52, status: "CANCELED" },
      { ...reservedPurchase, id: 53, status: "EXPIRED" },
    ]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByText("시스템 상점 결제는 준비 중입니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reserve / Start purchase" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
  });

  it("deterministically restores the highest-id nonterminal purchase", async () => {
    api.getShopPurchasesApi.mockResolvedValue([
      { ...reservedPurchase, id: 45, reservationToken: "latest-token" },
      { ...reservedPurchase, id: 43, reservationToken: "older-token" },
      { ...requestedPurchase, id: 46 },
    ]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    expect(await screen.findByRole("button", { name: "구매 상태 다시 조회" })).toBeInTheDocument();
    expect(screen.getByText("구매 번호").nextElementSibling).toHaveTextContent("46");
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
  });

  it("guards self purchase and performs explicit Marketplace reserve/purchase", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "마켓플레이스" }));

    fireEvent.click(screen.getByRole("button", { name: /Item #1003/ }));
    expect(screen.getByRole("button", { name: "내 매물 · 구매 불가" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Item #3011/ }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    fireEvent.click(await screen.findByRole("button", { name: "예약한 매물 구매" }));

    await waitFor(() => expect(api.purchaseListingApi).toHaveBeenCalledWith(201, "listing-token", expect.any(String)));
    expect(api.reserveListingApi).toHaveBeenCalledWith(201, 300);
  });

  it("does not reopen a reservation after switching listings", async () => {
    const reservation = deferred<{ reservationToken: string; holdId: string; expiresAt: string }>();
    api.reserveListingApi.mockReturnValueOnce(reservation.promise);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "마켓플레이스" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #3011/ }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #1003/ }));
    await act(async () => reservation.resolve({ reservationToken: "late", holdId: "late", expiresAt: "2026-08-23T01:00:00Z" }));
    expect(screen.queryByText("보류 번호")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 매물 · 구매 불가" })).toBeDisabled();
  });

  it("keeps purchase success visible after GET failures and Retry cannot purchase again", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "마켓플레이스" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #3011/ }));
    fireEvent.click(screen.getByRole("button", { name: "예약" }));
    await screen.findByRole("button", { name: "예약한 매물 구매" });
    api.getOpenListingsApi.mockRejectedValue(new Error("Listing lookup unavailable"));
    api.getWalletApi.mockRejectedValue(new Error("Wallet lookup unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "예약한 매물 구매" }));
    expect(await screen.findByText(/구매 완료 · 거래 #401/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "예약한 매물 구매" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Item #3011/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Some Exchange data could not be refreshed/)).toBeInTheDocument();
    api.getOpenListingsApi.mockResolvedValue([openListings[0]]);
    api.getItemApi.mockRejectedValue(new Error("상품 이름 조회 실패"));
    api.getWalletApi.mockResolvedValue(wallet());
    fireEvent.click(screen.getByRole("button", { name: "거래소 다시 조회" }));
    await waitFor(() => expect(screen.queryByText(/Some Exchange data could not be refreshed/)).not.toBeInTheDocument());
    expect(screen.getByText(/구매 완료 · 거래 #401/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "마켓플레이스" })).toHaveFocus());
    expect(api.purchaseListingApi).toHaveBeenCalledTimes(1);
    expect(api.reserveListingApi).toHaveBeenCalledTimes(1);
    expect(api.createListingApi).not.toHaveBeenCalled();
  });

  it("returns keyboard focus to the listing when detail closes", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "마켓플레이스" }));
    const listing = screen.getByRole("button", { name: /Item #3011/ });
    fireEvent.click(listing);
    fireEvent.click(screen.getByRole("button", { name: "마켓플레이스로" }));
    await waitFor(() => expect(listing).toHaveFocus());
  });

  it("creates a whole-entry listing from a real InventoryEntry with only total price and GOLD/GEM", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "내 매물" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "내 매물" }), { key: "Enter", altKey: true });

    expect(screen.getByRole("button", { name: /Bound Boots/ })).toBeDisabled();
    const stack = screen.getByRole("button", { name: /Owned Potion Stack/ });
    expect(stack).toHaveTextContent("전체 묶음 · x42");
    expect(screen.queryByLabelText(/quantity|item id|inventory entry id|item name/i)).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("화폐")).getAllByRole("option").map(({ textContent }) => textContent)).toEqual(["GOLD", "GEM"]);

    fireEvent.click(stack);
    expect(screen.getByLabelText("총 가격")).toHaveAttribute("step", "1");
    fireEvent.change(screen.getByLabelText("총 가격"), { target: { value: "1.5" } });
    const form = screen.getByLabelText("총 가격").closest("form")!;
    expect(within(form).getByRole("button", { name: "매물 등록" })).toBeDisabled();
    fireEvent.submit(form);
    expect(api.createListingApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("총 가격"), { target: { value: "12000" } });
    fireEvent.change(screen.getByLabelText("화폐"), { target: { value: "GEM" } });
    fireEvent.click(within(form).getByRole("button", { name: "매물 등록" }));

    await waitFor(() => expect(api.createListingApi).toHaveBeenCalledWith({ inventoryEntryId: 5, price: 12_000, currency: "GEM" }));
  });

  it("keeps a rejected listing form open with an explicit error", async () => {
    api.createListingApi.mockRejectedValue(new Error("Listing rejected"));
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "내 매물" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "내 매물" }), { key: "Enter", altKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Owned Potion Stack/ }));
    fireEvent.change(screen.getByLabelText("총 가격"), { target: { value: "1" } });
    fireEvent.click(within(screen.getByLabelText("총 가격").closest("form")!).getByRole("button", { name: "매물 등록" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Listing rejected");
    expect(screen.getByLabelText("총 가격")).toBeInTheDocument();
  });

  it("cancels My Listings only after confirmation and reloads authoritative lists", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "내 매물" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #1003/ }));
    fireEvent.click(screen.getByRole("button", { name: "매물 취소" }));
    await answerDialog();

    await waitFor(() => expect(api.cancelListingApi).toHaveBeenCalledWith(101));
    expect(api.getMyListingsApi).toHaveBeenCalledTimes(2);
    expect(api.getOpenListingsApi).toHaveBeenCalledTimes(2);
    expect(api.getInventoryApi).toHaveBeenCalledTimes(2);
  });

  it("replaces fake friend barter with canonical Bought/Sold Trade history", async () => {
    render(<ExchangeShell surface="trade" playerId={7} onBack={vi.fn()} />);

    expect(await screen.findByText("구매")).toBeInTheDocument();
    expect(screen.getByText("판매")).toBeInTheDocument();
    expect(screen.getByText("플레이어 #24")).toBeInTheDocument();
    expect(screen.getByText("플레이어 #13")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /구매플레이어 #24/ }));
    expect(screen.getByText("구매자").nextElementSibling).toHaveTextContent("플레이어 #7");
    expect(screen.queryByText(/friend|barter|offered|received/i)).not.toBeInTheDocument();
  });

  it("keeps internal implementation jargon out of rendered Exchange copy", async () => {
    const renderedCopy: string[] = [];
    const view = render(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    await screen.findByText("284,500");
    renderedCopy.push(document.body.textContent ?? "");

    view.rerender(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    await screen.findByRole("button", { name: "내 매물" });
    fireEvent.click(screen.getByRole("button", { name: "내 매물" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "내 매물" }), { key: "Enter", altKey: true });
    await screen.findByText("아이템 판매");
    renderedCopy.push(document.body.textContent ?? "");

    view.rerender(<ExchangeShell surface="trade" playerId={7} onBack={vi.fn()} />);
    await screen.findByText("구매");
    renderedCopy.push(document.body.textContent ?? "");

    expect(renderedCopy.join(" ")).not.toMatch(/Canonical|backend-owned|PD-01/i);
  });

  it("keeps Exchange at category, list, and detail stages with shared controls", () => {
    const source = readFileSync("features/market/ExchangeShell.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    const exchangeCss = css.slice(css.indexOf("/* Exchange uses"), css.indexOf("@media (min-width: 768px)"));

    expect(new Set(source.match(/market-stage-[123]/g))).toEqual(new Set(["market-stage-1", "market-stage-2", "market-stage-3"]));
    expect(source).not.toMatch(/MARKET_|friend|barter|Wishlist|Plan & Rhythm|Income|Asset Trace/);
    expect(exchangeCss).toContain("var(--lag-control-bg)");
    expect(exchangeCss).toContain(".lag-exchange-row:not(:disabled):hover");
    expect(exchangeCss).toContain(".lag-exchange-entry:not(:disabled):hover");
    expect(exchangeCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*\.lag-exchange-tabs\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });
});
