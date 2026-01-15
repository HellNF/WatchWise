"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySerendipity = applySerendipity;
function applySerendipity(ranked, config) {
    if (ranked.length === 0)
        return ranked;
    const topCount = Math.max(1, Math.floor((1 - config.rate) * ranked.length));
    const top = ranked.slice(0, topCount);
    const tail = ranked.slice(topCount, topCount + config.poolSize);
    if (tail.length === 0)
        return ranked;
    // 🎯 SCELTA SERENDIPITY
    const surprise = tail[Math.floor(Math.random() * tail.length)];
    // ✅ QUI VA LA MODIFICA
    surprise.serendipity = true;
    surprise.reasons.push("Suggested to help you discover something new");
    // Inseriamo il surprise pick in seconda posizione
    return [
        top[0],
        surprise,
        ...top.slice(1)
    ];
}
