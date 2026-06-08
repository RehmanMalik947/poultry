const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { attendance } = require("../middleware/validation");
const { getAll, getById, create, update, remove } = require("../controllers/attendanceController");

const router = express.Router();

router.use(protectStaffOrOrganization);

// Bulk route (specific)
router.post("/bulk", attendance.create, create);

// Regular CRUD routes
router.get("/", getAll);
router.get("/:id", getById);
router.post("/", attendance.create, create);
router.put("/:id", attendance.update, update);
router.delete("/:id", remove);

module.exports = router;