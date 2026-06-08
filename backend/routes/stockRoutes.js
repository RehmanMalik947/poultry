const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { stock } = require("../middleware/validation");

const {
  getAllStocks,
  getStockById,
  manageStock,
  getLowStock,
  getVariance,
  transferStock,
  getStockLogs,
  getAllAdjustments,
  createAdjustment,
  getAllTransfers,
  createBulkTransfer,
} = require("../controllers/stockController");

const router = express.Router();

router.use(protectStaffOrOrganization);

// ✅ Specific routes FIRST
router.get("/", getAllStocks);
router.get("/low", getLowStock);
router.get("/variance", getVariance);
router.get("/logs", getStockLogs);      // ← moved up, before /:id

router.post("/manage", stock.manage, manageStock);
// Aakhir mein baki routes ke sath yeh add karein
router.get("/adjustments", getAllAdjustments);
router.post("/adjustments", stock.createAdjustment, createAdjustment);

router.get("/transfers", getAllTransfers);
router.post("/transfers", stock.createBulkTransfer, createBulkTransfer);

router.post("/transfer", stock.transfer, transferStock);

// ✅ Param route LAST
router.get("/:id", getStockById);       // ← always last

module.exports = router;