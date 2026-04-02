# WatchWise: Supabase + Vercel Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate WatchWise from MongoDB + custom JWT OAuth + local dev to Supabase PostgreSQL + Supabase Auth + Vercel deployment, with zero changes to the frontend API call layer.

**Architecture:** Fastify backend stays intact and deploys as a Vercel Function. Drizzle ORM replaces the MongoDB driver; repository interfaces stay identical so routes don't change. Supabase Auth replaces the custom OAuth flow; the backend verifies Supabase JWTs via JOSE + JWKS endpoint.

**Tech Stack:** Fastify, Drizzle ORM, `postgres` driver, Supabase Auth, `@supabase/supabase-js` (frontend only), Vercel Functions, Next.js App Router.

---

## Pre-requisiti (manuali, prima di iniziare)

- [ ] Crea il branch di migrazione:
  ```bash
  git checkout -b feat/supabase-migration
  git push -u origin feat/supabase-migration
  ```
- [ ] Crea un nuovo progetto Supabase su [supabase.com](https://supabase.com)
- [ ] Abilita Google OAuth e GitHub OAuth in Supabase → Authentication → Providers
- [ ] Crea due progetti Vercel puntando allo stesso repo:
  - `watchwise-backend` → Root Directory: `watchwise-backend` → Production Branch: `main`
  - `watchwise-frontend` → Root Directory: `watchwise-frontend` → Production Branch: `main`
- [ ] I push su `feat/supabase-migration` genereranno automaticamente Preview Deployments su Vercel — testa lì prima di mergiare su `main`

---

## File Map

### Backend — creati
- `watchwise-backend/src/index.ts` — entrypoint Vercel (rinominato da `api.ts`)
- `watchwise-backend/src/db/schema.ts` — schema Drizzle completo
- `watchwise-backend/src/db/index.ts` — connessione PostgreSQL
- `watchwise-backend/drizzle.config.ts` — configurazione migrazioni

### Backend — modificati
- `watchwise-backend/src/auth/tokens.ts` — solo JWKS verification, rimossa firma JWT
- `watchwise-backend/src/auth/routes.ts` — sostituito OAuth custom con `POST /api/auth/session`
- `watchwise-backend/src/middleware/auth.ts` — usa nuova `verifyAccessToken`
- `watchwise-backend/src/data/users/types.ts` — rimosso ObjectId/email/oauth fields
- `watchwise-backend/src/data/users/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/data/users/routes.ts` — rimosso `by-email`, rimosso ObjectId.isValid
- `watchwise-backend/src/data/preferences/types.ts` — rimosso ObjectId
- `watchwise-backend/src/data/preferences/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/data/watch-history/types.ts` — rimosso ObjectId
- `watchwise-backend/src/data/watch-history/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/data/lists/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/data/groups/types.ts` — rimosso ObjectId
- `watchwise-backend/src/data/groups/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/data/group-sessions/types.ts` — rimosso ObjectId
- `watchwise-backend/src/data/group-sessions/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/data/group-feedback/repository.ts` — riscritto con Drizzle
- `watchwise-backend/src/pcs/recommend-user/preferences.ts` — rimosso `new ObjectId()`
- `watchwise-backend/src/pcs/recommend-user/candidates.ts` — rimosso `new ObjectId()`
- `watchwise-backend/package.json` — aggiunti drizzle-orm/postgres, rimosso mongodb

### Backend — eliminati
- `watchwise-backend/src/config/mongodb.ts`

### Frontend — modificati
- `watchwise-frontend/lib/auth.ts` — riscritto per Supabase Auth
- `watchwise-frontend/lib/api.ts` — `getStoredToken()` diventa async
- `watchwise-frontend/app/auth/callback/page.tsx` — riscritto per PKCE flow Supabase
- `watchwise-frontend/package.json` — aggiunto `@supabase/supabase-js`

---

## Task 1: Installazione dipendenze e rinomina entrypoint

**Files:**
- Modify: `watchwise-backend/package.json`
- Rename: `watchwise-backend/src/api.ts` → `watchwise-backend/src/index.ts`
- Modify: `watchwise-frontend/package.json`

- [ ] **Step 1.1: Installa dipendenze backend**

```bash
cd watchwise-backend
npm install drizzle-orm postgres
npm install --save-dev drizzle-kit
npm uninstall mongodb
```

- [ ] **Step 1.2: Installa dipendenze frontend**

```bash
cd watchwise-frontend
npm install @supabase/supabase-js
```

- [ ] **Step 1.3: Rinomina l'entrypoint**

```bash
cd watchwise-backend
mv src/api.ts src/index.ts
```

- [ ] **Step 1.4: Aggiorna tsconfig.json del backend se referenzia api.ts**

Apri `watchwise-backend/tsconfig.json`. Se c'è `"rootDir"` o un riferimento esplicito a `src/api.ts`, non è necessario cambiare nulla — il file è solo rinominato. Se invece c'è un `paths` o `include` esplicito, aggiornalo.

- [ ] **Step 1.5: Verifica che il backend si compili**

```bash
cd watchwise-backend
npm run build
```

Output atteso: nessun errore TypeScript (ci saranno errori su `mongodb` non trovato — li risolveremo nei task successivi).

- [ ] **Step 1.6: Commit**

```bash
git add watchwise-backend/src/index.ts watchwise-backend/package.json watchwise-backend/package-lock.json watchwise-frontend/package.json watchwise-frontend/package-lock.json
git commit -m "chore: rename entrypoint to index.ts, swap mongodb→drizzle, add supabase-js"
```

---

## Task 2: Connessione DB con Drizzle

**Files:**
- Create: `watchwise-backend/src/db/index.ts`
- Create: `watchwise-backend/drizzle.config.ts`
- Delete: `watchwise-backend/src/config/mongodb.ts`

- [ ] **Step 2.1: Crea `src/db/index.ts`**

```typescript
// watchwise-backend/src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  const client = postgres(connectionString);
  _db = drizzle(client, { schema });
  return _db;
}
```

- [ ] **Step 2.2: Crea `drizzle.config.ts`**

```typescript
// watchwise-backend/drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 2.3: Aggiungi `DATABASE_URL` al `.env` locale del backend**

Vai su Supabase → Project Settings → Database → Connection string → URI (mode: Transaction).

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service role key da Supabase → Settings → API]
NODE_ENV=development
```

- [ ] **Step 2.4: Elimina `src/config/mongodb.ts`**

```bash
rm watchwise-backend/src/config/mongodb.ts
```

- [ ] **Step 2.5: Commit**

```bash
git add watchwise-backend/src/db/index.ts watchwise-backend/drizzle.config.ts watchwise-backend/.env
git commit -m "feat: add Drizzle DB connection, remove MongoDB config"
```

---

## Task 3: Schema Drizzle

**Files:**
- Create: `watchwise-backend/src/db/schema.ts`

- [ ] **Step 3.1: Crea lo schema completo**

```typescript
// watchwise-backend/src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // = Supabase Auth user UUID
  username: text("username").notNull().unique(),
  avatar: text("avatar").notNull().default("avatar_01"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  hostId: uuid("host_id").references(() => users.id, { onDelete: "set null" }),
  joinCode: text("join_code"),
  joinCodeExpiresAt: timestamp("join_code_expires_at"),
  status: text("status").default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
  })
);

export const userLists = pgTable("user_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userListItems = pgTable("user_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  listId: uuid("list_id")
    .references(() => userLists.id, { onDelete: "cascade" })
    .notNull(),
  movieId: text("movie_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const userPreferenceEvents = pgTable("user_preference_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  weight: real("weight").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userWatchHistory = pgTable("user_watch_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  movieId: text("movie_id").notNull(),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
  rating: real("rating"),
  completed: boolean("completed").notNull().default(false),
});

export const groupSessions = pgTable("group_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  context: jsonb("context").notNull().default("{}"),
  selectedMovieId: text("selected_movie_id"),
  softStartAt: timestamp("soft_start_at"),
  softStartTimeoutMinutes: integer("soft_start_timeout_minutes"),
  startedAt: timestamp("started_at"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupFeedbackEvents = pgTable("group_feedback_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => groupSessions.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  movieId: text("movie_id").notNull(),
  rating: real("rating"),
  liked: boolean("liked"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 3.2: Verifica che lo schema compili**

```bash
cd watchwise-backend
npx tsc --noEmit
```

Output atteso: nessun errore sul file schema.ts (ci saranno errori sugli altri file che ancora usano mongodb).

- [ ] **Step 3.3: Commit**

```bash
git add watchwise-backend/src/db/schema.ts
git commit -m "feat: add Drizzle schema for all tables"
```

---

## Task 4: Migrazione iniziale su Supabase

**Files:**
- Create: `watchwise-backend/drizzle/` (generato automaticamente)

- [ ] **Step 4.1: Genera la migrazione SQL**

```bash
cd watchwise-backend
npx drizzle-kit generate
```

Output atteso: file SQL in `watchwise-backend/drizzle/0000_initial.sql` (nome variabile).

- [ ] **Step 4.2: Esegui la migrazione su Supabase**

```bash
cd watchwise-backend
npx drizzle-kit migrate
```

Output atteso: `All migrations applied successfully`

In alternativa, vai su Supabase → SQL Editor e incolla il contenuto del file SQL generato in `drizzle/`.

- [ ] **Step 4.3: Verifica su Supabase**

Vai su Supabase → Table Editor. Dovresti vedere le tabelle: `users`, `groups`, `group_members`, `user_lists`, `user_list_items`, `user_preference_events`, `user_watch_history`, `group_sessions`, `group_feedback_events`.

- [ ] **Step 4.4: Commit**

```bash
git add watchwise-backend/drizzle/
git commit -m "feat: add initial Drizzle migration"
```

---

## Task 5: Repository utenti

**Files:**
- Modify: `watchwise-backend/src/data/users/types.ts`
- Modify: `watchwise-backend/src/data/users/repository.ts`
- Modify: `watchwise-backend/src/data/users/routes.ts`

- [ ] **Step 5.1: Aggiorna `types.ts`**

```typescript
// watchwise-backend/src/data/users/types.ts

export interface User {
  id: string;           // UUID da Supabase Auth
  username: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateUserInput = Partial<Pick<User, "username" | "avatar">>;
export type CreateUserInput = Pick<User, "id" | "username" | "avatar">;
```

- [ ] **Step 5.2: Riscrivi `repository.ts`**

```typescript
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
  // Cascades handle related records via FK ON DELETE CASCADE
  await db.delete(users).where(eq(users.id, userId));
}
```

- [ ] **Step 5.3: Aggiorna `routes.ts`**

```typescript
// watchwise-backend/src/data/users/routes.ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth";
import { getUserById, updateUser, deleteUserAndData } from "./repository";
import { AppError } from "../../common/errors";

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const user = await getUserById(req.userId!);
      if (!user) throw new AppError("NOT_FOUND", 404, "User not found");
      return { id: user.id, username: user.username, avatar: user.avatar };
    }
  );

  app.get(
    "/api/users/:id",
    { preHandler: [requireAuth] },
    async (req) => {
      const { id } = req.params as { id: string };
      const user = await getUserById(id);
      if (!user) throw new AppError("NOT_FOUND", 404, "User not found");
      return { id: user.id, username: user.username, avatar: user.avatar };
    }
  );

  app.patch(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = req.body as { username?: string; avatar?: string };
      await updateUser(req.userId!, { username: body.username, avatar: body.avatar });
      return { ok: true };
    }
  );

  app.delete(
    "/api/users/me",
    { preHandler: [requireAuth] },
    async (req) => {
      await deleteUserAndData(req.userId!);
      return { ok: true };
    }
  );
}
```

- [ ] **Step 5.4: Verifica compilazione**

```bash
cd watchwise-backend
npx tsc --noEmit 2>&1 | grep "users/"
```

Output atteso: nessun errore nei file della cartella `users/`.

- [ ] **Step 5.5: Commit**

```bash
git add watchwise-backend/src/data/users/
git commit -m "feat: rewrite users repository and routes with Drizzle"
```

---

## Task 6: Repository preferenze

**Files:**
- Modify: `watchwise-backend/src/data/preferences/types.ts`
- Modify: `watchwise-backend/src/data/preferences/repository.ts`

- [ ] **Step 6.1: Aggiorna `types.ts`**

```typescript
// watchwise-backend/src/data/preferences/types.ts

export type PreferenceType =
  | "genre"
  | "actor"
  | "director"
  | "mood"
  | "energy"
  | "company"
  | "duration"
  | "novelty"
  | "movie";

export type PreferenceSource =
  | "questionnaire"
  | "watch"
  | "explicit"
  | "implicit"
  | "feedback";

export interface UserPreferenceEvent {
  id: string;
  userId: string;
  type: PreferenceType;
  value: string;
  weight: number;
  source: PreferenceSource;
  createdAt: Date;
}
```

- [ ] **Step 6.2: Riscrivi `repository.ts`**

```typescript
// watchwise-backend/src/data/preferences/repository.ts
import { eq, desc, and, gte } from "drizzle-orm";
import { getDb } from "../../db";
import { userPreferenceEvents } from "../../db/schema";
import { UserPreferenceEvent, PreferenceSource } from "./types";

type InsertPreferenceEvent = Omit<UserPreferenceEvent, "id" | "userId"> & {
  userId: string;
};

export async function insertPreferenceEvent(event: InsertPreferenceEvent): Promise<void> {
  const db = getDb();
  await db.insert(userPreferenceEvents).values({
    userId: event.userId,
    type: event.type,
    value: event.value,
    weight: event.weight,
    source: event.source,
    createdAt: event.createdAt ?? new Date(),
  });
}

export async function insertPreferenceEvents(
  userId: string,
  events: Omit<UserPreferenceEvent, "id" | "userId">[]
): Promise<void> {
  if (!events.length) return;
  const db = getDb();
  await db.insert(userPreferenceEvents).values(
    events.map((e) => ({
      userId,
      type: e.type,
      value: e.value,
      weight: e.weight,
      source: e.source,
      createdAt: e.createdAt ?? new Date(),
    }))
  );
}

export async function getUserPreferences(userId: string): Promise<UserPreferenceEvent[]> {
  const db = getDb();
  return db
    .select()
    .from(userPreferenceEvents)
    .where(eq(userPreferenceEvents.userId, userId))
    .orderBy(desc(userPreferenceEvents.createdAt));
}

export async function getUserPreferenceEvents(
  userId: string,
  limit = 300
): Promise<UserPreferenceEvent[]> {
  const db = getDb();
  return db
    .select()
    .from(userPreferenceEvents)
    .where(eq(userPreferenceEvents.userId, userId))
    .orderBy(desc(userPreferenceEvents.createdAt))
    .limit(limit);
}

export async function getLatestQuestionnaireEvent(
  userId: string
): Promise<UserPreferenceEvent | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.userId, userId),
        eq(userPreferenceEvents.source, "questionnaire")
      )
    )
    .orderBy(desc(userPreferenceEvents.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function deletePreferenceEvent(userId: string, eventId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.id, eventId),
        eq(userPreferenceEvents.userId, userId)
      )
    );
}

export async function deleteRecentPreferencesBySource(
  userId: string,
  source: string,
  since: Date
): Promise<void> {
  const db = getDb();
  await db
    .delete(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.userId, userId),
        eq(userPreferenceEvents.source, source),
        gte(userPreferenceEvents.createdAt, since)
      )
    );
}

export async function deletePreferencesBySource(
  userId: string,
  source: string
): Promise<void> {
  const db = getDb();
  await db
    .delete(userPreferenceEvents)
    .where(
      and(
        eq(userPreferenceEvents.userId, userId),
        eq(userPreferenceEvents.source, source)
      )
    );
}
```

- [ ] **Step 6.3: Verifica compilazione**

```bash
cd watchwise-backend
npx tsc --noEmit 2>&1 | grep "preferences/"
```

Output atteso: nessun errore.

- [ ] **Step 6.4: Commit**

```bash
git add watchwise-backend/src/data/preferences/
git commit -m "feat: rewrite preferences repository with Drizzle"
```

---

## Task 7: Repository watch-history

**Files:**
- Modify: `watchwise-backend/src/data/watch-history/types.ts`
- Modify: `watchwise-backend/src/data/watch-history/repository.ts`

- [ ] **Step 7.1: Aggiorna `types.ts`**

```typescript
// watchwise-backend/src/data/watch-history/types.ts

export interface WatchHistoryEntry {
  id: string;
  userId: string;
  movieId: string;   // "tmdb:<id>"
  watchedAt: Date;
  rating?: number;
  completed: boolean;
}

export type NewWatchHistoryEntry = Omit<WatchHistoryEntry, "id">;
```

- [ ] **Step 7.2: Riscrivi `repository.ts`**

```typescript
// watchwise-backend/src/data/watch-history/repository.ts
import { eq, desc, gte, and } from "drizzle-orm";
import { getDb } from "../../db";
import { userWatchHistory } from "../../db/schema";
import { WatchHistoryEntry, NewWatchHistoryEntry } from "./types";

type UpdateWatchHistoryData = Partial<Omit<WatchHistoryEntry, "id" | "userId">>;

export async function insertWatchHistory(entry: NewWatchHistoryEntry): Promise<void> {
  const db = getDb();
  await db.insert(userWatchHistory).values({
    userId: entry.userId,
    movieId: entry.movieId,
    watchedAt: entry.watchedAt ?? new Date(),
    rating: entry.rating,
    completed: entry.completed,
  });
}

export async function getWatchHistory(userId: string): Promise<WatchHistoryEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(userWatchHistory)
    .where(eq(userWatchHistory.userId, userId))
    .orderBy(desc(userWatchHistory.watchedAt));
}

export async function getWatchHistoryEntries(
  userId: string,
  limit = 200
): Promise<WatchHistoryEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(userWatchHistory)
    .where(eq(userWatchHistory.userId, userId))
    .orderBy(desc(userWatchHistory.watchedAt))
    .limit(limit);
}

export async function getRecentlyWatchedMovies(
  userId: string,
  excludeDays: number
): Promise<string[]> {
  const db = getDb();
  const since = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ movieId: userWatchHistory.movieId })
    .from(userWatchHistory)
    .where(
      and(
        eq(userWatchHistory.userId, userId),
        gte(userWatchHistory.watchedAt, since)
      )
    );
  return rows.map((r) => r.movieId);
}

export async function updateWatchHistory(
  userId: string,
  id: string,
  data: UpdateWatchHistoryData
): Promise<void> {
  const db = getDb();
  await db
    .update(userWatchHistory)
    .set(data)
    .where(
      and(
        eq(userWatchHistory.id, id),
        eq(userWatchHistory.userId, userId)
      )
    );
}

export async function deleteWatchHistory(userId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userWatchHistory)
    .where(
      and(
        eq(userWatchHistory.id, id),
        eq(userWatchHistory.userId, userId)
      )
    );
}
```

- [ ] **Step 7.3: Commit**

```bash
git add watchwise-backend/src/data/watch-history/
git commit -m "feat: rewrite watch-history repository with Drizzle"
```

---

## Task 8: Repository liste

**Files:**
- Modify: `watchwise-backend/src/data/lists/types.ts`
- Modify: `watchwise-backend/src/data/lists/repository.ts`

- [ ] **Step 8.1: Aggiorna `types.ts`**

```typescript
// watchwise-backend/src/data/lists/types.ts

export interface UserList {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  id: string;
  userId: string;
  listId: string;
  movieId: string;
  addedAt: Date;
}
```

- [ ] **Step 8.2: Riscrivi `repository.ts`**

```typescript
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
```

- [ ] **Step 8.3: Commit**

```bash
git add watchwise-backend/src/data/lists/
git commit -m "feat: rewrite lists repository with Drizzle"
```

---

## Task 9: Repository gruppi, sessioni e feedback

**Files:**
- Modify: `watchwise-backend/src/data/groups/types.ts`
- Modify: `watchwise-backend/src/data/groups/repository.ts`
- Modify: `watchwise-backend/src/data/group-sessions/types.ts`
- Modify: `watchwise-backend/src/data/group-sessions/repository.ts`
- Modify: `watchwise-backend/src/data/group-feedback/repository.ts`

- [ ] **Step 9.1: Aggiorna `groups/types.ts`**

```typescript
// watchwise-backend/src/data/groups/types.ts

export interface Group {
  id: string;
  name: string;
  members: string[];   // array di userId (derivato da group_members)
  hostId?: string;
  joinCode?: string;
  joinCodeExpiresAt?: Date;
  status?: "open" | "locked" | "closed";
  createdAt: Date;
}
```

- [ ] **Step 9.2: Riscrivi `groups/repository.ts`**

```typescript
// watchwise-backend/src/data/groups/repository.ts
import { eq, and } from "drizzle-orm";
import { getDb } from "../../db";
import { groups, groupMembers } from "../../db/schema";
import { Group } from "./types";

async function attachMembers(groupRow: typeof groups.$inferSelect): Promise<Group> {
  const db = getDb();
  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupRow.id));

  return {
    id: groupRow.id,
    name: groupRow.name,
    hostId: groupRow.hostId ?? undefined,
    joinCode: groupRow.joinCode ?? undefined,
    joinCodeExpiresAt: groupRow.joinCodeExpiresAt ?? undefined,
    status: (groupRow.status as Group["status"]) ?? undefined,
    createdAt: groupRow.createdAt,
    members: members.map((m) => m.userId),
  };
}

export async function findGroupById(groupId: string): Promise<Group | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!rows[0]) return null;
  return attachMembers(rows[0]);
}

export async function findGroupsByMember(memberId: string): Promise<Group[]> {
  const db = getDb();
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, memberId));

  const result: Group[] = [];
  for (const { groupId } of memberRows) {
    const group = await findGroupById(groupId);
    if (group) result.push(group);
  }
  return result;
}

export async function findGroupByJoinCode(joinCode: string): Promise<Group | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.joinCode, joinCode))
    .limit(1);
  if (!rows[0]) return null;
  return attachMembers(rows[0]);
}

export async function createGroup(
  group: Omit<Group, "id" | "createdAt" | "members">
): Promise<Group> {
  const db = getDb();
  const rows = await db
    .insert(groups)
    .values({
      name: group.name,
      hostId: group.hostId,
      joinCode: group.joinCode,
      joinCodeExpiresAt: group.joinCodeExpiresAt,
      status: group.status ?? "open",
      createdAt: new Date(),
    })
    .returning();
  return { ...rows[0], members: [], status: rows[0].status as Group["status"] };
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!existing.length) {
    await db.insert(groupMembers).values({ groupId, userId });
  }
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  const remaining = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (!remaining.length) {
    await db.delete(groups).where(eq(groups.id, groupId));
  }
}

export async function setGroupHost(groupId: string, hostId?: string): Promise<void> {
  const db = getDb();
  await db
    .update(groups)
    .set({ hostId: hostId ?? null })
    .where(eq(groups.id, groupId));
}

export async function updateGroupJoinCode(
  groupId: string,
  joinCode: string,
  expiresAt: Date
): Promise<void> {
  const db = getDb();
  await db
    .update(groups)
    .set({ joinCode, joinCodeExpiresAt: expiresAt })
    .where(eq(groups.id, groupId));
}

export async function updateGroupStatus(
  groupId: string,
  status: "open" | "locked" | "closed"
): Promise<void> {
  const db = getDb();
  await db.update(groups).set({ status }).where(eq(groups.id, groupId));
}
```

- [ ] **Step 9.3: Aggiorna `group-sessions/types.ts`**

```typescript
// watchwise-backend/src/data/group-sessions/types.ts

export interface GroupSession {
  id: string;
  groupId: string;
  context: {
    mood?: string;
    maxDuration?: number;
    preferredGenres?: string[];
    excludedGenres?: string[];
  };
  createdAt: Date;
  selectedMovieId?: string;
  softStartAt?: Date;
  softStartTimeoutMinutes?: number;
  startedAt?: Date;
  status?: "pending" | "started";
}
```

- [ ] **Step 9.4: Riscrivi `group-sessions/repository.ts`**

```typescript
// watchwise-backend/src/data/group-sessions/repository.ts
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { groupSessions } from "../../db/schema";
import { GroupSession } from "./types";

function toSession(row: typeof groupSessions.$inferSelect): GroupSession {
  return {
    id: row.id,
    groupId: row.groupId,
    context: (row.context as GroupSession["context"]) ?? {},
    createdAt: row.createdAt,
    selectedMovieId: row.selectedMovieId ?? undefined,
    softStartAt: row.softStartAt ?? undefined,
    softStartTimeoutMinutes: row.softStartTimeoutMinutes ?? undefined,
    startedAt: row.startedAt ?? undefined,
    status: (row.status as GroupSession["status"]) ?? undefined,
  };
}

export async function createGroupSession(
  session: Omit<GroupSession, "id">
): Promise<GroupSession> {
  const db = getDb();
  const rows = await db
    .insert(groupSessions)
    .values({
      groupId: session.groupId,
      context: session.context,
      selectedMovieId: session.selectedMovieId,
      softStartAt: session.softStartAt,
      softStartTimeoutMinutes: session.softStartTimeoutMinutes,
      startedAt: session.startedAt,
      status: session.status ?? "pending",
      createdAt: new Date(),
    })
    .returning();
  return toSession(rows[0]);
}

export async function findGroupSessionById(sessionId: string): Promise<GroupSession | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.id, sessionId))
    .limit(1);
  return rows[0] ? toSession(rows[0]) : null;
}

export async function updateGroupSessionById(
  sessionId: string,
  data: Partial<Omit<GroupSession, "id" | "groupId">>
): Promise<void> {
  const db = getDb();
  await db
    .update(groupSessions)
    .set({
      context: data.context,
      selectedMovieId: data.selectedMovieId,
      softStartAt: data.softStartAt,
      softStartTimeoutMinutes: data.softStartTimeoutMinutes,
      startedAt: data.startedAt,
      status: data.status,
    })
    .where(eq(groupSessions.id, sessionId));
}
```

- [ ] **Step 9.5: Riscrivi `group-feedback/repository.ts`**

```typescript
// watchwise-backend/src/data/group-feedback/repository.ts
import { getDb } from "../../db";
import { groupFeedbackEvents } from "../../db/schema";
import { GroupFeedbackEvent } from "./types";

export async function addGroupFeedback(
  event: Omit<GroupFeedbackEvent, "id">
): Promise<void> {
  const db = getDb();
  await db.insert(groupFeedbackEvents).values({
    sessionId: event.sessionId,
    userId: event.userId,
    movieId: event.movieId,
    rating: event.rating,
    liked: event.liked,
    createdAt: event.createdAt ?? new Date(),
  });
}
```

- [ ] **Step 9.6: Aggiorna `group-feedback/types.ts` (rimuovi ObjectId)**

```typescript
// watchwise-backend/src/data/group-feedback/types.ts

export interface GroupFeedbackEvent {
  id: string;
  sessionId: string;
  userId: string;
  movieId: string;
  rating?: number;
  liked?: boolean;
  createdAt: Date;
}
```

- [ ] **Step 9.7: Verifica compilazione data layer**

```bash
cd watchwise-backend
npx tsc --noEmit 2>&1 | grep -E "(groups|sessions|feedback)/"
```

Output atteso: nessun errore.

- [ ] **Step 9.8: Commit**

```bash
git add watchwise-backend/src/data/groups/ watchwise-backend/src/data/group-sessions/ watchwise-backend/src/data/group-feedback/
git commit -m "feat: rewrite groups, sessions, feedback repositories with Drizzle"
```

---

## Task 10: Auth backend — verifica JWT Supabase e session endpoint

**Files:**
- Modify: `watchwise-backend/src/auth/tokens.ts`
- Modify: `watchwise-backend/src/auth/routes.ts`
- Modify: `watchwise-backend/src/middleware/auth.ts`
- Modify: `watchwise-backend/src/index.ts`

- [ ] **Step 10.1: Riscrivi `tokens.ts`**

```typescript
// watchwise-backend/src/auth/tokens.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AppError } from "../common/errors";

function getJwksUrl(): URL {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new AppError("INTERNAL_ERROR", 500, "Missing SUPABASE_URL");
  return new URL(`${url}/auth/v1/.well-known/jwks.json`);
}

// Singleton JWKS per evitare fetch ripetuti
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(getJwksUrl());
  return _jwks;
}

export async function verifyAccessToken(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, getJwks());
    if (!payload.sub) {
      throw new AppError("UNAUTHORIZED", 401, "Invalid token subject");
    }
    return payload.sub;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UNAUTHORIZED", 401, "Invalid or expired token");
  }
}
```

- [ ] **Step 10.2: Riscrivi `auth/routes.ts`**

```typescript
// watchwise-backend/src/auth/routes.ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import {
  getUserById,
  createUser,
  getUserByUsername,
  getUsersByUsernamePrefix,
} from "../data/users/repository";

async function suggestUsernames(base: string, n = 3): Promise<string[]> {
  const existing = await getUsersByUsernamePrefix(base);
  const taken = new Set(existing.map((u) => u.username));
  const suggestions: string[] = [];
  let i = 1;
  while (suggestions.length < n) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) suggestions.push(candidate);
    i++;
  }
  return suggestions;
}

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/session
   * Chiamato dal frontend dopo il login Supabase OAuth.
   * - Se l'utente esiste già nel nostro DB → restituisce il profilo
   * - Se è nuovo → crea il profilo con username suggerito (o scelto)
   * - Se username già in uso → 409 con suggerimenti
   *
   * Body: { email?: string; username?: string }
   * Il token Supabase va nell'header Authorization: Bearer <token>
   */
  app.post(
    "/api/auth/session",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const userId = req.userId!;

      // Utente già registrato → restituisce profilo
      const existing = await getUserById(userId);
      if (existing) {
        return reply.send({
          id: existing.id,
          username: existing.username,
          avatar: existing.avatar,
        });
      }

      // Nuovo utente
      const { email, username } = req.body as {
        email?: string;
        username?: string;
      };

      // Deriva username suggerito dall'email se non passato
      const suggested =
        username ||
        (email
          ? email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "")
          : "user");

      // Prova a creare con lo username suggerito/scelto
      try {
        const newUser = await createUser({
          id: userId,
          username: suggested,
          avatar: "avatar_01",
        });
        return reply.send({
          id: newUser.id,
          username: newUser.username,
          avatar: newUser.avatar,
        });
      } catch (err: any) {
        if (err.message === "USERNAME_ALREADY_EXISTS") {
          const suggestions = await suggestUsernames(suggested);
          return reply.status(409).send({
            code: "USERNAME_TAKEN",
            suggestions,
          });
        }
        throw err;
      }
    }
  );
}
```

- [ ] **Step 10.3: Aggiorna `middleware/auth.ts`**

```typescript
// watchwise-backend/src/middleware/auth.ts
import { FastifyRequest } from "fastify";
import { AppError } from "../common/errors";
import { verifyAccessToken } from "../auth/tokens";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(req: FastifyRequest) {
  if (process.env.NODE_ENV !== "production") {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader !== "Bearer dev") {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      if (token) {
        req.userId = await verifyAccessToken(token);
        return;
      }
    }
    req.userId = "00000000-0000-0000-0000-000000000001";
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError("UNAUTHORIZED", 401, "Missing Authorization header");
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    throw new AppError("UNAUTHORIZED", 401, "Invalid Authorization header");
  }

  req.userId = await verifyAccessToken(token);
}
```

Nota: il `userId` di dev è ora un UUID valido invece di ObjectId.

- [ ] **Step 10.4: Aggiorna `src/index.ts` (ex api.ts)**

Rimuovi le righe relative a MongoDB e all'import `authRoutes` del vecchio modulo. Il file finale:

```typescript
// watchwise-backend/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import { getDb } from "./db";

import { authRoutes } from "./auth/routes";
import { userRoutes } from "./data/users/routes";
import { pcsRoutes } from "./pcs/routes";
import { tmdbTestRoute } from "./adapters/tmdb/test-route";
import { preferenceRoutes } from "./data/preferences/routes";
import { watchHistoryRoutes } from "./data/watch-history/routes";
import { movieRoutes } from "./data/movies/routes";
import { listRoutes } from "./data/lists/routes";
import { groupRoutes } from "./data/groups/routes";
import { groupSessionRoutes } from "./data/group-sessions/routes";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "watchwise-backend" };
});

const start = async () => {
  try {
    // Inizializza connessione DB (lazy, ma verifica che la variabile ci sia)
    getDb();

    await app.register(cors, {
      origin: true,
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    });

    await authRoutes(app);
    await userRoutes(app);
    await pcsRoutes(app);
    await tmdbTestRoute(app);
    await preferenceRoutes(app);
    await watchHistoryRoutes(app);
    await movieRoutes(app);
    await listRoutes(app);
    await groupRoutes(app);
    await groupSessionRoutes(app);

    await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
    console.log("🚀 WatchWise backend running");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

- [ ] **Step 10.5: Verifica compilazione completa backend**

```bash
cd watchwise-backend
npx tsc --noEmit
```

Output atteso: zero errori.

- [ ] **Step 10.6: Commit**

```bash
git add watchwise-backend/src/auth/ watchwise-backend/src/middleware/ watchwise-backend/src/index.ts
git commit -m "feat: replace custom OAuth with Supabase JWT verification and session endpoint"
```

---

## Task 11: Rimuovi ObjectId dal PCS

**Files:**
- Modify: `watchwise-backend/src/pcs/recommend-user/preferences.ts`
- Modify: `watchwise-backend/src/pcs/recommend-user/candidates.ts`

- [ ] **Step 11.1: Aggiorna `preferences.ts`**

Rimuovi `import { ObjectId } from "mongodb"` e cambia le chiamate che usano `new ObjectId(userId)`:

```typescript
// watchwise-backend/src/pcs/recommend-user/preferences.ts
// Rimuovi: import { ObjectId } from "mongodb";
// Cambia riga 27-30:

  const events = await getUserPreferenceEvents(userId, 300);
```

Il file `preferences.ts` usa `getUserPreferenceEvents(new ObjectId(userId), 300)`. La nuova firma accetta `string`. Sostituisci tutte le occorrenze:

```diff
- import { ObjectId } from "mongodb";
  import { getUserPreferenceEvents } from "../../data/preferences/repository";
  ...
- const events = await getUserPreferenceEvents(new ObjectId(userId), 300);
+ const events = await getUserPreferenceEvents(userId, 300);
```

- [ ] **Step 11.2: Aggiorna `candidates.ts`**

```diff
- import { ObjectId } from "mongodb";
  import { getRecentlyWatchedMovies, getWatchHistoryEntries } from "../../data/watch-history/repository";
  ...
- const [watched, history, watchlistItems, feedbackEvents] = await Promise.all([
-   getRecentlyWatchedMovies(new ObjectId(userId), excludeDays),
-   getWatchHistoryEntries(userId, 20),
-   getListItemsBySlug(userId, "watching-list"),
-   getUserPreferenceEvents(new ObjectId(userId), 300)
- ]);
+ const [watched, history, watchlistItems, feedbackEvents] = await Promise.all([
+   getRecentlyWatchedMovies(userId, excludeDays),
+   getWatchHistoryEntries(userId, 20),
+   getListItemsBySlug(userId, "watching-list"),
+   getUserPreferenceEvents(userId, 300)
+ ]);
```

- [ ] **Step 11.3: Verifica compilazione finale backend**

```bash
cd watchwise-backend
npx tsc --noEmit
```

Output atteso: **zero errori**.

- [ ] **Step 11.4: Test locale del backend**

```bash
cd watchwise-backend
npm run dev
```

In un secondo terminale:

```bash
curl http://localhost:3001/health
```

Output atteso: `{"status":"ok","service":"watchwise-backend"}`

```bash
curl -X POST http://localhost:3001/api/auth/session \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Output atteso: `{"id":"00000000-0000-0000-0000-000000000001","username":"test","avatar":"avatar_01"}` (prima chiamata crea l'utente dev in Supabase).

- [ ] **Step 11.5: Commit**

```bash
git add watchwise-backend/src/pcs/
git commit -m "feat: remove ObjectId from PCS, all user IDs are now UUID strings"
```

---

## Task 12: Frontend — lib/auth.ts e lib/api.ts

**Files:**
- Modify: `watchwise-frontend/lib/auth.ts`
- Modify: `watchwise-frontend/lib/api.ts`

- [ ] **Step 12.1: Riscrivi `lib/auth.ts`**

```typescript
// watchwise-frontend/lib/auth.ts
import { createClient } from "@supabase/supabase-js";

export type OAuthProviderId = "google" | "github";

const USER_KEY = "watchwise-user";
const REDIRECT_KEY = "watchwise-redirect-to";

function isBrowser() {
  return typeof window !== "undefined";
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _supabase;
}

export async function startOAuth(
  provider: OAuthProviderId,
  options?: { redirectTo?: string }
) {
  if (!isBrowser()) return;

  const redirectTo = options?.redirectTo ?? "/";
  localStorage.setItem(REDIRECT_KEY, redirectTo);

  const supabase = getSupabaseClient();
  const callbackUrl = `${window.location.origin}/auth/callback`;

  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl },
  });
}

export async function getStoredToken(): Promise<string | null> {
  if (!isBrowser()) return null;
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function getStoredUser<T = unknown>(): T | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function storeUser(user: unknown) {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getRedirectTarget(): string {
  if (!isBrowser()) return "/";
  return localStorage.getItem(REDIRECT_KEY) ?? "/";
}

export async function clearSession() {
  if (!isBrowser()) return;
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REDIRECT_KEY);
}
```

- [ ] **Step 12.2: Aggiorna `lib/api.ts` — `getStoredToken` diventa async**

Apri `watchwise-frontend/lib/api.ts`. Trova il blocco che legge il token (righe 52-57) e aggiornalo:

```diff
- const token = getStoredToken()
- if (token) {
+ const token = await getStoredToken()
+ if (token) {
```

Aggiorna anche l'import:

```diff
- import { getStoredToken } from "@/lib/auth"
+ import { getStoredToken } from "@/lib/auth"
```

L'import resta lo stesso. L'unica modifica è `await getStoredToken()`.

- [ ] **Step 12.3: Verifica compilazione frontend**

```bash
cd watchwise-frontend
npx tsc --noEmit
```

Output atteso: zero errori relativi a `lib/auth.ts` o `lib/api.ts`.

- [ ] **Step 12.4: Commit**

```bash
git add watchwise-frontend/lib/auth.ts watchwise-frontend/lib/api.ts
git commit -m "feat: rewrite frontend auth to use Supabase client"
```

---

## Task 13: Frontend — pagina callback OAuth

**Files:**
- Modify: `watchwise-frontend/app/auth/callback/page.tsx`

- [ ] **Step 13.1: Riscrivi `app/auth/callback/page.tsx`**

```typescript
// watchwise-frontend/app/auth/callback/page.tsx
"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, UserX, Loader2, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getSupabaseClient,
  getRedirectTarget,
  storeUser,
  clearSession,
} from "@/lib/auth"
import { UsernameRetryForm } from "@/components/username-retry-form"
import { cn } from "@/lib/utils"

async function registerSession(
  accessToken: string,
  email: string,
  username?: string
) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  const res = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email, username }),
  })

  const data = await res.json()

  if (res.status === 409 && data.code === "USERNAME_TAKEN") {
    throw { type: "USERNAME_TAKEN", suggestions: data.suggestions ?? [] }
  }

  if (!res.ok) {
    throw new Error(data.message ?? "Session registration failed")
  }

  return data as { id: string; username: string; avatar: string }
}

function AuthCallbackPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [status, setStatus] = useState<"idle" | "success" | "error" | "username-taken">("idle")
  const [details, setDetails] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState<string>("/profile")
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [pendingToken, setPendingToken] = useState<string>("")
  const [pendingEmail, setPendingEmail] = useState<string>("")
  const [retryLoading, setRetryLoading] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  useEffect(() => {
    setRedirectTo(getRedirectTarget())
  }, [])

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) {
      setStatus("error")
      setDetails("Missing authorization code from provider.")
      return
    }

    const supabase = getSupabaseClient()

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.session) {
        setStatus("error")
        setDetails(error?.message ?? "Failed to exchange code for session.")
        return
      }

      const { access_token, user } = data.session
      const email = user.email ?? ""

      try {
        const profile = await registerSession(access_token, email)
        storeUser(profile)
        setStatus("success")
        setDetails("Successfully authenticated. Redirecting you shortly...")
        setTimeout(() => router.replace(getRedirectTarget()), 1500)
      } catch (err: any) {
        if (err?.type === "USERNAME_TAKEN") {
          setPendingToken(access_token)
          setPendingEmail(email)
          setUsernameSuggestions(err.suggestions)
          setStatus("username-taken")
          setDetails("The username is already taken. Please choose another one.")
        } else {
          setStatus("error")
          setDetails(err?.message ?? "Authentication failed.")
        }
      }
    })
  }, [searchParams, router])

  async function handleUsernameRetry(newUsername: string) {
    setRetryLoading(true)
    setRetryError(null)
    try {
      const profile = await registerSession(pendingToken, pendingEmail, newUsername)
      storeUser(profile)
      setStatus("success")
      setDetails("Successfully authenticated. Redirecting you shortly...")
      setTimeout(() => router.replace(getRedirectTarget()), 1500)
    } catch (err: any) {
      if (err?.type === "USERNAME_TAKEN") {
        setUsernameSuggestions(err.suggestions)
        setRetryError("Username already taken. Pick another.")
      } else {
        setRetryError(err?.message ?? "Something went wrong. Please try again.")
      }
    } finally {
      setRetryLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 flex flex-col">
      <Header />

      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <section className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div
            className={cn(
              "h-1.5 w-full",
              status === "idle" && "bg-zinc-800",
              status === "success" && "bg-emerald-500",
              status === "error" && "bg-red-500",
              status === "username-taken" && "bg-amber-500"
            )}
          />

          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
            {status === "idle" && (
              <>
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-violet-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-violet-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">Finalizing Login</h2>
                  <p className="text-zinc-400 text-sm">Please wait while we secure your session...</p>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in duration-300" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
                  <p className="text-zinc-400 text-sm">{details}</p>
                </div>
                <Button asChild variant="ghost" className="text-zinc-500 hover:text-emerald-400 text-xs mt-4 animate-pulse">
                  <Link href={redirectTo} className="flex items-center gap-1">
                    Click here if not redirected <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </>
            )}

            {status === "username-taken" && (
              <div className="w-full">
                <div className="flex flex-col items-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-4">
                    <UserX className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Username Taken</h2>
                  <p className="text-zinc-400 text-sm mt-2 max-w-xs">{details}</p>
                </div>
                <div className="text-left w-full bg-black/20 rounded-xl p-4 border border-white/5">
                  <UsernameRetryForm
                    initialUsername=""
                    suggestions={usernameSuggestions}
                    onSubmit={handleUsernameRetry}
                    loading={retryLoading}
                    error={retryError}
                  />
                </div>
              </div>
            )}

            {status === "error" && (
              <>
                <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Authentication Failed</h2>
                  <p className="text-red-300/80 text-sm bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                    {details}
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3 pt-4">
                  <Button asChild className="w-full bg-white text-black hover:bg-zinc-200">
                    <Link href="/login">Back to Login</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full text-zinc-400 hover:text-white">
                    <Link href="/">Go Home</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AuthCallbackPageInner />
    </Suspense>
  )
}
```

- [ ] **Step 13.2: Verifica compilazione frontend**

```bash
cd watchwise-frontend
npx tsc --noEmit
```

Output atteso: zero errori.

- [ ] **Step 13.3: Commit**

```bash
git add watchwise-frontend/app/auth/callback/page.tsx
git commit -m "feat: rewrite auth callback for Supabase PKCE flow"
```

---

## Task 14: Configurazione variabili d'ambiente su Vercel e Supabase

- [ ] **Step 14.1: Configura URL di callback in Supabase**

Vai su Supabase → Authentication → URL Configuration:
- **Site URL**: `https://watchwise.vercel.app` (URL del tuo frontend Vercel)
- **Redirect URLs**: aggiungi `https://watchwise.vercel.app/auth/callback`

Vai su Supabase → Authentication → Providers → Google:
- Incolla il `Client ID` e `Client Secret` di Google Cloud Console
- Redirect URL da usare in Google Console: quello mostrato da Supabase

Ripeti per GitHub.

- [ ] **Step 14.2: Aggiungi env vars al progetto Vercel backend**

Su Vercel → `watchwise-backend` → Settings → Environment Variables:

```
DATABASE_URL          = <connection string da Supabase → Settings → Database>
SUPABASE_URL          = https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY = <da Supabase → Settings → API>
NODE_ENV              = production
TMDB_API_KEY          = <la tua chiave TMDB>
TMDB_BASE_URL         = https://api.themoviedb.org/3
TMDB_API_READ_ACCESS_TOKEN = <il tuo token TMDB>
```

- [ ] **Step 14.3: Aggiungi env vars al progetto Vercel frontend**

Su Vercel → `watchwise-frontend` → Settings → Environment Variables:

```
NEXT_PUBLIC_API_BASE_URL      = https://watchwise-backend.vercel.app
NEXT_PUBLIC_SUPABASE_URL      = https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <da Supabase → Settings → API → anon public>
```

- [ ] **Step 14.4: Deploy**

```bash
# Dal root del repo
git push origin main
```

Vercel rileva il push e deploya entrambi i progetti automaticamente.

- [ ] **Step 14.5: Verifica health endpoint backend**

```bash
curl https://watchwise-backend.vercel.app/health
```

Output atteso: `{"status":"ok","service":"watchwise-backend"}`

- [ ] **Step 14.6: Verifica login OAuth in staging**

1. Apri `https://watchwise.vercel.app/login`
2. Clicca "Login con Google"
3. Completa il flusso OAuth
4. Dovresti essere reindirizzato a `/profile` con il tuo utente creato

- [ ] **Step 14.7: Commit finale con aggiornamento CLAUDE.md**

Aggiorna `CLAUDE.md` alla sezione Environment Setup per riflettere le nuove variabili:

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Supabase/Vercel env vars"
```

---

## Checklist di verifica finale

- [ ] `GET /health` risponde 200 su Vercel
- [ ] Login Google funziona end-to-end
- [ ] Login GitHub funziona end-to-end
- [ ] Username-taken flow mostra suggerimenti e permette di scegliere
- [ ] `GET /api/users/me` restituisce il profilo dopo login
- [ ] `GET /api/suggestions` restituisce raccomandazioni (PCS funzionante)
- [ ] Aggiunta film a lista funziona
- [ ] Watch history funziona
- [ ] Gruppi funzionano
