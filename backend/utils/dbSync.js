const { sequelize } = require("../config/db");

// Load all models and associations before sync
require("../models");

async function syncDB() {
  try {
    console.log("🔄 Starting Database Sync...");

    await sequelize.sync({ alter: true });

    console.log("✅ Database synchronized successfully.");
  } catch (error) {
    console.error("❌ Database sync failed:");
    console.error("Message:", error.message);
    console.error("Table:", error.table);
    console.error("SQL:", error.sql);
    console.error("Parent:", error.parent);
    console.error("Original:", error.original);

    throw error;
  }
}

module.exports = { syncDB };