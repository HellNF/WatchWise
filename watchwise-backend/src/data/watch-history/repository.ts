import { ObjectId, OptionalId } from "mongodb";
import { getDb } from "../../config/mongodb";
import { WatchHistoryEntry, NewWatchHistoryEntry } from "./types";

const COLLECTION = "user_watch_history";

function collection() {
  return getDb().collection<WatchHistoryEntry>(COLLECTION);
}

type InsertWatchHistoryEntry = Omit<WatchHistoryEntry, "_id" | "userId"> & {
  userId: string;
};

type UpdateWatchHistoryData = Partial<
  Omit<WatchHistoryEntry, "_id" | "userId">
>;

function toObjectId(id: string) {
  return new ObjectId(id);
}

export async function insertWatchHistory(
  entry: NewWatchHistoryEntry
) {
  await collection().insertOne({
    _id: new ObjectId(),
    ...entry,
    userId: toObjectId(entry.userId)
  });
}

export async function getWatchHistory(userId: string) {
  return collection()
    .find({ userId: toObjectId(userId) })
    .sort({ watchedAt: -1 })
    .toArray();
}

export async function getWatchHistoryEntries(
  userId: string,
  limit = 200
) {
  return collection()
    .find({ userId: toObjectId(userId) })
    .sort({ watchedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getRecentlyWatchedMovies(
  userId: ObjectId,
  excludeDays: number
) {
  const since = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000);

  const rows = await collection()
    .find({ userId, watchedAt: { $gte: since } })
    .project({ movieId: 1 })
    .toArray();

  return rows.map((row) => row.movieId);
}

export async function updateWatchHistory(
  userId: string,
  id: string,
  data: UpdateWatchHistoryData
) {
  await collection().updateOne(
    {
      _id: toObjectId(id),
      userId: toObjectId(userId)
    },
    { $set: data }
  );
}

export async function deleteWatchHistory(
  userId: string,
  id: string
) {
  await collection().deleteOne({
    _id: toObjectId(id),
    userId: toObjectId(userId)
  });
}
