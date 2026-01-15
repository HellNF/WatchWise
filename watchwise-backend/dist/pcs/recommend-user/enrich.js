"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichCandidates = enrichCandidates;
const tmdb_1 = require("../../adapters/tmdb");
const config_1 = require("../config");
/**
 * Enriches movie candidates with semantic information
 * (genres, director, actors) using TMDB Movie Details.
 *
 * - Limits enrichment for performance reasons
 * - Preserves original order
 * - Fails gracefully if TMDB errors occur
 */
async function enrichCandidates(candidates) {
    const maxEnriched = config_1.PCS_CONFIG.enrichment.maxCandidates;
    const toEnrich = candidates.slice(0, maxEnriched);
    const untouched = candidates.slice(maxEnriched);
    const enriched = await Promise.all(toEnrich.map(async (movie) => {
        const tmdbId = Number(movie.movieId.split(":")[1]);
        try {
            const details = await (0, tmdb_1.fetchMovieDetails)(tmdbId);
            return {
                ...movie,
                genres: details.genres,
                director: details.director,
                actors: details.actors,
            };
        }
        catch (err) {
            // Fail-safe: return base candidate if enrichment fails
            return movie;
        }
    }));
    return [...enriched, ...untouched];
}
