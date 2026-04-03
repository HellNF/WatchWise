"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const auth_1 = require("../../middleware/auth");
const repository_1 = require("./repository");
const errors_1 = require("../../common/errors");
async function userRoutes(app) {
    app.get("/api/users/me", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const user = await (0, repository_1.getUserById)(req.userId);
        if (!user)
            throw new errors_1.AppError("NOT_FOUND", 404, "User not found");
        return { id: user.id, username: user.username, avatar: user.avatar };
    });
    app.get("/api/users/:id", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { id } = req.params;
        const user = await (0, repository_1.getUserById)(id);
        if (!user)
            throw new errors_1.AppError("NOT_FOUND", 404, "User not found");
        return { id: user.id, username: user.username, avatar: user.avatar };
    });
    app.patch("/api/users/me", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        await (0, repository_1.updateUser)(req.userId, { username: body.username, avatar: body.avatar });
        return { ok: true };
    });
    app.delete("/api/users/me", { preHandler: [auth_1.requireAuth] }, async (req) => {
        await (0, repository_1.deleteUserAndData)(req.userId);
        return { ok: true };
    });
}
