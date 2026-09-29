"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";

import { COLLECTION_CATEGORIES, type CollectionCategory, type CollectionCreateRequest, type CollectionInfo, type CollectionUpdateRequest } from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
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
    {state ? <p ref={ref} tabIndex={-1} role={error ? "alert" : "status"} className="lag-journal-feedback" data-state={state}>{error ?? success ?? "Saving changes..."}</p> : null}
    {refreshError ? <div className="lag-journal-state"><p role="alert" className="lag-journal-feedback" data-state="error">{refreshError}</p><button type="button" className="lag-journal-button" onClick={reload}>Refresh Collections</button></div> : null}
  </>;
}

function CollectionForm({ item, pending, create, update, cancel, children }: {
  item?: CollectionInfo; pending: boolean;
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
        category: text(form, "category") as CollectionCategory, title: text(form, "title"), quantity: Number(text(form, "quantity")),
        ...(originalTitle ? { originalTitle } : {}), ...(conditionNote ? { conditionNote } : {}), ...(acquiredFrom ? { acquiredFrom } : {}), ...(tags.length ? { tags } : {}),
        ...(form.has("weeklyReflection") ? { lifeLogSubtype: "REFLECTION", reflectionScope: "WEEKLY_LOOKBACK" } as const : {}),
      });
    }
  };
  return <form className="lag-collection-form" aria-busy={pending} onSubmit={submit} onFocusCapture={(event) => {
    if (event.target.matches("input, select, textarea, [role=status], [role=alert]")) event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }}>
    <p className="lag-journal-intro">{item ? "Edit quantity, condition note, and acquired from." : "Add a collection to your Journal."} Required fields are marked *.</p>
    <fieldset disabled={pending} className="lag-journal-form-grid">
      {!item ? <>
        <Field title="Category *"><select name="category" aria-label="Create category" required defaultValue="" className="lag-journal-control"><option value="">Select...</option>{COLLECTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field title="Title *"><input name="title" aria-label="Title" required className="lag-journal-control" /></Field>
        <Field title="Original title (optional)"><input name="originalTitle" aria-label="Original title" className="lag-journal-control" /></Field>
      </> : null}
      <Field title="Quantity *"><input name="quantity" aria-label={item ? "Update quantity" : "Quantity"} type="number" min={1} required defaultValue={item?.quantity} className="lag-journal-control" /></Field>
      <Field title="Condition note (optional)"><textarea name="conditionNote" aria-label={item ? "Update condition note" : "Condition note"} rows={4} defaultValue={item?.conditionNote ?? ""} className="lag-journal-control" /></Field>
      <Field title="Acquired from (optional)"><input name="acquiredFrom" aria-label={item ? "Update acquired from" : "Acquired from"} defaultValue={item?.acquiredFrom ?? ""} className="lag-journal-control" /></Field>
      {!item ? <>
        <Field title="Tags (optional, comma separated)"><input name="tags" aria-label="Tags, comma separated" className="lag-journal-control" /></Field>
        <label className="lag-collection-check"><input name="weeklyReflection" type="checkbox" />Weekly reflection</label>
        <p className="lag-journal-intro">Weekly reflection creates a FULL reflection for the current week. Quick Record does not satisfy the weekly lookback Quest.</p>
      </> : null}
    </fieldset>
    <div className="lag-collection-actions">{children}<button type="submit" disabled={pending} className="lag-journal-action">{pending ? "Saving..." : item ? "Update Collection" : "Create Collection"}</button><button type="button" className="lag-journal-button" onClick={cancel}>Cancel</button></div>
  </form>;
}

function CollectionDetail({ item }: { item: CollectionInfo }) {
  return <article className="lag-journal-detail">
    <div className="lag-journal-detail-hero"><span>{item.category}</span><h4>{item.title}</h4><p className="lag-collection-quantity">{item.quantity} <small>PIECES</small></p></div>
    <p className="lag-collection-note">{item.conditionNote || "No condition note"}</p>
    <dl className="lag-journal-detail-section">{[
      ["Acquired from", item.acquiredFrom || "Not recorded"], ["Original title", item.originalTitle || "Not recorded"], ["Tags", item.tags.join(" · ") || "Not recorded"],
      ["Created", item.createdAt], ["Updated", item.updatedAt], ["Source", `Collection source #${item.id}`],
    ].map(([name, value]) => <div key={name} className="lag-journal-detail-item"><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
  </article>;
}

function subscribeCompact(notify: () => void) {
  const media = window.matchMedia("(max-width: 899px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export default function CollectionShell({ onBack }: { onBack?: () => void }) {
  const collections = useCollectionQueries();
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia("(max-width: 899px)").matches, () => false);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [category, setCategory] = useState<CollectionCategory | "">("");
  const [titleLike, setTitleLike] = useState("");
  const shell = useRef<HTMLDivElement>(null), caller = useRef<HTMLButtonElement | null>(null), editButton = useRef<HTMLButtonElement | null>(null);
  const pending = collections.pendingMutation !== null, item = collections.detail.data;
  const activeKey = mode ? "lifelog-collection-form" : collections.selectedId !== null ? "lifelog-collection-detail" : null;
  useEffect(() => {
    if (!activeKey || (!compact && !mode)) return;
    shell.current?.querySelector<HTMLElement>(mode ? '[data-stage-key="lifelog-collection-form"] :is(input, select, textarea)' : '[data-stage-key="lifelog-collection-detail"] button')?.focus({ preventScroll: true });
  }, [activeKey, compact, mode, collections.selectedId]);
  const returnToList = (reset = true) => {
    if (reset) collections.resetMutation();
    collections.clearSelection();
    setMode(null);
    requestStageFocus("lifelog-collection-list", "back");
    requestAnimationFrame(() => (caller.current?.isConnected ? caller.current : shell.current?.querySelector<HTMLButtonElement>('[aria-label="Add Collection"]'))?.focus({ preventScroll: true }));
  };
  const cancelForm = () => {
    collections.resetMutation();
    if (mode === "edit" && collections.selectedId !== null) {
      setMode(null);
      requestStageFocus("lifelog-collection-detail", "back");
      requestAnimationFrame(() => editButton.current?.focus({ preventScroll: true }));
    } else returnToList();
  };
  const feedback = <Feedback pending={pending} error={collections.mutationError} success={collections.mutationSuccess} refreshError={collections.refreshError} reload={() => void collections.list.reload(true)} />;
  const list = collections.list;
  return <div ref={shell} className="lag-panel-rail lag-collection-shell relative">
    <PanelStage stageKey="lifelog-collection-list" inactive={compact && activeKey !== null}>
      <PanelFrame title="Collections" depth={1} resetScrollKey={`${collections.params.page}:${collections.params.category ?? ""}:${collections.params.titleLike ?? ""}`} backButton={onBack ? <BackButton label="Back to Lifelog" onClick={onBack} /> : undefined}>
        <div className="lag-journal-surface">
          <div className="lag-journal-toolbar"><div><p className="lag-journal-eyebrow">Collection</p><p className="lag-journal-intro">The stories behind the things you keep.</p></div><button type="button" aria-label="Add Collection" className="lag-journal-action" data-selected={mode === "create"} aria-expanded={mode === "create"} onClick={(event) => { caller.current = event.currentTarget; collections.resetMutation(); collections.clearSelection(); setMode("create"); }}>Add Collection</button></div>
          <details className="lag-journal-filter-disclosure"><summary>Filters · Category / Title</summary><form className="lag-journal-filters" onSubmit={(event) => { event.preventDefault(); setMode(null); collections.search(category || undefined, titleLike); }}>
            <Field title="Category"><select aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value as CollectionCategory | "")} className="lag-journal-control"><option value="">All Categories</option>{COLLECTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field title="Title search"><input aria-label="Title search" value={titleLike} onChange={(event) => setTitleLike(event.target.value)} className="lag-journal-control" /></Field><button type="submit" className="lag-journal-button">Search</button>
          </form></details>
          {!activeKey && (pending || collections.mutationError || collections.mutationSuccess || collections.refreshError) ? <div className="lag-collection-feedback">{feedback}</div> : null}
          {list.loading && !list.items.length ? <InfoCard>Loading Collections...</InfoCard> : null}
          {list.error ? <div className="lag-collection-feedback"><p role="alert" className="lag-journal-feedback" data-state="error">{list.error}</p><button type="button" className="lag-journal-button" onClick={() => void list.reload(true)}>Retry list</button></div> : null}
          {!list.loading && !list.error && !list.items.length ? <InfoCard>No Collections.</InfoCard> : null}
          <div className="lag-journal-list">{list.items.map((row) => <button key={row.id} type="button" className="lag-journal-entry" aria-pressed={collections.selectedId === row.id} data-selected={collections.selectedId === row.id} onClick={(event) => { caller.current = event.currentTarget; setMode(null); collections.select(row.id); }}><span className="lag-journal-source" aria-hidden>CO</span><span className="lag-journal-entry-copy"><strong>{row.title}</strong><span className="lag-journal-entry-summary">{row.category} · Quantity {row.quantity}</span><span className="lag-journal-entry-summary">{row.conditionNote || "No condition note"}</span></span></button>)}</div>
          <div className="lag-journal-pagination"><button type="button" className="lag-journal-button" disabled={list.loading || collections.params.page === 0} onClick={() => { setMode(null); collections.changePage(collections.params.page - 1); }}>Previous</button><span>Page {collections.params.page + 1}</span><button type="button" className="lag-journal-button" disabled={list.loading || list.items.length < collections.params.size} onClick={() => { setMode(null); collections.changePage(collections.params.page + 1); }}>Next</button></div>
        </div>
      </PanelFrame>
    </PanelStage>
    <AnimatePresence initial={false}>
      {activeKey ? <PanelStage key={activeKey} stageKey={activeKey} side={compact ? "right" : "left"}>
        <PanelFrame title={mode === "create" ? "Add Collection" : mode === "edit" ? "Edit Collection" : "Collection Detail"} depth={0} contentKey={`${mode ?? "detail"}:${collections.selectedId ?? "new"}`} backButton={<BackButton label={mode === "edit" ? "Back to Collection detail" : "Back to Collection list"} onClick={mode ? cancelForm : () => returnToList()} />}>
          {mode ? <div className="lag-collection-form-surface"><CollectionForm item={mode === "edit" && item ? item : undefined} pending={pending} cancel={cancelForm} create={async (body) => { const saved = await collections.create(body); if (saved) setMode(null); return saved; }} update={async (body) => { const saved = item ? await collections.update(item.id, body) : false; if (saved) { setMode(null); requestStageFocus("lifelog-collection-detail", "back"); } return saved; }}>{feedback}</CollectionForm></div> : <>
            {collections.detail.loading && !item ? <InfoCard>Loading Collection...</InfoCard> : null}
            {collections.detail.error ? <div className="lag-collection-feedback"><p role="alert" className="lag-journal-feedback" data-state="error">{collections.detail.error}</p><button type="button" className="lag-journal-button" onClick={() => void collections.detail.retry()}>Retry detail</button></div> : null}
            {item ? <><CollectionDetail item={item} /><div className="lag-collection-detail-actions">{feedback}<button ref={editButton} type="button" className="lag-journal-action" disabled={pending} onClick={() => { collections.resetMutation(); setMode("edit"); }}>Edit Collection</button><button type="button" className="lag-journal-button" disabled={pending} onClick={async () => { if (window.confirm(`Delete ${item.title}?`)) { if (await collections.remove(item.id)) returnToList(false); } }}>Delete</button></div></> : null}
          </>}
        </PanelFrame>
      </PanelStage> : null}
    </AnimatePresence>
  </div>;
}
