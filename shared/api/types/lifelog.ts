export const EXERCISE_CATEGORIES = ["RUNNING", "WALKING", "CYCLING", "SWIMMING", "GYM", "YOGA", "OTHER"] as const;
export type ExerciseCategory = typeof EXERCISE_CATEGORIES[number];

export interface ExerciseInfo {
  id: number;
  playerId: number;
  category: ExerciseCategory;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  exercisedOn: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExerciseSearchParams = {
  category?: ExerciseCategory;
  from?: string;
  to?: string;
  page: number;
  size: number;
};

export type ExerciseCreateRequest = {
  category: ExerciseCategory;
  durationMinutes: number;
  distanceKm?: number;
  calories?: number;
  exercisedOn: string;
  memo?: string;
};

export type ExerciseUpdateRequest = {
  category?: ExerciseCategory | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  calories?: number | null;
  exercisedOn?: string | null;
  memo?: string | null;
};
export type ExerciseCreated = { id: number };
export type ExerciseDeleted = { id: number };

export const MEDIA_CATEGORIES = ["ANIME", "MOVIE", "SERIES", "BOOK", "WEBTOON", "GAME", "MUSIC"] as const;
export type MediaCategory = typeof MEDIA_CATEGORIES[number];
export const MEDIA_STATUSES = ["PLANNED", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"] as const;
export type MediaStatus = typeof MEDIA_STATUSES[number];

export interface MediaInfo {
  id: number;
  playerId: number;
  category: MediaCategory;
  title: string;
  originalTitle: string | null;
  currentEpisode: number;
  totalEpisode: number;
  status: MediaStatus;
  rating: number | null;
  tags: string[];
  rewatchCount: number;
  startedOn: string | null;
  finishedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MediaSearchParams = {
  category?: MediaCategory;
  status?: MediaStatus;
  titleLike?: string;
  page: number;
  size: number;
};

export type MediaCreateRequest = {
  category: MediaCategory;
  title: string;
  status: MediaStatus;
  originalTitle?: string;
  currentEpisode?: number;
  totalEpisode?: number;
  tags?: string[];
};

export type MediaUpdateRequest = {
  category?: MediaCategory;
  title?: string;
  originalTitle?: string;
  currentEpisode?: number;
  totalEpisode?: number;
  status?: MediaStatus;
  tags?: string[];
};
export type MediaCreated = { id: number };
export type MediaDeleted = { id: number };

export const COLLECTION_CATEGORIES = ["FIGURE", "CARD", "BOOK", "GAME", "STAMP", "COIN", "OTHER"] as const;
export type CollectionCategory = typeof COLLECTION_CATEGORIES[number];

export interface CollectionInfo {
  id: number;
  playerId: number;
  category: CollectionCategory;
  title: string;
  originalTitle: string | null;
  quantity: number;
  conditionNote: string | null;
  acquiredFrom: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CollectionSearchParams = {
  category?: CollectionCategory;
  titleLike?: string;
  page: number;
  size: number;
};

export type CollectionCreateRequest = {
  category: CollectionCategory;
  title: string;
  originalTitle?: string;
  quantity: number;
  conditionNote?: string;
  acquiredFrom?: string;
  tags?: string[];
};

export type CollectionUpdateRequest = {
  quantity?: number;
  conditionNote?: string;
  acquiredFrom?: string;
};

export type CollectionCreated = { id: number };
export type CollectionDeleted = { id: number };

export type JournalSourceType = "COLLECTION" | "EXERCISE" | "MEDIA";
export type JournalEntryMode = "FULL" | "QUICK";
export type JournalSubtype =
  | "QUICK_NOTE"
  | "ACTIVITY"
  | "STUDY"
  | "PROJECT"
  | "MEMORY"
  | "REFLECTION"
  | "MOOD"
  | "HEALTH_NOTE";
export type JournalReflectionScope = "WEEKLY_LOOKBACK";

export type JournalMetadata = {
  lifeLogId: number;
  sourceId: number;
  subtype: JournalSubtype | null;
  entryMode: JournalEntryMode | null;
  reflectionScope: JournalReflectionScope | null;
  periodKey: string | null;
  primaryRoleId: number | null;
  roleEventId: number | null;
  recordedAt: string;
};

export type JournalEntryBase<T extends JournalSourceType, P> = JournalMetadata & {
  sourceType: T;
  preview: P;
};

export type CollectionJournalEntry = JournalEntryBase<
  "COLLECTION",
  Pick<CollectionInfo, "category" | "title"> & { quantity: number | null }
>;
export type ExerciseJournalEntry = JournalEntryBase<
  "EXERCISE",
  Pick<ExerciseInfo, "category" | "durationMinutes" | "distanceKm" | "calories" | "exercisedOn" | "memo">
>;
export type MediaJournalEntry = JournalEntryBase<
  "MEDIA",
  Pick<MediaInfo, "category" | "title" | "currentEpisode" | "totalEpisode" | "status" | "rating">
>;
export type JournalEntry = CollectionJournalEntry | ExerciseJournalEntry | MediaJournalEntry;

export type JournalDetailBase<T extends JournalSourceType, S> = JournalMetadata & {
  sourceType: T;
  source: S;
};

export type CollectionJournalDetail = JournalDetailBase<
  "COLLECTION",
  Omit<CollectionInfo, "id" | "playerId" | "quantity"> & { quantity: number | null }
>;
export type ExerciseJournalDetail = JournalDetailBase<"EXERCISE", Omit<ExerciseInfo, "id" | "playerId">>;
export type MediaJournalDetail = JournalDetailBase<"MEDIA", Omit<MediaInfo, "id" | "playerId">>;
export type JournalDetail = CollectionJournalDetail | ExerciseJournalDetail | MediaJournalDetail;

export interface JournalPage {
  content: JournalEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface JournalListParams {
  primaryRoleId?: number;
  subtype?: JournalSubtype;
  page: number;
  size: number;
}

export type QuickRecordType = JournalSourceType;
export type QuickRecordCollectionCategory = CollectionCategory;
export type QuickRecordExerciseCategory = ExerciseCategory;
export type QuickRecordMediaCategory = MediaCategory;
export type QuickRecordMediaStatus = MediaStatus;

type QuickRecordMetadata = {
  lifeLogSubtype?: JournalSubtype;
  primaryRoleId?: number;
};

export type QuickRecordRequest = QuickRecordMetadata & (
  | {
      type: "COLLECTION";
      collection: {
        category: QuickRecordCollectionCategory;
        title: string;
        quantity: number;
      };
    }
  | {
      type: "EXERCISE";
      exercise: {
        category: QuickRecordExerciseCategory;
        durationMinutes: number;
        exercisedOn: string;
        distanceKm?: number;
        calories?: number;
        memo?: string;
      };
    }
  | {
      type: "MEDIA";
      media: {
        category: QuickRecordMediaCategory;
        title: string;
        status: QuickRecordMediaStatus;
        currentEpisode?: number;
        totalEpisode?: number;
      };
    }
);

export type QuickRecordResult = {
  sourceType: QuickRecordType;
  sourceId: number;
  recordedAt: string;
  replay: boolean;
};
