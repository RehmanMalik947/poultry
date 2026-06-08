const express = require("express");
const router = express.Router();
const bankController = require("../controllers/bankController");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { bank } = require("../middleware/validation");

router.use(protectStaffOrOrganization);

router.get("/", bankController.getAllBanks);
router.get("/:id", bankController.getBankById);
router.get("/:id/transactions", bankController.getBankTransactions);
router.post("/", bank.create, bankController.createBank);
router.put("/:id", bank.update, bankController.updateBank);
router.delete("/:id", bankController.deleteBank);

module.exports = router;
