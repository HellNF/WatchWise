"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchHistoryRoutes = watchHistoryRoutes;
const auth_1 = require("../../middleware/auth");
const repository_1 = require("./repository");
async function watchHistoryRoutes(app) {
    const normalizeMovieId = (movieId) => {
        if (!movieId)
            return movieId;
        if (movieId.startsWith("tmdb:"))
            return movieId;
        const parsed = Number(movieId);
        return Number.isFinite(parsed) ? `tmdb:${parsed}` : movieId;
    };
    app.get("/api/watch-history", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const rows = await (0, repository_1.getWatchHistory)(req.userId);
        return rows.map((row) => ({
            id: row.id,
            movieId: row.movieId,
            watchedAt: row.watchedAt,
            rating: row.rating,
            completed: row.completed
        }));
    });
    app.post("/api/watch-history", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        await (0, repository_1.insertWatchHistory)({
            userId: req.userId,
            movieId: normalizeMovieId(body.movieId) ?? body.movieId,
            completed: body.completed ?? true,
            rating: body.rating,
            watchedAt: new Date()
        });
        return { ok: true };
    });
    app.patch("/api/watch-history/:id", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { id } = req.params;
        const body = req.body;
        await (0, repository_1.updateWatchHistory)(req.userId, id, body);
        return { ok: true };
    });
    app.delete("/api/watch-history/:id", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { id } = req.params;
        await (0, repository_1.deleteWatchHistory)(req.userId, id);
        return { ok: true };
    });
}
