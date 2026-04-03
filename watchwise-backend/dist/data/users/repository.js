"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getUserByUsername = getUserByUsername;
exports.getUsersByUsernamePrefix = getUsersByUsernamePrefix;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUserAndData = deleteUserAndData;
// watchwise-backend/src/data/users/repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
function toUser(row) {
    return {
        id: row.id,
        username: row.username,
        avatar: row.avatar,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
async function getUserById(id) {
    const db = (0, db_1.getDb)();
    const rows = await db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
    return rows[0] ? toUser(rows[0]) : null;
}
async function getUserByUsername(username) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.username, username))
        .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
}
async function getUsersByUsernamePrefix(prefix) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.like)(schema_1.users.username, `${prefix}%`))
        .limit(20);
    return rows.map(toUser);
}
async function createUser(data) {
    const db = (0, db_1.getDb)();
    const now = new Date();
    try {
        const rows = await db
            .insert(schema_1.users)
            .values({
            id: data.id,
            username: data.username,
            avatar: data.avatar,
            createdAt: now,
            updatedAt: now,
        })
            .returning();
        return toUser(rows[0]);
    }
    catch (err) {
        // PostgreSQL unique violation code
        if (err.code === "23505" && err.constraint_name?.includes("username")) {
            throw new Error("USERNAME_ALREADY_EXISTS");
        }
        throw err;
    }
}
async function updateUser(userId, data) {
    const db = (0, db_1.getDb)();
    await db
        .update(schema_1.users)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
async function deleteUserAndData(userId) {
    const db = (0, db_1.getDb)();
    // Le FK con ON DELETE CASCADE gestiscono automaticamente i record correlati
    await db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
