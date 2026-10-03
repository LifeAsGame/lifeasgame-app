"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import type { InventoryEntry, MailEntry } from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import ItemDescription from "@/shared/ui/ItemDescription";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useInventoryQueries } from "./useInventoryQueries";

export type InventorySurface = "items" | "inbox";

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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="lag-inventory-section"><h4>{title}</h4><dl>{children}</dl></section>;
}

function attributeValue(value: unknown): string {
  if (value === null) return "없음";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  try {
    const readable = JSON.stringify(value);
    return readable ?? "표시할 수 없는 값";
  } catch {
    return "표시할 수 없는 값";
  }
}

const itemName = (entry: InventoryEntry | MailEntry) => entry.itemName.trim() || `아이템 #${entry.itemId}`;

function Attributes({ attrs }: { attrs: Record<string, unknown> }) {
  const entries = Object.entries(attrs);
  return (
    <DetailSection title="추가 속성">
      {entries.length > 0
        ? entries.map(([key, value]) => <DataRow key={key} label={key}>{attributeValue(value)}</DataRow>)
        : <DataRow label="속성">없음</DataRow>}
    </DetailSection>
  );
}

function InventoryTile({ entry, selected, kind, onSelect }: { entry: InventoryEntry | MailEntry; selected: boolean; kind: "item" | "mail"; onSelect: (button: HTMLButtonElement) => void }) {
  return (
    <button type="button" className="lag-inventory-tile" data-testid="inventory-entry" data-selected={selected} aria-pressed={selected} onClick={(event) => onSelect(event.currentTarget)}>
      <span className="lag-inventory-tile-mark" aria-hidden>x{entry.quantity}</span>
      <span className="lag-inventory-tile-copy">
        <strong>{itemName(entry)}</strong>
        <span>{consumerLabel(entry.rarity)} · {consumerLabel(entry.category)}</span>
        <small>{consumerLabel(entry.type)}{kind === "item" && entry.bound ? " · 귀속" : ""}</small>
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}

function ItemDetail({ item }: { item: InventoryEntry }) {
  return (
    <article className="lag-inventory-detail">
      <header className="lag-inventory-hero">
        <span>보유 아이템</span>
        <h4>{itemName(item)}</h4>
        <ItemDescription itemId={item.itemId} />
        <div><span>{consumerLabel(item.rarity)}</span><span>{consumerLabel(item.category)}</span><span>{consumerLabel(item.type)}</span></div>
      </header>
      <DetailSection title="아이템 정보">
        <DataRow label="보유 번호">{item.itemInstanceId}</DataRow>
        <DataRow label="아이템 번호">{item.itemId}</DataRow>
        <DataRow label="이름">{itemName(item)}</DataRow>
      </DetailSection>
      <DetailSection title="보유 정보">
        <DataRow label="칸 번호">{item.slotIndex}</DataRow>
        <DataRow label="수량">{item.quantity}</DataRow>
        <DataRow label="중첩 가능">{item.stackable ? "예" : "아니요"}</DataRow>
        <DataRow label="최대 중첩">{item.maxStack}</DataRow>
        <DataRow label="귀속">{item.bound ? "예" : "아니요"}</DataRow>
      </DetailSection>
      <DetailSection title="분류">
        <DataRow label="종류">{consumerLabel(item.category)}</DataRow>
        <DataRow label="유형">{consumerLabel(item.type)}</DataRow>
        <DataRow label="희귀도">{consumerLabel(item.rarity)}</DataRow>
      </DetailSection>
      <DetailSection title="상태">
        <DataRow label="내구도">{item.durability ?? "기록 없음"}</DataRow>
      </DetailSection>
      <Attributes attrs={item.instanceAttrs} />
    </article>
  );
}

function MailDetail({ mail, pending, claimed, recoveryBlocked, recoveryError, onClaim, onDelete, onRetry }: { mail: MailEntry; pending: boolean; claimed: boolean; recoveryBlocked: boolean; recoveryError: string | null; onClaim: () => void; onDelete: () => void; onRetry: () => void }) {
  return (
    <article className="lag-inventory-detail">
      <header className="lag-inventory-hero">
        <span>{claimed ? "수령 완료 · 목록 갱신 중" : "수신함 · 아직 보유하지 않음"}</span>
        <h4>{itemName(mail)}</h4>
        <ItemDescription itemId={mail.itemId} />
        <div><span>{consumerLabel(mail.rarity)}</span><span>{consumerLabel(mail.category)}</span><span>{consumerLabel(mail.type)}</span></div>
      </header>
      <DetailSection title="수신 정보">
        <DataRow label="수신 번호">{mail.mailId}</DataRow>
        <DataRow label="칸 번호">{mail.slotIndex}</DataRow>
        <DataRow label="아이템 번호">{mail.itemId}</DataRow>
      </DetailSection>
      <DetailSection title="아이템 정보">
        <DataRow label="종류">{consumerLabel(mail.category)}</DataRow>
        <DataRow label="유형">{consumerLabel(mail.type)}</DataRow>
        <DataRow label="희귀도">{consumerLabel(mail.rarity)}</DataRow>
        <DataRow label="수량">{mail.quantity}</DataRow>
        <DataRow label="중첩 가능">{mail.stackable ? "예" : "아니요"}</DataRow>
        <DataRow label="최대 중첩">{mail.maxStack}</DataRow>
        <DataRow label="귀속">{mail.bound ? "예" : "아니요"}</DataRow>
        <DataRow label="내구도">{mail.durability ?? "기록 없음"}</DataRow>
      </DetailSection>
      <Attributes attrs={mail.instanceAttrs} />
      {claimed ? (
        recoveryError
          ? <ErrorState text={recoveryError} retry={onRetry} />
          : <p role="status" className="lag-inventory-feedback">수령했습니다. 수신함과 아이템 목록을 갱신하는 중입니다…</p>
      ) : recoveryBlocked ? (
        <ErrorState text="수신함 동기화가 필요합니다. 다시 조회한 뒤 수령하거나 삭제하세요." retry={onRetry} />
      ) : (
        <div className="lag-inventory-actions">
          <button type="button" disabled={pending} className="lag-inventory-action" onClick={onClaim}>{pending ? "처리 중…" : "수령"}</button>
          <button type="button" disabled={pending} className="lag-inventory-button" data-variant="destructive" onClick={onDelete}>삭제</button>
        </div>
      )}
    </article>
  );
}

export default function InventoryShell({ surface, onBack }: { surface: InventorySurface; onBack?: () => void }) {
  const { confirm, dialog } = useSaoConfirm();
  const queries = useInventoryQueries();
  const selectedEntryButton = useRef<HTMLButtonElement | null>(null);
  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<number | null>(null);
  const [selectedMailId, setSelectedMailId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>("ALL");
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

  const focusList = useCallback(() => requestAnimationFrame(() => {
    const target = selectedEntryButton.current?.isConnected
      ? selectedEntryButton.current
      : document.querySelector<HTMLElement>(`[data-stage-key="inventory-${surface}-list"] button, [data-stage-key="inventory-${surface}-list"] .lag-inventory-surface`);
    target?.focus();
  }), [surface]);

  useEffect(() => {
    setSelectedItemInstanceId(null);
    setSelectedMailId(null);
  }, [surface]);

  useEffect(() => {
    if (!items && selectedMailId !== null && !selectedMail && !query.loading) {
      setSelectedMailId(null);
      focusList();
    }
  }, [focusList, items, selectedMail, selectedMailId, query.loading]);

  useEffect(() => {
    if (category !== null && category !== "ALL" && !categories.includes(category)) {
      setCategory("ALL");
      setSelectedItemInstanceId(null);
    } else if (category !== "ALL" && selectedItemInstanceId !== null && !queries.inventory.data.entries.some((entry) => entry.itemInstanceId === selectedItemInstanceId && entry.category === category)) {
      setSelectedItemInstanceId(null);
    }
  }, [categories, category, queries.inventory.data.entries, selectedItemInstanceId]);

  const selectCategory = (next: string) => {
    setCategory(next);
    setSelectedItemInstanceId(null);
    requestStageFocus("inventory-items-list", "forward");
  };

  const closeDetail = () => {
    setSelectedItemInstanceId(null);
    setSelectedMailId(null);
    requestStageFocus(`inventory-${surface}-list`, "back");
    focusList();
  };

  return (
    <div className="lag-panel-rail lag-inventory-shell relative" data-testid="inventory-shell">{dialog}
      {items ? <PanelStage stageKey="inventory-items-categories" panelRole="list">
        <PanelFrame title="아이템 분류" depth={2} backButton={onBack ? <BackButton label="인벤토리로" onClick={onBack} /> : undefined}>
          <div className="lag-inventory-filters" aria-label="아이템 분류">
            {["ALL", ...categories].map((filter) => <button key={filter} type="button" className="lag-inventory-filter" aria-pressed={category === filter} data-selected={category === filter} onClick={() => selectCategory(filter)}>{filter === "ALL" ? "전체 아이템" : consumerLabel(filter)}</button>)}
          </div>
        </PanelFrame>
      </PanelStage> : null}
      {!items || category !== null ? <PanelStage stageKey={`inventory-${surface}-list`} panelRole="list">
        <PanelFrame title={items ? "아이템" : "수신함"} depth={1} backButton={items ? <BackButton label="아이템 분류로" onClick={() => { setCategory(null); setSelectedItemInstanceId(null); requestStageFocus("inventory-items-categories", "back"); }} /> : onBack ? <BackButton label="인벤토리로" onClick={onBack} /> : undefined}>
          <section className="lag-inventory-surface" aria-label={items ? "보유 아이템" : "수신함"} tabIndex={-1}>
            <header>
              <p>{items ? "현재 보유한 아이템" : "수령 전 아이템 · 수령하거나 삭제할 수 있습니다"}</p>
              {!query.loading && !query.error ? <button type="button" className="lag-inventory-button" onClick={() => void query.reload()}>{items ? "아이템" : "수신함"} 다시 조회</button> : null}
            </header>
            {query.loading && query.data.entries.length === 0 ? <InfoCard>{items ? "아이템" : "수신함"}을 불러오는 중…</InfoCard> : null}
            {query.error ? <ErrorState text={query.error} retry={() => void (queries.claimRecoveryNeeded ? queries.retryClaimRecovery() : query.reload())} /> : null}
            {query.error && query.data.entries.length > 0 ? <p role="status" className="lag-inventory-feedback">이전에 조회한 항목입니다. 현재 서버 상태는 확인되지 않았습니다.</p> : null}
            {!query.loading && !query.error && query.data.entries.length === 0 ? <InfoCard>{items ? "보유한 아이템" : "수신한 아이템"}이 없습니다.</InfoCard> : null}
            {items && !query.loading && !query.error && query.data.entries.length > 0 && visibleItems.length === 0 ? <InfoCard>이 분류에는 아이템이 없습니다.</InfoCard> : null}
            {queries.mutationError && (!selectedMail || !queries.confirmedClaimMailIds.has(selectedMail.mailId)) ? (
              <div className="lag-inventory-state">
                <p role="alert" className="lag-inventory-feedback" data-state="error">{queries.mutationError}</p>
                {queries.claimRecoveryNeeded ? <button type="button" className="lag-inventory-button" onClick={() => void queries.retryClaimRecovery()}>동기화 다시 시도</button> : null}
              </div>
            ) : null}
            <div className="lag-inventory-grid">
              {items
                ? visibleItems.map((item) => <InventoryTile key={item.itemInstanceId} entry={item} kind="item" selected={selectedItemInstanceId === item.itemInstanceId} onSelect={(button) => { selectedEntryButton.current = button; setSelectedItemInstanceId(item.itemInstanceId); }} />)
                : queries.mailbox.data.entries.map((mail) => <InventoryTile key={mail.mailId} entry={mail} kind="mail" selected={selectedMailId === mail.mailId} onSelect={(button) => { selectedEntryButton.current = button; setSelectedMailId(mail.mailId); }} />)}
            </div>
          </section>
        </PanelFrame>
      </PanelStage> : null}

      <AnimatePresence initial={false}>
        {selectedItem || selectedMail ? (
          <PanelStage stageKey={`inventory-${surface}-detail`} index={1}>
            <PanelFrame title={items ? "아이템 상세" : "수신 상세"} depth={0} contentKey={selectedItemInstanceId ?? selectedMailId ?? undefined} backButton={<BackButton label={items ? "아이템 목록으로" : "수신함으로"} onClick={closeDetail} />}>
              {items && selectedItem ? <ItemDetail item={selectedItem} /> : null}
              {!items && selectedMail ? (
                <MailDetail
                  mail={selectedMail}
                  pending={queries.pendingKey !== null}
                  claimed={queries.confirmedClaimMailIds.has(selectedMail.mailId)}
                  recoveryBlocked={queries.claimRecoveryNeeded}
                  recoveryError={queries.mutationError}
                  onRetry={() => void queries.retryClaimRecovery()}
                  onClaim={async () => {
                    if (await confirm(`“${itemName(selectedMail)}” ${selectedMail.quantity}개를 수령할까요?`)) void queries.claimMail(selectedMail);
                  }}
                  onDelete={async () => {
                    if (await confirm(`“${itemName(selectedMail)}” 우편을 삭제할까요? 수령하지 않은 내용이 제거됩니다.`)) void queries.deleteMail(selectedMail);
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
