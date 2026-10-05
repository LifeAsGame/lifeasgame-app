"use client";

import { useEffect, useRef, useState } from "react";
import { MEDIA_CATEGORIES, MEDIA_STATUSES, type MediaCategory, type MediaCreateRequest, type MediaInfo, type MediaStatus, type MediaUpdateRequest } from "@/shared/api/types";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import CreateSlot, { useCreateMode } from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useMediaQueries } from "./useMediaQueries";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string) => text(form, key) === "" ? undefined : Number(text(form, key));
const tags = (form: FormData) => text(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean);

function Select({ name, label, values, defaultValue = "", required = false, onChange }: { name: string; label: string; values: readonly string[]; defaultValue?: string; required?: boolean; onChange?: (value: string) => void }) {
  return <label>{label}<select className="lag-role-control" name={name} aria-label={label} defaultValue={defaultValue} required={required} onChange={(event) => onChange?.(event.target.value)}><option value="">선택…</option>{values.map((value) => <option key={value} value={value}>{consumerLabel(value)}</option>)}</select></label>;
}

function MediaForm({ item, category, pending, save, rate, advance, markStatus, rewatch }: {
  item?: MediaInfo; category: MediaCategory | ""; pending: boolean;
  save: (body: MediaCreateRequest | MediaUpdateRequest) => Promise<boolean>;
  rate?: (score: number) => Promise<boolean>; advance?: () => Promise<boolean>; markStatus?: (status: MediaStatus) => Promise<boolean>; rewatch?: () => Promise<boolean>;
}) {
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget, form = new FormData(element), originalTitle = text(form, "originalTitle"), currentEpisode = number(form, "currentEpisode"), totalEpisode = number(form, "totalEpisode"), mediaTags = tags(form);
    const body = { category: text(form, "category") as MediaCategory, title: text(form, "title"), status: text(form, "status") as MediaStatus,
      ...(originalTitle ? { originalTitle } : {}), ...(currentEpisode !== undefined ? { currentEpisode } : {}), ...(totalEpisode !== undefined ? { totalEpisode } : {}), ...(mediaTags.length ? { tags: mediaTags } : {}) };
    if (await save(body)) element.reset();
  };
  return <div className="lag-lifelog-form">
    <form className="lag-role-form" onSubmit={submit}>
      <Select name="category" label="분류" values={MEDIA_CATEGORIES} defaultValue={item?.category ?? category} required />
      <label>제목<input className="lag-role-control" name="title" required defaultValue={item?.title ?? ""} /></label>
      <label>원제<input className="lag-role-control" name="originalTitle" defaultValue={item?.originalTitle ?? ""} /></label>
      <label>현재 회차<input className="lag-role-control" name="currentEpisode" type="number" min={0} defaultValue={item?.currentEpisode ?? ""} /></label>
      <label>전체 회차<input className="lag-role-control" name="totalEpisode" type="number" min={1} defaultValue={item?.totalEpisode ?? ""} /></label>
      <Select name="status" label="상태" values={MEDIA_STATUSES} defaultValue={item?.status} required />
      <label>태그 (쉼표로 구분)<input className="lag-role-control" name="tags" defaultValue={item?.tags.join(", ") ?? ""} /></label>
      <button type="submit" disabled={pending} className="lag-role-action">{pending ? "저장 중…" : "감상 기록 저장"}</button>
    </form>
    {item ? <div className="lag-role-form">
      <form className="lag-role-form" aria-label="감상 평점" onSubmit={(event) => { event.preventDefault(); const score = number(new FormData(event.currentTarget), "score"); if (score !== undefined) void rate?.(score); }}>
        <label>평점<input className="lag-role-control" name="score" aria-label="평점" type="number" min={0} max={5} step={0.1} defaultValue={item.rating ?? ""} required /></label>
        <button type="submit" disabled={pending} className="lag-role-button">평점 저장</button>
      </form>
      <div className="lag-role-actions"><button type="button" disabled={pending || item.status === "COMPLETED" || item.currentEpisode === item.totalEpisode} className="lag-role-button" onClick={() => void advance?.()}>다음 회차</button><button type="button" disabled={pending} className="lag-role-button" onClick={() => void rewatch?.()}>다시 감상</button></div>
      <form className="lag-role-form" aria-label="감상 진행 상태 변경" onSubmit={(event) => { event.preventDefault(); const status = text(new FormData(event.currentTarget), "commandStatus") as MediaStatus; if (status !== item.status) void markStatus?.(status); }}>
        <Select name="commandStatus" label="진행 상태" values={MEDIA_STATUSES} defaultValue={item.status} required />
        <button type="submit" disabled={pending} className="lag-role-button">상태 저장</button>
      </form>
      <div className="lag-role-actions"><button type="button" disabled={pending || item.originalTitle === null} className="lag-role-button" onClick={() => void save({ originalTitle: "" })}>원제 지우기</button><button type="button" disabled={pending || !item.tags.length} className="lag-role-button" onClick={() => void save({ tags: [] })}>태그 지우기</button></div>
    </div> : null}
  </div>;
}

function MediaDetail({ item }: { item: MediaInfo }) {
  const rows = [["분류", consumerLabel(item.category)], ["원제", item.originalTitle ?? "미등록"], ["진행", String(item.currentEpisode) + "/" + String(item.totalEpisode)], ["상태", consumerLabel(item.status)], ["평점", item.rating ?? "평점 없음"], ["태그", item.tags.join(" · ") || "미등록"], ["재감상 횟수", item.rewatchCount], ["시작일", item.startedOn ?? "미등록"], ["완료일", item.finishedOn ?? "미등록"], ["생성일", item.createdAt], ["수정일", item.updatedAt]] as const;
  return <article className="lag-role-detail lag-lifelog-detail"><h4>{item.title}</h4><dl>{rows.map(([label, value]) => <div key={label} className="lag-role-data-row"><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>;
}

export default function MediaShell({ createRequest = 0, initialRecord }: { createRequest?: number; initialRecord?: { id: number; category: MediaCategory; title: string } }) {
  const media = useMediaQueries(), creation = useCreateMode(createRequest), { confirm, dialog } = useSaoConfirm();
  const compact = useMediaQuery("(max-width: 1199px)");
  const [category, setCategory] = useState<MediaCategory | "" | null>(null);
  const [status, setStatus] = useState<MediaStatus | "">("");
  const [titleLike, setTitleLike] = useState("");
  const [detailVisible, setDetailVisible] = useState(false), [editing, setEditing] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumped = useRef(false);
  const pending = media.pendingMutation !== null;
  // The request counter is the external creation event; query methods change identity on render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (createRequest) { setCategory(""); setDetailVisible(false); media.search(); } }, [createRequest]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!initialRecord) return; setCategory(initialRecord.category); setTitleLike(initialRecord.title); media.search(initialRecord.category, undefined, initialRecord.title); }, [initialRecord?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!initialRecord || jumped.current || media.params.category !== initialRecord.category || media.params.titleLike !== initialRecord.title || media.list.loading || !media.list.items.some((item) => item.id === initialRecord.id)) return; jumped.current = true; media.select(initialRecord.id); setDetailVisible(true); }, [initialRecord?.id, media.params, media.list.loading, media.list.items]);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);
  const choose = (next: MediaCategory, create = false) => { if (searchTimer.current) clearTimeout(searchTimer.current); setCategory(next); setStatus(""); setTitleLike(""); setDetailVisible(false); setEditing(false); media.search(next); if (create) creation.open(); else creation.close(); };
  const select = (id: number, edit = false) => { media.select(id); setDetailVisible(true); setEditing(edit); };
  const backToList = () => { media.clearSelection(); setDetailVisible(false); setEditing(false); };
  const search = (nextStatus = status, nextTitle = titleLike) => media.search(category || undefined, nextStatus || undefined, nextTitle);
  const selected = detailVisible && !creation.creating && media.selectedId !== null && media.detail?.id === media.selectedId ? media.detail : null;
  return <div className="lag-panel-rail lag-lifelog-shell" data-testid="media-shell">{dialog}
    <PanelStage stageKey="lifelog-media-categories" parentStageKey="lifelog-stage-0" panelRole="list" inactive={compact && category !== null}>
      <PanelFrame title="감상 분류" depth={1} centerSelected centerTargetKey={category} centerBehavior="spring"><div className="lag-role-node-list lag-lifelog-categories">{MEDIA_CATEGORIES.map((kind) => <SwipeButton key={kind} creation className="lag-role-node" aria-pressed={category === kind} data-scroll-center-target={category === kind ? "true" : undefined} onClick={() => choose(kind)} onDoubleClick={() => choose(kind, true)}><span className="lag-role-node-mark" aria-hidden>{consumerLabel(kind).slice(0, 1)}</span><strong>{consumerLabel(kind)}</strong></SwipeButton>)}</div></PanelFrame>
    </PanelStage>
    {category !== null ? <PanelStage stageKey="lifelog-media-list" parentStageKey="lifelog-media-categories" panelRole="list" inactive={compact && selected !== null}>
      <PanelFrame title={creation.creating ? "감상 기록 등록" : category ? consumerLabel(category) + " 목록" : "감상 기록 목록"} depth={1} centerSelected={!creation.creating} centerTargetKey={creation.creating ? null : media.selectedId} centerBehavior="spring" backButton={<BackButton label={creation.creating ? "감상 목록으로" : "감상 분류로"} onClick={() => { if (creation.creating) creation.close(); else { backToList(); setCategory(null); } }} />}>
        <CreateSlot creating={creation.creating} pending={pending} onClose={creation.close} showCancel={false} list={<div className="lag-role-detail">
          <details><summary>검색 조건</summary><div className="lag-lifelog-search"><Select name="status-filter" label="상태 필터" values={MEDIA_STATUSES} defaultValue={status} onChange={(value) => { const next = value as MediaStatus | ""; setStatus(next); search(next); }} /><label>제목 검색<input className="lag-role-control" aria-label="제목 검색" value={titleLike} onChange={(event) => { const next = event.target.value; setTitleLike(next); if (searchTimer.current) clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => search(status, next), 200); }} /></label></div></details>
          {media.list.loading && !media.list.items.length ? <InfoCard>감상 기록을 불러오는 중…</InfoCard> : null}
          {media.list.error ? <p role="alert">{media.list.error} <button type="button" className="lag-role-button" onClick={() => void media.list.reload()}>다시 조회</button></p> : null}
          {media.mutationError ? <p role="alert">{media.mutationError}</p> : null}
          {!media.list.loading && !media.list.error && !media.list.items.length ? <InfoCard>감상 기록이 없습니다.</InfoCard> : null}
          <div className="lag-role-node-list">{media.list.items.map((item) => <RecordRow key={item.id} title={item.title} subtitle={consumerLabel(item.category) + " · " + consumerLabel(item.status) + " · " + item.currentEpisode + "/" + item.totalEpisode} selected={media.selectedId === item.id} disabled={pending} onSelect={() => select(item.id)} onEdit={() => select(item.id, true)} onArchive={async () => { if (await confirm("“" + item.title + "” 감상 기록을 삭제할까요?")) { await media.remove(item.id); backToList(); } }} />)}</div>
          <div className="lag-journal-pagination"><button type="button" disabled={media.list.loading || media.params.page === 0} onClick={() => { backToList(); media.changePage(media.params.page - 1); }}>이전</button><span>페이지 {media.params.page + 1}</span><button type="button" disabled={media.list.loading || media.list.items.length < media.params.size} onClick={() => { backToList(); media.changePage(media.params.page + 1); }}>다음</button></div>
        </div>}><MediaForm category={category} pending={pending} save={(body) => creation.save(() => media.create(body as MediaCreateRequest))} />{media.mutationError ? <p role="alert">{media.mutationError}</p> : null}</CreateSlot>
      </PanelFrame>
    </PanelStage> : null}
    {selected ? <PanelStage stageKey="lifelog-media-detail" parentStageKey="lifelog-media-list" panelRole="detail"><PanelFrame title={editing ? "감상 기록 수정" : "감상 기록 상세"} depth={0} backButton={<BackButton label={editing ? "감상 기록 상세로" : "감상 목록으로"} onClick={editing ? () => setEditing(false) : backToList} />}>
      {editing ? <MediaForm item={selected} category={selected.category} pending={pending} save={async (body) => { const saved = await media.update(selected.id, body); if (saved) setEditing(false); return saved; }} rate={(score) => media.rate(selected.id, score)} advance={() => media.advance(selected.id)} markStatus={(next) => media.markStatus(selected.id, next)} rewatch={() => media.rewatch(selected.id)} /> : <MediaDetail item={selected} />}
    </PanelFrame></PanelStage> : null}
  </div>;
}
