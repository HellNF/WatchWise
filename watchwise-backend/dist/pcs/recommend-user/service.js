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
async function recommendForUser(userId, context) {
    const preferences = await (0, preferences_1.buildPreferenceProfile)(userId);
    const candidates = await (0, candidates_1.buildCandidatePool)(userId, "IT", 50, 365);
    const enrichedCandidates = await (0, enrich_1.enrichCandidates)(candidates);
    const scored = (0, scoring_1.scoreMovies)(enrichedCandidates, context, preferences);
    const ranked = scored.sort((a, b) => b.score - a.score);
    const finalRanked = (0, serendipity_1.applySerendipity)(ranked, {
        rate: config_1.PCS_CONFIG.serendipity.rate,
        poolSize: config_1.PCS_CONFIG.serendipity.poolSize
    });
    const best = finalRanked[0];
    return {
        recommended: {
            ...best,
            reasons: (0, explain_1.buildExplanation)(best)
        },
        topK: finalRanked.slice(0, 5)
    };
}
