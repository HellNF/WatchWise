import { MovieCandidate } from "../../adapters/tmdb";

export interface RecommendationContext {
  mood?: string;
  preferredGenres?: string[];
  excludedGenres?: string[];
  maxDuration?: number;
}

export interface ScoredMovie {
  movie: MovieCandidate;
  score: number;
  reasons: string[];
  serendipity?: boolean;
}

export interface EnrichedMovieCandidate extends MovieCandidate {
  genres?: string[];
  director?: string;
  actors?: string[];
  duration?: number;
  productionCountries?: string[];
  originalLanguage?: string;
}


export interface UserRecommendationResult {
  recommended: ScoredMovie;
  topK: ScoredMovie[];
}

export interface PreferenceProfile {
  genres: Record<string, number>;
  actors: Record<string, number>;
  directors: Record<string, number>;
  moods: Record<string, number>;
  energies: Record<string, number>;
  companies: Record<string, number>;
  durations: Record<string, number>;
  novelties: Record<string, number>;
}
