const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { unit } = require("../middleware/validation");
const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require("../controllers/unitController"); // make sure the path is correct

const router = express.Router();

// Protect all routes so only authenticated staff or organization can access
router.use(protectStaffOrOrganization);

// Routes
router.get("/", getAll);        // GET all units (optionally filtered by branch)
router.get("/:id", getById);    // GET a single unit by ID
router.post("/", unit.create, create);       // POST create new unit
router.put("/:id", unit.update, update);     // PUT update unit by ID
router.delete("/:id", remove);  // DELETE remove unit by ID

module.exports = router;