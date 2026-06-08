/**
 * Fix Super Admin password: set it to a bcrypt hash of Admin@123.
 * Run this if you inserted the row manually with a plain-text password.
 * Usage: node scripts/fixSuperAdminPassword.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");
const { SuperAdmin } = require("../models/superAdmin");

const EMAIL = "superadmin@salonpro.com";
const NEW_PASSWORD = "Admin@123";

async function fix() {
  try {
    await sequelize.authenticate();

    const admin = await SuperAdmin.findOne({ where: { email: EMAIL } });
    if (!admin) {
      console.log("No Super Admin found with email:", EMAIL);
      process.exit(1);
      return;
    }

    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    await admin.update({ password: hashedPassword });
    console.log("Password updated for:", EMAIL);
    console.log("You can now sign in with password:", NEW_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fix();
