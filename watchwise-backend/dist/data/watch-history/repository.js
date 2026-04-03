"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertWatchHistory = insertWatchHistory;
exports.getWatchHistory = getWatchHistory;
exports.getWatchHistoryEntries = getWatchHistoryEntries;
exports.getRecentlyWatchedMovies = getRecentlyWatchedMovies;
exports.updateWatchHistory = updateWatchHistory;
exports.deleteWatchHistory = deleteWatchHistory;
// watchwise-backend/src/data/watch-history/repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
function toEntry(row) {
    return {
        id: row.id,
        userId: row.userId,
        movieId: row.movieId,
        watchedAt: row.watchedAt,
        rating: row.rating ?? undefined,
        completed: row.completed,
    };
}
async function insertWatchHistory(entry) {
    const db = (0, db_1.getDb)();
    await db.insert(schema_1.userWatchHistory).values({
        userId: entry.userId,
        movieId: entry.movieId,
        watchedAt: entry.watchedAt ?? new Date(),
        rating: entry.rating,
        completed: entry.completed,
    });
}
async function getWatchHistory(userId) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userWatchHistory)
        .where((0, drizzle_orm_1.eq)(schema_1.userWatchHistory.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userWatchHistory.watchedAt));
    return rows.map(toEntry);
}
async function getWatchHistoryEntries(userId, limit = 200) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userWatchHistory)
        .where((0, drizzle_orm_1.eq)(schema_1.userWatchHistory.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userWatchHistory.watchedAt))
        .limit(limit);
    return rows.map(toEntry);
}
async function getRecentlyWatchedMovies(userId, excludeDays) {
    const db = (0, db_1.getDb)();
    const since = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000);
    const rows = await db
        .select({ movieId: schema_1.userWatchHistory.movieId })
        .from(schema_1.userWatchHistory)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userWatchHistory.userId, userId), (0, drizzle_orm_1.gte)(schema_1.userWatchHistory.watchedAt, since)));
    return rows.map((r) => r.movieId);
}
async function updateWatchHistory(userId, id, data) {
    const db = (0, db_1.getDb)();
    await db
        .update(schema_1.userWatchHistory)
        .set(data)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userWatchHistory.id, id), (0, drizzle_orm_1.eq)(schema_1.userWatchHistory.userId, userId)));
}
async function deleteWatchHistory(userId, id) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.userWatchHistory)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userWatchHistory.id, id), (0, drizzle_orm_1.eq)(schema_1.userWatchHistory.userId, userId)));
}
