const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { brand } = require("../middleware/validation");
const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require("../controllers/brandController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", brand.create, create);
router.put("/:id", brand.update, update);
router.delete("/:id", remove);

module.exports = router;
