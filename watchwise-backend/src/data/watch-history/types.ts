// watchwise-backend/src/data/watch-history/types.ts

export interface WatchHistoryEntry {
  id: string;
  userId: string;
  movieId: string;   // "tmdb:<id>"
  watchedAt: Date;
  rating?: number;
  completed: boolean;
}

export type NewWatchHistoryEntry = Omit<WatchHistoryEntry, "id">;
