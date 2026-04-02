"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.signOAuthState = signOAuthState;
exports.verifyOAuthState = verifyOAuthState;
const jose_1 = require("jose");
const errors_1 = require("../common/errors");
const DEFAULT_TOKEN_TTL = "7d";
const DEFAULT_STATE_TTL = "10m";
function getJwtSecret() {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) {
        throw new errors_1.AppError("INTERNAL_ERROR", 500, "Missing AUTH_JWT_SECRET");
    }
    return new TextEncoder().encode(secret);
}
async function signAccessToken(userId) {
    const ttl = process.env.AUTH_TOKEN_TTL ?? DEFAULT_TOKEN_TTL;
    return new jose_1.SignJWT({ scope: "user" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(getJwtSecret());
}
async function verifyAccessToken(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getJwtSecret());
        if (!payload.sub) {
            throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid token subject");
        }
        return String(payload.sub);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid or expired token");
    }
}
async function signOAuthState(payload) {
    return new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("oauth-state")
        .setIssuedAt()
        .setExpirationTime(DEFAULT_STATE_TTL)
        .sign(getJwtSecret());
}
async function verifyOAuthState(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getJwtSecret());
        if (payload.sub !== "oauth-state") {
            throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid OAuth state");
        }
        const provider = payload.provider;
        const callbackUrl = payload.callbackUrl;
        const redirectTo = payload.redirectTo;
        if (typeof provider !== "string" || typeof callbackUrl !== "string") {
            throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid OAuth state payload");
        }
        if (provider !== "google" && provider !== "github") {
            throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid OAuth provider");
        }
        return {
            provider,
            callbackUrl,
            redirectTo: typeof redirectTo === "string" ? redirectTo : undefined,
        };
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Invalid OAuth state");
    }
}
