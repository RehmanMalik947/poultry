const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { getAll, getById, getCogs, getNextCode, create, update, remove } = require("../controllers/serviceController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAll);
router.get("/cogs", getCogs);
router.get("/next-code", getNextCode);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id" ,update);
router.delete("/:id", remove);

module.exports = router;
