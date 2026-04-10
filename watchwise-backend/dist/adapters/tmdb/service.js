"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrendingMovies = fetchTrendingMovies;
exports.fetchPopularMovies = fetchPopularMovies;
exports.fetchNowPlayingMovies = fetchNowPlayingMovies;
exports.fetchTopRatedMovies = fetchTopRatedMovies;
exports.fetchUpcomingMovies = fetchUpcomingMovies;
exports.fetchSimilarMovies = fetchSimilarMovies;
exports.fetchRecommendedMovies = fetchRecommendedMovies;
exports.fetchMovieGenres = fetchMovieGenres;
exports.fetchMovieDetails = fetchMovieDetails;
exports.fetchMovieImages = fetchMovieImages;
exports.fetchMovieVideos = fetchMovieVideos;
exports.fetchStreamingAvailability = fetchStreamingAvailability;
exports.fetchMovieWatchProviders = fetchMovieWatchProviders;
exports.fetchJustWatchLinks = fetchJustWatchLinks;
exports.fetchMovieByActor = fetchMovieByActor;
exports.fetchMovieByDirector = fetchMovieByDirector;
exports.fetchMoviesByGenre = fetchMoviesByGenre;
exports.searchMovies = searchMovies;
exports.searchPeople = searchPeople;
exports.discoverMovies = discoverMovies;
exports.fetchPersonFullDetails = fetchPersonFullDetails;
exports.searchKeywords = searchKeywords;
const client_1 = require("./client");
const mapper_1 = require("./mapper");
const cache_1 = require("./cache");
/* ===== MOVIE LISTS ===== */
async function fetchTrendingMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/trending/movie/week", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchPopularMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/popular", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchNowPlayingMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/now_playing", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchTopRatedMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/top_rated", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchUpcomingMovies(region, limit = 50, page = 1) {
    const data = await (0, client_1.tmdbFetch)("/movie/upcoming", { region, page });
    return data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
}
async function fetchSimilarMovies(tmdbId, limit = 12) {
    const cacheKey = `tmdb:similar:${tmdbId}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/similar`);
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchRecommendedMovies(tmdbId, limit = 12) {
    const cacheKey = `tmdb:recommend:${tmdbId}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/recommendations`);
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
/* ===== GENRES ===== */
async function fetchMovieGenres(language) {
    const cacheKey = `tmdb:genres:movies:${language ?? "default"}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/genre/movie/list", { language });
    (0, cache_1.setCached)(cacheKey, data.genres);
    return data.genres;
}
/* ===== MOVIE DETAILS ===== */
async function fetchMovieDetails(tmdbId) {
    const cacheKey = `tmdb:details:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}`, { append_to_response: "credits" });
    //console.log("Fetched movie details from TMDB for ID:", data);
    const mapped = (0, mapper_1.mapTMDBDetailsToMovieDetails)(data);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchMovieImages(tmdbId) {
    const cacheKey = `tmdb:images:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/images`);
    (0, cache_1.setCached)(cacheKey, data);
    return data;
}
async function fetchMovieVideos(tmdbId, language) {
    const cacheKey = `tmdb:videos:${tmdbId}:${language ?? "all"}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/videos`, { language });
    (0, cache_1.setCached)(cacheKey, data);
    return data;
}
/* ===== STREAMING ===== */
async function fetchStreamingAvailability(tmdbId, region) {
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/watch/providers`);
    //console.log("Fetched watch providers from TMDB for ID:", data);
    return (0, mapper_1.mapTMDBWatchProviders)(data, region);
}
async function fetchMovieWatchProviders(tmdbId) {
    const cacheKey = `tmdb:watch-providers:${tmdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/movie/${tmdbId}/watch/providers`);
    //console.log("Fetched watch providers from TMDB for ID:", data);
    (0, cache_1.setCached)(cacheKey, data);
    return data;
}
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
async function fetchJustWatchLinks(tmdbId, title, country = "IT") {
    const cacheKey = `jw:links:${tmdbId}:${country}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const language = country === "IT" ? "it" : "en";
    const res = await fetch(JW_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: JW_QUERY,
            variables: { country, language, title },
        }),
    });
    if (!res.ok)
        return [];
    const json = await res.json();
    const edges = json?.data?.searchTitles?.edges ?? [];
    // prefer TMDB-ID match (externalIds.tmdbId is a string), fallback to first result
    const match = edges.find((e) => e.node?.content?.externalIds?.tmdbId === String(tmdbId)) ??
        edges[0];
    if (!match)
        return [];
    const offers = (match.node.offers ?? [])
        .filter((o) => o.standardWebURL)
        .map((o) => ({
        providerName: o.package.clearName,
        url: o.standardWebURL,
        type: (o.monetizationType?.toLowerCase() ?? "other"),
    }));
    // deduplicate by providerName + type
    const seen = new Set();
    const deduped = offers.filter((o) => {
        const key = `${o.providerName}:${o.type}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
    (0, cache_1.setCached)(cacheKey, deduped);
    return deduped;
}
async function fetchMovieByActor(actorId, region, limit = 10) {
    const cacheKey = `tmdb:person:${actorId}:movies:cast:${region ?? "all"}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/person/${actorId}/movie_credits`, { region });
    const mapped = data.cast
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit)
        .map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchMovieByDirector(directorId, region, limit = 10) {
    const cacheKey = `tmdb:person:${directorId}:movies:director:${region ?? "all"}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/person/${directorId}/movie_credits`, { region });
    const mapped = data.crew
        .filter((m) => m.job === "Director")
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit)
        .map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function fetchMoviesByGenre(genreId, region, limit = 10) {
    const cacheKey = `tmdb:discover:genre:${genreId}:${region ?? "all"}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/discover/movie", { with_genres: genreId, region });
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function searchMovies(query, limit = 10) {
    const cacheKey = `tmdb:search:movie:${query}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/search/movie", { query });
    const mapped = data.results.slice(0, limit).map(mapper_1.mapTMDBMovieToCandidate);
    (0, cache_1.setCached)(cacheKey, mapped);
    return mapped;
}
async function searchPeople(query, limit = 10) {
    const cacheKey = `tmdb:search:person:${query}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached.slice(0, limit);
    const data = await (0, client_1.tmdbFetch)("/search/person", { query });
    (0, cache_1.setCached)(cacheKey, data.results);
    return data.results.slice(0, limit);
}
async function discoverMovies(params) {
    const page = params.page ?? 1;
    const sortBy = params.sort_by ?? "popularity.desc";
    // If free-text query: use /search/movie (TMDB doesn't support text + discover)
    if (params.query?.trim()) {
        const cacheKey = `tmdb:search:movie:${params.query}:${page}`;
        const cached = (0, cache_1.getCached)(cacheKey);
        if (cached)
            return cached;
        const data = await (0, client_1.tmdbFetch)("/search/movie", {
            query: params.query.trim(),
            page,
        });
        const result = {
            results: data.results.map(mapper_1.mapTMDBMovieToCandidate),
            page: data.page,
            total_pages: data.total_pages ?? 1,
        };
        (0, cache_1.setCached)(cacheKey, result);
        return result;
    }
    // Otherwise: use /discover/movie with all filter params
    const discoverParams = {
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
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/discover/movie", discoverParams);
    const result = {
        results: data.results.map(mapper_1.mapTMDBMovieToCandidate),
        page: data.page,
        total_pages: data.total_pages ?? 1,
    };
    (0, cache_1.setCached)(cacheKey, result);
    return result;
}
function mapGender(g) {
    if (g === 1)
        return "Female";
    if (g === 2)
        return "Male";
    if (g === 3)
        return "Non-binary";
    return undefined;
}
function mapCreditItem(item) {
    const rawTitle = item.title ?? item.name ?? "Unknown";
    const rawDate = item.release_date ?? item.first_air_date;
    const year = rawDate ? new Date(rawDate).getFullYear() : undefined;
    return {
        id: item.id,
        title: rawTitle,
        year: Number.isFinite(year) ? year : undefined,
        posterPath: item.poster_path
            ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
            : undefined,
        popularity: item.popularity,
        voteAverage: item.vote_average,
        mediaType: item.media_type,
        character: item.character || undefined,
        job: item.job || undefined,
    };
}
const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
const AWARD_PRIORITY_RULES = [
    { pattern: /\bacademy award\b|\boscar\b/i, score: 120 },
    { pattern: /\bgolden globe\b/i, score: 110 },
    { pattern: /\bprimetime emmy\b|\bemmy\b/i, score: 105 },
    { pattern: /\bbafta\b/i, score: 102 },
    { pattern: /\bpalme d'?or\b|\bcannes\b/i, score: 98 },
    { pattern: /\bgolden lion\b|\bvenice\b/i, score: 94 },
    { pattern: /\bgolden bear\b|\bsilver bear\b|\bberlin\b/i, score: 92 },
    { pattern: /\bscreen actors guild\b|\bsag award\b/i, score: 90 },
    { pattern: /\bcritics'? choice\b/i, score: 86 },
    { pattern: /\bcesar award\b/i, score: 82 },
    { pattern: /\bsaturn award\b/i, score: 76 },
];
function escapeSparqlString(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function scoreAwardLabel(label, count) {
    const normalized = label.trim();
    const matchedRule = AWARD_PRIORITY_RULES.find((rule) => rule.pattern.test(normalized));
    return (matchedRule?.score ?? 20) + Math.min(count, 6) * 6;
}
function formatAwardHighlight(label, count) {
    return count > 1 ? `${count}x ${label} recipient` : `${label} recipient`;
}
async function fetchWikidataAwardHighlights(imdbId) {
    if (!imdbId)
        return [];
    const cacheKey = `wikidata:person-awards:${imdbId}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const query = `
    SELECT ?awardLabel (COUNT(?award) AS ?count) WHERE {
      ?person wdt:P345 "${escapeSparqlString(imdbId)}" .
      ?person p:P166 ?awardStatement .
      ?awardStatement ps:P166 ?award .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?awardLabel
    ORDER BY DESC(?count)
    LIMIT 12
  `;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    try {
        const response = await fetch(`${WIKIDATA_SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`, {
            headers: {
                Accept: "application/sparql-results+json",
                "User-Agent": "WatchWise/1.0 (person page enrichment)",
            },
            signal: controller.signal,
        });
        if (!response.ok)
            return [];
        const data = (await response.json());
        const highlights = (data.results?.bindings ?? [])
            .map((binding) => {
            const label = binding.awardLabel?.value?.trim();
            const count = Number(binding.count?.value ?? 0);
            if (!label || !Number.isFinite(count) || count < 1)
                return null;
            return { label, count, score: scoreAwardLabel(label, count) };
        })
            .filter((item) => Boolean(item))
            .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label))
            .slice(0, 3)
            .map((item) => ({
            label: formatAwardHighlight(item.label, item.count),
            source: "wikidata_award",
        }));
        (0, cache_1.setCached)(cacheKey, highlights);
        return highlights;
    }
    catch {
        return [];
    }
    finally {
        clearTimeout(timeoutId);
    }
}
function buildFallbackPersonHighlights(knownForDepartment, movieCredits, tvCredits) {
    const highlights = [];
    const totalCredits = movieCredits.length + tvCredits.length;
    const mostPopularCredit = [...movieCredits, ...tvCredits]
        .sort((a, b) => b.popularity - a.popularity)[0];
    if (mostPopularCredit?.title) {
        highlights.push({
            label: `Known for ${mostPopularCredit.title}`,
            source: "tmdb_fact",
        });
    }
    if (movieCredits.length > 0 && tvCredits.length > 0) {
        highlights.push({
            label: `${totalCredits} credited titles across film and TV`,
            source: "tmdb_fact",
        });
    }
    else if (movieCredits.length > 0) {
        highlights.push({
            label: `${movieCredits.length} movie credits`,
            source: "tmdb_fact",
        });
    }
    else if (tvCredits.length > 0) {
        highlights.push({
            label: `${tvCredits.length} TV credits`,
            source: "tmdb_fact",
        });
    }
    if (knownForDepartment) {
        highlights.push({
            label: `Known for ${knownForDepartment.toLowerCase()}`,
            source: "tmdb_fact",
        });
    }
    return highlights.slice(0, 3);
}
async function fetchPersonFullDetails(personId) {
    const cacheKey = `tmdb:person:${personId}:full`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)(`/person/${personId}`, { append_to_response: "external_ids,images,combined_credits" });
    const dedupeById = (items) => {
        const seen = new Set();
        return items.filter((item) => {
            if (seen.has(item.id))
                return false;
            seen.add(item.id);
            return true;
        });
    };
    const allCast = data.combined_credits.cast.map(mapCreditItem);
    const allCrew = data.combined_credits.crew.map(mapCreditItem);
    const movieCast = allCast.filter((c) => c.mediaType === "movie");
    const movieCrew = allCrew.filter((c) => c.mediaType === "movie" && c.job === "Director");
    const movieCredits = dedupeById([...movieCast, ...movieCrew].sort((a, b) => b.popularity - a.popularity));
    const tvCast = allCast.filter((c) => c.mediaType === "tv");
    const tvCrew = allCrew.filter((c) => c.mediaType === "tv" && c.job === "Director");
    const tvCredits = dedupeById([...tvCast, ...tvCrew].sort((a, b) => b.popularity - a.popularity));
    const awardHighlights = await fetchWikidataAwardHighlights(data.external_ids?.imdb_id || undefined);
    const heroHighlights = [
        ...awardHighlights,
        ...buildFallbackPersonHighlights(data.known_for_department || undefined, movieCredits, tvCredits),
    ].filter((highlight, index, array) => array.findIndex((candidate) => candidate.label === highlight.label) === index).slice(0, 3);
    const result = {
        id: data.id,
        name: data.name,
        profilePath: data.profile_path
            ? `https://image.tmdb.org/t/p/w300${data.profile_path}`
            : undefined,
        biography: data.biography || undefined,
        birthday: data.birthday || undefined,
        deathday: data.deathday || undefined,
        gender: mapGender(data.gender),
        placeOfBirth: data.place_of_birth || undefined,
        alsoKnownAs: data.also_known_as ?? [],
        knownForDepartment: data.known_for_department || undefined,
        imdbId: data.external_ids?.imdb_id || undefined,
        instagramId: data.external_ids?.instagram_id || undefined,
        heroHighlights,
        images: (data.images?.profiles ?? []).slice(0, 6).map((p) => ({
            filePath: `https://image.tmdb.org/t/p/w185${p.file_path}`,
            width: p.width,
            height: p.height,
        })),
        movieCredits,
        tvCredits,
    };
    (0, cache_1.setCached)(cacheKey, result);
    return result;
}
async function searchKeywords(query, limit = 8) {
    const cacheKey = `tmdb:search:keyword:${query}:${limit}`;
    const cached = (0, cache_1.getCached)(cacheKey);
    if (cached)
        return cached;
    const data = await (0, client_1.tmdbFetch)("/search/keyword", { query });
    const result = data.results.slice(0, limit).map((k) => ({ id: k.id, name: k.name }));
    (0, cache_1.setCached)(cacheKey, result);
    return result;
}
