"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
let client = null;
let db = null;
async function connectMongo() {
    if (db)
        return db;
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;
    if (!uri || !dbName) {
        throw new Error("Missing MongoDB configuration");
    }
    client = new mongodb_1.MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    // Ensure unique index on username
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    console.log("✅ Connected to MongoDB");
    return db;
}
function getDb() {
    if (!db) {
        throw new Error("MongoDB not initialized. Call connectMongo() first.");
    }
    return db;
}
