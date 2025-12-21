import { tmdbFetch } from "./client";
import {
  TMDBMovieListResponse,
  TMDBMovieDetails,
  TMDBWatchProvidersResponse,
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

/* ===== MOVIE DETAILS ===== */

export async function fetchMovieDetails(tmdbId: number): Promise<MovieDetails> {
  const cacheKey = `tmdb:details:${tmdbId}`;

  const cached = getCached(cacheKey) as MovieDetails | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBMovieDetails>(
    `/movie/${tmdbId}`,
    { append_to_response: "credits" }
  );

  const mapped = mapTMDBDetailsToMovieDetails(data);
  setCached(cacheKey, mapped);

  return mapped;
}

/* ===== STREAMING ===== */

export async function fetchStreamingAvailability(
  tmdbId: number,
  region: string
): Promise<StreamingAvailability | null> {
  const data = await tmdbFetch<TMDBWatchProvidersResponse>(
    `/movie/${tmdbId}/watch/providers`
  );

  return mapTMDBWatchProviders(data, region);
}
