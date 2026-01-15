"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPreferenceEvent = insertPreferenceEvent;
exports.getUserPreferences = getUserPreferences;
exports.getUserPreferenceEvents = getUserPreferenceEvents;
exports.deletePreferenceEvent = deletePreferenceEvent;
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
async function deletePreferenceEvent(userId, eventId) {
    await collection().deleteOne({
        _id: new mongodb_1.ObjectId(eventId),
        userId: new mongodb_1.ObjectId(userId)
    });
}
