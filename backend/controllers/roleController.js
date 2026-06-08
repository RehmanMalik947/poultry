const { Role } = require("../models/role");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

function isAdmin(req) {
  if (req.user) return true;
  if (req.staff && req.staff.role === "Admin") return true;
  return false;
}

/**
 * GET /api/roles
 * List all roles for the organization.
 */
async function getAllRoles(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const roles = await Role.findAll({
      where: { organizationId },
      order: [["name", "ASC"]],
      attributes: ["id", "name", "permissions", "createdAt", "updatedAt"],
    });
    const data = roles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getAllRoles error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/roles
 * Body: { name, permissions? } - permissions is array of permission id strings
 * Only Admin can create roles.
 */
async function createRole(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Only Admin can create roles" });
    }
    const organizationId = getOrganizationId(req);
    const { name, permissions } = req.body;
    const roleName = name != null ? String(name).trim() : "";
    if (!roleName) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }
    const existing = await Role.findOne({
      where: { organizationId, name: roleName },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "A role with this name already exists" });
    }
    const permArray = Array.isArray(permissions)
      ? permissions.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim())
      : [];
    const role = await Role.create({
      name: roleName,
      organizationId,
      permissions: permArray,
    });
    return res.status(201).json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("createRole error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/roles/:id
 */
async function getRoleById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid role id" });
    }
    const role = await Role.findOne({ where: { id, organizationId } });
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    return res.status(200).json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getRoleById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/roles/:id
 * Body: { name?, permissions? }
 * Only Admin can update roles.
 */
async function updateRole(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Only Admin can edit roles" });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid role id" });
    }
    const role = await Role.findOne({ where: { id, organizationId } });
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    const { name, permissions } = req.body;
    if (name != null) {
      const roleName = String(name).trim();
      if (!roleName) {
        return res.status(400).json({ success: false, message: "Role name cannot be empty" });
      }
      const existing = await Role.findOne({
        where: { organizationId, name: roleName },
      });
      if (existing && existing.id !== role.id) {
        return res.status(409).json({ success: false, message: "A role with this name already exists" });
      }
      role.name = roleName;
    }
    if (permissions !== undefined) {
      const permArray = Array.isArray(permissions)
        ? permissions.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim())
        : [];
      role.permissions = permArray;
    }
    await role.save();
    return res.status(200).json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("updateRole error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/roles/:id
 * Only Admin can delete roles.
 */
async function deleteRole(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Only Admin can delete roles" });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid role id" });
    }
    const deleted = await Role.destroy({ where: { id, organizationId } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    return res.status(200).json({ success: true, message: "Role deleted" });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("deleteRole error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
};
