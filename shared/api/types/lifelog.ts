export interface ExerciseInfo {
  id: number;
  playerId: number;
  category: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories: number | null;
  exercisedOn: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaLogInfo {
  id: number;
  playerId: number;
  category: string;
  title: string;
  originalTitle: string | null;
  currentEpisode: number;
  totalEpisode: number;
  status: string;
  rating: number | null;
  tags: string[];
  rewatchCount: number;
  startedOn: string | null;
  finishedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionInfo {
  id: number;
  playerId: number;
  category: string;
  title: string;
  originalTitle: string | null;
  quantity: number | null;
  conditionNote: string | null;
  acquiredFrom: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

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
  Pick<CollectionInfo, "category" | "title" | "quantity">
>;
export type ExerciseJournalEntry = JournalEntryBase<
  "EXERCISE",
  Pick<ExerciseInfo, "category" | "durationMinutes" | "distanceKm" | "calories" | "exercisedOn" | "memo">
>;
export type MediaJournalEntry = JournalEntryBase<
  "MEDIA",
  Pick<MediaLogInfo, "category" | "title" | "currentEpisode" | "totalEpisode" | "status" | "rating">
>;
export type JournalEntry = CollectionJournalEntry | ExerciseJournalEntry | MediaJournalEntry;

export type JournalDetailBase<T extends JournalSourceType, S> = JournalMetadata & {
  sourceType: T;
  source: S;
};

export type CollectionJournalDetail = JournalDetailBase<"COLLECTION", Omit<CollectionInfo, "id" | "playerId">>;
export type ExerciseJournalDetail = JournalDetailBase<"EXERCISE", Omit<ExerciseInfo, "id" | "playerId">>;
export type MediaJournalDetail = JournalDetailBase<"MEDIA", Omit<MediaLogInfo, "id" | "playerId">>;
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
export type QuickRecordCollectionCategory = "FIGURE" | "CARD" | "BOOK" | "GAME" | "STAMP" | "COIN" | "OTHER";
export type QuickRecordExerciseCategory = "RUNNING" | "WALKING" | "CYCLING" | "SWIMMING" | "GYM" | "YOGA" | "OTHER";
export type QuickRecordMediaCategory = "ANIME" | "MOVIE" | "SERIES" | "BOOK" | "WEBTOON" | "GAME" | "MUSIC";
export type QuickRecordMediaStatus = "PLANNED" | "WATCHING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

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
