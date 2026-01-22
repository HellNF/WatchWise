import { fetchMovieDetails } from "../../adapters/tmdb";
import { EnrichedMovieCandidate } from "./types";
import { PCS_CONFIG } from "../config";

/**
 * Enriches movie candidates with semantic information
 * (genres, director, actors) using TMDB Movie Details.
 *
 * - Limits enrichment for performance reasons
 * - Preserves original order
 * - Fails gracefully if TMDB errors occur
 */
export async function enrichCandidates(
  candidates: EnrichedMovieCandidate[]
): Promise<EnrichedMovieCandidate[]> {

  const maxEnriched = PCS_CONFIG.enrichment.maxCandidates;

  const toEnrich = candidates.slice(0, maxEnriched);
  const untouched = candidates.slice(maxEnriched);

  const enriched = await Promise.all(
    toEnrich.map(async (movie) => {
      const tmdbId = Number(movie.movieId.split(":")[1]);

      try {
        const details = await fetchMovieDetails(tmdbId);

        return {
          ...movie,
          genres: details.genres,
          director: details.director,
          actors: details.actors,
          duration: details.duration,
          productionCountries: details.productionCountries,
          originalLanguage: details.originalLanguage,
        };
      } catch (err) {
        // Fail-safe: return base candidate if enrichment fails
        return movie;
      }
    })
  );

  return [...enriched, ...untouched];
}
