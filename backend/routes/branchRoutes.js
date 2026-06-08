const express = require("express");
const router = express.Router();
const { protectOrganization } = require("../middleware/authMiddleware");
const { branch } = require("../middleware/validation");
const {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");

router.use(protectOrganization);

router.post("/", branch.create, createBranch);
router.get("/", getAllBranches);
router.get("/:id", getBranchById);
router.put("/:id", branch.update, updateBranch);
router.delete("/:id", deleteBranch);

module.exports = router;
