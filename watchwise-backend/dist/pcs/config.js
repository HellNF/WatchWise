"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCS_CONFIG = void 0;
exports.PCS_CONFIG = {
    weights: {
        popularity: 0.05,
        rating: 0.1,
        genre: 0.65,
        director: 0.15,
        actor: 0.25
    },
    serendipity: {
        rate: 0.1,
        poolSize: 100
    },
    exploration: {
        jitter: 0.2,
        topMixRate: 0.2,
        topMixWindow: 50
    },
    enrichment: {
        maxCandidates: 40
    }
};
