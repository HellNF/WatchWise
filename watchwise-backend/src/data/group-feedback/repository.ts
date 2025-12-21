import { Collection } from "mongodb";
import { getDb } from "../../config/mongodb";
import { GroupFeedbackEvent } from "./types";

function collection(): Collection<GroupFeedbackEvent> {
  return getDb().collection<GroupFeedbackEvent>("group_feedback_events");
}

export async function addGroupFeedback(
  event: Omit<GroupFeedbackEvent, "_id">
): Promise<void> {
  await collection().insertOne(event as GroupFeedbackEvent);
}
