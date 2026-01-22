import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/mongodb";
import { GroupSession } from "./types";

function collection(): Collection<GroupSession> {
  return getDb().collection<GroupSession>("group_sessions");
}

export async function createGroupSession(
  session: Omit<GroupSession, "_id">
): Promise<GroupSession> {
  const result = await collection().insertOne(session as GroupSession);
  return { _id: result.insertedId, ...session };
}

export async function findGroupSessionById(
  sessionId: ObjectId
): Promise<GroupSession | null> {
  return collection().findOne({ _id: sessionId });
}

export async function updateGroupSessionById(
  sessionId: ObjectId,
  data: Partial<Omit<GroupSession, "_id" | "groupId">>
): Promise<void> {
  await collection().updateOne(
    { _id: sessionId },
    { $set: data }
  );
}
