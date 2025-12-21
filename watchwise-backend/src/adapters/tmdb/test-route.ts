import { FastifyInstance } from "fastify";
import {
  fetchTrendingMovies,
  fetchMovieDetails,
  fetchStreamingAvailability,
} from "./service";

export async function tmdbTestRoute(app: FastifyInstance) {

  app.get("/dev/tmdb/trending", async () => {
    return fetchTrendingMovies("IT", 5);
  });

  app.get("/dev/tmdb/movie/:id", async (req) => {
    const id = Number((req.params as any).id);
    return fetchMovieDetails(id);
  });

  app.get("/dev/tmdb/movie/:id/streaming", async (req) => {
    const id = Number((req.params as any).id);
    return fetchStreamingAvailability(id, "IT");
  });
}
