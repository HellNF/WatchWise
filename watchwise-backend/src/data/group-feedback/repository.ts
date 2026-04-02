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
