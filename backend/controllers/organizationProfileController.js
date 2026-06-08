const { Organization } = require("../models/organization");
const { encryptOrgId } = require("../utils/cryptoHelper");

/**
 * Get organization ID from authenticated user. Never use body.
 */
function getOrganizationId(req) {
  const id = req.user?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

/**
 * GET /api/organization/profile
 * Returns the current organization (tenant) profile for the logged-in user.
 */
async function getProfile(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    const org = await Organization.findByPk(organizationId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: org.id,
        encryptedId: encryptOrgId(org.id), // Added encrypted ID
        name: org.name,
        email: org.email,
        phone: org.phone,
        emergencyContact: org.emergencyContact,
        address: org.address,
        totalEmployees: org.totalEmployees,
        industryCategory: org.industryCategory,
        timezone: org.timezone,
        isSelfServiceEnabled: org.isSelfServiceEnabled,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getOrganizationProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/organization/profile
 * Update the current organization profile. Never accept organizationId from body.
 * Body: { name?, email?, phone?, emergencyContact?, address?, totalEmployees?, industryCategory?, timezone? }
 */
async function updateProfile(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const {
      name,
      email,
      phone,
      emergencyContact,
      address,
      totalEmployees,
      industryCategory,
      timezone,
      isSelfServiceEnabled,
    } = req.body;

    const org = await Organization.findByPk(organizationId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      org.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ success: false, message: "Email cannot be empty" });
      }
      org.email = email.trim().toLowerCase();
    }
    if (phone !== undefined) org.phone = phone != null ? String(phone).trim() : "";
    if (emergencyContact !== undefined) org.emergencyContact = emergencyContact != null ? String(emergencyContact).trim() || null : null;
    if (address !== undefined) org.address = address != null ? String(address).trim() || null : null;
    if (totalEmployees !== undefined) org.totalEmployees = totalEmployees != null && totalEmployees !== "" ? parseInt(totalEmployees, 10) : null;
    if (industryCategory !== undefined) org.industryCategory = industryCategory != null ? String(industryCategory).trim() || null : null;
    if (timezone !== undefined) org.timezone = timezone != null ? String(timezone).trim() || "UTC" : "UTC";
    if (isSelfServiceEnabled !== undefined) org.isSelfServiceEnabled = !!isSelfServiceEnabled;

    await org.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: {
        id: org.id,
        encryptedId: encryptOrgId(org.id),
        name: org.name,
        email: org.email,
        phone: org.phone,
        emergencyContact: org.emergencyContact,
        address: org.address,
        totalEmployees: org.totalEmployees,
        industryCategory: org.industryCategory,
        timezone: org.timezone,
        isSelfServiceEnabled: org.isSelfServiceEnabled,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("updateOrganizationProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
