const { Category } = require("../models");
const { Branch } = require("../models/branch");
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

function canEditDelete(req) {
  if (req.user) return true;
  if (req.staff && (req.staff.role === "Admin" || req.staff.role === "Manager")) return true;
  return false;
}

async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (raw == null || raw === "") return null;
  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;
  const branch = await Branch.findOne({ where: { id: branchId, organizationId } });
  return branch ? branch.id : null;
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
    categoryType: cat.categoryType, 
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}

/**
 * GET /api/categories
 * Returns all categories for the current organization (filtered by branch if X-Branch-Id is set).
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
   const type = req.query.type; 
    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;
    
    if (type) {
      where[Op.or] = [
        { categoryType: type },
        { categoryType: "both" }
      ];
    }
    const list = await Category.findAll({
      where,
      order: [["name", "ASC"]],
    });
    
    return res.status(200).json({ success: true, data: list.map(toJson) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("category getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/categories/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const cat = await Category.findOne({ where: { id, organizationId } });
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, data: toJson(cat) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("category getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/categories
 * Body: { name, code?, description? }
 */
async function create(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can add categories." });
    }
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const name = req.body.name != null ? String(req.body.name).trim() : "";
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });
    const code = req.body.code != null ? String(req.body.code).trim() || null : null;
    const description = req.body.description != null ? String(req.body.description).trim() || null : null;
    let parentId = null;
    if (req.body.parentId) {
      parentId = parseInt(req.body.parentId, 10);
      if (Number.isNaN(parentId)) parentId = null;
    }
    const categoryType = req.body.categoryType || "both";
    const cat = await Category.create({ organizationId, branchId, name, categoryCode: code, description, parentId ,categoryType });
    return res.status(201).json({ success: true, data: toJson(cat) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("category create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/categories/:id
 * Body: { name?, code?, description? }
 */
async function update(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can edit categories." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const cat = await Category.findOne({ where: { id, organizationId } });
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    if (req.body.name !== undefined) cat.name = String(req.body.name).trim() || cat.name;
    if (req.body.code !== undefined) cat.categoryCode = req.body.code != null ? String(req.body.code).trim() || null : null;
    if (req.body.description !== undefined) cat.description = req.body.description != null ? String(req.body.description).trim() || null : null;
    if (req.body.parentId !== undefined) {
      if (req.body.parentId === null || req.body.parentId === "") cat.parentId = null;
      else {
        const pid = parseInt(req.body.parentId, 10);
        if (!Number.isNaN(pid) && pid !== cat.id) cat.parentId = pid;
      }
    }
    await cat.save();
    return res.status(200).json({ success: true, data: toJson(cat) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("category update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/categories/:id
 */
async function remove(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can delete categories." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const cat = await Category.findOne({ where: { id, organizationId } });
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    await cat.destroy();
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("category remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAll, getById, create, update, remove };
