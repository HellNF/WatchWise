// watchwise-backend/src/data/users/routes.ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import { getUserById, updateUser, deleteUserAndData } from "./repository";
import { AppError } from "../../common/errors";

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const user = await getUserById(req.userId!);
      if (!user) throw new AppError("NOT_FOUND", 404, "User not found");
      return { id: user.id, username: user.username, avatar: user.avatar };
    }
  );

  app.get(
    "/api/users/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as { id: string };
      const user = await getUserById(id);
      if (!user) throw new AppError("NOT_FOUND", 404, "User not found");
      return { id: user.id, username: user.username, avatar: user.avatar };
    }
  );

  app.patch(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as { username?: string; avatar?: string };
      await updateUser(req.userId!, { username: body.username, avatar: body.avatar });
      return { ok: true };
    }
  );

  app.delete(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      await deleteUserAndData(req.userId!);
      return { ok: true };
    }
  );
}
