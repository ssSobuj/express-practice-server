require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");
const userRoutes = require("./routes/userRoutes");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://express-practice-client.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Async function to initialize server
async function initializeServer() {
  try {
    // Connect to DB first
    await connectDB();
    console.log("Database connected successfully");

    // Set up routes after DB connection
    app.use("/api/users", userRoutes);

    app.get("/api", (req, res) => {
      res.send("Simple E-commerce Server Running!");
    });

    // Error handling
    app.use(errorHandler);

    // Start server only locally
    if (!process.env.VERCEL) {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }
  } catch (error) {
    console.error("Server initialization failed:", error);
    process.exit(1);
  }
}

initializeServer();

module.exports = app;
