"use client";

import { useRef, useState } from "react";

import type {
  JournalDetail,
  JournalEntry,
  JournalSubtype,
  QuickRecordCollectionCategory,
  QuickRecordExerciseCategory,
  QuickRecordMediaCategory,
  QuickRecordMediaStatus,
  QuickRecordRequest,
  QuickRecordResult,
  QuickRecordType,
  RoleDetail,
} from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useJournalQueries } from "./useJournalQueries";

export const JOURNAL_SUBTYPES: JournalSubtype[] = [
  "QUICK_NOTE",
  "ACTIVITY",
  "STUDY",
  "PROJECT",
  "MEMORY",
  "REFLECTION",
  "MOOD",
  "HEALTH_NOTE",
];

const secondaryButton = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

const COLLECTION_CATEGORIES = ["FIGURE", "CARD", "BOOK", "GAME", "STAMP", "COIN", "OTHER"] as const;
const EXERCISE_CATEGORIES = ["RUNNING", "WALKING", "CYCLING", "SWIMMING", "GYM", "YOGA", "OTHER"] as const;
const MEDIA_CATEGORIES = ["ANIME", "MOVIE", "SERIES", "BOOK", "WEBTOON", "GAME", "MUSIC"] as const;
const MEDIA_STATUSES = ["PLANNED", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"] as const;

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalNumber(form: FormData, key: string) {
  const raw = text(form, key);
  return raw === "" ? undefined : Number(raw);
}

function QuickRecordForm({
  roles,
  rolesLoading,
  rolesError,
  pending,
  error,
  result,
  refreshError,
  canRetry,
  onSubmit,
  onRetry,
  onEdit,
}: {
  roles: RoleDetail[];
  rolesLoading: boolean;
  rolesError: string | null;
  pending: boolean;
  error: string | null;
  result: QuickRecordResult | null;
  refreshError: string | null;
  canRetry: boolean;
  onSubmit: (body: QuickRecordRequest) => Promise<QuickRecordResult | undefined>;
  onRetry: () => Promise<QuickRecordResult | undefined>;
  onEdit: () => void;
}) {
  const [type, setType] = useState<QuickRecordType>("COLLECTION");
  const formRef = useRef<HTMLFormElement>(null);

  const resetAfter = (saved: QuickRecordResult | undefined) => {
    if (!saved) return;
    formRef.current?.reset();
    setType("COLLECTION");
  };

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lifeLogSubtype = text(form, "lifeLogSubtype") as JournalSubtype | "";
    const primaryRoleId = optionalNumber(form, "primaryRoleId");
    const metadata = {
      ...(lifeLogSubtype ? { lifeLogSubtype } : {}),
      ...(primaryRoleId === undefined ? {} : { primaryRoleId }),
    };

    let body: QuickRecordRequest;
    if (type === "COLLECTION") {
      body = {
        ...metadata,
        type,
        collection: {
          category: text(form, "collectionCategory") as QuickRecordCollectionCategory,
          title: text(form, "collectionTitle"),
          quantity: Number(text(form, "quantity")),
        },
      };
    } else if (type === "EXERCISE") {
      const distanceKm = optionalNumber(form, "distanceKm");
      const calories = optionalNumber(form, "calories");
      const memo = text(form, "memo");
      body = {
        ...metadata,
        type,
        exercise: {
          category: text(form, "exerciseCategory") as QuickRecordExerciseCategory,
          durationMinutes: Number(text(form, "durationMinutes")),
          exercisedOn: text(form, "exercisedOn"),
          ...(distanceKm === undefined ? {} : { distanceKm }),
          ...(calories === undefined ? {} : { calories }),
          ...(memo ? { memo } : {}),
        },
      };
    } else {
      const currentEpisode = optionalNumber(form, "currentEpisode");
      const totalEpisode = optionalNumber(form, "totalEpisode");
      body = {
        ...metadata,
        type,
        media: {
          category: text(form, "mediaCategory") as QuickRecordMediaCategory,
          title: text(form, "mediaTitle"),
          status: text(form, "mediaStatus") as QuickRecordMediaStatus,
          ...(currentEpisode === undefined ? {} : { currentEpisode }),
          ...(totalEpisode === undefined ? {} : { totalEpisode }),
        },
      };
    }

    resetAfter(await onSubmit(body));
  };

  const select = (name: string, label: string, values: readonly string[]) => (
    <label className="block text-xs" style={{ color: SAO.color.text.label }}>
      {label}
      <select name={name} required defaultValue="" style={INPUT_STYLE} disabled={pending}>
        <option value="" disabled>Select...</option>
        {values.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );

  return (
    <form ref={formRef} className="space-y-2" onSubmit={submit} onChangeCapture={onEdit}>
      <label className="block text-xs" style={{ color: SAO.color.text.label }}>
        Quick Record type
        <select
          name="type"
          aria-label="Quick Record type"
          value={type}
          style={INPUT_STYLE}
          disabled={pending}
          onChange={(event) => setType(event.target.value as QuickRecordType)}
        >
          <option value="COLLECTION">Collection</option>
          <option value="EXERCISE">Exercise</option>
          <option value="MEDIA">Media</option>
        </select>
      </label>

      <label className="block text-xs" style={{ color: SAO.color.text.label }}>
        Quick Record subtype
        <select name="lifeLogSubtype" aria-label="Quick Record subtype" defaultValue="" style={INPUT_STYLE} disabled={pending}>
          <option value="">None</option>
          {JOURNAL_SUBTYPES.map((subtype) => <option key={subtype} value={subtype}>{subtype.replaceAll("_", " ")}</option>)}
        </select>
      </label>

      <label className="block text-xs" style={{ color: SAO.color.text.label }}>
        Quick Record role
        <select name="primaryRoleId" aria-label="Quick Record role" defaultValue="" style={INPUT_STYLE} disabled={pending || rolesLoading}>
          <option value="">No Role</option>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
      </label>
      {rolesLoading ? <InfoCard>Loading Roles...</InfoCard> : null}
      {rolesError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>Role selection unavailable: {rolesError}</p> : null}

      {type === "COLLECTION" ? (
        <>
          {select("collectionCategory", "Collection category", COLLECTION_CATEGORIES)}
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Collection title<input name="collectionTitle" required style={INPUT_STYLE} disabled={pending} /></label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Quantity<input name="quantity" type="number" min={1} required style={INPUT_STYLE} disabled={pending} /></label>
        </>
      ) : type === "EXERCISE" ? (
        <>
          {select("exerciseCategory", "Exercise category", EXERCISE_CATEGORIES)}
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Duration minutes<input name="durationMinutes" type="number" min={1} required style={INPUT_STYLE} disabled={pending} /></label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Exercised on<input name="exercisedOn" type="date" required style={INPUT_STYLE} disabled={pending} /></label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Distance km<input name="distanceKm" type="number" min={0} step="any" style={INPUT_STYLE} disabled={pending} /></label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Calories<input name="calories" type="number" min={0} style={INPUT_STYLE} disabled={pending} /></label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Memo<textarea name="memo" rows={2} style={{ ...INPUT_STYLE, resize: "vertical" }} disabled={pending} /></label>
        </>
      ) : (
        <>
          {select("mediaCategory", "Media category", MEDIA_CATEGORIES)}
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Media title<input name="mediaTitle" required style={INPUT_STYLE} disabled={pending} /></label>
          {select("mediaStatus", "Media status", MEDIA_STATUSES)}
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Current episode<input name="currentEpisode" type="number" min={0} style={INPUT_STYLE} disabled={pending} /></label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>Total episodes<input name="totalEpisode" type="number" min={1} style={INPUT_STYLE} disabled={pending} /></label>
        </>
      )}

      {error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{error}</p> : null}
      {result ? <p role="status" className="text-xs" style={{ color: SAO.color.text.gold }}>{result.replay ? "Quick Record replay confirmed." : "Quick Record saved."}</p> : null}
      {refreshError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{refreshError}</p> : null}
      <div className="flex gap-2">
        {canRetry
          ? <button type="button" disabled={pending} style={{ ...secondaryButton, flex: 1 }} onClick={() => void onRetry().then(resetAfter)}>Retry same record</button>
          : <button type="submit" disabled={pending} style={{ ...secondaryButton, flex: 1 }}>{pending ? "Saving..." : "Save Quick Record"}</button>}
      </div>
    </form>
  );
}

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{text}</p>
      <button type="button" style={secondaryButton} onClick={retry}>Retry</button>
    </div>
  );
}

function entryPresentation(entry: JournalEntry) {
  switch (entry.sourceType) {
    case "COLLECTION":
      return {
        title: entry.preview.title,
        summary: [
          entry.preview.category,
          entry.preview.quantity !== null ? `Quantity ${entry.preview.quantity}` : null,
        ].filter((value): value is string => value !== null).join(" · "),
      };
    case "EXERCISE":
      return {
        title: `${entry.preview.category} · ${entry.preview.exercisedOn}`,
        summary: [
          entry.preview.category,
          entry.preview.durationMinutes !== null ? `${entry.preview.durationMinutes} min` : null,
          entry.preview.distanceKm !== null ? `${entry.preview.distanceKm} km` : null,
          entry.preview.calories !== null ? `${entry.preview.calories} kcal` : null,
        ].filter((value): value is string => value !== null).join(" · "),
      };
    case "MEDIA":
      return { title: entry.preview.title, summary: `${entry.preview.category} · ${entry.preview.status} · ${entry.preview.currentEpisode}/${entry.preview.totalEpisode}` };
  }
}

function roleContext(primaryRoleId: number | null, roles: RoleDetail[]) {
  if (primaryRoleId === null) return null;
  return `Role context: ${roles.find(({ id }) => id === primaryRoleId)?.name ?? `#${primaryRoleId}`}`;
}

function SourceDetail({ detail }: { detail: JournalDetail }) {
  switch (detail.sourceType) {
    case "COLLECTION":
      return (
        <div className="space-y-1.5">
          <GoldRow>Category: {detail.source.category}</GoldRow>
          <GoldRow>Title: {detail.source.title}</GoldRow>
          <GoldRow>Original title: {detail.source.originalTitle ?? "Not recorded"}</GoldRow>
          <GoldRow>Quantity: {detail.source.quantity ?? "Not recorded"}</GoldRow>
          <GoldRow>Condition: {detail.source.conditionNote ?? "Not recorded"}</GoldRow>
          <GoldRow>Acquired from: {detail.source.acquiredFrom ?? "Not recorded"}</GoldRow>
          <GoldRow>Tags: {detail.source.tags.length > 0 ? detail.source.tags.join(", ") : "Not recorded"}</GoldRow>
          <GoldRow>Created: {detail.source.createdAt}</GoldRow>
          <GoldRow>Updated: {detail.source.updatedAt}</GoldRow>
        </div>
      );
    case "EXERCISE":
      return (
        <div className="space-y-1.5">
          <GoldRow>Category: {detail.source.category}</GoldRow>
          <GoldRow>Duration: {detail.source.durationMinutes === null ? "Not recorded" : `${detail.source.durationMinutes} min`}</GoldRow>
          <GoldRow>Distance: {detail.source.distanceKm === null ? "Not recorded" : `${detail.source.distanceKm} km`}</GoldRow>
          <GoldRow>Calories: {detail.source.calories === null ? "Not recorded" : `${detail.source.calories} kcal`}</GoldRow>
          <GoldRow>Exercised on: {detail.source.exercisedOn}</GoldRow>
          <GoldRow>Memo: {detail.source.memo ?? "Not recorded"}</GoldRow>
          <GoldRow>Created: {detail.source.createdAt}</GoldRow>
          <GoldRow>Updated: {detail.source.updatedAt}</GoldRow>
        </div>
      );
    case "MEDIA":
      return (
        <div className="space-y-1.5">
          <GoldRow>Category: {detail.source.category}</GoldRow>
          <GoldRow>Title: {detail.source.title}</GoldRow>
          <GoldRow>Original title: {detail.source.originalTitle ?? "Not recorded"}</GoldRow>
          <GoldRow>Progress: {detail.source.currentEpisode}/{detail.source.totalEpisode}</GoldRow>
          <GoldRow>Status: {detail.source.status}</GoldRow>
          <GoldRow>Rating: {detail.source.rating ?? "Not recorded"}</GoldRow>
          <GoldRow>Tags: {detail.source.tags.length > 0 ? detail.source.tags.join(", ") : "Not recorded"}</GoldRow>
          <GoldRow>Rewatch count: {detail.source.rewatchCount}</GoldRow>
          <GoldRow>Started: {detail.source.startedOn ?? "Not recorded"}</GoldRow>
          <GoldRow>Finished: {detail.source.finishedOn ?? "Not recorded"}</GoldRow>
          <GoldRow>Created: {detail.source.createdAt}</GoldRow>
          <GoldRow>Updated: {detail.source.updatedAt}</GoldRow>
        </div>
      );
  }
}

export default function JournalShell({ roles, rolesLoading = false, rolesError = null }: { roles: RoleDetail[]; rolesLoading?: boolean; rolesError?: string | null }) {
  const journal = useJournalQueries();
  const { data: page, loading, error } = journal.list;
  const detail = journal.detail.data;
  const previousDisabled = loading || journal.params.page === 0;
  const nextDisabled = loading || page.totalPages === 0 || journal.params.page + 1 >= page.totalPages;

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="journal-shell">
      <PanelFrame title="Journal Filters" depth={2}>
        <div className="space-y-3 px-3">
          <details>
            <summary className="cursor-pointer text-xs" style={{ color: SAO.color.text.gold }}>Quick Record</summary>
            <div className="mt-3">
              <QuickRecordForm
                roles={roles}
                rolesLoading={rolesLoading}
                rolesError={rolesError}
                pending={journal.quickRecord.pending}
                error={journal.quickRecord.error}
                result={journal.quickRecord.result}
                refreshError={journal.quickRecord.refreshError}
                canRetry={journal.quickRecord.canRetry}
                onSubmit={journal.quickRecord.submit}
                onRetry={journal.quickRecord.retry}
                onEdit={journal.quickRecord.invalidateRetry}
              />
            </div>
          </details>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>
            Role
            <select aria-label="Role filter" value={journal.params.primaryRoleId ?? ""} style={INPUT_STYLE} onChange={(event) => journal.changeRoleFilter(event.target.value ? Number(event.target.value) : undefined)}>
              <option value="">All Roles</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <label className="block text-xs" style={{ color: SAO.color.text.label }}>
            Subtype
            <select aria-label="Subtype filter" value={journal.params.subtype ?? ""} style={INPUT_STYLE} onChange={(event) => journal.changeSubtypeFilter(event.target.value ? event.target.value as JournalSubtype : undefined)}>
              <option value="">All Subtypes</option>
              {JOURNAL_SUBTYPES.map((subtype) => <option key={subtype} value={subtype}>{subtype.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          {rolesLoading ? <InfoCard>Loading Roles...</InfoCard> : null}
          {rolesError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>Role filter unavailable: {rolesError}</p> : null}
        </div>
      </PanelFrame>

      <PanelFrame title="Journal" depth={1}>
        <div className="space-y-3">
          {loading ? <InfoCard>Loading Journal...</InfoCard> : null}
          {error ? <ErrorState text={error} retry={() => void journal.list.reload()} /> : null}
          {!loading && !error && page.content.length === 0 ? <InfoCard>No Journal entries.</InfoCard> : null}
          <div className="space-y-2">
            {page.content.map((entry, index) => {
              const presentation = entryPresentation(entry);
              const context = [
                entry.sourceType,
                presentation.summary,
                entry.subtype,
                entry.entryMode === "QUICK" ? "QUICK" : null,
                roleContext(entry.primaryRoleId, roles),
                entry.roleEventId === null ? null : `Event context #${entry.roleEventId}`,
                entry.recordedAt,
              ].filter(Boolean).join(" · ");
              return (
                <PanelCard
                  key={entry.lifeLogId}
                  label={presentation.title}
                  slotLabel={entry.sourceType.slice(0, 2)}
                  subtitle={context}
                  selected={journal.selectedLifeLogId === entry.lifeLogId}
                  index={index}
                  onClick={() => journal.selectEntry(entry.lifeLogId)}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 px-3">
            <button type="button" style={secondaryButton} disabled={previousDisabled} onClick={() => journal.changePage(journal.params.page - 1)}>Previous</button>
            <span className="text-xs" style={{ color: SAO.color.text.label }}>Page {page.totalPages === 0 ? 0 : page.page + 1} / {page.totalPages}</span>
            <button type="button" style={secondaryButton} disabled={nextDisabled} onClick={() => journal.changePage(journal.params.page + 1)}>Next</button>
          </div>
          <p className="px-3 text-xs" style={{ color: SAO.color.text.label }}>{page.totalElements} total</p>
        </div>
      </PanelFrame>

      <PanelFrame title={detail ? `${detail.sourceType} Journal Detail` : "Journal Detail"} depth={0}>
        {!journal.selectedLifeLogId ? <InfoCard>Select a Journal entry.</InfoCard> : null}
        {journal.detail.loading && !detail ? <InfoCard>Loading Journal detail...</InfoCard> : null}
        {journal.detail.error && !detail ? <ErrorState text={journal.detail.error} retry={journal.detail.retry} /> : null}
        {detail ? (
          <div className="space-y-3 px-3">
            {journal.detail.error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{journal.detail.error}</p> : null}
            <InfoCard>Journal entry #{detail.lifeLogId}</InfoCard>
            <GoldRow>Source type: {detail.sourceType}</GoldRow>
            <GoldRow>Recorded at: {detail.recordedAt}</GoldRow>
            {detail.subtype ? <GoldRow>Subtype: {detail.subtype}</GoldRow> : null}
            {detail.entryMode ? <GoldRow>Entry mode: {detail.entryMode}</GoldRow> : null}
            {detail.reflectionScope ? <GoldRow>Reflection scope: {detail.reflectionScope}</GoldRow> : null}
            {detail.periodKey ? <GoldRow>Period: {detail.periodKey}</GoldRow> : null}
            {detail.primaryRoleId !== null ? <GoldRow>{roleContext(detail.primaryRoleId, roles)}</GoldRow> : null}
            {detail.roleEventId !== null ? <GoldRow>Event context #{detail.roleEventId}</GoldRow> : null}
            <SourceDetail detail={detail} />
          </div>
        ) : null}
      </PanelFrame>
    </div>
  );
}
