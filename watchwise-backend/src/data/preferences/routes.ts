import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import {
  insertPreferenceEvent,
  getUserPreferences,
  deletePreferenceEvent
} from "./repository";

export async function preferenceRoutes(app: FastifyInstance) {

  app.get(
    "/api/preferences",
    { preHandler: [requireAuth] },
    async (req) => {
      return getUserPreferences(req.userId!);
    }
  );

  app.post(
    "/api/preferences",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;

      await insertPreferenceEvent({
        userId: req.userId!,
        type: body.type,
        value: body.value,
        weight: body.weight ?? 1,
        source: "explicit",
        createdAt: new Date()
      });

      return { ok: true };
    }
  );

  app.delete(
    "/api/preferences/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as any;
      await deletePreferenceEvent(req.userId!, id);
      return { ok: true };
    }
  );
}
