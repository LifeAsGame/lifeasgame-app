"use client";

import { useState } from "react";

import { MEDIA_CATEGORIES, MEDIA_STATUSES, type MediaCategory, type MediaCreateRequest, type MediaInfo, type MediaStatus, type MediaUpdateRequest } from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useMediaQueries } from "./useMediaQueries";

const buttonStyle = { border: `1px solid ${SAO.color.border.panel}`, background: SAO.color.bg.inset, color: SAO.color.text.secondary, borderRadius: SAO.radius.panel, padding: "7px 10px", fontSize: "0.68rem", letterSpacing: "0.08em" } as const;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string) => text(form, key) === "" ? undefined : Number(text(form, key));
const tags = (form: FormData) => text(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean);

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="space-y-2 px-3"><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p><button type="button" style={buttonStyle} onClick={retry}>Retry</button></div>;
}

function Select({ name, label, values, optional = false, disabled = false, defaultValue = "" }: { name: string; label: string; values: readonly string[]; optional?: boolean; disabled?: boolean; defaultValue?: string }) {
  return <label className="block text-xs" style={{ color: SAO.color.text.label }}>{label}<select name={name} aria-label={label} defaultValue={defaultValue} required={!optional} disabled={disabled} style={INPUT_STYLE}><option value="">{optional ? "Preserve..." : "Select..."}</option>{values.map((value) => <option key={value}>{value}</option>)}</select></label>;
}

function CreateForm({ pending, create }: { pending: boolean; create: (body: MediaCreateRequest) => Promise<boolean> }) {
  return <form className="mt-3 space-y-2" onSubmit={async (event) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const originalTitle = text(form, "originalTitle");
    const currentEpisode = number(form, "currentEpisode");
    const totalEpisode = number(form, "totalEpisode");
    const mediaTags = tags(form);
    const saved = await create({ category: text(form, "category") as MediaCategory, title: text(form, "title"), status: text(form, "status") as MediaStatus, ...(originalTitle ? { originalTitle } : {}), ...(currentEpisode !== undefined ? { currentEpisode } : {}), ...(totalEpisode !== undefined ? { totalEpisode } : {}), ...(mediaTags.length ? { tags: mediaTags } : {}) });
    if (saved) element.reset();
  }}>
    <Select name="category" label="Create category" values={MEDIA_CATEGORIES} disabled={pending} />
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>Title<input name="title" required disabled={pending} style={INPUT_STYLE} /></label>
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>Original title<input name="originalTitle" disabled={pending} style={INPUT_STYLE} /></label>
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>Current episode<input name="currentEpisode" type="number" min="0" disabled={pending} style={INPUT_STYLE} /></label>
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>Total episode<input name="totalEpisode" type="number" min="1" disabled={pending} style={INPUT_STYLE} /></label>
    <Select name="status" label="Create status" values={MEDIA_STATUSES} disabled={pending} />
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>Tags, comma separated<input name="tags" disabled={pending} style={INPUT_STYLE} /></label>
    <button type="submit" disabled={pending} style={buttonStyle}>{pending ? "Saving..." : "Create Media"}</button>
  </form>;
}

function Detail({ item, pending, update, remove, rate, advance, markStatus, rewatch }: { item: MediaInfo; pending: boolean; update: (body: MediaUpdateRequest) => Promise<boolean>; remove: () => Promise<boolean>; rate: (score: number) => Promise<boolean>; advance: () => Promise<boolean>; markStatus: (status: MediaStatus) => Promise<boolean>; rewatch: () => Promise<boolean> }) {
  return <div className="space-y-3 px-3">
    <InfoCard>{item.title}</InfoCard><GoldRow>Media source #{item.id}</GoldRow><GoldRow>Category: {item.category}</GoldRow><GoldRow>Original title: {item.originalTitle ?? "Not recorded"}</GoldRow><GoldRow>Progress: {item.currentEpisode}/{item.totalEpisode}</GoldRow><GoldRow>Status: {item.status}</GoldRow><GoldRow>Rating: {item.rating ?? "Not rated"}</GoldRow><GoldRow>Tags: {item.tags.length ? item.tags.join(", ") : "Not recorded"}</GoldRow><GoldRow>Rewatch count: {item.rewatchCount}</GoldRow><GoldRow>Started: {item.startedOn ?? "Not recorded"}</GoldRow><GoldRow>Finished: {item.finishedOn ?? "Not recorded"}</GoldRow><GoldRow>Created: {item.createdAt}</GoldRow><GoldRow>Updated: {item.updatedAt}</GoldRow>
    <form key={`${item.id}-${item.rating}`} className="space-y-2" aria-label="Rate Media" onSubmit={(event) => { event.preventDefault(); const score = number(new FormData(event.currentTarget), "score"); if (score !== undefined) void rate(score); }}>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Rating score<input name="score" aria-label="Rating score" type="number" min="0" max="5" step="0.1" defaultValue={item.rating ?? ""} required disabled={pending} style={INPUT_STYLE} /></label>
      <button type="submit" disabled={pending} style={buttonStyle}>Rate</button>
    </form>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={pending || item.status === "COMPLETED" || item.currentEpisode === item.totalEpisode} style={buttonStyle} onClick={() => void advance()}>Advance +1</button><button type="button" disabled={pending} style={buttonStyle} onClick={() => void rewatch()}>Rewatch</button></div>
    <form key={`${item.id}-${item.status}`} className="space-y-2" aria-label="Mark Media Status" onSubmit={(event) => { event.preventDefault(); const status = text(new FormData(event.currentTarget), "commandStatus") as MediaStatus; if (status !== item.status) void markStatus(status); }}>
      <Select name="commandStatus" label="Command status" values={MEDIA_STATUSES} defaultValue={item.status} disabled={pending} />
      <button type="submit" disabled={pending} style={buttonStyle}>Mark Status</button>
    </form>
    <form key={`${item.id}-${item.updatedAt}`} className="space-y-2" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = text(form, "title"); const originalTitle = text(form, "originalTitle"); const currentEpisode = number(form, "currentEpisode"); const totalEpisode = number(form, "totalEpisode"); const mediaTags = tags(form); const category = text(form, "category"); const status = text(form, "status");
      void update({ ...(category ? { category: category as MediaCategory } : {}), ...(title ? { title } : {}), ...(originalTitle ? { originalTitle } : {}), ...(currentEpisode !== undefined ? { currentEpisode } : {}), ...(totalEpisode !== undefined ? { totalEpisode } : {}), ...(status ? { status: status as MediaStatus } : {}), ...(mediaTags.length ? { tags: mediaTags } : {}) });
    }}>
      <Select name="category" label="Update category" values={MEDIA_CATEGORIES} optional disabled={pending} /><label className="block text-xs" style={{ color: SAO.color.text.label }}>Update title<input name="title" disabled={pending} style={INPUT_STYLE} /></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>Update original title<input name="originalTitle" disabled={pending} style={INPUT_STYLE} /></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>Update current episode<input name="currentEpisode" type="number" min="0" disabled={pending} style={INPUT_STYLE} /></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>Update total episode<input name="totalEpisode" type="number" min="1" disabled={pending} style={INPUT_STYLE} /></label><Select name="status" label="Update status" values={MEDIA_STATUSES} optional disabled={pending} /><label className="block text-xs" style={{ color: SAO.color.text.label }}>Update tags<input name="tags" disabled={pending} style={INPUT_STYLE} /></label>
      <p className="text-xs" style={{ color: SAO.color.text.label }}>Untouched blank fields preserve current values.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={pending} style={buttonStyle}>Update Media</button><button type="button" disabled={pending || item.originalTitle === null} style={buttonStyle} onClick={() => void update({ originalTitle: "" })}>Clear Original Title</button><button type="button" disabled={pending || item.tags.length === 0} style={buttonStyle} onClick={() => void update({ tags: [] })}>Clear Tags</button><button type="button" disabled={pending} style={buttonStyle} onClick={() => { if (window.confirm(`Delete ${item.title}?`)) void remove(); }}>Delete</button></div>
    </form>
  </div>;
}

export default function MediaShell() {
  const media = useMediaQueries();
  const [category, setCategory] = useState<MediaCategory | "">(""); const [status, setStatus] = useState<MediaStatus | "">(""); const [titleLike, setTitleLike] = useState("");
  const pending = media.pendingMutation !== null; const nextDisabled = media.list.loading || media.list.items.length < media.params.size;
  return <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="media-shell">
    <PanelFrame title="Media Search" depth={2}><div className="space-y-3 px-3"><form className="space-y-2" onSubmit={(event) => { event.preventDefault(); media.search(category || undefined, status || undefined, titleLike); }}><label className="block text-xs" style={{ color: SAO.color.text.label }}>Category filter<select aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value as MediaCategory | "")} style={INPUT_STYLE}><option value="">All Categories</option>{MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>Status filter<select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value as MediaStatus | "")} style={INPUT_STYLE}><option value="">All Statuses</option>{MEDIA_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>Title search<input aria-label="Title search" value={titleLike} onChange={(event) => setTitleLike(event.target.value)} style={INPUT_STYLE} /></label><button type="submit" style={buttonStyle}>Search</button></form><details><summary className="cursor-pointer text-xs" style={{ color: SAO.color.text.gold }}>Add Media</summary><CreateForm pending={pending} create={media.create} /></details></div></PanelFrame>
    <PanelFrame title="Media" depth={1}><div className="space-y-3">{media.list.loading && !media.list.items.length ? <InfoCard>Loading Media...</InfoCard> : null}{media.list.error ? <ErrorState message={media.list.error} retry={() => void media.list.reload()} /> : null}{!media.list.loading && !media.list.error && !media.list.items.length ? <InfoCard>No Media.</InfoCard> : null}{media.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{media.mutationError}</p> : null}<div className="space-y-2">{media.list.items.map((item, index) => <PanelCard key={item.id} label={item.title} slotLabel={item.category.slice(0, 2)} subtitle={`${item.status} · ${item.currentEpisode}/${item.totalEpisode}`} selected={media.selectedId === item.id} index={index} onClick={() => media.select(item.id)} />)}</div><div className="flex items-center justify-between gap-2 px-3"><button type="button" disabled={media.list.loading || media.params.page === 0} style={buttonStyle} onClick={() => media.changePage(media.params.page - 1)}>Previous</button><span className="text-xs" style={{ color: SAO.color.text.label }}>Page {media.params.page + 1}</span><button type="button" disabled={nextDisabled} style={buttonStyle} onClick={() => media.changePage(media.params.page + 1)}>Next</button></div></div></PanelFrame>
    <PanelFrame title="Media Detail" depth={0}>{media.detail ? <Detail item={media.detail} pending={pending} update={(body) => media.update(media.detail!.id, body)} remove={() => media.remove(media.detail!.id)} rate={(score) => media.rate(media.detail!.id, score)} advance={() => media.advance(media.detail!.id)} markStatus={(next) => media.markStatus(media.detail!.id, next)} rewatch={() => media.rewatch(media.detail!.id)} /> : <InfoCard>Select a Media source.</InfoCard>}</PanelFrame>
  </div>;
}
