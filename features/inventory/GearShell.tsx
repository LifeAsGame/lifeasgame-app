"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { INVENTORY_GEAR_PARTS } from "@/entities/nav";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import type { InventoryGearPartId } from "@/entities/nav";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { candidatesForGearPart, getEquipCompatibility, slotsForGearPart } from "./model";
import { CURRENT_CONSUMER_GEAR_CAPABILITY } from "./policy";
import { useEquipmentQueries } from "./useEquipmentQueries";

const READ_ONLY_MESSAGE = "장비 콘텐츠 준비 중 · 슬롯 조회만 가능합니다.";

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="lag-inventory-state">
      <p role="alert" className="lag-inventory-feedback" data-state="error">{text}</p>
      <button type="button" className="lag-inventory-button" onClick={retry}>다시 조회</button>
    </div>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lag-inventory-data-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

export default function GearShell({ onBack }: { onBack?: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const queries = useEquipmentQueries();
  const partButton = useRef<HTMLButtonElement | null>(null);
  const slotButton = useRef<HTMLButtonElement | null>(null);
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
    requestAnimationFrame(() => partButton.current?.focus());
  };

  const closeAction = () => {
    setSelectedSlotId(null);
    setSelectedItemInstanceId(null);
    requestStageFocus("inventory-gear-workspace", "back");
    requestAnimationFrame(() => slotButton.current?.focus());
  };

  return (
    <div className="lag-panel-rail lag-gear-shell relative" data-testid="gear-shell">{dialog}
      <PanelStage stageKey="inventory-gear-parts">
        <PanelFrame title="장비 분류" depth={2} backButton={onBack ? <BackButton label="인벤토리로" onClick={onBack} /> : undefined}>
          <section className="lag-gear-parts" aria-label="장비 분류">
            <header><p>장비 종류를 선택해 슬롯을 확인하세요.</p></header>
            <div>
              {INVENTORY_GEAR_PARTS.map((item) => (
                <button key={item.id} type="button" className="lag-gear-part" aria-pressed={part === item.id} data-selected={part === item.id} onClick={(event) => { partButton.current = event.currentTarget; selectPart(item.id as InventoryGearPartId); }}>
                  <span aria-hidden>{item.slotLabel}</span>
                  <strong>{item.label}</strong>
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
            <PanelFrame title={`${INVENTORY_GEAR_PARTS.find(({ id }) => id === part)?.label ?? part} 장비`} depth={1} contentKey={part} backButton={<BackButton label="장비 분류로" onClick={closeWorkspace} />}>
              <div className="lag-gear-workspace">
                <section className="lag-gear-section" aria-labelledby="gear-slots-title">
                  <h4 id="gear-slots-title">장비 슬롯</h4>
                  <div>
                    {!queries.equipment.loading && !queries.equipment.error ? <button type="button" className="lag-inventory-button" onClick={() => void queries.equipment.reload()}>장비 다시 조회</button> : null}
                    {queries.equipment.loading && queries.equipment.data.length === 0 ? <InfoCard>장비를 불러오는 중…</InfoCard> : null}
                    {queries.equipment.error ? <ErrorState text={queries.equipment.error} retry={() => void queries.equipment.reload()} /> : null}
                    {queries.equipment.error && queries.equipment.data.length > 0 ? <p role="status" className="lag-inventory-feedback">이전에 조회한 슬롯입니다. 현재 서버 상태는 확인되지 않았습니다.</p> : null}
                    {!queries.equipment.loading && !queries.equipment.error && slots.length === 0 ? <InfoCard>해당 장비 슬롯이 없습니다.</InfoCard> : null}
                    <div className="lag-gear-card-list">
                      {slots.map(({ slot, item, enrichmentMissing }) => (
                        <button key={slot.slotId} type="button" className="lag-gear-card" data-kind="slot" data-selected={selectedSlotId === slot.slotId} aria-pressed={selectedSlotId === slot.slotId} onClick={(event) => {
                          slotButton.current = event.currentTarget;
                          setSelectedSlotId(slot.slotId);
                          setSelectedItemInstanceId(null);
                        }}>
                          <span aria-hidden>{slot.slotName.slice(0, 1)}</span>
                          <span>
                            <strong>{slot.slotName}</strong>
                            <small>{[slot.slotCategory, slot.slotRole].filter(Boolean).map((value) => consumerLabel(value)).join(" · ")}</small>
                            <small>{slot.itemInstanceId === null
                              ? "비어 있음"
                              : enrichmentMissing
                                ? `장착됨 · 아이템 정보 없음 (#${slot.itemInstanceId})`
                                : `${item?.itemName?.trim() || `아이템 #${item?.itemId}`} · ${consumerLabel(item?.rarity)}`}</small>
                          </span>
                          <span aria-hidden>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="lag-gear-section" aria-labelledby="gear-candidates-title">
                  <h4 id="gear-candidates-title">장착 가능한 아이템</h4>
                  <div>
                    {!CURRENT_CONSUMER_GEAR_CAPABILITY.equipmentItemsAvailable ? <InfoCard>{READ_ONLY_MESSAGE}</InfoCard> : (
                      <>
                        {queries.inventory.loading && queries.inventory.data.entries.length === 0 ? <InfoCard>아이템을 불러오는 중…</InfoCard> : null}
                        {queries.inventory.error ? <ErrorState text={queries.inventory.error} retry={() => void queries.inventory.reload()} /> : null}
                        {!queries.inventory.loading && !queries.inventory.error && candidates.length === 0 ? <InfoCard>장착 가능한 아이템이 없습니다.</InfoCard> : null}
                        <div className="lag-gear-card-list">
                          {candidates.map((item) => (
                            <button key={item.itemInstanceId} type="button" className="lag-gear-card" data-kind="candidate" data-selected={selectedItemInstanceId === item.itemInstanceId} aria-pressed={selectedItemInstanceId === item.itemInstanceId} onClick={() => setSelectedItemInstanceId(item.itemInstanceId)}>
                              <span aria-hidden>x{item.quantity}</span>
                              <span><strong>{item.itemName.trim() || `아이템 #${item.itemId}`}</strong><small>{consumerLabel(item.rarity)} · {consumerLabel(item.category)} · {consumerLabel(item.type)}</small><small>보유 번호 {item.itemInstanceId}</small></span>
                              <span aria-hidden>→</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
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
            <PanelFrame title="장비 상세" depth={0} contentKey={`${selectedSlot.slot.slotId}-${selectedCandidate?.itemInstanceId ?? "none"}`} backButton={<BackButton label="장비 슬롯으로" onClick={closeAction} />}>
              <article className="lag-gear-action-detail">
                <header className="lag-inventory-hero">
                  <span>선택한 장비 슬롯</span>
                  <h4>{selectedSlot.slot.slotName}</h4>
                  <div>{selectedSlot.slot.slotRole ? <span>{consumerLabel(selectedSlot.slot.slotRole)}</span> : null}</div>
                </header>
                <section className="lag-inventory-section">
                  <h4>슬롯</h4>
                  <dl>
                    <DataRow label="슬롯 번호">{selectedSlot.slot.slotId}</DataRow>
                    {selectedSlot.slot.slotCategory ? <DataRow label="분류">{consumerLabel(selectedSlot.slot.slotCategory)}</DataRow> : null}
                    {selectedSlot.slot.slotRole ? <DataRow label="역할">{consumerLabel(selectedSlot.slot.slotRole)}</DataRow> : null}
                    <DataRow label="장착 상태">{selectedSlot.slot.itemInstanceId === null
                      ? "비어 있음"
                      : selectedSlot.item
                        ? `${selectedSlot.item.itemName.trim() || `아이템 #${selectedSlot.item.itemId}`} · ${consumerLabel(selectedSlot.item.rarity)}`
                        : `아이템 정보 없음 (#${selectedSlot.slot.itemInstanceId})`}</DataRow>
                  </dl>
                </section>
                <section className="lag-inventory-section">
                  <h4>장착 가능 여부</h4>
                  <dl>
                    <DataRow label="선택 아이템">{CURRENT_CONSUMER_GEAR_CAPABILITY.equipmentItemsAvailable
                      ? selectedCandidate ? selectedCandidate.itemName : "장착할 아이템을 선택하세요."
                      : "장비 콘텐츠 준비 중"}</DataRow>
                    <DataRow label="호환성">{CURRENT_CONSUMER_GEAR_CAPABILITY.equipmentItemsAvailable ? compatibility?.status ?? "확인 전" : "확인할 수 없음"}</DataRow>
                  </dl>
                </section>
                {CURRENT_CONSUMER_GEAR_CAPABILITY.actionsAvailable ? (
                  <>
                    {compatibility && compatibility.status !== "VERIFIED" ? <p role="alert" className="lag-inventory-feedback" data-state="error">{compatibility.status}: {compatibility.reason}</p> : null}
                    {queries.mutationError ? <p role="alert" className="lag-inventory-feedback" data-state="error">{queries.mutationError}</p> : null}
                    <div className="lag-inventory-actions">
                      <button
                        type="button"
                        disabled={pending || compatibility?.status !== "VERIFIED" || selectedSlot.slot.itemInstanceId === selectedCandidate?.itemInstanceId}
                        className="lag-inventory-action"
                        onClick={async () => {
                          if (!selectedCandidate || compatibility?.status !== "VERIFIED") return;
                          const current = selectedSlot.item?.itemName
                            ?? (selectedSlot.slot.itemInstanceId === null ? null : `itemInstanceId ${selectedSlot.slot.itemInstanceId}`);
                          const prompt = current
                            ? `“${selectedSlot.slot.slotName}”의 “${current}”을 “${selectedCandidate.itemName}”으로 바꿀까요?`
                            : `“${selectedCandidate.itemName}”을 “${selectedSlot.slot.slotName}”에 장착할까요?`;
                          if (await confirm(prompt)) void queries.equip(selectedSlot.slot.slotId, selectedCandidate.itemInstanceId);
                        }}
                      >{pending ? "처리 중…" : "장착"}</button>
                      {selectedSlot.slot.itemInstanceId !== null ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="lag-inventory-button"
                          data-variant="destructive"
                          onClick={async () => {
                            const item = selectedSlot.item?.itemName ?? `itemInstanceId ${selectedSlot.slot.itemInstanceId}`;
                            if (await confirm(`“${selectedSlot.slot.slotName}”의 “${item}” 장비를 해제할까요?`)) void queries.unequip(selectedSlot.slot.slotId);
                          }}
                        >장착 해제</button>
                      ) : null}
                    </div>
                  </>
                ) : <p role="status" className="lag-inventory-feedback">{READ_ONLY_MESSAGE}</p>}
              </article>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
