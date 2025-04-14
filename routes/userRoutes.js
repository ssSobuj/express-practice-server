const express = require("express");
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

// User routes
router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:userId", getUserById);
router.patch("/:userId", updateUser);
router.delete("/:userId", deleteUser);

module.exports = router;
