const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

async function testConnection() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully!");
    const db = client.db();
    console.log("Database name:", db.databaseName);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
  } finally {
    await client.close();
  }
}

testConnection();
