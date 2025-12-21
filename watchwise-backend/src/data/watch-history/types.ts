import { ObjectId } from "mongodb";

export interface WatchHistoryEntry {
  _id: ObjectId;

  userId: ObjectId;
  movieId: string; // "tmdb:<id>"

  watchedAt: Date;

  rating?: number; // 1..5
  completed: boolean;
}
export type NewWatchHistoryEntry = Omit<WatchHistoryEntry, "_id"| "userId"> & {
  userId: string;
};