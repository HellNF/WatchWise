import { FastifyInstance } from "fastify";
import {
  fetchTrendingMovies,
  fetchPopularMovies,
  fetchNowPlayingMovies,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
  fetchMovieDetails,
  fetchStreamingAvailability,
  fetchMovieGenres,
  fetchMovieByActor,
  fetchMovieByDirector,
  fetchMoviesByGenre,
  searchMovies,
  searchPeople,
  fetchMovieImages,
  fetchMovieVideos,
  fetchMovieWatchProviders,
  fetchSimilarMovies,
  fetchRecommendedMovies,
} from "../../adapters/tmdb/service";

export async function movieRoutes(app: FastifyInstance) {
  app.get("/api/movies/trending", async (req) => {
    const { region = "IT", limit, page } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
    const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;

    return fetchTrendingMovies(region, parsedLimit, parsedPage);
  });

  app.get("/api/movies/popular", async (req) => {
    const { region = "IT", limit, page } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
    const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;

    return fetchPopularMovies(region, parsedLimit, parsedPage);
  });

  app.get("/api/movies/now-playing", async (req) => {
    const { region = "IT", limit, page } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
    const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;

    return fetchNowPlayingMovies(region, parsedLimit, parsedPage);
  });

  app.get("/api/movies/top-rated", async (req) => {
    const { region = "IT", limit, page } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
    const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;

    return fetchTopRatedMovies(region, parsedLimit, parsedPage);
  });

  app.get("/api/movies/upcoming", async (req) => {
    const { region = "IT", limit, page } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
    const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;

    return fetchUpcomingMovies(region, parsedLimit, parsedPage);
  });

  app.get("/api/movies/by-actor/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid actor id" });
    }
    const { region = "IT", limit } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
    return fetchMovieByActor(id, region, parsedLimit);
  });

  app.get("/api/movies/by-director/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid director id" });
    }
    const { region = "IT", limit } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
    return fetchMovieByDirector(id, region, parsedLimit);
  });

  app.get("/api/movies/by-genre/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid genre id" });
    }
    const { region = "IT", limit } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
    return fetchMoviesByGenre(id, region, parsedLimit);
  });

  app.get("/api/movies/search", async (req, reply) => {
    const { q, limit } = (req.query as any) ?? {};
    const query = String(q ?? "").trim();
    if (!query) {
      return reply.code(400).send({ error: "Missing query" });
    }
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
    return searchMovies(query, parsedLimit);
  });

  app.get("/api/people/search", async (req, reply) => {
    const { q, limit } = (req.query as any) ?? {};
    const query = String(q ?? "").trim();
    if (!query) {
      return reply.code(400).send({ error: "Missing query" });
    }
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
    return searchPeople(query, parsedLimit);
  });

  app.get("/api/movies/:id", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    console.log("Fetching details for movie ID:", id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }

    return fetchMovieDetails(id);
  });

  app.get("/api/movies/:id/streaming", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }

    const { region = "IT" } = (req.query as any) ?? {};
    return fetchStreamingAvailability(id, region);
  });

  app.get("/api/movies/:id/similar", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }
    const { limit } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 12;
    return fetchSimilarMovies(id, parsedLimit);
  });

  app.get("/api/movies/:id/recommendations", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }
    const { limit } = (req.query as any) ?? {};
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 12;
    return fetchRecommendedMovies(id, parsedLimit);
  });

  app.get("/api/movies/:id/images", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }

    return fetchMovieImages(id);
  });

  app.get("/api/movies/:id/videos", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }

    const { language = "it-IT" } = (req.query as any) ?? {};
    return fetchMovieVideos(id, language);
  });

  app.get("/api/movies/:id/watch-providers", async (req, reply) => {
    const rawId = String((req.params as any).id ?? "");
    const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
    const id = Number(numericPart);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: "Invalid movie id" });
    }

    return fetchMovieWatchProviders(id);
  });
  app.get("/api/movies/genres", async (req, reply) => {
    try {
      const genres = await fetchMovieGenres();
      return genres;
    } catch (error) {
      return reply.code(500).send({ error: "Failed to fetch movie genres" });
    }
  });
}
