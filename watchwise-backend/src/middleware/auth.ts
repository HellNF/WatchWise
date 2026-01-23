// src/middleware/auth.ts
import { FastifyRequest } from "fastify";
import { AppError } from "../common/errors";
import { verifyAccessToken } from "../auth/tokens";

// Estendiamo FastifyRequest
declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(req: FastifyRequest) {
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
        req.userId = await verifyAccessToken(token);
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
    throw new AppError("UNAUTHORIZED", 401, "Missing Authorization header");
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();

  if (!token) {
    throw new AppError("UNAUTHORIZED", 401, "Invalid Authorization header");
  }

  req.userId = await verifyAccessToken(token);
}
