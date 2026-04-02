"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMemberPreferenceProfiles = buildMemberPreferenceProfiles;
exports.aggregateGroupPreferenceProfile = aggregateGroupPreferenceProfile;
exports.buildGroupPreferenceProfile = buildGroupPreferenceProfile;
const preferences_1 = require("../recommend-user/preferences");
async function buildMemberPreferenceProfiles(memberIds) {
    if (!memberIds.length) {
        return [];
    }
    return Promise.all(memberIds.map((memberId) => (0, preferences_1.buildPreferenceProfile)(memberId)));
}
function aggregateGroupPreferenceProfile(profiles) {
    if (!profiles.length) {
        return emptyProfile();
    }
    const merged = emptyProfile();
    for (const profile of profiles) {
        for (const key of PROFILE_KEYS) {
            const bucket = profile[key];
            const target = merged[key];
            for (const [value, weight] of Object.entries(bucket)) {
                target[value] = (target[value] || 0) + weight;
            }
        }
    }
    const divisor = profiles.length;
    for (const key of PROFILE_KEYS) {
        const bucket = merged[key];
        for (const value of Object.keys(bucket)) {
            bucket[value] = bucket[value] / divisor;
        }
    }
    return merged;
}
async function buildGroupPreferenceProfile(memberIds) {
    const profiles = await buildMemberPreferenceProfiles(memberIds);
    return aggregateGroupPreferenceProfile(profiles);
}
const PROFILE_KEYS = [
    "genres",
    "actors",
    "directors",
    "moods",
    "energies",
    "companies",
    "durations",
    "novelties"
];
function emptyProfile() {
    return {
        genres: {},
        actors: {},
        directors: {},
        moods: {},
        energies: {},
        companies: {},
        durations: {},
        novelties: {}
    };
}
