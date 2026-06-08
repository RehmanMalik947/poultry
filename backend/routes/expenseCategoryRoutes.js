const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { expenseCategory } = require("../middleware/validation");
const { getAll, getById, create, update, remove } = require("../controllers/expenseCategoryController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", expenseCategory.create, create);
router.put("/:id", expenseCategory.update, update);
router.delete("/:id", remove);

module.exports = router;
