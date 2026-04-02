import { FastifyRequest } from "fastify";
import { AppError } from "../common/errors";
import { verifyAccessToken } from "../auth/tokens";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(req: FastifyRequest) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;

  if (process.env.NODE_ENV !== "production") {
    if (token && token !== "dev") {
      req.userId = await verifyAccessToken(token);
      return;
    }
    req.userId = DEV_USER_ID;
    return;
  }

  if (!token) {
    throw new AppError("UNAUTHORIZED", 401, "Missing Authorization header");
  }

  req.userId = await verifyAccessToken(token);
}
