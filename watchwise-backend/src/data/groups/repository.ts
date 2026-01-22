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

export async function findGroupsByMember(
  memberId: ObjectId
): Promise<Group[]> {
  return collection()
    .find({ members: memberId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function findGroupByJoinCode(
  joinCode: string
): Promise<Group | null> {
  return collection().findOne({ joinCode });
}

export async function createGroup(
  group: Omit<Group, "_id" | "createdAt">
): Promise<Group> {
  const now = new Date();
  const document: Group = {
    _id: new ObjectId(),
    createdAt: now,
    ...group
  };
  await collection().insertOne(document);
  return document;
}

export async function addGroupMember(
  groupId: ObjectId,
  userId: ObjectId
): Promise<void> {
  await collection().updateOne(
    { _id: groupId },
    { $addToSet: { members: userId } }
  );
}

export async function removeGroupMember(
  groupId: ObjectId,
  userId: ObjectId
): Promise<void> {
  await collection().updateOne(
    { _id: groupId },
    { $pull: { members: userId } }
  );

  const group = await collection().findOne(
    { _id: groupId },
    { projection: { members: 1 } }
  );

  if (!group || group.members.length === 0) {
    await collection().deleteOne({ _id: groupId });
    await getDb()
      .collection("groupSessions")
      .deleteMany({ groupId });
  }
}

export async function setGroupHost(
  groupId: ObjectId,
  hostId?: ObjectId
): Promise<void> {
  
  await collection().updateOne({ _id: groupId }, hostId
    ? { $set: { hostId } }
    : { $unset: { hostId: 1 } });
}

export async function updateGroupJoinCode(
  groupId: ObjectId,
  joinCode: string,
  expiresAt: Date
): Promise<void> {
  await collection().updateOne(
    { _id: groupId },
    {
      $set: {
        joinCode,
        joinCodeExpiresAt: expiresAt
      }
    }
  );
}

export async function updateGroupStatus(
  groupId: ObjectId,
  status: "open" | "locked" | "closed"
): Promise<void> {
  await collection().updateOne(
    { _id: groupId },
    { $set: { status } }
  );
}
