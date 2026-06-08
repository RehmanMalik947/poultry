const { Branch } = require("../models/branch");

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
 * POST /api/branches
 * Body: { name, address?, phone? }
 */
async function createBranch(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { name, address, phone } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Branch name is required" });
    }

    const branch = await Branch.create({
      name: name.trim(),
      address: address != null ? String(address).trim() || null : null,
      phone: phone != null ? String(phone).trim() || null : null,
      organizationId,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        organizationId: branch.organizationId,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("createBranch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/branches
 * Returns all branches for the current organization (organization_id from JWT).
 * Equivalent SQL: SELECT * FROM branches WHERE organization_id = ? ORDER BY created_at DESC;
 */
async function getAllBranches(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    const branches = await Branch.findAll({
      where: { organizationId },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ success: true, data: branches });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getAllBranches error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/branches/:id
 */
async function getBranchById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;

    const branch = await Branch.findOne({
      where: { id: Number(id), organizationId },
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        organizationId: branch.organizationId,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getBranchById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/branches/:id
 * Body: { name?, address?, phone? }
 */
async function updateBranch(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;
    const { name, address, phone } = req.body;

    const branch = await Branch.findOne({
      where: { id: Number(id), organizationId },
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Branch name cannot be empty" });
      }
      branch.name = name.trim();
    }
    if (address !== undefined) branch.address = address != null ? String(address).trim() || null : null;
    if (phone !== undefined) branch.phone = phone != null ? String(phone).trim() || null : null;

    await branch.save();

    return res.status(200).json({
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        organizationId: branch.organizationId,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("updateBranch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/branches/:id
 */
async function deleteBranch(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;

    const branch = await Branch.findOne({
      where: { id: Number(id), organizationId },
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    await branch.destroy();
    return res.status(200).json({ success: true, message: "Branch deleted" });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("deleteBranch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};
