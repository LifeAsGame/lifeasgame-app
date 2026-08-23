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
const fullyReloaded = (results: PromiseSettledResult<unknown>[]) => results.every((result) => result.status === "fulfilled" && result.value !== undefined);

export function useExchangeMutations(queries: ExchangeQueries) {
  // ponytail: one Exchange command at a time; split by action only if concurrent commands become a product requirement.
  const locked = useRef(false);
  const intentKeys = useRef(new Map<string, string>());
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keyFor = (intent: string) => {
    const current = intentKeys.current.get(intent);
    if (current) return current;
    const created = intentKey();
    intentKeys.current.set(intent, created);
    return created;
  };

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
    const intent = `shop-start:${item.id}`;
    const initiated = await initiateShopPurchaseApi({
      shopItemId: item.id,
      quantity: 1,
      reserveOnly: (item.reservationTtlSec ?? 0) > 0,
      idempotencyKey: keyFor(intent),
    });
    const refreshes = await Promise.allSettled([
      queries.shopPurchases.reload(),
      queries.shopItems.reload(),
      queries.wallet.reload(),
      queries.inventory.reload(),
    ]);
    const history = refreshes[0].status === "fulfilled" ? refreshes[0].value : undefined;
    const purchase = history && recoverShopPurchase(history, initiated.id);
    if (purchase) intentKeys.current.delete(intent);
    if (!purchase) setError(`Purchase #${initiated.id} was accepted, but purchase history is not available yet.`);
    else if (!fullyReloaded(refreshes)) setError("Purchase accepted, but some Exchange data could not be refreshed.");
    return { purchaseId: initiated.id, purchase: purchase ?? null };
  });

  const refreshShopPurchase = (purchaseId: number) => run(`shop-refresh-${purchaseId}`, async () => {
    const history = await queries.shopPurchases.reload();
    const purchase = history && recoverShopPurchase(history, purchaseId);
    if (!purchase) throw new Error(`Purchase #${purchaseId} is not available in purchase history yet.`);
    intentKeys.current.delete(`shop-start:${purchase.shopItemId}`);
    return purchase;
  });

  const confirmShopPurchase = (purchase: ShopPurchaseSummary) => run(`shop-confirm-${purchase.id}`, async () => {
    if (!purchase.reservationToken) throw new Error("Reservation token is unavailable.");
    const intent = `shop-confirm:${purchase.id}:${purchase.reservationToken}`;
    await confirmShopPurchaseApi(purchase.reservationToken, keyFor(intent));
    const [history] = await Promise.all([
      queries.shopPurchases.reload(),
      queries.shopItems.reload(),
      queries.wallet.reload(),
      queries.inventory.reload(),
    ]);
    const current = history && recoverShopPurchase(history, purchase.id);
    if (current && current.status !== "REQUESTED" && current.status !== "RESERVED") {
      intentKeys.current.delete(intent);
      intentKeys.current.delete(`shop-start:${purchase.shopItemId}`);
    }
    if (current?.status === "COMPLETED") return true;
    setError(current?.status === "CANCELED" || current?.status === "EXPIRED"
      ? "This reservation can no longer be confirmed."
      : "Confirmation is still processing. Retry to check its status.");
    return false;
  });

  const reserveListing = (listing: ListingSummary) => run(`listing-reserve-${listing.id}`, async () => {
    const reservation = await reserveListingApi(listing.id, 300);
    await queries.wallet.reload();
    return reservation;
  });

  const purchaseListing = (listing: ListingSummary, reservationToken: string) => run(`listing-purchase-${listing.id}`, async () => {
    const intent = `listing-purchase:${listing.id}:${reservationToken}`;
    const trade = await purchaseListingApi(listing.id, reservationToken, keyFor(intent));
    const refreshes = await Promise.allSettled([
      queries.openListings.reload(),
      queries.myListings.reload(),
      queries.trades.reload(),
      queries.wallet.reload(),
      queries.inventory.reload(),
    ]);
    if (fullyReloaded(refreshes)) intentKeys.current.delete(intent);
    else setError("Purchase completed, but some Exchange data could not be refreshed.");
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
