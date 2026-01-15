"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSession = createGroupSession;
const mongodb_1 = require("../../config/mongodb");
function collection() {
    return (0, mongodb_1.getDb)().collection("group_sessions");
}
async function createGroupSession(session) {
    const result = await collection().insertOne(session);
    return { _id: result.insertedId, ...session };
}
