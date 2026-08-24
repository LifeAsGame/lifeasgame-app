"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { COLLECTION_CATEGORIES } from "@/shared/api/types";
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
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage, { StageContentTransition } from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
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

function label(value: string) {
  return value.replaceAll("_", " ");
}

function displayTimestamp(value: string) {
  return value.replace("T", " ").replace("Z", " UTC");
}

function Field({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <label className="lag-journal-field">
      <span>{title}</span>
      {children}
    </label>
  );
}

function SelectField({
  disabled,
  name,
  title,
  values,
}: {
  disabled: boolean;
  name: string;
  title: string;
  values: readonly string[];
}) {
  return (
    <Field title={title}>
      <select className="lag-journal-control" name={name} required defaultValue="" disabled={disabled}>
        <option value="" disabled>Select...</option>
        {values.map((value) => <option key={value} value={value}>{label(value)}</option>)}
      </select>
    </Field>
  );
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

  const chooseType = (next: QuickRecordType) => {
    onEdit();
    setType(next);
  };

  return (
    <form ref={formRef} className="lag-quick-record-form" onSubmit={submit} onChangeCapture={onEdit}>
      <div>
        <p className="lag-journal-eyebrow">Record type</p>
        <div className="lag-journal-segments" role="radiogroup" aria-label="Quick Record type">
          {(["COLLECTION", "EXERCISE", "MEDIA"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              className="lag-journal-chip"
              data-selected={type === value}
              disabled={pending}
              onClick={() => chooseType(value)}
            >
              {label(value)}
            </button>
          ))}
        </div>
      </div>

      <div className="lag-journal-form-grid">
        <Field title="Quick Record subtype">
          <select className="lag-journal-control" name="lifeLogSubtype" aria-label="Quick Record subtype" defaultValue="" disabled={pending}>
            <option value="">None</option>
            {JOURNAL_SUBTYPES.map((subtype) => <option key={subtype} value={subtype}>{label(subtype)}</option>)}
          </select>
        </Field>
        <Field title="Quick Record role">
          <select className="lag-journal-control" name="primaryRoleId" aria-label="Quick Record role" defaultValue="" disabled={pending || rolesLoading}>
            <option value="">No Role</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
      </div>

      {rolesLoading ? <InfoCard>Loading Roles...</InfoCard> : null}
      {rolesError ? <p role="alert" className="lag-journal-feedback" data-state="error">Role selection unavailable: {rolesError}</p> : null}

      <div className="lag-quick-record-fields" data-testid="quick-record-fields">
        <StageContentTransition identity={type}>
          <fieldset className="lag-journal-form-grid" disabled={pending}>
            <legend className="sr-only">{label(type)} fields</legend>
            {type === "COLLECTION" ? (
              <>
                <SelectField name="collectionCategory" title="Collection category" values={COLLECTION_CATEGORIES} disabled={pending} />
                <Field title="Collection title"><input className="lag-journal-control" name="collectionTitle" required /></Field>
                <Field title="Quantity"><input className="lag-journal-control" name="quantity" type="number" min={1} required /></Field>
              </>
            ) : type === "EXERCISE" ? (
              <>
                <SelectField name="exerciseCategory" title="Exercise category" values={EXERCISE_CATEGORIES} disabled={pending} />
                <Field title="Duration minutes"><input className="lag-journal-control" name="durationMinutes" type="number" min={1} required /></Field>
                <Field title="Exercised on"><input className="lag-journal-control" name="exercisedOn" type="date" required /></Field>
                <Field title="Distance km"><input className="lag-journal-control" name="distanceKm" type="number" min={0} step="any" /></Field>
                <Field title="Calories"><input className="lag-journal-control" name="calories" type="number" min={0} /></Field>
                <Field title="Memo"><textarea className="lag-journal-control" name="memo" rows={3} /></Field>
              </>
            ) : (
              <>
                <SelectField name="mediaCategory" title="Media category" values={MEDIA_CATEGORIES} disabled={pending} />
                <Field title="Media title"><input className="lag-journal-control" name="mediaTitle" required /></Field>
                <SelectField name="mediaStatus" title="Media status" values={MEDIA_STATUSES} disabled={pending} />
                <Field title="Current episode"><input className="lag-journal-control" name="currentEpisode" type="number" min={0} /></Field>
                <Field title="Total episodes"><input className="lag-journal-control" name="totalEpisode" type="number" min={1} /></Field>
              </>
            )}
          </fieldset>
        </StageContentTransition>
      </div>

      {error ? <p role="alert" className="lag-journal-feedback" data-state="error">Save failed: {error}</p> : null}
      {result ? <p role="status" className="lag-journal-feedback" data-state="success">✓ {result.replay ? "Quick Record replay confirmed." : "Quick Record saved."}</p> : null}
      {refreshError ? <p role="alert" className="lag-journal-feedback" data-state="error">Refresh failed: {refreshError}</p> : null}
      {canRetry ? (
        <button type="button" className="lag-journal-action" data-variant="retry" disabled={pending} onClick={() => void onRetry().then(resetAfter)}>
          {pending ? "Retrying..." : "Retry same record"}
        </button>
      ) : (
        <button type="submit" className="lag-journal-action" disabled={pending}>
          {pending ? "Saving..." : "Save Quick Record"}
        </button>
      )}
    </form>
  );
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="lag-journal-state">
      <p role="alert" className="lag-journal-feedback" data-state="error">Load failed: {message}</p>
      <button type="button" className="lag-journal-button" onClick={retry}>Retry</button>
    </div>
  );
}

function entryPresentation(entry: JournalEntry) {
  switch (entry.sourceType) {
    case "COLLECTION":
      return {
        title: entry.preview.title,
        summary: [entry.preview.category, entry.preview.quantity !== null ? `Quantity ${entry.preview.quantity}` : null].filter(Boolean).join(" · "),
      };
    case "EXERCISE":
      return {
        title: `${label(entry.preview.category)} · ${entry.preview.exercisedOn}`,
        summary: [
          entry.preview.durationMinutes !== null ? `${entry.preview.durationMinutes} min` : null,
          entry.preview.distanceKm !== null ? `${entry.preview.distanceKm} km` : null,
          entry.preview.calories !== null ? `${entry.preview.calories} kcal` : null,
        ].filter(Boolean).join(" · "),
      };
    case "MEDIA":
      return { title: entry.preview.title, summary: `${label(entry.preview.category)} · ${label(entry.preview.status)} · ${entry.preview.currentEpisode}/${entry.preview.totalEpisode}` };
  }
}

function roleName(primaryRoleId: number | null, roles: RoleDetail[]) {
  if (primaryRoleId === null) return null;
  return roles.find(({ id }) => id === primaryRoleId)?.name ?? `Role #${primaryRoleId}`;
}

function DetailItem({ name, value }: { name: string; value: React.ReactNode }) {
  return (
    <div className="lag-journal-detail-item">
      <dt>{name}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DetailSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="lag-journal-detail-section">
      <h4>{title}</h4>
      <dl>{children}</dl>
    </section>
  );
}

function SourceDetail({ detail }: { detail: JournalDetail }) {
  switch (detail.sourceType) {
    case "COLLECTION":
      return (
        <DetailSection title="Collection">
          <DetailItem name="Category" value={label(detail.source.category)} />
          <DetailItem name="Title" value={detail.source.title} />
          <DetailItem name="Original title" value={detail.source.originalTitle ?? "Not recorded"} />
          <DetailItem name="Quantity" value={detail.source.quantity ?? "Not recorded"} />
          <DetailItem name="Condition" value={detail.source.conditionNote ?? "Not recorded"} />
          <DetailItem name="Acquired from" value={detail.source.acquiredFrom ?? "Not recorded"} />
          <DetailItem name="Tags" value={detail.source.tags.length > 0 ? detail.source.tags.join(", ") : "Not recorded"} />
          <DetailItem name="Created" value={displayTimestamp(detail.source.createdAt)} />
          <DetailItem name="Updated" value={displayTimestamp(detail.source.updatedAt)} />
        </DetailSection>
      );
    case "EXERCISE":
      return (
        <DetailSection title="Exercise">
          <DetailItem name="Category" value={label(detail.source.category)} />
          <DetailItem name="Duration" value={detail.source.durationMinutes === null ? "Not recorded" : `${detail.source.durationMinutes} min`} />
          <DetailItem name="Distance" value={detail.source.distanceKm === null ? "Not recorded" : `${detail.source.distanceKm} km`} />
          <DetailItem name="Calories" value={detail.source.calories === null ? "Not recorded" : `${detail.source.calories} kcal`} />
          <DetailItem name="Exercised on" value={detail.source.exercisedOn} />
          <DetailItem name="Memo" value={detail.source.memo ?? "Not recorded"} />
          <DetailItem name="Created" value={displayTimestamp(detail.source.createdAt)} />
          <DetailItem name="Updated" value={displayTimestamp(detail.source.updatedAt)} />
        </DetailSection>
      );
    case "MEDIA":
      return (
        <DetailSection title="Media">
          <DetailItem name="Category" value={label(detail.source.category)} />
          <DetailItem name="Title" value={detail.source.title} />
          <DetailItem name="Original title" value={detail.source.originalTitle ?? "Not recorded"} />
          <DetailItem name="Progress" value={`${detail.source.currentEpisode}/${detail.source.totalEpisode}`} />
          <DetailItem name="Status" value={label(detail.source.status)} />
          <DetailItem name="Rating" value={detail.source.rating ?? "Not recorded"} />
          <DetailItem name="Tags" value={detail.source.tags.length > 0 ? detail.source.tags.join(", ") : "Not recorded"} />
          <DetailItem name="Rewatch count" value={detail.source.rewatchCount} />
          <DetailItem name="Started" value={detail.source.startedOn ?? "Not recorded"} />
          <DetailItem name="Finished" value={detail.source.finishedOn ?? "Not recorded"} />
          <DetailItem name="Created" value={displayTimestamp(detail.source.createdAt)} />
          <DetailItem name="Updated" value={displayTimestamp(detail.source.updatedAt)} />
        </DetailSection>
      );
  }
}

export default function JournalShell({ roles, rolesLoading = false, rolesError = null }: { roles: RoleDetail[]; rolesLoading?: boolean; rolesError?: string | null }) {
  const journal = useJournalQueries();
  const [quickRecordOpen, setQuickRecordOpen] = useState(false);
  const { data: page, loading, error } = journal.list;
  const detail = journal.detail.data;
  const previousDisabled = loading || journal.params.page === 0;
  const nextDisabled = loading || page.totalPages === 0 || journal.params.page + 1 >= page.totalPages;

  const returnToJournal = () => requestStageFocus("lifelog-journal", "back");
  const openQuickRecord = () => {
    journal.clearSelection();
    setQuickRecordOpen(true);
  };
  const closeQuickRecord = () => {
    setQuickRecordOpen(false);
    journal.clearSelection();
    returnToJournal();
  };
  const closeDetail = () => {
    journal.clearSelection();
    returnToJournal();
  };

  return (
    <div className="lag-panel-rail lag-journal-shell relative" data-testid="journal-shell">
      <PanelStage stageKey="lifelog-journal">
        <PanelFrame title="Journal / LifeLog" depth={1}>
          <div className="lag-journal-surface">
            <div className="lag-journal-toolbar">
              <div>
                <p className="lag-journal-eyebrow">Archive</p>
                <p className="lag-journal-intro">Browse your recorded collections, exercise, and media.</p>
              </div>
              <button type="button" className="lag-journal-action" onClick={openQuickRecord}>Quick Record</button>
            </div>

            <div className="lag-journal-filters" aria-label="Journal filters">
              <Field title="Role">
                <select
                  className="lag-journal-control"
                  aria-label="Role filter"
                  value={journal.params.primaryRoleId ?? ""}
                  onChange={(event) => journal.changeRoleFilter(event.target.value ? Number(event.target.value) : undefined)}
                >
                  <option value="">All Roles</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </Field>
              <Field title="Subtype">
                <select
                  className="lag-journal-control"
                  aria-label="Subtype filter"
                  value={journal.params.subtype ?? ""}
                  onChange={(event) => journal.changeSubtypeFilter(event.target.value ? event.target.value as JournalSubtype : undefined)}
                >
                  <option value="">All Subtypes</option>
                  {JOURNAL_SUBTYPES.map((subtype) => <option key={subtype} value={subtype}>{label(subtype)}</option>)}
                </select>
              </Field>
            </div>
            {rolesLoading ? <InfoCard>Loading Roles...</InfoCard> : null}
            {rolesError ? <p role="alert" className="lag-journal-feedback" data-state="error">Role filter unavailable: {rolesError}</p> : null}

            <section className="lag-journal-archive" aria-label="Journal archive">
              <div className="lag-journal-section-heading">
                <h4>Records</h4>
                <span>{page.totalElements} total</span>
              </div>
              {loading ? <InfoCard>Loading Journal...</InfoCard> : null}
              {error ? <ErrorState message={error} retry={() => void journal.list.reload()} /> : null}
              {!loading && !error && page.content.length === 0 ? <InfoCard>No Journal entries.</InfoCard> : null}
              <div className="lag-journal-list">
                {page.content.map((entry) => {
                  const presentation = entryPresentation(entry);
                  const role = roleName(entry.primaryRoleId, roles);
                  return (
                    <button
                      key={entry.lifeLogId}
                      type="button"
                      className="lag-journal-entry"
                      data-testid="journal-entry"
                      data-selected={journal.selectedLifeLogId === entry.lifeLogId}
                      aria-pressed={journal.selectedLifeLogId === entry.lifeLogId}
                      onClick={() => journal.selectEntry(entry.lifeLogId)}
                    >
                      <span className="lag-journal-source" aria-hidden>{entry.sourceType.slice(0, 2)}</span>
                      <span className="lag-journal-entry-copy">
                        <strong>{presentation.title}</strong>
                        <span className="lag-journal-entry-summary">{presentation.summary}</span>
                        <span className="lag-journal-entry-chips">
                          <span>{label(entry.sourceType)}</span>
                          {entry.subtype ? <span>{label(entry.subtype)}</span> : null}
                          {entry.entryMode === "QUICK" ? <span>Quick</span> : null}
                          {role ? <span>{role}</span> : null}
                          {entry.roleEventId !== null ? <span>Event #{entry.roleEventId}</span> : null}
                        </span>
                      </span>
                      <time dateTime={entry.recordedAt}>{displayTimestamp(entry.recordedAt)}</time>
                    </button>
                  );
                })}
              </div>
              <div className="lag-journal-pagination" aria-label="Journal pages">
                <button type="button" className="lag-journal-button" disabled={previousDisabled} onClick={() => journal.changePage(journal.params.page - 1)}>Previous</button>
                <span>Page {page.totalPages === 0 ? 0 : page.page + 1} / {page.totalPages}</span>
                <button type="button" className="lag-journal-button" disabled={nextDisabled} onClick={() => journal.changePage(journal.params.page + 1)}>Next</button>
              </div>
            </section>
          </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {quickRecordOpen ? (
          <PanelStage stageKey="lifelog-quick-record">
            <PanelFrame title="Quick Record" depth={0} backButton={<BackButton label="Back to Journal" onClick={closeQuickRecord} />}>
              <div className="lag-quick-record-surface">
                <div>
                  <p className="lag-journal-eyebrow">Journal child surface</p>
                  <h4>Record what matters now.</h4>
                  <p>Choose a real record type, then add its current supported details.</p>
                </div>
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
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!quickRecordOpen && journal.selectedLifeLogId ? (
          <PanelStage stageKey="lifelog-journal-detail">
            <PanelFrame
              title="Journal Detail"
              depth={0}
              contentKey={journal.selectedLifeLogId}
              backButton={<BackButton label="Back to Journal" onClick={closeDetail} />}
            >
              {journal.detail.loading && !detail ? <InfoCard>Loading Journal detail...</InfoCard> : null}
              {journal.detail.error && !detail ? <ErrorState message={journal.detail.error} retry={journal.detail.retry} /> : null}
              {detail ? (
                <article className="lag-journal-detail">
                  {journal.detail.error ? <p role="alert" className="lag-journal-feedback" data-state="error">Refresh failed: {journal.detail.error}</p> : null}
                  <div className="lag-journal-detail-hero">
                    <span>{label(detail.sourceType)}</span>
                    <strong>Journal entry #{detail.lifeLogId}</strong>
                  </div>
                  <DetailSection title="Record context">
                    <DetailItem name="Source type" value={label(detail.sourceType)} />
                    <DetailItem name="Recorded at" value={displayTimestamp(detail.recordedAt)} />
                    {detail.subtype ? <DetailItem name="Subtype" value={label(detail.subtype)} /> : null}
                    {detail.entryMode ? <DetailItem name="Entry mode" value={label(detail.entryMode)} /> : null}
                    {detail.reflectionScope ? <DetailItem name="Reflection scope" value={label(detail.reflectionScope)} /> : null}
                    {detail.periodKey ? <DetailItem name="Period" value={detail.periodKey} /> : null}
                    {detail.primaryRoleId !== null ? <DetailItem name="Role context" value={roleName(detail.primaryRoleId, roles)} /> : null}
                    {detail.roleEventId !== null ? <DetailItem name="RoleEvent context" value={`#${detail.roleEventId}`} /> : null}
                  </DetailSection>
                  <SourceDetail detail={detail} />
                </article>
              ) : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
