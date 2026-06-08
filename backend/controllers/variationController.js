const { Variation } = require("../models");
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

function toJson(v) {
    let vals = v.values;
    if (typeof vals === "string") {
        try {
            vals = JSON.parse(vals);
        } catch (e) {
            vals = [];
        }
    }
    return {
        id: v.id,
        organizationId: v.organizationId,
        branchId: v.branchId ?? null,
        name: v.name,
        values: Array.isArray(vals) ? vals : [],
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
    };
}

/**
 * GET /api/variations
 */
async function getAll(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const where = { organizationId };
        if (branchId != null) where.branchId = branchId;
        const list = await Variation.findAll({
            where,
            order: [["name", "ASC"]],
        });
        return res.status(200).json({ success: true, data: list.map(toJson) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Variation getAll error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * GET /api/variations/:id
 */
async function getById(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const v = await Variation.findOne({ where: { id, organizationId } });
        if (!v) return res.status(404).json({ success: false, message: "Variation not found" });
        return res.status(200).json({ success: true, data: toJson(v) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Variation getById error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * POST /api/variations
 */
async function create(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can add variations." });
        }
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const name = req.body.name != null ? String(req.body.name).trim() : "";
        if (!name) return res.status(400).json({ success: false, message: "Variation name is required" });
        
        let values = req.body.values;
        if (!Array.isArray(values)) {
            values = [];
        }

        const v = await Variation.create({ 
            organizationId, 
            branchId, 
            name, 
            values 
        });
        return res.status(201).json({ success: true, data: toJson(v) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Variation create error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * PUT /api/variations/:id
 */
async function update(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can edit variations." });
        }
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const v = await Variation.findOne({ where: { id, organizationId } });
        if (!v) return res.status(404).json({ success: false, message: "Variation not found" });

        if (req.body.name !== undefined) v.name = String(req.body.name).trim() || v.name;
        if (req.body.values !== undefined && Array.isArray(req.body.values)) v.values = req.body.values;

        await v.save();
        return res.status(200).json({ success: true, data: toJson(v) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Variation update error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * DELETE /api/variations/:id
 */
async function remove(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can delete variations." });
        }
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const v = await Variation.findOne({ where: { id, organizationId } });
        if (!v) return res.status(404).json({ success: false, message: "Variation not found" });
        await v.destroy();
        return res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Variation remove error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { getAll, getById, create, update, remove };
