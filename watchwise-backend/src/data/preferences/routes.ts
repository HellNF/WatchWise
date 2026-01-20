import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import {
  insertPreferenceEvent,
  getUserPreferences,
  deletePreferenceEvent,
  deleteRecentPreferencesBySource,
  insertPreferenceEvents
} from "./repository";
import { PreferenceSource, PreferenceType } from "./types";

const ALLOWED_SOURCES: PreferenceSource[] = [
  "questionnaire",
  "watch",
  "explicit",
  "implicit"
];

const ALLOWED_TYPES: PreferenceType[] = [
  "genre",
  "actor",
  "director",
  "mood",
  "energy",
  "company",
  "duration",
  "novelty"
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
      return getUserPreferences(req.userId!);
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
        .filter((event): event is NonNullable<ReturnType<typeof normalizeEventInput>> => !!event);

      if (!normalized.length) {
        return { ok: false, error: "INVALID_INPUT" };
      }

      const hasQuestionnaire = normalized.some((event) => event.source === "questionnaire");
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
}
