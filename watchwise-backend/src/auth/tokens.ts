import { SignJWT, jwtVerify } from "jose";
import { AppError } from "../common/errors";

const DEFAULT_TOKEN_TTL = "7d";
const DEFAULT_STATE_TTL = "10m";

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new AppError("INTERNAL_ERROR", 500, "Missing AUTH_JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: string): Promise<string> {
  const ttl = process.env.AUTH_TOKEN_TTL ?? DEFAULT_TOKEN_TTL;
  return new SignJWT({ scope: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) {
      throw new AppError("UNAUTHORIZED", 401, "Invalid token subject");
    }
    return String(payload.sub);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("UNAUTHORIZED", 401, "Invalid or expired token");
  }
}

export type OAuthStatePayload = {
  provider: "google" | "github";
  callbackUrl: string;
  redirectTo?: string;
};

export async function signOAuthState(payload: OAuthStatePayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("oauth-state")
    .setIssuedAt()
    .setExpirationTime(DEFAULT_STATE_TTL)
    .sign(getJwtSecret());
}

export async function verifyOAuthState(token: string): Promise<OAuthStatePayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.sub !== "oauth-state") {
      throw new AppError("UNAUTHORIZED", 401, "Invalid OAuth state");
    }
    const provider = payload.provider;
    const callbackUrl = payload.callbackUrl;
    const redirectTo = payload.redirectTo;
    if (typeof provider !== "string" || typeof callbackUrl !== "string") {
      throw new AppError("UNAUTHORIZED", 401, "Invalid OAuth state payload");
    }
    if (provider !== "google" && provider !== "github") {
      throw new AppError("UNAUTHORIZED", 401, "Invalid OAuth provider");
    }
    return {
      provider,
      callbackUrl,
      redirectTo: typeof redirectTo === "string" ? redirectTo : undefined,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("UNAUTHORIZED", 401, "Invalid OAuth state");
  }
}
