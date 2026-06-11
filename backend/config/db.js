
const sequelize = require("sequelize");
const dotenv = require("dotenv");
dotenv.config();

const db = new sequelize(
  'poultry_db',
  'root',
  '',
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

async function initDB() {
  try {
    await db.authenticate();
    console.log("Connected to the database");
    return db;
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("\n  → Make sure MySQL is running (e.g. start XAMPP/WAMP/MySQL service).");
      console.error("  → Check .env: DB_HOST, DB_PORT (3306), DB_USER, DB_PASSWORD, DB_NAME.");
      console.error("  → Create the database if it does not exist: CREATE DATABASE <DB_NAME>;\n");
    }
    throw error;
  }
}

module.exports = { sequelize: db, initDB };

