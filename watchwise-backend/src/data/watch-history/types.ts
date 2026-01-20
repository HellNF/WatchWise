import { ObjectId } from "mongodb";

export interface WatchHistoryEntry {
  _id: ObjectId;

  userId: ObjectId;
  movieId: string; // "tmdb:<id>"

  watchedAt: Date;

  rating?: number; // 1..10
  completed: boolean;
}
export type NewWatchHistoryEntry = Omit<WatchHistoryEntry, "_id"| "userId"> & {
  userId: string;
};