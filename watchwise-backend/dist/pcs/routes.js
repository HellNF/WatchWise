"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pcsRoutes = pcsRoutes;
const recommend_user_1 = require("./recommend-user");
const auth_1 = require("../middleware/auth");
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
        const context = req.body?.context ?? {};
        const result = await (0, recommend_user_1.recommendForUser)(userId, context);
        return result;
    });
}
