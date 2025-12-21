import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB!;

if (!MONGO_URI || !DB_NAME) {
  throw new Error("Missing MongoDB configuration");
}

const USER_ID = new ObjectId("000000000000000000000001");

async function seed() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db = client.db(DB_NAME);

  /* ================= USERS ================= */

  const users = db.collection("users");

  await users.deleteOne({ _id: USER_ID });

  await users.insertOne({
    _id: USER_ID,
    email: "test@watchwise.app",
    username: "testuser",
    avatar: "avatar_01",
    authProvider: "local",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log("✅ User inserted");

  /* ========== USER PREFERENCE EVENTS ========= */

  const preferences = db.collection("user_preference_events");

  await preferences.deleteMany({ userId: USER_ID });

  await preferences.insertMany([
    {
      userId: USER_ID,
      type: "genre",
      value: "Drama",
      weight: 1.0,
      source: "explicit",
      createdAt: new Date()
    },
    {
      userId: USER_ID,
      type: "genre",
      value: "Science Fiction",
      weight: 0.8,
      source: "explicit",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      userId: USER_ID,
      type: "director",
      value: "Christopher Nolan",
      weight: 0.9,
      source: "watch",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      userId: USER_ID,
      type: "actor",
      value: "Leonardo DiCaprio",
      weight: 0.7,
      source: "watch",
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    }
  ]);

  console.log("✅ Preference events inserted");

  /* ========== WATCH HISTORY ========= */

  const watchHistory = db.collection("user_watch_history");

  await watchHistory.deleteMany({ userId: USER_ID });

  await watchHistory.insertOne({
    userId: USER_ID,
    movieId: "tmdb:872585", // esempio: Oppenheimer
    watchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    completed: true,
    rating: 4
  });

  console.log("✅ Watch history inserted");

  await client.close();
  console.log("🎉 Database seeding completed");
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
