import { jwtVerify, createRemoteJWKSet } from "jose";
import { AppError } from "../common/errors";

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (_jwks) return _jwks;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new AppError("INTERNAL_ERROR", 500, "Missing SUPABASE_URL");
  }
  _jwks = createRemoteJWKSet(
    new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
  );
  return _jwks;
}

export async function verifyAccessToken(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, getJwks());
    if (!payload.sub) {
      throw new AppError("UNAUTHORIZED", 401, "Invalid token subject");
    }
    return String(payload.sub);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UNAUTHORIZED", 401, "Invalid or expired token");
  }
}
