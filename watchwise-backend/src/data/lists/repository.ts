import { ObjectId } from "mongodb";
import { getDb } from "../../config/mongodb";
import { UserList, UserListItem } from "./types";

const LISTS_COLLECTION = "user_lists";
const ITEMS_COLLECTION = "user_list_items";

const DEFAULT_LISTS = [
  { name: "watching list", slug: "watching-list" },
  { name: "favourites", slug: "favourites" }
];

function listsCollection() {
  return getDb().collection<UserList>(LISTS_COLLECTION);
}

function itemsCollection() {
  return getDb().collection<UserListItem>(ITEMS_COLLECTION);
}

function toObjectId(id: string) {
  return new ObjectId(id);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureDefaultLists(userId: string) {
  const userObjectId = toObjectId(userId);
  const now = new Date();

  await Promise.all(
    DEFAULT_LISTS.map((list) =>
      listsCollection().updateOne(
        { userId: userObjectId, slug: list.slug },
        {
          $setOnInsert: {
            _id: new ObjectId(),
            userId: userObjectId,
            name: list.name,
            slug: list.slug,
            isDefault: true,
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      )
    )
  );
}

export async function getUserLists(userId: string) {
  await ensureDefaultLists(userId);
  return listsCollection()
    .find({ userId: toObjectId(userId) })
    .sort({ isDefault: -1, name: 1 })
    .toArray();
}

export async function createUserList(userId: string, name: string) {
  const slug = slugify(name);
  if (!slug) {
    throw new Error("Invalid list name");
  }

  const now = new Date();
  const document: UserList = {
    _id: new ObjectId(),
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

export async function getUserListById(userId: string, listId: string) {
  return listsCollection().findOne({
    _id: toObjectId(listId),
    userId: toObjectId(userId)
  });
}

export async function getUserListBySlug(userId: string, slug: string) {
  await ensureDefaultLists(userId);
  return listsCollection().findOne({
    userId: toObjectId(userId),
    slug
  });
}

export async function getListItems(userId: string, listId: string) {
  return itemsCollection()
    .find({
      userId: toObjectId(userId),
      listId: toObjectId(listId)
    })
    .sort({ addedAt: -1 })
    .toArray();
}

export async function getListItemsBySlug(userId: string, slug: string) {
  const list = await getUserListBySlug(userId, slug);
  if (!list) return [];
  return getListItems(userId, list._id.toString());
}

export async function addListItem(
  userId: string,
  listId: string,
  movieId: string
) {
  const now = new Date();
  const result = await itemsCollection().updateOne(
    {
      userId: toObjectId(userId),
      listId: toObjectId(listId),
      movieId
    },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId: toObjectId(userId),
        listId: toObjectId(listId),
        movieId,
        addedAt: now
      }
    },
    { upsert: true }
  );

  return { created: Boolean(result.upsertedId) };
}

export async function removeListItem(
  userId: string,
  listId: string,
  movieId: string
) {
  await itemsCollection().deleteOne({
    userId: toObjectId(userId),
    listId: toObjectId(listId),
    movieId
  });
}

export async function deleteUserList(userId: string, listId: string) {
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
