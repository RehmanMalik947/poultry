const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { package: packageValidation } = require("../middleware/validation");
const { getAll, getById, create, update, remove } = require("../controllers/packageController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", packageValidation.create, create);
router.put("/:id", packageValidation.update, update);
router.delete("/:id", remove);

module.exports = router;
