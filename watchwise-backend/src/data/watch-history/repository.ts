// watchwise-backend/src/data/watch-history/repository.ts
import { eq, desc, gte, and } from "drizzle-orm";
import { getDb } from "../../db";
import { userWatchHistory } from "../../db/schema";
import { WatchHistoryEntry, NewWatchHistoryEntry } from "./types";

function toEntry(row: typeof userWatchHistory.$inferSelect): WatchHistoryEntry {
  return {
    id: row.id,
    userId: row.userId,
    movieId: row.movieId,
    watchedAt: row.watchedAt,
    rating: row.rating ?? undefined,
    completed: row.completed,
  };
}

type UpdateWatchHistoryData = Partial<Omit<WatchHistoryEntry, "id" | "userId">>;

export async function insertWatchHistory(entry: NewWatchHistoryEntry): Promise<void> {
  const db = getDb();
  await db.insert(userWatchHistory).values({
    userId: entry.userId,
    movieId: entry.movieId,
    watchedAt: entry.watchedAt ?? new Date(),
    rating: entry.rating,
    completed: entry.completed,
  });
}

export async function getWatchHistory(userId: string): Promise<WatchHistoryEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userWatchHistory)
    .where(eq(userWatchHistory.userId, userId))
    .orderBy(desc(userWatchHistory.watchedAt));
  return rows.map(toEntry);
}

export async function getWatchHistoryEntries(
  userId: string,
  limit = 200
): Promise<WatchHistoryEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userWatchHistory)
    .where(eq(userWatchHistory.userId, userId))
    .orderBy(desc(userWatchHistory.watchedAt))
    .limit(limit);
  return rows.map(toEntry);
}

export async function getRecentlyWatchedMovies(
  userId: string,
  excludeDays: number
): Promise<string[]> {
  const db = getDb();
  const since = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ movieId: userWatchHistory.movieId })
    .from(userWatchHistory)
    .where(
      and(
        eq(userWatchHistory.userId, userId),
        gte(userWatchHistory.watchedAt, since)
      )
    );
  return rows.map((r) => r.movieId);
}

export async function updateWatchHistory(
  userId: string,
  id: string,
  data: UpdateWatchHistoryData
): Promise<void> {
  const db = getDb();
  await db
    .update(userWatchHistory)
    .set(data)
    .where(
      and(
        eq(userWatchHistory.id, id),
        eq(userWatchHistory.userId, userId)
      )
    );
}

export async function deleteWatchHistory(userId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userWatchHistory)
    .where(
      and(
        eq(userWatchHistory.id, id),
        eq(userWatchHistory.userId, userId)
      )
    );
}
