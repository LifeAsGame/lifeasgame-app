"use client";

import { consumerLabel } from "@/shared/lib/consumerLabels";
import type { ReactNode } from "react";

import type { HomeJournalEntry } from "./model";
import { useHomeQuery } from "./useHomeQuery";

type HomeShellProps = {
  active?: boolean;
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
        detail: [consumerLabel(entry.preview.category), entry.preview.quantity === null ? null : `수량 ${entry.preview.quantity}`],
      };
    case "EXERCISE":
      return {
        title: consumerLabel(entry.preview.category),
        detail: [
          entry.preview.exercisedOn,
          entry.preview.durationMinutes === null ? null : `${entry.preview.durationMinutes}분`,
          entry.preview.distanceKm === null ? null : `${entry.preview.distanceKm} km`,
          entry.preview.calories === null ? null : `${entry.preview.calories} kcal`,
          entry.preview.memo,
        ],
      };
    case "MEDIA":
      const episode = entry.preview.currentEpisode !== null && entry.preview.totalEpisode !== null
        ? `${entry.preview.currentEpisode}/${entry.preview.totalEpisode}`
        : entry.preview.currentEpisode !== null
          ? `회차 ${entry.preview.currentEpisode}`
          : entry.preview.totalEpisode !== null
            ? `전체 ${entry.preview.totalEpisode}`
            : null;
      return {
        title: entry.preview.title,
        detail: [
          consumerLabel(entry.preview.category),
          entry.preview.status === null ? null : consumerLabel(entry.preview.status),
          episode,
          entry.preview.rating === null ? null : `평점 ${entry.preview.rating}`,
        ],
      };
  }
}

function HomeError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="lag-home-surface lag-home-error">
      <p role="alert" className="lag-state-error text-sm">조회 오류: {message}</p>
      <button type="button" className="lag-button-secondary lag-home-action" onClick={retry}>다시 조회</button>
    </div>
  );
}

export default function HomeShell({
  active = true,
  onOpenJournal,
  onOpenAchievements,
  onOpenCurrentQuests,
  onOpenRoutes,
  onOpenRole,
}: HomeShellProps) {
  const home = useHomeQuery(active);
  const data = home.data;
  const percent = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 1 });

  if (home.loading && !data) return <div data-testid="home-shell"><Empty>홈을 불러오는 중…</Empty></div>;
  if (home.error && !data) return <div data-testid="home-shell"><HomeError message={home.error} retry={() => void home.reload()} /></div>;
  if (!data) return null;

  return (
    <div className="lag-home" data-camera-layout-owner="surface" data-testid="home-shell">
      <header className="lag-home-surface lag-home-hero">
        <div>
          <p className="lag-home-eyebrow">나의 일상</p>
          <h1>홈</h1>
          <p className="lag-home-intro">최근 기록과 이어가는 여정, 나의 역할을 살펴보세요.</p>
        </div>
        <Meta>갱신 시각 <time dateTime={data.generatedAt}>{data.generatedAt}</time>{home.loading ? " · 새로 조회 중" : ""}</Meta>
      </header>

      {home.error ? <HomeError message={home.error} retry={() => void home.reload()} /> : null}

      <div className="lag-home-grid">
        <WorldSection title="최근 기록" actionLabel="기록 보기" onOpen={onOpenJournal} className="lag-home-section-journal">
          {data.recentJournal.length === 0 ? <Empty>최근 기록이 없습니다.</Empty> : (
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
                    {metadata.length > 0 ? <Meta>{metadata.map(consumerLabel).join(" · ")}</Meta> : null}
                    <Meta><time dateTime={entry.recordedAt}>{entry.recordedAt}</time></Meta>
                  </button>
                );
              })}
            </div>
          )}
        </WorldSection>

        <section className="lag-home-surface lag-home-section lag-home-section-journey">
          <div className="lag-home-section-header">
            <h2>이어가는 여정</h2>
          </div>
          <div className="lag-home-journey-block">
            <div className="lag-home-subsection-header">
              <h3>진행 퀘스트</h3>
              <button type="button" className="lag-button-secondary lag-home-action" onClick={onOpenCurrentQuests}>퀘스트 보기</button>
            </div>
            {data.journey.currentQuests.length === 0 ? <Empty>진행 중인 퀘스트가 없습니다.</Empty> : (
              <div className="lag-home-list">
                {data.journey.currentQuests.map((quest) => (
                  <button key={quest.acceptanceId} type="button" className="lag-home-card lag-home-entry" onClick={onOpenCurrentQuests}>
                    <p className="lag-home-entry-title">{quest.title}</p>
                    <Meta>{consumerLabel(quest.status)} · {quest.progressValue} / {quest.targetValue}</Meta>
                    <Meta>수락 시각 <time dateTime={quest.acceptedAt}>{quest.acceptedAt}</time></Meta>
                    {quest.goalReachedAt ? <Meta>목표 도달 시각 <time dateTime={quest.goalReachedAt}>{quest.goalReachedAt}</time></Meta> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="lag-home-journey-block">
            <div className="lag-home-subsection-header">
              <h3>선택한 경로</h3>
              <button type="button" className="lag-button-secondary lag-home-action" onClick={onOpenRoutes}>경로 보기</button>
            </div>
            {data.journey.selectedRoutes.length === 0 ? <Empty>선택한 경로가 없습니다.</Empty> : (
              <div className="lag-home-list">
                {data.journey.selectedRoutes.map((route) => (
                  <button key={route.routeId} type="button" className="lag-home-card lag-home-entry" onClick={onOpenRoutes}>
                    <p className="lag-home-entry-title">{route.title}</p>
                    <Meta>{consumerLabel(route.status)}</Meta>
                    <Meta>선택 시각 <time dateTime={route.selectedAt}>{route.selectedAt}</time></Meta>
                    {route.completedAt ? <Meta>완료 시각 <time dateTime={route.completedAt}>{route.completedAt}</time></Meta> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <WorldSection title="최근 업적" actionLabel="업적 보기" onOpen={onOpenAchievements} className="lag-home-section-achievements">
          {data.recentAchievements.length === 0 ? <Empty>최근 획득한 업적이 없습니다.</Empty> : (
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
          title="최근 30일 역할 활동"
          actionLabel="역할 보기"
          onOpen={data.roleActivity30d.roles[0] ? () => onOpenRole(data.roleActivity30d.roles[0].roleId) : undefined}
          className="lag-home-section-roles"
        >
          <Meta><time dateTime={data.roleActivity30d.windowStart}>{data.roleActivity30d.windowStart}</time> — <time dateTime={data.roleActivity30d.windowEnd}>{data.roleActivity30d.windowEnd}</time></Meta>
          <dl className="lag-home-role-summary">
            <div><dt>역할 지정</dt><dd>{data.roleActivity30d.assignedRecords}</dd></div>
            <div><dt>역할 미지정</dt><dd>{data.roleActivity30d.unassignedRecords}</dd></div>
            <div><dt>전체 기록</dt><dd>{data.roleActivity30d.totalRecords}</dd></div>
          </dl>
          {data.roleActivity30d.assignedRecords === 0 ? <Empty>역할에 연결된 활동이 없습니다.</Empty> : (
            <div className="lag-home-role-list">
              {data.roleActivity30d.roles.map((role) => (
                <button key={role.roleId} type="button" className="lag-home-card lag-home-entry" onClick={() => onOpenRole(role.roleId)}>
                  <p className="lag-home-entry-title">{role.roleName ?? "이름 없는 역할"}</p>
                  <Meta>{role.recordCount}건 · {percent.format(role.share)}</Meta>
                </button>
              ))}
            </div>
          )}
        </WorldSection>
      </div>
    </div>
  );
}
