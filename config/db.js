// config/db.js

require("dotenv").config(); // Load .env variables FIRST
const { MongoClient, ServerApiVersion } = require("mongodb");

const db_password = process.env.MONGODB_PASSWORD;
const db_user = "simpleEcommerceUser";
const db_name = "usersDB";

// Validate password presence early
if (!db_password) {
  console.error(
    "🔴 FATAL ERROR: MONGODB_PASSWORD environment variable is not defined."
  );
  // In a serverless context, we might not want to throw here during module load,
  // let connectDB handle the failure during connection attempt.
  // throw new Error("MONGODB_PASSWORD environment variable is not defined.");
}

const uri = `mongodb+srv://${db_user}:${db_password}@cluster1.u0lzrbq.mongodb.net/${db_name}?retryWrites=true&w=majority`;

// Note: No need to check if uri is empty here, constructor will fail if password was missing.

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let dbConnection = null; // Initialize explicitly to null

async function connectDB() {
  // If connection already established, return it
  if (dbConnection) {
    // console.log("Database connection already established."); // Optional logging
    return dbConnection;
  }

  try {
    console.log("Attempting MongoDB connection..."); // Add log
    await client.connect();
    dbConnection = client.db(db_name); // Store the specific DB connection

    // Optional: Ping to confirm, but connect() success is usually enough
    await dbConnection.command({ ping: 1 });

    console.log("✅ Successfully connected to MongoDB!");
    return dbConnection;
  } catch (error) {
    console.error("🔴 MongoDB connection error:", error);
    // DO NOT EXIT THE PROCESS HERE!
    // Just log the error. Subsequent calls to getDB() will fail naturally.
    // process.exit(1); // <--- REMOVE THIS LINE

    // Optional: Set dbConnection to null explicitly on failure?
    dbConnection = null;
    // Re-throw the error so the initial call site in server.js knows it failed
    throw error;
  }
}

function getDB() {
  if (!dbConnection) {
    console.error(
      "getDB Error: Database not connected. connectDB may have failed or not completed."
    );
    // Throwing an error here is okay, as it indicates a programming/setup error
    throw new Error("Database connection is not available.");
  }
  return dbConnection;
}

module.exports = { connectDB, getDB };
