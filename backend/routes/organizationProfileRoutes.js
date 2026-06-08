const express = require("express");
const router = express.Router();
const { protectOrganization } = require("../middleware/authMiddleware");
const { organizationProfile } = require("../middleware/validation");
const { getProfile, updateProfile } = require("../controllers/organizationProfileController");

router.use(protectOrganization);

router.get("/profile", getProfile);
router.put("/profile", organizationProfile.update, updateProfile);

module.exports = router;
