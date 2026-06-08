const { UserSalary, Staff, Branch } = require("../models");
const { Op } = require("sequelize");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (raw == null || raw === "") return null;
  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;
  const branch = await Branch.findOne({ where: { id: branchId, organizationId } });
  return branch ? branch.id : null;
}

function canEdit(req) {
  if (req.user) return true;
  if (req.staff && (req.staff.role === "Admin" || req.staff.role === "Manager")) return true;
  return false;
}

function staffToName(s) {
  if (!s) return null;
  const first = s.firstName || "";
  const last = s.lastName || "";
  return [first, last].filter(Boolean).join(" ").trim() || s.email || null;
}

function toJson(row, staff) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    branchId: row.branchId,
    staffId: row.staffId,
    staffName: staff ? staffToName(staff) : null,
    salaryType: row.salaryType,
    amount: parseFloat(row.amount),
    effectiveFrom: row.effectiveFrom,
    status: row.status,
    staffRole: staff ? staff.role : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * GET /api/user-salaries?page=1&limit=10
 * X-Branch-Id optional. List salaries for branch/org. Pagination.
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: list } = await UserSalary.findAndCountAll({
      where,
      include: [
        {
          model: Staff,
          as: "Staff",
          attributes: ["id", "firstName", "lastName", "email", "isActive","role"],
          where: { isActive: true },
          required: true,
        },
      ],
      order: [
        ["effectiveFrom", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    });

    const data = list.map((r) => toJson(r, r.Staff));
    return res.status(200).json({ success: true, data, total: count, page, limit });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("userSalary getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/user-salaries/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await UserSalary.findOne({
      where: { id, organizationId },
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] }],
    });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    return res.status(200).json({ success: true, data: toJson(row, row.Staff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("userSalary getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/user-salaries
 * Body: { staffId, salaryType, amount, effectiveFrom, branchId? }
 * Admin/Manager only.
 */
async function create(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can add salary." });
    }
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const staffId = req.body.staffId != null ? parseInt(req.body.staffId, 10) : null;
    const salaryType = req.body.salaryType;
    const amount = req.body.amount != null ? parseFloat(req.body.amount) : NaN;
    const effectiveFrom = req.body.effectiveFrom ? String(req.body.effectiveFrom).trim() : null;

    if (!staffId || Number.isNaN(staffId))
      return res.status(400).json({ success: false, message: "Valid staffId is required" });
    if (!["daily", "weekly", "monthly"].includes(salaryType))
      return res.status(400).json({ success: false, message: "salaryType must be daily, weekly, or monthly" });
    if (Number.isNaN(amount) || amount < 0)
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    if (!effectiveFrom) return res.status(400).json({ success: false, message: "effectiveFrom is required" });

    const staff = await Staff.findOne({ where: { id: staffId, organizationId, isActive: true } });
    if (!staff) return res.status(400).json({ success: false, message: "Staff not found or must be active to add salary." });

    const finalBranchId = branchId ?? req.body.branchId ?? staff.branchId ?? null;

    const row = await UserSalary.create({
      organizationId,
      branchId: finalBranchId,
      staffId,
      salaryType,
      amount,
      effectiveFrom,
      status: "active",
    });

    const created = await UserSalary.findByPk(row.id, {
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] }],
    });
    return res.status(201).json({ success: true, data: toJson(created, created.Staff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("userSalary create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/user-salaries/:id
 * Body: { salaryType?, amount?, effectiveFrom?, status? }
 */
async function update(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can edit salary." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await UserSalary.findOne({ where: { id, organizationId }, include: [{ model: Staff, as: "Staff" }] });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    if (req.body.salaryType && ["daily", "weekly", "monthly"].includes(req.body.salaryType)) row.salaryType = req.body.salaryType;
    if (req.body.amount != null) {
      const amount = parseFloat(req.body.amount);
      if (!Number.isNaN(amount) && amount >= 0) row.amount = amount;
    }
    if (req.body.effectiveFrom && String(req.body.effectiveFrom).trim()) row.effectiveFrom = String(req.body.effectiveFrom).trim();
    if (req.body.status && ["active", "inactive"].includes(req.body.status)) row.status = req.body.status;

    await row.save();

    const updated = await UserSalary.findByPk(row.id, {
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] }],
    });
    return res.status(200).json({ success: true, data: toJson(updated, updated.Staff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("userSalary update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/user-salaries/:id
 */
async function remove(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can delete salary." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await UserSalary.findOne({ where: { id, organizationId } });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });
    await row.destroy();
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("userSalary remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAll, getById, create, update, remove };
