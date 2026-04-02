"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOAuthProfile = getOAuthProfile;
exports.authRoutes = authRoutes;
const errors_1 = require("../common/errors");
const repository_1 = require("../data/users/repository");
const tokens_1 = require("./tokens");
const DEFAULT_AVATAR = "avatar_01";
function getProviderConfig(provider) {
    if (provider === "google") {
        const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
        if (!clientId || !clientSecret) {
            throw new errors_1.AppError("INTERNAL_ERROR", 500, "Missing Google OAuth configuration");
        }
        return {
            clientId,
            clientSecret,
            authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["openid", "email", "profile"],
        };
    }
    const clientId = process.env.GITHUB_CLIENT_ID ?? "";
    const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";
    if (!clientId || !clientSecret) {
        throw new errors_1.AppError("INTERNAL_ERROR", 500, "Missing GitHub OAuth configuration");
    }
    return {
        clientId,
        clientSecret,
        authorizeUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scopes: ["read:user", "user:email"],
    };
}
function getBaseUrl(req) {
    const configured = process.env.AUTH_BASE_URL?.replace(/\/$/, "");
    if (configured) {
        return configured;
    }
    const forwardedProto = req.headers["x-forwarded-proto"];
    const forwardedHost = req.headers["x-forwarded-host"];
    const host = forwardedHost ?? req.headers.host;
    const protocol = forwardedProto ?? "http";
    if (!host) {
        throw new errors_1.AppError("INTERNAL_ERROR", 500, "Missing host header");
    }
    return `${protocol}://${host}`;
}
function buildRedirectUri(req, provider) {
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}/oauth/${provider}/callback`;
}
async function fetchGoogleProfile(accessToken) {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Unable to fetch Google profile");
    }
    const profile = (await response.json());
    const email = profile.email?.trim();
    const id = profile.sub?.trim();
    // Username: always use the part before @ in email
    let username = "";
    if (email) {
        username = email.split("@")[0];
    }
    if (!email || !id || !username) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Missing Google profile data");
    }
    return { id, email, username };
}
async function fetchGithubEmail(accessToken) {
    const response = await fetch("https://api.github.com/user/emails", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "watchwise-backend",
        },
    });
    if (!response.ok) {
        return null;
    }
    const emails = (await response.json());
    const primary = emails.find((entry) => entry.primary && entry.verified && entry.email);
    if (primary?.email) {
        return primary.email;
    }
    const fallback = emails.find((entry) => entry.verified && entry.email);
    return fallback?.email ?? null;
}
async function fetchGithubProfile(accessToken) {
    const response = await fetch("https://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "watchwise-backend",
        },
    });
    if (!response.ok) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Unable to fetch GitHub profile");
    }
    const profile = (await response.json());
    const id = profile.id ? String(profile.id) : "";
    // GitHub spesso non ritorna email su /user: fallback su /user/emails
    let email = (profile.email ?? "").trim();
    if (!email) {
        const fetched = await fetchGithubEmail(accessToken);
        email = fetched?.trim() ?? "";
    }
    let username = profile.login?.trim() || "";
    if (!username && email) {
        username = email.split("@")[0];
    }
    if (!email || !id || !username) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Missing GitHub profile data");
    }
    return { id, email, username };
}
async function getOAuthProfile(provider, accessToken) {
    if (provider === "google") {
        return fetchGoogleProfile(accessToken);
    }
    return fetchGithubProfile(accessToken);
}
async function exchangeCodeForToken(provider, code, redirectUri) {
    const config = getProviderConfig(provider);
    if (provider === "google") {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: redirectUri,
        });
        const response = await fetch(config.tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        });
        const payload = (await response.json());
        if (!response.ok || !payload.access_token) {
            throw new errors_1.AppError("UNAUTHORIZED", 401, "Failed to exchange Google code");
        }
        return payload.access_token;
    }
    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
    });
    const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });
    const payload = (await response.json());
    if (!response.ok || !payload.access_token) {
        throw new errors_1.AppError("UNAUTHORIZED", 401, "Failed to exchange GitHub code");
    }
    return payload.access_token;
}
async function ensureOAuthUser(provider, profile) {
    console.log("Ensuring OAuth user:", provider, profile.email, profile.username, profile.id);
    const existingByOauth = await (0, repository_1.getUserByOAuth)(provider, profile.id);
    if (existingByOauth) {
        return existingByOauth;
    }
    const existingByEmail = await (0, repository_1.getUserByEmail)(profile.email);
    if (existingByEmail) {
        await (0, repository_1.linkOAuthToUser)(existingByEmail._id.toString(), provider, profile.id);
        const updated = await (0, repository_1.getUserById)(existingByEmail._id.toString());
        return updated ?? existingByEmail;
    }
    try {
        return await (0, repository_1.createUser)({
            email: profile.email,
            username: profile.username,
            avatar: DEFAULT_AVATAR,
            authProvider: "oauth",
            oauthProvider: provider,
            oauthId: profile.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    catch (err) {
        if (err.message === "USERNAME_ALREADY_EXISTS") {
            // Suggerisci username alternativi
            const suggestions = await suggestUsernames(profile.username);
            const error = new errors_1.AppError("USERNAME_TAKEN", 409, "Username già in uso");
            error.suggestions = suggestions;
            throw error;
        }
        throw err;
    }
}
// Genera suggerimenti username
async function suggestUsernames(base, n = 3) {
    const taken = new Set();
    const { getDb } = await Promise.resolve().then(() => __importStar(require("../config/mongodb")));
    const db = getDb();
    for await (const doc of db.collection("users").find({ username: { $regex: `^${base}` } }, { projection: { username: 1 } })) {
        taken.add(doc.username);
    }
    const suggestions = [];
    let i = 1;
    while (suggestions.length < n) {
        const candidate = i === 1 ? `${base}1` : `${base}${i}`;
        if (!taken.has(candidate))
            suggestions.push(candidate);
        i++;
    }
    return suggestions;
}
function buildAuthorizeUrl(provider, request, callbackUrl, redirectTo) {
    const config = getProviderConfig(provider);
    const redirectUri = buildRedirectUri(request, provider);
    return (0, tokens_1.signOAuthState)({ provider, callbackUrl, redirectTo }).then((state) => {
        const url = new URL(config.authorizeUrl);
        url.searchParams.set("client_id", config.clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", config.scopes.join(" "));
        url.searchParams.set("state", state);
        if (provider === "google") {
            url.searchParams.set("access_type", "offline");
            url.searchParams.set("prompt", "consent");
        }
        return url.toString();
    });
}
function redirectWithError(reply, callbackUrl, message) {
    if (callbackUrl) {
        const url = new URL(callbackUrl);
        url.searchParams.set("error", message);
        reply.redirect(url.toString());
        return;
    }
    reply.status(401).send({ error: message });
}
async function authRoutes(app) {
    app.get("/oauth/:provider", async (req, reply) => {
        const { provider } = req.params;
        if (provider !== "google" && provider !== "github") {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Unsupported OAuth provider");
        }
        const { callbackUrl, redirectTo } = req.query;
        if (!callbackUrl) {
            throw new errors_1.AppError("INVALID_INPUT", 400, "Missing callbackUrl");
        }
        const authorizeUrl = await buildAuthorizeUrl(provider, req, callbackUrl, redirectTo);
        reply.redirect(authorizeUrl);
    });
    app.get("/oauth/:provider/callback", async (req, reply) => {
        const { provider } = req.params;
        const { code, state, error } = req.query;
        let callbackUrl = null;
        if (state) {
            try {
                const payload = await (0, tokens_1.verifyOAuthState)(state);
                callbackUrl = payload.callbackUrl;
            }
            catch {
                callbackUrl = null;
            }
        }
        if (error) {
            redirectWithError(reply, callbackUrl, error);
            return;
        }
        if (!code || !state) {
            redirectWithError(reply, callbackUrl, "Missing OAuth authorization code");
            return;
        }
        const payload = await (0, tokens_1.verifyOAuthState)(state);
        if (payload.provider !== provider) {
            redirectWithError(reply, payload.callbackUrl, "OAuth provider mismatch");
            return;
        }
        const redirectUri = buildRedirectUri(req, provider);
        const accessToken = await exchangeCodeForToken(provider, code, redirectUri);
        const profile = await getOAuthProfile(provider, accessToken);
        const user = await ensureOAuthUser(provider, profile);
        const sessionToken = await (0, tokens_1.signAccessToken)(user._id.toString());
        const safeUser = {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            authProvider: user.authProvider,
        };
        const redirectTarget = new URL(payload.callbackUrl);
        redirectTarget.searchParams.set("token", sessionToken);
        redirectTarget.searchParams.set("user", JSON.stringify(safeUser));
        reply.redirect(redirectTarget.toString());
    });
}
