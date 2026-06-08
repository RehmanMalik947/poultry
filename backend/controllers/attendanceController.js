const { Attendance, Staff, Branch } = require("../models");
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
    date: row.date,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * GET /api/attendances?page=1&limit=10&from=YYYY-MM-DD&to=YYYY-MM-DD
 * X-Branch-Id required for branch-scoped list. Pagination.
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;

    const staffId = req.query.staffId ? parseInt(req.query.staffId, 10) : null;
    if (staffId && !Number.isNaN(staffId)) {
      where.staffId = staffId;
    }

    const from = req.query.from ? String(req.query.from).trim() : null;
    const to = req.query.to ? String(req.query.to).trim() : null;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: list } = await Attendance.findAndCountAll({
      where,
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] }],
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    });

    const data = list.map((r) => toJson(r, r.Staff));
    return res.status(200).json({ success: true, data, total: count, page, limit });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("attendance getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/attendances/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await Attendance.findOne({
      where: { id, organizationId },
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] }],
    });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    return res.status(200).json({ success: true, data: toJson(row, row.Staff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("attendance getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/attendances
 * Body: { staffId, date, status } or bulk: { date, branchId, entries: [ { staffId, status } ] }
 * Admin/Manager only for create.
 */
async function create(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can add attendance." });
    }
    const organizationId = getOrganizationId(req);
    let branchId = await getBranchIdFromHeader(req, organizationId);

    const bulk = req.body.entries && Array.isArray(req.body.entries);
    if (bulk) {
      const date = req.body.date ? String(req.body.date).trim() : null;
      if (!date) return res.status(400).json({ success: false, message: "date is required for bulk" });
      branchId = branchId ?? (req.body.branchId != null ? parseInt(req.body.branchId, 10) : null);
      if (branchId == null) return res.status(400).json({ success: false, message: "branchId or X-Branch-Id required" });

      const branch = await Branch.findOne({ where: { id: branchId, organizationId } });
      if (!branch) return res.status(400).json({ success: false, message: "Branch not found" });

      const results = [];
      for (const ent of req.body.entries) {
        const staffId = ent.staffId != null ? parseInt(ent.staffId, 10) : null;
        const status = ["present", "absent", , "leave", "late"].includes(ent.status) ? ent.status : "present";
        if (!staffId) continue;

        const staff = await Staff.findOne({ where: { id: staffId, organizationId, isActive: true } });
        if (!staff) continue;

        const [row, wasCreated] = await Attendance.findOrCreate({
          where: { organizationId, branchId, staffId, date },
          defaults: { organizationId, branchId, staffId, date, status },
        });
        if (!wasCreated) await row.update({ status });
        const withStaff = await Attendance.findByPk(row.id, {
          include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] }],
        });
        results.push(toJson(withStaff, withStaff.Staff));
      }
      return res.status(201).json({ success: true, data: results });
    }

    const staffId = req.body.staffId != null ? parseInt(req.body.staffId, 10) : null;
    const date = req.body.date ? String(req.body.date).trim() : null;
    const status = ["present", "absent", "leave", "late"].includes(req.body.status) ? req.body.status : "present";

    if (!staffId) return res.status(400).json({ success: false, message: "staffId is required" });
    if (!date) return res.status(400).json({ success: false, message: "date is required" });

    const staff = await Staff.findOne({ where: { id: staffId, organizationId, isActive: true } });
    if (!staff) return res.status(400).json({ success: false, message: "Staff not found or must be active for attendance." });

    branchId = branchId ?? staff.branchId;
    if (branchId == null) return res.status(400).json({ success: false, message: "branchId or X-Branch-Id required" });

    const [row, created] = await Attendance.findOrCreate({
      where: { organizationId, branchId, staffId, date },
      defaults: { organizationId, branchId, staffId, date, status },
    });
    if (!created) await row.update({ status });

    const withStaff = await Attendance.findByPk(row.id, {
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] }],
    });
    return res.status(201).json({ success: true, data: toJson(withStaff, withStaff.Staff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("attendance create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/attendances/:id
 * Body: { status? }
 */
async function update(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can edit attendance." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await Attendance.findOne({ where: { id, organizationId }, include: [{ model: Staff, as: "Staff" }] });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    if (req.body.status && ["present", "absent", , "leave", "late"].includes(req.body.status)) row.status = req.body.status;

    await row.save();

    const updated = await Attendance.findByPk(row.id, {
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] }],
    });
    return res.status(200).json({ success: true, data: toJson(updated, updated.Staff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("attendance update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/attendances/:id
 */
async function remove(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can delete attendance." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await Attendance.findOne({ where: { id, organizationId } });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });
    await row.destroy();
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("attendance remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAll, getById, create, update, remove };
