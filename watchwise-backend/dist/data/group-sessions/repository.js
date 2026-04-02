"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSession = createGroupSession;
exports.findGroupSessionById = findGroupSessionById;
exports.updateGroupSessionById = updateGroupSessionById;
const mongodb_1 = require("../../config/mongodb");
function collection() {
    return (0, mongodb_1.getDb)().collection("group_sessions");
}
async function createGroupSession(session) {
    const result = await collection().insertOne(session);
    return { _id: result.insertedId, ...session };
}
async function findGroupSessionById(sessionId) {
    return collection().findOne({ _id: sessionId });
}
async function updateGroupSessionById(sessionId, data) {
    await collection().updateOne({ _id: sessionId }, { $set: data });
}
