// server.js
require("dotenv").config(); // Load .env variables FIRST
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
const db_password = process.env.MONGODB_PASSWORD;
const db_user = "simpleEcommerceUser";
const db_name = "usersDB";
const collection_name = "users";

// --- Validate Environment Variables ---
if (!db_password) {
  console.error("FATAL ERROR: MONGODB_PASSWORD is not defined in .env file");
  process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MongoDB Connection URI ---
const uri = `mongodb+srv://${db_user}:${db_password}@cluster1.u0lzrbq.mongodb.net/${db_name}?retryWrites=true&w=majority`;

// --- MongoDB Client Setup ---
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// --- Main Async Function ---
async function run() {
  try {
    await client.db("admin").command({ ping: 1 });
    console.log(
      "✅ Pinged your deployment. Successfully connected to MongoDB!"
    );

    const database = client.db(db_name);
    const usersCollection = database.collection(collection_name);
    const countersCollection = database.collection("counters");

    // Function to get the next sequence value (atomic) - Remains the same
    async function getNextSequenceValue(sequenceName) {
      const sequenceDocument = await countersCollection.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence_value: 1 } },
        { returnDocument: "after" }
      );
      if (!sequenceDocument) {
        // Initialize counter if it doesn't exist (SAFER approach)
        await countersCollection.insertOne({
          _id: sequenceName,
          sequence_value: 1,
        });
        console.warn(`Initialized counter "${sequenceName}"`);
        return 1;
        // Or throw error if manual initialization is preferred:
        // throw new Error(`Counter document "${sequenceName}" not found and upsert is false.`);
      }
      return sequenceDocument.sequence_value;
    }

    // ========================================
    // == CRUD OPERATIONS ==
    // ========================================

    // CREATE: Add a new user - Adjusted response slightly for clarity
    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;
        console.log("Attempting to insert new user:", userData);

        if (!userData.name || !userData.email) {
          return res.status(400).send({ message: "Missing name or email" });
        }

        // Use provided age (attempt to convert) or default to 18
        let finalAge = 18; // Default age
        if (
          userData.age !== undefined &&
          userData.age !== null &&
          userData.age !== ""
        ) {
          const parsedAge = Number(userData.age);
          if (!isNaN(parsedAge)) {
            finalAge = parsedAge;
          } else {
            console.warn(
              `Received non-numeric age ('${userData.age}'), using default 18.`
            );
          }
        }

        const nextUserId = await getNextSequenceValue("userId");

        const newUser = {
          userId: nextUserId,
          name: userData.name,
          email: userData.email,
          age: finalAge,
          createdAt: new Date(),
          // _id is added automatically by MongoDB
        };

        // "userId": 23,
        // "name": "user",
        // "email": "user@thetork.com",
        // "age": 28,
        // "createdAt": "2025-04-09T00:16:21.410Z",
        // "_id": "67f5bc55724d0a1ce748d281"

        // "_id": "67f5bc55724d0a1ce748d281",
        // "userId": 23,
        // "name": "user",
        // "email": "user@thetork.com",
        // "age": 28,
        // "createdAt": "2025-04-09T00:16:21.410Z"

        const result = await usersCollection.insertOne(newUser);
        console.log("Insert Result:", result);

        // Send back the newly created user data along with IDs
        res.status(201).send({
          message: "User added successfully",
          insertedId: result.insertedId, // MongoDB's _id
          userId: newUser.userId, // Your sequential userId
          user: newUser, // The data that was inserted (excluding _id initially)
        });
      } catch (error) {
        console.error("Error inserting user:", error);
        res
          .status(500)
          .send({ message: "Error adding user", error: error.message });
      }
    });

    // READ: Get all users - Remains the same
    app.get("/users", async (req, res) => {
      try {
        const query = {};
        const cursor = usersCollection.find(query);
        const allUsers = await cursor.toArray();
        res.send(allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res
          .status(500)
          .send({ message: "Error fetching users", error: error.message });
      }
    });

    // READ: Get a single user by **userId** (Replaces the old /users/:id)
    app.get("/users/:userId", async (req, res) => {
      try {
        // Get the userId from params and convert to integer
        const userIdParam = req.params.userId;
        const userId = parseInt(userIdParam, 10);

        // Validate if the ID is a valid number
        if (isNaN(userId)) {
          return res
            .status(400)
            .send({ message: "Invalid user ID format (must be a number)" });
        }

        // Query by the numeric userId field
        const query = { userId: userId };
        console.log("Attempting to find user with query:", query);
        const user = await usersCollection.findOne(query);

        if (user) {
          res.send(user);
        } else {
          res
            .status(404)
            .send({ message: `User not found with userId: ${userId}` });
        }
      } catch (error) {
        console.error(
          `Error fetching single user with userId ${req.params.userId}:`,
          error
        );
        res
          .status(500)
          .send({ message: "Error fetching user", error: error.message });
      }
    });

    // --- REMOVED /users/by-sequence/:userId route as it's now redundant ---

    // UPDATE: Modify an existing user by **userId** (Replaces the old /users/:id)
    app.patch("/users/:userId", async (req, res) => {
      try {
        // Get the userId from params and convert to integer
        const userIdParam = req.params.userId;
        const userId = parseInt(userIdParam, 10);
        const updates = req.body;

        // Validate if the ID is a valid number
        if (isNaN(userId)) {
          return res
            .status(400)
            .send({ message: "Invalid user ID format (must be a number)" });
        }

        // Prevent updating userId or _id if accidentally included
        delete updates._id;
        delete updates.userId;
        delete updates.createdAt; // Don't allow direct update of createdAt

        if (Object.keys(updates).length === 0) {
          return res.status(400).send({ message: "No update fields provided" });
        }

        // Add validation/conversion for specific fields like age if necessary
        if (updates.age !== undefined) {
          const parsedAge = Number(updates.age);
          if (isNaN(parsedAge)) {
            return res
              .status(400)
              .send({ message: "Invalid age provided. Must be a number." });
          }
          updates.age = parsedAge; // Ensure age is stored as a number
        }

        // Filter by the numeric userId field
        const filter = { userId: userId };
        const updateDoc = {
          $set: updates,
          $currentDate: { updatedAt: true }, // Good practice to track updates
        };

        console.log(
          "Attempting to update user with filter:",
          filter,
          "and updates:",
          updateDoc
        );
        const result = await usersCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .send({ message: `User not found with userId: ${userId}` });
        }
        // Note: result.modifiedCount might be 0 if the data sent was identical to existing data
        console.log("Update Result:", result);

        // Optionally fetch and return the updated user data
        const updatedUser = await usersCollection.findOne(filter);

        res.send({
          message: "User updated successfully",
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          updatedUser: updatedUser, // Send back the updated document
        });
      } catch (error) {
        console.error(
          `Error updating user with userId ${req.params.userId}:`,
          error
        );
        res
          .status(500)
          .send({ message: "Error updating user", error: error.message });
      }
    });

    // DELETE: Remove a user by **userId** (Replaces the old /users/:id)
    app.delete("/users/:userId", async (req, res) => {
      try {
        // Get the userId from params and convert to integer
        const userIdParam = req.params.userId;
        const userId = parseInt(userIdParam, 10);

        // Validate if the ID is a valid number
        if (isNaN(userId)) {
          return res
            .status(400)
            .send({ message: "Invalid user ID format (must be a number)" });
        }

        // Filter by the numeric userId field
        const query = { userId: userId };
        console.log("Attempting to delete user with query:", query);
        const result = await usersCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          console.log(`Successfully deleted user with userId: ${userId}`);
          res.status(200).send({
            // Use 200 OK or 204 No Content
            message: "User deleted successfully",
            deletedCount: result.deletedCount,
          });
        } else {
          res
            .status(404)
            .send({ message: `User not found with userId: ${userId}` });
        }
      } catch (error) {
        console.error(
          `Error deleting user with userId ${req.params.userId}:`,
          error
        );
        res
          .status(500)
          .send({ message: "Error deleting user", error: error.message });
      }
    });

    // Basic root route
    app.get("/", (req, res) => {
      res.send("Simple E-commerce Server Running!");
    });

    // Start the Express server
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("🔴 MongoDB Initial Connection Error / Setup Failed:", error);
  }
}

run().catch(console.dir);
