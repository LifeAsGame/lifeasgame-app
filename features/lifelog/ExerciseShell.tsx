"use client";

import { useEffect, useRef, useState } from "react";
import { EXERCISE_CATEGORIES, type ExerciseCategory, type ExerciseCreateRequest, type ExerciseInfo, type ExerciseUpdateRequest } from "@/shared/api/types";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { RecordRow } from "@/features/role/RecordRow";
import CreateSlot, { useCreateMode } from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useExerciseQueries } from "./useExerciseQueries";
import LifeLogFolders, { type FolderChoice } from "./LifeLogFolders";
import RecordFolderSelect from "./RecordFolderSelect";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optionalNumber = (form: FormData, key: string) => text(form, key) === "" ? undefined : Number(text(form, key));

function ExerciseForm({ item, category, pending, save }: { item?: ExerciseInfo; category: ExerciseCategory | ""; pending: boolean; save: (body: ExerciseCreateRequest | ExerciseUpdateRequest) => Promise<boolean> }) {
  return <form className="lag-role-form lag-lifelog-form" onSubmit={async (event) => {
    event.preventDefault();
    const element = event.currentTarget, form = new FormData(element), distanceKm = optionalNumber(form, "distanceKm"), calories = optionalNumber(form, "calories"), memo = text(form, "memo");
    const body = { category: text(form, "category") as ExerciseCategory, durationMinutes: Number(text(form, "durationMinutes")), exercisedOn: text(form, "exercisedOn"),
      ...(distanceKm === undefined ? {} : { distanceKm }), ...(calories === undefined ? {} : { calories }), ...(item ? { memo } : memo ? { memo } : {}) };
    if (await save(body)) element.reset();
  }}>
    <label>분류<select className="lag-role-control" name="category" aria-label="등록할 분류" defaultValue={item?.category ?? category} required><option value="">선택…</option>{EXERCISE_CATEGORIES.map((value) => <option key={value} value={value}>{consumerLabel(value)}</option>)}</select></label>
    <label>운동 시간 (분)<input className="lag-role-control" name="durationMinutes" type="number" min={1} required defaultValue={item?.durationMinutes ?? ""} /></label>
    <label>거리 (km)<input className="lag-role-control" name="distanceKm" type="number" min={0} step="any" defaultValue={item?.distanceKm ?? ""} /></label>
    <label>칼로리<input className="lag-role-control" name="calories" type="number" min={0} defaultValue={item?.calories ?? ""} /></label>
    <label>운동 날짜<input className="lag-role-control" name="exercisedOn" type="date" min="1000-01-01" required defaultValue={item?.exercisedOn ?? ""} /></label>
    <label>메모<textarea className="lag-role-control" name="memo" defaultValue={item?.memo ?? ""} /></label>
    {item ? <p>빈 수치 항목은 현재 값을 유지합니다. 수치 지우기는 지원하지 않습니다.</p> : null}
    <button type="submit" disabled={pending} className="lag-role-action">{pending ? "저장 중…" : "운동 기록 저장"}</button>
  </form>;
}

function ExerciseDetail({ item }: { item: ExerciseInfo }) {
  const rows = [["분류", consumerLabel(item.category)], ["운동 날짜", item.exercisedOn], ["운동 시간", item.durationMinutes + "분"], ["거리", item.distanceKm === null ? "미등록" : item.distanceKm + " km"], ["칼로리", item.calories === null ? "미등록" : item.calories + " kcal"], ["메모", item.memo ?? "미등록"], ["생성일", item.createdAt], ["수정일", item.updatedAt]] as const;
  return <article className="lag-role-detail lag-lifelog-detail"><h4>{consumerLabel(item.category)} · {item.exercisedOn}</h4><dl>{rows.map(([label, value]) => <div key={label} className="lag-role-data-row"><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>;
}

export default function ExerciseShell({ createRequest = 0, initialRecord }: { createRequest?: number; initialRecord?: { id: number; category: ExerciseCategory; exercisedOn: string } }) {
  const exercises = useExerciseQueries(), creation = useCreateMode(), { confirm, dialog } = useSaoConfirm();
  const compact = useMediaQuery("(max-width: 1199px)");
  const [category, setCategory] = useState<ExerciseCategory | "" | null>(null);
  const [folder, setFolder] = useState<FolderChoice | null>(null);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [detailVisible, setDetailVisible] = useState(false), [editing, setEditing] = useState(false);
  const jumped = useRef(false);
  const pending = exercises.pendingMutation !== null;
  useEffect(() => { if (createRequest) { setCategory(null); setFolder(null); setDetailVisible(false); } }, [createRequest]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!initialRecord) return; setFolder({ type: "system", code: initialRecord.category, name: initialRecord.category }); setCategory(initialRecord.category); setFrom(initialRecord.exercisedOn); setTo(initialRecord.exercisedOn); exercises.search(initialRecord.category, initialRecord.exercisedOn, initialRecord.exercisedOn); }, [initialRecord?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!initialRecord || jumped.current || exercises.params.category !== initialRecord.category || exercises.params.from !== initialRecord.exercisedOn || exercises.list.loading || !exercises.list.items.some((item) => item.id === initialRecord.id)) return; jumped.current = true; exercises.select(initialRecord.id); setDetailVisible(true); }, [initialRecord?.id, exercises.params, exercises.list.loading, exercises.list.items]);
  const folderFilter = folder?.type === "personal" ? { personalCategoryId: folder.id } : folder?.type === "unclassified" ? { unclassified: true } : {};
  const choose = (next: FolderChoice, create = false) => { const code = next.type === "system" ? next.code as ExerciseCategory : ""; setFolder(next); setCategory(code); setFrom(""); setTo(""); setDetailVisible(false); setEditing(false); exercises.search(code || undefined, undefined, undefined, next.type === "personal" ? { personalCategoryId: next.id } : next.type === "unclassified" ? { unclassified: true } : {}); if (create) creation.open(); else creation.close(); };
  const select = (id: number, edit = false) => { exercises.select(id); setDetailVisible(true); setEditing(edit); };
  const backToList = () => { exercises.clearSelection(); setDetailVisible(false); setEditing(false); };
  const active = detailVisible && !creation.creating && exercises.selectedId !== null;
  return <div className="lag-panel-rail lag-lifelog-shell" data-testid="exercise-shell">{dialog}
    <LifeLogFolders onCloseChildren={() => { setFolder(null); setCategory(null); exercises.clearSelection(); creation.close(); setDetailVisible(false); setEditing(false); }} kind="EXERCISE" title="운동 기록" stageKey="lifelog-exercise-categories" selected={folder} createRequest={createRequest} onSelect={(next) => choose(next)} onCreateRecord={(next) => choose(next, true)} />
    {folder ? <PanelStage stageKey="lifelog-exercise-list" parentStageKey="lifelog-exercise-categories" panelRole="list" inactive={compact && active}>
      <PanelFrame title={creation.creating ? "운동 기록 등록" : `${folder.type === "system" ? consumerLabel(folder.name) : folder.type === "personal" ? folder.name : folder.type === "all" ? "전체" : "미분류"} 목록`} depth={1} centerSelected={!creation.creating} centerTargetKey={creation.creating ? null : exercises.selectedId} centerBehavior="spring" backButton={<BackButton label={creation.creating ? "운동 목록으로" : "내 분류로"} onClick={() => { if (creation.creating) creation.close(); else { backToList(); setFolder(null); setCategory(null); } }} />}>
        <CreateSlot creating={creation.creating} pending={pending} onClose={creation.close} showCancel={false} list={<div className="lag-role-detail">
          <details><summary>기간 검색</summary><form className="lag-lifelog-search" onSubmit={(event) => { event.preventDefault(); exercises.search(category || undefined, from, to, folderFilter); setDetailVisible(false); }}>
            <label>시작 날짜<input className="lag-role-control" aria-label="시작 날짜" type="date" min="1000-01-01" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>종료 날짜<input className="lag-role-control" aria-label="종료 날짜" type="date" min="1000-01-01" value={to} onChange={(event) => setTo(event.target.value)} /></label>
            <button type="submit" className="lag-role-button">검색</button>
          </form></details>
          {exercises.list.loading && !exercises.list.items.length ? <InfoCard>운동 기록을 불러오는 중…</InfoCard> : null}
          {exercises.list.error ? <p role="alert">{exercises.list.error} <button type="button" className="lag-role-button" onClick={() => void exercises.list.reload()}>다시 조회</button></p> : null}
          {exercises.mutationError ? <p role="alert">{exercises.mutationError}</p> : null}
          {!exercises.list.loading && !exercises.list.error && !exercises.list.items.length ? <InfoCard>운동 기록이 없습니다.</InfoCard> : null}
          <div className="lag-role-node-list">{exercises.list.items.map((item) => <RecordRow key={item.id} title={consumerLabel(item.category) + " · " + item.exercisedOn} subtitle={item.durationMinutes + "분 · " + (item.distanceKm === null ? "미등록" : item.distanceKm + " km")} selected={exercises.selectedId === item.id} disabled={pending} onSelect={() => select(item.id)} onEdit={() => select(item.id, true)} onArchive={async () => { if (await confirm("“" + consumerLabel(item.category) + " · " + item.exercisedOn + "” 운동 기록을 삭제할까요?")) { await exercises.remove(item.id); backToList(); } }} />)}</div>
          <div className="lag-journal-pagination"><button type="button" disabled={exercises.list.loading || exercises.params.page === 0} onClick={() => { backToList(); exercises.changePage(exercises.params.page - 1); }}>이전</button><span>페이지 {exercises.params.page + 1}</span><button type="button" disabled={exercises.list.loading || exercises.list.items.length < exercises.params.size} onClick={() => { backToList(); exercises.changePage(exercises.params.page + 1); }}>다음</button></div>
        </div>}><ExerciseForm category={category ?? ""} pending={pending} save={(body) => creation.save(() => exercises.create({ ...body as ExerciseCreateRequest, ...(folder.type === "personal" ? { personalCategoryId: folder.id } : {}) }))} />{exercises.mutationError ? <p role="alert">{exercises.mutationError}</p> : null}</CreateSlot>
      </PanelFrame>
    </PanelStage> : null}
    {active ? <PanelStage stageKey="lifelog-exercise-detail" parentStageKey="lifelog-exercise-list" panelRole="detail"><PanelFrame title={editing ? "운동 기록 수정" : "운동 기록 상세"} depth={0} backButton={<BackButton label={editing ? "운동 기록 상세로" : "운동 목록으로"} onClick={editing ? () => setEditing(false) : backToList} />}>
      {exercises.detail.loading && !exercises.detail.data ? <InfoCard>운동 기록을 불러오는 중…</InfoCard> : null}
      {exercises.detail.error ? <p role="alert">{exercises.detail.error} <button type="button" className="lag-role-button" onClick={() => void exercises.detail.retry()}>다시 조회</button></p> : null}
      {exercises.detail.data ? editing ? <ExerciseForm key={exercises.detail.data.id} item={exercises.detail.data} category={exercises.detail.data.category} pending={pending} save={async (body) => { const saved = await exercises.update(exercises.detail.data!.id, body); if (saved) setEditing(false); return saved; }} /> : <><ExerciseDetail item={exercises.detail.data} /><RecordFolderSelect kind="EXERCISE" recordId={exercises.detail.data.id} categoryId={exercises.detail.data.personalCategoryId} onSaved={async () => { const [list, detail] = await Promise.all([exercises.list.reload(), exercises.detail.retry()]); return !!list && !!detail; }} /></> : null}
    </PanelFrame></PanelStage> : null}
  </div>;
}
