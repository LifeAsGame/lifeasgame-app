import type {
  CollectionCreateRequest,
  CollectionInfo,
  CollectionSearchParams,
  CollectionUpdateRequest,
  JournalDetail,
  JournalEntry,
  JournalListParams,
  JournalPage,
  QuickRecordRequest,
  QuickRecordResult,
} from "@/shared/api/types";

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

export const MOCK_COLLECTION_SOURCES = [
  {
    id: 204,
    playerId: 6,
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
  {
    id: 201,
    playerId: 6,
    category: "FIGURE",
    title: "Legacy Collection",
    originalTitle: null,
    quantity: 1,
    conditionNote: null,
    acquiredFrom: null,
    tags: [],
    createdAt: "2026-08-10T10:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z",
  },
] satisfies CollectionInfo[];

let journalEntries: JournalEntry[] = structuredClone([...MOCK_JOURNAL_ENTRIES]);
let journalDetails: JournalDetail[] = structuredClone(MOCK_JOURNAL_DETAILS);
let collectionEntries: CollectionInfo[] = structuredClone(MOCK_COLLECTION_SOURCES);
const quickRecordReceipts = new Map<string, { payload: string; result: QuickRecordResult }>();

function copy<T>(value: T): T {
  return structuredClone(value);
}

function normalizeMediaProgress(currentEpisode?: number, totalEpisode?: number) {
  const current = currentEpisode ?? 0;
  return { currentEpisode: current, totalEpisode: totalEpisode ?? Math.max(1, current) };
}

export function resetJournalMock(): void {
  journalEntries = structuredClone([...MOCK_JOURNAL_ENTRIES]);
  journalDetails = structuredClone(MOCK_JOURNAL_DETAILS);
  collectionEntries = structuredClone(MOCK_COLLECTION_SOURCES);
  quickRecordReceipts.clear();
}

function recordQuick(body: QuickRecordRequest, idempotencyKey: string): QuickRecordResult {
  const payload = JSON.stringify(body);
  const receipt = quickRecordReceipts.get(idempotencyKey);
  if (receipt) {
    if (receipt.payload !== payload) throw new Error("Idempotency key payload conflict.");
    return copy({ ...receipt.result, replay: true });
  }

  const lifeLogId = Math.max(0, ...journalEntries.map((entry) => entry.lifeLogId)) + 1;
  const sourceId = Math.max(
    0,
    ...journalEntries.map((entry) => entry.sourceId),
    ...collectionEntries.map((entry) => entry.id),
  ) + 1;
  const recordedAt = new Date().toISOString();
  const metadata = {
    lifeLogId,
    sourceId,
    subtype: body.lifeLogSubtype ?? null,
    entryMode: "QUICK" as const,
    reflectionScope: null,
    periodKey: null,
    primaryRoleId: body.primaryRoleId ?? null,
    roleEventId: null,
    recordedAt,
  };

  let entry: JournalEntry;
  let detail: JournalDetail;
  if (body.type === "COLLECTION") {
    entry = { ...metadata, sourceType: "COLLECTION", preview: { ...body.collection } };
    detail = {
      ...metadata,
      sourceType: "COLLECTION",
      source: {
        ...body.collection,
        originalTitle: null,
        conditionNote: null,
        acquiredFrom: null,
        tags: [],
        createdAt: recordedAt,
        updatedAt: recordedAt,
      },
    };
    collectionEntries.unshift({
      id: sourceId,
      playerId: 6,
      ...body.collection,
      originalTitle: null,
      conditionNote: null,
      acquiredFrom: null,
      tags: [],
      createdAt: recordedAt,
      updatedAt: recordedAt,
    });
  } else if (body.type === "EXERCISE") {
    const source = {
      category: body.exercise.category,
      durationMinutes: body.exercise.durationMinutes,
      distanceKm: body.exercise.distanceKm ?? null,
      calories: body.exercise.calories ?? null,
      exercisedOn: body.exercise.exercisedOn,
      memo: body.exercise.memo ?? null,
    };
    entry = { ...metadata, sourceType: "EXERCISE", preview: source };
    detail = { ...metadata, sourceType: "EXERCISE", source: { ...source, createdAt: recordedAt, updatedAt: recordedAt } };
  } else {
    const source = {
      category: body.media.category,
      title: body.media.title,
      originalTitle: null,
      ...normalizeMediaProgress(body.media.currentEpisode, body.media.totalEpisode),
      status: body.media.status,
      tags: [],
    };
    entry = { ...metadata, sourceType: "MEDIA", preview: { ...source, rating: null } };
    detail = {
      ...metadata,
      sourceType: "MEDIA",
      source: {
        ...source,
        rating: null,
        rewatchCount: 0,
        startedOn: null,
        finishedOn: null,
        createdAt: recordedAt,
        updatedAt: recordedAt,
      },
    };
  }

  journalEntries.unshift(entry);
  journalDetails.unshift(detail);
  const result = { sourceType: body.type, sourceId, recordedAt, replay: false } satisfies QuickRecordResult;
  quickRecordReceipts.set(idempotencyKey, { payload, result });
  return copy(result);
}

function collection(id: number): CollectionInfo {
  const found = collectionEntries.find((entry) => entry.id === id);
  if (!found) throw new Error("Collection not found.");
  return found;
}

const MOCK_MUTATION_TIME = "2026-08-14T00:00:00Z";

export const collectionMock = {
  recent: (limit: number): CollectionInfo[] => copy(collectionEntries.slice(0, limit)),
  search: ({ category, titleLike, page, size }: CollectionSearchParams): CollectionInfo[] => {
    const title = titleLike?.trim().toLowerCase();
    const filtered = collectionEntries.filter((entry) =>
      (!category || entry.category === category)
      && (!title || entry.title.toLowerCase().includes(title))
    );
    return copy(filtered.slice(page * size, (page + 1) * size));
  },
  get: (id: number): CollectionInfo => copy(collection(id)),
  create: (body: CollectionCreateRequest): { id: number } => {
    const id = Math.max(0, ...collectionEntries.map((entry) => entry.id)) + 1;
    collectionEntries.unshift({
      id,
      playerId: 6,
      category: body.category,
      title: body.title.trim(),
      originalTitle: body.originalTitle?.trim() || null,
      quantity: body.quantity,
      conditionNote: body.conditionNote?.trim() || null,
      acquiredFrom: body.acquiredFrom?.trim() || null,
      tags: copy(body.tags ?? []),
      createdAt: MOCK_MUTATION_TIME,
      updatedAt: MOCK_MUTATION_TIME,
    });
    return { id };
  },
  update: (id: number, body: CollectionUpdateRequest): CollectionInfo => {
    const current = collection(id);
    const updated = {
      ...current,
      ...(body.quantity === undefined ? {} : { quantity: body.quantity }),
      ...(body.conditionNote === undefined ? {} : { conditionNote: body.conditionNote.trim() || null }),
      ...(body.acquiredFrom === undefined ? {} : { acquiredFrom: body.acquiredFrom.trim() || null }),
      updatedAt: MOCK_MUTATION_TIME,
    };
    collectionEntries = collectionEntries.map((entry) => entry.id === id ? updated : entry);
    return copy(updated);
  },
  delete: (id: number): { id: number } => {
    collection(id);
    collectionEntries = collectionEntries.filter((entry) => entry.id !== id);
    return { id };
  },
};

export const journalMock = {
  page: ({ primaryRoleId, subtype, page, size }: JournalListParams): JournalPage => {
    const filtered = journalEntries.filter((entry) =>
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
    const detail = journalDetails.find((entry) => entry.lifeLogId === lifeLogId);
    if (!detail) throw new Error("Journal entry not found.");
    return copy(detail);
  },
  quickRecord: recordQuick,
};
