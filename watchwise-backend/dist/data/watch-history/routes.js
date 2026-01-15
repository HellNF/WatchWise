"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchHistoryRoutes = watchHistoryRoutes;
const auth_1 = require("../../middleware/auth");
const repository_1 = require("./repository");
async function watchHistoryRoutes(app) {
    app.get("/api/watch-history", { preHandler: [auth_1.requireAuth] }, async (req) => {
        return (0, repository_1.getWatchHistory)(req.userId);
    });
    app.post("/api/watch-history", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        await (0, repository_1.insertWatchHistory)({
            userId: req.userId,
            movieId: body.movieId,
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
