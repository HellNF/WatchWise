import { findGroupById } from "../../data/groups/repository";
import { findGroupSessionById } from "../../data/group-sessions/repository";
import { AppError } from "../../common/errors";
import { getLatestQuestionnaireEvent } from "../../data/preferences/repository";
import { buildGroupCandidatePool } from "./candidates";
import {
  buildMemberPreferenceProfiles,
  aggregateGroupPreferenceProfile
} from "./preferences";
import { scoreMovies } from "../recommend-user/scoring";
import { enrichCandidates } from "../recommend-user/enrich";
import { buildExplanation } from "../recommend-user/explain";
import { applySerendipity } from "../recommend-user/serendipity";
import {
  GroupRecommendationResult,
  RecommendationContext,
  ScoredMovie,
  GroupScoredMovie,
  EnrichedMovieCandidate,
  PreferenceProfile
} from "./types";
import { PCS_CONFIG } from "../config";

const EXCLUDED_ORIGINAL_LANGUAGES = new Set(["hi"]);

export async function recommendForGroup(
  groupId: string,
  requesterId: string,
  context: RecommendationContext,
  options?: { limit?: number; offset?: number; sessionId?: string }
): Promise<GroupRecommendationResult> {

  const group = await findGroupById(groupId);
  if (!group) {
    throw new AppError("NOT_FOUND", 404, "Group not found");
  }

  const isMember = group.members.includes(requesterId);
  if (!isMember) {
    throw new AppError("UNAUTHORIZED", 403, "User is not a group member");
  }

  let sessionContext: RecommendationContext = {};
  let sessionReady = true;
  if (options?.sessionId) {
    const session = await findGroupSessionById(options.sessionId);
    if (!session || session.groupId !== groupId) {
      throw new AppError("NOT_FOUND", 404, "Group session not found");
    }
    sessionContext = session.context ?? {};

    sessionReady = await isSessionReady(group, session);
    if (!sessionReady) {
      throw new AppError("INVALID_INPUT", 409, "Group session not ready");
    }
  }

  const mergedContext: RecommendationContext = {
    ...sessionContext,
    ...(context ?? {})
  };

  const memberIds = group.members;
  const memberProfiles = await buildMemberPreferenceProfiles(memberIds);
  const preferences = aggregateGroupPreferenceProfile(memberProfiles);

  const { pool: candidates, outsiderIds } = await buildGroupCandidatePool(
    memberIds,
    "IT",
    50,
    365,
    preferences
  );

  // Arricchisci, filtra, e ricalcola score/compatibilità su tutto il pool (inclusi i suggested)
  const enrichedCandidates = await enrichCandidates(candidates);
  const filteredCandidates = enrichedCandidates.filter((candidate) => {
    const lang = candidate.originalLanguage?.toLowerCase();
    if (!lang) return true;
    return !EXCLUDED_ORIGINAL_LANGUAGES.has(lang);
  });

  const scored = scoreMovies(filteredCandidates, mergedContext, preferences).map((entry) => {
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

  if (!finalRanked.length) {
    throw new AppError("NOT_FOUND", 404, "No recommendations available");
  }

  const compatibilities = await computeCompatibilityScores(
    filteredCandidates,
    mergedContext,
    memberProfiles
  );

  const scoredWithCompatibility: GroupScoredMovie[] = finalRanked.map((entry) => {
    const compatibility = compatibilities.get(entry.movie.movieId) ?? 0.5;
    const outsider = outsiderIds.has(entry.movie.movieId);
    return {
      ...entry,
      compatibility,
      outsider
    };
  });

  const { buckets, outsiders } = buildBuckets(scoredWithCompatibility);

  const best = scoredWithCompatibility[0];
  const safeLimit = Math.max(1, Math.min(options?.limit ?? 5, scoredWithCompatibility.length));
  const safeOffset = Math.max(0, Math.min(options?.offset ?? 0, scoredWithCompatibility.length));

  return {
    recommended: {
      ...best,
      reasons: buildExplanation(best)
    },
    topK: scoredWithCompatibility.slice(safeOffset, safeOffset + safeLimit),
    buckets,
    outsiders
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

async function computeCompatibilityScores(
  candidates: EnrichedMovieCandidate[],
  context: RecommendationContext,
  memberProfiles: PreferenceProfile[]
): Promise<Map<string, number>> {
  if (!memberProfiles.length || !candidates.length) {
    return new Map();
  }

  const perUserScores = await Promise.all(
    memberProfiles.map((profile) => scoreMovies(candidates, context, profile))
  );

  const normalized = perUserScores.map((scores) => normalizeScores(scores));
  const result = new Map<string, number>();

  for (let i = 0; i < candidates.length; i++) {
    const values = normalized.map((userScores) => userScores[i]);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const compatibility = clamp(0.6 * mean + 0.3 * min - 0.1 * variance, 0, 1);
    const movieId = candidates[i].movieId;
    result.set(movieId, compatibility);
  }

  return result;
}

function normalizeScores(scores: ScoredMovie[]): number[] {
  const values = scores.map((entry) => entry.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return values.map(() => 0.5);
  }
  return values.map((value) => (value - min) / (max - min));
}

function buildBuckets(scored: GroupScoredMovie[]): {
  buckets: { high: GroupScoredMovie[]; medium: GroupScoredMovie[]; explore: GroupScoredMovie[] };
  outsiders: GroupScoredMovie[];
} {
  const high = scored.filter((entry) => entry.compatibility >= 0.7);
  const medium = scored.filter((entry) => entry.compatibility >= 0.5 && entry.compatibility < 0.7);
  const explore = scored.filter((entry) => entry.compatibility >= 0.35 && entry.compatibility < 0.5);

  const outsiders = scored.filter((entry) => entry.outsider);

  if (!high.length || !medium.length) {
    const sorted = [...scored].sort((a, b) => b.compatibility - a.compatibility);
    const highCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const mediumCount = Math.max(1, Math.floor(sorted.length * 0.3));
    return {
      buckets: {
        high: sorted.slice(0, highCount),
        medium: sorted.slice(highCount, highCount + mediumCount),
        explore: sorted.slice(highCount + mediumCount)
      },
      outsiders
    };
  }

  return {
    buckets: { high, medium, explore },
    outsiders
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function isSessionReady(
  group: NonNullable<Awaited<ReturnType<typeof findGroupById>>>,
  session: NonNullable<Awaited<ReturnType<typeof findGroupSessionById>>>
): Promise<boolean> {
  if (!group || !session) return false;
  if (session.status === "started") return true;

  const dayStart = getDayStartUTC();
  const members = await Promise.all(
    group.members.map(async (memberId) => {
      const latest = await getLatestQuestionnaireEvent(memberId);
      return latest?.createdAt ? latest.createdAt >= dayStart : false;
    })
  );

  const allComplete = members.every(Boolean);
  if (allComplete) return true;

  const timeoutMinutes = session.softStartTimeoutMinutes ?? 10;
  const softStartAt = session.softStartAt ?? session.createdAt;
  const timeoutAt = new Date(softStartAt.getTime() + timeoutMinutes * 60 * 1000);
  return new Date() >= timeoutAt;
}

function getDayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
