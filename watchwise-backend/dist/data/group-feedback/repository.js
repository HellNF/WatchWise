"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGroupFeedback = addGroupFeedback;
// watchwise-backend/src/data/group-feedback/repository.ts
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
async function addGroupFeedback(event) {
    const db = (0, db_1.getDb)();
    await db.insert(schema_1.groupFeedbackEvents).values({
        sessionId: event.sessionId,
        userId: event.userId,
        movieId: event.movieId,
        rating: event.rating,
        liked: event.liked,
        createdAt: event.createdAt ?? new Date(),
    });
}
