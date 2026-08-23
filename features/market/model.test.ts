import { describe, expect, it } from "vitest";

import { EXCHANGE_CURRENCIES, recoverLatestReservedShopPurchase, recoverShopPurchase, tradePresentation } from "./model";

describe("Exchange presentation helpers", () => {
  it("only offers canonical currencies and recovers reservation state by purchase id", () => {
    expect(EXCHANGE_CURRENCIES).toEqual(["GOLD", "GEM"]);
    expect(recoverShopPurchase([
      { id: 42, shopItemId: 3, quantity: 1, status: "RESERVED", reservationToken: "canonical-token", reservationExpiresAt: "2026-08-23T01:00:00Z" },
    ], 42)?.reservationToken).toBe("canonical-token");
  });

  it("derives Bought/Sold and neutral counterparty identity from current player", () => {
    const bought = tradePresentation({ id: 1, listingId: 2, buyerId: 7, sellerId: 9, price: 30, currency: "GOLD" }, 7);
    const sold = tradePresentation({ id: 2, listingId: 3, buyerId: 11, sellerId: 7, price: 4, currency: "GEM" }, 7);

    expect(bought).toEqual({ direction: "Bought", counterparty: "Player #9" });
    expect(sold).toEqual({ direction: "Sold", counterparty: "Player #11" });
  });

  it("recovers only the highest-id confirmable reservation for a Shop item", () => {
    const purchases = [
      { id: 44, shopItemId: 3, quantity: 1, status: "RESERVED", reservationToken: "older", reservationExpiresAt: "2026-08-23T01:00:00Z" },
      { id: 47, shopItemId: 3, quantity: 1, status: "COMPLETED", reservationToken: "completed", reservationExpiresAt: null },
      { id: 48, shopItemId: 3, quantity: 1, status: "RESERVED", reservationToken: null, reservationExpiresAt: "2026-08-23T02:00:00Z" },
      { id: 46, shopItemId: 4, quantity: 1, status: "RESERVED", reservationToken: "other-item", reservationExpiresAt: "2026-08-23T02:00:00Z" },
      { id: 45, shopItemId: 3, quantity: 1, status: "RESERVED", reservationToken: "latest-confirmable", reservationExpiresAt: "2026-08-23T03:00:00Z" },
    ];

    expect(recoverLatestReservedShopPurchase(purchases, 3)?.id).toBe(45);
    expect(recoverLatestReservedShopPurchase(purchases, 99)).toBeNull();
  });
});
