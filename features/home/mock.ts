import type { HomeSummary } from "./model";

export const MOCK_HOME_SUMMARY = {
  generatedAt: "2026-08-12T09:30:00Z",
  recentJournal: [
    {
      lifeLogId: 301,
      sourceType: "COLLECTION",
      subtype: null,
      entryMode: "QUICK",
      primaryRoleId: null,
      roleEventId: null,
      recordedAt: "2026-08-12T09:20:00Z",
      preview: { category: "BOOK", title: "Distributed Systems Notes", quantity: 1 },
    },
    {
      lifeLogId: 302,
      sourceType: "EXERCISE",
      subtype: "ACTIVITY",
      entryMode: "FULL",
      primaryRoleId: 31,
      roleEventId: 901,
      recordedAt: "2026-08-12T08:10:00Z",
      preview: {
        category: "RUNNING",
        durationMinutes: 30,
        distanceKm: 5.2,
        calories: null,
        exercisedOn: "2026-08-12",
        memo: null,
      },
    },
    {
      lifeLogId: 303,
      sourceType: "MEDIA",
      subtype: "REFLECTION",
      entryMode: "FULL",
      primaryRoleId: null,
      roleEventId: null,
      recordedAt: "2026-08-11T20:00:00Z",
      preview: {
        category: "BOOK",
        title: "Designing Data-Intensive Applications",
        currentEpisode: 250,
        totalEpisode: 616,
        status: "READING",
        rating: 4.8,
      },
    },
  ],
  recentAchievements: [
    {
      achievementId: 601,
      code: "HOME_FIRST",
      name: "First World Trace",
      category: "STORY",
      descMd: "Recorded the first trace in your world.",
      acquiredAt: "2026-08-12T09:25:00Z",
    },
  ],
  journey: {
    currentQuests: [
      {
        acceptanceId: 401,
        questCode: "Q_FOCUS_25",
        title: "Focus for 25 Minutes",
        status: "GOAL_REACHED",
        progressValue: 25,
        targetValue: 25,
        acceptedAt: "2026-08-12T07:00:00Z",
        goalReachedAt: "2026-08-12T07:25:00Z",
      },
      {
        acceptanceId: 402,
        questCode: "Q_RECORD_THREE",
        title: "Connect Three Traces",
        status: "IN_PROGRESS",
        progressValue: 1,
        targetValue: 3,
        acceptedAt: "2026-08-11T07:00:00Z",
        goalReachedAt: null,
      },
    ],
    selectedRoutes: [
      {
        routeId: 501,
        routeCode: "ROUTE_RECORD",
        title: "Begin with Records",
        status: "IN_PROGRESS",
        currentStepId: 11,
        selectedAt: "2026-08-10T01:00:00Z",
        completedAt: null,
      },
      {
        routeId: 502,
        routeCode: "ROUTE_RECOVERY",
        title: "Build a Recovery Rhythm",
        status: "IN_PROGRESS",
        currentStepId: null,
        selectedAt: "2026-08-09T01:00:00Z",
        completedAt: null,
      },
    ],
  },
  roleActivity30d: {
    windowStart: "2026-07-14T09:30:00Z",
    windowEnd: "2026-08-12T09:30:00Z",
    totalRecords: 10,
    assignedRecords: 8,
    unassignedRecords: 2,
    roles: [
      { roleId: 31, roleName: "Developer", recordCount: 5, share: 0.625 },
      { roleId: 32, roleName: null, recordCount: 3, share: 0.375 },
    ],
  },
} satisfies HomeSummary;

export function homeMock(): HomeSummary {
  return structuredClone(MOCK_HOME_SUMMARY);
}
