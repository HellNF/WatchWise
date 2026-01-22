import { ObjectId, OptionalId } from "mongodb";
import { getDb } from "../../config/mongodb";
import { UserPreferenceEvent } from "./types";

const COLLECTION = "user_preference_events";

function collection() {
  return getDb().collection<UserPreferenceEvent>(COLLECTION);
}

type InsertPreferenceEvent = Omit<UserPreferenceEvent, "_id" | "userId"> & {
  userId: string;
};

export async function insertPreferenceEvent(
  event: InsertPreferenceEvent
) {
  const document: UserPreferenceEvent = {
    _id: new ObjectId(),
    ...event,
    userId: new ObjectId(event.userId)
  };

  await collection().insertOne(document);
}

export async function insertPreferenceEvents(
  userId: string,
  events: Omit<UserPreferenceEvent, "_id" | "userId">[]
) {
  if (!events.length) return;
  const documents: UserPreferenceEvent[] = events.map((event) => ({
    _id: new ObjectId(),
    ...event,
    userId: new ObjectId(userId)
  }));

  await collection().insertMany(documents);
}

export async function getUserPreferences(userId: string) {
  return collection()
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getUserPreferenceEvents(
  userId: ObjectId,
  limit = 300
) {
  return collection()
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getLatestQuestionnaireEvent(
  userId: ObjectId
) {
  return collection()
    .find({ userId, source: "questionnaire" })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
}

export async function deletePreferenceEvent(
  userId: string,
  eventId: string
) {
  await collection().deleteOne({
    _id: new ObjectId(eventId),
    userId: new ObjectId(userId)
  });
}

export async function deleteRecentPreferencesBySource(
  userId: string,
  source: string,
  since: Date
) {
  await collection().deleteMany({
    userId: new ObjectId(userId),
    source,
    createdAt: { $gte: since }
  });
}

export async function deletePreferencesBySource(
  userId: string,
  source: string
) {
  await collection().deleteMany({
    userId: new ObjectId(userId),
    source
  });
}
