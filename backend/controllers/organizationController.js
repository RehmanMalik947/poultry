const { Organization } = require("../models/organization");
const bcrypt = require("bcryptjs");

/**
 * Organization signup request (from frontend sign up form)
 * POST /api/organizations/register
 * Body: { salonName, numberOfMembers, location, phone, email }
 */
async function register(req, res) {
  try {
    const { salonName, numberOfMembers, location, phone, email } = req.body;
    if (!salonName || !email) {
      return res.status(400).json({ success: false, message: "Salon name and email are required" });
    }

    const existing = await Organization.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: "An organization with this email already exists" });
    }

    const org = await Organization.create({
      salonName: salonName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      location: location ? location.trim() : null,
      numberOfMembers: numberOfMembers ? Number(numberOfMembers) : null,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Registration request submitted. You will receive login details after approval.",
      data: {
        id: org.id,
        email: org.email,
        salonName: org.salonName,
        status: org.status,
      },
    });
  } catch (err) {
    console.error("Organization register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  register,
};
