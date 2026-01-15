"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fastify_1 = __importDefault(require("fastify"));
const mongodb_1 = require("./config/mongodb");
const routes_1 = require("./data/users/routes");
const routes_2 = require("./pcs/routes");
const test_route_1 = require("./adapters/tmdb/test-route");
const routes_3 = require("./data/preferences/routes");
const routes_4 = require("./data/watch-history/routes");
const routes_5 = require("./data/movies/routes");
const app = (0, fastify_1.default)({ logger: true });
app.get("/health", async () => {
    return { status: "ok", service: "watchwise-backend" };
});
const start = async () => {
    try {
        // INIZIALIZZA MONGODB 
        await (0, mongodb_1.connectMongo)();
        // REGISTRA ROUTES
        await (0, routes_1.userRoutes)(app);
        await (0, routes_2.pcsRoutes)(app);
        await (0, test_route_1.tmdbTestRoute)(app);
        await (0, routes_3.preferenceRoutes)(app);
        await (0, routes_4.watchHistoryRoutes)(app);
        await (0, routes_5.movieRoutes)(app);
        // START SERVER
        await app.listen({ port: 3001, host: "0.0.0.0" });
        console.log("🚀 WatchWise backend running on http://localhost:3001");
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
