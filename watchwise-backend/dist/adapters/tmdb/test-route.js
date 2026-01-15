"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmdbTestRoute = tmdbTestRoute;
const service_1 = require("./service");
async function tmdbTestRoute(app) {
    app.get("/dev/tmdb/trending", async () => {
        return (0, service_1.fetchTrendingMovies)("IT", 5);
    });
    app.get("/dev/tmdb/movie/:id", async (req) => {
        const id = Number(req.params.id);
        return (0, service_1.fetchMovieDetails)(id);
    });
    app.get("/dev/tmdb/movie/:id/streaming", async (req) => {
        const id = Number(req.params.id);
        return (0, service_1.fetchStreamingAvailability)(id, "IT");
    });
}
