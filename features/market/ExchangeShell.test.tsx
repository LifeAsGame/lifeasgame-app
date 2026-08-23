import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InventoryEntry, ListingSummary, ShopItem, ShopPurchaseSummary, TradeSummary } from "@/shared/api/types";
import ExchangeShell from "./ExchangeShell";

const api = vi.hoisted(() => ({
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

describe("canonical Exchange surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002")
      .mockReturnValue("00000000-0000-4000-8000-000000000003");
    api.getWalletApi.mockResolvedValue({ amount: 284_500, currency: "GOLD" });
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

  it("renders real Wallet loading/error/retry without generated history", async () => {
    api.getWalletApi.mockRejectedValueOnce(new Error("Wallet unavailable")).mockResolvedValueOnce({ amount: 25, currency: "GEM" });
    render(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("25")).toBeInTheDocument();
    expect(screen.getByText("GEM")).toBeInTheDocument();
    expect(screen.queryByText(/transaction|monthly|available|reserved balance/i)).not.toBeInTheDocument();
  });

  it("loads canonical ShopItems, blocks unavailable purchase, and keeps one detail frame during replacement", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    const detail = document.querySelector('[data-stage-key="market-stage-2"]');
    expect(detail).toBeInTheDocument();
    expect(screen.getByText("Global stock limit").nextElementSibling).toHaveTextContent("None");

    fireEvent.click(screen.getByRole("button", { name: /Item #5010/ }));
    expect(document.querySelector('[data-stage-key="market-stage-2"]')).toBe(detail);
    expect(screen.getByRole("button", { name: "Purchase" })).toBeDisabled();
    expect(screen.getByText("This item is unavailable.")).toBeInTheDocument();
  });

  it("recovers a reserved purchase by returned id and explicitly confirms its canonical history token", async () => {
    api.getShopPurchasesApi
      .mockResolvedValueOnce([])
      .mockResolvedValue([reservedPurchase]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve / Start purchase" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Purchase" }));

    await waitFor(() => expect(api.confirmShopPurchaseApi).toHaveBeenCalledWith("canonical-shop-token", expect.any(String)));
    expect(api.initiateShopPurchaseApi).toHaveBeenCalledWith(expect.objectContaining({ shopItemId: 1, quantity: 1, reserveOnly: true }));
  });

  it("restores an existing RESERVED purchase when its matching System Shop item opens", async () => {
    api.getShopPurchasesApi.mockResolvedValue([reservedPurchase]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();
    expect(screen.getByText("Purchase ID").nextElementSibling).toHaveTextContent("41");
    expect(screen.getByText("Reservation expiry").nextElementSibling).not.toHaveTextContent("Not reserved");
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Purchase" }));
    await waitFor(() => expect(api.confirmShopPurchaseApi).toHaveBeenCalledWith("canonical-shop-token", expect.any(String)));
  });

  it("restores REQUESTED as pending and refreshes it into a confirmable reservation", async () => {
    api.getShopPurchasesApi.mockResolvedValueOnce([requestedPurchase]).mockResolvedValue([reservedPurchase]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByRole("button", { name: "Refresh Purchase Status" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reserve / Start purchase" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Refresh Purchase Status" }));

    expect(await screen.findByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();
  });

  it("keeps a started reservation recoverable after Back and reopening the same item", async () => {
    api.getShopPurchasesApi.mockResolvedValueOnce([]).mockResolvedValue([reservedPurchase]);
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve / Start purchase" }));
    expect(await screen.findByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to System Shop" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();
    expect(api.initiateShopPurchaseApi).toHaveBeenCalledTimes(1);
  });

  it("reloads purchase history and restores the reservation after Shop surface re-entry", async () => {
    api.getShopPurchasesApi.mockResolvedValue([reservedPurchase]);
    const view = render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));
    expect(await screen.findByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();

    view.rerender(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    expect(await screen.findByText("284,500")).toBeInTheDocument();
    view.rerender(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    await waitFor(() => expect(api.getShopPurchasesApi).toHaveBeenCalledTimes(2));
    fireEvent.click(await screen.findByRole("button", { name: /Item #1010/ }));

    expect(await screen.findByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();
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

    expect(await screen.findByRole("button", { name: "Reserve / Start purchase" })).toBeInTheDocument();
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
    expect(await screen.findByRole("button", { name: "Refresh Purchase Status" })).toBeInTheDocument();
    expect(screen.getByText("Purchase ID").nextElementSibling).toHaveTextContent("46");
    expect(screen.queryByRole("button", { name: "Confirm Purchase" })).not.toBeInTheDocument();
  });

  it("guards self purchase and performs explicit Marketplace reserve/purchase", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marketplace" }));

    fireEvent.click(screen.getByRole("button", { name: /Item #1003/ }));
    expect(screen.getByRole("button", { name: "Your listing" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Item #3011/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reserve" }));
    fireEvent.click(await screen.findByRole("button", { name: "Purchase reserved listing" }));

    await waitFor(() => expect(api.purchaseListingApi).toHaveBeenCalledWith(201, "listing-token", expect.any(String)));
    expect(api.reserveListingApi).toHaveBeenCalledWith(201, 300);
  });

  it("creates a whole-entry listing from a real InventoryEntry with only total price and GOLD/GEM", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "My Listings" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Listing" }));

    expect(screen.getByRole("button", { name: /Bound Boots/ })).toBeDisabled();
    const stack = screen.getByRole("button", { name: /Owned Potion Stack/ });
    expect(stack).toHaveTextContent("Complete item or stack · x42");
    expect(screen.queryByLabelText(/quantity|item id|inventory entry id|item name/i)).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Currency")).getAllByRole("option").map(({ textContent }) => textContent)).toEqual(["GOLD", "GEM"]);

    fireEvent.click(stack);
    expect(screen.getByLabelText("Total Price")).toHaveAttribute("step", "1");
    fireEvent.change(screen.getByLabelText("Total Price"), { target: { value: "1.5" } });
    const form = screen.getByLabelText("Total Price").closest("form")!;
    expect(within(form).getByRole("button", { name: "Create Listing" })).toBeDisabled();
    fireEvent.submit(form);
    expect(api.createListingApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Total Price"), { target: { value: "12000" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "GEM" } });
    fireEvent.click(within(form).getByRole("button", { name: "Create Listing" }));

    await waitFor(() => expect(api.createListingApi).toHaveBeenCalledWith({ inventoryEntryId: 5, price: 12_000, currency: "GEM" }));
  });

  it("keeps a rejected listing form open with an explicit error", async () => {
    api.createListingApi.mockRejectedValue(new Error("Listing rejected"));
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "My Listings" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Listing" }));
    fireEvent.click(screen.getByRole("button", { name: /Owned Potion Stack/ }));
    fireEvent.change(screen.getByLabelText("Total Price"), { target: { value: "1" } });
    fireEvent.click(within(screen.getByLabelText("Total Price").closest("form")!).getByRole("button", { name: "Create Listing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Listing rejected");
    expect(screen.getByLabelText("Total Price")).toBeInTheDocument();
  });

  it("cancels My Listings only after confirmation and reloads authoritative lists", async () => {
    render(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "My Listings" }));
    fireEvent.click(screen.getByRole("button", { name: /Item #1003/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Listing" }));

    await waitFor(() => expect(api.cancelListingApi).toHaveBeenCalledWith(101));
    expect(window.confirm).toHaveBeenCalledWith("Cancel listing #101?");
    expect(api.getMyListingsApi).toHaveBeenCalledTimes(2);
    expect(api.getOpenListingsApi).toHaveBeenCalledTimes(2);
    expect(api.getInventoryApi).toHaveBeenCalledTimes(2);
  });

  it("replaces fake friend barter with canonical Bought/Sold Trade history", async () => {
    render(<ExchangeShell surface="trade" playerId={7} onBack={vi.fn()} />);

    expect(await screen.findByText("Bought")).toBeInTheDocument();
    expect(screen.getByText("Sold")).toBeInTheDocument();
    expect(screen.getByText("Player #24")).toBeInTheDocument();
    expect(screen.getByText("Player #13")).toBeInTheDocument();
    expect(screen.queryByText(/friend|barter|offered|received/i)).not.toBeInTheDocument();
  });

  it("keeps internal implementation jargon out of rendered Exchange copy", async () => {
    const renderedCopy: string[] = [];
    const view = render(<ExchangeShell surface="wallet" playerId={7} onBack={vi.fn()} />);
    await screen.findByText("284,500");
    renderedCopy.push(document.body.textContent ?? "");

    view.rerender(<ExchangeShell surface="shop" playerId={7} onBack={vi.fn()} />);
    await screen.findByRole("button", { name: "My Listings" });
    fireEvent.click(screen.getByRole("button", { name: "My Listings" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Listing" }));
    await screen.findByText("Sell Item");
    renderedCopy.push(document.body.textContent ?? "");

    view.rerender(<ExchangeShell surface="trade" playerId={7} onBack={vi.fn()} />);
    await screen.findByText("Bought");
    renderedCopy.push(document.body.textContent ?? "");

    expect(renderedCopy.join(" ")).not.toMatch(/Canonical|backend-owned|PD-01/i);
  });

  it("keeps Exchange at two feature stages and translates the dual-theme hierarchy semantically", () => {
    const source = readFileSync("features/market/ExchangeShell.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    const exchangeCss = css.slice(css.indexOf("/* Exchange uses"), css.indexOf("@media (min-width: 768px)"));

    expect(new Set(source.match(/market-stage-[12]/g))).toEqual(new Set(["market-stage-1", "market-stage-2"]));
    expect(source).not.toMatch(/MARKET_|friend|barter|Wishlist|Plan & Rhythm|Income|Asset Trace/);
    expect(exchangeCss).toContain("var(--lag-control-bg)");
    expect(exchangeCss).toContain(".lag-exchange-row:not(:disabled):hover");
    expect(exchangeCss).toContain(".lag-exchange-entry:not(:disabled):hover");
    expect(exchangeCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*\.lag-exchange-tabs\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });
});
