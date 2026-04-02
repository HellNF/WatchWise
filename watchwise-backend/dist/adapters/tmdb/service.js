"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrendingMovies = fetchTrendingMovies;
exports.fetchPopularMovies = fetchPopularMovies;
exports.fetchNowPlayingMovies = fetchNowPlayingMovies;
exports.fetchTopRatedMovies = fetchTopRatedMovies;
exports.fetchUpcomingMovies = fetchUpcomingMovies;
exports.fetchSimilarMovies = fetchSimilarMovies;
exports.fetchRecommendedMovies = fetchRecommendedMovies;
exports.fetchMovieGenres = fetchMovieGenres;
exports.fetchMovieDetails = fetchMovieDetails;
exports.fetchMovieImages = fetchMovieImages;
exports.fetchMovieVideos = fetchMovieVideos;
exports.fetchStreamingAvailability = fetchStreamingAvailability;
exports.fetchMovieWatchProviders = fetchMovieWatchProviders;
exports.fetchMovieByActor = fetchMovieByActor;
exports.fetchMovieByDirector = fetchMovieByDirector;
exports.fetchMoviesByGenre = fetchMoviesByGenre;
exports.searchMovies = searchMovies;
exports.searchPeople = searchPeople;
const client_1 = require("./client");
const mapper_1 = require("./mapper");
const cache_1 = require("./cache");
/* ===== MOVIE LISTS ===== */
async function fetchTrendingMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/trending/movie/week", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchPopularMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/popular", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchNowPlayingMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/now_playing", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchTopRatedMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/top_rated", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchUpcomingMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/upcoming", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchSimilarMovies(tmdbId, limit = 12) {
    const cacheKey = `tmdb:similar:${tmdbId}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/similar`);
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchRecommendedMovies(tmdbId, limit = 12) {
    const cacheKey = `tmdb:recommend:${tmdbId}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/recommendations`);
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
/* ===== GENRES ===== */
async function fetchMovieGenres(language) {
    const cacheKey = `tmdb:genres:movies:${language ?? "default"}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/genre/movie/list", { language });
    (0, cache_1.setCached)(cacheKey, data.genres);
    return data.genres;
}
/* ===== MOVIE DETAILS ===== */
async function fetchMovieDetails(tmdbId) {
    const cacheKey = `tmdb:details:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}`, { append_to_response: "credits" });
    //console.log("Fetched movie details from TMDB for ID:", data);
    const mapped = (0, mapper_1.mapTMDBDetailsToMovieDetails)(data);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchMovieImages(tmdbId) {
    const cacheKey = `tmdb:images:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/images`);
    (0, cache_1.setCached)(cacheKey, data);
    return data;
}
async function fetchMovieVideos(tmdbId, language) {
    const cacheKey = `tmdb:videos:${tmdbId}:${language ?? "all"}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/videos`, { language });
    (0, cache_1.setCached)(cacheKey, data);
    return data;
}
/* ===== STREAMING ===== */
async function fetchStreamingAvailability(tmdbId, region) {
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/watch/providers`);
    //console.log("Fetched watch providers from TMDB for ID:", data);
    return (0, mapper_1.mapTMDBWatchProviders)(data, region);
}
async function fetchMovieWatchProviders(tmdbId) {
    const cacheKey = `tmdb:watch-providers:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/watch/providers`);
    //console.log("Fetched watch providers from TMDB for ID:", data);
    (0, cache_1.setCached)(cacheKey, data);
    return data;
}
async function fetchMovieByActor(actorId, region, limit = 10) {
    const cacheKey = `tmdb:person:${actorId}:movies:cast:${region ?? "all"}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/person/${actorId}/movie_credits`, { region });
    const mapped = data.cast
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit)
        .map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchMovieByDirector(directorId, region, limit = 10) {
    const cacheKey = `tmdb:person:${directorId}:movies:director:${region ?? "all"}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/person/${directorId}/movie_credits`, { region });
    const mapped = data.crew
        .filter((m) => m.job === "Director")
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit)
        .map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchMoviesByGenre(genreId, region, limit = 10) {
    const cacheKey = `tmdb:discover:genre:${genreId}:${region ?? "all"}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/discover/movie", { with_genres: genreId, region });
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function searchMovies(query, limit = 10) {
    const cacheKey = `tmdb:search:movie:${query}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/search/movie", { query });
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function searchPeople(query, limit = 10) {
    const cacheKey = `tmdb:search:person:${query}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached.slice(0, limit);
    const data = await (0, client_1.tmdbFetch)("/search/person", { query });
    (0, cache_1.setCached)(cacheKey, data.results);
    return data.results.slice(0, limit);
}
