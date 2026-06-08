const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { userSalary } = require("../middleware/validation");
const { getAll, getById, create, update, remove } = require("../controllers/userSalaryController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", userSalary.create, create);
router.put("/:id", userSalary.update, update);
router.delete("/:id", remove);

module.exports = router;
