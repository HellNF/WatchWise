"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGroupById = findGroupById;
exports.findGroupsByMember = findGroupsByMember;
exports.findGroupByJoinCode = findGroupByJoinCode;
exports.createGroup = createGroup;
exports.addGroupMember = addGroupMember;
exports.removeGroupMember = removeGroupMember;
exports.setGroupHost = setGroupHost;
exports.updateGroupJoinCode = updateGroupJoinCode;
exports.updateGroupStatus = updateGroupStatus;
// watchwise-backend/src/data/groups/repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
async function attachMembers(groupRow) {
    const db = (0, db_1.getDb)();
    const members = await db
        .select({ userId: schema_1.groupMembers.userId })
        .from(schema_1.groupMembers)
        .where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupRow.id));
    return {
        id: groupRow.id,
        name: groupRow.name,
        hostId: groupRow.hostId ?? undefined,
        joinCode: groupRow.joinCode ?? undefined,
        joinCodeExpiresAt: groupRow.joinCodeExpiresAt ?? undefined,
        status: groupRow.status ?? undefined,
        createdAt: groupRow.createdAt,
        members: members.map((m) => m.userId),
    };
}
async function findGroupById(groupId) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.groups)
        .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId))
        .limit(1);
    if (!rows[0])
        return null;
    return attachMembers(rows[0]);
}
async function findGroupsByMember(memberId) {
    const db = (0, db_1.getDb)();
    const memberRows = await db
        .select({ groupId: schema_1.groupMembers.groupId })
        .from(schema_1.groupMembers)
        .where((0, drizzle_orm_1.eq)(schema_1.groupMembers.userId, memberId));
    const result = [];
    for (const { groupId } of memberRows) {
        const group = await findGroupById(groupId);
        if (group)
            result.push(group);
    }
    return result;
}
async function findGroupByJoinCode(joinCode) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.groups)
        .where((0, drizzle_orm_1.eq)(schema_1.groups.joinCode, joinCode))
        .limit(1);
    if (!rows[0])
        return null;
    return attachMembers(rows[0]);
}
async function createGroup(group) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .insert(schema_1.groups)
        .values({
        name: group.name,
        hostId: group.hostId,
        joinCode: group.joinCode,
        joinCodeExpiresAt: group.joinCodeExpiresAt,
        status: group.status ?? "open",
        createdAt: new Date(),
    })
        .returning();
    return { ...rows[0], members: [], hostId: rows[0].hostId ?? undefined, joinCode: rows[0].joinCode ?? undefined, joinCodeExpiresAt: rows[0].joinCodeExpiresAt ?? undefined, status: rows[0].status ?? undefined };
}
async function addGroupMember(groupId, userId) {
    const db = (0, db_1.getDb)();
    const existing = await db
        .select()
        .from(schema_1.groupMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupId), (0, drizzle_orm_1.eq)(schema_1.groupMembers.userId, userId)))
        .limit(1);
    if (!existing.length) {
        await db.insert(schema_1.groupMembers).values({ groupId, userId });
    }
}
async function removeGroupMember(groupId, userId) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.groupMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupId), (0, drizzle_orm_1.eq)(schema_1.groupMembers.userId, userId)));
    const remaining = await db
        .select()
        .from(schema_1.groupMembers)
        .where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupId));
    if (!remaining.length) {
        await db.delete(schema_1.groups).where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId));
    }
}
async function setGroupHost(groupId, hostId) {
    const db = (0, db_1.getDb)();
    await db
        .update(schema_1.groups)
        .set({ hostId: hostId ?? null })
        .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId));
}
async function updateGroupJoinCode(groupId, joinCode, expiresAt) {
    const db = (0, db_1.getDb)();
    await db
        .update(schema_1.groups)
        .set({ joinCode, joinCodeExpiresAt: expiresAt })
        .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId));
}
async function updateGroupStatus(groupId, status) {
    const db = (0, db_1.getDb)();
    await db.update(schema_1.groups).set({ status }).where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId));
}
