"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { INVENTORY_GEAR_PARTS } from "@/entities/nav";
import type { InventoryGearPartId } from "@/entities/nav";
import { SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { actionBtnStyle } from "@/widgets/right-panels/ui/styles";
import { candidatesForGearPart, getEquipCompatibility, slotsForGearPart } from "./model";
import { useEquipmentQueries } from "./useEquipmentQueries";

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

export default function GearShell() {
  const queries = useEquipmentQueries();
  const [part, setPart] = useState<InventoryGearPartId | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<number | null>(null);
  const slots = useMemo(() => part ? slotsForGearPart(queries.slots, part) : [], [part, queries.slots]);
  const candidates = useMemo(
    () => part ? candidatesForGearPart(queries.inventory.data.entries, part) : [],
    [part, queries.inventory.data.entries],
  );
  const selectedSlot = slots.find(({ slot }) => slot.slotId === selectedSlotId) ?? null;
  const selectedCandidate = candidates.find(({ itemInstanceId }) => itemInstanceId === selectedItemInstanceId) ?? null;
  const compatibility = selectedSlot && selectedCandidate
    ? getEquipCompatibility(selectedSlot.slot, selectedCandidate)
    : null;
  const pending = queries.pendingKey !== null;

  useEffect(() => {
    if (selectedSlotId !== null && !slots.some(({ slot }) => slot.slotId === selectedSlotId)) setSelectedSlotId(null);
  }, [selectedSlotId, slots]);

  useEffect(() => {
    if (selectedItemInstanceId !== null && !candidates.some(({ itemInstanceId }) => itemInstanceId === selectedItemInstanceId)) setSelectedItemInstanceId(null);
  }, [candidates, selectedItemInstanceId]);

  return (
    <div className="lag-panel-rail relative" data-testid="gear-shell">
      <PanelStage stageKey="inventory-gear-parts">
        <PanelFrame title="Gear Parts" depth={3}>
        <div className="space-y-2">
          {INVENTORY_GEAR_PARTS.map((item, index) => (
            <PanelCard
              key={item.id}
              label={item.label}
              slotLabel={item.slotLabel}
              selected={part === item.id}
              index={index}
              onClick={() => {
                setPart(item.id as InventoryGearPartId);
                setSelectedSlotId(null);
                setSelectedItemInstanceId(null);
              }}
            />
          ))}
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {part ? (
          <PanelStage stageKey="inventory-gear-slots" focusKey={part} index={1}>
            <PanelFrame title="Equipment Slots" depth={2} contentKey={part}>
          <div className="space-y-3">
            {queries.equipment.loading && queries.equipment.data.length === 0 ? <InfoCard>Loading Equipment...</InfoCard> : null}
            {queries.equipment.error ? <ErrorState text={queries.equipment.error} retry={() => void queries.equipment.reload()} /> : null}
            {!queries.equipment.loading && !queries.equipment.error && slots.length === 0 ? <InfoCard>No matching Equipment slots.</InfoCard> : null}
            <div className="space-y-2">
              {slots.map(({ slot, item, enrichmentMissing }, index) => (
                <PanelCard
                  key={slot.slotId}
                  label={slot.slotName}
                  slotLabel={slot.slotRole.slice(0, 2)}
                  subtitle={slot.itemInstanceId === null
                    ? `${slot.slotCode} · Empty`
                    : enrichmentMissing
                      ? `${slot.slotCode} · Occupied · Item details unavailable · itemInstanceId ${slot.itemInstanceId}`
                      : `${slot.slotCode} · ${item?.itemName} · ${item?.rarity}`}
                  selected={selectedSlotId === slot.slotId}
                  index={index}
                  onClick={() => {
                    setSelectedSlotId(slot.slotId);
                    setSelectedItemInstanceId(null);
                  }}
                />
              ))}
            </div>
          </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {part ? (
          <PanelStage stageKey="inventory-gear-candidates" focusKey={part} index={2}>
            <PanelFrame title="Inventory Candidates" depth={1} contentKey={part}>
          <div className="space-y-3">
            {queries.inventory.loading && queries.inventory.data.entries.length === 0 ? <InfoCard>Loading Inventory candidates...</InfoCard> : null}
            {queries.inventory.error ? <ErrorState text={queries.inventory.error} retry={() => void queries.inventory.reload()} /> : null}
            {!queries.inventory.loading && !queries.inventory.error && candidates.length === 0 ? <InfoCard>No candidate Items.</InfoCard> : null}
            <div className="space-y-2">
              {candidates.map((item, index) => (
                <PanelCard
                  key={item.itemInstanceId}
                  label={item.itemName}
                  slotLabel={`x${item.quantity}`}
                  subtitle={`${item.rarity} · ${item.category} · ${item.type}`}
                  selected={selectedItemInstanceId === item.itemInstanceId}
                  index={index}
                  onClick={() => setSelectedItemInstanceId(item.itemInstanceId)}
                />
              ))}
            </div>
          </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {selectedSlot ? (
          <PanelStage stageKey="inventory-gear-action" focusKey={`${selectedSlot.slot.slotId}-${selectedCandidate?.itemInstanceId ?? "none"}`} index={3}>
            <PanelFrame title="Gear Action" depth={0} contentKey={`${selectedSlot.slot.slotId}-${selectedCandidate?.itemInstanceId ?? "none"}`}>
          <div className="space-y-2 px-3">
            <InfoCard>{selectedSlot.slot.slotName}</InfoCard>
            <GoldRow>Slot ID: {selectedSlot.slot.slotId}</GoldRow>
            <GoldRow>Slot code: {selectedSlot.slot.slotCode}</GoldRow>
            <GoldRow>Category: {selectedSlot.slot.slotCategory}</GoldRow>
            <GoldRow>Role: {selectedSlot.slot.slotRole}</GoldRow>
            {selectedSlot.slot.itemInstanceId === null ? <GoldRow>Equipped: Empty</GoldRow> : null}
            {selectedSlot.item ? <GoldRow>Equipped: {selectedSlot.item.itemName} · {selectedSlot.item.rarity}</GoldRow> : null}
            {selectedSlot.enrichmentMissing ? <GoldRow>Equipped: Item details unavailable · itemInstanceId {selectedSlot.slot.itemInstanceId}</GoldRow> : null}
            {selectedCandidate ? <GoldRow>Candidate: {selectedCandidate.itemName} · itemInstanceId {selectedCandidate.itemInstanceId}</GoldRow> : <InfoCard>Select an Inventory candidate to equip.</InfoCard>}
            {compatibility && compatibility.status !== "VERIFIED" ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{compatibility.reason}</p> : null}
            {queries.mutationError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{queries.mutationError}</p> : null}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={pending || compatibility?.status !== "VERIFIED" || selectedSlot.slot.itemInstanceId === selectedCandidate?.itemInstanceId}
                style={{ ...actionBtnStyle, flex: 1 }}
                onClick={() => {
                  if (!selectedCandidate || compatibility?.status !== "VERIFIED") return;
                  const current = selectedSlot.item?.itemName
                    ?? (selectedSlot.slot.itemInstanceId === null ? null : `itemInstanceId ${selectedSlot.slot.itemInstanceId}`);
                  const prompt = current
                    ? `Replace ${current} in ${selectedSlot.slot.slotName} with ${selectedCandidate.itemName}?`
                    : `Equip ${selectedCandidate.itemName} to ${selectedSlot.slot.slotName}?`;
                  if (window.confirm(prompt)) void queries.equip(selectedSlot.slot.slotId, selectedCandidate.itemInstanceId);
                }}
              >{pending ? "Working..." : "Equip"}</button>
              {selectedSlot.slot.itemInstanceId !== null ? (
                <button
                  type="button"
                  disabled={pending}
                  style={secondaryButton}
                  onClick={() => {
                    const item = selectedSlot.item?.itemName ?? `itemInstanceId ${selectedSlot.slot.itemInstanceId}`;
                    if (window.confirm(`Unequip ${item} from ${selectedSlot.slot.slotName}?`)) void queries.unequip(selectedSlot.slot.slotId);
                  }}
                >Unequip</button>
              ) : null}
            </div>
          </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
