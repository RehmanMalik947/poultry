const express = require("express");
const router = express.Router();
const registerController = require("../controllers/registerController");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { cashRegister } = require("../middleware/validation");

router.use(protectStaffOrOrganization);

// The middleware checking auth and permissions will be applied in app.js
router.get("/current", registerController.getCurrentRegister);
router.get("/:id", registerController.getRegisterById);
router.post("/open", cashRegister.open, registerController.openRegister);
router.post("/close", cashRegister.close, registerController.closeRegister);
router.post("/transaction", cashRegister.addTransaction, registerController.addTransaction);

module.exports = router;
