import {
  fetchTrendingMovies,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchNowPlayingMovies,
  fetchMoviesByGenre,
  fetchMovieGenres,
  fetchSimilarMovies,
  fetchRecommendedMovies,
  fetchMovieByActor,
  fetchMovieByDirector,
  searchPeople,
  MovieCandidate
} from "../../adapters/tmdb";
import {
  getRecentlyWatchedMovies,
  getWatchHistoryEntries
} from "../../data/watch-history/repository";
import { getListItemsBySlug } from "../../data/lists/repository";
import { getUserPreferenceEvents } from "../../data/preferences/repository";
import { ObjectId } from "mongodb";
import { PreferenceProfile } from "./types";

export async function buildCandidatePool(
  userId: string,
  region: string,
  limit: number,
  excludeDays = 200, // 200 giorni: evita re-recommend
  preferences?: PreferenceProfile
): Promise<MovieCandidate[]> {

  const [watched, history, watchlistItems, feedbackEvents] = await Promise.all([
    getRecentlyWatchedMovies(new ObjectId(userId), excludeDays),
    getWatchHistoryEntries(userId, 20),
    getListItemsBySlug(userId, "watching-list"),
    getUserPreferenceEvents(new ObjectId(userId), 300)
  ]);

  const watchedSet = new Set(watched.map(normalizeMovieId));
  const watchlistSet = new Set(
    watchlistItems.map((item) => normalizeMovieId(item.movieId))
  );

  const blockSince = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const blockedSet = new Set(
    feedbackEvents
      .filter((event) => event.type === "movie" && event.source === "feedback")
      .filter((event) => event.createdAt >= blockSince)
      .map((event) => normalizeMovieId(event.value))
  );

  const baseLimit = Math.max(8, Math.ceil(limit / 4));
  const baseLists = await Promise.all([
    fetchTrendingMovies(region, baseLimit),
    fetchPopularMovies(region, baseLimit),
    fetchTopRatedMovies(region, baseLimit),
    fetchNowPlayingMovies(region, baseLimit)
  ]);

  const genreCandidates: MovieCandidate[] = [];
  if (preferences?.genres) {
    const genres = await fetchMovieGenres(region);
    const genreMap = new Map(
      genres.map((genre) => [genre.name.toLowerCase(), genre.id])
    );
    const topGenres = topKeys(preferences.genres, 8)
      .map((name) => genreMap.get(name.toLowerCase()))
      .filter((id): id is number => typeof id === "number");

    const genreLists = await Promise.all(
      topGenres.map((genreId) => fetchMoviesByGenre(genreId, region, Math.ceil(limit / 2)))
    );
    genreCandidates.push(...genreLists.flat());
  }

  const preferredActorCandidates = await fetchCandidatesByPeople(
    topKeys(preferences?.actors ?? {}, 6),
    "actor",
    region,
    Math.ceil(limit / 3)
  );

  const preferredDirectorCandidates = await fetchCandidatesByPeople(
    topKeys(preferences?.directors ?? {}, 4),
    "director",
    region,
    Math.ceil(limit / 4)
  );

  const historySeeds = history
    .map((entry) => parseTmdbId(entry.movieId))
    .filter((id): id is number => typeof id === "number")
    .slice(0, 4);

  const historyLists = await Promise.all(
    historySeeds.flatMap((tmdbId) => [
      fetchSimilarMovies(tmdbId, 8),
      fetchRecommendedMovies(tmdbId, 8)
    ])
  );

  const baseCandidates = baseLists.flat();
  const preferenceCandidates = [
    ...genreCandidates,
    ...preferredActorCandidates,
    ...preferredDirectorCandidates,
    ...historyLists.flat()
  ];

  const poolTarget = limit * 3;
  const baseQuota = Math.max(1, Math.floor(poolTarget * 0.15));
  const prefQuota = poolTarget - baseQuota;

  const filtered = buildPool(
    preferenceCandidates,
    baseCandidates,
    prefQuota,
    baseQuota,
    watchedSet,
    watchlistSet,
    blockedSet
  );

  return filtered;
}

function topKeys(bucket: Record<string, number>, size: number): string[] {
  return Object.entries(bucket)
    .sort((a, b) => b[1] - a[1])
    .slice(0, size)
    .map(([key]) => key);
}

async function fetchCandidatesByPeople(
  names: string[],
  role: "actor" | "director",
  region: string,
  limit: number
): Promise<MovieCandidate[]> {
  if (!names.length) return [];

  const results = await Promise.all(
    names.map(async (name) => {
      const people = await searchPeople(name, 1);
      const person = people?.[0];
      if (!person?.id) return [] as MovieCandidate[];
      if (role === "actor") {
        return fetchMovieByActor(person.id, region, limit);
      }
      return fetchMovieByDirector(person.id, region, limit);
    })
  );

  return results.flat();
}

function parseTmdbId(movieId: string): number | null {
  if (!movieId) return null;
  const normalized = movieId.startsWith("tmdb:")
    ? movieId.replace("tmdb:", "")
    : movieId;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMovieId(movieId: string): string {
  if (!movieId) return "";
  if (movieId.startsWith("tmdb:")) return movieId;
  const parsed = Number(movieId);
  if (Number.isFinite(parsed)) return `tmdb:${parsed}`;
  return movieId;
}

function buildPool(
  preferenceCandidates: MovieCandidate[],
  baseCandidates: MovieCandidate[],
  prefQuota: number,
  baseQuota: number,
  watchedSet: Set<string>,
  watchlistSet: Set<string>,
  blockedSet: Set<string>
): MovieCandidate[] {
  const seen = new Set<string>();
  const result: MovieCandidate[] = [];

  const pushUnique = (candidate: MovieCandidate) => {
    const candidateId = normalizeMovieId(candidate.movieId);
    if (watchedSet.has(candidateId)) return false;
    if (watchlistSet.has(candidateId)) return false;
    if (blockedSet.has(candidateId)) return false;
    if (seen.has(candidateId)) return false;
    seen.add(candidateId);
    result.push(candidate);
    return true;
  };

  for (const candidate of preferenceCandidates) {
    if (result.length >= prefQuota) break;
    pushUnique(candidate);
  }

  const afterPref = result.length;
  for (const candidate of baseCandidates) {
    if (result.length - afterPref >= baseQuota) break;
    pushUnique(candidate);
  }

  if (result.length < prefQuota + baseQuota) {
    for (const candidate of [...preferenceCandidates, ...baseCandidates]) {
      if (result.length >= prefQuota + baseQuota) break;
      pushUnique(candidate);
    }
  }

  return result;
}
