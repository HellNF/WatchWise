import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/mongodb";
import { User , UpdateUserInput} from "./types";

function collection(): Collection<User> {
  return getDb().collection<User>("users");
}

export async function getUserById(id: string): Promise<User | null> {
  return collection().findOne({ _id: new ObjectId(id) });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return collection().findOne({ email });
}

export async function getUserByOAuth(
  oauthProvider: string,
  oauthId: string
): Promise<User | null> {
  return collection().findOne({ oauthProvider, oauthId });
}

export async function createUser(
  data: Omit<User, "_id">
): Promise<User> {
  try {
    const result = await collection().insertOne(data as User);
    return { _id: result.insertedId, ...data };
  } catch (err: any) {
    if (err.code === 11000 && err.keyPattern?.username) {
      throw new Error("USERNAME_ALREADY_EXISTS");
    }
    throw err;
  }
}
export async function updateUser(
  userId: string,
  data: UpdateUserInput
) {
  await collection().updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        ...data,
        updatedAt: new Date()
      }
    }
  );
}

export async function linkOAuthToUser(
  userId: string,
  oauthProvider: string,
  oauthId: string
) {
  await collection().updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        authProvider: "oauth",
        oauthProvider,
        oauthId,
        updatedAt: new Date()
      }
    }
  );
}

export async function deleteUserAndData(userId: string) {
  const db = getDb();
  const _id = new ObjectId(userId);

  await Promise.all([
    db.collection("users").deleteOne({ _id }),
    db.collection("user_preference_events").deleteMany({ userId: _id }),
    db.collection("user_watch_history").deleteMany({ userId: _id }),
    // FUTURO:
    // db.collection("group_members").deleteMany({ userId: _id })
  ]);
}