const { getDB } = require("../config/db");
const { getNextSequenceValue } = require("../utils/sequenceGenerator");

async function createUser(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const userData = req.body;

    if (!userData.name || !userData.email) {
      return res.status(400).send({ message: "Missing name or email" });
    }

    let finalAge = 18;
    if (
      userData.age !== undefined &&
      userData.age !== null &&
      userData.age !== ""
    ) {
      const parsedAge = Number(userData.age);
      if (!isNaN(parsedAge)) {
        finalAge = parsedAge;
      }
    }

    const nextUserId = await getNextSequenceValue("userId");

    const newUser = {
      userId: nextUserId,
      name: userData.name,
      email: userData.email,
      age: finalAge,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).send({
      message: "User added successfully",
      insertedId: result.insertedId,
      userId: newUser.userId,
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const allUsers = await usersCollection.find({}).toArray();
    res.send(allUsers);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    const user = await usersCollection.findOne({ userId });

    if (!user) {
      return res
        .status(404)
        .send({ message: `User not found with userId: ${userId}` });
    }

    res.send(user);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const userId = parseInt(req.params.userId, 10);
    const updates = req.body;

    if (isNaN(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;

    if (Object.keys(updates).length === 0) {
      return res.status(400).send({ message: "No update fields provided" });
    }

    if (updates.age !== undefined) {
      const parsedAge = Number(updates.age);
      if (isNaN(parsedAge)) {
        return res.status(400).send({ message: "Invalid age provided" });
      }
      updates.age = parsedAge;
    }

    const filter = { userId };
    const updateDoc = {
      $set: updates,
      $currentDate: { updatedAt: true },
    };

    const result = await usersCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .send({ message: `User not found with userId: ${userId}` });
    }

    const updatedUser = await usersCollection.findOne(filter);

    res.send({
      message: "User updated successfully",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    const result = await usersCollection.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ message: `User not found with userId: ${userId}` });
    }

    res.send({
      message: "User deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
