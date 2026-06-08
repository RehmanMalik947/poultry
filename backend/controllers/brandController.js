const { Brand } = require("../models");
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

function toJson(brand) {
    return {
        id: brand.id,
        organizationId: brand.organizationId,
        branchId: brand.branchId ?? null,
        name: brand.name,
        description: brand.description ?? null,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
    };
}

/**
 * GET /api/brands
 */
async function getAll(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const where = { organizationId };
        if (branchId != null) where.branchId = branchId;
        const list = await Brand.findAll({
            where,
            order: [["name", "ASC"]],
        });
        return res.status(200).json({ success: true, data: list.map(toJson) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Brand getAll error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * GET /api/brands/:id
 */
async function getById(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const brand = await Brand.findOne({ where: { id, organizationId } });
        if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
        return res.status(200).json({ success: true, data: toJson(brand) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Brand getById error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * POST /api/brands
 */
async function create(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can add brands." });
        }
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const name = req.body.name != null ? String(req.body.name).trim() : "";
        if (!name) return res.status(400).json({ success: false, message: "Brand name is required" });
        const description = req.body.description != null ? String(req.body.description).trim() : null;

        const brand = await Brand.create({
            organizationId,
            branchId,
            name,
            description
        });
        return res.status(201).json({ success: true, data: toJson(brand) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Brand create error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * PUT /api/brands/:id
 */
async function update(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can edit brands." });
        }
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const brand = await Brand.findOne({ where: { id, organizationId } });
        if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

        if (req.body.name !== undefined) brand.name = String(req.body.name).trim() || brand.name;
        if (req.body.description !== undefined) brand.description = req.body.description;

        await brand.save();
        return res.status(200).json({ success: true, data: toJson(brand) });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Brand update error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/**
 * DELETE /api/brands/:id
 */
async function remove(req, res) {
    try {
        if (!canEditDelete(req)) {
            return res.status(403).json({ success: false, message: "Only Admin or Manager can delete brands." });
        }
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const brand = await Brand.findOne({ where: { id, organizationId } });
        if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
        await brand.destroy();
        return res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
        if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
        console.error("Brand remove error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { getAll, getById, create, update, remove };
