"use client";

import type { ReactNode } from "react";

import type { HomeJournalEntry } from "./model";
import { useHomeQuery } from "./useHomeQuery";

type HomeShellProps = {
  onOpenJournal: () => void;
  onOpenAchievements: () => void;
  onOpenCurrentQuests: () => void;
  onOpenRoutes: () => void;
  onOpenRole: (roleId: number) => void;
};

function WorldSection({ title, actionLabel, onOpen, className = "", children }: {
  title: string;
  actionLabel: string;
  onOpen?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`lag-home-surface lag-home-section ${className}`}>
      <div className="lag-home-section-header">
        <h2>{title}</h2>
        {onOpen ? <button type="button" className="lag-button-secondary lag-home-action" onClick={onOpen}>{actionLabel}</button> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="lag-home-empty">{children}</p>;
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="lag-home-meta">{children}</p>;
}

function journalPreview(entry: HomeJournalEntry) {
  switch (entry.sourceType) {
    case "COLLECTION":
      return {
        title: entry.preview.title,
        detail: [entry.preview.category, entry.preview.quantity === null ? null : `Quantity ${entry.preview.quantity}`],
      };
    case "EXERCISE":
      return {
        title: entry.preview.category,
        detail: [
          entry.preview.exercisedOn,
          entry.preview.durationMinutes === null ? null : `${entry.preview.durationMinutes} min`,
          entry.preview.distanceKm === null ? null : `${entry.preview.distanceKm} km`,
          entry.preview.calories === null ? null : `${entry.preview.calories} kcal`,
          entry.preview.memo,
        ],
      };
    case "MEDIA":
      const episode = entry.preview.currentEpisode !== null && entry.preview.totalEpisode !== null
        ? `${entry.preview.currentEpisode}/${entry.preview.totalEpisode}`
        : entry.preview.currentEpisode !== null
          ? `Episode ${entry.preview.currentEpisode}`
          : entry.preview.totalEpisode !== null
            ? `Total ${entry.preview.totalEpisode}`
            : null;
      return {
        title: entry.preview.title,
        detail: [
          entry.preview.category,
          entry.preview.status,
          episode,
          entry.preview.rating === null ? null : `Rating ${entry.preview.rating}`,
        ],
      };
  }
}

function HomeError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="lag-home-surface lag-home-error">
      <p role="alert" className="lag-state-error text-sm">Error: {message}</p>
      <button type="button" className="lag-button-secondary lag-home-action" onClick={retry}>Retry</button>
    </div>
  );
}

export default function HomeShell({
  onOpenJournal,
  onOpenAchievements,
  onOpenCurrentQuests,
  onOpenRoutes,
  onOpenRole,
}: HomeShellProps) {
  const home = useHomeQuery();
  const data = home.data;
  const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

  if (home.loading && !data) return <div data-testid="home-shell"><Empty>Loading Home...</Empty></div>;
  if (home.error && !data) return <div data-testid="home-shell"><HomeError message={home.error} retry={() => void home.reload()} /></div>;
  if (!data) return null;

  return (
    <div className="lag-home" data-testid="home-shell">
      <header className="lag-home-surface lag-home-hero">
        <div>
          <p className="lag-home-eyebrow">World overview</p>
          <h1>Home</h1>
          <p className="lag-home-intro">Recent records, active journeys, and the roles shaping your world.</p>
        </div>
        <Meta>Updated <time dateTime={data.generatedAt}>{data.generatedAt}</time>{home.loading ? " · Refreshing" : ""}</Meta>
      </header>

      {home.error ? <HomeError message={home.error} retry={() => void home.reload()} /> : null}

      <div className="lag-home-grid">
        <WorldSection title="Recent Journal" actionLabel="Open Journal" onOpen={onOpenJournal} className="lag-home-section-journal">
          {data.recentJournal.length === 0 ? <Empty>No recent Journal entries.</Empty> : (
            <div className="lag-home-list">
              {data.recentJournal.map((entry) => {
                const preview = journalPreview(entry);
                const metadata = [
                  entry.sourceType,
                  entry.entryMode === "QUICK" ? "QUICK" : entry.entryMode,
                  entry.subtype,
                ].filter((value): value is string => value !== null);
                return (
                  <button key={entry.lifeLogId} type="button" className="lag-home-card lag-home-entry" onClick={onOpenJournal}>
                    <p className="lag-home-entry-title">{preview.title}</p>
                    <Meta>{preview.detail.filter((value): value is string => value !== null).join(" · ")}</Meta>
                    {metadata.length > 0 ? <Meta>{metadata.join(" · ")}</Meta> : null}
                    <Meta><time dateTime={entry.recordedAt}>{entry.recordedAt}</time></Meta>
                  </button>
                );
              })}
            </div>
          )}
        </WorldSection>

        <section className="lag-home-surface lag-home-section lag-home-section-journey">
          <div className="lag-home-section-header">
            <h2>Current Journey</h2>
          </div>
          <div className="lag-home-journey-block">
            <div className="lag-home-subsection-header">
              <h3>Current Quests</h3>
              <button type="button" className="lag-button-secondary lag-home-action" onClick={onOpenCurrentQuests}>Open Quests</button>
            </div>
            {data.journey.currentQuests.length === 0 ? <Empty>No current Quests.</Empty> : data.journey.currentQuests.map((quest) => (
              <button key={quest.acceptanceId} type="button" className="lag-home-card lag-home-entry" onClick={onOpenCurrentQuests}>
                <p className="lag-home-entry-title">{quest.title}</p>
                <Meta>{quest.status} · {quest.progressValue} / {quest.targetValue}</Meta>
                <Meta>Accepted <time dateTime={quest.acceptedAt}>{quest.acceptedAt}</time></Meta>
                {quest.goalReachedAt ? <Meta>Goal reached <time dateTime={quest.goalReachedAt}>{quest.goalReachedAt}</time></Meta> : null}
              </button>
            ))}
          </div>
          <div className="lag-home-journey-block">
            <div className="lag-home-subsection-header">
              <h3>Selected Routes</h3>
              <button type="button" className="lag-button-secondary lag-home-action" onClick={onOpenRoutes}>Open Routes</button>
            </div>
            {data.journey.selectedRoutes.length === 0 ? <Empty>No selected Routes.</Empty> : data.journey.selectedRoutes.map((route) => (
              <button key={route.routeId} type="button" className="lag-home-card lag-home-entry" onClick={onOpenRoutes}>
                <p className="lag-home-entry-title">{route.title}</p>
                <Meta>{route.status}</Meta>
                <Meta>Selected <time dateTime={route.selectedAt}>{route.selectedAt}</time></Meta>
                {route.completedAt ? <Meta>Completed <time dateTime={route.completedAt}>{route.completedAt}</time></Meta> : null}
              </button>
            ))}
          </div>
        </section>

        <WorldSection title="Recent Achievements" actionLabel="Open Achievements" onOpen={onOpenAchievements} className="lag-home-section-achievements">
          {data.recentAchievements.length === 0 ? <Empty>No recent Achievements.</Empty> : (
            <div className="lag-home-list">
              {data.recentAchievements.map((achievement) => (
                <button key={achievement.achievementId} type="button" className="lag-home-card lag-home-entry" onClick={onOpenAchievements}>
                  <p className="lag-home-entry-title">{achievement.name}</p>
                  <Meta>{achievement.category}</Meta>
                  <p className="lag-home-description">{achievement.descMd}</p>
                  <Meta><time dateTime={achievement.acquiredAt}>{achievement.acquiredAt}</time></Meta>
                </button>
              ))}
            </div>
          )}
        </WorldSection>

        <WorldSection
          title="Role Activity — 30 Days"
          actionLabel="Open Roles"
          onOpen={data.roleActivity30d.roles[0] ? () => onOpenRole(data.roleActivity30d.roles[0].roleId) : undefined}
          className="lag-home-section-roles"
        >
          <Meta><time dateTime={data.roleActivity30d.windowStart}>{data.roleActivity30d.windowStart}</time> — <time dateTime={data.roleActivity30d.windowEnd}>{data.roleActivity30d.windowEnd}</time></Meta>
          <dl className="lag-home-role-summary">
            <div><dt>Assigned</dt><dd>{data.roleActivity30d.assignedRecords}</dd></div>
            <div><dt>Unassigned</dt><dd>{data.roleActivity30d.unassignedRecords}</dd></div>
            <div><dt>Total records</dt><dd>{data.roleActivity30d.totalRecords}</dd></div>
          </dl>
          {data.roleActivity30d.assignedRecords === 0 ? <Empty>No assigned Role activity.</Empty> : (
            <div className="lag-home-role-list">
              {data.roleActivity30d.roles.map((role) => (
                <button key={role.roleId} type="button" className="lag-home-card lag-home-entry" onClick={() => onOpenRole(role.roleId)}>
                  <p className="lag-home-entry-title">{role.roleName ?? "Unnamed Role"}</p>
                  <Meta>{role.recordCount} records · {percent.format(role.share)}</Meta>
                </button>
              ))}
            </div>
          )}
        </WorldSection>
      </div>
    </div>
  );
}
