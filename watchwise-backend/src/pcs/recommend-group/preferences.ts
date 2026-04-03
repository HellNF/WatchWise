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

/**
 * Calcola un coefficiente di confidenza [0, 1] per un profilo.
 * Un profilo con molte entry (generi, attori, registi conosciuti) è più affidabile
 * di un profilo quasi vuoto (utente nuovo o inattivo).
 * La piena confidenza viene raggiunta con almeno 60 entry distinte.
 */
export function computeProfileConfidence(profile: PreferenceProfile): number {
  let totalEntries = 0;
  for (const key of PROFILE_KEYS) {
    totalEntries += Object.keys(profile[key] ?? {}).length;
  }
  return Math.min(1.0, totalEntries / 60);
}

/**
 * Aggrega i profili dei membri del gruppo usando una media pesata per confidenza.
 *
 * Rispetto alla precedente media aritmetica semplice, questo approccio:
 * - Riduce il peso dei profili vuoti o quasi vuoti (nuovi utenti / utenti inattivi)
 *   che altrimenti diluiscono i segnali dei membri con storia consolidata.
 * - Amplifica i segnali dei membri con profili ricchi e affidabili.
 * - Gestisce correttamente anche pesi negativi (generi avversati, introdotti da P2-B).
 *
 * Fallback: se TUTTI i membri hanno confidenza zero, applica la media aritmetica
 * semplice (comportamento originale) per evitare divisioni per zero.
 */
export function aggregateGroupPreferenceProfile(
  profiles: PreferenceProfile[]
): PreferenceProfile {
  if (!profiles.length) {
    return emptyProfile();
  }

  const confidences = profiles.map(computeProfileConfidence);
  const totalConfidence = confidences.reduce((a, b) => a + b, 0);

  // Tutti i profili sono vuoti (gruppo di nuovi utenti): fallback alla media semplice
  if (totalConfidence === 0) {
    return simpleMeanAggregate(profiles);
  }

  const merged = emptyProfile();

  for (const key of PROFILE_KEYS) {
    // Raccoglie tutti i valori distinti presenti in almeno un profilo
    const allValues = new Set(
      profiles.flatMap((p) => Object.keys(p[key] ?? {}))
    );

    for (const value of allValues) {
      let weightedSum = 0;
      for (let i = 0; i < profiles.length; i++) {
        weightedSum += (profiles[i][key]?.[value] ?? 0) * confidences[i];
      }
      merged[key][value] = weightedSum / totalConfidence;
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

// --- helpers ---

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

/** Media aritmetica semplice — usata come fallback quando tutti i profili sono vuoti. */
function simpleMeanAggregate(profiles: PreferenceProfile[]): PreferenceProfile {
  const merged = emptyProfile();
  for (const profile of profiles) {
    for (const key of PROFILE_KEYS) {
      for (const [value, weight] of Object.entries(profile[key])) {
        merged[key][value] = (merged[key][value] || 0) + weight;
      }
    }
  }
  const divisor = profiles.length;
  for (const key of PROFILE_KEYS) {
    for (const value of Object.keys(merged[key])) {
      merged[key][value] /= divisor;
    }
  }
  return merged;
}
