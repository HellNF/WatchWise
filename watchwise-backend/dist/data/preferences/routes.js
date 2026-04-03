"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferenceRoutes = preferenceRoutes;
const auth_1 = require("../../middleware/auth");
const repository_1 = require("./repository");
const ALLOWED_SOURCES = [
    "questionnaire",
    "watch",
    "explicit",
    "implicit",
    "feedback"
];
const ALLOWED_TYPES = [
    "genre",
    "actor",
    "director",
    "mood",
    "energy",
    "company",
    "duration",
    "novelty",
    "movie"
];
function normalizeEventInput(body) {
    const type = ALLOWED_TYPES.includes(body.type) ? body.type : undefined;
    if (!type || typeof body.value !== "string")
        return null;
    const source = ALLOWED_SOURCES.includes(body.source)
        ? body.source
        : "explicit";
    return {
        type,
        value: body.value,
        weight: body.weight ?? 1,
        source,
        createdAt: new Date()
    };
}
async function preferenceRoutes(app) {
    app.get("/api/preferences", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const rows = await (0, repository_1.getUserPreferences)(req.userId);
        return rows.map((row) => ({
            id: row.id,
            userId: row.userId,
            type: row.type,
            value: row.value,
            weight: row.weight,
            source: row.source,
            createdAt: row.createdAt
        }));
    });
    app.post("/api/preferences", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        const normalized = normalizeEventInput(body);
        if (!normalized)
            return { ok: false, error: "INVALID_INPUT" };
        if (normalized.source === "questionnaire") {
            const since = new Date(Date.now() - 4 * 60 * 60 * 1000);
            await (0, repository_1.deleteRecentPreferencesBySource)(req.userId, "questionnaire", since);
        }
        await (0, repository_1.insertPreferenceEvent)({
            userId: req.userId,
            ...normalized
        });
        return { ok: true };
    });
    app.post("/api/preferences/bulk", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const body = req.body;
        const events = Array.isArray(body?.events) ? body.events : [];
        const normalized = events
            .map(normalizeEventInput)
            .filter((event) => !!event);
        if (!normalized.length) {
            return { ok: false, error: "INVALID_INPUT" };
        }
        const hasQuestionnaire = normalized.some((event) => event.source === "questionnaire");
        if (hasQuestionnaire) {
            const since = new Date(Date.now() - 4 * 60 * 60 * 1000);
            await (0, repository_1.deleteRecentPreferencesBySource)(req.userId, "questionnaire", since);
        }
        await (0, repository_1.insertPreferenceEvents)(req.userId, normalized);
        return { ok: true, count: normalized.length };
    });
    app.delete("/api/preferences/:id", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { id } = req.params;
        await (0, repository_1.deletePreferenceEvent)(req.userId, id);
        return { ok: true };
    });
    app.delete("/api/preferences/source/:source", { preHandler: [auth_1.requireAuth] }, async (req) => {
        const { source } = req.params;
        if (!ALLOWED_SOURCES.includes(source)) {
            return { ok: false, error: "INVALID_SOURCE" };
        }
        await (0, repository_1.deletePreferencesBySource)(req.userId, source);
        return { ok: true };
    });
}
