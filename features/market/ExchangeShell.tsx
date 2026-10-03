"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
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
import { SwipeButton } from "@/features/role/RecordRow";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import {
  EXCHANGE_CURRENCIES,
  type ExchangeShopSurface,
  formatCurrency,
  itemIdentity,
  listingQuantity,
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
  const [selected, setSelected] = useState<EconomyCurrency | null>(null);
  const balance = wallet?.balances.find((item) => item.currency === selected);
  const close = () => {
    const trigger = document.querySelector<HTMLButtonElement>('.lag-exchange-balance[aria-pressed="true"]');
    setSelected(null);
    requestStageFocus("market-stage-1", "back");
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  };
  return (
    <><PanelStage stageKey="market-stage-1" panelRole="list">
      <PanelFrame title="Wallet" depth={0} backButton={<BackButton label="Back to Exchange" onClick={onBack} />}>
        <section className="lag-exchange-surface">
          <SurfaceHeader eyebrow="Balance" title="Wallet" description="Your current Exchange balance." accent="cyan" />
          {query.loading ? <Feedback state="info" role="status">{wallet ? "Refreshing Wallet. Showing last confirmed balances." : "Loading Wallet..."}</Feedback> : null}
          {query.error ? <div className="lag-exchange-state"><Feedback>{query.error} {wallet ? "Showing last confirmed balances." : "No confirmed balances are available."}</Feedback><button type="button" className="lag-exchange-button" onClick={() => void query.reload()}>Retry</button></div> : null}
          {!query.loading && !query.error && !wallet ? <Feedback state="info" role="status">Wallet balances are not yet confirmed.</Feedback> : null}
          {wallet?.balances.map((balance) => (
            <button key={balance.currency} type="button" className="lag-exchange-balance" aria-label={`${balance.currency} balance`} aria-pressed={selected === balance.currency} onClick={() => setSelected(balance.currency)}>
              <span>{balance.currency} available</span>
              <strong>{balance.available.toLocaleString()}</strong>
              <em>{balance.currency}</em>
              <div className="lag-exchange-balance-held"><span>Held</span><b>{balance.held.toLocaleString()} {balance.currency}</b></div>
            </button>
          ))}
        </section>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false}>{balance ? <PanelStage stageKey="market-stage-2" panelRole="detail">
      <PanelFrame title={`${balance.currency} 상세`} depth={0} backButton={<BackButton label="지갑으로" onClick={close} />}>
        <article className="lag-exchange-detail"><SurfaceHeader eyebrow="잔액" title={balance.currency} description="서버에서 확인한 지갑 잔액" accent="cyan" />
          <DetailSection title="잔액"><DataRow label="사용 가능">{formatCurrency(balance.available, balance.currency)}</DataRow><DataRow label="예약 보류">{formatCurrency(balance.held, balance.currency)}</DataRow></DetailSection>
          {query.loading || query.error ? <Feedback state="info" role="status">마지막으로 확인한 잔액입니다. 최신 조회를 확인하세요.</Feedback> : null}
        </article>
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence></>
  );
}

function ShopItemDetail({ item, purchase, purchaseId, pending, onBack, onRefresh }: {
  item: ShopItem;
  purchase: ShopPurchaseSummary | null;
  purchaseId: number | null;
  pending: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
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
        {refreshable ? <button type="button" className="lag-exchange-action" disabled={pending} onClick={onRefresh}>{pending ? "Working..." : "Refresh Purchase Status"}</button> : null}
        <Feedback state="info" role="status">시스템 상점 결제는 준비 중입니다.</Feedback>
        {purchase?.status === "COMPLETED" ? <Feedback state="info" role="status">Transaction status: COMPLETED. Item delivery is not confirmed.</Feedback> : null}
        {!item.available ? <Feedback state="info" role="status">This item is unavailable.</Feedback> : null}
        <button type="button" className="lag-exchange-button" onClick={onBack}>Back to System Shop</button>
      </div>
    </article>
  );
}

function ListingDetail({ listing, itemName, playerId, reservation, pending, onBack, onReserve, onPurchase }: {
  listing: ListingSummary;
  itemName?: string | null;
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
      <SurfaceHeader eyebrow={`Listing #${listing.id}`} title={itemName ?? itemIdentity(listing.itemId)} description={own ? "Your listing" : `Seller · Player #${listing.sellerId}`} accent="violet" />
      <DetailSection title="Listing terms">
        <DataRow label="수량">{listingQuantity(listing.saleQuantity)}</DataRow>
        <DataRow label="Total price">{formatCurrency(listing.price, listing.currency)}</DataRow>
        <DataRow label="Status">{listing.status}</DataRow>
        <DataRow label="Seller">{own ? "You · purchase unavailable" : `Player #${listing.sellerId}`}</DataRow>
      </DetailSection>
      {reservation ? (
        <DetailSection title="Reservation">
          <DataRow label="예약 수량">{listingQuantity(listing.saleQuantity)}</DataRow>
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

function MyListingDetail({ listing, itemName, pending, onBack, onCancel }: { listing: ListingSummary; itemName?: string | null; pending: boolean; onBack: () => void; onCancel: () => void }) {
  return (
    <article className="lag-exchange-detail">
      <SurfaceHeader eyebrow={`My listing #${listing.id}`} title={itemName ?? itemIdentity(listing.itemId)} description="Listing details for the complete item or stack." accent="violet" />
      <DetailSection title="Listing state">
        <DataRow label="수량">{listingQuantity(listing.saleQuantity)}</DataRow>
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

function CreateListingForm({ entries, pending, onSubmit }: {
  entries: InventoryEntry[];
  pending: boolean;
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
      </div>
    </form>
  );
}

function TradePanel({ query, playerId, onBack }: { query: ExchangeQuery<TradeSummary[]>; playerId: number; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = query.data.find((trade) => trade.id === selectedId);
  const close = () => {
    const trigger = document.querySelector<HTMLButtonElement>('.lag-exchange-trade[aria-pressed="true"]');
    setSelectedId(null);
    requestStageFocus("market-stage-1", "back");
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  };
  return (
    <><PanelStage stageKey="market-stage-1" panelRole="list">
      <PanelFrame title="Trade History" depth={0} backButton={<BackButton label="Back to Exchange" onClick={onBack} />}>
        <section className="lag-exchange-surface">
          <SurfaceHeader eyebrow="Trade History" title="Trade History" description="Your completed Marketplace purchases and sales." accent="violet" />
          <QueryState query={query} empty="No Trade history.">
            <div className="lag-exchange-list">
              {query.data.map((trade) => {
                const presentation = tradePresentation(trade, playerId);
                return <button type="button" key={trade.id} className="lag-exchange-trade" aria-pressed={selectedId === trade.id} onClick={() => setSelectedId(trade.id)}><span>{presentation.direction}</span><strong>{presentation.counterparty}</strong><small>Listing #{trade.listingId}</small><em>{formatCurrency(trade.price, trade.currency)}</em></button>;
              })}
            </div>
          </QueryState>
        </section>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false}>{selected ? <PanelStage stageKey="market-stage-2" panelRole="detail">
      <PanelFrame title="거래 상세" depth={0} backButton={<BackButton label="거래 내역으로" onClick={close} />}>
        <article className="lag-exchange-detail"><SurfaceHeader eyebrow={`Trade #${selected.id}`} title={tradePresentation(selected, playerId).direction} description={tradePresentation(selected, playerId).counterparty} accent="violet" />
          <DetailSection title="거래 내용"><DataRow label="매물 ID">{selected.listingId}</DataRow><DataRow label="구매자">Player #{selected.buyerId}</DataRow><DataRow label="판매자">Player #{selected.sellerId}</DataRow><DataRow label="전체 가격">{formatCurrency(selected.price, selected.currency)}</DataRow></DetailSection>
        </article>
      </PanelFrame>
    </PanelStage> : null}</AnimatePresence></>
  );
}

export default function ExchangeShell({ surface, playerId, onBack }: { surface: MarketSubId | null; playerId: number; onBack: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const queries = useExchangeQueries(surface);
  const mutations = useExchangeMutations(queries);
  const [shopSurface, setShopSurface] = useState<ExchangeShopSurface>("system-shop");
  const [selectedShopItemId, setSelectedShopItemId] = useState<number | null>(null);
  const [activePurchaseId, setActivePurchaseId] = useState<number | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [listingReservation, setListingReservation] = useState<ListingReservation | null>(null);
  const [creatingListing, setCreatingListing] = useState(false);
  const selectionEpoch = useRef(0);

  useEffect(() => {
    selectionEpoch.current += 1;
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
  const detailIdentity = creatingListing ? null : selectedShopItem
      ? `shop-${selectedShopItem.id}-${activePurchase?.status ?? (effectivePurchaseId === null ? "new" : `pending-${effectivePurchaseId}`)}`
      : selectedListing
        ? `${shopSurface}-${selectedListing.id}-${listingReservation?.reservationToken ?? "new"}`
        : null;
  const clearDetailState = () => {
    selectionEpoch.current += 1;
    setSelectedShopItemId(null);
    setActivePurchaseId(null);
    setSelectedListingId(null);
    setListingReservation(null);
    setCreatingListing(false);
    mutations.clearError();
  };
  const closeDetail = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-stage-key="market-stage-2"] .lag-exchange-row[data-selected="true"]');
    clearDetailState();
    requestStageFocus("market-stage-2", "back");
    requestAnimationFrame(() => {
      const target = trigger?.isConnected ? trigger : document.querySelector<HTMLButtonElement>('.lag-exchange-tabs button[data-selected="true"]');
      target?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="lag-panel-rail lag-exchange-shell" data-testid="exchange-shell">{dialog}
      <PanelStage stageKey="market-stage-1" panelRole="list">
        <PanelFrame title="상점 분류" depth={2} backButton={<BackButton label="Back to Exchange" onClick={onBack} />}>
          <section className="lag-exchange-surface">
            <SurfaceHeader eyebrow="Exchange Shop" title="Shop" description="Browse System Shop items and player listings, or sell an inventory item." accent="cyan" />
            <div className="lag-exchange-tabs" aria-label="Shop surfaces">
              {([
                ["system-shop", "System Shop"],
                ["marketplace", "Marketplace"],
                ["my-listings", "My Listings"],
              ] as const).map(([id, label]) => <SwipeButton key={id} data-selected={shopSurface === id} aria-pressed={shopSurface === id} creation={id === "my-listings"} onClick={() => { setShopSurface(id); clearDetailState(); requestStageFocus("market-stage-2", "forward"); }} onDoubleClick={id === "my-listings" ? () => { clearDetailState(); setShopSurface(id); setCreatingListing(true); requestStageFocus("market-stage-2", "forward"); } : undefined}>{label}</SwipeButton>)}
            </div>
          </section>
        </PanelFrame>
      </PanelStage>
      <PanelStage stageKey="market-stage-2" panelRole="list">
        <PanelFrame title={creatingListing ? "매물 등록" : shopSurface === "system-shop" ? "System Shop" : shopSurface === "marketplace" ? "Marketplace" : "My Listings"} depth={detailIdentity ? 1 : 0} backButton={<BackButton label={creatingListing ? "내 매물로" : "상점 분류로"} onClick={creatingListing ? () => setCreatingListing(false) : () => requestStageFocus("market-stage-1", "back")} />}>
          {creatingListing ? <>{mutations.error ? <div className="lag-exchange-state"><Feedback>{mutations.error}</Feedback></div> : null}<CreateListingForm entries={queries.inventory.data} pending={mutations.pendingKey !== null} onSubmit={(entry, price, currency) => void mutations.createListing(entry, price, currency).then((listing) => { if (listing) setCreatingListing(false); })} /></> : <section className="lag-exchange-surface">
            {mutations.completedTrades.map((trade) => <Feedback key={trade.id} state="info" role="status">Purchase completed · Trade #{trade.id} · Listing #{trade.listingId}. Check Wallet, Items and Trade History for the latest state.</Feedback>)}
            {mutations.marketplaceRefreshError ? <Feedback>{mutations.marketplaceRefreshError}</Feedback> : null}
            <button type="button" className="lag-exchange-button" disabled={mutations.pendingKey !== null} onClick={() => void mutations.refreshMarketplace()}>{mutations.marketplaceRefreshError ? "Retry Exchange lookup" : "Refresh Exchange"}</button>
            {shopSurface === "system-shop" ? (
              <QueryState query={queries.shopItems} empty="No System Shop items.">
                <div className="lag-exchange-list">
                  {queries.shopItems.data.map((item) => <ExchangeRow key={item.id} selected={selectedShopItemId === item.id} title={itemIdentity(item.itemId)} meta={`Shop item #${item.id} · ${item.available ? "Available" : "Unavailable"}`} value={formatCurrency(item.price, item.currency)} status={item.reservationTtlSec ? `Reservation · ${item.reservationTtlSec}s` : "Direct purchase"} onClick={() => { selectionEpoch.current++; setSelectedShopItemId(item.id); setActivePurchaseId(null); setSelectedListingId(null); }} />)}
                </div>
              </QueryState>
            ) : null}

            {shopSurface === "marketplace" ? (
              <QueryState query={queries.openListings} empty="No open Marketplace listings.">
                <div className="lag-exchange-list">
                  {queries.openListings.data.filter((listing) => !mutations.completedTrades.some((trade) => trade.listingId === listing.id)).map((listing) => <ExchangeRow key={listing.id} selected={selectedListingId === listing.id} title={(listing.itemId === null ? null : queries.itemNames[listing.itemId]) ?? itemIdentity(listing.itemId)} meta={listing.sellerId === playerId ? "Your listing" : `Seller · Player #${listing.sellerId}`} value={formatCurrency(listing.price, listing.currency)} status={`${listing.status} · ${listingQuantity(listing.saleQuantity)}`} onClick={() => { selectionEpoch.current++; setSelectedListingId(listing.id); setListingReservation(null); setSelectedShopItemId(null); }} />)}
                </div>
              </QueryState>
            ) : null}

            {shopSurface === "my-listings" ? (
              <>
                <QueryState query={queries.myListings} empty="No My Listings.">
                  <div className="lag-exchange-list">
                    {queries.myListings.data.map((listing) => <ExchangeRow key={listing.id} selected={selectedListingId === listing.id} title={(listing.itemId === null ? null : queries.itemNames[listing.itemId]) ?? itemIdentity(listing.itemId)} meta={`Listing #${listing.id}`} value={formatCurrency(listing.price, listing.currency)} status={`${listing.status} · ${listingQuantity(listing.saleQuantity)}`} onClick={() => { selectionEpoch.current++; setSelectedListingId(listing.id); setCreatingListing(false); setListingReservation(null); }} />)}
                  </div>
                </QueryState>
              </>
            ) : null}
          </section>}
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {detailIdentity ? (
          <PanelStage key="market-stage-3" stageKey="market-stage-3" index={1} panelRole="detail">
            <PanelFrame title="Exchange Detail" depth={0} contentKey={detailIdentity} backButton={<BackButton label="Back to Shop" onClick={closeDetail} />}>
              {mutations.error ? <div className="lag-exchange-state"><Feedback>{mutations.error}</Feedback></div> : null}
              {selectedShopItem ? <ShopItemDetail item={selectedShopItem} purchase={activePurchase} purchaseId={effectivePurchaseId} pending={mutations.pendingKey !== null} onBack={closeDetail} onRefresh={() => { if (effectivePurchaseId !== null) { const epoch = selectionEpoch.current; void mutations.refreshShopPurchase(effectivePurchaseId).then((purchase) => { if (epoch === selectionEpoch.current) setActivePurchaseId(purchase?.id ?? effectivePurchaseId); }); } }} /> : null}
              {shopSurface === "marketplace" && selectedListing ? <ListingDetail listing={selectedListing} itemName={selectedListing.itemId === null ? null : queries.itemNames[selectedListing.itemId]} playerId={playerId} reservation={listingReservation} pending={mutations.pendingKey !== null} onBack={closeDetail} onReserve={() => { const epoch = selectionEpoch.current; void mutations.reserveListing(selectedListing).then((reservation) => { if (epoch === selectionEpoch.current && reservation) setListingReservation(reservation); }); }} onPurchase={() => { if (listingReservation) { const epoch = selectionEpoch.current; void mutations.purchaseListing(selectedListing, listingReservation.reservationToken).then((trade) => { if (trade && epoch === selectionEpoch.current) closeDetail(); }); } }} /> : null}
              {shopSurface === "my-listings" && selectedListing ? <MyListingDetail listing={selectedListing} itemName={selectedListing.itemId === null ? null : queries.itemNames[selectedListing.itemId]} pending={mutations.pendingKey !== null} onBack={closeDetail} onCancel={async () => { if (await confirm(`판매 글 #${selectedListing.id}을 취소할까요?`)) void mutations.cancelListing(selectedListing).then((done) => { if (done) closeDetail(); }); }} /> : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
