// src/middleware/auth.ts
import { FastifyRequest } from "fastify";
import { AppError } from "../common/errors";

// Estendiamo FastifyRequest
declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(req: FastifyRequest) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("UNAUTHORIZED", 401, "Missing Authorization header");
  }

  // STUB TEMPORANEO:
  // simuliamo un utente autenticato
  req.userId = "000000000000000000000001";
}
