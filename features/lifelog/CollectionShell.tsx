"use client";

import { useState } from "react";

import {
  COLLECTION_CATEGORIES,
  type CollectionCategory,
  type CollectionCreateRequest,
  type CollectionInfo,
} from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useCollectionQueries } from "./useCollectionQueries";

const buttonStyle = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function optional(form: FormData, key: string): string | undefined {
  return text(form, key) || undefined;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>Retry</button>
    </div>
  );
}

function CategorySelect({ name, label, optional: allowEmpty = false, disabled = false }: { name: string; label: string; optional?: boolean; disabled?: boolean }) {
  return (
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>
      {label}
      <select name={name} aria-label={label} defaultValue="" required={!allowEmpty} disabled={disabled} style={INPUT_STYLE}>
        <option value="">{allowEmpty ? "All Categories" : "Select..."}</option>
        {COLLECTION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
    </label>
  );
}

function CreateForm({ pending, create }: { pending: boolean; create: (body: CollectionCreateRequest) => Promise<boolean> }) {
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const originalTitle = optional(form, "originalTitle");
    const conditionNote = optional(form, "conditionNote");
    const acquiredFrom = optional(form, "acquiredFrom");
    const tags = text(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean);
    const saved = await create({
      category: text(form, "category") as CollectionCategory,
      title: text(form, "title"),
      quantity: Number(text(form, "quantity")),
      ...(originalTitle ? { originalTitle } : {}),
      ...(conditionNote ? { conditionNote } : {}),
      ...(acquiredFrom ? { acquiredFrom } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    });
    if (saved) element.reset();
  };

  return (
    <form className="mt-3 space-y-2" onSubmit={submit}>
      <CategorySelect name="category" label="Create category" disabled={pending} />
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Title<input name="title" required disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Original title<input name="originalTitle" disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Quantity<input name="quantity" type="number" min={1} required disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Condition note<input name="conditionNote" disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Acquired from<input name="acquiredFrom" disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Tags, comma separated<input name="tags" disabled={pending} style={INPUT_STYLE} /></label>
      <button type="submit" disabled={pending} style={buttonStyle}>{pending ? "Saving..." : "Create Collection"}</button>
    </form>
  );
}

function CollectionDetail({
  item,
  pending,
  update,
  remove,
}: {
  item: CollectionInfo;
  pending: boolean;
  update: (body: { quantity: number; conditionNote: string; acquiredFrom: string }) => Promise<boolean>;
  remove: () => Promise<boolean>;
}) {
  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void update({
      quantity: Number(text(form, "quantity")),
      conditionNote: text(form, "conditionNote"),
      acquiredFrom: text(form, "acquiredFrom"),
    });
  };

  return (
    <div className="space-y-3 px-3">
      <InfoCard>{item.title}</InfoCard>
      <GoldRow>Collection source #{item.id}</GoldRow>
      <GoldRow>Category: {item.category}</GoldRow>
      <GoldRow>Original title: {item.originalTitle ?? "Not recorded"}</GoldRow>
      <GoldRow>Tags: {item.tags.length > 0 ? item.tags.join(", ") : "Not recorded"}</GoldRow>
      <GoldRow>Created: {item.createdAt}</GoldRow>
      <GoldRow>Updated: {item.updatedAt}</GoldRow>
      <form key={`${item.id}-${item.updatedAt}`} className="space-y-2" onSubmit={submit}>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update quantity<input name="quantity" type="number" min={1} required defaultValue={item.quantity ?? 1} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update condition note<input name="conditionNote" defaultValue={item.conditionNote ?? ""} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update acquired from<input name="acquiredFrom" defaultValue={item.acquiredFrom ?? ""} disabled={pending} style={INPUT_STYLE} /></label>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "Working..." : "Update Collection"}</button>
          <button type="button" disabled={pending} style={buttonStyle} onClick={() => {
            if (window.confirm(`Delete ${item.title}?`)) void remove();
          }}>Delete</button>
        </div>
      </form>
    </div>
  );
}

export default function CollectionShell() {
  const collections = useCollectionQueries();
  const [category, setCategory] = useState<CollectionCategory | "">("");
  const [titleLike, setTitleLike] = useState("");
  const pending = collections.pendingMutation !== null;
  const nextDisabled = collections.list.loading || collections.list.items.length < collections.params.size;

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="collection-shell">
      <PanelFrame title="Collection Search" depth={2}>
        <div className="space-y-3 px-3">
          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            collections.search(category || undefined, titleLike);
          }}>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>
              Category filter
              <select aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value as CollectionCategory | "")} style={INPUT_STYLE}>
                <option value="">All Categories</option>
                {COLLECTION_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>Title search<input aria-label="Title search" value={titleLike} onChange={(event) => setTitleLike(event.target.value)} style={INPUT_STYLE} /></label>
            <button type="submit" style={buttonStyle}>Search</button>
          </form>
          <details>
            <summary className="cursor-pointer text-xs" style={{ color: SAO.color.text.gold }}>Add Collection</summary>
            <CreateForm pending={pending} create={collections.create} />
          </details>
        </div>
      </PanelFrame>

      <PanelFrame title="Collections" depth={1}>
        <div className="space-y-3">
          {collections.list.loading && collections.list.items.length === 0 ? <InfoCard>Loading Collections...</InfoCard> : null}
          {collections.list.error ? <ErrorState message={collections.list.error} retry={() => void collections.list.reload()} /> : null}
          {!collections.list.loading && !collections.list.error && collections.list.items.length === 0 ? <InfoCard>No Collections.</InfoCard> : null}
          {collections.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{collections.mutationError}</p> : null}
          <div className="space-y-2">
            {collections.list.items.map((item, index) => (
              <PanelCard
                key={item.id}
                label={item.title}
                slotLabel={`x${item.quantity}`}
                subtitle={`${item.category} · ${item.conditionNote ?? "No condition note"}`}
                selected={collections.selectedId === item.id}
                index={index}
                onClick={() => collections.select(item.id)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-3">
            <button type="button" disabled={collections.list.loading || collections.params.page === 0} style={buttonStyle} onClick={() => collections.changePage(collections.params.page - 1)}>Previous</button>
            <span className="text-xs" style={{ color: SAO.color.text.label }}>Page {collections.params.page + 1}</span>
            <button type="button" disabled={nextDisabled} style={buttonStyle} onClick={() => collections.changePage(collections.params.page + 1)}>Next</button>
          </div>
        </div>
      </PanelFrame>

      <PanelFrame title="Collection Detail" depth={0}>
        {!collections.selectedId ? <InfoCard>Select a Collection.</InfoCard> : null}
        {collections.detail.loading && !collections.detail.data ? <InfoCard>Loading Collection...</InfoCard> : null}
        {collections.detail.error ? <ErrorState message={collections.detail.error} retry={() => void collections.detail.retry()} /> : null}
        {collections.detail.data ? (
          <CollectionDetail
            item={collections.detail.data}
            pending={pending}
            update={(body) => collections.update(collections.detail.data!.id, body)}
            remove={() => collections.remove(collections.detail.data!.id)}
          />
        ) : null}
      </PanelFrame>
    </div>
  );
}
