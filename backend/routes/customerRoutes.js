const express = require("express");
const router = express.Router();
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { customer } = require("../middleware/validation");
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerReport,
  getCustomerLastServices,
  getCustomerHistory,

} = require("../controllers/customerController");

router.use(protectStaffOrOrganization);

router.post("/", customer.create, createCustomer);
router.get("/", getAllCustomers);
router.get("/report", getCustomerReport);
router.get("/:id/last-services", getCustomerLastServices);
router.get("/:id", getCustomerById);
router.put("/:id", customer.update, updateCustomer);
router.delete("/:id", deleteCustomer);
router.get("/:id/history", getCustomerHistory);

module.exports = router;