const { ExpenseCategory } = require("../models");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

function canEditDelete(req) {
  if (req.user) return true;
  if (req.staff && (req.staff.role === "Admin" || req.staff.role === "Manager")) return true;
  return false;
}

function toJson(cat) {
  return {
    id: cat.id,
    organizationId: cat.organizationId,
    branchId: cat.branchId ?? null,
    name: cat.name,
    code: cat.categoryCode ?? null,
    parentId: cat.parentId ?? null,
    description: cat.description ?? null,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}

/* ─────────────────────────────────────────────
   GET ALL (Paginated)
───────────────────────────────────────────── */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await ExpenseCategory.findAndCountAll({
      where: { organizationId },
      order: [
        ["parentId", "ASC"], // parents first
        ["name", "ASC"],
      ],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(toJson),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });

    console.error("getAll expenseCategory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ─────────────────────────────────────────────
   GET BY ID
───────────────────────────────────────────── */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id);

    if (!id)
      return res.status(400).json({ success: false, message: "Invalid id" });

    const cat = await ExpenseCategory.findOne({
      where: { id, organizationId },
    });

    if (!cat)
      return res.status(404).json({ success: false, message: "Not found" });

    return res.status(200).json({
      success: true,
      data: toJson(cat),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ─────────────────────────────────────────────
   CREATE CATEGORY (WITH PARENT SUPPORT)
───────────────────────────────────────────── */
async function create(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can create categories",
      });
    }

    const organizationId = getOrganizationId(req);

    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const parentId =
      req.body.parentId && req.body.parentId !== "none"
        ? Number(req.body.parentId)
        : null;

    // ❗ Prevent self parent (safety)
    if (parentId && req.body.id && parentId === Number(req.body.id)) {
      return res.status(400).json({
        success: false,
        message: "Category cannot be its own parent",
      });
    }

    const cat = await ExpenseCategory.create({
      organizationId,
      branchId: req.body.branchId || null,
      name,
      categoryCode: req.body.code || null,
      description: req.body.description || null,
      parentId,
    });

    return res.status(201).json({
      success: true,
      data: toJson(cat),
    });
  } catch (err) {
    console.error("create expenseCategory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ─────────────────────────────────────────────
   UPDATE CATEGORY
───────────────────────────────────────────── */
async function update(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can update categories",
      });
    }

    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id);

    if (!id)
      return res.status(400).json({ success: false, message: "Invalid id" });

    const cat = await ExpenseCategory.findOne({
      where: { id, organizationId },
    });

    if (!cat)
      return res.status(404).json({ success: false, message: "Not found" });

    if (req.body.name !== undefined)
      cat.name = req.body.name.trim();

    if (req.body.code !== undefined)
      cat.categoryCode = req.body.code;

    if (req.body.description !== undefined)
      cat.description = req.body.description;

    if (req.body.parentId !== undefined) {
      cat.parentId =
        req.body.parentId !== "none"
          ? Number(req.body.parentId)
          : null;
    }
    if (req.body.parentId !== undefined) {
  const p = req.body.parentId;

  cat.parentId =
    p && p !== "none" && p !== "0"
      ? Number(p)
      : null;
}

    await cat.save();

    return res.status(200).json({
      success: true,
      data: toJson(cat),
    });
  } catch (err) {
    console.error("update expenseCategory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ─────────────────────────────────────────────
   DELETE CATEGORY
───────────────────────────────────────────── */
async function remove(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can delete categories",
      });
    }

    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id);

    if (!id)
      return res.status(400).json({ success: false, message: "Invalid id" });

    const cat = await ExpenseCategory.findOne({
      where: { id, organizationId },
    });

    if (!cat)
      return res.status(404).json({ success: false, message: "Not found" });

    await cat.destroy();

    return res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("delete expenseCategory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};