import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../common/errors";
import {
  addListItem,
  createUserList,
  ensureDefaultLists,
  getListItems,
  getUserListById,
  getUserLists,
  removeListItem
  , deleteUserList
} from "./repository";

export async function listRoutes(app: FastifyInstance) {
  app.get(
    "/api/lists",
    { preHandler: [requireAuth] },
    async (req) => {
      const lists = await getUserLists(req.userId!);
      return lists.map((list) => ({
        id: list._id.toString(),
        name: list.name,
        slug: list.slug,
        isDefault: list.isDefault
      }));
    }
  );

  app.post(
    "/api/lists",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;
      const name = String(body?.name ?? "").trim();

      if (!name) {
        throw new AppError("INVALID_INPUT", 400, "Missing list name");
      }

      await ensureDefaultLists(req.userId!);
      const list = await createUserList(req.userId!, name);

      return {
        id: list._id.toString(),
        name: list.name,
        slug: list.slug,
        isDefault: list.isDefault
      };
    }
  );

  app.get(
    "/api/lists/:listId/items",
    { preHandler: [requireAuth] },
    async (req) => {
      const { listId } = req.params as { listId: string };
      if (!ObjectId.isValid(listId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid list id");
      }
      const list = await getUserListById(req.userId!, listId);

      if (!list) {
        throw new AppError("NOT_FOUND", 404, "List not found");
      }

      return getListItems(req.userId!, listId);
    }
  );

  app.post(
    "/api/lists/:listId/items",
    { preHandler: [requireAuth] },
    async (req) => {
      const { listId } = req.params as { listId: string };
      const body = req.body as any;
      const movieId = String(body?.movieId ?? "").trim();

      if (!ObjectId.isValid(listId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid list id");
      }
      if (!movieId) {
        throw new AppError("INVALID_INPUT", 400, "Missing movieId");
      }

      const list = await getUserListById(req.userId!, listId);
      if (!list) {
        throw new AppError("NOT_FOUND", 404, "List not found");
      }

      const result = await addListItem(req.userId!, listId, movieId);
      return { ok: true, created: result.created };
    }
  );

  app.delete(
    "/api/lists/:listId/items/:movieId",
    { preHandler: [requireAuth] },
    async (req) => {
      const { listId, movieId } = req.params as {
        listId: string;
        movieId: string;
      };

      if (!ObjectId.isValid(listId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid list id");
      }

      const list = await getUserListById(req.userId!, listId);
      if (!list) {
        throw new AppError("NOT_FOUND", 404, "List not found");
      }

      await removeListItem(req.userId!, listId, movieId);
      return { ok: true };
    }
  );

  app.delete(
    "/api/lists/:listId",
    { preHandler: [requireAuth] },
    async (req) => {
      const { listId } = req.params as { listId: string };

      if (!ObjectId.isValid(listId)) {
        throw new AppError("INVALID_INPUT", 400, "Invalid list id");
      }

      const list = await getUserListById(req.userId!, listId);
      if (!list) {
        throw new AppError("NOT_FOUND", 404, "List not found");
      }
      if (list.isDefault) {
        throw new AppError("INVALID_INPUT", 403, "Default lists cannot be deleted");
      }

      await deleteUserList(req.userId!, listId);
      return { ok: true };
    }
  );
}
