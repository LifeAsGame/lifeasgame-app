"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MarketSubId } from "@/entities/nav";
import type { InventoryEntry, ListingSummary, ShopItem, ShopPurchaseSummary, TradeSummary, WalletBalance } from "@/shared/api/types";
import { getInventoryApi } from "@/lib/api/endpoints/inventory.api";
import {
  getMyListingsApi,
  getOpenListingsApi,
  getShopItemsApi,
  getShopPurchasesApi,
  getTradesApi,
  getWalletApi,
} from "@/lib/api/endpoints/market.api";

export type ExchangeQuery<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<T | undefined>;
};

const message = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

function useExchangeQuery<T>(initial: T, load: () => Promise<T>, fallback: string, enabled: boolean): ExchangeQuery<T> {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await load();
      if (id === requestId.current) setData(next);
      return next;
    } catch (caught) {
      if (id === requestId.current) setError(message(caught, fallback));
      return undefined;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fallback, load]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { data, loading, error, reload };
}

const loadInventory = async () => (await getInventoryApi()).entries;

export function useExchangeQueries(surface: MarketSubId | null) {
  const shop = surface === "shop";
  const wallet = useExchangeQuery<WalletBalance | null>(null, getWalletApi, "Unable to load Wallet.", surface === "wallet" || shop);
  const shopItems = useExchangeQuery<ShopItem[]>([], getShopItemsApi, "Unable to load System Shop.", shop);
  const shopPurchases = useExchangeQuery<ShopPurchaseSummary[]>([], getShopPurchasesApi, "Unable to load purchase history.", shop);
  const openListings = useExchangeQuery<ListingSummary[]>([], getOpenListingsApi, "Unable to load Marketplace.", shop);
  const myListings = useExchangeQuery<ListingSummary[]>([], getMyListingsApi, "Unable to load My Listings.", shop);
  const inventory = useExchangeQuery<InventoryEntry[]>([], loadInventory, "Unable to load owned InventoryEntry data.", shop);
  const trades = useExchangeQuery<TradeSummary[]>([], getTradesApi, "Unable to load Trade history.", surface === "trade");

  return { wallet, shopItems, shopPurchases, openListings, myListings, inventory, trades };
}

export type ExchangeQueries = ReturnType<typeof useExchangeQueries>;
