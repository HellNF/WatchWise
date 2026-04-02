// watchwise-backend/src/data/groups/repository.ts
import { eq, and } from "drizzle-orm";
import { getDb } from "../../db";
import { groups, groupMembers } from "../../db/schema";
import { Group } from "./types";

async function attachMembers(groupRow: typeof groups.$inferSelect): Promise<Group> {
  const db = getDb();
  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupRow.id));

  return {
    id: groupRow.id,
    name: groupRow.name,
    hostId: groupRow.hostId ?? undefined,
    joinCode: groupRow.joinCode ?? undefined,
    joinCodeExpiresAt: groupRow.joinCodeExpiresAt ?? undefined,
    status: (groupRow.status as Group["status"]) ?? undefined,
    createdAt: groupRow.createdAt,
    members: members.map((m) => m.userId),
  };
}

export async function findGroupById(groupId: string): Promise<Group | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!rows[0]) return null;
  return attachMembers(rows[0]);
}

export async function findGroupsByMember(memberId: string): Promise<Group[]> {
  const db = getDb();
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, memberId));

  const result: Group[] = [];
  for (const { groupId } of memberRows) {
    const group = await findGroupById(groupId);
    if (group) result.push(group);
  }
  return result;
}

export async function findGroupByJoinCode(joinCode: string): Promise<Group | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.joinCode, joinCode))
    .limit(1);
  if (!rows[0]) return null;
  return attachMembers(rows[0]);
}

export async function createGroup(
  group: Omit<Group, "id" | "createdAt" | "members">
): Promise<Group> {
  const db = getDb();
  const rows = await db
    .insert(groups)
    .values({
      name: group.name,
      hostId: group.hostId,
      joinCode: group.joinCode,
      joinCodeExpiresAt: group.joinCodeExpiresAt,
      status: group.status ?? "open",
      createdAt: new Date(),
    })
    .returning();
  return { ...rows[0], members: [], hostId: rows[0].hostId ?? undefined, joinCode: rows[0].joinCode ?? undefined, joinCodeExpiresAt: rows[0].joinCodeExpiresAt ?? undefined, status: (rows[0].status as Group["status"]) ?? undefined };
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!existing.length) {
    await db.insert(groupMembers).values({ groupId, userId });
  }
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  const remaining = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (!remaining.length) {
    await db.delete(groups).where(eq(groups.id, groupId));
  }
}

export async function setGroupHost(groupId: string, hostId?: string): Promise<void> {
  const db = getDb();
  await db
    .update(groups)
    .set({ hostId: hostId ?? null })
    .where(eq(groups.id, groupId));
}

export async function updateGroupJoinCode(
  groupId: string,
  joinCode: string,
  expiresAt: Date
): Promise<void> {
  const db = getDb();
  await db
    .update(groups)
    .set({ joinCode, joinCodeExpiresAt: expiresAt })
    .where(eq(groups.id, groupId));
}

export async function updateGroupStatus(
  groupId: string,
  status: "open" | "locked" | "closed"
): Promise<void> {
  const db = getDb();
  await db.update(groups).set({ status }).where(eq(groups.id, groupId));
}
