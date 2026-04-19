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
