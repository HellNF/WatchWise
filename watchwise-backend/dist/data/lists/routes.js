"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRoutes = listRoutes;
const auth_1 = require("../../middleware/auth");
const errors_1 = require("../../common/errors");
const repository_1 = require("./repository");
async function listRoutes(app) {
    app.get("/api/lists", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const lists = await (0, repository_1.getUserLists)(req.userId);
        return lists.map((list) => ({
            id: list.id,
            name: list.name,
            slug: list.slug,
            isDefault: list.isDefault
        }));
    });
    app.post("/api/lists", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        const name = String(body?.name ?? "").trim();
        if (!name) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Missing list name");
        }
        await (0, repository_1.ensureDefaultLists)(req.userId);
        const list = await (0, repository_1.createUserList)(req.userId, name);
        return {
            id: list.id,
            name: list.name,
            slug: list.slug,
            isDefault: list.isDefault
        };
    });
    app.get("/api/lists/:listId/items", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { listId } = req.params;
        const list = await (0, repository_1.getUserListById)(req.userId, listId);
        if (!list) {
            throw new errors_1.AppError("NOT_FOUND", 404, "List not found");
        }
        return (0, repository_1.getListItems)(req.userId, listId);
    });
    app.post("/api/lists/:listId/items", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { listId } = req.params;
        const body = req.body;
        const movieId = String(body?.movieId ?? "").trim();
        if (!movieId) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Missing movieId");
        }
        const list = await (0, repository_1.getUserListById)(req.userId, listId);
        if (!list) {
            throw new errors_1.AppError("NOT_FOUND", 404, "List not found");
        }
        const result = await (0, repository_1.addListItem)(req.userId, listId, movieId);
        return { ok: true, created: result.created };
    });
    app.delete("/api/lists/:listId/items/:movieId", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { listId, movieId } = req.params;
        const list = await (0, repository_1.getUserListById)(req.userId, listId);
        if (!list) {
            throw new errors_1.AppError("NOT_FOUND", 404, "List not found");
        }
        await (0, repository_1.removeListItem)(req.userId, listId, movieId);
        return { ok: true };
    });
    app.delete("/api/lists/:listId", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { listId } = req.params;
        const list = await (0, repository_1.getUserListById)(req.userId, listId);
        if (!list) {
            throw new errors_1.AppError("NOT_FOUND", 404, "List not found");
        }
        if (list.isDefault) {
            throw new errors_1.AppError("INVALID_INPUT", 403, "Default lists cannot be deleted");
        }
        await (0, repository_1.deleteUserList)(req.userId, listId);
        return { ok: true };
    });
}
