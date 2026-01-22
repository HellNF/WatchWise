export type {
  RecommendationContext,
  ScoredMovie,
  EnrichedMovieCandidate,
  PreferenceProfile
} from "../recommend-user/types";

import { ScoredMovie } from "../recommend-user/types";

export interface GroupScoredMovie extends ScoredMovie {
  compatibility: number;
  outsider?: boolean;
}

export interface GroupRecommendationResult {
  recommended: GroupScoredMovie;
  topK: GroupScoredMovie[];
  buckets: {
    high: GroupScoredMovie[];
    medium: GroupScoredMovie[];
    explore: GroupScoredMovie[];
  };
  outsiders: GroupScoredMovie[];
}
