const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { category } = require("../middleware/validation");
const { getAll, getById, create, update, remove } = require("../controllers/categoryController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", category.create, create);
router.put("/:id", category.update, update);
router.delete("/:id", remove);

module.exports = router;
