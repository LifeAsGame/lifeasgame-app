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

const buttonStyle = {
  borderRadius: "var(--lag-radius-sm)",
} as const;

const retryStyle = {
  ...buttonStyle,
  padding: "7px 12px",
  fontSize: "0.72rem",
} as const;

function WorldSection({ title, actionLabel, onOpen, children }: {
  title: string;
  actionLabel: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="lag-home-surface min-w-0 space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="lag-text-primary text-sm font-semibold tracking-[0.12em]">{title}</h2>
        {onOpen ? <button type="button" className="lag-button-secondary" style={retryStyle} onClick={onOpen}>{actionLabel}</button> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="lag-text-meta text-sm">{children}</p>;
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="lag-text-meta text-xs">{children}</p>;
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
    <div className="lag-home-surface flex items-center justify-between gap-4 border-l-4 p-4" style={{ borderLeftColor: "var(--lag-state-error)" }}>
      <p role="alert" className="lag-state-error text-sm">Error: {message}</p>
      <button type="button" className="lag-button-secondary" style={retryStyle} onClick={retry}>Retry</button>
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
    <div className="lag-home w-full max-w-[1200px] space-y-4" data-testid="home-shell">
      <header className="lag-home-surface lag-home-hero px-5 py-4">
        <p className="lag-text-meta text-xs tracking-[0.18em]">AUTHENTICATED WORLD</p>
        <h1 className="lag-text-primary mt-1 text-xl font-semibold">Home</h1>
        <Meta>Generated <time dateTime={data.generatedAt}>{data.generatedAt}</time>{home.loading ? " · Refreshing" : ""}</Meta>
      </header>

      {home.error ? <HomeError message={home.error} retry={() => void home.reload()} /> : null}

      <div className="lag-home-grid grid grid-cols-2 gap-4">
        <WorldSection title="Recent Journal" actionLabel="Open Journal" onOpen={onOpenJournal}>
          {data.recentJournal.length === 0 ? <Empty>No recent Journal entries.</Empty> : (
            <div className="space-y-2">
              {data.recentJournal.map((entry) => {
                const preview = journalPreview(entry);
                const metadata = [
                  entry.sourceType,
                  entry.entryMode === "QUICK" ? "QUICK" : entry.entryMode,
                  entry.subtype,
                  entry.primaryRoleId === null ? null : `Role #${entry.primaryRoleId}`,
                  entry.roleEventId === null ? null : `Event #${entry.roleEventId}`,
                ].filter((value): value is string => value !== null);
                return (
                  <button key={entry.lifeLogId} type="button" className="lag-home-card block w-full p-3 text-left" style={buttonStyle} onClick={onOpenJournal}>
                    <p className="text-sm font-semibold">{preview.title}</p>
                    <Meta>{preview.detail.filter((value): value is string => value !== null).join(" · ")}</Meta>
                    <Meta>{metadata.join(" · ")}</Meta>
                    <Meta><time dateTime={entry.recordedAt}>{entry.recordedAt}</time></Meta>
                  </button>
                );
              })}
            </div>
          )}
        </WorldSection>

        <WorldSection title="Recent Achievements" actionLabel="Open Achievements" onOpen={onOpenAchievements}>
          {data.recentAchievements.length === 0 ? <Empty>No recent Achievements.</Empty> : (
            <div className="space-y-2">
              {data.recentAchievements.map((achievement) => (
                <button key={achievement.achievementId} type="button" className="lag-home-card block w-full p-3 text-left" style={buttonStyle} onClick={onOpenAchievements}>
                  <p className="text-sm font-semibold">{achievement.name}</p>
                  <Meta>{achievement.category}</Meta>
                  <p className="lag-text-secondary line-clamp-2 text-xs">{achievement.descMd}</p>
                  <Meta><time dateTime={achievement.acquiredAt}>{achievement.acquiredAt}</time></Meta>
                </button>
              ))}
            </div>
          )}
        </WorldSection>

        <section className="lag-home-surface min-w-0 space-y-4 p-4">
          <h2 className="lag-text-primary text-sm font-semibold tracking-[0.12em]">Current Journey</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="lag-text-secondary text-xs font-semibold">Current Quests</h3>
              <button type="button" className="lag-button-secondary" style={retryStyle} onClick={onOpenCurrentQuests}>Open Quests</button>
            </div>
            {data.journey.currentQuests.length === 0 ? <Empty>No current Quests.</Empty> : data.journey.currentQuests.map((quest) => (
              <button key={quest.acceptanceId} type="button" className="lag-home-card block w-full p-3 text-left" style={buttonStyle} onClick={onOpenCurrentQuests}>
                <p className="text-sm font-semibold">{quest.title}</p>
                <Meta>{quest.status} · {quest.progressValue} / {quest.targetValue}</Meta>
                <Meta>Accepted <time dateTime={quest.acceptedAt}>{quest.acceptedAt}</time></Meta>
                {quest.goalReachedAt ? <Meta>Goal reached <time dateTime={quest.goalReachedAt}>{quest.goalReachedAt}</time></Meta> : null}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="lag-text-secondary text-xs font-semibold">Selected Routes</h3>
              <button type="button" className="lag-button-secondary" style={retryStyle} onClick={onOpenRoutes}>Open Routes</button>
            </div>
            {data.journey.selectedRoutes.length === 0 ? <Empty>No selected Routes.</Empty> : data.journey.selectedRoutes.map((route) => (
              <button key={route.routeId} type="button" className="lag-home-card block w-full p-3 text-left" style={buttonStyle} onClick={onOpenRoutes}>
                <p className="text-sm font-semibold">{route.title}</p>
                <Meta>{route.status}{route.currentStepId === null ? "" : ` · Current Step #${route.currentStepId}`}</Meta>
                <Meta>Selected <time dateTime={route.selectedAt}>{route.selectedAt}</time></Meta>
                {route.completedAt ? <Meta>Completed <time dateTime={route.completedAt}>{route.completedAt}</time></Meta> : null}
              </button>
            ))}
          </div>
        </section>

        <WorldSection
          title="Role Activity — 30 Days"
          actionLabel="Open Roles"
          onOpen={data.roleActivity30d.roles[0] ? () => onOpenRole(data.roleActivity30d.roles[0].roleId) : undefined}
        >
          <Meta><time dateTime={data.roleActivity30d.windowStart}>{data.roleActivity30d.windowStart}</time> — <time dateTime={data.roleActivity30d.windowEnd}>{data.roleActivity30d.windowEnd}</time></Meta>
          <Meta>Assigned {data.roleActivity30d.assignedRecords} · Unassigned {data.roleActivity30d.unassignedRecords} · Total {data.roleActivity30d.totalRecords}</Meta>
          {data.roleActivity30d.assignedRecords === 0 ? <Empty>No assigned Role activity.</Empty> : (
            <div className="space-y-2">
              {data.roleActivity30d.roles.map((role) => (
                <button key={role.roleId} type="button" className="lag-home-card block w-full p-3 text-left" style={buttonStyle} onClick={() => onOpenRole(role.roleId)}>
                  <p className="text-sm font-semibold">{role.roleName ?? `Role #${role.roleId}`}</p>
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
