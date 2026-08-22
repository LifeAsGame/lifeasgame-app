"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import {
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
  type ExerciseCreateRequest,
  type ExerciseInfo,
  type ExerciseUpdateRequest,
} from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
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
      <button type="button" style={buttonStyle} onClick={retry}>Retry</button>
    </div>
  );
}

function CategorySelect({ name, label, optional = false, disabled = false, defaultValue = "" }: { name: string; label: string; optional?: boolean; disabled?: boolean; defaultValue?: ExerciseCategory | "" }) {
  return (
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>
      {label}
      <select name={name} aria-label={label} defaultValue={defaultValue} required={!optional} disabled={disabled} style={INPUT_STYLE}>
        <option value="">{optional ? "All Categories" : "Select..."}</option>
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
      <CategorySelect name="category" label="Create category" disabled={pending} />
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Duration minutes<input name="durationMinutes" type="number" min={1} required disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Distance km<input name="distanceKm" type="number" min={0} step="any" disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Calories<input name="calories" type="number" min={0} disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Exercised on<input name="exercisedOn" type="date" required disabled={pending} style={INPUT_STYLE} /></label>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>Memo<textarea name="memo" disabled={pending} style={INPUT_STYLE} /></label>
      <button type="submit" disabled={pending} style={buttonStyle}>{pending ? "Saving..." : "Create Exercise"}</button>
    </form>
  );
}

function ExerciseDetail({ item, pending, update, remove }: { item: ExerciseInfo; pending: boolean; update: (body: ExerciseUpdateRequest) => Promise<boolean>; remove: () => Promise<boolean> }) {
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
    <div className="space-y-3 px-3">
      <InfoCard>{item.category} · {item.exercisedOn}</InfoCard>
      <GoldRow>Exercise source #{item.id}</GoldRow>
      <GoldRow>Duration: {item.durationMinutes} min</GoldRow>
      <GoldRow>Distance: {item.distanceKm ?? "Not recorded"}</GoldRow>
      <GoldRow>Calories: {item.calories ?? "Not recorded"}</GoldRow>
      <GoldRow>Memo: {item.memo ?? "Not recorded"}</GoldRow>
      <GoldRow>Created: {item.createdAt}</GoldRow>
      <GoldRow>Updated: {item.updatedAt}</GoldRow>
      <form key={`${item.id}-${item.updatedAt}`} className="space-y-2" onSubmit={submit}>
        <CategorySelect name="category" label="Update category" defaultValue={item.category} disabled={pending} />
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update duration minutes<input name="durationMinutes" type="number" min={1} required defaultValue={item.durationMinutes} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update distance km<input name="distanceKm" type="number" min={0} step="any" defaultValue={item.distanceKm ?? ""} placeholder={item.distanceKm === null ? "Not recorded" : String(item.distanceKm)} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update calories<input name="calories" type="number" min={0} defaultValue={item.calories ?? ""} placeholder={item.calories === null ? "Not recorded" : String(item.calories)} disabled={pending} style={INPUT_STYLE} /></label>
        <p className="text-xs" style={{ color: SAO.color.text.label }}>Blank numeric fields preserve the current server value; existing values cannot be cleared yet.</p>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update exercised on<input name="exercisedOn" type="date" required defaultValue={item.exercisedOn} disabled={pending} style={INPUT_STYLE} /></label>
        <label className="block text-xs" style={{ color: SAO.color.text.label }}>Update memo<textarea name="memo" defaultValue={item.memo ?? ""} disabled={pending} style={INPUT_STYLE} /></label>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} style={{ ...buttonStyle, flex: 1 }}>{pending ? "Working..." : "Update Exercise"}</button>
          <button type="button" disabled={pending} style={buttonStyle} onClick={() => {
            if (window.confirm(`Delete ${item.category} Exercise?`)) void remove();
          }}>Delete</button>
        </div>
      </form>
    </div>
  );
}

export default function ExerciseShell() {
  const exercises = useExerciseQueries();
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const pending = exercises.pendingMutation !== null;
  const nextDisabled = exercises.list.loading || exercises.list.items.length < exercises.params.size;

  return (
    <div className="lag-panel-rail relative" data-testid="exercise-shell">
      <PanelStage stageKey="lifelog-exercise-search">
        <PanelFrame title="Exercise Search" depth={2}>
        <div className="space-y-3 px-3">
          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            exercises.search(category || undefined, from, to);
          }}>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>
              Category filter
              <select aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory | "")} style={INPUT_STYLE}>
                <option value="">All Categories</option>
                {EXERCISE_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>From date<input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={INPUT_STYLE} /></label>
            <label className="block text-xs" style={{ color: SAO.color.text.label }}>To date<input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} style={INPUT_STYLE} /></label>
            <button type="submit" style={buttonStyle}>Search</button>
          </form>
          <details>
            <summary className="cursor-pointer text-xs" style={{ color: SAO.color.text.gold }}>Add Exercise</summary>
            <CreateForm pending={pending} create={exercises.create} />
          </details>
        </div>
        </PanelFrame>
      </PanelStage>

      <PanelStage stageKey="lifelog-exercise-list" index={1}>
        <PanelFrame title="Exercises" depth={1}>
        <div className="space-y-3">
          {exercises.list.loading && exercises.list.items.length === 0 ? <InfoCard>Loading Exercises...</InfoCard> : null}
          {exercises.list.error ? <ErrorState message={exercises.list.error} retry={() => void exercises.list.reload()} /> : null}
          {!exercises.list.loading && !exercises.list.error && exercises.list.items.length === 0 ? <InfoCard>No Exercises.</InfoCard> : null}
          {exercises.mutationError ? <p role="alert" className="px-3 text-xs" style={{ color: SAO.color.action.red }}>{exercises.mutationError}</p> : null}
          <div className="space-y-2">
            {exercises.list.items.map((item, index) => (
              <PanelCard key={item.id} label={`${item.category} · ${item.exercisedOn}`} slotLabel={`${item.durationMinutes}m`} subtitle={`${item.distanceKm ?? "–"} km · ${item.calories ?? "–"} kcal`} selected={exercises.selectedId === item.id} index={index} onClick={() => exercises.select(item.id)} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-3">
            <button type="button" disabled={exercises.list.loading || exercises.params.page === 0} style={buttonStyle} onClick={() => exercises.changePage(exercises.params.page - 1)}>Previous</button>
            <span className="text-xs" style={{ color: SAO.color.text.label }}>Page {exercises.params.page + 1}</span>
            <button type="button" disabled={nextDisabled} style={buttonStyle} onClick={() => exercises.changePage(exercises.params.page + 1)}>Next</button>
          </div>
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {exercises.selectedId ? (
          <PanelStage stageKey="lifelog-exercise-detail" focusKey={exercises.selectedId} index={2}>
            <PanelFrame title="Exercise Detail" depth={0} contentKey={exercises.selectedId}>
              {exercises.detail.loading && !exercises.detail.data ? <InfoCard>Loading Exercise...</InfoCard> : null}
              {exercises.detail.error ? <ErrorState message={exercises.detail.error} retry={() => void exercises.detail.retry()} /> : null}
              {exercises.detail.data ? <ExerciseDetail item={exercises.detail.data} pending={pending} update={(body) => exercises.update(exercises.detail.data!.id, body)} remove={() => exercises.remove(exercises.detail.data!.id)} /> : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
