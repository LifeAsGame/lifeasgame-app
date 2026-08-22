"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { InventoryEntry, MailEntry } from "@/shared/api/types";
import { SAO } from "@/shared/design/tokens";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { actionBtnStyle } from "@/widgets/right-panels/ui/styles";
import { useInventoryQueries } from "./useInventoryQueries";

export type InventorySurface = "items" | "inbox";

const secondaryButton = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{text}</p>
      <button type="button" style={secondaryButton} onClick={retry}>Retry</button>
    </div>
  );
}

function Attrs({ attrs }: { attrs: Record<string, unknown> }) {
  return <GoldRow>Instance attrs: {Object.keys(attrs).length > 0 ? JSON.stringify(attrs) : "None"}</GoldRow>;
}

function ItemDetail({ item }: { item: InventoryEntry }) {
  return (
    <div className="space-y-1.5 px-3">
      <InfoCard>{item.itemName}</InfoCard>
      <GoldRow>Item instance ID: {item.itemInstanceId}</GoldRow>
      <GoldRow>Slot index: {item.slotIndex}</GoldRow>
      <GoldRow>Item ID: {item.itemId}</GoldRow>
      <GoldRow>Category: {item.category}</GoldRow>
      <GoldRow>Type: {item.type}</GoldRow>
      <GoldRow>Rarity: {item.rarity}</GoldRow>
      <GoldRow>Quantity: {item.quantity}</GoldRow>
      <GoldRow>Stackable: {String(item.stackable)}</GoldRow>
      <GoldRow>Max stack: {item.maxStack}</GoldRow>
      <GoldRow>Bound: {String(item.bound)}</GoldRow>
      <GoldRow>Durability: {item.durability ?? "Not recorded"}</GoldRow>
      <Attrs attrs={item.instanceAttrs} />
    </div>
  );
}

function MailDetail({ mail, pending, onClaim, onDelete }: { mail: MailEntry; pending: boolean; onClaim: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-1.5 px-3">
      <InfoCard>{mail.itemName}</InfoCard>
      <GoldRow>Mail ID: {mail.mailId}</GoldRow>
      <GoldRow>Slot index: {mail.slotIndex}</GoldRow>
      <GoldRow>Item ID: {mail.itemId}</GoldRow>
      <GoldRow>Category: {mail.category}</GoldRow>
      <GoldRow>Type: {mail.type}</GoldRow>
      <GoldRow>Rarity: {mail.rarity}</GoldRow>
      <GoldRow>Quantity: {mail.quantity}</GoldRow>
      <GoldRow>Stackable: {String(mail.stackable)}</GoldRow>
      <GoldRow>Max stack: {mail.maxStack}</GoldRow>
      <GoldRow>Bound: {String(mail.bound)}</GoldRow>
      <GoldRow>Durability: {mail.durability ?? "Not recorded"}</GoldRow>
      <Attrs attrs={mail.instanceAttrs} />
      <div className="flex gap-2 pt-2">
        <button type="button" disabled={pending} style={{ ...actionBtnStyle, flex: 1 }} onClick={onClaim}>{pending ? "Working..." : "Claim"}</button>
        <button type="button" disabled={pending} style={secondaryButton} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

export default function InventoryShell({ surface, onBack }: { surface: InventorySurface; onBack?: () => void }) {
  const queries = useInventoryQueries();
  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<number | null>(null);
  const [selectedMailId, setSelectedMailId] = useState<number | null>(null);
  const items = surface === "items";
  const selectedItem = items ? queries.inventory.data.entries.find(({ itemInstanceId }) => itemInstanceId === selectedItemInstanceId) ?? null : null;
  const selectedMail = items ? null : queries.mailbox.data.entries.find(({ mailId }) => mailId === selectedMailId) ?? null;
  const query = items ? queries.inventory : queries.mailbox;

  useEffect(() => {
    setSelectedItemInstanceId(null);
    setSelectedMailId(null);
  }, [surface]);

  return (
    <div className="lag-panel-rail relative" data-testid="inventory-shell">
      <PanelStage stageKey={`inventory-${surface}-list`}>
        <PanelFrame title={items ? "Items" : "Inbox"} depth={1} backButton={onBack ? <BackButton label="Back to Inventory" onClick={onBack} /> : undefined}>
        <div className="space-y-3">
          {query.loading && query.data.entries.length === 0 ? <InfoCard>Loading {items ? "Items" : "Inbox"}...</InfoCard> : null}
          {query.error ? <ErrorState text={query.error} retry={() => void query.reload()} /> : null}
          {!query.loading && !query.error && query.data.entries.length === 0 ? <InfoCard>No {items ? "Items" : "mail"}.</InfoCard> : null}
          {queries.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{queries.mutationError}</p> : null}
          <div className="space-y-2">
            {items
              ? queries.inventory.data.entries.map((item, index) => (
                <PanelCard
                  key={item.itemInstanceId}
                  label={item.itemName}
                  slotLabel={`x${item.quantity}`}
                  subtitle={`${item.rarity} · ${item.category} · ${item.type} · Slot ${item.slotIndex}`}
                  selected={selectedItemInstanceId === item.itemInstanceId}
                  index={index}
                  onClick={() => setSelectedItemInstanceId(item.itemInstanceId)}
                />
              ))
              : queries.mailbox.data.entries.map((mail, index) => (
                <PanelCard
                  key={mail.mailId}
                  label={mail.itemName}
                  slotLabel={`x${mail.quantity}`}
                  subtitle={`${mail.rarity} · ${mail.category} · ${mail.type} · Slot ${mail.slotIndex}`}
                  selected={selectedMailId === mail.mailId}
                  index={index}
                  onClick={() => setSelectedMailId(mail.mailId)}
                />
              ))}
          </div>
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {selectedItem || selectedMail ? (
          <PanelStage stageKey={`inventory-${surface}-detail`} focusKey={selectedItemInstanceId ?? selectedMailId} index={1}>
            <PanelFrame title={items ? "Item Detail" : "Mail Detail"} depth={0} contentKey={selectedItemInstanceId ?? selectedMailId ?? undefined} backButton={<BackButton label={`Back to ${items ? "Items" : "Inbox"}`} onClick={() => {
              setSelectedItemInstanceId(null);
              setSelectedMailId(null);
              requestStageFocus(`inventory-${surface}-list`, "center");
            }} />}>
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
