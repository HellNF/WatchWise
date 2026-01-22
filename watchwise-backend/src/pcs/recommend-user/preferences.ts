import { ObjectId } from "mongodb";
import { getUserPreferenceEvents } from "../../data/preferences/repository";
import { getWatchHistoryEntries } from "../../data/watch-history/repository";
import { WatchHistoryEntry } from "../../data/watch-history/types";
import { fetchMovieDetails } from "../../adapters/tmdb/service";
import { PreferenceProfile } from "./types";
import { PreferenceSource, PreferenceType } from "../../data/preferences/types";

const SHORT_TERM_LAMBDA = 0.2;
const LONG_TERM_LAMBDA = 0.02;

const SHORT_TERM_WEIGHT = 0.6;
const LONG_TERM_WEIGHT = 0.4;

const SOURCE_MULTIPLIERS: Record<PreferenceSource, number> = {
  questionnaire: 1.6,
  explicit: 1.2,
  implicit: 1.0,
  watch: 0.9,
  feedback: 1.4
};

export async function buildPreferenceProfile(
  userId: string
): Promise<PreferenceProfile> {

  const events = await getUserPreferenceEvents(
    new ObjectId(userId),
    300
  );


  const derivedEvents = await derivePreferenceEventsFromWatchHistory(userId, 200);

  const allEvents = [...events, ...derivedEvents];

  const shortTerm = emptyProfile();
  const longTerm = emptyProfile();

  const now = Date.now();

  for (const ev of allEvents) {
    const ageDays =
      (now - ev.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    const sourceMultiplier = SOURCE_MULTIPLIERS[ev.source] ?? 1;
    const baseWeight = ev.weight * sourceMultiplier;

    const shortDecay = Math.exp(-SHORT_TERM_LAMBDA * ageDays);
    const longDecay  = Math.exp(-LONG_TERM_LAMBDA  * ageDays);

    const shortContribution = baseWeight * shortDecay;
    const longContribution  = baseWeight * longDecay;

    addContribution(shortTerm, ev.type, ev.value, shortContribution);
    addContribution(longTerm,  ev.type, ev.value, longContribution);
  }

  normalizeProfile(shortTerm);
  normalizeProfile(longTerm);

  return mergeProfiles(shortTerm, longTerm);
}

/* ---------- helpers ---------- */

function emptyProfile(): PreferenceProfile {
  return {
    genres: {},
    actors: {},
    directors: {},
    moods: {},
    energies: {},
    companies: {},
    durations: {},
    novelties: {},
  };
}

function addContribution(
  profile: PreferenceProfile,
  type: string,
  value: string,
  amount: number
) {
  if (type === "movie") return;
  const bucket =
    type === "genre" ? profile.genres :
    type === "actor" ? profile.actors :
    type === "director" ? profile.directors :
    type === "mood" ? profile.moods :
    type === "energy" ? profile.energies :
    type === "company" ? profile.companies :
    type === "duration" ? profile.durations :
    profile.novelties;

  bucket[value] = (bucket[value] || 0) + amount;
}

function normalizeProfile(profile: PreferenceProfile) {
  for (const category of Object.values(profile)) {
    const keys = Object.keys(category);
    if (!keys.length) continue;

    const max = Math.max(...keys.map((key) => category[key]), 1);
    if (!max) continue;

    for (const key of keys) {
      category[key] = category[key] / max;
    }
  }
}

function mergeProfiles(
  shortTerm: PreferenceProfile,
  longTerm: PreferenceProfile
): PreferenceProfile {

  const merged = emptyProfile();

  for (const key of [
    "genres",
    "actors",
    "directors",
    "moods",
    "energies",
    "companies",
    "durations",
    "novelties",
  ] as const) {
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

type DerivedPreferenceEvent = {
  type: PreferenceType;
  value: string;
  weight: number;
  source: PreferenceSource;
  createdAt: Date;
};

async function derivePreferenceEventsFromWatchHistory(
  userId: string,
  limit = 200
): Promise<DerivedPreferenceEvent[]> {
  const history = await getWatchHistoryEntries(userId, limit);
  if (!history.length) return [];

  const detailsCache = new Map<number, Awaited<ReturnType<typeof fetchMovieDetails>> | null>();
  const events: DerivedPreferenceEvent[] = [];

  for (const entry of history) {
    const tmdbId = parseTmdbId(entry.movieId);
    if (!tmdbId) continue;

    let details = detailsCache.get(tmdbId);
    if (details === undefined) {
      try {
        details = await fetchMovieDetails(tmdbId);
      } catch {
        details = null;
      }
      detailsCache.set(tmdbId, details);
    }
    if (!details) continue;

    const baseWeight = computeWatchWeight(entry);
    const createdAt = entry.watchedAt;

    if (details.genres?.length) {
      const perGenre = baseWeight * 0.7 / details.genres.length;
      for (const genre of details.genres) {
        events.push({
          type: "genre",
          value: genre,
          weight: perGenre,
          source: "watch",
          createdAt
        });
      }
    }

    if (details.director) {
      events.push({
        type: "director",
        value: details.director,
        weight: baseWeight * 0.6,
        source: "watch",
        createdAt
      });
    }

    if (details.actors?.length) {
      const topActors = details.actors.slice(0, 4);
      const perActor = baseWeight * 0.5 / topActors.length;
      for (const actor of topActors) {
        events.push({
          type: "actor",
          value: actor,
          weight: perActor,
          source: "watch",
          createdAt
        });
      }
    }

    const implicitMood = inferImplicitMood(entry);
    if (implicitMood) {
      events.push({
        type: "mood",
        value: implicitMood,
        weight: Math.min(0.5, baseWeight * 0.4),
        source: "implicit",
        createdAt
      });
    }
  }

  return events;
}

function parseTmdbId(movieId: string): number | null {
  if (!movieId) return null;
  const normalized = movieId.startsWith("tmdb:")
    ? movieId.replace("tmdb:", "")
    : movieId;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeWatchWeight(entry: WatchHistoryEntry): number {
  let weight = entry.completed ? 0.5 : 0.3;

  if (typeof entry.rating === "number") {
    const normalized = clamp((entry.rating - 3) / 7, 0, 1);
    weight = 0.3 + normalized * 0.7;
    if (!entry.completed) {
      weight *= 0.7;
    }
  }

  return clamp(weight, 0, 1);
}

function inferImplicitMood(entry: WatchHistoryEntry): string | null {
  const hour = entry.watchedAt.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late-night";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
