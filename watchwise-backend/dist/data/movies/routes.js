"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movieRoutes = movieRoutes;
const service_1 = require("../../adapters/tmdb/service");
async function movieRoutes(app) {
    app.get("/api/movies/trending", async (req) => {
        const { region = "IT", limit, page } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
        return (0, service_1.fetchTrendingMovies)(region, parsedLimit, parsedPage);
    });
    app.get("/api/movies/popular", async (req) => {
        const { region = "IT", limit, page } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
        return (0, service_1.fetchPopularMovies)(region, parsedLimit, parsedPage);
    });
    app.get("/api/movies/now-playing", async (req) => {
        const { region = "IT", limit, page } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
        return (0, service_1.fetchNowPlayingMovies)(region, parsedLimit, parsedPage);
    });
    app.get("/api/movies/top-rated", async (req) => {
        const { region = "IT", limit, page } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
        return (0, service_1.fetchTopRatedMovies)(region, parsedLimit, parsedPage);
    });
    app.get("/api/movies/upcoming", async (req) => {
        const { region = "IT", limit, page } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
        const parsedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
        return (0, service_1.fetchUpcomingMovies)(region, parsedLimit, parsedPage);
    });
    app.get("/api/movies/by-actor/:id", async (req, reply) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid actor id" });
        }
        const { region = "IT", limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
        return (0, service_1.fetchMovieByActor)(id, region, parsedLimit);
    });
    app.get("/api/movies/by-director/:id", async (req, reply) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid director id" });
        }
        const { region = "IT", limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
        return (0, service_1.fetchMovieByDirector)(id, region, parsedLimit);
    });
    app.get("/api/movies/by-genre/:id", async (req, reply) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid genre id" });
        }
        const { region = "IT", limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
        return (0, service_1.fetchMoviesByGenre)(id, region, parsedLimit);
    });
    app.get("/api/movies/search", async (req, reply) => {
        const { q, limit } = req.query ?? {};
        const query = String(q ?? "").trim();
        if (!query) {
            return reply.code(400).send({ error: "Missing query" });
        }
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
        return (0, service_1.searchMovies)(query, parsedLimit);
    });
    app.get("/api/people/:id", async (req, reply) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid person id" });
        }
        return (0, service_1.fetchPersonFullDetails)(id);
    });
    app.get("/api/people/search", async (req, reply) => {
        const { q, limit } = req.query ?? {};
        const query = String(q ?? "").trim();
        if (!query) {
            return reply.code(400).send({ error: "Missing query" });
        }
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
        return (0, service_1.searchPeople)(query, parsedLimit);
    });
    app.get("/api/movies/discover", async (req, reply) => {
        const q = req.query;
        const page = Number.isFinite(Number(q.page)) ? Math.max(1, Number(q.page)) : 1;
        const rating_min = q.rating_min !== undefined ? Number(q.rating_min) : undefined;
        const rating_max = q.rating_max !== undefined ? Number(q.rating_max) : undefined;
        const runtime_min = q.runtime_min !== undefined ? Number(q.runtime_min) : undefined;
        const runtime_max = q.runtime_max !== undefined ? Number(q.runtime_max) : undefined;
        const year_from = q.year_from !== undefined ? Number(q.year_from) : undefined;
        const year_to = q.year_to !== undefined ? Number(q.year_to) : undefined;
        const with_cast = q.with_cast !== undefined ? Number(q.with_cast) : undefined;
        const with_crew = q.with_crew !== undefined ? Number(q.with_crew) : undefined;
        return (0, service_1.discoverMovies)({
            query: q.query || undefined,
            genre_ids: q.genre_ids || undefined,
            year_from: Number.isFinite(year_from) ? year_from : undefined,
            year_to: Number.isFinite(year_to) ? year_to : undefined,
            rating_min: Number.isFinite(rating_min) ? rating_min : undefined,
            rating_max: Number.isFinite(rating_max) ? rating_max : undefined,
            runtime_min: Number.isFinite(runtime_min) ? runtime_min : undefined,
            runtime_max: Number.isFinite(runtime_max) ? runtime_max : undefined,
            with_cast: Number.isFinite(with_cast) ? with_cast : undefined,
            with_crew: Number.isFinite(with_crew) ? with_crew : undefined,
            with_keywords: q.with_keywords || undefined,
            sort_by: q.sort_by || "popularity.desc",
            page,
        });
    });
    app.get("/api/keywords/search", async (req, reply) => {
        const { q, limit } = req.query ?? {};
        const query = String(q ?? "").trim();
        if (!query)
            return reply.code(400).send({ error: "Missing query" });
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 8;
        return (0, service_1.searchKeywords)(query, parsedLimit);
    });
    app.get("/api/movies/:id", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        console.log("Fetching details for movie ID:", id);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        return (0, service_1.fetchMovieDetails)(id);
    });
    app.get("/api/movies/:id/streaming", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        const { region = "IT" } = req.query ?? {};
        return (0, service_1.fetchStreamingAvailability)(id, region);
    });
    app.get("/api/movies/:id/similar", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        const { limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 12;
        return (0, service_1.fetchSimilarMovies)(id, parsedLimit);
    });
    app.get("/api/movies/:id/recommendations", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        const { limit } = req.query ?? {};
        const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 12;
        return (0, service_1.fetchRecommendedMovies)(id, parsedLimit);
    });
    app.get("/api/movies/:id/images", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        return (0, service_1.fetchMovieImages)(id);
    });
    app.get("/api/movies/:id/videos", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        const { language = "it-IT" } = req.query ?? {};
        return (0, service_1.fetchMovieVideos)(id, language);
    });
    app.get("/api/movies/:id/watch-providers", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        return (0, service_1.fetchMovieWatchProviders)(id);
    });
    app.get("/api/movies/:id/watch-links", async (req, reply) => {
        const rawId = String(req.params.id ?? "");
        const numericPart = rawId.includes(":") ? rawId.split(":").pop() : rawId;
        const id = Number(numericPart);
        if (!Number.isFinite(id)) {
            return reply.code(400).send({ error: "Invalid movie id" });
        }
        const { country = "IT" } = req.query ?? {};
        try {
            const [details, tmdbProviders] = await Promise.all([
                (0, service_1.fetchMovieDetails)(id),
                (0, service_1.fetchMovieWatchProviders)(id).catch(() => null),
            ]);
            const title = details.title ?? "";
            const links = await (0, service_1.fetchJustWatchLinks)(id, title, country);
            // build logo map from TMDB: normalised name → logo_path
            const logoMap = new Map();
            const regionData = tmdbProviders?.results?.[country];
            for (const group of ["flatrate", "rent", "buy", "free"]) {
                for (const p of regionData?.[group] ?? []) {
                    if (p.logo_path) {
                        logoMap.set(p.provider_name.toLowerCase(), p.logo_path);
                    }
                }
            }
            return links.map((l) => ({
                ...l,
                logoPath: logoMap.get(l.providerName.toLowerCase()) ?? null,
            }));
        }
        catch {
            return [];
        }
    });
    app.get("/api/movies/genres", async (req, reply) => {
        try {
            const genres = await (0, service_1.fetchMovieGenres)();
            return genres;
        }
        catch (error) {
            return reply.code(500).send({ error: "Failed to fetch movie genres" });
        }
    });
}
