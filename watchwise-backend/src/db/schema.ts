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
