/**
 * Run once to create the first Super Admin.
 * Usage: node scripts/seedSuperAdmin.js
 * Default: email = superadmin@salonpro.com, password = Admin@123
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");
const { SuperAdmin } = require("../models/superAdmin");

const DEFAULT_EMAIL = "superadmin@salonpro.com";
const DEFAULT_PASSWORD = "Admin@123";

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const existing = await SuperAdmin.findOne({ where: { email: DEFAULT_EMAIL } });
    if (existing) {
      console.log("Super Admin already exists:", DEFAULT_EMAIL);
      process.exit(0);
      return;
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await SuperAdmin.create({
      email: DEFAULT_EMAIL,
      password: hashedPassword,
      name: "Super Admin",
    });
    console.log("Super Admin created:");
    console.log("  Email:", DEFAULT_EMAIL);
    console.log("  Password:", DEFAULT_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
