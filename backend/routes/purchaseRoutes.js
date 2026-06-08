const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");

router.use(protectStaffOrOrganization);

router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);

// ── Static paths BEFORE /:id wildcard ──────────────────────────────────────
router.get("/returns", purchaseController.getAllPurchaseReturns);
router.get("/return/:returnId", purchaseController.getPurchaseReturnById);
router.post("/return/:returnId/payment", purchaseController.addPurchaseReturnPayment);

// ── Dynamic :id routes ──────────────────────────────────────────────────────
router.get("/:id", purchaseController.getPurchaseById);
router.delete("/:id", purchaseController.deletePurchase);
router.post("/:id/payment", purchaseController.addPayment);
router.get("/:id/payments", purchaseController.getPurchasePayments);
router.post("/:purchaseId/return", purchaseController.createPurchaseReturn);
router.get("/:purchaseId/returns", purchaseController.listPurchaseReturns);

module.exports = router;
