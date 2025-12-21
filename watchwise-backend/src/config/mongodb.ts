import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri || !dbName) {
    throw new Error("Missing MongoDB configuration");
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);
  console.log("✅ Connected to MongoDB");

  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not initialized. Call connectMongo() first.");
  }
  return db;
}
