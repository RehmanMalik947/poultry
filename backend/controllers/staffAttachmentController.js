const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Staff } = require("../models/staff");
const { StaffAttachment } = require("../models/staffAttachment");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

const uploadRoot = path.join(__dirname, "..", "uploads", "staff-attachments");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
});

// Accept up to 10 files at once under field name "files"
const uploadStaffAttachmentMiddleware = upload.array("files", 10);

/**
 * GET /api/staff/attachments - list all attachments for the org (optional branchId query)
 */
async function listAllAttachments(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchIdParam = req.query.branchId != null && req.query.branchId !== ""
      ? parseInt(req.query.branchId, 10)
      : null;

    const staffWhere = { organizationId };
    if (branchIdParam != null && !Number.isNaN(branchIdParam)) {
      staffWhere.branchId = branchIdParam;
    }

    const list = await StaffAttachment.findAll({
      where: { organizationId },
      include: [
        {
          model: Staff,
          as: "Staff",
          attributes: ["id", "firstName", "lastName", "branchId"],
          required: true,
          where: staffWhere,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const data = list.map((att) => {
      const plain = att.get({ plain: true });
      const staff = plain.Staff;
      const staffName = staff
        ? [staff.firstName, staff.lastName].filter(Boolean).join(" ").trim() || "—"
        : "—";
      return {
        id: plain.id,
        staffId: plain.staffId,
        staffName,
        fileName: plain.fileName,
        note: plain.note,
        mimeType: plain.mimeType,
        sizeBytes: plain.sizeBytes,
        uploadedAt: plain.createdAt,
        url: `/api/uploads/staff-attachments/${plain.storedFileName}`,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("listAllAttachments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function listStaffAttachments(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const staffId = parseInt(req.params.id, 10);
    if (Number.isNaN(staffId)) {
      return res.status(400).json({ success: false, message: "Invalid staff id" });
    }

    const staff = await Staff.findOne({ where: { id: staffId, organizationId } });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const list = await StaffAttachment.findAll({
      where: { organizationId, staffId },
      order: [["createdAt", "DESC"]],
    });

    const data = list.map((att) => {
      const plain = att.get({ plain: true });
      return {
        id: plain.id,
        staffId: plain.staffId,
        fileName: plain.fileName,
        note: plain.note,
        mimeType: plain.mimeType,
        sizeBytes: plain.sizeBytes,
        uploadedAt: plain.createdAt,
        url: `/api/uploads/staff-attachments/${plain.storedFileName}`,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("listStaffAttachments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function uploadStaffAttachment(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const staffId = parseInt(req.params.id, 10);
    if (Number.isNaN(staffId)) {
      const filesInvalid = Array.isArray(req.files) ? req.files : [];
      filesInvalid.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ success: false, message: "Invalid staff id" });
    }

    const staff = await Staff.findOne({ where: { id: staffId, organizationId } });
    if (!staff) {
      const filesNoStaff = Array.isArray(req.files) ? req.files : [];
      filesNoStaff.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "At least one attachment file is required" });
    }

    const note = req.body?.note ? String(req.body.note).trim() || null : null;

    const created = [];
    for (const file of files) {
      const attachment = await StaffAttachment.create({
        organizationId,
        staffId,
        fileName: file.originalname,
        storedFileName: path.basename(file.filename),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        note,
        uploadedByStaffId: req.staff?.id ?? null,
      });
      const plain = attachment.get({ plain: true });
      created.push({
        id: plain.id,
        staffId: plain.staffId,
        fileName: plain.fileName,
        note: plain.note,
        mimeType: plain.mimeType,
        sizeBytes: plain.sizeBytes,
        uploadedAt: plain.createdAt,
        url: `/api/uploads/staff-attachments/${plain.storedFileName}`,
      });
    }

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    console.error("uploadStaffAttachment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deleteStaffAttachment(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const staffId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    if (Number.isNaN(staffId) || Number.isNaN(attachmentId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const attachment = await StaffAttachment.findOne({
      where: { id: attachmentId, staffId, organizationId },
    });
    if (!attachment) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    const filePath = path.join(uploadRoot, attachment.storedFileName);
    await attachment.destroy();
    fs.unlink(filePath, () => {});

    return res.status(200).json({ success: true, message: "Attachment deleted" });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("deleteStaffAttachment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  uploadStaffAttachmentMiddleware,
  listAllAttachments,
  listStaffAttachments,
  uploadStaffAttachment,
  deleteStaffAttachment,
};

