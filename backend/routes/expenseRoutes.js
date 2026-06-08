const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { expense } = require("../middleware/validation");
const { getSummary, getAll, getById, create, update, remove } = require("../controllers/expenseController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/summary", getSummary);
router.get("/", getAll);
router.get("/:id", getById);
router.post("/", expense.create, create);
router.put("/:id", expense.update, update);
router.delete("/:id", remove);

module.exports = router;
