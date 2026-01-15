"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getUserByEmail = getUserByEmail;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUserAndData = deleteUserAndData;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../../config/mongodb");
function collection() {
    return (0, mongodb_2.getDb)().collection("users");
}
async function getUserById(id) {
    return collection().findOne({ _id: new mongodb_1.ObjectId(id) });
}
async function getUserByEmail(email) {
    return collection().findOne({ email });
}
async function createUser(data) {
    const result = await collection().insertOne(data);
    return { _id: result.insertedId, ...data };
}
async function updateUser(userId, data) {
    await collection().updateOne({ _id: new mongodb_1.ObjectId(userId) }, {
        $set: {
            ...data,
            updatedAt: new Date()
        }
    });
}
async function deleteUserAndData(userId) {
    const db = (0, mongodb_2.getDb)();
    const _id = new mongodb_1.ObjectId(userId);
    await Promise.all([
        db.collection("users").deleteOne({ _id }),
        db.collection("user_preference_events").deleteMany({ userId: _id }),
        db.collection("user_watch_history").deleteMany({ userId: _id }),
        // FUTURO:
        // db.collection("group_members").deleteMany({ userId: _id })
    ]);
}
