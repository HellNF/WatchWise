"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferenceRoutes = preferenceRoutes;
const auth_1 = require("../../middleware/auth");
const repository_1 = require("./repository");
async function preferenceRoutes(app) {
    app.get("/api/preferences", { preHandler: [auth_1.requireAuth] }, async (req) => {
        return (0, repository_1.getUserPreferences)(req.userId);
    });
    app.post("/api/preferences", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        await (0, repository_1.insertPreferenceEvent)({
            userId: req.userId,
            type: body.type,
            value: body.value,
            weight: body.weight ?? 1,
            source: "explicit",
            createdAt: new Date()
        });
        return { ok: true };
    });
    app.delete("/api/preferences/:id", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { id } = req.params;
        await (0, repository_1.deletePreferenceEvent)(req.userId, id);
        return { ok: true };
    });
}
