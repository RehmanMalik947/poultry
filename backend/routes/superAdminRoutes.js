const express = require("express");
const router = express.Router();
const { login, getMe } = require("../controllers/superAdminController");
const { getDashboardStats } = require("../controllers/dashboardController");
const { getPlans, createPlan, updatePlan } = require("../controllers/plansController");
const {
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  approveOrganization,
  suspendOrganization,
  activateOrganization,
  deleteOrganization,
} = require("../controllers/organizationListController");
const { protectSuperAdmin } = require("../middleware/authMiddleware");
const { superAdmin, plan } = require("../middleware/validation");

router.post("/login", superAdmin.login, login);
router.get("/me", protectSuperAdmin, getMe);

// Dashboard & stats
router.get("/dashboard-stats", protectSuperAdmin, getDashboardStats);

// Tenants / Stores (alias: tenants?status=ACTIVE or organizations?status=active)
router.get("/tenants", protectSuperAdmin, (req, res, next) => {
  if (req.query.status) req.query.status = String(req.query.status).toLowerCase();
  listOrganizations(req, res).catch(next);
});
router.get("/organizations", protectSuperAdmin, listOrganizations);
router.get("/organizations/:id", protectSuperAdmin, getOrganizationById);
router.put("/organizations/:id", protectSuperAdmin, updateOrganization);
router.post("/organizations/:id/approve", protectSuperAdmin, approveOrganization);
router.post("/organizations/:id/suspend", protectSuperAdmin, suspendOrganization);
router.post("/organizations/:id/activate", protectSuperAdmin, activateOrganization);
router.delete("/organizations/:id", protectSuperAdmin, deleteOrganization);
router.post("/tenants/:id/approve", protectSuperAdmin, approveOrganization);
router.post("/tenants/:id/suspend", protectSuperAdmin, suspendOrganization);

// Plans
router.get("/plans", protectSuperAdmin, getPlans);
router.post("/plans", protectSuperAdmin, plan.create, createPlan);
router.put("/plans/:id", protectSuperAdmin, plan.update, updatePlan);

module.exports = router;
