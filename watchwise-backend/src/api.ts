import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import { connectMongo } from "./config/mongodb";

import { userRoutes } from "./data/users/routes";
import { pcsRoutes } from "./pcs/routes";
import { tmdbTestRoute } from "./adapters/tmdb/test-route";
import { preferenceRoutes } from "./data/preferences/routes";
import { watchHistoryRoutes } from "./data/watch-history/routes";


const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "watchwise-backend" };
});

const start = async () => {
  try {
    // INIZIALIZZA MONGODB 
    await connectMongo();

    // REGISTRA ROUTES
    await userRoutes(app);
    await pcsRoutes(app);
    await tmdbTestRoute(app);
    await preferenceRoutes(app);
    await watchHistoryRoutes(app);

    // START SERVER
    await app.listen({ port: 3001, host: "0.0.0.0" });
    console.log("🚀 WatchWise backend running on http://localhost:3001");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
