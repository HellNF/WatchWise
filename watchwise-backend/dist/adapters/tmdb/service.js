"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrendingMovies = fetchTrendingMovies;
exports.fetchPopularMovies = fetchPopularMovies;
exports.fetchMovieDetails = fetchMovieDetails;
exports.fetchStreamingAvailability = fetchStreamingAvailability;
const client_1 = require("./client");
const mapper_1 = require("./mapper");
const cache_1 = require("./cache");
/* ===== MOVIE LISTS ===== */
async function fetchTrendingMovies(region, limit = 50) {
    const data = await (0, client_1.tmdbFetch)("/trending/movie/week", { region });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchPopularMovies(region, limit = 50) {
    const data = await (0, client_1.tmdbFetch)("/movie/popular", { region });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
/* ===== MOVIE DETAILS ===== */
async function fetchMovieDetails(tmdbId) {
    const cacheKey = `tmdb:details:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}`, { append_to_response: "credits" });
    const mapped = (0, mapper_1.mapTMDBDetailsToMovieDetails)(data);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
/* ===== STREAMING ===== */
async function fetchStreamingAvailability(tmdbId, region) {
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/watch/providers`);
    return (0, mapper_1.mapTMDBWatchProviders)(data, region);
}
