import { buildCandidatePool } from "./candidates";
import { scoreMovies } from "./scoring";
import { enrichCandidates } from "./enrich";
import { buildExplanation } from "./explain";
import { buildPreferenceProfile } from "./preferences";
import { UserRecommendationResult } from "./types";
import { PCS_CONFIG } from "../config";
import { applySerendipity } from "./serendipity";

export async function recommendForUser(
  userId: string,
  context: any
): Promise<UserRecommendationResult> {

  const preferences = await buildPreferenceProfile(userId);

  const candidates = await buildCandidatePool(
    userId,
    "IT",
    50,
    365
  );
  const enrichedCandidates = await enrichCandidates(candidates);
  const scored = scoreMovies(enrichedCandidates, context, preferences);

  const ranked = scored.sort((a, b) => b.score - a.score);

  const finalRanked = applySerendipity(ranked, {
    rate: PCS_CONFIG.serendipity.rate,
    poolSize: PCS_CONFIG.serendipity.poolSize
  });

  const best = finalRanked[0];

  return {
    recommended: {
      ...best,
      reasons: buildExplanation(best)
    },
    topK: finalRanked.slice(0, 5)
  };
}

