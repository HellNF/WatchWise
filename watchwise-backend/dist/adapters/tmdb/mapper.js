"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTMDBMovieToCandidate = mapTMDBMovieToCandidate;
exports.mapTMDBDetailsToMovieDetails = mapTMDBDetailsToMovieDetails;
exports.mapTMDBWatchProviders = mapTMDBWatchProviders;
/* ---------- MAPPERS ---------- */
function mapTMDBMovieToCandidate(movie) {
    const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
    return {
        movieId: `tmdb:${movie.id}`,
        title: movie.title,
        year: movie.release_date
            ? Number(movie.release_date.split("-")[0])
            : undefined,
        popularity: movie.popularity,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        posterPath: movie.poster_path
            ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
            : undefined
    };
}
function mapTMDBDetailsToMovieDetails(movie) {
    const director = movie.credits.crew.find((m) => m.job === "Director")?.name;
    const actors = movie.credits.cast
        .sort((a, b) => a.order - b.order)
        .slice(0, 5)
        .map((a) => a.name);
    return {
        movieId: `tmdb:${movie.id}`,
        duration: movie.runtime,
        genres: movie.genres?.map((g) => g.name),
        director,
        actors,
    };
}
function mapTMDBWatchProviders(data, region) {
    const entry = data.results[region];
    if (!entry)
        return null;
    const platforms = [];
    entry.flatrate?.forEach((p) => platforms.push({ platform: p.provider_name, type: "subscription" }));
    entry.rent?.forEach((p) => platforms.push({ platform: p.provider_name, type: "rent" }));
    entry.buy?.forEach((p) => platforms.push({ platform: p.provider_name, type: "buy" }));
    return {
        region,
        platforms,
    };
}
