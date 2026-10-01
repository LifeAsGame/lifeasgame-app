"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";

import { COLLECTION_CATEGORIES, type CollectionCategory, type CollectionCreateRequest, type CollectionInfo, type CollectionUpdateRequest } from "@/shared/api/types";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import CreateSlot, { useCreateMode } from "@/shared/ui/CreateSlot";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useCollectionQueries } from "./useCollectionQueries";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <label className="lag-journal-field"><span>{title}</span>{children}</label>;
}

function Feedback({ pending, error, success, refreshError, reload }: {
  pending: boolean; error: string | null; success: string | null; refreshError: string | null; reload: () => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const state = error ? "error" : success ? "success" : pending ? "pending" : null;
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [state]);
  return <>
    {state ? <p ref={ref} tabIndex={-1} role={error ? "alert" : "status"} className="lag-journal-feedback" data-state={state}>{error ?? success ?? "변경 사항 저장 중…"}</p> : null}
    {refreshError ? <div className="lag-journal-state"><p role="alert" className="lag-journal-feedback" data-state="error">{refreshError}</p><button type="button" className="lag-journal-button" onClick={reload}>수집 목록 다시 조회</button></div> : null}
  </>;
}

function CollectionForm({ item, category, pending, create, update, cancel, children }: {
  item?: CollectionInfo; category: CollectionCategory; pending: boolean;
  create: (body: CollectionCreateRequest) => Promise<boolean>;
  update: (body: CollectionUpdateRequest) => Promise<boolean>;
  cancel: () => void; children: React.ReactNode;
}) {
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (item) {
      await update({ quantity: Number(text(form, "quantity")), conditionNote: text(form, "conditionNote"), acquiredFrom: text(form, "acquiredFrom") });
    } else {
      const originalTitle = text(form, "originalTitle"), conditionNote = text(form, "conditionNote"), acquiredFrom = text(form, "acquiredFrom");
      const tags = text(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean);
      await create({
        category, title: text(form, "title"), quantity: Number(text(form, "quantity")),
        ...(originalTitle ? { originalTitle } : {}), ...(conditionNote ? { conditionNote } : {}), ...(acquiredFrom ? { acquiredFrom } : {}), ...(tags.length ? { tags } : {}),
        ...(form.has("weeklyReflection") ? { lifeLogSubtype: "REFLECTION", reflectionScope: "WEEKLY_LOOKBACK" } as const : {}),
      });
    }
  };
  return <form className="lag-collection-form" aria-busy={pending} onSubmit={submit} onFocusCapture={(event) => {
    if (event.target.matches("input, select, textarea, [role=status], [role=alert]")) event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }}>
    <p className="lag-journal-intro">{item ? "수량·상태 메모·입수처를 수정합니다." : "일상 기록에 수집 기록을 남깁니다."} * 표시는 필수입니다.</p>
    <fieldset disabled={pending} className="lag-journal-form-grid">
      {!item ? <>
        <p className="lag-journal-intro">수집 종류: {consumerLabel(category)}</p>
        <Field title="제목 *"><input name="title" aria-label="제목" required className="lag-journal-control" /></Field>
        <Field title="원제 (선택)"><input name="originalTitle" aria-label="원제" className="lag-journal-control" /></Field>
      </> : null}
      <Field title="수량 *"><input name="quantity" aria-label={item ? "변경할 수량" : "수량"} type="number" min={1} required defaultValue={item?.quantity} className="lag-journal-control" /></Field>
      <Field title="상태 메모 (선택)"><textarea name="conditionNote" aria-label={item ? "변경할 상태 메모" : "상태 메모"} rows={4} defaultValue={item?.conditionNote ?? ""} className="lag-journal-control" /></Field>
      <Field title="입수처 (선택)"><input name="acquiredFrom" aria-label={item ? "변경할 입수처" : "입수처"} defaultValue={item?.acquiredFrom ?? ""} className="lag-journal-control" /></Field>
      {!item ? <>
        <Field title="태그 (선택, 쉼표로 구분)"><input name="tags" aria-label="태그 (쉼표로 구분)" className="lag-journal-control" /></Field>
        <label className="lag-collection-check"><input name="weeklyReflection" type="checkbox" />주간 회고</label>
        <p className="lag-journal-intro">주간 회고는 이번 주의 전체 회고를 생성합니다. 간편 기록은 주간 회고 퀘스트 조건을 충족하지 않습니다.</p>
      </> : null}
    </fieldset>
    <div className="lag-collection-actions">{children}<button type="submit" disabled={pending} className="lag-journal-action">{pending ? "저장 중…" : "수집 기록 저장"}</button>{item ? <button type="button" className="lag-journal-button" onClick={cancel}>취소</button> : null}</div>
  </form>;
}

function CollectionDetail({ item }: { item: CollectionInfo }) {
  return <article className="lag-journal-detail">
    <div className="lag-journal-detail-hero"><span>{consumerLabel(item.category)}</span><h4>{item.title}</h4><p className="lag-collection-quantity">{item.quantity} <small>개</small></p></div>
    <p className="lag-collection-note">{item.conditionNote || "상태 메모 없음"}</p>
    <dl className="lag-journal-detail-section">{[
      ["입수처", item.acquiredFrom || "미등록"], ["원제", item.originalTitle || "미등록"], ["태그", item.tags.join(" · ") || "미등록"],
      ["생성일", item.createdAt], ["수정일", item.updatedAt], ["출처", `수집 기록 #${item.id}`],
    ].map(([name, value]) => <div key={name} className="lag-journal-detail-item"><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
  </article>;
}

function subscribeCompact(notify: () => void) {
  const media = window.matchMedia("(max-width: 899px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export default function CollectionShell({ onBack, createRequest = 0, initialRecord }: { onBack?: () => void; createRequest?: number; initialRecord?: { id: number; category: CollectionCategory; title: string } }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const collections = useCollectionQueries(true);
  const [detailVisible, setDetailVisible] = useState(true);
  useEffect(() => { if (creation.creating) setDetailVisible(false); }, [creation.creating]);
  const select = (id: number) => { caller.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; setDetailVisible(true); collections.select(id); };
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia("(max-width: 899px)").matches, () => false);
  const [mode, setMode] = useState<"edit" | null>(null);
  const [category, setCategory] = useState<CollectionCategory | null>(null);
  const [titleLike, setTitleLike] = useState("");
  const jumped = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!initialRecord) return; setCategory(initialRecord.category); setTitleLike(initialRecord.title); collections.search(initialRecord.category, initialRecord.title); }, [initialRecord?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!initialRecord || jumped.current || collections.params.category !== initialRecord.category || collections.params.titleLike !== initialRecord.title || collections.list.loading || !collections.list.items.some((item) => item.id === initialRecord.id)) return; jumped.current = true; setDetailVisible(true); collections.select(initialRecord.id); }, [initialRecord?.id, collections.params, collections.list.loading, collections.list.items]);
  const chooseCategory = (next: CollectionCategory, create = false) => {
    setCategory(next); setTitleLike(""); collections.search(next); setMode(null); setDetailVisible(false);
    if (create) creation.open(); else creation.close();
  };
  const shell = useRef<HTMLDivElement>(null), caller = useRef<HTMLButtonElement | null>(null);
  const pending = collections.pendingMutation !== null, item = collections.detail.data;
  const activeKey = creation.creating || !detailVisible ? null : mode === "edit" ? "lifelog-collection-form" : collections.selectedId !== null ? "lifelog-collection-detail" : null;
  useEffect(() => {
    if (!activeKey || (!compact && !mode)) return;
    shell.current?.querySelector<HTMLElement>(mode ? '[data-stage-key="lifelog-collection-form"] :is(input, select, textarea)' : '[data-stage-key="lifelog-collection-detail"] button')?.focus({ preventScroll: true });
  }, [activeKey, compact, mode, collections.selectedId]);
  const returnToList = (reset = true) => {
    if (reset) collections.resetMutation();
    collections.clearSelection();
    setDetailVisible(false); setMode(null); creation.close();
    requestStageFocus("lifelog-collection-list", "back");
    requestAnimationFrame(() => (caller.current?.isConnected ? caller.current : shell.current?.querySelector<HTMLButtonElement>('[data-collection-category]'))?.focus({ preventScroll: true }));
  };
  const cancelForm = () => {
    collections.resetMutation();
    if (mode === "edit" && collections.selectedId !== null) {
      setMode(null);
      requestStageFocus("lifelog-collection-detail", "back");
      requestAnimationFrame(() => shell.current?.querySelector<HTMLElement>('[data-stage-key="lifelog-collection-detail"] button')?.focus({ preventScroll: true }));
    } else returnToList();
  };
  const feedback = <Feedback pending={pending} error={collections.mutationError} success={collections.mutationSuccess} refreshError={collections.refreshError} reload={() => void collections.list.reload(true)} />;
  const list = collections.list;
  return <div ref={shell} className="lag-panel-rail lag-collection-shell relative">{dialog}
    <PanelStage stageKey="lifelog-collection-categories" panelRole="list" inactive={compact && category !== null}>
      <PanelFrame title="수집 종류" depth={1} backButton={onBack ? <BackButton label="생활 기록 목록으로" onClick={onBack} /> : undefined}>
        <div className="lag-role-node-list lag-collection-categories">{COLLECTION_CATEGORIES.map((kind) =>
          <SwipeButton key={kind} data-collection-category={kind} creation className="lag-role-node" aria-pressed={category === kind} onClick={() => chooseCategory(kind)} onDoubleClick={() => chooseCategory(kind, true)}><span className="lag-role-node-mark" aria-hidden>{consumerLabel(kind).slice(0, 1)}</span><strong>{consumerLabel(kind)}</strong><span aria-hidden>→</span></SwipeButton>
        )}</div>
      </PanelFrame>
    </PanelStage>
    {category ? <PanelStage stageKey="lifelog-collection-list" panelRole="list" inactive={compact && activeKey !== null}>
      <PanelFrame title={`${consumerLabel(category)} 목록`} depth={1} resetScrollKey={`${collections.params.page}:${collections.params.category ?? ""}:${collections.params.titleLike ?? ""}`} backButton={<BackButton label={creation.creating ? "수집 목록으로" : "수집 종류로"} onClick={() => { if (creation.creating) { creation.close(); return; } collections.clearSelection(); setCategory(null); setDetailVisible(false); setMode(null); }} />}>
        <CreateSlot creating={creation.creating} pending={pending} onClose={creation.close} list={<div className="lag-journal-surface">
          <details className="lag-journal-filter-disclosure"><summary>제목 검색</summary><form className="lag-journal-filters" onSubmit={(event) => { event.preventDefault(); setMode(null); collections.search(category, titleLike); }}>
            <Field title="제목 검색"><input aria-label="제목 검색" value={titleLike} onChange={(event) => setTitleLike(event.target.value)} className="lag-journal-control" /></Field><button type="submit" className="lag-journal-button">검색</button>
          </form></details>
          {!activeKey && (pending || collections.mutationError || collections.mutationSuccess || collections.refreshError) ? <div className="lag-collection-feedback">{feedback}</div> : null}
          {list.loading && !list.items.length ? <InfoCard>수집 기록을 불러오는 중…</InfoCard> : null}
          {list.error ? <div className="lag-collection-feedback"><p role="alert" className="lag-journal-feedback" data-state="error">{list.error}</p><button type="button" className="lag-journal-button" onClick={() => void list.reload(true)}>목록 다시 조회</button></div> : null}
          {!list.loading && !list.error && !list.items.length ? <InfoCard>수집 기록이 없습니다.</InfoCard> : null}
          <div className="lag-journal-list">{list.items.map((row) => <RecordRow key={row.id} title={row.title} subtitle={`${consumerLabel(row.category)} · 수량 ${row.quantity}`} selected={collections.selectedId === row.id} disabled={pending} archiveLabel="삭제" onSelect={() => { setMode(null); select(row.id); }} onEdit={() => { select(row.id); setMode("edit"); }} onArchive={async () => { if (await confirm(`“${row.title}” 수집 기록을 삭제할까요?`)) await collections.remove(row.id); }} />)}</div>
          <div className="lag-journal-pagination"><button type="button" className="lag-journal-button" disabled={list.loading || collections.params.page === 0} onClick={() => { setMode(null); collections.changePage(collections.params.page - 1); }}>이전</button><span>페이지 {collections.params.page + 1}</span><button type="button" className="lag-journal-button" disabled={list.loading || list.items.length < collections.params.size} onClick={() => { setMode(null); collections.changePage(collections.params.page + 1); }}>다음</button></div>
        </div>} showCancel={false}><div className="lag-collection-form-surface"><CollectionForm category={category} pending={pending} cancel={creation.close} create={(body) => creation.save(() => collections.create(body))} update={async () => false}>{feedback}</CollectionForm></div></CreateSlot>
      </PanelFrame>
    </PanelStage> : null}
    <AnimatePresence initial={false}>
      {activeKey ? <PanelStage key={activeKey} stageKey={activeKey} panelRole="detail" side="right">
        <PanelFrame title={mode === "edit" ? "수집 기록 수정" : "수집 기록 상세"} depth={0} contentKey={`${mode ?? "detail"}:${collections.selectedId ?? "new"}`} backButton={<BackButton label={mode === "edit" ? "수집 기록 상세로" : "수집 기록 목록으로"} onClick={mode ? cancelForm : () => returnToList()} />}>
          {mode && !item ? <InfoCard>수집 기록을 불러오는 중…</InfoCard> : mode ? <div className="lag-collection-form-surface"><CollectionForm item={mode === "edit" && item ? item : undefined} category={category!} pending={pending} cancel={cancelForm} create={async (body) => { const saved = await collections.create(body); if (saved) setMode(null); return saved; }} update={async (body) => { const saved = item ? await collections.update(item.id, body) : false; if (saved) { setMode(null); requestStageFocus("lifelog-collection-detail", "back"); } return saved; }}>{feedback}</CollectionForm></div> : <>
            {collections.detail.loading && !item ? <InfoCard>수집 기록을 불러오는 중…</InfoCard> : null}
            {collections.detail.error ? <div className="lag-collection-feedback"><p role="alert" className="lag-journal-feedback" data-state="error">{collections.detail.error}</p><button type="button" className="lag-journal-button" onClick={() => void collections.detail.retry()}>상세 다시 조회</button></div> : null}
            {item ? <><CollectionDetail item={item} />{feedback}</> : null}
          </>}
        </PanelFrame>
      </PanelStage> : null}
    </AnimatePresence>
  </div>;
}
