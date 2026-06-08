const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { sale } = require("../middleware/validation");
const {
  startSale,
  addItemToSale,
  removeItemFromSale,
  getCurrentSale,
  updateSale,
  processPayment,
  getSalesList,
  deleteSale,
  getCustomers,
  getBanks,
  submitSale,
  createSaleReturn,
  listSaleReturns,
  getSaleReturnById,
  addSaleReturnPayment,
  deleteSaleReturn
} = require("../controllers/saleController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/sales", getSalesList);
router.get("/customers", getCustomers);
router.get("/sale/:saleId", getCurrentSale);
router.post("/sale/submit", sale.submit, submitSale);
router.patch("/sale/:saleId", sale.update, updateSale);
router.delete("/sale/:saleId", deleteSale);
router.post("/sale/:saleId/item", sale.addItem, addItemToSale);
router.delete("/sale/:saleId/item/:itemId", removeItemFromSale);
router.post("/sale/:saleId/pay", sale.processPayment, processPayment);
router.get("/banks", getBanks);
router.post("/returns", sale.createReturn, createSaleReturn);
router.get("/returns", listSaleReturns);
router.get("/returns/:id", getSaleReturnById);
router.post("/returns/:id/pay", sale.addReturnPayment, addSaleReturnPayment);
router.delete("/returns/:id", deleteSaleReturn);

module.exports = router;
