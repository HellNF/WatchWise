"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSession = createGroupSession;
exports.findGroupSessionById = findGroupSessionById;
exports.updateGroupSessionById = updateGroupSessionById;
// watchwise-backend/src/data/group-sessions/repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
function toSession(row) {
    return {
        id: row.id,
        groupId: row.groupId,
        context: row.context ?? {},
        createdAt: row.createdAt,
        selectedMovieId: row.selectedMovieId ?? undefined,
        softStartAt: row.softStartAt ?? undefined,
        softStartTimeoutMinutes: row.softStartTimeoutMinutes ?? undefined,
        startedAt: row.startedAt ?? undefined,
        status: row.status ?? undefined,
    };
}
async function createGroupSession(session) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .insert(schema_1.groupSessions)
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
async function findGroupSessionById(sessionId) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.groupSessions)
        .where((0, drizzle_orm_1.eq)(schema_1.groupSessions.id, sessionId))
        .limit(1);
    return rows[0] ? toSession(rows[0]) : null;
}
async function updateGroupSessionById(sessionId, data) {
    const db = (0, db_1.getDb)();
    await db
        .update(schema_1.groupSessions)
        .set({
        context: data.context,
        selectedMovieId: data.selectedMovieId,
        softStartAt: data.softStartAt,
        softStartTimeoutMinutes: data.softStartTimeoutMinutes,
        startedAt: data.startedAt,
        status: data.status,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.groupSessions.id, sessionId));
}
