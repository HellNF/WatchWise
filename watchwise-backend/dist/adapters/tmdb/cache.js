"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.setCached = setCached;
const cache = new Map();
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12; // 12h
function getCached(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}
function setCached(key, value, ttl = DEFAULT_TTL_MS) {
    cache.set(key, { value, expiresAt: Date.now() + ttl });
}
