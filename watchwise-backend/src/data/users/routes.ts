import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import { getUserById, getUserByEmail , updateUser,deleteUserAndData } from "./repository";
import { AppError } from "../../common/errors";
import { ObjectId } from "mongodb";

export async function userRoutes(app: FastifyInstance) {

  app.get(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const userId = req.userId!;
      const user = await getUserById(userId);

      if (!user) {
        throw new AppError("NOT_FOUND", 404, "User not found");
      }

      return {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        authProvider: user.authProvider
      };
    }
  );

  app.get(
    "/api/users/by-email/:email",
    { preHandler: [requireAuth] },
    async (req) => {
      const { email } = req.params as { email: string };
      const user = await getUserByEmail(email);

      if (!user) {
        throw new AppError("NOT_FOUND", 404, "User not found");
      }

      return {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar
      };
    }
  );

  app.get(
    "/api/users/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as { id: string };
      if (!ObjectId.isValid(id)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid user id");
      }

      const user = await getUserById(id);
      if (!user) {
        throw new AppError("NOT_FOUND", 404, "User not found");
      }

      return {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar
      };
    }
  );

  app.patch(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;

      await updateUser(req.userId!, {
        username: body.username,
        avatar: body.avatar
      });

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
