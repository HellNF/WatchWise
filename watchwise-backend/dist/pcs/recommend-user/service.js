"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendForUser = recommendForUser;
const candidates_1 = require("./candidates");
const scoring_1 = require("./scoring");
const enrich_1 = require("./enrich");
const explain_1 = require("./explain");
const preferences_1 = require("./preferences");
const config_1 = require("../config");
const serendipity_1 = require("./serendipity");
const EXCLUDED_ORIGINAL_LANGUAGES = new Set(["hi"]);
async function recommendForUser(userId, context, options) {
    const preferences = await (0, preferences_1.buildPreferenceProfile)(userId);
    const candidates = await (0, candidates_1.buildCandidatePool)(userId, "IT", 50, 365, preferences);
    const enrichedCandidates = await (0, enrich_1.enrichCandidates)(candidates);
    const filteredCandidates = enrichedCandidates.filter((candidate) => {
        const lang = candidate.originalLanguage?.toLowerCase();
        if (!lang)
            return true;
        return !EXCLUDED_ORIGINAL_LANGUAGES.has(lang);
    });
    const scored = (0, scoring_1.scoreMovies)(filteredCandidates, context, preferences).map((entry) => {
        const jitter = config_1.PCS_CONFIG.exploration.jitter ?? 0;
        if (!jitter)
            return entry;
        const noise = (Math.random() * 2 - 1) * jitter;
        return { ...entry, score: entry.score + noise };
    });
    const ranked = scored.sort((a, b) => b.score - a.score);
    const mixed = applyTopMix(ranked, {
        rate: config_1.PCS_CONFIG.exploration.topMixRate,
        window: config_1.PCS_CONFIG.exploration.topMixWindow
    });
    const finalRanked = (0, serendipity_1.applySerendipity)(mixed, {
        rate: config_1.PCS_CONFIG.serendipity.rate,
        poolSize: config_1.PCS_CONFIG.serendipity.poolSize
    });
    const best = finalRanked[0];
    const safeLimit = Math.max(1, Math.min(options?.limit ?? 5, finalRanked.length));
    const safeOffset = Math.max(0, Math.min(options?.offset ?? 0, finalRanked.length));
    return {
        recommended: {
            ...best,
            reasons: (0, explain_1.buildExplanation)(best)
        },
        topK: finalRanked.slice(safeOffset, safeOffset + safeLimit)
    };
}
function applyTopMix(ranked, options) {
    if (!ranked.length)
        return ranked;
    const topSize = Math.min(10, ranked.length);
    const mixRate = options.rate ?? 0;
    const mixCount = Math.max(1, Math.floor(topSize * mixRate));
    if (!mixRate || mixCount <= 0)
        return ranked;
    const windowSize = Math.min(options.window ?? 0, ranked.length - topSize);
    if (windowSize <= 0)
        return ranked;
    const result = [...ranked];
    const poolStart = topSize;
    const poolEnd = topSize + windowSize;
    const pool = result.slice(poolStart, poolEnd);
    if (!pool.length)
        return ranked;
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
