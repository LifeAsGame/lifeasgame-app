"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

import type { MarketSubId } from "@/entities/nav";
import type {
  EconomyCurrency,
  InventoryEntry,
  ListingReservation,
  ListingSummary,
  ShopItem,
  ShopPurchaseSummary,
  TradeSummary,
  WalletBalance,
} from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import {
  EXCHANGE_CURRENCIES,
  type ExchangeShopSurface,
  formatCurrency,
  itemIdentity,
  recoverLatestPendingShopPurchase,
  tradePresentation,
} from "./model";
import { useExchangeMutations } from "./useExchangeMutations";
import { type ExchangeQuery, useExchangeQueries } from "./useExchangeQueries";

function Feedback({ children, state = "error", role = "alert" }: { children: React.ReactNode; state?: "error" | "info"; role?: "alert" | "status" }) {
  return <p className="lag-exchange-feedback" data-state={state} role={role}>{children}</p>;
}

function QueryState<T>({ query, empty, children }: { query: ExchangeQuery<T[]>; empty: string; children: React.ReactNode }) {
  return (
    <>
      {query.loading && query.data.length === 0 ? <Feedback state="info" role="status">Loading...</Feedback> : null}
      {query.error ? <div className="lag-exchange-state"><Feedback>{query.error}</Feedback><button type="button" className="lag-exchange-button" onClick={() => void query.reload()}>Retry</button></div> : null}
      {!query.loading && !query.error && query.data.length === 0 ? <Feedback state="info" role="status">{empty}</Feedback> : null}
      {query.data.length > 0 ? children : null}
    </>
  );
}

function SurfaceHeader({ eyebrow, title, description, accent }: { eyebrow: string; title: string; description: string; accent: "cyan" | "amber" | "violet" }) {
  return (
    <header className="lag-exchange-header" data-accent={accent}>
      <span>{eyebrow}</span>
      <h4>{title}</h4>
      <p>{description}</p>
    </header>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lag-exchange-data-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="lag-exchange-section"><h5>{title}</h5><dl>{children}</dl></section>;
}

function ExchangeRow({ selected, title, meta, value, disabled, status, onClick }: {
  selected: boolean;
  title: string;
  meta: string;
  value: string;
  disabled?: boolean;
  status?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="lag-exchange-row" data-selected={selected} aria-pressed={selected} disabled={disabled} onClick={onClick}>
      <span className="lag-exchange-row-mark" aria-hidden>◇</span>
      <span className="lag-exchange-row-copy"><strong>{title}</strong><small>{meta}</small>{status ? <em>{status}</em> : null}</span>
      <span className="lag-exchange-value">{value}</span>
      <span aria-hidden>→</span>
    </button>
  );
}

function WalletPanel({ query, onBack }: { query: ExchangeQuery<WalletBalance | null>; onBack: () => void }) {
  const wallet = query.data;
  return (
    <PanelStage stageKey="market-stage-1">
      <PanelFrame title="Wallet" depth={0} backButton={<BackButton label="Back to Exchange" onClick={onBack} />}>
        <section className="lag-exchange-surface">
          <SurfaceHeader eyebrow="Balance" title="Wallet" description="Your current Exchange balance." accent="cyan" />
          {query.loading && !wallet ? <Feedback state="info" role="status">Loading Wallet...</Feedback> : null}
          {query.error ? <div className="lag-exchange-state"><Feedback>{query.error}</Feedback><button type="button" className="lag-exchange-button" onClick={() => void query.reload()}>Retry</button></div> : null}
          {wallet ? (
            <article className="lag-exchange-balance">
              <span>Current amount</span>
              <strong>{wallet.amount.toLocaleString()}</strong>
              <em>{wallet.currency}</em>
            </article>
          ) : null}
        </section>
      </PanelFrame>
    </PanelStage>
  );
}

function ShopItemDetail({ item, purchase, purchaseId, pending, onBack, onStart, onRefresh, onConfirm }: {
  item: ShopItem;
  purchase: ShopPurchaseSummary | null;
  purchaseId: number | null;
  pending: boolean;
  onBack: () => void;
  onStart: () => void;
  onRefresh: () => void;
  onConfirm: () => void;
}) {
  const confirmable = purchase?.status === "RESERVED" && Boolean(purchase.reservationToken);
  const refreshable = purchaseId !== null && (!purchase || purchase.status === "REQUESTED" || (purchase.status === "RESERVED" && !purchase.reservationToken));
  return (
    <article className="lag-exchange-detail">
      <SurfaceHeader eyebrow="System Shop item" title={itemIdentity(item.itemId)} description={`Shop item #${item.id}`} accent="amber" />
      <DetailSection title="Purchase Details">
        <DataRow label="Price">{formatCurrency(item.price, item.currency)}</DataRow>
        <DataRow label="Available">{item.available ? "Available" : "Unavailable"}</DataRow>
        <DataRow label="Global stock limit">{item.globalStockLimit ?? "None"}</DataRow>
        <DataRow label="Per-player limit">{item.perPlayerLimit ?? "None"}</DataRow>
        <DataRow label="Reservation TTL">{item.reservationTtlSec ? `${item.reservationTtlSec} seconds` : "Direct purchase"}</DataRow>
      </DetailSection>
      {purchase ? (
        <DetailSection title="Purchase Status">
          <DataRow label="Purchase ID">{purchase.id}</DataRow>
          <DataRow label="Status">{purchase.status}</DataRow>
          <DataRow label="Reservation expiry">{purchase.reservationExpiresAt ? new Date(purchase.reservationExpiresAt).toLocaleString() : "Not reserved"}</DataRow>
        </DetailSection>
      ) : null}
      <div className="lag-exchange-actions">
        {purchaseId === null ? <button type="button" className="lag-exchange-action" disabled={pending || !item.available} onClick={onStart}>{pending ? "Working..." : item.reservationTtlSec ? "Reserve / Start purchase" : "Purchase"}</button> : null}
        {refreshable ? <button type="button" className="lag-exchange-action" disabled={pending} onClick={onRefresh}>{pending ? "Working..." : "Refresh Purchase Status"}</button> : null}
        {confirmable ? <button type="button" className="lag-exchange-action" disabled={pending} onClick={onConfirm}>{pending ? "Working..." : "Confirm Purchase"}</button> : null}
        {purchase?.status === "COMPLETED" ? <Feedback state="info" role="status">Purchase completed.</Feedback> : null}
        {!item.available ? <Feedback state="info" role="status">This item is unavailable.</Feedback> : null}
        <button type="button" className="lag-exchange-button" onClick={onBack}>Back to System Shop</button>
      </div>
    </article>
  );
}

function ListingDetail({ listing, playerId, reservation, pending, onBack, onReserve, onPurchase }: {
  listing: ListingSummary;
  playerId: number;
  reservation: ListingReservation | null;
  pending: boolean;
  onBack: () => void;
  onReserve: () => void;
  onPurchase: () => void;
}) {
  const own = listing.sellerId === playerId;
  const open = listing.status === "OPEN";
  return (
    <article className="lag-exchange-detail">
      <SurfaceHeader eyebrow={`Listing #${listing.id}`} title={itemIdentity(listing.itemId)} description={own ? "Your listing" : `Seller · Player #${listing.sellerId}`} accent="violet" />
      <DetailSection title="Listing terms">
        <DataRow label="Total price">{formatCurrency(listing.price, listing.currency)}</DataRow>
        <DataRow label="Status">{listing.status}</DataRow>
        <DataRow label="Seller">{own ? "You · purchase unavailable" : `Player #${listing.sellerId}`}</DataRow>
      </DetailSection>
      {reservation ? (
        <DetailSection title="Reservation">
          <DataRow label="Hold ID">{reservation.holdId}</DataRow>
          <DataRow label="Expires">{new Date(reservation.expiresAt).toLocaleString()}</DataRow>
        </DetailSection>
      ) : null}
      <div className="lag-exchange-actions">
        {!reservation ? <button type="button" className="lag-exchange-action" disabled={pending || own || !open} onClick={onReserve}>{pending ? "Working..." : own ? "Your listing" : "Reserve"}</button> : null}
        {reservation ? <button type="button" className="lag-exchange-action" disabled={pending} onClick={onPurchase}>{pending ? "Working..." : "Purchase reserved listing"}</button> : null}
        {!open ? <Feedback state="info" role="status">This listing is not open.</Feedback> : null}
        <button type="button" className="lag-exchange-button" onClick={onBack}>Back to Marketplace</button>
      </div>
    </article>
  );
}

function MyListingDetail({ listing, pending, onBack, onCancel }: { listing: ListingSummary; pending: boolean; onBack: () => void; onCancel: () => void }) {
  return (
    <article className="lag-exchange-detail">
      <SurfaceHeader eyebrow={`My listing #${listing.id}`} title={itemIdentity(listing.itemId)} description="Listing details for the complete item or stack." accent="violet" />
      <DetailSection title="Listing state">
        <DataRow label="Total price">{formatCurrency(listing.price, listing.currency)}</DataRow>
        <DataRow label="Status">{listing.status}</DataRow>
      </DetailSection>
      <div className="lag-exchange-actions">
        {listing.status === "OPEN" ? <button type="button" className="lag-exchange-button" data-variant="destructive" disabled={pending} onClick={onCancel}>{pending ? "Working..." : "Cancel Listing"}</button> : null}
        <button type="button" className="lag-exchange-button" onClick={onBack}>Back to My Listings</button>
      </div>
    </article>
  );
}

function CreateListingForm({ entries, pending, onBack, onSubmit }: {
  entries: InventoryEntry[];
  pending: boolean;
  onBack: () => void;
  onSubmit: (entry: InventoryEntry, price: number, currency: EconomyCurrency) => void;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<EconomyCurrency>("GOLD");
  const selectedEntry = entries.find((entry) => entry.itemInstanceId === selectedEntryId) ?? null;
  const priceValue = Number(price);
  const priceValid = Number.isInteger(priceValue) && priceValue >= 1;

  return (
    <form className="lag-exchange-detail" onSubmit={(event) => {
      event.preventDefault();
      if (selectedEntry && priceValid) onSubmit(selectedEntry, priceValue, currency);
    }}>
      <SurfaceHeader eyebrow="Sell Item" title="Create Listing" description="Select an inventory item. The complete item or stack will be listed." accent="amber" />
      <fieldset className="lag-exchange-entry-picker">
        <legend>Inventory Item</legend>
        {entries.length === 0 ? <Feedback state="info" role="status">No owned entries available.</Feedback> : null}
        {entries.map((entry) => (
          <button
            key={entry.itemInstanceId}
            type="button"
            className="lag-exchange-entry"
            data-selected={selectedEntryId === entry.itemInstanceId}
            aria-pressed={selectedEntryId === entry.itemInstanceId}
            disabled={entry.bound || pending}
            onClick={() => setSelectedEntryId(entry.itemInstanceId)}
          >
            <strong>{entry.itemName}</strong>
            <span>{entry.rarity} · {entry.category}</span>
            <small>Complete item or stack · x{entry.quantity}{entry.bound ? " · Bound · unavailable" : ""}</small>
          </button>
        ))}
      </fieldset>
      <label className="lag-exchange-field">Total Price<input aria-label="Total Price" type="number" min={1} step={1} required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
      <label className="lag-exchange-field">Currency<select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value as EconomyCurrency)}>{EXCHANGE_CURRENCIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      {selectedEntry ? <Feedback state="info" role="status">Selected: {selectedEntry.itemName} · complete stack x{selectedEntry.quantity}</Feedback> : null}
      <div className="lag-exchange-actions">
        <button type="submit" className="lag-exchange-action" disabled={pending || !selectedEntry || !priceValid}>{pending ? "Working..." : "Create Listing"}</button>
        <button type="button" className="lag-exchange-button" onClick={onBack}>Cancel</button>
      </div>
    </form>
  );
}

function TradePanel({ query, playerId, onBack }: { query: ExchangeQuery<TradeSummary[]>; playerId: number; onBack: () => void }) {
  return (
    <PanelStage stageKey="market-stage-1">
      <PanelFrame title="Trade History" depth={0} backButton={<BackButton label="Back to Exchange" onClick={onBack} />}>
        <section className="lag-exchange-surface">
          <SurfaceHeader eyebrow="Trade History" title="Trade History" description="Your completed Marketplace purchases and sales." accent="violet" />
          <QueryState query={query} empty="No Trade history.">
            <div className="lag-exchange-list">
              {query.data.map((trade) => {
                const presentation = tradePresentation(trade, playerId);
                return <article key={trade.id} className="lag-exchange-trade"><span>{presentation.direction}</span><strong>{presentation.counterparty}</strong><small>Listing #{trade.listingId}</small><em>{formatCurrency(trade.price, trade.currency)}</em></article>;
              })}
            </div>
          </QueryState>
        </section>
      </PanelFrame>
    </PanelStage>
  );
}

export default function ExchangeShell({ surface, playerId, onBack }: { surface: MarketSubId | null; playerId: number; onBack: () => void }) {
  const queries = useExchangeQueries(surface);
  const mutations = useExchangeMutations(queries);
  const [shopSurface, setShopSurface] = useState<ExchangeShopSurface>("system-shop");
  const [selectedShopItemId, setSelectedShopItemId] = useState<number | null>(null);
  const [activePurchaseId, setActivePurchaseId] = useState<number | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [listingReservation, setListingReservation] = useState<ListingReservation | null>(null);
  const [creatingListing, setCreatingListing] = useState(false);

  useEffect(() => {
    setShopSurface("system-shop");
    setSelectedShopItemId(null);
    setActivePurchaseId(null);
    setSelectedListingId(null);
    setListingReservation(null);
    setCreatingListing(false);
    mutations.clearError();
  }, [surface]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!surface) return null;
  if (surface === "wallet") return <div className="lag-panel-rail lag-exchange-shell"><WalletPanel query={queries.wallet} onBack={onBack} /></div>;
  if (surface === "trade") return <div className="lag-panel-rail lag-exchange-shell"><TradePanel query={queries.trades} playerId={playerId} onBack={onBack} /></div>;

  const selectedShopItem = queries.shopItems.data.find((item) => item.id === selectedShopItemId) ?? null;
  const recoveredPurchase = selectedShopItemId === null
    ? null
    : recoverLatestPendingShopPurchase(queries.shopPurchases.data, selectedShopItemId);
  const activePurchase = activePurchaseId === null
    ? recoveredPurchase
    : queries.shopPurchases.data.find((purchase) => purchase.id === activePurchaseId) ?? null;
  const effectivePurchaseId = activePurchaseId ?? recoveredPurchase?.id ?? null;
  const listingSource = shopSurface === "marketplace" ? queries.openListings.data : queries.myListings.data;
  const selectedListing = listingSource.find((listing) => listing.id === selectedListingId) ?? null;
  const detailIdentity = creatingListing
    ? "create-listing"
    : selectedShopItem
      ? `shop-${selectedShopItem.id}-${activePurchase?.status ?? (effectivePurchaseId === null ? "new" : `pending-${effectivePurchaseId}`)}`
      : selectedListing
        ? `${shopSurface}-${selectedListing.id}-${listingReservation?.reservationToken ?? "new"}`
        : null;
  const closeDetail = () => {
    setSelectedShopItemId(null);
    setActivePurchaseId(null);
    setSelectedListingId(null);
    setListingReservation(null);
    setCreatingListing(false);
    mutations.clearError();
    requestStageFocus("market-stage-1", "back");
  };

  return (
    <div className="lag-panel-rail lag-exchange-shell" data-testid="exchange-shell">
      <PanelStage stageKey="market-stage-1">
        <PanelFrame title="Shop" depth={detailIdentity ? 1 : 0} backButton={<BackButton label="Back to Exchange" onClick={onBack} />}>
          <section className="lag-exchange-surface">
            <SurfaceHeader eyebrow="Exchange Shop" title="Shop" description="Browse System Shop items and player listings, or sell an inventory item." accent="cyan" />
            <div className="lag-exchange-tabs" aria-label="Shop surfaces">
              {([
                ["system-shop", "System Shop"],
                ["marketplace", "Marketplace"],
                ["my-listings", "My Listings"],
              ] as const).map(([id, label]) => <button key={id} type="button" data-selected={shopSurface === id} aria-pressed={shopSurface === id} onClick={() => { setShopSurface(id); closeDetail(); }}>{label}</button>)}
            </div>
            {shopSurface === "system-shop" ? (
              <QueryState query={queries.shopItems} empty="No System Shop items.">
                <div className="lag-exchange-list">
                  {queries.shopItems.data.map((item) => <ExchangeRow key={item.id} selected={selectedShopItemId === item.id} title={itemIdentity(item.itemId)} meta={`Shop item #${item.id} · ${item.available ? "Available" : "Unavailable"}`} value={formatCurrency(item.price, item.currency)} status={item.reservationTtlSec ? `Reservation · ${item.reservationTtlSec}s` : "Direct purchase"} onClick={() => { setSelectedShopItemId(item.id); setActivePurchaseId(null); setSelectedListingId(null); }} />)}
                </div>
              </QueryState>
            ) : null}

            {shopSurface === "marketplace" ? (
              <QueryState query={queries.openListings} empty="No open Marketplace listings.">
                <div className="lag-exchange-list">
                  {queries.openListings.data.map((listing) => <ExchangeRow key={listing.id} selected={selectedListingId === listing.id} title={itemIdentity(listing.itemId)} meta={listing.sellerId === playerId ? "Your listing" : `Seller · Player #${listing.sellerId}`} value={formatCurrency(listing.price, listing.currency)} status={listing.status} onClick={() => { setSelectedListingId(listing.id); setListingReservation(null); setSelectedShopItemId(null); }} />)}
                </div>
              </QueryState>
            ) : null}

            {shopSurface === "my-listings" ? (
              <>
                <button type="button" className="lag-exchange-action" disabled={mutations.pendingKey !== null} onClick={() => { setCreatingListing(true); setSelectedListingId(null); }}>Create Listing</button>
                <QueryState query={queries.myListings} empty="No My Listings.">
                  <div className="lag-exchange-list">
                    {queries.myListings.data.map((listing) => <ExchangeRow key={listing.id} selected={selectedListingId === listing.id} title={itemIdentity(listing.itemId)} meta={`Listing #${listing.id}`} value={formatCurrency(listing.price, listing.currency)} status={listing.status} onClick={() => { setSelectedListingId(listing.id); setCreatingListing(false); setListingReservation(null); }} />)}
                  </div>
                </QueryState>
              </>
            ) : null}
          </section>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {detailIdentity ? (
          <PanelStage key="market-stage-2" stageKey="market-stage-2" index={1}>
            <PanelFrame title={creatingListing ? "New Listing" : "Exchange Detail"} depth={0} contentKey={detailIdentity} backButton={<BackButton label="Back to Shop" onClick={closeDetail} />}>
              {mutations.error ? <div className="lag-exchange-state"><Feedback>{mutations.error}</Feedback></div> : null}
              {selectedShopItem ? <ShopItemDetail item={selectedShopItem} purchase={activePurchase} purchaseId={effectivePurchaseId} pending={mutations.pendingKey !== null} onBack={closeDetail} onStart={() => void mutations.startShopPurchase(selectedShopItem).then((result) => setActivePurchaseId(result?.purchaseId ?? null))} onRefresh={() => { if (effectivePurchaseId !== null) void mutations.refreshShopPurchase(effectivePurchaseId); }} onConfirm={() => { if (activePurchase) void mutations.confirmShopPurchase(activePurchase).then((completed) => { if (completed) closeDetail(); }); }} /> : null}
              {shopSurface === "marketplace" && selectedListing ? <ListingDetail listing={selectedListing} playerId={playerId} reservation={listingReservation} pending={mutations.pendingKey !== null} onBack={closeDetail} onReserve={() => void mutations.reserveListing(selectedListing).then((reservation) => setListingReservation(reservation ?? null))} onPurchase={() => { if (listingReservation) void mutations.purchaseListing(selectedListing, listingReservation.reservationToken).then((trade) => { if (trade) closeDetail(); }); }} /> : null}
              {shopSurface === "my-listings" && selectedListing ? <MyListingDetail listing={selectedListing} pending={mutations.pendingKey !== null} onBack={closeDetail} onCancel={() => { if (window.confirm(`Cancel listing #${selectedListing.id}?`)) void mutations.cancelListing(selectedListing).then((done) => { if (done) closeDetail(); }); }} /> : null}
              {shopSurface === "my-listings" && creatingListing ? <CreateListingForm entries={queries.inventory.data} pending={mutations.pendingKey !== null} onBack={closeDetail} onSubmit={(entry, price, currency) => void mutations.createListing(entry, price, currency).then((listing) => { if (listing) closeDetail(); })} /> : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
