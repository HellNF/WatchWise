"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertWatchHistory = insertWatchHistory;
exports.getWatchHistory = getWatchHistory;
exports.getRecentlyWatchedMovies = getRecentlyWatchedMovies;
exports.updateWatchHistory = updateWatchHistory;
exports.deleteWatchHistory = deleteWatchHistory;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../../config/mongodb");
const COLLECTION = "user_watch_history";
function collection() {
    return (0, mongodb_2.getDb)().collection(COLLECTION);
}
function toObjectId(id) {
    return new mongodb_1.ObjectId(id);
}
async function insertWatchHistory(entry) {
    await collection().insertOne({
        _id: new mongodb_1.ObjectId(),
        ...entry,
        userId: toObjectId(entry.userId)
    });
}
async function getWatchHistory(userId) {
    return collection()
        .find({ userId: toObjectId(userId) })
        .sort({ watchedAt: -1 })
        .toArray();
}
async function getRecentlyWatchedMovies(userId, excludeDays) {
    const since = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000);
    const rows = await collection()
        .find({ userId, watchedAt: { $gte: since } })
        .project({ movieId: 1 })
        .toArray();
    return rows.map((row) => row.movieId);
}
async function updateWatchHistory(userId, id, data) {
    await collection().updateOne({
        _id: toObjectId(id),
        userId: toObjectId(userId)
    }, { $set: data });
}
async function deleteWatchHistory(userId, id) {
    await collection().deleteOne({
        _id: toObjectId(id),
        userId: toObjectId(userId)
    });
}
