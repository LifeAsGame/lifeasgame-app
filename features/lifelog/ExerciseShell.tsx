"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import {
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
  type ExerciseCreateRequest,
  type ExerciseInfo,
  type ExerciseUpdateRequest,
} from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import CreateSlot, { CreateCategory, useCreateMode } from "@/shared/ui/CreateSlot";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useExerciseQueries } from "./useExerciseQueries";

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

function optionalNumber(form: FormData, key: string): number | undefined {
  const value = text(form, key);
  return value === "" ? undefined : Number(value);
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{message}</p>
      <button type="button" style={buttonStyle} onClick={retry}>다시 시도</button>
    </div>
  );
}

function CategorySelect({ name, label, optional = false, disabled = false, defaultValue = "" }: { name: string; label: string; optional?: boolean; disabled?: boolean; defaultValue?: ExerciseCategory | "" }) {
  return (
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>
      {label}
      <select name={name} aria-label={label} defaultValue={defaultValue} required={!optional} disabled={disabled} style={INPUT_STYLE}>
        <option value="">{optional ? "전체 분류" : "선택…"}</option>
        {EXERCISE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
    </label>
  );
}

function CreateForm({ pending, create }: { pending: boolean; create: (body: ExerciseCreateRequest) => Promise<boolean> }) {
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const distanceKm = optionalNumber(form, "distanceKm");
    const calories = optionalNumber(form, "calories");
    const memo = text(form, "memo");
    const saved = await create({
      category: text(form, "category") as ExerciseCategory,
      durationMinutes: Number(text(form, "durationMinutes")),
      exercisedOn: text(form, "exercisedOn"),
      ...(distanceKm === undefined ? {} : { distanceKm }),
      ...(calories === undefined ? {} : { calories }),
      ...(memo ? { memo } : {}),
    });
    if (saved) element.reset();
  };

  return (
    <form className="mt-3 space-y-2" onSubmit={submit}>
      <CategorySelect name="category" label="등록할 분류" disabled={pending} />
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>운동 시간 (분)<input name="durationMinutes" type="number" min={1} required disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>거리 (km)<input name="distanceKm" type="number" min={0} step="any" disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>칼로리<input name="calories" type="number" min={0} disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>운동 날짜<input name="exercisedOn" type="date" required disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>메모<textarea name="memo" disabled={pending} style={INPUT_STYLE} /></label>
      <button type="submit" disabled={pending} style={buttonStyle}>{pending ? "저장 중…" : "운동 기록 저장"}</button>
    </form>
  );
}

function ExerciseDetail({ item, pending, update, remove }: { item: ExerciseInfo; pending: boolean; update: (body: ExerciseUpdateRequest) => Promise<boolean>; remove: () => Promise<boolean> }) {
  const { confirm, dialog } = useSaoConfirm();
  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const distanceKm = optionalNumber(form, "distanceKm");
    const calories = optionalNumber(form, "calories");
    void update({
      category: text(form, "category") as ExerciseCategory,
      durationMinutes: Number(text(form, "durationMinutes")),
      exercisedOn: text(form, "exercisedOn"),
      memo: text(form, "memo"),
      ...(distanceKm === undefined ? {} : { distanceKm }),
      ...(calories === undefined ? {} : { calories }),
    });
  };

  return (
    <div className="space-y-3 px-3">{dialog}
      <InfoCard>{item.category} · {item.exercisedOn}</InfoCard>
      <GoldRow>운동 기록 #{item.id}</GoldRow>
      <GoldRow>운동 시간: {item.durationMinutes} 분</GoldRow>
      <GoldRow>거리: {item.distanceKm ?? "미등록"}</GoldRow>
      <GoldRow>칼로리: {item.calories ?? "미등록"}</GoldRow>
      <GoldRow>메모: {item.memo ?? "미등록"}</GoldRow>
      <GoldRow>생성일: {item.createdAt}</GoldRow>
      <GoldRow>수정일: {item.updatedAt}</GoldRow>
      <form key={`${item.id}-${item.updatedAt}`} className="space-y-2" onSubmit={submit}>
        <CategorySelect name="category" label="변경할 분류" defaultValue={item.category} disabled={pending} />
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 운동 시간 (분)<input name="durationMinutes" type="number" min={1} required defaultValue={item.durationMinutes} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 거리 (km)<input name="distanceKm" type="number" min={0} step="any" defaultValue={item.distanceKm ?? ""} placeholder={item.distanceKm === null ? "미등록" : String(item.distanceKm)} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 칼로리<input name="calories" type="number" min={0} defaultValue={item.calories ?? ""} placeholder={item.calories === null ? "미등록" : String(item.calories)} disabled={pending} style={INPUT_STYLE} /></label>
        <p className="text-xs" style={{ color: SAO.color.text.label }}>빈 수치 항목은 현재 값을 유지합니다. 수치 지우기는 지원하지 않습니다.</p>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 운동 날짜<input name="exercisedOn" type="date" required defaultValue={item.exercisedOn} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>변경할 메모<textarea name="memo" defaultValue={item.memo ?? ""} disabled={pending} style={INPUT_STYLE} /></label>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "처리 중…" : "운동 기록 저장"}</button>
          <button type="button" disabled={pending} style={buttonStyle} onClick={async () => {
            if (await confirm(`“${item.category} · ${item.exercisedOn}” 운동 기록을 삭제할까요?`)) void remove();
          }}>삭제</button>
        </div>
      </form>
    </div>
  );
}

export default function ExerciseShell({ createRequest = 0 }: { createRequest?: number }) {
  const creation = useCreateMode(createRequest);
  const { confirm, dialog } = useSaoConfirm();
  const exercises = useExerciseQueries();
  const [detailVisible, setDetailVisible] = useState(true);
  useEffect(() => { if (creation.creating) setDetailVisible(false); }, [creation.creating]);
  const select = (id: number) => { setDetailVisible(true); exercises.select(id); };
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const pending = exercises.pendingMutation !== null;
  const nextDisabled = exercises.list.loading || exercises.list.items.length < exercises.params.size;

  return (
    <div className="lag-panel-rail relative" data-testid="exercise-shell">{dialog}
      <PanelStage stageKey="lifelog-exercise-list" index={1}>
        <PanelFrame title="운동 기록" depth={1} backButton={creation.creating ? <BackButton label="목록으로" onClick={creation.close} /> : undefined}>
        <CreateCategory title="운동 기록" onOpen={creation.close} onCreate={creation.open} />
        <CreateSlot showCancel={false} creating={creation.creating} pending={pending} onClose={creation.close} list={<>
          <details><summary>검색 조건</summary><div className="space-y-3 px-3">
          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            exercises.search(category || undefined, from, to);
          }}>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>
              분류 필터
              <select aria-label="분류 필터" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory | "")} style={INPUT_STYLE}>
                <option value="">전체 분류</option>
                {EXERCISE_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>시작 날짜<input aria-label="시작 날짜" type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={INPUT_STYLE} /></label>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>종료 날짜<input aria-label="종료 날짜" type="date" value={to} onChange={(event) => setTo(event.target.value)} style={INPUT_STYLE} /></label>
            <button type="submit" style={buttonStyle}>검색</button>
          </form>

        </div>
        </details>
        <div className="space-y-3">
          {exercises.list.loading && exercises.list.items.length === 0 ? <InfoCard>운동 기록을 불러오는 중…</InfoCard> : null}
          {exercises.list.error ? <ErrorState message={exercises.list.error} retry={() => void exercises.list.reload()} /> : null}
          {!exercises.list.loading && !exercises.list.error && exercises.list.items.length === 0 ? <InfoCard>운동 기록이 없습니다.</InfoCard> : null}
          {exercises.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{exercises.mutationError}</p> : null}
          <div className="space-y-2">
            {exercises.list.items.map((item, index) => (
              <PanelCard key={item.id} label={`${item.category} · ${item.exercisedOn}`} slotLabel={`${item.durationMinutes}m`} subtitle={`${item.distanceKm ?? "–"} km · ${item.calories ?? "–"} kcal`} selected={exercises.selectedId === item.id} index={index} actions={[{ type: "edit", label: "수정" }, { type: "delete", label: "삭제" }]} onAction={async (type) => { if (type === "edit") select(item.id); else if (await confirm(`${`${item.category} · ${item.exercisedOn}`} 기록을 삭제할까요?`)) await exercises.remove(item.id); }} onClick={() => select(item.id)} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-3">
            <button type="button" disabled={exercises.list.loading || exercises.params.page === 0} style={buttonStyle} onClick={() => exercises.changePage(exercises.params.page - 1)}>이전</button>
            <span className="text-xs" style={{ color: SAO.color.text.label }}>페이지 {exercises.params.page + 1}</span>
            <button type="button" disabled={nextDisabled} style={buttonStyle} onClick={() => exercises.changePage(exercises.params.page + 1)}>다음</button>
          </div>
        </div>
        </>}><CreateForm pending={pending} create={(body) => creation.save(() => exercises.create(body))} />
          {exercises.mutationError ? <p role="alert">{exercises.mutationError}</p> : null}
        </CreateSlot>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {detailVisible && !creation.creating && exercises.selectedId ? (
          <PanelStage stageKey="lifelog-exercise-detail" index={2}>
            <PanelFrame title="운동 기록 상세" depth={0} contentKey={exercises.selectedId}>
              {exercises.detail.loading && !exercises.detail.data ? <InfoCard>운동 기록을 불러오는 중…</InfoCard> : null}
              {exercises.detail.error ? <ErrorState message={exercises.detail.error} retry={() => void exercises.detail.retry()} /> : null}
              {exercises.detail.data ? <ExerciseDetail item={exercises.detail.data} pending={pending} update={(body) => exercises.update(exercises.detail.data!.id, body)} remove={() => exercises.remove(exercises.detail.data!.id)} /> : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
