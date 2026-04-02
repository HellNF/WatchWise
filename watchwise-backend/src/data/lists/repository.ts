// watchwise-backend/src/data/lists/repository.ts
import { eq, desc, and, asc } from "drizzle-orm";
import { getDb } from "../../db";
import { userLists, userListItems } from "../../db/schema";
import { UserList, UserListItem } from "./types";

const DEFAULT_LISTS = [
  { name: "watching list", slug: "watching-list" },
  { name: "favourites", slug: "favourites" },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureDefaultLists(userId: string): Promise<void> {
  const db = getDb();
  const now = new Date();

  for (const list of DEFAULT_LISTS) {
    const existing = await db
      .select()
      .from(userLists)
      .where(and(eq(userLists.userId, userId), eq(userLists.slug, list.slug)))
      .limit(1);

    if (!existing.length) {
      await db.insert(userLists).values({
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

export async function getUserLists(userId: string): Promise<UserList[]> {
  await ensureDefaultLists(userId);
  const db = getDb();
  return db
    .select()
    .from(userLists)
    .where(eq(userLists.userId, userId))
    .orderBy(desc(userLists.isDefault), asc(userLists.name));
}

export async function createUserList(userId: string, name: string): Promise<UserList> {
  const slug = slugify(name);
  if (!slug) throw new Error("Invalid list name");
  const db = getDb();
  const now = new Date();
  const rows = await db
    .insert(userLists)
    .values({ userId, name, slug, isDefault: false, createdAt: now, updatedAt: now })
    .returning();
  return rows[0];
}

export async function getUserListById(userId: string, listId: string): Promise<UserList | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.id, listId), eq(userLists.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserListBySlug(userId: string, slug: string): Promise<UserList | null> {
  await ensureDefaultLists(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.userId, userId), eq(userLists.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getListItems(userId: string, listId: string): Promise<UserListItem[]> {
  const db = getDb();
  return db
    .select()
    .from(userListItems)
    .where(
      and(eq(userListItems.listId, listId), eq(userListItems.userId, userId))
    )
    .orderBy(desc(userListItems.addedAt));
}

export async function getListItemsBySlug(
  userId: string,
  slug: string
): Promise<UserListItem[]> {
  const list = await getUserListBySlug(userId, slug);
  if (!list) return [];
  return getListItems(userId, list.id);
}

export async function addListItem(
  userId: string,
  listId: string,
  movieId: string
): Promise<{ created: boolean }> {
  const db = getDb();
  const existing = await db
    .select()
    .from(userListItems)
    .where(
      and(
        eq(userListItems.userId, userId),
        eq(userListItems.listId, listId),
        eq(userListItems.movieId, movieId)
      )
    )
    .limit(1);

  if (existing.length) return { created: false };

  await db.insert(userListItems).values({
    userId,
    listId,
    movieId,
    addedAt: new Date(),
  });
  return { created: true };
}

export async function removeListItem(
  userId: string,
  listId: string,
  movieId: string
): Promise<void> {
  const db = getDb();
  await db
    .delete(userListItems)
    .where(
      and(
        eq(userListItems.userId, userId),
        eq(userListItems.listId, listId),
        eq(userListItems.movieId, movieId)
      )
    );
}

export async function deleteUserList(userId: string, listId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userListItems)
    .where(
      and(eq(userListItems.userId, userId), eq(userListItems.listId, listId))
    );
  await db
    .delete(userLists)
    .where(
      and(
        eq(userLists.id, listId),
        eq(userLists.userId, userId),
        eq(userLists.isDefault, false)
      )
    );
}
