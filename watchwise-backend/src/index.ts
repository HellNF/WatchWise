import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";

import { authRoutes } from "./auth/routes";
import { userRoutes } from "./data/users/routes";
import { pcsRoutes } from "./pcs/routes";
import { tmdbTestRoute } from "./adapters/tmdb/test-route";
import { preferenceRoutes } from "./data/preferences/routes";
import { watchHistoryRoutes } from "./data/watch-history/routes";
import { movieRoutes } from "./data/movies/routes";
import { listRoutes } from "./data/lists/routes";
import { groupRoutes } from "./data/groups/routes";
import { groupSessionRoutes } from "./data/group-sessions/routes";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "watchwise-backend" };
});

const start = async () => {
  try {
    await app.register(cors, {
      origin: true,
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    });

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

    await app.listen({ port: 3001, host: "0.0.0.0" });
    console.log("WatchWise backend running on http://localhost:3001");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
