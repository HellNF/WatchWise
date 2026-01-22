import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import {
  insertPreferenceEvent,
  getUserPreferences,
  deletePreferenceEvent,
  deleteRecentPreferencesBySource,
  insertPreferenceEvents,
  deletePreferencesBySource
} from "./repository";
import { PreferenceSource, PreferenceType } from "./types";

const ALLOWED_SOURCES: PreferenceSource[] = [
  "questionnaire",
  "watch",
  "explicit",
  "implicit",
  "feedback"
];

const ALLOWED_TYPES: PreferenceType[] = [
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

function normalizeEventInput(body: any) {
  const type = ALLOWED_TYPES.includes(body.type) ? body.type : undefined;
  if (!type || typeof body.value !== "string") return null;

  const source: PreferenceSource = ALLOWED_SOURCES.includes(body.source)
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

export async function preferenceRoutes(app: FastifyInstance) {

  app.get(
    "/api/preferences",
    { preHandler: [requireAuth] },
    async (req) => {
      const rows = await getUserPreferences(req.userId!);
      return rows.map((row) => ({
        id: row._id.toString(),
        userId: row.userId.toString(),
        type: row.type,
        value: row.value,
        weight: row.weight,
        source: row.source,
        createdAt: row.createdAt
      }));
    }
  );

  app.post(
    "/api/preferences",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;
      const normalized = normalizeEventInput(body);
      if (!normalized) return { ok: false, error: "INVALID_INPUT" };

      if (normalized.source === "questionnaire") {
        const since = new Date(Date.now() - 4 * 60 * 60 * 1000);
        await deleteRecentPreferencesBySource(req.userId!, "questionnaire", since);
      }

      await insertPreferenceEvent({
        userId: req.userId!,
        ...normalized
      });

      return { ok: true };
    }
  );

  app.post(
    "/api/preferences/bulk",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as any;
      const events = Array.isArray(body?.events) ? body.events : [];

      const normalized = events
        .map(normalizeEventInput)
        .filter((event: any): event is NonNullable<ReturnType<typeof normalizeEventInput>> => !!event);

      if (!normalized.length) {
        return { ok: false, error: "INVALID_INPUT" };
      }

      interface NormalizedPreferenceEvent {
        source: PreferenceSource;
      }

      const hasQuestionnaire: boolean = normalized.some(
        (event: NormalizedPreferenceEvent) => event.source === "questionnaire"
      );
      if (hasQuestionnaire) {
        const since = new Date(Date.now() - 4 * 60 * 60 * 1000);
        await deleteRecentPreferencesBySource(req.userId!, "questionnaire", since);
      }

      await insertPreferenceEvents(req.userId!, normalized);
      return { ok: true, count: normalized.length };
    }
  );

  app.delete(
    "/api/preferences/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as any;
      await deletePreferenceEvent(req.userId!, id);
      return { ok: true };
    }
  );

  app.delete(
    "/api/preferences/source/:source",
    { preHandler: [requireAuth] },
    async (req) => {
      const { source } = req.params as { source: PreferenceSource };
      if (!ALLOWED_SOURCES.includes(source)) {
        return { ok: false, error: "INVALID_SOURCE" };
      }
      await deletePreferencesBySource(req.userId!, source);
      return { ok: true };
    }
  );
}
