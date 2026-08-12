import type {
  JournalEntryMode,
  JournalSourceType,
  JournalSubtype,
  QuestRouteStatus,
  QuestStatus,
} from "@/shared/api/types";

type HomeJournalBase<T extends JournalSourceType, P> = {
  lifeLogId: number;
  sourceType: T;
  subtype: JournalSubtype | null;
  entryMode: JournalEntryMode | null;
  primaryRoleId: number | null;
  roleEventId: number | null;
  recordedAt: string;
  preview: P;
};

export type HomeJournalEntry =
  | HomeJournalBase<"COLLECTION", {
      category: string;
      title: string;
      quantity: number | null;
    }>
  | HomeJournalBase<"EXERCISE", {
      category: string;
      durationMinutes: number | null;
      distanceKm: number | null;
      calories: number | null;
      exercisedOn: string;
      memo: string | null;
    }>
  | HomeJournalBase<"MEDIA", {
      category: string;
      title: string;
      currentEpisode: number;
      totalEpisode: number;
      status: string;
      rating: number | null;
    }>;

export type HomeSummary = {
  generatedAt: string;
  recentJournal: HomeJournalEntry[];
  recentAchievements: Array<{
    achievementId: number;
    code: string;
    name: string;
    category: string;
    descMd: string;
    acquiredAt: string;
  }>;
  journey: {
    currentQuests: Array<{
      acceptanceId: number;
      questCode: string;
      title: string;
      status: QuestStatus;
      progressValue: number;
      targetValue: number;
      acceptedAt: string;
      goalReachedAt: string | null;
    }>;
    selectedRoutes: Array<{
      routeId: number;
      routeCode: string;
      title: string;
      status: QuestRouteStatus;
      currentStepId: number | null;
      selectedAt: string;
      completedAt: string | null;
    }>;
  };
  roleActivity30d: {
    windowStart: string;
    windowEnd: string;
    totalRecords: number;
    assignedRecords: number;
    unassignedRecords: number;
    roles: Array<{
      roleId: number;
      roleName: string | null;
      recordCount: number;
      share: number;
    }>;
  };
};
