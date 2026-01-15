"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const errors_1 = require("../common/errors");
async function requireAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Missing Authorization header");
    }
    // STUB TEMPORANEO:
    // simuliamo un utente autenticato
    req.userId = "000000000000000000000001";
}
