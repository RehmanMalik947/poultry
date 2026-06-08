
const { sequelize } = require("../config/db");

async function fixDatabase() {
  try {
    console.log("Attempting to add paid_at column to payrolls table...");
    await sequelize.query("ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS paid_at DATETIME NULL;");
    console.log("Success! (or column already exists)");
    process.exit(0);
  } catch (err) {
    if (err.message.includes("Duplicate column name")) {
      console.log("Column already exists.");
      process.exit(0);
    }
    console.error("Failed to add column:", err.message);
    process.exit(1);
  }
}

fixDatabase();