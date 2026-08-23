import type {
  ListingReservation,
  ListingSummary,
  OpenListingRequest,
  ShopItem,
  ShopPurchaseId,
  ShopPurchaseRequest,
  ShopPurchaseSummary,
  ShopReservation,
  TradeSummary,
  WalletBalance,
} from "@/shared/api/types";
import { inventoryMock } from "./inventory.mock";

const INITIAL_WALLET: WalletBalance = { amount: 284_500, currency: "GOLD" };
const INITIAL_SHOP_ITEMS: ShopItem[] = [
  { id: 1, itemId: 1010, price: 45_000, currency: "GOLD", available: true, globalStockLimit: null, perPlayerLimit: 1, reservationTtlSec: 300 },
  { id: 2, itemId: 3010, price: 25, currency: "GEM", available: true, globalStockLimit: 1_000, perPlayerLimit: 10, reservationTtlSec: 60 },
  { id: 3, itemId: 5010, price: 4_200, currency: "GOLD", available: false, globalStockLimit: null, perPlayerLimit: null, reservationTtlSec: null },
];
const INITIAL_MY_LISTINGS: ListingSummary[] = [
  { id: 101, itemId: 1003, sellerId: 7, price: 35_000, currency: "GOLD", status: "OPEN" },
  { id: 102, itemId: 5002, sellerId: 7, price: 85, currency: "GEM", status: "OPEN" },
];
const INITIAL_OPEN_LISTINGS: ListingSummary[] = [
  ...INITIAL_MY_LISTINGS,
  { id: 201, itemId: 3011, sellerId: 24, price: 1_800, currency: "GOLD", status: "OPEN" },
  { id: 202, itemId: 7010, sellerId: 37, price: 32, currency: "GEM", status: "OPEN" },
];
const INITIAL_TRADES: TradeSummary[] = [
  { id: 301, listingId: 88, buyerId: 7, sellerId: 24, price: 28_000, currency: "GOLD" },
  { id: 302, listingId: 56, buyerId: 13, sellerId: 7, price: 45, currency: "GEM" },
];

let wallet = INITIAL_WALLET;
let shopItems = structuredClone(INITIAL_SHOP_ITEMS);
let myListings = structuredClone(INITIAL_MY_LISTINGS);
let openListings = structuredClone(INITIAL_OPEN_LISTINGS);
let purchases: ShopPurchaseSummary[] = [];
let trades = structuredClone(INITIAL_TRADES);
let nextId = 1_000;

const copy = <T,>(value: T): T => structuredClone(value);

export const marketMock = {
  reset() {
    wallet = INITIAL_WALLET;
    shopItems = copy(INITIAL_SHOP_ITEMS);
    myListings = copy(INITIAL_MY_LISTINGS);
    openListings = copy(INITIAL_OPEN_LISTINGS);
    purchases = [];
    trades = copy(INITIAL_TRADES);
    nextId = 1_000;
  },
  wallet: () => copy(wallet),
  shopItems: () => ({ items: copy(shopItems) }),
  shopPurchases: () => ({ purchases: copy(purchases) }),
  myListings: () => ({ listings: copy(myListings) }),
  openListings: () => ({ listings: copy(openListings) }),
  trades: () => ({ trades: copy(trades) }),
  initiateShopPurchase(request: ShopPurchaseRequest): ShopPurchaseId {
    const shopItem = shopItems.find((item) => item.id === request.shopItemId);
    if (!shopItem?.available) throw new Error("Shop item is unavailable.");
    const id = nextId++;
    const ttl = shopItem.reservationTtlSec;
    purchases.unshift({
      id,
      shopItemId: request.shopItemId,
      quantity: request.quantity,
      status: request.reserveOnly ? "RESERVED" : "COMPLETED",
      reservationToken: request.reserveOnly ? `shop-reservation-${id}` : null,
      reservationExpiresAt: request.reserveOnly
        ? new Date(Date.now() + (ttl ?? 300) * 1_000).toISOString()
        : null,
    });
    return { id };
  },
  confirmShopPurchase(reservationToken: string): ShopReservation {
    const purchase = purchases.find((candidate) => candidate.reservationToken === reservationToken);
    if (!purchase) throw new Error("Reservation not found.");
    purchase.status = "COMPLETED";
    return { reservationToken, expiresAt: purchase.reservationExpiresAt ?? new Date().toISOString() };
  },
  createListing(request: OpenListingRequest) {
    const inventoryEntry = inventoryMock.inventory().entries.find((entry) => entry.itemInstanceId === request.inventoryEntryId);
    if (!inventoryEntry || inventoryEntry.bound) throw new Error("Inventory entry is unavailable for listing.");
    const listing: ListingSummary = {
      id: nextId++,
      itemId: inventoryEntry.itemId,
      sellerId: 7,
      price: request.price,
      currency: request.currency,
      status: "OPEN",
    };
    myListings.unshift(listing);
    openListings.unshift(listing);
    return { id: listing.id };
  },
  cancelListing(listingId: number) {
    myListings = myListings.map((listing) => listing.id === listingId ? { ...listing, status: "CANCELED" } : listing);
    openListings = openListings.filter((listing) => listing.id !== listingId);
  },
  reserveListing(listingId: number): ListingReservation {
    if (!openListings.some((listing) => listing.id === listingId)) throw new Error("Listing not found.");
    return {
      reservationToken: `listing-reservation-${listingId}`,
      holdId: `hold-${listingId}`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
  },
  purchaseListing(listingId: number, reservationToken: string): TradeSummary {
    if (reservationToken !== `listing-reservation-${listingId}`) throw new Error("Reservation not found.");
    const listing = openListings.find((candidate) => candidate.id === listingId);
    if (!listing) throw new Error("Listing not found.");
    const trade: TradeSummary = { id: nextId++, listingId, buyerId: 7, sellerId: listing.sellerId, price: listing.price, currency: listing.currency };
    trades.unshift(trade);
    openListings = openListings.filter((candidate) => candidate.id !== listingId);
    return copy(trade);
  },
};
