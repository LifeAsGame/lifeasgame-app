"use client";

import type { JournalDetail, JournalEntry, JournalSubtype, RoleDetail } from "@/shared/api/types";
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
