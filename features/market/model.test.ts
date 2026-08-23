import { describe, expect, it } from "vitest";

import { EXCHANGE_CURRENCIES, recoverShopPurchase, tradePresentation } from "./model";

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
});
