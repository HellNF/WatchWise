import { buildCandidatePool } from "./candidates";
import { scoreMovies } from "./scoring";
import { enrichCandidates } from "./enrich";
import { buildExplanation } from "./explain";
import { buildPreferenceProfile } from "./preferences";
import { ScoredMovie, UserRecommendationResult } from "./types";
import { PCS_CONFIG } from "../config";
import { applySerendipity } from "./serendipity";

const EXCLUDED_ORIGINAL_LANGUAGES = new Set(["hi"]);

export async function recommendForUser(
  userId: string,
  context: any,
  options?: { limit?: number; offset?: number }
): Promise<UserRecommendationResult> {

  const preferences = await buildPreferenceProfile(userId);

  const candidates = await buildCandidatePool(
    userId,
    "IT",
    50,
    365,
    preferences
  );
  const enrichedCandidates = await enrichCandidates(candidates);
  const filteredCandidates = enrichedCandidates.filter((candidate) => {
    const lang = candidate.originalLanguage?.toLowerCase();
    if (!lang) return true;
    return !EXCLUDED_ORIGINAL_LANGUAGES.has(lang);
  });

  const scored = scoreMovies(filteredCandidates, context, preferences).map((entry) => {
    const jitter = PCS_CONFIG.exploration.jitter ?? 0;
    if (!jitter) return entry;
    const noise = (Math.random() * 2 - 1) * jitter;
    return { ...entry, score: entry.score + noise };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);
  const mixed = applyTopMix(ranked, {
    rate: PCS_CONFIG.exploration.topMixRate,
    window: PCS_CONFIG.exploration.topMixWindow
  });

  const finalRanked = applySerendipity(mixed, {
    rate: PCS_CONFIG.serendipity.rate,
    poolSize: PCS_CONFIG.serendipity.poolSize
  });

  const best = finalRanked[0];
  const safeLimit = Math.max(1, Math.min(options?.limit ?? 5, finalRanked.length));
  const safeOffset = Math.max(0, Math.min(options?.offset ?? 0, finalRanked.length));

  return {
    recommended: {
      ...best,
      reasons: buildExplanation(best)
    },
    topK: finalRanked.slice(safeOffset, safeOffset + safeLimit)
  };
}

function applyTopMix(
  ranked: ScoredMovie[],
  options: { rate?: number; window?: number }
): ScoredMovie[] {
  if (!ranked.length) return ranked;
  const topSize = Math.min(10, ranked.length);
  const mixRate = options.rate ?? 0;
  const mixCount = Math.max(1, Math.floor(topSize * mixRate));
  if (!mixRate || mixCount <= 0) return ranked;

  const windowSize = Math.min(options.window ?? 0, ranked.length - topSize);
  if (windowSize <= 0) return ranked;

  const result = [...ranked];
  const poolStart = topSize;
  const poolEnd = topSize + windowSize;
  const pool = result.slice(poolStart, poolEnd);
  if (!pool.length) return ranked;

  for (let i = 0; i < mixCount; i++) {
    const poolIndex = Math.floor(Math.random() * pool.length);
    const pick = pool.splice(poolIndex, 1)[0];
    const originalIndex = result.indexOf(pick);
    if (originalIndex >= 0) {
      result.splice(originalIndex, 1);
    }
    const targetIndex = Math.floor(Math.random() * topSize);
    result.splice(targetIndex, 0, pick);
  }

  return result;
}

