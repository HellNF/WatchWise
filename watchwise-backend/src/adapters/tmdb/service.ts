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
  TMDBKeywordSearchResponse,
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
  limit = 50,
  page = 1
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/trending/movie/week",
    { region, page }
  );

  return data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
}

export async function fetchPopularMovies(
  region?: string,
  limit = 50,
  page = 1
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/movie/popular",
    { region, page }
  );
  return data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
}

export async function fetchNowPlayingMovies(
  region?: string,
  limit = 50,
  page = 1
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/movie/now_playing",
    { region, page }
  );
  return data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
}

export async function fetchTopRatedMovies(
  region?: string,
  limit = 50,
  page = 1
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/movie/top_rated",
    { region, page }
  );
  return data.results.slice(0, limit).map(mapTMDBMovieToCandidate);
}

export async function fetchUpcomingMovies(
  region?: string,
  limit = 50,
  page = 1
): Promise<MovieCandidate[]> {
  const data = await tmdbFetch<TMDBMovieListResponse>(
    "/movie/upcoming",
    { region, page }
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

export type JustWatchOffer = {
  providerName: string;
  url: string;
  type: "flatrate" | "rent" | "buy" | "free" | "ads" | "other";
};

const JW_GRAPHQL = "https://apis.justwatch.com/graphql";

const JW_QUERY = `
  query GetStreamingOffers($country: Country!, $language: Language!, $title: String!) {
    searchTitles(
      country: $country
      language: $language
      first: 8
      source: "justwatch-android"
      filter: { searchQuery: $title, objectTypes: [MOVIE] }
    ) {
      edges {
        node {
          ... on Movie {
            objectId
            content(country: $country, language: $language) {
              title
              externalIds { tmdbId }
            }
            offers(country: $country, platform: WEB) {
              monetizationType
              standardWebURL
              package { clearName }
            }
          }
        }
      }
    }
  }
`;

export async function fetchJustWatchLinks(
  tmdbId: number,
  title: string,
  country = "IT"
): Promise<JustWatchOffer[]> {
  const cacheKey = `jw:links:${tmdbId}:${country}`;
  const cached = getCached<JustWatchOffer[]>(cacheKey);
  if (cached) return cached;

  const language = country === "IT" ? "it" : "en";

  const res = await fetch(JW_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: JW_QUERY,
      variables: { country, language, title },
    }),
  });

  if (!res.ok) return [];

  const json = await res.json() as any;
  const edges: any[] = json?.data?.searchTitles?.edges ?? [];

  // prefer TMDB-ID match (externalIds.tmdbId is a string), fallback to first result
  const match =
    edges.find((e) => e.node?.content?.externalIds?.tmdbId === String(tmdbId)) ??
    edges[0];

  if (!match) return [];

  const offers: JustWatchOffer[] = (match.node.offers ?? [])
    .filter((o: any) => o.standardWebURL)
    .map((o: any) => ({
      providerName: o.package.clearName as string,
      url: o.standardWebURL as string,
      type: (o.monetizationType?.toLowerCase() ?? "other") as JustWatchOffer["type"],
    }));

  // deduplicate by providerName + type
  const seen = new Set<string>();
  const deduped = offers.filter((o) => {
    const key = `${o.providerName}:${o.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  setCached(cacheKey, deduped);
  return deduped;
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

export interface DiscoverParams {
  query?: string;
  genre_ids?: string;        // comma-separated TMDB genre IDs e.g. "28,12"
  year_from?: number;
  year_to?: number;
  rating_min?: number;
  rating_max?: number;
  runtime_min?: number;
  runtime_max?: number;
  with_cast?: number;        // TMDB person ID
  with_crew?: number;        // TMDB person ID (director)
  with_keywords?: string;   // comma-separated TMDB keyword IDs e.g. "4379,10527"
  sort_by?: string;          // e.g. "popularity.desc"
  page?: number;
}

export interface DiscoverResponse {
  results: MovieCandidate[];
  page: number;
  total_pages: number;
}

export async function discoverMovies(
  params: DiscoverParams
): Promise<DiscoverResponse> {
  const page = params.page ?? 1;
  const sortBy = params.sort_by ?? "popularity.desc";

  // If free-text query: use /search/movie (TMDB doesn't support text + discover)
  if (params.query?.trim()) {
    const cacheKey = `tmdb:search:movie:${params.query}:${page}`;
    const cached = getCached(cacheKey) as DiscoverResponse | undefined;
    if (cached) return cached;

    const data = await tmdbFetch<TMDBDiscoverResponse>("/search/movie", {
      query: params.query.trim(),
      page,
    });

    const result: DiscoverResponse = {
      results: data.results.map(mapTMDBMovieToCandidate),
      page: data.page,
      total_pages: data.total_pages ?? 1,
    };
    setCached(cacheKey, result);
    return result;
  }

  // Otherwise: use /discover/movie with all filter params
  const discoverParams: Record<string, string | number | undefined> = {
    sort_by: sortBy,
    page,
    with_genres: params.genre_ids || undefined,
    "primary_release_date.gte": params.year_from
      ? `${params.year_from}-01-01`
      : undefined,
    "primary_release_date.lte": params.year_to
      ? `${params.year_to}-12-31`
      : undefined,
    "vote_average.gte": params.rating_min,
    "vote_average.lte": params.rating_max,
    "with_runtime.gte": params.runtime_min,
    "with_runtime.lte": params.runtime_max,
    with_cast: params.with_cast,
    with_crew: params.with_crew,
    with_keywords: params.with_keywords || undefined,
    "vote_count.gte": 10,
  };

  const cacheKey = `tmdb:discover:${JSON.stringify(discoverParams)}`;
  const cached = getCached(cacheKey) as DiscoverResponse | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBDiscoverResponse>(
    "/discover/movie",
    discoverParams
  );

  const result: DiscoverResponse = {
    results: data.results.map(mapTMDBMovieToCandidate),
    page: data.page,
    total_pages: data.total_pages ?? 1,
  };
  setCached(cacheKey, result);
  return result;
}

export interface PersonDetails {
  id: number;
  name: string;
  profilePath?: string;
  biography?: string;
  birthday?: string;
  knownForDepartment?: string;
}

export async function fetchPersonDetails(personId: number): Promise<PersonDetails> {
  const cacheKey = `tmdb:person:${personId}:details`;
  const cached = getCached(cacheKey) as PersonDetails | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<{
    id: number;
    name: string;
    profile_path?: string;
    biography?: string;
    birthday?: string;
    known_for_department?: string;
  }>(`/person/${personId}`);

  const result: PersonDetails = {
    id: data.id,
    name: data.name,
    profilePath: data.profile_path
      ? `https://image.tmdb.org/t/p/w300${data.profile_path}`
      : undefined,
    biography: data.biography || undefined,
    birthday: data.birthday || undefined,
    knownForDepartment: data.known_for_department || undefined,
  };

  setCached(cacheKey, result);
  return result;
}

export async function searchKeywords(
  query: string,
  limit = 8
): Promise<{ id: number; name: string }[]> {
  const cacheKey = `tmdb:search:keyword:${query}:${limit}`;
  const cached = getCached(cacheKey) as { id: number; name: string }[] | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBKeywordSearchResponse>("/search/keyword", { query });
  const result = data.results.slice(0, limit).map((k) => ({ id: k.id, name: k.name }));
  setCached(cacheKey, result);
  return result;
}