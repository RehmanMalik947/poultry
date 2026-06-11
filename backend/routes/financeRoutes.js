const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { getProfitLoss, getCashFlow, getReceivables, getPayables, getRevenueBreakdown, getCogsBreakdown, getExpenseCategoryBreakdown, getDashboardSummary } = require("../controllers/financeController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/profit-loss", getProfitLoss);
router.get("/cash-flow", getCashFlow);
router.get("/receivables", getReceivables);
router.get("/payables", getPayables);
router.get("/revenue-breakdown", getRevenueBreakdown);
router.get("/cogs-breakdown", getCogsBreakdown);
router.get("/expense-category-breakdown", getExpenseCategoryBreakdown);
router.get("/dashboard-summary", getDashboardSummary);

module.exports = router;
