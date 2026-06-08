const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { decryptOrgId } = require("../utils/cryptoHelper");
const { Organization, Branch, Service, Package, Staff, Customer, Appointment, Category, StaffService } = require("../models");

async function validateSelfService(orgId, res) {
  if (!orgId) {
    res.status(400).json({ success: false, message: "Invalid orgId" });
    return false;
  }
  const org = await Organization.findByPk(orgId);
  if (!org) {
    res.status(404).json({ success: false, message: "Organization not found" });
    return false;
  }
  if (!org.isSelfServiceEnabled) {
    res.status(403).json({ success: false, message: "Online self-service booking is currently disabled by the salon." });
    return false;
  }
  return true;
}

// Helper to parse timeSlot to minutes
function parseTimeSlotToMinutes(timeSlot) {
  if (!timeSlot || typeof timeSlot !== "string") return null;
  const trimmed = timeSlot.trim();
  const amPm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPm) {
    let hours = parseInt(amPm[1], 10);
    const minutes = parseInt(amPm[2], 10);
    const ap = (amPm[3] || "").toUpperCase();
    if (ap === "PM" && hours !== 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const twenty4 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twenty4) {
    const hours = parseInt(twenty4[1], 10);
    const minutes = parseInt(twenty4[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) return hours * 60 + minutes;
  }
  return null;
}

// Helper to convert time string to minutes
function timeStringToMinutes(timeStr) {
  return parseTimeSlotToMinutes(timeStr);
}

// Helper to convert minutes back to "HH:MM AM/PM"
function minutesToSlotString(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 < 12 ? "AM" : "PM";
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${ampm}`;
}

// 0. GET /api/public/organization?orgId=X
router.get("/organization", async (req, res) => {
  try {
    const orgId = decryptOrgId(req.query.orgId);
    if (!(await validateSelfService(orgId, res))) return;

    const org = await Organization.findByPk(orgId, {
      attributes: ["name"]
    });
    return res.status(200).json({ success: true, name: org.name });
  } catch (err) {
    console.error("public/organization error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 1. GET /api/public/branches?orgId=X
router.get("/branches", async (req, res) => {
  try {
    const orgId = decryptOrgId(req.query.orgId);
    if (!(await validateSelfService(orgId, res))) return;

    const branches = await Branch.findAll({
      where: { organizationId: orgId },
      order: [["name", "ASC"]],
    });
    return res.status(200).json({ success: true, data: branches });
  } catch (err) {
    console.error("public/branches error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. GET /api/public/services?orgId=X
router.get("/services", async (req, res) => {
  try {
    const orgId = decryptOrgId(req.query.orgId);
    if (!(await validateSelfService(orgId, res))) return;

    const services = await Service.findAll({
      where: { organizationId: orgId, status: "active" },
      include: [{ model: Category, attributes: ["id", "name"] }],
      order: [["serviceName", "ASC"]],
    });
    // Flatten category info for frontend
    const formatted = services.map((s) => {
      const plain = s.toJSON();
      return {
        ...plain,
        categoryId: plain.Category?.id || null,
        categoryName: plain.Category?.name || "Uncategorized",
      };
    });
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("public/services error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. GET /api/public/packages?orgId=X
router.get("/packages", async (req, res) => {
  try {
    const orgId = decryptOrgId(req.query.orgId);
    if (!(await validateSelfService(orgId, res))) return;

    const packages = await Package.findAll({
      where: { organizationId: orgId, status: "active" },
      order: [["packageName", "ASC"]],
    });
    return res.status(200).json({ success: true, data: packages });
  } catch (err) {
    console.error("public/packages error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. GET /api/public/staff?branchId=Y&serviceId=Z (serviceId is optional)
router.get("/staff", async (req, res) => {
  try {
    const branchId = parseInt(req.query.branchId, 10);
    if (!branchId || Number.isNaN(branchId)) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }

    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId, 10) : null;

    let staffRows;
    if (serviceId) {
      // Only return staff assigned to this specific service
      const assignments = await StaffService.findAll({
        where: { serviceId },
        attributes: ["staffId"],
      });
      const staffIds = assignments.map((a) => a.staffId);
      if (staffIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      staffRows = await Staff.findAll({
        where: { branchId, isActive: true, id: { [Op.in]: staffIds } },
        order: [["firstName", "ASC"]],
      });
    } else {
      staffRows = await Staff.findAll({
        where: { branchId, isActive: true },
        order: [["firstName", "ASC"]],
      });
    }

    const formatted = staffRows.map((s) => ({
      id: s.id,
      name: [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("public/staff error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Helper function to calculate slots for a single staff member
function calculateSlotsForStaff(staff, newDuration, date, orgId, appointments) {
  // Check working day
  let isWorkingDay = true;
  if (staff.workingDays) {
    try {
      let days = staff.workingDays;
      if (typeof days === "string") {
        days = JSON.parse(days);
        if (typeof days === "string") days = JSON.parse(days);
      }
      if (Array.isArray(days) && days.length > 0) {
        const dateObj = new Date(date + "T12:00:00");
        const dayLong = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
        isWorkingDay = days.some((d) => {
          const str = String(d).toLowerCase();
          return str === dayLong || str === dayShort || dayLong.startsWith(str);
        });
      }
    } catch (e) {}
  }

  if (!isWorkingDay) return [];

  const workStart = timeStringToMinutes(staff.startTime);
  const workEnd = timeStringToMinutes(staff.endTime);

  if (workStart == null || workEnd == null || workEnd <= workStart) {
    return [];
  }

  const busyIntervals = [];

  // Break
  if (staff.breakStartTime && staff.breakEndTime) {
    const bStart = timeStringToMinutes(staff.breakStartTime);
    const bEnd = timeStringToMinutes(staff.breakEndTime);
    if (bStart != null && bEnd != null && bEnd > bStart) {
      busyIntervals.push({ start: bStart, end: bEnd });
    }
  }

  // Existing bookings for this staff member
  const staffApts = appointments.filter(apt => apt.staffId === staff.id);
  for (const apt of staffApts) {
    const aptStart = parseTimeSlotToMinutes(apt.timeSlot);
    if (aptStart == null) continue;
    let aptDuration = apt.Service?.duration != null ? parseInt(apt.Service.duration, 10) : (apt.Package?.duration != null ? parseInt(apt.Package.duration, 10) : newDuration);
    busyIntervals.push({ start: aptStart, end: aptStart + aptDuration });
  }

  // Sort + merge busy windows
  busyIntervals.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const interval of busyIntervals) {
    if (merged.length === 0 || interval.start >= merged[merged.length - 1].end) {
      merged.push({ ...interval });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
    }
  }

  const freeWindows = [];
  let cursor = workStart;
  for (const busy of merged) {
    if (busy.start > cursor) {
      freeWindows.push({ start: cursor, end: busy.start });
    }
    cursor = Math.max(cursor, busy.end);
  }
  if (cursor < workEnd) {
    freeWindows.push({ start: cursor, end: workEnd });
  }

  const slots = [];
  for (const window of freeWindows) {
    let slot = window.start;
    while (slot + newDuration <= window.end) {
      slots.push(minutesToSlotString(slot));
      slot += newDuration;
    }
  }

  return slots;
}

// 5. GET /api/public/available-slots
router.get("/available-slots", async (req, res) => {
  try {
    const orgId = decryptOrgId(req.query.orgId);
    if (!(await validateSelfService(orgId, res))) return;

    const branchId = parseInt(req.query.branchId, 10);
    const staffId = req.query.staffId ? parseInt(req.query.staffId, 10) : null;
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId, 10) : null;
    const packageId = req.query.packageId ? parseInt(req.query.packageId, 10) : null;
    const date = req.query.date ? String(req.query.date).trim() : null;

    if (!branchId || (!serviceId && !packageId) || !date) {
      return res.status(400).json({ success: false, message: "Missing required query parameters: branchId, date, and either serviceId or packageId" });
    }

    let newDuration = 30;
    if (serviceId) {
      const service = await Service.findOne({ where: { id: serviceId, organizationId: orgId } });
      if (!service) return res.status(404).json({ success: false, message: "Service not found" });
      newDuration = service.duration != null ? parseInt(service.duration, 10) : 30;
    } else if (packageId) {
      const packageObj = await Package.findOne({ where: { id: packageId, organizationId: orgId } });
      if (!packageObj) return res.status(404).json({ success: false, message: "Package not found" });
      newDuration = packageObj.duration != null ? parseInt(packageObj.duration, 10) : 60;
    }

    // Fetch existing appointments for the branch and date
    const existingApts = await Appointment.findAll({
      where: {
        organizationId: orgId,
        branchId,
        date,
        status: { [Op.in]: ["booked", "arrived"] },
      },
      include: [
        { model: Service, as: "Service", attributes: ["id", "duration"] },
        { model: Package, as: "Package", attributes: ["id", "duration"] }
      ],
    });

    let slots = [];
    let isWorkingDay = true;

    if (staffId && staffId !== 0) {
      // Calculate slots for a specific staff member
      const staff = await Staff.findOne({ where: { id: staffId, organizationId: orgId, branchId } });
      if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

      slots = calculateSlotsForStaff(staff, newDuration, date, orgId, existingApts);
      
      // Determine if working day for response message
      if (staff.workingDays) {
        try {
          let days = staff.workingDays;
          if (typeof days === "string") {
            days = JSON.parse(days);
            if (typeof days === "string") days = JSON.parse(days);
          }
          if (Array.isArray(days) && days.length > 0) {
            const dateObj = new Date(date + "T12:00:00");
            const dayLong = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
            const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
            isWorkingDay = days.some((d) => {
              const str = String(d).toLowerCase();
              return str === dayLong || str === dayShort || dayLong.startsWith(str);
            });
          }
        } catch (e) {}
      }
    } else {
      // Calculate slots for all active staff in the branch on this date
      const staffMembers = await Staff.findAll({ where: { branchId, isActive: true, organizationId: orgId } });
      const allSlotsSet = new Set();
      
      for (const staff of staffMembers) {
        const staffSlots = calculateSlotsForStaff(staff, newDuration, date, orgId, existingApts);
        staffSlots.forEach(s => allSlotsSet.add(s));
      }

      slots = Array.from(allSlotsSet);
      slots.sort((a, b) => parseTimeSlotToMinutes(a) - parseTimeSlotToMinutes(b));
    }

    // Filter past slots if today
    const todayStr = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    })();

    let filteredSlots = slots;
    if (date === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      filteredSlots = slots.filter((slot) => {
        const slotMin = parseTimeSlotToMinutes(slot);
        return slotMin != null && slotMin >= currentMinutes;
      });
    }

    return res.status(200).json({
      success: true,
      data: { slots: filteredSlots, isWorkingDay }
    });
  } catch (err) {
    console.error("public/available-slots error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 6. POST /api/public/book
const { publicBooking } = require("../middleware/validation");
router.post("/book", publicBooking.book, async (req, res) => {
  try {
    const { orgId: encryptedOrgId, branchId, serviceId, packageId, staffId, date, timeSlot, notes, name, email, mobile } = req.body;
    const orgId = decryptOrgId(encryptedOrgId);
    if (!(await validateSelfService(orgId, res))) return;

    // 1. Check or register customer
    let customer = await Customer.findOne({
      where: { mobile: mobile.trim(), organizationId: orgId }
    });

    if (customer) {
      // Update customer details if provided
      if (name) customer.name = name.trim();
      if (email) customer.email = email.trim();
      await customer.save();
    } else {
      customer = await Customer.create({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email ? email.trim() : null,
        organizationId: orgId,
      });
    }

    // 2. Create the Appointment with 'pending' status
    const appointment = await Appointment.create({
      organizationId: orgId,
      branchId: branchId,
      customerId: customer.id,
      serviceId: serviceId || null,
      packageId: packageId || null,
      staffId: staffId || null,
      date: date,
      timeSlot: timeSlot,
      status: "pending",
      notes: notes || null,
      bookingTime: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: appointment,
      message: "Appointment booked successfully"
    });
  } catch (err) {
    console.error("public/book error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;