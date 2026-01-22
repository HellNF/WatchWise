import { FastifyInstance } from "fastify";
import { recommendForUser } from "./recommend-user";
import { recommendForGroup } from "./recommend-group";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../common/errors";

/**
 * PCS Routes
 * Espone le funzionalità di recommendation come API
 */
export async function pcsRoutes(app: FastifyInstance) {

  /**
   * USER RECOMMENDATION
   * Restituisce una raccomandazione personalizzata per l’utente autenticato
   */
  app.post(
    "/api/pcs/recommend/user",
    {
      preHandler: [requireAuth]
    },
    async (req) => {
      const userId = req.userId!;
      const body = req.body as any;
      const context = body?.context ?? {};
      const limit = typeof body?.limit === "number" ? body.limit : undefined;
      const offset = typeof body?.offset === "number" ? body.offset : undefined;

      const result = await recommendForUser(userId, context, { limit, offset });

      return result;
    }
  );

  /**
   * GROUP RECOMMENDATION
   * Restituisce una raccomandazione personalizzata per un gruppo
   */
  app.post(
    "/api/pcs/recommend/group",
    {
      preHandler: [requireAuth]
    },
    async (req) => {
      const userId = req.userId!;
      const body = req.body as any;
      const groupId = body?.groupId as string | undefined;
      const sessionId = body?.sessionId as string | undefined;
      const context = body?.context ?? {};
      const limit = typeof body?.limit === "number" ? body.limit : undefined;
      const offset = typeof body?.offset === "number" ? body.offset : undefined;

      if (!groupId) {
        throw new AppError("INVALID_INPUT", 400, "Missing groupId");
      }

      const result = await recommendForGroup(
        groupId,
        userId,
        context,
        { limit, offset, sessionId }
      );

      return result;
    }
  );

}
