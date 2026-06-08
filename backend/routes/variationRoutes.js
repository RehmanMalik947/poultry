const express = require("express");
const router = express.Router();
const controller = require("../controllers/variationController");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { variation } = require("../middleware/validation");

// All routes require authentication
router.use(protectStaffOrOrganization);

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", variation.create, controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
