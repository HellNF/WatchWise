// watchwise-backend/src/data/group-sessions/repository.ts
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { groupSessions } from "../../db/schema";
import { GroupSession } from "./types";

function toSession(row: typeof groupSessions.$inferSelect): GroupSession {
  return {
    id: row.id,
    groupId: row.groupId,
    context: (row.context as GroupSession["context"]) ?? {},
    createdAt: row.createdAt,
    selectedMovieId: row.selectedMovieId ?? undefined,
    softStartAt: row.softStartAt ?? undefined,
    softStartTimeoutMinutes: row.softStartTimeoutMinutes ?? undefined,
    startedAt: row.startedAt ?? undefined,
    status: (row.status as GroupSession["status"]) ?? undefined,
  };
}

export async function createGroupSession(
  session: Omit<GroupSession, "id">
): Promise<GroupSession> {
  const db = getDb();
  const rows = await db
    .insert(groupSessions)
    .values({
      groupId: session.groupId,
      context: session.context,
      selectedMovieId: session.selectedMovieId,
      softStartAt: session.softStartAt,
      softStartTimeoutMinutes: session.softStartTimeoutMinutes,
      startedAt: session.startedAt,
      status: session.status ?? "pending",
      createdAt: new Date(),
    })
    .returning();
  return toSession(rows[0]);
}

export async function findGroupSessionById(sessionId: string): Promise<GroupSession | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.id, sessionId))
    .limit(1);
  return rows[0] ? toSession(rows[0]) : null;
}

export async function updateGroupSessionById(
  sessionId: string,
  data: Partial<Omit<GroupSession, "id" | "groupId">>
): Promise<void> {
  const db = getDb();
  await db
    .update(groupSessions)
    .set({
      context: data.context,
      selectedMovieId: data.selectedMovieId,
      softStartAt: data.softStartAt,
      softStartTimeoutMinutes: data.softStartTimeoutMinutes,
      startedAt: data.startedAt,
      status: data.status,
    })
    .where(eq(groupSessions.id, sessionId));
}
