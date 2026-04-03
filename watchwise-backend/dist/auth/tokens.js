"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = verifyAccessToken;
const jose_1 = require("jose");
const errors_1 = require("../common/errors");
let _jwks = null;
function getJwks() {
    if (_jwks)
        return _jwks;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
        throw new errors_1.AppError("INTERNAL_ERROR", 500, "Missing SUPABASE_URL");
    }
    _jwks = (0, jose_1.createRemoteJWKSet)(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    return _jwks;
}
async function verifyAccessToken(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getJwks());
        if (!payload.sub) {
            throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid token subject");
        }
        return String(payload.sub);
    }
    catch (error) {
        if (error instanceof errors_1.AppError)
            throw error;
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid or expired token");
    }
}
