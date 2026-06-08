const { SuperAdmin } = require("../models/superAdmin");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/token");

/**
 * Super Admin login
 * POST /api/super-admin/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const admin = await SuperAdmin.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken({ id: admin.id, email: admin.email, role: "super_admin" });
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      },
    });
  } catch (err) {
    console.error("Super Admin login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Get current Super Admin profile (protected)
 * GET /api/super-admin/me
 * Header: Authorization: Bearer <token>
 */
async function getMe(req, res) {
  try {
    const admin = await SuperAdmin.findByPk(req.adminId, {
      attributes: ["id", "email", "name", "createdAt"],
    });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    return res.status(200).json({ success: true, data: admin });
  } catch (err) {
    console.error("Super Admin getMe error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  login,
  getMe,
};
