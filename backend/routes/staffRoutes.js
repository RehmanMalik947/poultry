const express = require("express");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { staff } = require("../middleware/validation");
const {
  getAllStaff,
  createStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getStaffLogs,
} = require("../controllers/staffController");
const {
  uploadStaffAttachmentMiddleware,
  listAllAttachments,
  listStaffAttachments,
  uploadStaffAttachment,
  deleteStaffAttachment,
} = require("../controllers/staffAttachmentController");

const router = express.Router();

router.use(protectStaffOrOrganization);

router.get("/", getAllStaff);
router.post("/", staff.create, createStaff);
router.get("/attachments", listAllAttachments);
router.get("/:id/logs", getStaffLogs);
router.get("/:id", getStaffById);
router.put("/:id", staff.update, updateStaff);
router.delete("/:id", deleteStaff);

// Staff attachments
router.get("/:id/attachments", listStaffAttachments);
router.post("/:id/attachments", uploadStaffAttachmentMiddleware, uploadStaffAttachment);
router.delete("/:id/attachments/:attachmentId", deleteStaffAttachment);

module.exports = router;
