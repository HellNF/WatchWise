"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGroupFeedback = addGroupFeedback;
const mongodb_1 = require("../../config/mongodb");
function collection() {
    return (0, mongodb_1.getDb)().collection("group_feedback_events");
}
async function addGroupFeedback(event) {
    await collection().insertOne(event);
}
