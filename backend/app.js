const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { initDB } = require("./config/db");
const { syncDB } = require("./utils/dbSync");
const routes = require("./routes");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// File downloads via /api (so front-end dev proxy can reach them)
app.get("/api/uploads/staff-attachments/:file", (req, res) => {
  const filePath = path.join(__dirname, "uploads", "staff-attachments", req.params.file);
  res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(err.statusCode || 404).json({ success: false, message: "File not found" });
    }
  });
});

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Salon POS Backend is running");
});

app.get("/db-status", async (req, res) => {
  try {
    const { sequelize } = require("./config/db");
    await sequelize.authenticate();
    res.send({ status: "✅ Database connected successfully" });
  } catch (err) {
    res.status(500).send({
      status: "❌ Database NOT connected",
      error: err.message,
    });
  }
});

// Register API Routes
app.use("/api", routes);

const PORT = process.env.PORT || 3000;

// Initialize DB and Start Server
initDB()
  .then(async () => {
    // Sync models and run migrations
    await syncDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

module.exports = app;
