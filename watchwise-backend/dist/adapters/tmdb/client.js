"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmdbFetch = tmdbFetch;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_BASE_URL || !TMDB_API_KEY) {
    throw new Error("Missing TMDB configuration");
}
async function tmdbFetch(path, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    url.searchParams.set("api_key", TMDB_API_KEY);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`TMDB error ${res.status}: ${text}`);
    }
    return res.json();
}
