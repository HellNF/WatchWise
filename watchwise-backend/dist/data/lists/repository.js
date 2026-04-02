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
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../../config/mongodb");
const LISTS_COLLECTION = "user_lists";
const ITEMS_COLLECTION = "user_list_items";
const DEFAULT_LISTS = [
    { name: "watching list", slug: "watching-list" },
    { name: "favourites", slug: "favourites" }
];
function listsCollection() {
    return (0, mongodb_2.getDb)().collection(LISTS_COLLECTION);
}
function itemsCollection() {
    return (0, mongodb_2.getDb)().collection(ITEMS_COLLECTION);
}
function toObjectId(id) {
    return new mongodb_1.ObjectId(id);
}
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
    const userObjectId = toObjectId(userId);
    const now = new Date();
    await Promise.all(DEFAULT_LISTS.map((list) => listsCollection().updateOne({ userId: userObjectId, slug: list.slug }, {
        $setOnInsert: {
            _id: new mongodb_1.ObjectId(),
            userId: userObjectId,
            name: list.name,
            slug: list.slug,
            isDefault: true,
            createdAt: now,
            updatedAt: now
        }
    }, { upsert: true })));
}
async function getUserLists(userId) {
    await ensureDefaultLists(userId);
    return listsCollection()
        .find({ userId: toObjectId(userId) })
        .sort({ isDefault: -1, name: 1 })
        .toArray();
}
async function createUserList(userId, name) {
    const slug = slugify(name);
    if (!slug) {
        throw new Error("Invalid list name");
    }
    const now = new Date();
    const document = {
        _id: new mongodb_1.ObjectId(),
        userId: toObjectId(userId),
        name,
        slug,
        isDefault: false,
        createdAt: now,
        updatedAt: now
    };
    await listsCollection().insertOne(document);
    return document;
}
async function getUserListById(userId, listId) {
    return listsCollection().findOne({
        _id: toObjectId(listId),
        userId: toObjectId(userId)
    });
}
async function getUserListBySlug(userId, slug) {
    await ensureDefaultLists(userId);
    return listsCollection().findOne({
        userId: toObjectId(userId),
        slug
    });
}
async function getListItems(userId, listId) {
    return itemsCollection()
        .find({
        userId: toObjectId(userId),
        listId: toObjectId(listId)
    })
        .sort({ addedAt: -1 })
        .toArray();
}
async function getListItemsBySlug(userId, slug) {
    const list = await getUserListBySlug(userId, slug);
    if (!list)
        return [];
    return getListItems(userId, list._id.toString());
}
async function addListItem(userId, listId, movieId) {
    const now = new Date();
    const result = await itemsCollection().updateOne({
        userId: toObjectId(userId),
        listId: toObjectId(listId),
        movieId
    }, {
        $setOnInsert: {
            _id: new mongodb_1.ObjectId(),
            userId: toObjectId(userId),
            listId: toObjectId(listId),
            movieId,
            addedAt: now
        }
    }, { upsert: true });
    return { created: Boolean(result.upsertedId) };
}
async function removeListItem(userId, listId, movieId) {
    await itemsCollection().deleteOne({
        userId: toObjectId(userId),
        listId: toObjectId(listId),
        movieId
    });
}
async function deleteUserList(userId, listId) {
    await itemsCollection().deleteMany({
        userId: toObjectId(userId),
        listId: toObjectId(listId)
    });
    await listsCollection().deleteOne({
        _id: toObjectId(listId),
        userId: toObjectId(userId),
        isDefault: { $ne: true }
    });
}
