"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCS_CONFIG = void 0;
exports.PCS_CONFIG = {
    weights: {
        popularity: 0.2,
        rating: 0.2,
        genre: 0.3,
        director: 0.2,
        actor: 0.1
    },
    serendipity: {
        rate: 0.2,
        poolSize: 20
    },
    enrichment: {
        maxCandidates: 10
    }
};
