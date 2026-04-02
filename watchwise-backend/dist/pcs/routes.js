"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pcsRoutes = pcsRoutes;
const recommend_user_1 = require("./recommend-user");
const recommend_group_1 = require("./recommend-group");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../common/errors");
/**
 * PCS Routes
 * Espone le funzionalità di recommendation come API
 */
async function pcsRoutes(app) {
    /**
     * USER RECOMMENDATION
     * Restituisce una raccomandazione personalizzata per l’utente autenticato
     */
    app.post("/api/pcs/recommend/user", {
        preHandler: [auth_1.requireAuth]
    }, async (req) => {
        const userId = req.userId;
        const body = req.body;
        const context = body?.context ?? {};
        const limit = typeof body?.limit === "number" ? body.limit : undefined;
        const offset = typeof body?.offset === "number" ? body.offset : undefined;
        const result = await (0, recommend_user_1.recommendForUser)(userId, context, { limit, offset });
        return result;
    });
    /**
     * GROUP RECOMMENDATION
     * Restituisce una raccomandazione personalizzata per un gruppo
     */
    app.post("/api/pcs/recommend/group", {
        preHandler: [auth_1.requireAuth]
    }, async (req) => {
        const userId = req.userId;
        const body = req.body;
        const groupId = body?.groupId;
        const sessionId = body?.sessionId;
        const context = body?.context ?? {};
        const limit = typeof body?.limit === "number" ? body.limit : undefined;
        const offset = typeof body?.offset === "number" ? body.offset : undefined;
        if (!groupId) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Missing groupId");
        }
        const result = await (0, recommend_group_1.recommendForGroup)(groupId, userId, context, { limit, offset, sessionId });
        return result;
    });
}
