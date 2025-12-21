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
