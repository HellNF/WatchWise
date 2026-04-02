import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "../src/auth/routes";
import { userRoutes } from "../src/data/users/routes";
import { pcsRoutes } from "../src/pcs/routes";
import { tmdbTestRoute } from "../src/adapters/tmdb/test-route";
import { preferenceRoutes } from "../src/data/preferences/routes";
import { watchHistoryRoutes } from "../src/data/watch-history/routes";
import { movieRoutes } from "../src/data/movies/routes";
import { listRoutes } from "../src/data/lists/routes";
import { groupRoutes } from "../src/data/groups/routes";
import { groupSessionRoutes } from "../src/data/group-sessions/routes";
import type { IncomingMessage, ServerResponse } from "http";

const app = Fastify({ logger: false });

const init = (async () => {
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  app.get("/health", async () => ({ status: "ok", service: "watchwise-backend" }));

  await authRoutes(app);
  await userRoutes(app);
  await pcsRoutes(app);
  await tmdbTestRoute(app);
  await preferenceRoutes(app);
  await watchHistoryRoutes(app);
  await movieRoutes(app);
  await listRoutes(app);
  await groupRoutes(app);
  await groupSessionRoutes(app);

  await app.ready();
})();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await init;
  app.server.emit("request", req, res);
}
