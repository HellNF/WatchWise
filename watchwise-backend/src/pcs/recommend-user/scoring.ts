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

  return candidates.map(movie => {
    let score = 0;
    const reasons: string[] = [];

    score += normalize(movie.popularity, 0, 500)* PCS_CONFIG.weights.popularity;

    score += normalize(movie.voteAverage, 0, 10)* PCS_CONFIG.weights.rating;

    /* ---- genre affinity ---- */
    if (movie.genres) {
      for (const g of movie.genres) {
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
