"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGroupCandidatePool = buildGroupCandidatePool;
const tmdb_1 = require("../../adapters/tmdb");
// Funzione di supporto per arricchire il pool con i suggested dei topK
async function fetchSuggestedForTopK(topK, region, limitPerType = 10) {
    const suggested = [];
    for (const movie of topK) {
        const tmdbId = parseTmdbId(movie.movieId);
        if (!tmdbId)
            continue;
        try {
            const [similar, recommended] = await Promise.all([
                (0, tmdb_1.fetchSimilarMovies)(tmdbId, limitPerType),
                (0, tmdb_1.fetchRecommendedMovies)(tmdbId, limitPerType)
            ]);
            suggested.push(...similar, ...recommended);
        }
        catch {
            continue;
        }
    }
    return suggested;
}
const repository_1 = require("../../data/watch-history/repository");
const repository_2 = require("../../data/lists/repository");
const repository_3 = require("../../data/preferences/repository");
const mongodb_1 = require("mongodb");
async function buildGroupCandidatePool(memberIds, region, limit, excludeDays = 200, preferences) {
    const memberData = await Promise.all(memberIds.map(async (memberId) => {
        const [watched, history, watchlistItems, feedbackEvents] = await Promise.all([
            (0, repository_1.getRecentlyWatchedMovies)(new mongodb_1.ObjectId(memberId), excludeDays),
            (0, repository_1.getWatchHistoryEntries)(memberId, 20),
            (0, repository_2.getListItemsBySlug)(memberId, "watching-list"),
            (0, repository_3.getUserPreferenceEvents)(new mongodb_1.ObjectId(memberId), 300)
        ]);
        return { watched, history, watchlistItems, feedbackEvents };
    }));
    const watchedSet = new Set(memberData.flatMap((data) => data.watched.map(normalizeMovieId)));
    const watchlistSet = new Set(memberData.flatMap((data) => data.watchlistItems.map((item) => normalizeMovieId(item.movieId))));
    const blockSince = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const blockedSet = new Set(memberData
        .flatMap((data) => data.feedbackEvents)
        .filter((event) => event.type === "movie" && event.source === "feedback")
        .filter((event) => event.createdAt >= blockSince)
        .map((event) => normalizeMovieId(event.value)));
    const historySeeds = Array.from(new Set(memberData
        .flatMap((data) => data.history)
        .map((entry) => parseTmdbId(entry.movieId))
        .filter((id) => typeof id === "number"))).slice(0, 6);
    const watchlistIds = Array.from(new Set(memberData
        .flatMap((data) => data.watchlistItems)
        .map((item) => normalizeMovieId(item.movieId))));
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
    const outsiderCandidates = await buildWatchlistOutsiders(watchlistIds, Math.max(6, Math.floor(limit * 0.2)));
    const poolTarget = limit * 3;
    const baseQuota = Math.max(1, Math.floor(poolTarget * 0.30));
    const prefQuota = poolTarget - baseQuota;
    const filtered = buildPool(preferenceCandidates, baseCandidates, prefQuota, baseQuota, watchedSet, watchlistSet, blockedSet);
    const outsiderIds = new Set(outsiderCandidates.map((candidate) => normalizeMovieId(candidate.movieId)));
    // Arricchimento: prendi i topK dal pool filtrato e aggiungi i suggested
    const topKForSuggestions = filtered.slice(0, 8); // Primi 8 film per varietà
    const suggested = await fetchSuggestedForTopK(topKForSuggestions, region, 6);
    // Unisci i suggested al pool, deduplicando e filtrando come sopra
    const allCandidates = [...filtered, ...suggested];
    const enrichedPool = buildPool(allCandidates, [], allCandidates.length, 0, watchedSet, watchlistSet, blockedSet);
    const pool = mergeOutsiders(enrichedPool, outsiderCandidates, outsiderIds);
    console.log(`[GroupRecommendation] Pool di candidati unici generato (con suggested): ${pool.length} film diversi`);
    return { pool, outsiderIds };
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
async function buildWatchlistOutsiders(watchlistIds, limit) {
    const results = [];
    for (const movieId of watchlistIds) {
        if (results.length >= limit)
            break;
        const tmdbId = parseTmdbId(movieId);
        if (!tmdbId)
            continue;
        try {
            const details = await (0, tmdb_1.fetchMovieDetails)(tmdbId);
            results.push({
                movieId: details.movieId,
                title: details.title,
                year: details.year,
                popularity: 0,
                voteAverage: details.rating ?? 0,
                voteCount: 0,
                posterPath: details.posterPath
            });
        }
        catch {
            continue;
        }
    }
    return results;
}
function mergeOutsiders(pool, outsiders, outsiderIds) {
    if (!outsiders.length)
        return pool;
    const seen = new Set(pool.map((candidate) => normalizeMovieId(candidate.movieId)));
    const merged = [...pool];
    for (const outsider of outsiders) {
        const id = normalizeMovieId(outsider.movieId);
        if (seen.has(id))
            continue;
        merged.push(outsider);
        seen.add(id);
    }
    return merged;
}
