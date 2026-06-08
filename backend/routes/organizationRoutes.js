const express = require("express");
const router = express.Router();
const { organizationRegister } = require("../middleware/validation");
const { register } = require("../controllers/organizationController");

router.post("/register", organizationRegister.create, register);

module.exports = router;
