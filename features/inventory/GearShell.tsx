"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { INVENTORY_GEAR_PARTS } from "@/entities/nav";
import type { InventoryGearPartId } from "@/entities/nav";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { candidatesForGearPart, getEquipCompatibility, slotsForGearPart } from "./model";
import { useEquipmentQueries } from "./useEquipmentQueries";

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

export default function GearShell({ onBack }: { onBack?: () => void }) {
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

  const selectPart = (next: InventoryGearPartId) => {
    setPart(next);
    setSelectedSlotId(null);
    setSelectedItemInstanceId(null);
  };

  const closeWorkspace = () => {
    setPart(null);
    setSelectedSlotId(null);
    setSelectedItemInstanceId(null);
    requestStageFocus("inventory-gear-parts", "back");
  };

  const closeAction = () => {
    setSelectedSlotId(null);
    setSelectedItemInstanceId(null);
    requestStageFocus("inventory-gear-workspace", "back");
  };

  return (
    <div className="lag-panel-rail lag-gear-shell relative" data-testid="gear-shell">
      <PanelStage stageKey="inventory-gear-parts">
        <PanelFrame title="Gear Parts" depth={2} backButton={onBack ? <BackButton label="Back to Inventory" onClick={onBack} /> : undefined}>
          <section className="lag-gear-parts" aria-label="Gear Parts">
            <header><p>Select the real equipment taxonomy before choosing a slot.</p></header>
            <div>
              {INVENTORY_GEAR_PARTS.map((item) => (
                <button key={item.id} type="button" className="lag-gear-part" aria-pressed={part === item.id} data-selected={part === item.id} onClick={() => selectPart(item.id as InventoryGearPartId)}>
                  <span aria-hidden>{item.slotLabel}</span>
                  <strong>{item.label}</strong>
                  <small>{item.id}</small>
                  <span aria-hidden>→</span>
                </button>
              ))}
            </div>
          </section>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {part ? (
          <PanelStage stageKey="inventory-gear-workspace" index={1}>
            <PanelFrame title={`${INVENTORY_GEAR_PARTS.find(({ id }) => id === part)?.label ?? part} Workspace`} depth={1} contentKey={part} backButton={<BackButton label="Back to Gear Parts" onClick={closeWorkspace} />}>
              <div className="lag-gear-workspace">
                <section className="lag-gear-section" aria-labelledby="gear-slots-title">
                  <h4 id="gear-slots-title">Equipment Slots</h4>
                  <div>
                    {queries.equipment.loading && queries.equipment.data.length === 0 ? <InfoCard>Loading Equipment...</InfoCard> : null}
                    {queries.equipment.error ? <ErrorState text={queries.equipment.error} retry={() => void queries.equipment.reload()} /> : null}
                    {!queries.equipment.loading && !queries.equipment.error && slots.length === 0 ? <InfoCard>No matching Equipment slots.</InfoCard> : null}
                    <div className="lag-gear-card-list">
                      {slots.map(({ slot, item, enrichmentMissing }) => (
                        <button key={slot.slotId} type="button" className="lag-gear-card" data-kind="slot" data-selected={selectedSlotId === slot.slotId} aria-pressed={selectedSlotId === slot.slotId} onClick={() => {
                          setSelectedSlotId(slot.slotId);
                          setSelectedItemInstanceId(null);
                        }}>
                          <span aria-hidden>{slot.slotRole.slice(0, 2)}</span>
                          <span>
                            <strong>{slot.slotName}</strong>
                            <small>{slot.slotCode} · {slot.slotCategory} · {slot.slotRole}</small>
                            <small>{slot.itemInstanceId === null
                              ? "Empty"
                              : enrichmentMissing
                                ? `Occupied · Item details unavailable · itemInstanceId ${slot.itemInstanceId}`
                                : `${item?.itemName} · ${item?.rarity}`}</small>
                          </span>
                          <span aria-hidden>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="lag-gear-section" aria-labelledby="gear-candidates-title">
                  <h4 id="gear-candidates-title">Inventory Candidates</h4>
                  <div>
                    {queries.inventory.loading && queries.inventory.data.entries.length === 0 ? <InfoCard>Loading Inventory candidates...</InfoCard> : null}
                    {queries.inventory.error ? <ErrorState text={queries.inventory.error} retry={() => void queries.inventory.reload()} /> : null}
                    {!queries.inventory.loading && !queries.inventory.error && candidates.length === 0 ? <InfoCard>No candidate Items.</InfoCard> : null}
                    <div className="lag-gear-card-list">
                      {candidates.map((item) => (
                        <button key={item.itemInstanceId} type="button" className="lag-gear-card" data-kind="candidate" data-selected={selectedItemInstanceId === item.itemInstanceId} aria-pressed={selectedItemInstanceId === item.itemInstanceId} onClick={() => setSelectedItemInstanceId(item.itemInstanceId)}>
                          <span aria-hidden>x{item.quantity}</span>
                          <span><strong>{item.itemName}</strong><small>{item.rarity} · {item.category} · {item.type}</small><small>itemInstanceId {item.itemInstanceId}</small></span>
                          <span aria-hidden>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {selectedSlot ? (
          <PanelStage stageKey="inventory-gear-action" index={2}>
            <PanelFrame title="Gear Action" depth={0} contentKey={`${selectedSlot.slot.slotId}-${selectedCandidate?.itemInstanceId ?? "none"}`} backButton={<BackButton label={`Back to ${INVENTORY_GEAR_PARTS.find(({ id }) => id === part)?.label ?? "Part"} Workspace`} onClick={closeAction} />}>
              <article className="lag-gear-action-detail">
                <header className="lag-inventory-hero">
                  <span>Selected Equipment Slot</span>
                  <h4>{selectedSlot.slot.slotName}</h4>
                  <div><span>{selectedSlot.slot.slotCategory}</span><span>{selectedSlot.slot.slotRole}</span></div>
                </header>
                <section className="lag-inventory-section">
                  <h4>Slot</h4>
                  <dl>
                    <DataRow label="Slot ID">{selectedSlot.slot.slotId}</DataRow>
                    <DataRow label="Slot code">{selectedSlot.slot.slotCode}</DataRow>
                    <DataRow label="Category">{selectedSlot.slot.slotCategory}</DataRow>
                    <DataRow label="Role">{selectedSlot.slot.slotRole}</DataRow>
                    <DataRow label="Equipped">{selectedSlot.slot.itemInstanceId === null
                      ? "Empty"
                      : selectedSlot.item
                        ? `${selectedSlot.item.itemName} · ${selectedSlot.item.rarity}`
                        : `Item details unavailable · itemInstanceId ${selectedSlot.slot.itemInstanceId}`}</DataRow>
                  </dl>
                </section>
                <section className="lag-inventory-section">
                  <h4>Candidate and compatibility</h4>
                  <dl>
                    <DataRow label="Candidate">{selectedCandidate ? `${selectedCandidate.itemName} · itemInstanceId ${selectedCandidate.itemInstanceId}` : "Select an Inventory candidate to equip."}</DataRow>
                    <DataRow label="Compatibility">{compatibility?.status ?? "Not evaluated"}</DataRow>
                  </dl>
                </section>
                {compatibility && compatibility.status !== "VERIFIED" ? <p role="alert" className="lag-inventory-feedback" data-state="error">{compatibility.status}: {compatibility.reason}</p> : null}
                {queries.mutationError ? <p role="alert" className="lag-inventory-feedback" data-state="error">{queries.mutationError}</p> : null}
                <div className="lag-inventory-actions">
                  <button
                    type="button"
                    disabled={pending || compatibility?.status !== "VERIFIED" || selectedSlot.slot.itemInstanceId === selectedCandidate?.itemInstanceId}
                    className="lag-inventory-action"
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
                      className="lag-inventory-button"
                      data-variant="destructive"
                      onClick={() => {
                        const item = selectedSlot.item?.itemName ?? `itemInstanceId ${selectedSlot.slot.itemInstanceId}`;
                        if (window.confirm(`Unequip ${item} from ${selectedSlot.slot.slotName}?`)) void queries.unequip(selectedSlot.slot.slotId);
                      }}
                    >Unequip</button>
                  ) : null}
                </div>
              </article>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
