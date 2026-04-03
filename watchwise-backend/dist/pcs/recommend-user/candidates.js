"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCandidatePool = buildCandidatePool;
const tmdb_1 = require("../../adapters/tmdb");
const repository_1 = require("../../data/watch-history/repository");
const repository_2 = require("../../data/lists/repository");
const repository_3 = require("../../data/preferences/repository");
async function buildCandidatePool(userId, region, limit, excludeDays = 200, // 200 giorni: evita re-recommend
preferences) {
    const [watched, history, watchlistItems, feedbackEvents] = await Promise.all([
        (0, repository_1.getRecentlyWatchedMovies)(userId, excludeDays),
        (0, repository_1.getWatchHistoryEntries)(userId, 20),
        (0, repository_2.getListItemsBySlug)(userId, "watching-list"),
        (0, repository_3.getUserPreferenceEvents)(userId, 300)
    ]);
    const watchedSet = new Set(watched.map(normalizeMovieId));
    const watchlistSet = new Set(watchlistItems.map((item) => normalizeMovieId(item.movieId)));
    const blockSince = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const blockedSet = new Set(feedbackEvents
        .filter((event) => event.type === "movie" && event.source === "feedback")
        .filter((event) => event.createdAt >= blockSince)
        .map((event) => normalizeMovieId(event.value)));
    const baseLimit = Math.max(8, Math.ceil(limit / 4));
    const baseLists = await Promise.all([
        (0, tmdb_1.fetchTrendingMovies)(region, baseLimit),
        (0, tmdb_1.fetchPopularMovies)(region, baseLimit),
        (0, tmdb_1.fetchTopRatedMovies)(region, baseLimit),
        (0, tmdb_1.fetchNowPlayingMovies)(region, baseLimit)
    ]);
    const genreCandidates = [];
    if (preferences?.genres) {
        const genres = await (0, tmdb_1.fetchMovieGenres)(region);
        const genreMap = new Map(genres.map((genre) => [genre.name.toLowerCase(), genre.id]));
        const topGenres = topKeys(preferences.genres, 8)
            .map((name) => genreMap.get(name.toLowerCase()))
            .filter((id) => typeof id === "number");
        const genreLists = await Promise.all(topGenres.map((genreId) => (0, tmdb_1.fetchMoviesByGenre)(genreId, region, Math.ceil(limit / 2))));
        genreCandidates.push(...genreLists.flat());
    }
    const preferredActorCandidates = await fetchCandidatesByPeople(topKeys(preferences?.actors ?? {}, 6), "actor", region, Math.ceil(limit / 3));
    const preferredDirectorCandidates = await fetchCandidatesByPeople(topKeys(preferences?.directors ?? {}, 4), "director", region, Math.ceil(limit / 4));
    const historySeeds = history
        .map((entry) => parseTmdbId(entry.movieId))
        .filter((id) => typeof id === "number")
        .slice(0, 4);
    const historyLists = await Promise.all(historySeeds.flatMap((tmdbId) => [
        (0, tmdb_1.fetchSimilarMovies)(tmdbId, 8),
        (0, tmdb_1.fetchRecommendedMovies)(tmdbId, 8)
    ]));
    const baseCandidates = baseLists.flat();
    const preferenceCandidates = [
        ...genreCandidates,
        ...preferredActorCandidates,
        ...preferredDirectorCandidates,
        ...historyLists.flat()
    ];
    const poolTarget = limit * 3;
    const baseQuota = Math.max(1, Math.floor(poolTarget * 0.15));
    const prefQuota = poolTarget - baseQuota;
    const filtered = buildPool(preferenceCandidates, baseCandidates, prefQuota, baseQuota, watchedSet, watchlistSet, blockedSet);
    return filtered;
}
function topKeys(bucket, size) {
    return Object.entries(bucket)
        .sort((a, b) => b[1] - a[1])
        .slice(0, size)
        .map(([key]) => key);
}
async function fetchCandidatesByPeople(names, role, region, limit) {
    if (!names.length)
        return [];
    const results = await Promise.all(names.map(async (name) => {
        const people = await (0, tmdb_1.searchPeople)(name, 1);
        const person = people?.[0];
        if (!person?.id)
            return [];
        if (role === "actor") {
            return (0, tmdb_1.fetchMovieByActor)(person.id, region, limit);
        }
        return (0, tmdb_1.fetchMovieByDirector)(person.id, region, limit);
    }));
    return results.flat();
}
function parseTmdbId(movieId) {
    if (!movieId)
        return null;
    const normalized = movieId.startsWith("tmdb:")
        ? movieId.replace("tmdb:", "")
        : movieId;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}
function normalizeMovieId(movieId) {
    if (!movieId)
        return "";
    if (movieId.startsWith("tmdb:"))
        return movieId;
    const parsed = Number(movieId);
    if (Number.isFinite(parsed))
        return `tmdb:${parsed}`;
    return movieId;
}
function buildPool(preferenceCandidates, baseCandidates, prefQuota, baseQuota, watchedSet, watchlistSet, blockedSet) {
    const seen = new Set();
    const result = [];
    const pushUnique = (candidate) => {
        const candidateId = normalizeMovieId(candidate.movieId);
        if (watchedSet.has(candidateId))
            return false;
        if (watchlistSet.has(candidateId))
            return false;
        if (blockedSet.has(candidateId))
            return false;
        if (seen.has(candidateId))
            return false;
        seen.add(candidateId);
        result.push(candidate);
        return true;
    };
    for (const candidate of preferenceCandidates) {
        if (result.length >= prefQuota)
            break;
        pushUnique(candidate);
    }
    const afterPref = result.length;
    for (const candidate of baseCandidates) {
        if (result.length - afterPref >= baseQuota)
            break;
        pushUnique(candidate);
    }
    if (result.length < prefQuota + baseQuota) {
        for (const candidate of [...preferenceCandidates, ...baseCandidates]) {
            if (result.length >= prefQuota + baseQuota)
                break;
            pushUnique(candidate);
        }
    }
    return result;
}
