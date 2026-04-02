import { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { getUserById, getUserByUsername, createUser } from "../data/users/repository";

const DEFAULT_AVATAR = "avatar_01";

function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30) || "user";
}

async function findUniqueUsername(base: string): Promise<string> {
  const sanitized = sanitizeUsername(base);
  if (!(await getUserByUsername(sanitized))) return sanitized;
  for (let i = 1; i <= 99; i++) {
    const candidate = `${sanitized}${i}`;
    if (!(await getUserByUsername(candidate))) return candidate;
  }
  return sanitized + "_" + Date.now().toString(36);
}

function getEmailFromToken(authHeader: string): string {
  try {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;
    const payloadB64 = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return typeof decoded.email === "string" ? decoded.email : "";
  } catch {
    return "";
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/api/auth/session",
    { preHandler: [requireAuth] },
    async (req) => {
      const userId = req.userId!;

      const existing = await getUserById(userId);
      if (existing) {
        return {
          id: existing.id,
          username: existing.username,
          avatar: existing.avatar,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt
        };
      }

      const email = getEmailFromToken(req.headers.authorization ?? "");
      const baseUsername = email ? email.split("@")[0] : userId.slice(0, 8);
      const username = await findUniqueUsername(baseUsername);

      const user = await createUser({ id: userId, username, avatar: DEFAULT_AVATAR });

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }
  );
}
