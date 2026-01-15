"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCandidatePool = buildCandidatePool;
const tmdb_1 = require("../../adapters/tmdb");
const repository_1 = require("../../data/watch-history/repository");
const mongodb_1 = require("mongodb");
async function buildCandidatePool(userId, region, limit, excludeDays = 200 // 200 giorni: evita re-recommend
) {
    const [candidates, watched] = await Promise.all([
        (0, tmdb_1.fetchTrendingMovies)(region, limit),
        (0, repository_1.getRecentlyWatchedMovies)(new mongodb_1.ObjectId(userId), excludeDays)
    ]);
    const watchedSet = new Set(watched);
    // HARD FILTER: rimuovi già visti
    return candidates.filter((c) => !watchedSet.has(c.movieId));
}
