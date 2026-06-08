const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { supplier } = require("../middleware/validation");
const {
  getAll,
  getList,
  getById,
  create,
  update,
  remove,
  getSupplierReport,
  getSupplierLedger,
  addSupplierPayment
} = require("../controllers/supplierController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/list", getList);
router.get("/report", getSupplierReport);
router.get("/:id", getById);
router.get("/:id/ledger", getSupplierLedger);
router.post("/:id/payment", addSupplierPayment);
router.post("/", supplier.create, create);
router.put("/:id", supplier.update, update);
router.delete("/:id", remove);

module.exports = router;
