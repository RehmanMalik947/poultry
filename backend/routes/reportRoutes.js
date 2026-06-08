const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { getPurchaseSaleReport, getStockReport, getSupplierCustomerReport, getStockAdjustmentReport, getProductSellReport, getPurchasePaymentReport, getSellPaymentReport, getExpenseReport, getCashRegisterReport, getActivityLogReport, getProfitLossReport, getTaxReport } = require("../controllers/reportController");
const router = express.Router();

// Apply auth middleware to all report routes
router.use(protectStaffOrOrganization);

router.get("/purchase-sale", getPurchaseSaleReport);
router.get("/supplier-customer", getSupplierCustomerReport);
router.get("/stock", getStockReport);
router.get("/stock-adjustment", getStockAdjustmentReport);
router.get('/product-sell', getProductSellReport);
router.get('/purchase-payment', getPurchasePaymentReport);
router.get('/sell-payment', getSellPaymentReport);
router.get('/expense', getExpenseReport);
router.get('/cash-register', getCashRegisterReport);
router.get('/activity-log', getActivityLogReport);
router.get('/profit-loss', getProfitLossReport);
router.get('/tax', getTaxReport);

module.exports = router;

