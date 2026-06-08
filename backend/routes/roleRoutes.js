const express = require("express");
const router = express.Router();
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { role } = require("../middleware/validation");
const {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

router.use(protectStaffOrOrganization);

router.get("/", getAllRoles);
router.post("/", role.create, createRole);
router.get("/:id", getRoleById);
router.put("/:id", role.update, updateRole);
router.delete("/:id", deleteRole);

module.exports = router;
