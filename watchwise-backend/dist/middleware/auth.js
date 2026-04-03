"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const errors_1 = require("../common/errors");
const tokens_1 = require("../auth/tokens");
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
async function requireAuth(req) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : undefined;
    if (process.env.NODE_ENV !== "production") {
        if (token && token !== "dev") {
            req.userId = await (0, tokens_1.verifyAccessToken)(token);
            return;
        }
        req.userId = DEV_USER_ID;
        return;
    }
    if (!token) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Missing Authorization header");
    }
    req.userId = await (0, tokens_1.verifyAccessToken)(token);
}
