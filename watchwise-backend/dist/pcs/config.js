"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCS_CONFIG = void 0;
exports.PCS_CONFIG = {
    weights: {
        // Somma esatta: 1.00
        popularity: 0.05, // tendenza/hype
        rating: 0.15, // qualità oggettiva (era 0.10)
        genre: 0.45, // affinità di genere — ancora dominante ma non assoluto (era 0.65)
        director: 0.20, // stile registico (era 0.15)
        actor: 0.15, // cast (era 0.25, ridotto per limitare bias verso ensemble)
    },
    serendipity: {
        rate: 0.1,
        poolSize: 100
    },
    exploration: {
        jitter: 0.04, // era 0.2 — ridotto per non oscurare rating (0.15) e popularity (0.05)
        topMixRate: 0.2,
        topMixWindow: 50
    },
    enrichment: {
        maxCandidates: 40
    },
    group: {
        // Bonus applicato allo score dei film presenti nelle watchlist dei membri.
        // I film in watchlist rappresentano un'intenzione esplicita di visione:
        // meritano di emergere nel ranking invece di essere relegati agli outsiders.
        watchlistBonus: 0.25
    }
};
