const { Organization } = require("../models/organization");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sendApprovalNotification } = require("../utils/sendEmail");
const { User } = require("../models/users");
const { randomPassword } = require("../utils/randomPassword");
const { sendLoginCredentials } = require("../utils/sendEmail");
const DEFAULT_PASSWORD = "123456";

/**
 * List all organizations (for Super Admin panel)
 * GET /api/super-admin/organizations
 * Query: ?status=pending|active|suspended|deleted (optional; default excludes deleted)
 */
async function listOrganizations(req, res) {
  try {
    const { status: statusFilter } = req.query;
    const q = String(statusFilter || "").toLowerCase();
    let where = {};
    if (q === "pending") {
      where = { [Op.or]: [{ status: "pending" }, { status: null }] };
    } else if (q === "active") {
      where = { status: "active" };
    } else if (q === "suspended") {
      where = { status: "suspended" };
    } else if (q === "deleted") {
      where = { status: "deleted" };
    } else {
      where = { [Op.or]: [{ status: null }, { status: { [Op.ne]: "deleted" } }] };
    }
    const orgs = await Organization.findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "emergencyContact",
        "address",
        "totalEmployees",
        "industryCategory",
        "status",
        "subscriptionPlan",
        "createdAt",
      ],
    });
    const data = orgs.map((o) => o.get({ plain: true }));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("List organizations error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Suspend a store/tenant
 * POST /api/super-admin/organizations/:id/suspend
 */
async function suspendOrganization(req, res) {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    await org.update({ status: "suspended" });
    return res.status(200).json({ success: true, data: { id: org.id, status: "suspended" }, message: "Organization suspended." });
  } catch (err) {
    console.error("Suspend organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Activate a suspended store/tenant (set status to active)
 * POST /api/super-admin/organizations/:id/activate
 */
async function activateOrganization(req, res) {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    await org.update({ status: "active" });
    return res.status(200).json({ success: true, data: { id: org.id, status: "active" }, message: "Organization activated." });
  } catch (err) {
    console.error("Activate organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Soft-delete an organization (set status = deleted)
 * DELETE /api/super-admin/organizations/:id
 */
async function deleteOrganization(req, res) {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    await org.update({ status: "deleted" });
    return res.status(200).json({ success: true, data: { id: org.id }, message: "Organization removed." });
  } catch (err) {
    console.error("Delete organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Get a single organization by id (for Super Admin edit)
 * GET /api/super-admin/organizations/:id
 */
async function getOrganizationById(req, res) {
  try {
    const org = await Organization.findByPk(req.params.id, {
      attributes: [
        "id", "name", "email", "phone", "emergencyContact", "address",
        "totalEmployees", "industryCategory", "timezone", "status", "subscriptionPlan", "createdAt",
      ],
    });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    return res.status(200).json({ success: true, data: org.get({ plain: true }) });
  } catch (err) {
    console.error("Get organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Update organization (Super Admin only)
 * PUT /api/super-admin/organizations/:id
 * Body: name?, email?, phone?, emergencyContact?, address?, totalEmployees?, industryCategory?, timezone?, status?, subscriptionPlan?
 */
async function updateOrganization(req, res) {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    const allowed = [
      "name", "email", "phone", "emergencyContact", "address",
      "totalEmployees", "industryCategory", "timezone", "status", "subscriptionPlan",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "totalEmployees" && req.body[key] !== null && req.body[key] !== "") {
          updates[key] = parseInt(req.body[key], 10) || null;
        } else if (key === "name" || key === "email" || key === "phone") {
          updates[key] = req.body[key] != null ? String(req.body[key]).trim() : req.body[key];
        } else {
          updates[key] = req.body[key] != null && req.body[key] !== "" ? req.body[key] : null;
        }
      }
    }
    if (updates.email) updates.email = updates.email.toLowerCase();
    await org.update(updates);
    return res.status(200).json({
      success: true,
      data: org.get({ plain: true }),
      message: "Organization updated.",
    });
  } catch (err) {
    console.error("Update organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Approve organization: Super Admin selects plan, then status is set to active
 * POST /api/super-admin/organizations/:id/approve
 * Body: { subscriptionPlan?: "Basic" | "Pro" | "Enterprise" | plan name }
 */
async function approveOrganization(req, res) {
  try {
    const { id } = req.params;
    const { subscriptionPlan } = req.body || {};
    const org = await Organization.findByPk(id);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }
    const planName = subscriptionPlan && String(subscriptionPlan).trim() ? String(subscriptionPlan).trim() : null;
    await org.update({
      status: "active",
      ...(planName && { subscriptionPlan: planName }),
    });

    // Generate a new random password
    const plainPassword = randomPassword(12);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update the Admin User associated with the organization
    const user = await User.findOne({ where: { organizationId: org.id, role: "ADMIN" } });
    if (user) {
      user.password = hashedPassword;
      await user.save();
    }

    // Send the plain text password via email
    const emailResult = await sendLoginCredentials(org.email, org.name, org.name, plainPassword);

    if (!emailResult.sent) {
      console.log("[EMAIL] Could not send (configure SMTP in .env):", org.email, emailResult.error);
    }
    return res.status(200).json({
      success: true,
      message: emailResult.sent ? "Organization approved and credentials sent." : "Organization approved. Configure SMTP to send email.",
      data: { id: org.id, email: org.email, name: org.name, status: "active", subscriptionPlan: planName || org.subscriptionPlan },
    });
  } catch (err) {
    console.error("Approve organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  approveOrganization,
  suspendOrganization,
  activateOrganization,
  deleteOrganization,
};
