// watchwise-backend/src/data/preferences/repository.ts
import { eq, desc, and, gte } from "drizzle-orm";
import { getDb } from "../../db";
import { userPreferenceEvents } from "../../db/schema";
import { UserPreferenceEvent, PreferenceType, PreferenceSource } from "./types";

function toEvent(row: typeof userPreferenceEvents.$inferSelect): UserPreferenceEvent {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as PreferenceType,
    value: row.value,
    weight: row.weight,
    source: row.source as PreferenceSource,
    createdAt: row.createdAt,
  };
}

type InsertPreferenceEvent = Omit<UserPreferenceEvent, "id" | "userId"> & {
  userId: string;
};

export async function insertPreferenceEvent(event: InsertPreferenceEvent): Promise<void> {
  const db = getDb();
  await db.insert(userPreferenceEvents).values({
    userId: event.userId,
    type: event.type,
    value: event.value,
    weight: event.weight,
    source: event.source,
    createdAt: event.createdAt ?? new Date(),
  });
}

export async function insertPreferenceEvents(
  userId: string,
  events: Omit<UserPreferenceEvent, "id" | "userId">[]
): Promise<void> {
  if (!events.length) return;
  const db = getDb();
  await db.insert(userPreferenceEvents).values(
    events.map((e) => ({
      userId,
      type: e.type,
      value: e.value,
      weight: e.weight,
      source: e.source,
      createdAt: e.createdAt ?? new Date(),
    }))
  );
}

export async function getUserPreferences(userId: string): Promise<UserPreferenceEvent[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPreferenceEvents)
    .where(eq(userPreferenceEvents.userId, userId))
    .orderBy(desc(userPreferenceEvents.createdAt));
  return rows.map(toEvent);
}

export async function getUserPreferenceEvents(
  userId: string,
  limit = 300
): Promise<UserPreferenceEvent[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPreferenceEvents)
    .where(eq(userPreferenceEvents.userId, userId))
    .orderBy(desc(userPreferenceEvents.createdAt))
    .limit(limit);
  return rows.map(toEvent);
}

export async function getLatestQuestionnaireEvent(
  userId: string
): Promise<UserPreferenceEvent | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.userId, userId),
        eq(userPreferenceEvents.source, "questionnaire")
      )
    )
    .orderBy(desc(userPreferenceEvents.createdAt))
    .limit(1);
  return rows[0] ? toEvent(rows[0]) : null;
}

export async function deletePreferenceEvent(userId: string, eventId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.id, eventId),
        eq(userPreferenceEvents.userId, userId)
      )
    );
}

export async function deleteRecentPreferencesBySource(
  userId: string,
  source: string,
  since: Date
): Promise<void> {
  const db = getDb();
  await db
    .delete(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.userId, userId),
        eq(userPreferenceEvents.source, source),
        gte(userPreferenceEvents.createdAt, since)
      )
    );
}

export async function deletePreferencesBySource(
  userId: string,
  source: string
): Promise<void> {
  const db = getDb();
  await db
    .delete(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.userId, userId),
        eq(userPreferenceEvents.source, source)
      )
    );
}
