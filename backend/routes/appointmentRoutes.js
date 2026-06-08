const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { appointment } = require("../middleware/validation");
const {
  list,
  getById,
  create,
  update,
  remove,
  getToReschedule,
  getToday,
  getStats,
  checkIn,
  checkOut,
  getAvailableSlots,
} = require("../controllers/appointmentController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/stats", getStats);
router.get("/today", getToday);
router.get("/to-reschedule", getToReschedule);
router.get("/available-slots", getAvailableSlots);
router.get("/", list);
router.get("/:id", getById);
router.post("/book", appointment.create, create);
router.post("/", appointment.create, create);
router.post("/check-in/:id", checkIn);
router.post("/check-out/:id", checkOut);
router.patch("/:id", update);
router.delete("/:id", remove);

module.exports = router;
