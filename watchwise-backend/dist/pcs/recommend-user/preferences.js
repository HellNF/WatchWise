"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPreferenceProfile = buildPreferenceProfile;
const mongodb_1 = require("mongodb");
const repository_1 = require("../../data/preferences/repository");
const SHORT_TERM_LAMBDA = 0.2;
const LONG_TERM_LAMBDA = 0.02;
const SHORT_TERM_WEIGHT = 0.6;
const LONG_TERM_WEIGHT = 0.4;
async function buildPreferenceProfile(userId) {
    const events = await (0, repository_1.getUserPreferenceEvents)(new mongodb_1.ObjectId(userId), 300);
    const shortTerm = emptyProfile();
    const longTerm = emptyProfile();
    const now = Date.now();
    for (const ev of events) {
        const ageDays = (now - ev.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const shortDecay = Math.exp(-SHORT_TERM_LAMBDA * ageDays);
        const longDecay = Math.exp(-LONG_TERM_LAMBDA * ageDays);
        const shortContribution = ev.weight * shortDecay;
        const longContribution = ev.weight * longDecay;
        addContribution(shortTerm, ev.type, ev.value, shortContribution);
        addContribution(longTerm, ev.type, ev.value, longContribution);
    }
    normalizeProfile(shortTerm);
    normalizeProfile(longTerm);
    return mergeProfiles(shortTerm, longTerm);
}
/* ---------- helpers ---------- */
function emptyProfile() {
    return { genres: {}, actors: {}, directors: {}, moods: {} };
}
function addContribution(profile, type, value, amount) {
    const bucket = type === "genre" ? profile.genres :
        type === "actor" ? profile.actors :
            type === "director" ? profile.directors :
                profile.moods;
    bucket[value] = (bucket[value] || 0) + amount;
}
function normalizeProfile(profile) {
    for (const category of Object.values(profile)) {
        const keys = Object.keys(category);
        if (!keys.length)
            continue;
        const max = Math.max(...keys.map((key) => category[key]), 1);
        if (!max)
            continue;
        for (const key of keys) {
            category[key] = category[key] / max;
        }
    }
}
function mergeProfiles(shortTerm, longTerm) {
    const merged = emptyProfile();
    for (const key of ["genres", "actors", "directors", "moods"]) {
        const st = shortTerm[key];
        const lt = longTerm[key];
        const keys = new Set([...Object.keys(st), ...Object.keys(lt)]);
        for (const k of keys) {
            merged[key][k] =
                (st[k] || 0) * SHORT_TERM_WEIGHT +
                    (lt[k] || 0) * LONG_TERM_WEIGHT;
        }
    }
    return merged;
}
