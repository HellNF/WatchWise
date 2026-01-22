import { PreferenceProfile } from "./types";
import { buildPreferenceProfile } from "../recommend-user/preferences";

export async function buildMemberPreferenceProfiles(
  memberIds: string[]
): Promise<PreferenceProfile[]> {
  if (!memberIds.length) {
    return [];
  }

  return Promise.all(
    memberIds.map((memberId) => buildPreferenceProfile(memberId))
  );
}

export function aggregateGroupPreferenceProfile(
  profiles: PreferenceProfile[]
): PreferenceProfile {
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

export async function buildGroupPreferenceProfile(
  memberIds: string[]
): Promise<PreferenceProfile> {
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
] as const;

function emptyProfile(): PreferenceProfile {
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
