import type { JournalDetail, JournalEntry, JournalListParams, JournalPage } from "@/shared/api/types";

export const MOCK_JOURNAL_ENTRIES = [
  {
    lifeLogId: 104,
    sourceType: "COLLECTION",
    sourceId: 204,
    subtype: "MEMORY",
    entryMode: "FULL",
    reflectionScope: null,
    periodKey: null,
    primaryRoleId: 1,
    roleEventId: 11,
    recordedAt: "2026-08-12T09:00:00Z",
    preview: { category: "BOOK", title: "Architecture Notes", quantity: 1 },
  },
  {
    lifeLogId: 103,
    sourceType: "EXERCISE",
    sourceId: 203,
    subtype: "ACTIVITY",
    entryMode: "QUICK",
    reflectionScope: null,
    periodKey: null,
    primaryRoleId: null,
    roleEventId: null,
    recordedAt: "2026-08-12T08:00:00Z",
    preview: { category: "RUNNING", durationMinutes: 25, distanceKm: 4.2, calories: 240, exercisedOn: "2026-08-12", memo: "Morning run" },
  },
  {
    lifeLogId: 102,
    sourceType: "MEDIA",
    sourceId: 202,
    subtype: "REFLECTION",
    entryMode: "FULL",
    reflectionScope: "WEEKLY_LOOKBACK",
    periodKey: "2026-W33",
    primaryRoleId: 2,
    roleEventId: null,
    recordedAt: "2026-08-11T13:00:00Z",
    preview: { category: "BOOK", title: "Designing Data-Intensive Applications", currentEpisode: 250, totalEpisode: 616, status: "READING", rating: 4.8 },
  },
  {
    lifeLogId: 101,
    sourceType: "COLLECTION",
    sourceId: 201,
    subtype: null,
    entryMode: null,
    reflectionScope: null,
    periodKey: null,
    primaryRoleId: null,
    roleEventId: null,
    recordedAt: "2026-08-10T10:00:00Z",
    preview: { category: "FIGURE", title: "Legacy Collection", quantity: null },
  },
] as const satisfies readonly JournalEntry[];

function withoutPreview<T extends JournalEntry>({ preview, ...metadata }: T): Omit<T, "preview"> {
  void preview;
  return metadata;
}

export const MOCK_JOURNAL_DETAILS = [
  {
    ...withoutPreview(MOCK_JOURNAL_ENTRIES[0]),
    source: {
      category: "BOOK",
      title: "Architecture Notes",
      originalTitle: null,
      quantity: 1,
      conditionNote: "Annotated",
      acquiredFrom: "Local bookstore",
      tags: ["architecture", "journal"],
      createdAt: "2026-08-12T09:00:00Z",
      updatedAt: "2026-08-12T09:00:00Z",
    },
  },
  {
    ...withoutPreview(MOCK_JOURNAL_ENTRIES[1]),
    source: {
      category: "RUNNING",
      durationMinutes: 25,
      distanceKm: 4.2,
      calories: 240,
      exercisedOn: "2026-08-12",
      memo: "Morning run",
      createdAt: "2026-08-12T08:00:00Z",
      updatedAt: "2026-08-12T08:00:00Z",
    },
  },
  {
    ...withoutPreview(MOCK_JOURNAL_ENTRIES[2]),
    source: {
      category: "BOOK",
      title: "Designing Data-Intensive Applications",
      originalTitle: null,
      currentEpisode: 250,
      totalEpisode: 616,
      status: "READING",
      rating: 4.8,
      tags: ["systems"],
      rewatchCount: 0,
      startedOn: "2026-08-01",
      finishedOn: null,
      createdAt: "2026-08-11T13:00:00Z",
      updatedAt: "2026-08-11T13:00:00Z",
    },
  },
  {
    ...withoutPreview(MOCK_JOURNAL_ENTRIES[3]),
    source: {
      category: "FIGURE",
      title: "Legacy Collection",
      originalTitle: null,
      quantity: null,
      conditionNote: null,
      acquiredFrom: null,
      tags: [],
      createdAt: "2026-08-10T10:00:00Z",
      updatedAt: "2026-08-10T10:00:00Z",
    },
  },
] satisfies JournalDetail[];

function copy<T>(value: T): T {
  return structuredClone(value);
}

export const journalMock = {
  page: ({ primaryRoleId, subtype, page, size }: JournalListParams): JournalPage => {
    const filtered = MOCK_JOURNAL_ENTRIES.filter((entry) =>
      (primaryRoleId === undefined || entry.primaryRoleId === primaryRoleId)
      && (subtype === undefined || entry.subtype === subtype)
    );
    return copy({
      content: filtered.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    });
  },
  detail: (lifeLogId: number): JournalDetail => {
    const detail = MOCK_JOURNAL_DETAILS.find((entry) => entry.lifeLogId === lifeLogId);
    if (!detail) throw new Error("Journal entry not found.");
    return copy(detail);
  },
};
