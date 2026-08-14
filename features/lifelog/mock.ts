import type {
  CollectionCreateRequest,
  CollectionInfo,
  CollectionSearchParams,
  CollectionUpdateRequest,
  ExerciseCreateRequest,
  ExerciseInfo,
  ExerciseSearchParams,
  ExerciseUpdateRequest,
  JournalDetail,
  JournalEntry,
  JournalListParams,
  JournalPage,
  MediaCreateRequest,
  MediaInfo,
  MediaSearchParams,
  MediaUpdateRequest,
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
    preview: { category: "BOOK", title: "Designing Data-Intensive Applications", currentEpisode: 250, totalEpisode: 616, status: "WATCHING", rating: 4.8 },
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
      status: "WATCHING",
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

export const MOCK_EXERCISE_SOURCES = [
  { id: 203, playerId: 6, category: "RUNNING", durationMinutes: 25, distanceKm: 4.2, calories: 240, exercisedOn: "2026-08-12", memo: "Morning run", createdAt: "2026-08-12T08:00:00Z", updatedAt: "2026-08-12T08:00:00Z" },
  { id: 200, playerId: 6, category: "YOGA", durationMinutes: 45, distanceKm: null, calories: 120, exercisedOn: "2026-08-09", memo: null, createdAt: "2026-08-09T07:00:00Z", updatedAt: "2026-08-09T07:00:00Z" },
] satisfies ExerciseInfo[];

export const MOCK_MEDIA_SOURCES = [
  { id: 202, playerId: 7, category: "BOOK", title: "Designing Data-Intensive Applications", originalTitle: null, currentEpisode: 250, totalEpisode: 616, status: "WATCHING", rating: 4.8, tags: ["systems"], rewatchCount: 0, startedOn: "2026-08-01", finishedOn: null, createdAt: "2026-08-11T13:00:00Z", updatedAt: "2026-08-11T13:00:00Z" },
  { id: 199, playerId: 7, category: "ANIME", title: "Frieren", originalTitle: "葬送のフリーレン", currentEpisode: 28, totalEpisode: 28, status: "COMPLETED", rating: null, tags: [], rewatchCount: 0, startedOn: "2026-07-01", finishedOn: "2026-07-28", createdAt: "2026-07-01T10:00:00Z", updatedAt: "2026-07-28T10:00:00Z" },
] satisfies MediaInfo[];

let journalEntries: JournalEntry[] = structuredClone([...MOCK_JOURNAL_ENTRIES]);
let journalDetails: JournalDetail[] = structuredClone(MOCK_JOURNAL_DETAILS);
let collectionEntries: CollectionInfo[] = structuredClone(MOCK_COLLECTION_SOURCES);
let exerciseEntries: ExerciseInfo[] = structuredClone(MOCK_EXERCISE_SOURCES);
let mediaEntries: MediaInfo[] = structuredClone(MOCK_MEDIA_SOURCES);
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
  exerciseEntries = structuredClone(MOCK_EXERCISE_SOURCES);
  mediaEntries = structuredClone(MOCK_MEDIA_SOURCES);
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
    ...exerciseEntries.map((entry) => entry.id),
    ...mediaEntries.map((entry) => entry.id),
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
    exerciseEntries.unshift({ id: sourceId, playerId: 6, ...source, createdAt: recordedAt, updatedAt: recordedAt });
  } else {
    const source = {
      category: body.media.category,
      title: body.media.title,
      originalTitle: null,
      ...normalizeMediaProgress(body.media.currentEpisode, body.media.totalEpisode),
      status: body.media.status,
      rating: null,
      tags: [],
      rewatchCount: 0,
      startedOn: null,
      finishedOn: null,
      createdAt: recordedAt,
      updatedAt: recordedAt,
    };
    mediaEntries.unshift({ id: sourceId, playerId: 7, ...source });
    entry = { ...metadata, sourceType: "MEDIA", preview: { category: source.category, title: source.title, currentEpisode: source.currentEpisode, totalEpisode: source.totalEpisode, status: source.status, rating: source.rating } };
    detail = { ...metadata, sourceType: "MEDIA", source };
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

function media(id: number): MediaInfo {
  const found = mediaEntries.find((entry) => entry.id === id);
  if (!found) throw new Error("Media not found.");
  return found;
}

function mediaTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

export const mediaMock = {
  recent: (limit: number): MediaInfo[] => copy(mediaEntries.slice(0, limit)),
  search: ({ category, status, titleLike, page, size }: MediaSearchParams): MediaInfo[] => {
    const title = titleLike?.trim().toLowerCase();
    const filtered = mediaEntries.filter((entry) =>
      (!category || entry.category === category)
      && (!status || entry.status === status)
      && (!title || entry.title.toLowerCase().includes(title))
    );
    return copy(filtered.slice(page * size, (page + 1) * size));
  },
  create: (body: MediaCreateRequest): { id: number } => {
    const id = Math.max(0, ...mediaEntries.map((entry) => entry.id)) + 1;
    const progress = normalizeMediaProgress(body.currentEpisode, body.totalEpisode);
    mediaEntries.unshift({ id, playerId: 7, category: body.category, title: body.title.trim(), originalTitle: body.originalTitle?.trim() || null, ...progress, status: body.status, rating: null, tags: mediaTags(body.tags ?? []), rewatchCount: 0, startedOn: null, finishedOn: null, createdAt: MOCK_MUTATION_TIME, updatedAt: MOCK_MUTATION_TIME });
    return { id };
  },
  update: (id: number, body: MediaUpdateRequest): MediaInfo => {
    const current = media(id);
    const effectiveCurrent = body.currentEpisode ?? current.currentEpisode;
    const effectiveTotal = body.totalEpisode ?? current.totalEpisode;
    if (effectiveCurrent < 0 || effectiveTotal < 1 || effectiveCurrent > effectiveTotal) throw new Error("Invalid Media episode progress.");
    const updated: MediaInfo = {
      ...current,
      ...(body.category == null ? {} : { category: body.category }),
      ...(body.title == null ? {} : { title: body.title.trim() }),
      ...(body.originalTitle == null ? {} : { originalTitle: body.originalTitle.trim() || null }),
      currentEpisode: effectiveCurrent,
      totalEpisode: effectiveTotal,
      ...(body.status == null ? {} : { status: body.status }),
      ...(body.tags == null ? {} : { tags: mediaTags(body.tags) }),
      updatedAt: MOCK_MUTATION_TIME,
    };
    mediaEntries = mediaEntries.map((entry) => entry.id === id ? updated : entry);
    return copy(updated);
  },
  delete: (id: number): { id: number } => {
    media(id);
    mediaEntries = mediaEntries.filter((entry) => entry.id !== id);
    return { id };
  },
};

function exercise(id: number): ExerciseInfo {
  const found = exerciseEntries.find((entry) => entry.id === id);
  if (!found) throw new Error("Exercise not found.");
  return found;
}

export const exerciseMock = {
  recent: (limit: number): ExerciseInfo[] => copy(exerciseEntries.slice(0, limit)),
  search: ({ category, from, to, page, size }: ExerciseSearchParams): ExerciseInfo[] => {
    const filtered = exerciseEntries.filter((entry) =>
      (!category || entry.category === category)
      && (!from || entry.exercisedOn >= from)
      && (!to || entry.exercisedOn <= to)
    );
    return copy(filtered.slice(page * size, (page + 1) * size));
  },
  get: (id: number): ExerciseInfo => copy(exercise(id)),
  create: (body: ExerciseCreateRequest): { id: number } => {
    const id = Math.max(0, ...exerciseEntries.map((entry) => entry.id)) + 1;
    exerciseEntries.unshift({
      id,
      playerId: 6,
      ...body,
      distanceKm: body.distanceKm ?? null,
      calories: body.calories ?? null,
      memo: body.memo?.trim() || null,
      createdAt: MOCK_MUTATION_TIME,
      updatedAt: MOCK_MUTATION_TIME,
    });
    return { id };
  },
  update: (id: number, body: ExerciseUpdateRequest): ExerciseInfo => {
    const current = exercise(id);
    const updated = {
      ...current,
      ...(body.category == null ? {} : { category: body.category }),
      ...(body.durationMinutes == null ? {} : { durationMinutes: body.durationMinutes }),
      ...(body.distanceKm == null ? {} : { distanceKm: body.distanceKm }),
      ...(body.calories == null ? {} : { calories: body.calories }),
      ...(body.exercisedOn == null ? {} : { exercisedOn: body.exercisedOn }),
      ...(body.memo == null ? {} : { memo: body.memo.trim() || null }),
      updatedAt: MOCK_MUTATION_TIME,
    };
    exerciseEntries = exerciseEntries.map((entry) => entry.id === id ? updated : entry);
    return copy(updated);
  },
  delete: (id: number): { id: number } => {
    exercise(id);
    exerciseEntries = exerciseEntries.filter((entry) => entry.id !== id);
    return { id };
  },
};

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
