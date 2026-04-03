"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupFeedbackEvents = exports.groupSessions = exports.userWatchHistory = exports.userPreferenceEvents = exports.userListItems = exports.userLists = exports.groupMembers = exports.groups = exports.users = void 0;
// watchwise-backend/src/db/schema.ts
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey(), // = Supabase Auth user UUID
    username: (0, pg_core_1.text)("username").notNull().unique(),
    avatar: (0, pg_core_1.text)("avatar").notNull().default("avatar_01"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.groups = (0, pg_core_1.pgTable)("groups", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    hostId: (0, pg_core_1.uuid)("host_id").references(() => exports.users.id, { onDelete: "set null" }),
    joinCode: (0, pg_core_1.text)("join_code"),
    joinCodeExpiresAt: (0, pg_core_1.timestamp)("join_code_expires_at"),
    status: (0, pg_core_1.text)("status").default("open"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.groupMembers = (0, pg_core_1.pgTable)("group_members", {
    groupId: (0, pg_core_1.uuid)("group_id")
        .references(() => exports.groups.id, { onDelete: "cascade" })
        .notNull(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    role: (0, pg_core_1.text)("role").default("member").notNull(),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow().notNull(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.groupId, table.userId] }),
}));
exports.userLists = (0, pg_core_1.pgTable)("user_lists", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull(),
    isDefault: (0, pg_core_1.boolean)("is_default").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.userListItems = (0, pg_core_1.pgTable)("user_list_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    listId: (0, pg_core_1.uuid)("list_id")
        .references(() => exports.userLists.id, { onDelete: "cascade" })
        .notNull(),
    movieId: (0, pg_core_1.text)("movie_id").notNull(),
    addedAt: (0, pg_core_1.timestamp)("added_at").defaultNow().notNull(),
});
exports.userPreferenceEvents = (0, pg_core_1.pgTable)("user_preference_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    type: (0, pg_core_1.text)("type").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    weight: (0, pg_core_1.real)("weight").notNull(),
    source: (0, pg_core_1.text)("source").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.userWatchHistory = (0, pg_core_1.pgTable)("user_watch_history", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    movieId: (0, pg_core_1.text)("movie_id").notNull(),
    watchedAt: (0, pg_core_1.timestamp)("watched_at").defaultNow().notNull(),
    rating: (0, pg_core_1.real)("rating"),
    completed: (0, pg_core_1.boolean)("completed").notNull().default(false),
});
exports.groupSessions = (0, pg_core_1.pgTable)("group_sessions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    groupId: (0, pg_core_1.uuid)("group_id")
        .references(() => exports.groups.id, { onDelete: "cascade" })
        .notNull(),
    context: (0, pg_core_1.jsonb)("context").notNull().default("{}"),
    selectedMovieId: (0, pg_core_1.text)("selected_movie_id"),
    softStartAt: (0, pg_core_1.timestamp)("soft_start_at"),
    softStartTimeoutMinutes: (0, pg_core_1.integer)("soft_start_timeout_minutes"),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    status: (0, pg_core_1.text)("status").default("pending"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.groupFeedbackEvents = (0, pg_core_1.pgTable)("group_feedback_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)("session_id")
        .references(() => exports.groupSessions.id, { onDelete: "cascade" })
        .notNull(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    movieId: (0, pg_core_1.text)("movie_id").notNull(),
    rating: (0, pg_core_1.real)("rating"),
    liked: (0, pg_core_1.boolean)("liked"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
