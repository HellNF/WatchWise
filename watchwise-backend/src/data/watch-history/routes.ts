import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import {
  insertWatchHistory,
  getWatchHistory,
  updateWatchHistory,
  deleteWatchHistory
} from "./repository";

export async function watchHistoryRoutes(app: FastifyInstance) {

  app.get(
    "/api/watch-history",
    { preHandler: [requireAuth] },
    async (req) => {
      return getWatchHistory(req.userId!);
    }
  );

  app.post(
    "/api/watch-history",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;

      await insertWatchHistory({
        userId: req.userId!,
        movieId: body.movieId,
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
