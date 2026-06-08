const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { payroll } = require("../middleware/validation");
const { getAll, getHistory, getById, generate, markPaid, update, getSlip, listBonusDeductions, createBonusDeduction, deleteBonusDeduction, remove } = require("../controllers/payrollController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/history", getHistory);
router.get("/", getAll);
router.get("/:id/slip", getSlip);
router.get("/:payrollId/bonus-deductions", listBonusDeductions);
router.post("/:payrollId/bonus-deductions", payroll.createBonusDeduction, createBonusDeduction);
router.delete("/bonus-deductions/:id", deleteBonusDeduction);
router.get("/:id", getById);
router.post("/generate", payroll.generate, generate);
router.patch("/:id/paid", payroll.markPaid, markPaid);
router.put("/:id", payroll.update, update);
router.delete("/:id", remove);

module.exports = router;
