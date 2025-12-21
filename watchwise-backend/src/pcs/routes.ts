import { FastifyInstance } from "fastify";
import { recommendForUser } from "./recommend-user";
import { requireAuth } from "../middleware/auth";

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
      const context = (req.body as any)?.context ?? {};

      const result = await recommendForUser(userId, context);

      return result;
    }
  );

}
