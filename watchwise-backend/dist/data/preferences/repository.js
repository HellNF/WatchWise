"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPreferenceEvent = insertPreferenceEvent;
exports.insertPreferenceEvents = insertPreferenceEvents;
exports.getUserPreferences = getUserPreferences;
exports.getUserPreferenceEvents = getUserPreferenceEvents;
exports.getLatestQuestionnaireEvent = getLatestQuestionnaireEvent;
exports.deletePreferenceEvent = deletePreferenceEvent;
exports.deleteRecentPreferencesBySource = deleteRecentPreferencesBySource;
exports.deletePreferencesBySource = deletePreferencesBySource;
// watchwise-backend/src/data/preferences/repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
function toEvent(row) {
    return {
        id: row.id,
        userId: row.userId,
        type: row.type,
        value: row.value,
        weight: row.weight,
        source: row.source,
        createdAt: row.createdAt,
    };
}
async function insertPreferenceEvent(event) {
    const db = (0, db_1.getDb)();
    await db.insert(schema_1.userPreferenceEvents).values({
        userId: event.userId,
        type: event.type,
        value: event.value,
        weight: event.weight,
        source: event.source,
        createdAt: event.createdAt ?? new Date(),
    });
}
async function insertPreferenceEvents(userId, events) {
    if (!events.length)
        return;
    const db = (0, db_1.getDb)();
    await db.insert(schema_1.userPreferenceEvents).values(events.map((e) => ({
        userId,
        type: e.type,
        value: e.value,
        weight: e.weight,
        source: e.source,
        createdAt: e.createdAt ?? new Date(),
    })));
}
async function getUserPreferences(userId) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userPreferenceEvents)
        .where((0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userPreferenceEvents.createdAt));
    return rows.map(toEvent);
}
async function getUserPreferenceEvents(userId, limit = 300) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userPreferenceEvents)
        .where((0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userPreferenceEvents.createdAt))
        .limit(limit);
    return rows.map(toEvent);
}
async function getLatestQuestionnaireEvent(userId) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userPreferenceEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.source, "questionnaire")))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userPreferenceEvents.createdAt))
        .limit(1);
    return rows[0] ? toEvent(rows[0]) : null;
}
async function deletePreferenceEvent(userId, eventId) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.userPreferenceEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.id, eventId), (0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.userId, userId)));
}
async function deleteRecentPreferencesBySource(userId, source, since) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.userPreferenceEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.source, source), (0, drizzle_orm_1.gte)(schema_1.userPreferenceEvents.createdAt, since)));
}
async function deletePreferencesBySource(userId, source) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.userPreferenceEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userPreferenceEvents.source, source)));
}
