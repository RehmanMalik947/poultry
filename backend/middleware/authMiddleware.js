const jwt = require("jsonwebtoken");
const { SuperAdmin } = require("../models/superAdmin");

/**
 * Protect routes for Super Admin only.
 * Expects: Authorization: Bearer <token>
 * Sets req.adminId and req.role = 'super_admin'
 */
async function protectSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const admin = await SuperAdmin.findByPk(decoded.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    req.adminId = admin.id;
    req.role = "super_admin";
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
}

/**
 * Protect routes for organization (tenant) users only.
 * Expects: Authorization: Bearer <token>
 * JWT must contain organizationId (set on login for org users). Super Admin tokens are rejected.
 * Sets req.user = { id, email, organizationId, role }
 */
async function protectOrganization(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    if (decoded.isSuperAdmin || !decoded.organizationId) {
      return res.status(403).json({ success: false, message: "Access denied. Organization context required." });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
}

/**
 * Protect routes for either organization user (Admin) or staff (Manager/Cashier).
 * Sets req.user for org users, req.staff for staff logins.
 * Staff JWT has: staffId, email, organizationId, branchId, role, isStaff: true.
 */
async function protectStaffOrOrganization(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    if (decoded.isSuperAdmin) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    if (decoded.isStaff && decoded.staffId) {
      req.staff = {
        id: decoded.staffId,
        userId: decoded.id,

        email: decoded.email,
        organizationId: decoded.organizationId,
        branchId: decoded.branchId,
        role: decoded.role,
      };
      req.user = null;
    } else if (decoded.organizationId) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        organizationId: decoded.organizationId,
        role: decoded.role,
      };
      req.staff = null;
    } else {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
}

module.exports = {
  protectSuperAdmin,
  protectOrganization,
  protectStaffOrOrganization,
};
