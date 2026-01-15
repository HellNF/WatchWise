"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movieRoutes = movieRoutes;
const service_1 = require("../../adapters/tmdb/service");
async function movieRoutes(app) {
    app.get("/api/movies/trending", async (req) => {
        const { region = "IT", limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        return (0, service_1.fetchTrendingMovies)(region, parsedLimit);
    });
    app.get("/api/movies/popular", async (req) => {
        const { region = "IT", limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        return (0, service_1.fetchPopularMovies)(region, parsedLimit);
    });
    app.get("/api/movies/:id", async (req, reply) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        return (0, service_1.fetchMovieDetails)(id);
    });
    app.get("/api/movies/:id/streaming", async (req, reply) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        const { region = "IT" } = req.query ?? {};
        return (0, service_1.fetchStreamingAvailability)(id, region);
    });
}
