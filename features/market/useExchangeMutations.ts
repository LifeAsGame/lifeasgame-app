"use client";

import { useRef, useState } from "react";

import type { EconomyCurrency, InventoryEntry, ListingSummary, ShopItem, ShopPurchaseSummary } from "@/shared/api/types";
import {
  cancelListingApi,
  confirmShopPurchaseApi,
  createListingApi,
  initiateShopPurchaseApi,
  purchaseListingApi,
  reserveListingApi,
} from "@/lib/api/endpoints/market.api";
import { recoverShopPurchase } from "./model";
import type { ExchangeQueries } from "./useExchangeQueries";

const message = (caught: unknown) => caught instanceof Error ? caught.message : "Request failed.";
const intentKey = () => globalThis.crypto.randomUUID();

export function useExchangeMutations(queries: ExchangeQueries) {
  // ponytail: one Exchange command at a time; split by action only if concurrent commands become a product requirement.
  const locked = useRef(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
    if (locked.current) return undefined;
    locked.current = true;
    setPendingKey(key);
    setError(null);
    try {
      return await action();
    } catch (caught) {
      setError(message(caught));
      return undefined;
    } finally {
      locked.current = false;
      setPendingKey(null);
    }
  };

  const startShopPurchase = (item: ShopItem) => run(`shop-start-${item.id}`, async () => {
    const initiated = await initiateShopPurchaseApi({
      shopItemId: item.id,
      quantity: 1,
      reserveOnly: (item.reservationTtlSec ?? 0) > 0,
      idempotencyKey: intentKey(),
    });
    const [history] = await Promise.all([
      queries.shopPurchases.reload(),
      queries.shopItems.reload(),
      queries.wallet.reload(),
      queries.inventory.reload(),
    ]);
    const purchase = history && recoverShopPurchase(history, initiated.id);
    if (!purchase) setError(`Purchase #${initiated.id} was accepted, but canonical purchase history is not available yet.`);
    return { purchaseId: initiated.id, purchase: purchase ?? null };
  });

  const refreshShopPurchase = (purchaseId: number) => run(`shop-refresh-${purchaseId}`, async () => {
    const history = await queries.shopPurchases.reload();
    const purchase = history && recoverShopPurchase(history, purchaseId);
    if (!purchase) throw new Error(`Purchase #${purchaseId} is not available in canonical purchase history yet.`);
    return purchase;
  });

  const confirmShopPurchase = (purchase: ShopPurchaseSummary) => run(`shop-confirm-${purchase.id}`, async () => {
    if (!purchase.reservationToken) throw new Error("Canonical reservation token is unavailable.");
    await confirmShopPurchaseApi(purchase.reservationToken, intentKey());
    await Promise.all([
      queries.shopPurchases.reload(),
      queries.shopItems.reload(),
      queries.wallet.reload(),
      queries.inventory.reload(),
    ]);
    return true;
  });

  const reserveListing = (listing: ListingSummary) => run(`listing-reserve-${listing.id}`, async () => {
    const reservation = await reserveListingApi(listing.id, 300);
    await queries.wallet.reload();
    return reservation;
  });

  const purchaseListing = (listing: ListingSummary, reservationToken: string) => run(`listing-purchase-${listing.id}`, async () => {
    const trade = await purchaseListingApi(listing.id, reservationToken, intentKey());
    await Promise.all([
      queries.openListings.reload(),
      queries.myListings.reload(),
      queries.trades.reload(),
      queries.wallet.reload(),
      queries.inventory.reload(),
    ]);
    return trade;
  });

  const createListing = (entry: InventoryEntry, price: number, currency: EconomyCurrency) => run(`listing-create-${entry.itemInstanceId}`, async () => {
    const listing = await createListingApi({ inventoryEntryId: entry.itemInstanceId, price, currency });
    await Promise.all([queries.myListings.reload(), queries.openListings.reload(), queries.inventory.reload()]);
    return listing;
  });

  const cancelListing = (listing: ListingSummary) => run(`listing-cancel-${listing.id}`, async () => {
    await cancelListingApi(listing.id);
    await Promise.all([queries.myListings.reload(), queries.openListings.reload(), queries.inventory.reload()]);
    return true;
  });

  return {
    pendingKey,
    error,
    clearError: () => setError(null),
    startShopPurchase,
    refreshShopPurchase,
    confirmShopPurchase,
    reserveListing,
    purchaseListing,
    createListing,
    cancelListing,
  };
}
