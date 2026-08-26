"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import type {
  AdminInventoryEntries,
  AdminInventoryOperationsDataSource,
  AdminItemDetail,
  AdminItemPage,
  AdminItemSearchQuery,
  AdminMailboxEntries,
} from "../api/inventory.source";
import type { AdminAccess } from "../model";
import styles from "../admin.module.css";
import type { AdminPlayerInfo } from "./model";
import { useInventoryMailboxOperations } from "./useInventoryMailboxOperations";
import type { EntitlementIntent, EntitlementOperationPhase } from "./useInventoryMailboxOperations";

function useIsMobile() {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") { setMobile(false); return; }
    const query = window.matchMedia("(max-width: 759px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile;
}

function loadError(caught: unknown, fallback: string) {
  return { status: caught instanceof ApiError ? caught.status : null, message: caught instanceof Error ? caught.message : fallback };
}

function L2Review({
  intent,
  phase,
  error,
  matchingEntries,
  loadedAt,
  onCancel,
  onSubmit,
}: {
  intent: EntitlementIntent;
  phase: EntitlementOperationPhase;
  error: { status: number | null; message: string } | null;
  matchingEntries: Array<{ slotIndex: number; quantity: number; bound: boolean }>;
  loadedAt: Date;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    headingRef.current?.focus();
    return () => { if (dialog.open && typeof dialog.close === "function") dialog.close(); };
  }, []);
  if (typeof document === "undefined") return null;
  const busy = phase !== "REVIEWING";
  return createPortal(
    <dialog ref={dialogRef} className={styles.entitlementReviewDialog} aria-labelledby="entitlement-review-title" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
      <div className={styles.entitlementReviewHeader}><span aria-hidden="true">2</span><div><p className={styles.eyebrow}>Level 2 · reasoned confirmation</p><h2 id="entitlement-review-title" ref={headingRef} tabIndex={-1}>Confirm entitlement operation</h2></div></div>
      <dl className={styles.entitlementReviewSummary}>
        <div><dt>Target Player</dt><dd>{intent.playerName} · <code>{intent.playerId}</code></dd></div>
        <div><dt>Item</dt><dd><code>{intent.item.id}</code> · {intent.item.code} · {intent.item.name}</dd></div>
        <div><dt>Definition</dt><dd>{intent.item.category} / {intent.item.type} / {intent.item.rarity} · {intent.item.stackable ? `Stackable up to ${intent.item.maxStack}` : "Not stackable"}</dd></div>
        <div><dt>Requested effect</dt><dd>{intent.destination} · quantity {intent.quantity} · {intent.bound ? "Bound" : "Unbound"}</dd></div>
        <div><dt>Current matching entries</dt><dd>{matchingEntries.length ? matchingEntries.map((entry) => `slot ${entry.slotIndex}: ${entry.quantity} (${entry.bound ? "bound" : "unbound"})`).join(" · ") : "None in the current destination state"}</dd></div>
        <div><dt>State freshness</dt><dd>{loadedAt.toLocaleString()}</dd></div>
        <div><dt>Mandatory reason</dt><dd>{intent.reason}</dd></div>
      </dl>
      <p className={styles.entitlementSafetyNote}>Server capacity, stacking, and placement rules are authoritative. No optimistic result or resulting slot is assumed.</p>
      <dl className={styles.questOperationReceipt}>
        <div><dt>Correlation ID</dt><dd><code>{intent.correlationId}</code></dd></div>
        <div><dt>Idempotency key</dt><dd><code>{intent.idempotencyKey}</code></dd></div>
      </dl>
      {error ? <p className={styles.questOverrideError} role="alert">{error.message}</p> : null}
      <div className={styles.questOverrideActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={styles.primaryButton} onClick={onSubmit} disabled={busy}>{phase === "SUBMITTING" ? "Submitting…" : phase === "SUCCEEDED_RELOADING" ? "Reloading canonical state…" : "Confirm Level 2 operation"}</button>
      </div>
    </dialog>,
    document.body,
  );
}

export function PlayerInventoryMailbox({
  player,
  access,
  readSource,
  commandSource,
  auditSource,
  onOpenAudit,
}: {
  player: AdminPlayerInfo;
  access: AdminAccess;
  readSource: AdminInventoryOperationsDataSource;
  commandSource: AdminInventoryOperationsCommandSource;
  auditSource: AdminAuditDataSource;
  onOpenAudit?: () => void;
}) {
  const [destination, setDestination] = useState<"INVENTORY" | "MAILBOX">("INVENTORY");
  const [inventory, setInventory] = useState<AdminInventoryEntries | null>(null);
  const [mailbox, setMailbox] = useState<AdminMailboxEntries | null>(null);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [destinationError, setDestinationError] = useState<{ status: number | null; message: string } | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [filters, setFilters] = useState({ name: "", category: "", type: "", rarity: "" });
  const [items, setItems] = useState<AdminItemPage | null>(null);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [itemSearchError, setItemSearchError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AdminItemDetail | null>(null);
  const [itemDetailLoading, setItemDetailLoading] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [bound, setBound] = useState(false);
  const [reason, setReason] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const destinationRequest = useRef(0);
  const searchRequest = useRef(0);
  const itemRequest = useRef(0);
  const appliedFilters = useRef(filters);
  const mobile = useIsMobile();

  const applyInventory = useCallback((next: AdminInventoryEntries) => { setInventory(next); setLoadedAt(new Date()); setDestinationError(null); }, []);
  const applyMailbox = useCallback((next: AdminMailboxEntries) => { setMailbox(next); setLoadedAt(new Date()); setDestinationError(null); }, []);
  const operation = useInventoryMailboxOperations({
    playerId: player.playerId,
    playerName: player.name,
    item: selectedItem,
    enabled: access === "ready" && mobile === false,
    readSource,
    commandSource,
    auditSource,
    onCanonicalInventory: applyInventory,
    onCanonicalMailbox: applyMailbox,
  });

  const loadDestination = useCallback(async (target: "INVENTORY" | "MAILBOX") => {
    const request = ++destinationRequest.current;
    setDestinationLoading(true);
    setDestinationError(null);
    setLoadedAt(null);
    try {
      const next = target === "INVENTORY" ? await readSource.getInventory(player.playerId) : await readSource.getMailbox(player.playerId);
      if (next.playerId !== player.playerId) throw new Error(`${target === "INVENTORY" ? "Inventory" : "Mailbox"} response did not match the requested Player ID.`);
      if (request !== destinationRequest.current) return;
      if (target === "INVENTORY") setInventory(next as AdminInventoryEntries);
      else setMailbox(next as AdminMailboxEntries);
      setLoadedAt(new Date());
    } catch (caught) {
      if (request === destinationRequest.current) {
        if (target === "INVENTORY") setInventory(null); else setMailbox(null);
        setDestinationError(loadError(caught, `Unable to load ${target}.`));
      }
    } finally {
      if (request === destinationRequest.current) setDestinationLoading(false);
    }
  }, [player.playerId, readSource]);

  useEffect(() => {
    if (access === "ready") void loadDestination(destination);
    return () => { destinationRequest.current += 1; };
  }, [access, destination, loadDestination]);

  const switchDestination = (next: "INVENTORY" | "MAILBOX") => {
    operation.newIntent();
    setDestination(next);
    setValidation(null);
  };

  const searchItems = async (page = 0) => {
    const request = ++searchRequest.current;
    setItemSearchLoading(true);
    setItemSearchError(null);
    if (page === 0) appliedFilters.current = filters;
    const query: AdminItemSearchQuery = { ...appliedFilters.current, page, size: 20 };
    try {
      const next = await readSource.searchItems(query);
      if (request === searchRequest.current) setItems(next);
    } catch (caught) {
      if (request === searchRequest.current) { setItems(null); setItemSearchError(loadError(caught, "Unable to search Items.").message); }
    } finally {
      if (request === searchRequest.current) setItemSearchLoading(false);
    }
  };

  const selectItem = async (itemId: number) => {
    const request = ++itemRequest.current;
    operation.newIntent();
    setSelectedItem(null);
    setItemDetailLoading(true);
    setItemSearchError(null);
    setValidation(null);
    try {
      const next = await readSource.getItem(itemId);
      if (next.id !== itemId) throw new Error("Item detail response did not match the requested Item ID.");
      if (request === itemRequest.current) setSelectedItem(next);
    } catch (caught) {
      if (request === itemRequest.current) setItemSearchError(loadError(caught, "Unable to load Item detail.").message);
    } finally {
      if (request === itemRequest.current) setItemDetailLoading(false);
    }
  };

  const current = destination === "INVENTORY" ? inventory : mailbox;
  const matchingEntries = current?.entries.filter((entry) => entry.itemId === selectedItem?.id) ?? [];
  const mutationAvailable = access === "ready" && mobile === false && commandSource.available && readSource.descriptor.mode === "api" && auditSource.descriptor.mode === "api" && !destinationLoading && !destinationError && !!current && !!loadedAt;
  const operationLocked = operation.phase !== "IDLE";

  const review = () => {
    setValidation(null);
    try {
      if (!current || !loadedAt) throw new Error(`Load the canonical ${destination === "INVENTORY" ? "Inventory" : "Mailbox"} before review.`);
      if (!selectedItem) throw new Error("Select and verify an Item before review.");
      operation.beginReview({ destination, itemId: selectedItem.id, quantity: Number(quantity), bound, reason });
    } catch (caught) {
      setValidation(caught instanceof Error ? caught.message : "Review the entitlement values.");
    }
  };

  const operationState = operation.phase === "SUCCEEDED" && operation.receipt ? (
    <section className={styles.questOverrideState} data-state="success" aria-labelledby="entitlement-complete">
      <p className={styles.eyebrow}>Operation completed</p><h3 id="entitlement-complete">Entitlement confirmed</h3>
      <p>{operation.receipt.evidence === "DIRECT" ? "The command succeeded and the exact destination was reloaded." : "Matching Admin Audit evidence proves this operation committed."}</p>
      {operation.receipt.destinationStale ? <p className={styles.entitlementStaleWarning} role="alert">The destination could not be refreshed. Treat the visible list as stale until Refresh succeeds.</p> : null}
      <dl className={styles.questOperationReceipt}><div><dt>Correlation ID</dt><dd><code>{operation.receipt.correlationId}</code></dd></div><div><dt>Idempotency key</dt><dd><code>{operation.receipt.idempotencyKey}</code></dd></div></dl>
      <div className={styles.questOverrideActions}>{onOpenAudit ? <button type="button" className={styles.secondaryButton} onClick={onOpenAudit}>Open Audit Explorer</button> : null}<button type="button" className={styles.primaryButton} onClick={() => { if (operation.receipt?.destinationStale) setLoadedAt(null); operation.newIntent(); }}>Start another operation</button></div>
    </section>
  ) : operation.phase === "UNKNOWN_RESULT" || operation.phase === "RECONCILING" ? (
    <section className={styles.questOverrideState} data-state="unknown" role="alert"><p className={styles.eyebrow}>Unknown result</p><h3>{operation.phase === "RECONCILING" ? "Reconciling destination and Audit" : "Do not retry yet"}</h3><p>{operation.phase === "RECONCILING" ? "Checking canonical destination state and exact operation evidence." : `${operation.error?.message ?? "The command result is unknown."} Reconcile before any retry.`}</p><button type="button" className={styles.primaryButton} onClick={() => void operation.reconcile()} disabled={operation.phase === "RECONCILING"}>Reconcile operation</button></section>
  ) : operation.phase === "RECONCILED_RETRYABLE" && operation.intent ? (
    <section className={styles.questOverrideState}><p className={styles.eyebrow}>Reconciled · unchanged intent</p><h3>No matching success evidence</h3><p>The destination was reloaded and no exact success Audit matched. A manual retry reuses the same operation identity.</p><code className={styles.detailId}>{operation.intent.idempotencyKey}</code><div className={styles.questOverrideActions}><button type="button" className={styles.secondaryButton} onClick={operation.newIntent}>Cancel operation</button><button type="button" className={styles.primaryButton} onClick={() => void operation.submit()}>Retry same operation</button></div></section>
  ) : (operation.phase === "CONFLICT_RECONCILING" || operation.phase === "CONFLICT_RECONCILED") && operation.intent ? (
    <section className={styles.questOverrideState} data-state="conflict" role="alert"><p className={styles.eyebrow}>409 conflict</p><h3>{operation.phase === "CONFLICT_RECONCILING" ? "Reconciling current state" : "Current state reconciled"}</h3><p>{operation.phase === "CONFLICT_RECONCILING" ? "The command is not being retried." : "No exact success Audit matched. Review the reloaded destination before manually retrying the unchanged intent."}</p>{operation.phase === "CONFLICT_RECONCILED" ? <div className={styles.questOverrideActions}><button type="button" className={styles.secondaryButton} onClick={operation.newIntent}>Cancel operation</button><button type="button" className={styles.primaryButton} onClick={operation.returnToReview}>Return to review</button></div> : null}</section>
  ) : operation.error?.status === 401 || operation.error?.status === 403 ? (
    <section className={styles.questOverrideState} role="alert"><h3>{operation.error.status === 401 ? "Authentication required" : "Admin access denied"}</h3><p>{operation.error.message}</p></section>
  ) : null;

  return (
    <div className={styles.inventoryWorkspace}>
      <div className={styles.inventoryMain}>
        <div className={styles.destinationTabs} role="tablist" aria-label="Entitlement destination">
          <button type="button" role="tab" aria-selected={destination === "INVENTORY"} data-active={destination === "INVENTORY" || undefined} onClick={() => switchDestination("INVENTORY")} disabled={operationLocked}>Inventory</button>
          <button type="button" role="tab" aria-selected={destination === "MAILBOX"} data-active={destination === "MAILBOX" || undefined} onClick={() => switchDestination("MAILBOX")} disabled={operationLocked}>Mailbox</button>
          <button type="button" className={styles.secondaryButton} onClick={() => void loadDestination(destination)} disabled={destinationLoading || operationLocked}>Refresh</button>
        </div>
        <div className={styles.feedMeta}><span>Exact Player ID: <code>{player.playerId}</code></span><span>{loadedAt ? `Refreshed ${loadedAt.toLocaleTimeString()}` : "Not loaded"}</span></div>
        {destinationLoading ? <section className={styles.statePanel} role="status"><h2>Loading {destination === "INVENTORY" ? "Inventory" : "Mailbox"}</h2><p>Requesting the exact Player destination state.</p></section> : destinationError ? <section className={styles.statePanel} role="alert"><h2>Unable to load {destination === "INVENTORY" ? "Inventory" : "Mailbox"}</h2><p>{destinationError.message}</p><button type="button" className={styles.primaryButton} onClick={() => void loadDestination(destination)}>Retry</button></section> : current ? (
          current.entries.length ? <div className={styles.tableWrap}><table className={`${styles.table} ${styles.entitlementTable}`}><caption>{destination === "INVENTORY" ? "Player Inventory" : "Player Mailbox"}</caption><thead><tr><th>Slot</th><th>Entry</th><th>Item</th><th>Definition</th><th>Quantity</th><th>Bound</th><th>Durability</th></tr></thead><tbody>{current.entries.map((entry) => <tr key={`${destination}:${"itemInstanceId" in entry ? entry.itemInstanceId : entry.mailId}`}><td>{entry.slotIndex}</td><td className={styles.mono}>{"itemInstanceId" in entry ? entry.itemInstanceId : entry.mailId}</td><td><span>{entry.itemName}</span><code>{entry.itemId}</code></td><td>{entry.category} / {entry.type} / {entry.rarity}</td><td>{entry.quantity}</td><td>{entry.bound ? "Yes" : "No"}</td><td>{entry.durability ?? "—"}</td></tr>)}</tbody></table></div> : <section className={styles.statePanel} role="status"><h2>{destination === "INVENTORY" ? "Inventory" : "Mailbox"} is empty</h2><p>No entries were returned for this Player.</p></section>
        ) : null}
      </div>

      <aside className={styles.entitlementCommandPanel} aria-labelledby="entitlement-command-title">
        <div className={styles.playerFullPanelHeader}><div><p className={styles.eyebrow}>Level 2 operation</p><h2 id="entitlement-command-title">{destination === "INVENTORY" ? "Add to Inventory" : "Deliver to Mailbox"}</h2></div><span className={styles.badge} data-state="SUPPORTED">△ L2</span></div>
        {mobile !== false ? <div className={styles.questOverrideUnavailable}><h3>{mobile ? "Mutation unavailable on mobile" : "Preparing responsive safety profile"}</h3><p>{mobile ? "Inventory and Mailbox remain readable. Use a desktop or tablet viewport for entitlement operations." : "Checking the current viewport before enabling commands."}</p></div> : !commandSource.available || readSource.descriptor.mode !== "api" || auditSource.descriptor.mode !== "api" ? <div className={styles.questOverrideUnavailable}><h3>Real API required</h3><p>Read fixtures remain available, but Mock mode never simulates entitlement success, Audit evidence, or operation identity.</p></div> : (
          <>
            <form className={styles.itemSearchForm} aria-label="Item definition search" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void searchItems(0); }}>
              <fieldset disabled={operationLocked || itemSearchLoading}><legend>Search Item definitions</legend><label>Name<input value={filters.name} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, name: event.target.value }))} /></label><label>Category<input value={filters.category} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, category: event.target.value }))} /></label><label>Type<input value={filters.type} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, type: event.target.value }))} /></label><label>Rarity<input value={filters.rarity} onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, rarity: event.target.value }))} /></label><button type="submit" className={styles.secondaryButton}>Search Items</button></fieldset>
            </form>
            {itemSearchError ? <p className={styles.questOverrideError} role="alert">{itemSearchError}</p> : null}
            {itemSearchLoading ? <p className={styles.refreshing} role="status">Searching Item definitions…</p> : null}
            {items ? <div className={styles.itemSearchResults}>{items.content.length ? <ul>{items.content.map((candidate) => <li key={candidate.id} data-selected={selectedItem?.id === candidate.id || undefined}><button type="button" onClick={() => void selectItem(candidate.id)} disabled={operationLocked || itemDetailLoading}><span>{candidate.name}</span><code>{candidate.id} · {candidate.code}</code><small>{candidate.category} / {candidate.type} / {candidate.rarity}</small></button></li>)}</ul> : <p>No Item definitions match these filters.</p>}<div className={styles.pagination}><span>Page {items.page + 1} of {Math.max(items.totalPages, 1)} · {items.totalElements} results</span><div><button type="button" className={styles.secondaryButton} disabled={items.page <= 0 || itemSearchLoading || operationLocked} onClick={() => void searchItems(items.page - 1)}>Previous</button><button type="button" className={styles.secondaryButton} disabled={items.page + 1 >= items.totalPages || itemSearchLoading || operationLocked} onClick={() => void searchItems(items.page + 1)}>Next</button></div></div></div> : null}
            {selectedItem ? <section className={styles.selectedItemCard} aria-label="Selected Item detail"><p className={styles.eyebrow}>Verified exact Item</p><h3>{selectedItem.name}</h3><code>{selectedItem.id} · {selectedItem.code}</code><p>{selectedItem.category} / {selectedItem.type} / {selectedItem.rarity}</p><p>{selectedItem.stackable ? `Stackable · maximum ${selectedItem.maxStack}` : "Not stackable"}{selectedItem.maxDurability !== null ? ` · durability ${selectedItem.maxDurability}` : ""}</p></section> : null}
            {operationState ?? <form className={styles.entitlementDraftForm} aria-label="Entitlement operation draft" onSubmit={(event) => { event.preventDefault(); review(); }}><label>Quantity<input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={operationLocked} /></label><label className={styles.entitlementBound}><input type="checkbox" checked={bound} onChange={(event) => setBound(event.target.checked)} disabled={operationLocked} /> Bound entitlement</label><label>Reason *<input type="text" maxLength={512} value={reason} onChange={(event) => setReason(event.target.value)} disabled={operationLocked} placeholder="Required operational reason" /></label>{validation ? <p className={styles.questOverrideError} role="alert">{validation}</p> : null}<button type="submit" className={styles.primaryButton} disabled={!mutationAvailable || !current || !selectedItem || operationLocked}>Review Level 2 operation</button></form>}
          </>
        )}
      </aside>
      {operation.intent && ["REVIEWING", "SUBMITTING", "SUCCEEDED_RELOADING"].includes(operation.phase) && loadedAt ? <L2Review key={operation.reviewVersion} intent={operation.intent} phase={operation.phase} error={operation.error} matchingEntries={matchingEntries} loadedAt={loadedAt} onCancel={operation.cancelReview} onSubmit={() => void operation.submit()} /> : null}
    </div>
  );
}
