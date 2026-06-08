const { Unit } = require("../models");
const { Branch } = require("../models/branch");

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

function toJson(unit) {
    return {
        id: unit.id,
        organizationId: unit.organizationId,
        branchId: unit.branchId ?? null,
        name: unit.name,
        shortName: unit.shortName ?? null,
        allowDecimal: unit.allowDecimal ?? false,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
    };
}

/**
 * GET /api/units
 * Returns all units for the current organization (filtered by branch if X-Branch-Id is set).
 */
async function getAll(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const where = { organizationId };
        if (branchId != null) where.branchId = branchId;
        const list = await Unit.findAll({
            where,
            order: [["name", "ASC"]],
        });
        return res.status(200).json({ success: true, data: list.map(toJson) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Unit getAll error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * GET /api/units/:id
 */
async function getById(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const unit = await Unit.findOne({ where: { id, organizationId } });
        if (!unit) return res.status(404).json({ success: false, message: "Unit not found" });
        return res.status(200).json({ success: true, data: toJson(unit) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Unit getById error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * POST /api/units
 * Body: { name, shortName, allowDecimal }
 */
async function create(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can add units." });
        }
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const name = req.body.name != null ? String(req.body.name).trim() : "";
        if (!name) return res.status(400).json({ success: false, message: "Unit name is required" });
        const shortName = req.body.shortName != null ? String(req.body.shortName).trim() : "";
        if (!shortName) return res.status(400).json({ success: false, message: "Short name is required" });
        
        const allowDecimal = req.body.allowDecimal === true || req.body.allowDecimal === "true" || req.body.allowDecimal === "yes";

        const unit = await Unit.create({ 
            organizationId, 
            branchId, 
            name, 
            shortName, 
            allowDecimal 
        });
        return res.status(201).json({ success: true, data: toJson(unit) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Unit create error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * PUT /api/units/:id
 * Body: { name?, shortName?, allowDecimal? }
 */
async function update(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can edit units." });
        }
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const unit = await Unit.findOne({ where: { id, organizationId } });
        if (!unit) return res.status(404).json({ success: false, message: "Unit not found" });

        if (req.body.name !== undefined) unit.name = String(req.body.name).trim() || unit.name;
        if (req.body.shortName !== undefined) unit.shortName = String(req.body.shortName).trim() || unit.shortName;
        if (req.body.allowDecimal !== undefined) {
             unit.allowDecimal = req.body.allowDecimal === true || req.body.allowDecimal === "true" || req.body.allowDecimal === "yes";
        }

        await unit.save();
        return res.status(200).json({ success: true, data: toJson(unit) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Unit update error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * DELETE /api/units/:id
 */
async function remove(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can delete units." });
        }
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const unit = await Unit.findOne({ where: { id, organizationId } });
        if (!unit) return res.status(404).json({ success: false, message: "Unit not found" });
        await unit.destroy();
        return res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Unit remove error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { getAll, getById, create, update, remove };
