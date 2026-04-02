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
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../../config/mongodb");
const COLLECTION = "user_preference_events";
function collection() {
    return (0, mongodb_2.getDb)().collection(COLLECTION);
}
async function insertPreferenceEvent(event) {
    const document = {
        _id: new mongodb_1.ObjectId(),
        ...event,
        userId: new mongodb_1.ObjectId(event.userId)
    };
    await collection().insertOne(document);
}
async function insertPreferenceEvents(userId, events) {
    if (!events.length)
        return;
    const documents = events.map((event) => ({
        _id: new mongodb_1.ObjectId(),
        ...event,
        userId: new mongodb_1.ObjectId(userId)
    }));
    await collection().insertMany(documents);
}
async function getUserPreferences(userId) {
    return collection()
        .find({ userId: new mongodb_1.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .toArray();
}
async function getUserPreferenceEvents(userId, limit = 300) {
    return collection()
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
}
async function getLatestQuestionnaireEvent(userId) {
    return collection()
        .find({ userId, source: "questionnaire" })
        .sort({ createdAt: -1 })
        .limit(1)
        .next();
}
async function deletePreferenceEvent(userId, eventId) {
    await collection().deleteOne({
        _id: new mongodb_1.ObjectId(eventId),
        userId: new mongodb_1.ObjectId(userId)
    });
}
async function deleteRecentPreferencesBySource(userId, source, since) {
    await collection().deleteMany({
        userId: new mongodb_1.ObjectId(userId),
        source,
        createdAt: { $gte: since }
    });
}
async function deletePreferencesBySource(userId, source) {
    await collection().deleteMany({
        userId: new mongodb_1.ObjectId(userId),
        source
    });
}
