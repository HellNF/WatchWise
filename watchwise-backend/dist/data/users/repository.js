"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getUserByEmail = getUserByEmail;
exports.getUserByOAuth = getUserByOAuth;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.linkOAuthToUser = linkOAuthToUser;
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
async function getUserByOAuth(oauthProvider, oauthId) {
    return collection().findOne({ oauthProvider, oauthId });
}
async function createUser(data) {
    try {
        const result = await collection().insertOne(data);
        return { _id: result.insertedId, ...data };
    }
    catch (err) {
        if (err.code === 11000 && err.keyPattern?.username) {
            throw new Error("USERNAME_ALREADY_EXISTS");
        }
        throw err;
    }
}
async function updateUser(userId, data) {
    await collection().updateOne({ _id: new mongodb_1.ObjectId(userId) }, {
        $set: {
            ...data,
            updatedAt: new Date()
        }
    });
}
async function linkOAuthToUser(userId, oauthProvider, oauthId) {
    await collection().updateOne({ _id: new mongodb_1.ObjectId(userId) }, {
        $set: {
            authProvider: "oauth",
            oauthProvider,
            oauthId,
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
