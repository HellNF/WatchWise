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
  fetchMovieDetails,
  searchPeople,
  MovieCandidate
} from "../../adapters/tmdb";

// Funzione di supporto per arricchire il pool con i suggested dei topK
async function fetchSuggestedForTopK(topK: MovieCandidate[], region: string, limitPerType = 10): Promise<MovieCandidate[]> {
  const suggested: MovieCandidate[] = [];
  for (const movie of topK) {
    const tmdbId = parseTmdbId(movie.movieId);
    if (!tmdbId) continue;
    try {
      const [similar, recommended] = await Promise.all([
        fetchSimilarMovies(tmdbId, limitPerType),
        fetchRecommendedMovies(tmdbId, limitPerType)
      ]);
      suggested.push(...similar, ...recommended);
    } catch {
      continue;
    }
  }
  return suggested;
}
import {
  getRecentlyWatchedMovies,
  getWatchHistoryEntries
} from "../../data/watch-history/repository";
import { getListItemsBySlug } from "../../data/lists/repository";
import { getUserPreferenceEvents } from "../../data/preferences/repository";
import { PreferenceProfile } from "./types";

export async function buildGroupCandidatePool(
  memberIds: string[],
  region: string,
  limit: number,
  excludeDays = 200,
  preferences?: PreferenceProfile
): Promise<{ pool: MovieCandidate[]; outsiderIds: Set<string> }> {

  const memberData = await Promise.all(
    memberIds.map(async (memberId) => {
      const [watched, history, watchlistItems, feedbackEvents] = await Promise.all([
        getRecentlyWatchedMovies(memberId, excludeDays),
        getWatchHistoryEntries(memberId, 20),
        getListItemsBySlug(memberId, "watching-list"),
        getUserPreferenceEvents(memberId, 300)
      ]);

      return { watched, history, watchlistItems, feedbackEvents };
    })
  );

  const watchedSet = new Set(
    memberData.flatMap((data) => data.watched.map(normalizeMovieId))
  );

  const watchlistSet = new Set(
    memberData.flatMap((data) => data.watchlistItems.map((item) => normalizeMovieId(item.movieId)))
  );

  const blockSince = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const blockedSet = new Set(
    memberData
      .flatMap((data) => data.feedbackEvents)
      .filter((event) => event.type === "movie" && event.source === "feedback")
      .filter((event) => event.createdAt >= blockSince)
      .map((event) => normalizeMovieId(event.value))
  );

  const historySeeds = Array.from(
    new Set(
      memberData
        .flatMap((data) => data.history)
        .map((entry) => parseTmdbId(entry.movieId))
        .filter((id): id is number => typeof id === "number")
    )
  ).slice(0, 6);

  const watchlistIds = Array.from(
    new Set(
      memberData
        .flatMap((data) => data.watchlistItems)
        .map((item) => normalizeMovieId(item.movieId))
    )
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

  const outsiderCandidates = await buildWatchlistOutsiders(
    watchlistIds,
    Math.max(6, Math.floor(limit * 0.2))
  );

  const poolTarget = limit * 3;
  const baseQuota = Math.max(1, Math.floor(poolTarget * 0.30));
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

  const outsiderIds = new Set(
    outsiderCandidates.map((candidate) => normalizeMovieId(candidate.movieId))
  );

  // Arricchimento: prendi i topK dal pool filtrato e aggiungi i suggested
  const topKForSuggestions = filtered.slice(0, 8); // Primi 8 film per varietà
  const suggested = await fetchSuggestedForTopK(topKForSuggestions, region, 6);

  // Unisci i suggested al pool, deduplicando e filtrando come sopra
  const allCandidates = [...filtered, ...suggested];
  const enrichedPool = buildPool(
    allCandidates,
    [],
    allCandidates.length,
    0,
    watchedSet,
    watchlistSet,
    blockedSet
  );

  const pool = mergeOutsiders(
    enrichedPool,
    outsiderCandidates,
    outsiderIds
  );

  console.log(`[GroupRecommendation] Pool di candidati unici generato (con suggested): ${pool.length} film diversi`);
  return { pool, outsiderIds };
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

async function buildWatchlistOutsiders(
  watchlistIds: string[],
  limit: number
): Promise<MovieCandidate[]> {
  const results: MovieCandidate[] = [];
  for (const movieId of watchlistIds) {
    if (results.length >= limit) break;
    const tmdbId = parseTmdbId(movieId);
    if (!tmdbId) continue;
    try {
      const details = await fetchMovieDetails(tmdbId);
      results.push({
        movieId: details.movieId,
        title: details.title,
        year: details.year,
        popularity: 0,
        voteAverage: details.rating ?? 0,
        voteCount: 0,
        posterPath: details.posterPath
      });
    } catch {
      continue;
    }
  }
  return results;
}

function mergeOutsiders(
  pool: MovieCandidate[],
  outsiders: MovieCandidate[],
  outsiderIds: Set<string>
): MovieCandidate[] {
  if (!outsiders.length) return pool;

  const seen = new Set(pool.map((candidate) => normalizeMovieId(candidate.movieId)));
  const merged = [...pool];

  for (const outsider of outsiders) {
    const id = normalizeMovieId(outsider.movieId);
    if (seen.has(id)) continue;
    merged.push(outsider);
    seen.add(id);
  }

  return merged;
}
