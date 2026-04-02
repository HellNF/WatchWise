"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const errors_1 = require("../common/errors");
const tokens_1 = require("../auth/tokens");
async function requireAuth(req) {
    /**
     * DEV behavior:
     * - If NODE_ENV is not "production", we automatically set a fixed userId
     * - This bypasses any real authentication checks during local development
     */
    if (process.env.NODE_ENV !== "production") {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader !== "Bearer dev") {
            const token = authHeader.startsWith("Bearer ")
                ? authHeader.slice("Bearer ".length).trim()
                : authHeader.trim();
            if (token) {
                req.userId = await (0, tokens_1.verifyAccessToken)(token);
                return;
            }
        }
        req.userId = "000000000000000000000001";
        return;
    }
    /**
     * PROD behavior:
     * - Keep the middleware strict: do NOT fake users
     * - In production you must validate the Authorization header properly
     */
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Missing Authorization header");
    }
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : authHeader.trim();
    if (!token) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid Authorization header");
    }
    req.userId = await (0, tokens_1.verifyAccessToken)(token);
}
