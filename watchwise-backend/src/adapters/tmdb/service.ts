import { tmdbFetch } from "./client";
import {
  TMDBMovieListResponse,
  TMDBMovieDetails,
  TMDBWatchProvidersResponse,
  TMDBGenreListResponse,
  TMDBPersonMovieCreditsResponse,
  TMDBDiscoverResponse,
  TMDBPersonSearchResponse,
  TMDBMovieImagesResponse,
  TMDBMovieVideosResponse,
} from "./types";
import {
  mapTMDBMovieToCandidate,
  mapTMDBDetailsToMovieDetails,
  mapTMDBWatchProviders,
  MovieCandidate,
  MovieDetails,
  StreamingAvailability,
} from "./mapper";
import { getCached, setCached } from "./cache";

/* ===== MOVIE LISTS ===== */

export async function fetchTrendingMovies(
  region?: string,
  limit = 50
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/trending/movie/week",
    { region }
  );

  return data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
}

export async function fetchPopularMovies(
  region?: string,
  limit = 50
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/movie/popular",
    { region }
  );
  return data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
}

export async function fetchSimilarMovies(
  tmdbId: number,
  limit = 12
): Promise<MovieCandidate[]> {
  const cacheKey = `tmdb:similar:${tmdbId}:${limit}`;
  const cached = getCached(cacheKey) as MovieCandidate[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieListResponse>(
    `/movie/${tmdbId}/similar`
  );

  const mapped = data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
  setCached(cacheKey, mapped);
  return mapped;
}

export async function fetchRecommendedMovies(
  tmdbId: number,
  limit = 12
): Promise<MovieCandidate[]> {
  const cacheKey = `tmdb:recommend:${tmdbId}:${limit}`;
  const cached = getCached(cacheKey) as MovieCandidate[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieListResponse>(
    `/movie/${tmdbId}/recommendations`
  );

  const mapped = data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
  setCached(cacheKey, mapped);
  return mapped;
}

/* ===== GENRES ===== */

export async function fetchMovieGenres(language?: string) {
  const cacheKey = `tmdb:genres:movies:${language ?? "default"}`;
  const cached = getCached(cacheKey) as { id: number; name: string }[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBGenreListResponse>(
    "/genre/movie/list",
    { language }
  );

  setCached(cacheKey, data.genres);
  return data.genres;
}

/* ===== MOVIE DETAILS ===== */

export async function fetchMovieDetails(tmdbId: number): Promise<MovieDetails> {
  const cacheKey = `tmdb:details:${tmdbId}`;

  const cached = getCached(cacheKey) as MovieDetails | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieDetails>(
    `/movie/${tmdbId}`,
    { append_to_response: "credits" }
  );
  //console.log("Fetched movie details from TMDB for ID:", data);

  const mapped = mapTMDBDetailsToMovieDetails(data);
  setCached(cacheKey, mapped);

  return mapped;
}

export async function fetchMovieImages(tmdbId: number) {
  const cacheKey = `tmdb:images:${tmdbId}`;
  const cached = getCached(cacheKey) as TMDBMovieImagesResponse | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieImagesResponse>(
    `/movie/${tmdbId}/images`
  );

  setCached(cacheKey, data);
  return data;
}

export async function fetchMovieVideos(
  tmdbId: number,
  language?: string
) {
  const cacheKey = `tmdb:videos:${tmdbId}:${language ?? "all"}`;
  const cached = getCached(cacheKey) as TMDBMovieVideosResponse | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieVideosResponse>(
    `/movie/${tmdbId}/videos`,
    { language }
  );

  setCached(cacheKey, data);
  return data;
}

/* ===== STREAMING ===== */

export async function fetchStreamingAvailability(
  tmdbId: number,
  region: string
): Promise<StreamingAvailability | null> {
  const data = await tmdbFetch<TMDBWatchProvidersResponse>(
    `/movie/${tmdbId}/watch/providers`
  );
  //console.log("Fetched watch providers from TMDB for ID:", data);

  return mapTMDBWatchProviders(data, region);
}

export async function fetchMovieWatchProviders(tmdbId: number) {
  const cacheKey = `tmdb:watch-providers:${tmdbId}`;
  const cached = getCached(cacheKey) as TMDBWatchProvidersResponse | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBWatchProvidersResponse>(
    `/movie/${tmdbId}/watch/providers`
  );
  //console.log("Fetched watch providers from TMDB for ID:", data);

  setCached(cacheKey, data);
  return data;
}

export async function fetchMovieByActor(
  actorId: number,
  region?: string,
  limit = 10
): Promise<MovieCandidate[]> {
  const cacheKey = `tmdb:person:${actorId}:movies:cast:${region ?? "all"}:${limit}`;
  const cached = getCached(cacheKey) as MovieCandidate[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBPersonMovieCreditsResponse>(
    `/person/${actorId}/movie_credits`,
    { region }
  );

  const mapped = data.cast
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map(mapTMDBMovieToCandidate);

  setCached(cacheKey, mapped);
  return mapped;
}

export async function fetchMovieByDirector(
  directorId: number,
  region?: string,
  limit = 10
): Promise<MovieCandidate[]> {
  const cacheKey = `tmdb:person:${directorId}:movies:director:${region ?? "all"}:${limit}`;
  const cached = getCached(cacheKey) as MovieCandidate[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBPersonMovieCreditsResponse>(
    `/person/${directorId}/movie_credits`,
    { region }
  );

  const mapped = data.crew
    .filter((m) => m.job === "Director")
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map(mapTMDBMovieToCandidate);

  setCached(cacheKey, mapped);
  return mapped;
}

export async function fetchMoviesByGenre(
  genreId: number,
  region?: string,
  limit = 10
): Promise<MovieCandidate[]> {
  const cacheKey = `tmdb:discover:genre:${genreId}:${region ?? "all"}:${limit}`;
  const cached = getCached(cacheKey) as MovieCandidate[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBDiscoverResponse>(
    "/discover/movie",
    { with_genres: genreId, region }
  );

  const mapped = data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
  setCached(cacheKey, mapped);
  return mapped;
}

export async function searchMovies(
  query: string,
  limit = 10
): Promise<MovieCandidate[]> {
  const cacheKey = `tmdb:search:movie:${query}:${limit}`;
  const cached = getCached(cacheKey) as MovieCandidate[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/search/movie",
    { query }
  );

  const mapped = data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
  setCached(cacheKey, mapped);
  return mapped;
}

export async function searchPeople(
  query: string,
  limit = 10
) {
  const cacheKey = `tmdb:search:person:${query}:${limit}`;
  const cached = getCached(cacheKey) as TMDBPersonSearchResponse["results"] | undefined;
  if (cached) return cached.slice(0, limit);

  const data = await tmdbFetch<TMDBPersonSearchResponse>(
    "/search/person",
    { query }
  );

  setCached(cacheKey, data.results);
  return data.results.slice(0, limit);
}