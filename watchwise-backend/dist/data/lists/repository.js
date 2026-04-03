"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultLists = ensureDefaultLists;
exports.getUserLists = getUserLists;
exports.createUserList = createUserList;
exports.getUserListById = getUserListById;
exports.getUserListBySlug = getUserListBySlug;
exports.getListItems = getListItems;
exports.getListItemsBySlug = getListItemsBySlug;
exports.addListItem = addListItem;
exports.removeListItem = removeListItem;
exports.deleteUserList = deleteUserList;
// watchwise-backend/src/data/lists/repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const DEFAULT_LISTS = [
    { name: "watching list", slug: "watching-list" },
    { name: "favourites", slug: "favourites" },
];
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
async function ensureDefaultLists(userId) {
    const db = (0, db_1.getDb)();
    const now = new Date();
    for (const list of DEFAULT_LISTS) {
        const existing = await db
            .select()
            .from(schema_1.userLists)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userLists.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userLists.slug, list.slug)))
            .limit(1);
        if (!existing.length) {
            await db.insert(schema_1.userLists).values({
                userId,
                name: list.name,
                slug: list.slug,
                isDefault: true,
                createdAt: now,
                updatedAt: now,
            });
        }
    }
}
async function getUserLists(userId) {
    await ensureDefaultLists(userId);
    const db = (0, db_1.getDb)();
    return db
        .select()
        .from(schema_1.userLists)
        .where((0, drizzle_orm_1.eq)(schema_1.userLists.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userLists.isDefault), (0, drizzle_orm_1.asc)(schema_1.userLists.name));
}
async function createUserList(userId, name) {
    const slug = slugify(name);
    if (!slug)
        throw new Error("Invalid list name");
    const db = (0, db_1.getDb)();
    const now = new Date();
    const rows = await db
        .insert(schema_1.userLists)
        .values({ userId, name, slug, isDefault: false, createdAt: now, updatedAt: now })
        .returning();
    return rows[0];
}
async function getUserListById(userId, listId) {
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userLists)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userLists.id, listId), (0, drizzle_orm_1.eq)(schema_1.userLists.userId, userId)))
        .limit(1);
    return rows[0] ?? null;
}
async function getUserListBySlug(userId, slug) {
    await ensureDefaultLists(userId);
    const db = (0, db_1.getDb)();
    const rows = await db
        .select()
        .from(schema_1.userLists)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userLists.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userLists.slug, slug)))
        .limit(1);
    return rows[0] ?? null;
}
async function getListItems(userId, listId) {
    const db = (0, db_1.getDb)();
    return db
        .select()
        .from(schema_1.userListItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userListItems.listId, listId), (0, drizzle_orm_1.eq)(schema_1.userListItems.userId, userId)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userListItems.addedAt));
}
async function getListItemsBySlug(userId, slug) {
    const list = await getUserListBySlug(userId, slug);
    if (!list)
        return [];
    return getListItems(userId, list.id);
}
async function addListItem(userId, listId, movieId) {
    const db = (0, db_1.getDb)();
    const existing = await db
        .select()
        .from(schema_1.userListItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userListItems.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userListItems.listId, listId), (0, drizzle_orm_1.eq)(schema_1.userListItems.movieId, movieId)))
        .limit(1);
    if (existing.length)
        return { created: false };
    await db.insert(schema_1.userListItems).values({
        userId,
        listId,
        movieId,
        addedAt: new Date(),
    });
    return { created: true };
}
async function removeListItem(userId, listId, movieId) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.userListItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userListItems.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userListItems.listId, listId), (0, drizzle_orm_1.eq)(schema_1.userListItems.movieId, movieId)));
}
async function deleteUserList(userId, listId) {
    const db = (0, db_1.getDb)();
    await db
        .delete(schema_1.userListItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userListItems.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userListItems.listId, listId)));
    await db
        .delete(schema_1.userLists)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userLists.id, listId), (0, drizzle_orm_1.eq)(schema_1.userLists.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userLists.isDefault, false)));
}
