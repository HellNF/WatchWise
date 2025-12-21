import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/mongodb";
import { Group } from "./types";

function collection(): Collection<Group> {
  return getDb().collection<Group>("groups");
}

export async function findGroupById(
  groupId: ObjectId
): Promise<Group | null> {
  return collection().findOne({ _id: groupId });
}
