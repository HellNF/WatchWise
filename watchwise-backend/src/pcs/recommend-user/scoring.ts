import { EnrichedMovieCandidate } from "./types";
import {
  RecommendationContext,
  ScoredMovie,
  PreferenceProfile,
} from "./types";
import { PCS_CONFIG } from "../config";
export function scoreMovies(
  candidates: EnrichedMovieCandidate[],
  context: RecommendationContext,
  preferences: PreferenceProfile
): ScoredMovie[] {

  const preferredGenres = new Set(
    (context.preferredGenres ?? []).map((genre) => genre.toLowerCase())
  );
  const excludedGenres = new Set(
    (context.excludedGenres ?? []).map((genre) => genre.toLowerCase())
  );
  const maxDuration = context.maxDuration;

  return candidates.map(movie => {
    let score = 0;
    const reasons: string[] = [];

    score += normalize(movie.popularity, 0, 500)* PCS_CONFIG.weights.popularity;

    score += normalize(movie.voteAverage, 0, 10)* PCS_CONFIG.weights.rating;

    /* ---- genre affinity ---- */
    if (movie.genres) {
      for (const g of movie.genres) {
        const normalizedGenre = g.toLowerCase();
        if (excludedGenres.has(normalizedGenre)) {
          score -= 0.6;
          reasons.push(`Avoids your excluded genre: ${g}`);
          continue;
        }

        if (preferredGenres.has(normalizedGenre)) {
          score += 0.4;
          reasons.push(`Matches your current genre pick: ${g}`);
        }

        const w = preferences.genres[g];
        if (w) {
          score += w * PCS_CONFIG.weights.genre;
          reasons.push(`Matches your interest in ${g}`);
        }
      }
    }

    /* ---- director affinity ---- */
    if (movie.director && preferences.directors[movie.director]) {
      score += preferences.directors[movie.director] * PCS_CONFIG.weights.director;
      reasons.push(`You often enjoy movies by ${movie.director}`);
    }

    /* ---- actor affinity ---- */
    if (movie.actors) {
      for (const a of movie.actors) {
        const w = preferences.actors[a];
        if (w) {
          score += w * PCS_CONFIG.weights.actor;
          reasons.push(`Features ${a}, an actor you like`);
        }
      }
    }

    /* ---- duration preference ---- */
    if (typeof maxDuration === "number" && movie.duration) {
      if (movie.duration > maxDuration) {
        const overflow = Math.min(1, (movie.duration - maxDuration) / maxDuration);
        score -= 0.6 * overflow;
        reasons.push(`Exceeds your time limit (${movie.duration} min)`);
      }
    }

    return {
      movie,
      score,
      reasons: Array.from(new Set(reasons)).slice(0, 3)
    };  
  });
}

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}
