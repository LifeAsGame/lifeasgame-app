"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { InventoryEntry, MailEntry } from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useInventoryQueries } from "./useInventoryQueries";

export type InventorySurface = "items" | "inbox";

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="lag-inventory-state">
      <p role="alert" className="lag-inventory-feedback" data-state="error">{text}</p>
      <button type="button" className="lag-inventory-button" onClick={retry}>Retry</button>
    </div>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lag-inventory-data-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="lag-inventory-section"><h4>{title}</h4><dl>{children}</dl></section>;
}

function attributeValue(value: unknown): string {
  if (value === null) return "None";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  try {
    const readable = JSON.stringify(value);
    return readable ?? "Unsupported value";
  } catch {
    return "Unsupported nested value";
  }
}

function Attributes({ attrs }: { attrs: Record<string, unknown> }) {
  const entries = Object.entries(attrs);
  return (
    <DetailSection title="Instance attributes">
      {entries.length > 0
        ? entries.map(([key, value]) => <DataRow key={key} label={key}>{attributeValue(value)}</DataRow>)
        : <DataRow label="Attributes">None</DataRow>}
    </DetailSection>
  );
}

function InventoryTile({ entry, selected, kind, onSelect }: { entry: InventoryEntry | MailEntry; selected: boolean; kind: "item" | "mail"; onSelect: () => void }) {
  return (
    <button type="button" className="lag-inventory-tile" data-testid="inventory-entry" data-selected={selected} aria-pressed={selected} onClick={onSelect}>
      <span className="lag-inventory-tile-mark" aria-hidden>x{entry.quantity}</span>
      <span className="lag-inventory-tile-copy">
        <strong>{entry.itemName}</strong>
        <span>{entry.rarity} · {entry.category}</span>
        <small>{entry.type}{kind === "item" && entry.bound ? " · Bound" : ""}</small>
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}

function ItemDetail({ item }: { item: InventoryEntry }) {
  return (
    <article className="lag-inventory-detail">
      <header className="lag-inventory-hero">
        <span>Inventory Entry</span>
        <h4>{item.itemName}</h4>
        <div><span>{item.rarity}</span><span>{item.category}</span><span>{item.type}</span></div>
      </header>
      <DetailSection title="Identity">
        <DataRow label="Item instance ID">{item.itemInstanceId}</DataRow>
        <DataRow label="Item ID">{item.itemId}</DataRow>
        <DataRow label="Item name">{item.itemName}</DataRow>
      </DetailSection>
      <DetailSection title="Inventory">
        <DataRow label="Slot index">{item.slotIndex}</DataRow>
        <DataRow label="Quantity">{item.quantity}</DataRow>
        <DataRow label="Stackable">{String(item.stackable)}</DataRow>
        <DataRow label="Max stack">{item.maxStack}</DataRow>
        <DataRow label="Bound">{String(item.bound)}</DataRow>
      </DetailSection>
      <DetailSection title="Classification">
        <DataRow label="Category">{item.category}</DataRow>
        <DataRow label="Type">{item.type}</DataRow>
        <DataRow label="Rarity">{item.rarity}</DataRow>
      </DetailSection>
      <DetailSection title="Condition">
        <DataRow label="Durability">{item.durability ?? "Not recorded"}</DataRow>
      </DetailSection>
      <Attributes attrs={item.instanceAttrs} />
    </article>
  );
}

function MailDetail({ mail, pending, onClaim, onDelete }: { mail: MailEntry; pending: boolean; onClaim: () => void; onDelete: () => void }) {
  return (
    <article className="lag-inventory-detail">
      <header className="lag-inventory-hero">
        <span>Inbox Entry · Not yet owned</span>
        <h4>{mail.itemName}</h4>
        <div><span>{mail.rarity}</span><span>{mail.category}</span><span>{mail.type}</span></div>
      </header>
      <DetailSection title="Mail identity">
        <DataRow label="Mail ID">{mail.mailId}</DataRow>
        <DataRow label="Slot index">{mail.slotIndex}</DataRow>
        <DataRow label="Item ID">{mail.itemId}</DataRow>
      </DetailSection>
      <DetailSection title="Item data">
        <DataRow label="Category">{mail.category}</DataRow>
        <DataRow label="Type">{mail.type}</DataRow>
        <DataRow label="Rarity">{mail.rarity}</DataRow>
        <DataRow label="Quantity">{mail.quantity}</DataRow>
        <DataRow label="Stackable">{String(mail.stackable)}</DataRow>
        <DataRow label="Max stack">{mail.maxStack}</DataRow>
        <DataRow label="Bound">{String(mail.bound)}</DataRow>
        <DataRow label="Durability">{mail.durability ?? "Not recorded"}</DataRow>
      </DetailSection>
      <Attributes attrs={mail.instanceAttrs} />
      <div className="lag-inventory-actions">
        <button type="button" disabled={pending} className="lag-inventory-action" onClick={onClaim}>{pending ? "Working..." : "Claim"}</button>
        <button type="button" disabled={pending} className="lag-inventory-button" data-variant="destructive" onClick={onDelete}>Delete</button>
      </div>
    </article>
  );
}

export default function InventoryShell({ surface, onBack }: { surface: InventorySurface; onBack?: () => void }) {
  const queries = useInventoryQueries();
  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<number | null>(null);
  const [selectedMailId, setSelectedMailId] = useState<number | null>(null);
  const [category, setCategory] = useState("ALL");
  const items = surface === "items";
  const categories = useMemo(
    () => Array.from(new Set(queries.inventory.data.entries.map((entry) => entry.category))).sort(),
    [queries.inventory.data.entries],
  );
  const visibleItems = category === "ALL"
    ? queries.inventory.data.entries
    : queries.inventory.data.entries.filter((entry) => entry.category === category);
  const selectedItem = items ? queries.inventory.data.entries.find(({ itemInstanceId }) => itemInstanceId === selectedItemInstanceId) ?? null : null;
  const selectedMail = items ? null : queries.mailbox.data.entries.find(({ mailId }) => mailId === selectedMailId) ?? null;
  const query = items ? queries.inventory : queries.mailbox;

  useEffect(() => {
    setSelectedItemInstanceId(null);
    setSelectedMailId(null);
  }, [surface]);

  useEffect(() => {
    if (category !== "ALL" && !categories.includes(category)) {
      setCategory("ALL");
      setSelectedItemInstanceId(null);
    } else if (category !== "ALL" && selectedItemInstanceId !== null && !queries.inventory.data.entries.some((entry) => entry.itemInstanceId === selectedItemInstanceId && entry.category === category)) {
      setSelectedItemInstanceId(null);
    }
  }, [categories, category, queries.inventory.data.entries, selectedItemInstanceId]);

  const selectCategory = (next: string) => {
    setCategory(next);
    if (selectedItem && next !== "ALL" && selectedItem.category !== next) setSelectedItemInstanceId(null);
  };

  const closeDetail = () => {
    setSelectedItemInstanceId(null);
    setSelectedMailId(null);
    requestStageFocus(`inventory-${surface}-list`, "center");
  };

  return (
    <div className="lag-panel-rail lag-inventory-shell relative" data-testid="inventory-shell">
      <PanelStage stageKey={`inventory-${surface}-list`}>
        <PanelFrame title={items ? "Items" : "Inbox"} depth={1} backButton={onBack ? <BackButton label="Back to Inventory" onClick={onBack} /> : undefined}>
          <section className="lag-inventory-surface" aria-label={items ? "Inventory Items" : "Inbox Mail"}>
            <header><p>{items ? "Owned InventoryEntry data" : "Mailbox entries pending Claim or Delete"}</p></header>
            {items && categories.length > 0 ? (
              <div className="lag-inventory-filters" aria-label="Item category filters">
                {["ALL", ...categories].map((filter) => (
                  <button key={filter} type="button" className="lag-inventory-filter" aria-pressed={category === filter} data-selected={category === filter} onClick={() => selectCategory(filter)}>{filter}</button>
                ))}
              </div>
            ) : null}
            {query.loading && query.data.entries.length === 0 ? <InfoCard>Loading {items ? "Items" : "Inbox"}...</InfoCard> : null}
            {query.error ? <ErrorState text={query.error} retry={() => void query.reload()} /> : null}
            {!query.loading && !query.error && query.data.entries.length === 0 ? <InfoCard>No {items ? "Items" : "mail"}.</InfoCard> : null}
            {items && !query.loading && !query.error && query.data.entries.length > 0 && visibleItems.length === 0 ? <InfoCard>No Items in this category.</InfoCard> : null}
            {queries.mutationError ? <p role="alert" className="lag-inventory-feedback" data-state="error">{queries.mutationError}</p> : null}
            <div className="lag-inventory-grid">
              {items
                ? visibleItems.map((item) => <InventoryTile key={item.itemInstanceId} entry={item} kind="item" selected={selectedItemInstanceId === item.itemInstanceId} onSelect={() => setSelectedItemInstanceId(item.itemInstanceId)} />)
                : queries.mailbox.data.entries.map((mail) => <InventoryTile key={mail.mailId} entry={mail} kind="mail" selected={selectedMailId === mail.mailId} onSelect={() => setSelectedMailId(mail.mailId)} />)}
            </div>
          </section>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {selectedItem || selectedMail ? (
          <PanelStage stageKey={`inventory-${surface}-detail`} focusKey={selectedItemInstanceId ?? selectedMailId} index={1}>
            <PanelFrame title={items ? "Item Detail" : "Mail Detail"} depth={0} contentKey={selectedItemInstanceId ?? selectedMailId ?? undefined} backButton={<BackButton label={`Back to ${items ? "Items" : "Inbox"}`} onClick={closeDetail} />}>
              {items && selectedItem ? <ItemDetail item={selectedItem} /> : null}
              {!items && selectedMail ? (
                <MailDetail
                  mail={selectedMail}
                  pending={queries.pendingKey !== null}
                  onClaim={() => {
                    if (window.confirm(`Claim ${selectedMail.itemName} x${selectedMail.quantity}?`)) void queries.claimMail(selectedMail);
                  }}
                  onDelete={() => {
                    if (window.confirm(`Delete ${selectedMail.itemName} mail?`)) void queries.deleteMail(selectedMail);
                  }}
                />
              ) : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
