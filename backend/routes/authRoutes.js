const express = require("express");
const router = express.Router();
const { register, login, changePassword, logout } = require("../controllers/authController");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { auth } = require("../middleware/validation");

// Mounted at /api/auth
// POST /api/auth/register — body: { organizationName, username, email, phone, emergencyContact?, address?, totalEmployees?, industryCategory?, timezone? }
// POST /api/auth/login    — body: { login, password } — login is username or email
router.post("/register", auth.register, register);
router.post("/login", auth.login, login);
router.post("/logout", protectStaffOrOrganization, logout);
router.put("/change-password", protectStaffOrOrganization, changePassword);

module.exports = router;
