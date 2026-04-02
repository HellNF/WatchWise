// watchwise-backend/src/data/users/repository.ts
import { eq, like } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { CreateUserInput, UpdateUserInput, User } from "./types";

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUsersByUsernamePrefix(prefix: string): Promise<User[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(like(users.username, `${prefix}%`))
    .limit(20);
  return rows.map(toUser);
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const db = getDb();
  const now = new Date();
  try {
    const rows = await db
      .insert(users)
      .values({
        id: data.id,
        username: data.username,
        avatar: data.avatar,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return toUser(rows[0]);
  } catch (err: any) {
    // PostgreSQL unique violation code
    if (err.code === "23505" && err.constraint_name?.includes("username")) {
      throw new Error("USERNAME_ALREADY_EXISTS");
    }
    throw err;
  }
}

export async function updateUser(userId: string, data: UpdateUserInput): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function deleteUserAndData(userId: string): Promise<void> {
  const db = getDb();
  // Le FK con ON DELETE CASCADE gestiscono automaticamente i record correlati
  await db.delete(users).where(eq(users.id, userId));
}
