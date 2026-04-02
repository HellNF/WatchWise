import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import {
  insertWatchHistory,
  getWatchHistory,
  updateWatchHistory,
  deleteWatchHistory
} from "./repository";

export async function watchHistoryRoutes(app: FastifyInstance) {

  const normalizeMovieId = (movieId?: string) => {
    if (!movieId) return movieId;
    if (movieId.startsWith("tmdb:")) return movieId;
    const parsed = Number(movieId);
    return Number.isFinite(parsed) ? `tmdb:${parsed}` : movieId;
  };

  app.get(
    "/api/watch-history",
    { preHandler: [requireAuth] },
    async (req) => {
      const rows = await getWatchHistory(req.userId!);
      return rows.map((row) => ({
        id: row.id,
        movieId: row.movieId,
        watchedAt: row.watchedAt,
        rating: row.rating,
        completed: row.completed
      }));
    }
  );

  app.post(
    "/api/watch-history",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;

      await insertWatchHistory({
        userId: req.userId!,
        movieId: normalizeMovieId(body.movieId) ?? body.movieId,
        completed: body.completed ?? true,
        rating: body.rating,
        watchedAt: new Date()
      });

      return { ok: true };
    }
  );

  app.patch(
    "/api/watch-history/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as any;
      const body = req.body as any;

      await updateWatchHistory(req.userId!, id, body);
      return { ok: true };
    }
  );

  app.delete(
    "/api/watch-history/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as any;
      await deleteWatchHistory(req.userId!, id);
      return { ok: true };
    }
  );
}
