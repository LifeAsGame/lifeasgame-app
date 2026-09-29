"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { MEDIA_CATEGORIES, MEDIA_STATUSES, type MediaCategory, type MediaCreateRequest, type MediaInfo, type MediaStatus, type MediaUpdateRequest } from "@/shared/api/types";
import { SEMANTIC_CONTROL_STYLE, SAO } from "@/shared/design/tokens";
import CreateSlot, { CreateCategory, useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useMediaQueries } from "./useMediaQueries";

const buttonStyle = { border: "1px solid var(--lag-control-border)", background: "var(--lag-control-bg)", color: "var(--lag-control-text)", borderRadius: "var(--lag-radius-sm)", padding: "7px 10px", fontSize: "0.68rem", letterSpacing: "0.08em" } as const;
const controlStyle = SEMANTIC_CONTROL_STYLE;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string) => text(form, key) === "" ? undefined : Number(text(form, key));
const tags = (form: FormData) => text(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean);

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="space-y-2 px-3"><p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p><button type="button" style={buttonStyle} onClick={retry}>다시 시도</button></div>;
}

function Select({ name, label, values, optional = false, disabled = false, defaultValue = "" }: { name: string; label: string; values: readonly string[]; optional?: boolean; disabled?: boolean; defaultValue?: string }) {
  return <label className="block text-xs" style={{ color: SAO.color.text.label }}>{label}<select name={name} aria-label={label} defaultValue={defaultValue} required={!optional} disabled={disabled} style={controlStyle}><option value="">{optional ? "현재 값 유지…" : "선택…"}</option>{values.map((value) => <option key={value}>{value}</option>)}</select></label>;
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
    <Select name="category" label="등록할 분류" values={MEDIA_CATEGORIES} disabled={pending} />
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>제목<input name="title" required disabled={pending} style={controlStyle} /></label>
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>원제<input name="originalTitle" disabled={pending} style={controlStyle} /></label>
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>현재 회차<input name="currentEpisode" type="number" min="0" disabled={pending} style={controlStyle} /></label>
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>전체 회차<input name="totalEpisode" type="number" min="1" disabled={pending} style={controlStyle} /></label>
    <Select name="status" label="상태" values={MEDIA_STATUSES} disabled={pending} />
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>태그 (쉼표로 구분)<input name="tags" disabled={pending} style={controlStyle} /></label>
    <button type="submit" disabled={pending} style={buttonStyle}>{pending ? "저장 중…" : "감상 기록 저장"}</button>
  </form>;
}

function Detail({ item, pending, update, remove, rate, advance, markStatus, rewatch }: { item: MediaInfo; pending: boolean; update: (body: MediaUpdateRequest) => Promise<boolean>; remove: () => Promise<boolean>; rate: (score: number) => Promise<boolean>; advance: () => Promise<boolean>; markStatus: (status: MediaStatus) => Promise<boolean>; rewatch: () => Promise<boolean> }) {
  const { confirm, dialog } = useSaoConfirm();
  return <div className="space-y-3 px-3">{dialog}
    <InfoCard>{item.title}</InfoCard><GoldRow>감상 기록 #{item.id}</GoldRow><GoldRow>분류: {item.category}</GoldRow><GoldRow>원제: {item.originalTitle ?? "미등록"}</GoldRow><GoldRow>진행: {item.currentEpisode}/{item.totalEpisode}</GoldRow><GoldRow>상태: {item.status}</GoldRow><GoldRow>평점: {item.rating ?? "평점 없음"}</GoldRow><GoldRow>태그: {item.tags.length ? item.tags.join(", ") : "미등록"}</GoldRow><GoldRow>재감상 횟수: {item.rewatchCount}</GoldRow><GoldRow>시작일: {item.startedOn ?? "미등록"}</GoldRow><GoldRow>완료일: {item.finishedOn ?? "미등록"}</GoldRow><GoldRow>생성일: {item.createdAt}</GoldRow><GoldRow>수정일: {item.updatedAt}</GoldRow>
    <form key={`${item.id}-${item.rating}`} className="space-y-2" aria-label="감상 평점" onSubmit={(event) => { event.preventDefault(); const score = number(new FormData(event.currentTarget), "score"); if (score !== undefined) void rate(score); }}>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>평점<input name="score" aria-label="평점" type="number" min="0" max="5" step="0.1" defaultValue={item.rating ?? ""} required disabled={pending} style={controlStyle} /></label>
      <button type="submit" disabled={pending} style={buttonStyle}>평점 저장</button>
    </form>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={pending || item.status === "COMPLETED" || item.currentEpisode === item.totalEpisode} style={buttonStyle} onClick={() => void advance()}>다음 회차</button><button type="button" disabled={pending} style={buttonStyle} onClick={() => void rewatch()}>다시 감상</button></div>
    <form key={`${item.id}-${item.status}`} className="space-y-2" aria-label="감상 진행 상태 변경" onSubmit={(event) => { event.preventDefault(); const status = text(new FormData(event.currentTarget), "commandStatus") as MediaStatus; if (status !== item.status) void markStatus(status); }}>
      <Select name="commandStatus" label="변경할 진행 상태" values={MEDIA_STATUSES} defaultValue={item.status} disabled={pending} />
      <button type="submit" disabled={pending} style={buttonStyle}>상태 저장</button>
    </form>
    <form key={`${item.id}-${item.updatedAt}`} className="space-y-2" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = text(form, "title"); const originalTitle = text(form, "originalTitle"); const currentEpisode = number(form, "currentEpisode"); const totalEpisode = number(form, "totalEpisode"); const mediaTags = tags(form); const category = text(form, "category"); const status = text(form, "status");
      void update({ ...(category ? { category: category as MediaCategory } : {}), ...(title ? { title } : {}), ...(originalTitle ? { originalTitle } : {}), ...(currentEpisode !== undefined ? { currentEpisode } : {}), ...(totalEpisode !== undefined ? { totalEpisode } : {}), ...(status ? { status: status as MediaStatus } : {}), ...(mediaTags.length ? { tags: mediaTags } : {}) });
    }}>
      <Select name="category" label="변경할 분류" values={MEDIA_CATEGORIES} optional disabled={pending} /><label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 제목<input name="title" disabled={pending} style={controlStyle} /></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 원제<input name="originalTitle" disabled={pending} style={controlStyle} /></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 현재 회차<input name="currentEpisode" type="number" min="0" disabled={pending} style={controlStyle} /></label><label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 전체 회차<input name="totalEpisode" type="number" min="1" disabled={pending} style={controlStyle} /></label><Select name="status" label="변경할 상태" values={MEDIA_STATUSES} optional disabled={pending} /><label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 태그<input name="tags" disabled={pending} style={controlStyle} /></label>
      <p className="text-xs" style={{ color: SAO.color.text.label }}>빈 항목은 현재 값을 유지합니다.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={pending} style={buttonStyle}>감상 기록 저장</button><button type="button" disabled={pending || item.originalTitle === null} style={buttonStyle} onClick={() => void update({ originalTitle: "" })}>원제 지우기</button><button type="button" disabled={pending || item.tags.length === 0} style={buttonStyle} onClick={() => void update({ tags: [] })}>태그 지우기</button><button type="button" disabled={pending} style={buttonStyle} onClick={async () => { if (await confirm(`“${item.title}” 감상 기록을 삭제할까요?`)) void remove(); }}>삭제</button></div>
    </form>
  </div>;
}

export default function MediaShell({ createRequest = 0 }: { createRequest?: number }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const media = useMediaQueries();
  const [detailVisible, setDetailVisible] = useState(true);
  useEffect(() => { if (creation.creating) setDetailVisible(false); }, [creation.creating]);
  const select = (id: number) => { setDetailVisible(true); media.select(id); };
  const [category, setCategory] = useState<MediaCategory | "">(""); const [status, setStatus] = useState<MediaStatus | "">(""); const [titleLike, setTitleLike] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = media.pendingMutation !== null; const nextDisabled = media.list.loading || media.list.items.length < media.params.size;

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const searchImmediately = (nextCategory: MediaCategory | "", nextStatus: MediaStatus | "") => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    media.search(nextCategory || undefined, nextStatus || undefined, titleLike);
  };

  const changeTitle = (value: string) => {
    setTitleLike(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => media.search(category || undefined, status || undefined, value), 200);
  };

  return (
    <div className="lag-panel-rail lag-semantic-controls relative" data-testid="media-shell">{dialog}
      <PanelStage stageKey="lifelog-media-list" index={1}>
        <PanelFrame title="감상 기록" depth={1} backButton={creation.creating ? <BackButton label="목록으로" onClick={creation.close} /> : undefined}>
        <CreateCategory title="감상 기록" onOpen={creation.close} onCreate={creation.open} />
        <CreateSlot creating={creation.creating} pending={pending} onClose={creation.close} list={<>
          <details><summary>검색 조건</summary><div className="space-y-3 px-3">
            <div className="space-y-2">
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>
                분류 필터
                <select
                  aria-label="분류 필터"
                  value={category}
                  onChange={(event) => {
                    const next = event.target.value as MediaCategory | "";
                    setCategory(next);
                    searchImmediately(next, status);
                  }}
                  style={controlStyle}
                >
                  <option value="">전체 분류</option>
                  {MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>
                상태 필터
                <select
                  aria-label="상태 필터"
                  value={status}
                  onChange={(event) => {
                    const next = event.target.value as MediaStatus | "";
                    setStatus(next);
                    searchImmediately(category, next);
                  }}
                  style={controlStyle}
                >
                  <option value="">전체 상태</option>
                  {MEDIA_STATUSES.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="block text-xs" style={{ color: SAO.color.text.label }}>
                제목 검색
                <input aria-label="제목 검색" value={titleLike} onChange={(event) => changeTitle(event.target.value)} style={controlStyle} />
              </label>
            </div>

          </div>
        </details>
          <div className="space-y-3">
            {media.list.loading && !media.list.items.length ? <InfoCard>감상 기록을 불러오는 중…</InfoCard> : null}
            {media.list.error ? <ErrorState message={media.list.error} retry={() => void media.list.reload()} /> : null}
            {!media.list.loading && !media.list.error && !media.list.items.length ? <InfoCard>감상 기록이 없습니다.</InfoCard> : null}
            {media.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{media.mutationError}</p> : null}
            <div className="space-y-2">
              {media.list.items.map((item, index) => <PanelCard key={item.id} label={item.title} slotLabel={item.category.slice(0, 2)} subtitle={`${item.status} · ${item.currentEpisode}/${item.totalEpisode}`} selected={media.selectedId === item.id} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={async (type) => { if (type === "edit") select(item.id); else if (await confirm(`${item.title} 기록을 삭제할까요?`)) await media.remove(item.id); }} onClick={() => select(item.id)} />)}
            </div>
            <div className="flex items-center justify-between gap-2 px-3">
              <button type="button" disabled={media.list.loading || media.params.page === 0} style={buttonStyle} onClick={() => media.changePage(media.params.page - 1)}>이전</button>
              <span className="text-xs" style={{ color: SAO.color.text.label }}>페이지 {media.params.page + 1}</span>
              <button type="button" disabled={nextDisabled} style={buttonStyle} onClick={() => media.changePage(media.params.page + 1)}>다음</button>
            </div>
          </div>
        </>}><CreateForm pending={pending} create={(body) => creation.save(() => media.create(body))} />
          {media.mutationError ? <p role="alert">{media.mutationError}</p> : null}
        </CreateSlot>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {detailVisible && !creation.creating && media.detail ? (
          <PanelStage stageKey="lifelog-media-detail" index={2}>
            <PanelFrame title="감상 기록 상세" depth={0} contentKey={media.detail.id}>
              <Detail item={media.detail} pending={pending} update={(body) => media.update(media.detail!.id, body)} remove={() => media.remove(media.detail!.id)} rate={(score) => media.rate(media.detail!.id, score)} advance={() => media.advance(media.detail!.id)} markStatus={(next) => media.markStatus(media.detail!.id, next)} rewatch={() => media.rewatch(media.detail!.id)} />
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
