const { Appointment, Customer, Service, Staff, Branch, StaffService, Package } = require("../models");
const { Op } = require("sequelize");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (raw == null || raw === "") return null;
  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;
  const branch = await Branch.findOne({ where: { id: branchId, organizationId } });
  return branch ? branch.id : null;
}

function appointmentToJson(apt, customer, service, staff, packageObj) {
  return {
    id: apt.id,
    organizationId: apt.organizationId,
    branchId: apt.branchId,
    customerId: apt.customerId,
    serviceId: apt.serviceId || null,
    packageId: apt.packageId || null, // Added packageId
    staffId: apt.staffId,
    date: apt.date instanceof Date ? apt.date.toISOString().slice(0, 10) : String(apt.date || "").slice(0, 10),
    timeSlot: apt.timeSlot,
    status: apt.status,
    notes: apt.notes ?? null,
    bookingTime: apt.bookingTime ?? null,
    checkInTime: apt.checkInTime ?? null,
    checkOutTime: apt.checkOutTime ?? null,
    serviceDuration: apt.serviceDuration != null ? apt.serviceDuration : null,
    customer: customer
      ? { id: customer.id, name: customer.name, mobile: customer.mobile ?? null, email: customer.email ?? null }
      : null,
    service: service 
      ? { id: service.id, serviceName: service.serviceName, price: service.price != null ? parseFloat(service.price) : null } 
      : null,
    package: packageObj 
      ? { id: packageObj.id, packageName: packageObj.packageName, price: packageObj.price != null ? parseFloat(packageObj.price) : null } 
      : null, // Added package mapping
    staff: staff
      ? {
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          name: [staff.firstName, staff.lastName].filter(Boolean).join(" ").trim() || staff.email,
        }
      : null,
    time: apt.timeSlot,
    createdAt: apt.createdAt,
    updatedAt: apt.updatedAt,
  };
}

/**
 * GET /api/appointments/stats?date=YYYY-MM-DD
 */
async function getStats(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const date = req.query.date != null ? String(req.query.date).trim() : null;
    if (!date) return res.status(400).json({ success: false, message: "Query date is required" });

    const where = { organizationId, date };
    if (branchId != null) where.branchId = branchId;

    const rows = await Appointment.findAll({
      where,
      attributes: ["status"],
    });

    const stats = { pending: 0, booked: 0, arrived: 0, completed: 0, cancelled: 0 };
    rows.forEach((r) => {
      if (stats[r.status] !== undefined) stats[r.status]++;
    });
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/appointments?date=YYYY-MM-DD&page=1&limit=10
 */
async function list(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const date = req.query.date != null ? String(req.query.date).trim() : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;
    
    if (req.query.startDate && req.query.endDate) {
      where.date = { [Op.between]: [req.query.startDate, req.query.endDate] };
    } else if (date) {
      where.date = date;
    }

    const { count, rows: list } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] }, // Included Package
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
      order: [
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
    });

    const data = list.map((apt) =>
      appointmentToJson(apt, apt.Customer, apt.Service, apt.Staff, apt.Package)
    );
    return res.status(200).json({ success: true, data, total: count, page, limit });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("appointment list error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/appointments/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const apt = await Appointment.findOne({
      where: { id, organizationId },
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] }, // Included Package
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    if (!apt) return res.status(404).json({ success: false, message: "Appointment not found" });

    return res.status(200).json({
      success: true,
      data: appointmentToJson(apt, apt.Customer, apt.Service, apt.Staff, apt.Package),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("appointment getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/appointments
 */
async function create(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const body = req.body;

    const customerId = body.customerId != null ? parseInt(body.customerId, 10) : null;
    const serviceId = body.serviceId != null && body.serviceId !== "" ? parseInt(body.serviceId, 10) : null;
    const packageId = body.packageId != null && body.packageId !== "" ? parseInt(body.packageId, 10) : null; // Added
    const staffId = body.staffId != null && body.staffId !== "" ? parseInt(body.staffId, 10) : null;
    const date = body.date != null ? String(body.date).trim() : "";
    const timeSlot = body.timeSlot != null ? String(body.timeSlot).trim() : "";

    if (!customerId || Number.isNaN(customerId))
      return res.status(400).json({ success: false, message: "Valid customer is required" });
    
    // Core validation changed to allow either Service or Package
    if ((!serviceId || Number.isNaN(serviceId)) && (!packageId || Number.isNaN(packageId))) {
      return res.status(400).json({ success: false, message: "Valid service or package is required" });
    }
    
    if (!date) return res.status(400).json({ success: false, message: "Date is required" });
    if (!timeSlot) return res.status(400).json({ success: false, message: "Time slot is required" });

    const customer = await Customer.findOne({ where: { id: customerId, organizationId } });
    if (!customer) return res.status(400).json({ success: false, message: "Customer not found" });

    if (serviceId) {
      const service = await Service.findOne({ where: { id: serviceId, organizationId } });
      if (!service) return res.status(400).json({ success: false, message: "Service not found" });
    }

    if (packageId) {
      const packageObj = await Package.findOne({ where: { id: packageId, organizationId } });
      if (!packageObj) return res.status(400).json({ success: false, message: "Package not found" });
    }

    let staff = null;
    if (staffId != null && !Number.isNaN(staffId)) {
      staff = await Staff.findOne({ where: { id: staffId, organizationId } });
      if (!staff) return res.status(400).json({ success: false, message: "Staff not found" });
    }

    const finalBranchId = branchId ?? body.branchId ?? null;
    const notes = body.notes != null ? String(body.notes).trim() || null : null;

    const bookingTime = new Date();
    const apt = await Appointment.create({
      organizationId,
      branchId: finalBranchId,
      customerId,
      serviceId: serviceId || null,
      packageId: packageId || null, // Added packageId to Appointment creation
      staffId: staff ? staff.id : null,
      date,
      timeSlot,
      status: "booked",
      notes,
      bookingTime,
    });

    const created = await Appointment.findByPk(apt.id, {
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    return res.status(201).json({
      success: true,
      data: appointmentToJson(created, created.Customer, created.Service, created.Staff, created.Package),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("appointment create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PATCH /api/appointments/:id
 */
async function update(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const apt = await Appointment.findOne({
      where: { id, organizationId },
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    if (!apt) return res.status(404).json({ success: false, message: "Appointment not found" });

    const body = req.body;

    if (body.status != null) {
      const status = String(body.status).toLowerCase();
      if (["pending", "booked", "arrived", "completed", "cancelled"].includes(status)) {
        apt.status = status;
      }
    }

    if (body.date != null && String(body.date).trim()) apt.date = String(body.date).trim();
    if (body.timeSlot != null && String(body.timeSlot).trim()) apt.timeSlot = String(body.timeSlot).trim();
    if (body.notes !== undefined) apt.notes = body.notes != null ? String(body.notes).trim() || null : null;

    if (body.customerId != null) {
      const customerId = parseInt(body.customerId, 10);
      if (!Number.isNaN(customerId)) {
        const customer = await Customer.findOne({ where: { id: customerId, organizationId } });
        if (customer) apt.customerId = customer.id;
      }
    }

    if (body.serviceId !== undefined) {
      if (body.serviceId === null || body.serviceId === "") {
        apt.serviceId = null;
      } else {
        const serviceId = parseInt(body.serviceId, 10);
        if (!Number.isNaN(serviceId)) {
          const service = await Service.findOne({ where: { id: serviceId, organizationId } });
          if (service) {
            apt.serviceId = service.id;
            apt.packageId = null; // Unset package if service is picked
          }
        }
      }
    }

    if (body.packageId !== undefined) {
      if (body.packageId === null || body.packageId === "") {
        apt.packageId = null;
      } else {
        const packageId = parseInt(body.packageId, 10);
        if (!Number.isNaN(packageId)) {
          const packageObj = await Package.findOne({ where: { id: packageId, organizationId } });
          if (packageObj) {
            apt.packageId = packageObj.id;
            apt.serviceId = null; // Unset service if package is picked
          }
        }
      }
    }

    if (body.staffId !== undefined) {
      if (body.staffId === null || body.staffId === "") {
        apt.staffId = null;
      } else {
        const staffId = parseInt(body.staffId, 10);
        if (!Number.isNaN(staffId)) {
          const staff = await Staff.findOne({ where: { id: staffId, organizationId } });
          if (staff) apt.staffId = staff.id;
        }
      }
    }

    await apt.save();

    const updated = await Appointment.findByPk(apt.id, {
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    return res.status(200).json({
      success: true,
      data: appointmentToJson(updated, updated.Customer, updated.Service, updated.Staff, updated.Package),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("appointment update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/appointments/:id
 */
async function remove(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const apt = await Appointment.findOne({ where: { id, organizationId } });
    if (!apt) return res.status(404).json({ success: false, message: "Appointment not found" });
    await apt.destroy();
    return res.status(200).json({ success: true, message: "Appointment deleted" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("appointment remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/appointments/today
 */
async function getToday(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const now = new Date();
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const where = { organizationId, date: today };
    if (branchId != null) where.branchId = branchId;

    const list = await Appointment.findAll({
      where,
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
      order: [
        ["timeSlot", "ASC"],
        ["id", "ASC"],
      ],
    });

    const data = list.map((apt) =>
      appointmentToJson(apt, apt.Customer, apt.Service, apt.Staff, apt.Package)
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getToday error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/appointments/check-in/:id
 */
async function checkIn(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const apt = await Appointment.findOne({
      where: { id, organizationId },
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    if (!apt) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (apt.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot check in a cancelled appointment" });
    }
    if (apt.status === "arrived") {
      return res.status(400).json({ success: false, message: "Already checked in" });
    }
    if (apt.status !== "booked") {
      return res.status(400).json({ success: false, message: "Appointment must be booked to check in" });
    }

    const checkInTime = new Date();
    apt.status = "arrived";
    apt.checkInTime = checkInTime;
    await apt.save();

    const updated = await Appointment.findByPk(apt.id, {
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    return res.status(200).json({
      success: true,
      data: appointmentToJson(updated, updated.Customer, updated.Service, updated.Staff, updated.Package),
      message: "Checked in successfully",
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("checkIn error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/appointments/check-out/:id
 */
async function checkOut(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const apt = await Appointment.findOne({
      where: { id, organizationId },
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    if (!apt) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (apt.status === "completed") {
      return res.status(400).json({ success: false, message: "Appointment already completed" });
    }
    if (apt.status !== "arrived") {
      return res.status(400).json({ success: false, message: "Must check in before check out" });
    }
    if (!apt.checkInTime) {
      return res.status(400).json({ success: false, message: "Check-in time missing; cannot calculate duration" });
    }

    const checkOutTime = new Date();
    const serviceDurationMinutes = Math.round((checkOutTime - apt.checkInTime) / 60000);

    apt.status = "completed";
    apt.checkOutTime = checkOutTime;
    apt.serviceDuration = serviceDurationMinutes;
    await apt.save();

    const updated = await Appointment.findByPk(apt.id, {
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    return res.status(200).json({
      success: true,
      data: appointmentToJson(updated, updated.Customer, updated.Service, updated.Staff, updated.Package),
      message: "Checked out successfully",
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("checkOut error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Parse timeSlot
 */
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

/**
 * GET /api/appointments/to-reschedule
 */
async function getToReschedule(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const now = new Date();
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const where = {
      organizationId,
      date: { [Op.lte]: today },
      status: { [Op.in]: ["booked", "arrived"] },
    };
    if (branchId != null) where.branchId = branchId;

    const list = await Appointment.findAll({
      where,
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile", "email"] },
        { model: Service, as: "Service", attributes: ["id", "serviceName", "price"] },
        { model: Package, as: "Package", attributes: ["id", "packageName", "price"] },
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
      order: [
        ["date", "DESC"],
        ["timeSlot", "ASC"],
      ],
      limit: 100,
    });

    const dateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10));
    const filtered = list.filter((apt) => {
      const d = dateStr(apt.date);
      if (d < today) return true;
      if (d > today) return false;
      const slotMinutes = parseTimeSlotToMinutes(apt.timeSlot);
      if (slotMinutes == null) return true;
      return slotMinutes < currentMinutes;
    });

    const data = filtered.slice(0, 50).map((apt) =>
      appointmentToJson(apt, apt.Customer, apt.Service, apt.Staff, apt.Package)
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getToReschedule error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  return parseTimeSlotToMinutes(timeStr);
}

function minutesToSlotString(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 < 12 ? "AM" : "PM";
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${ampm}`;
}

/**
 * GET /api/appointments/available-slots
 */
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

async function getAvailableSlots(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const staffIdRaw = req.query.staffId;
    const staffId = (staffIdRaw != null && staffIdRaw !== "" && staffIdRaw !== "none" && staffIdRaw !== "0") ? parseInt(staffIdRaw, 10) : null;
    const serviceId = req.query.serviceId != null && req.query.serviceId !== "" ? parseInt(req.query.serviceId, 10) : null;
    const packageId = req.query.packageId != null && req.query.packageId !== "" ? parseInt(req.query.packageId, 10) : null;
    const date = req.query.date != null ? String(req.query.date).trim() : null;

    if ((!serviceId || Number.isNaN(serviceId)) && (!packageId || Number.isNaN(packageId))) {
      return res.status(400).json({ success: false, message: "Either serviceId or packageId is required" });
    }

    if (!date)
      return res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)" });

    if (!branchId) {
      return res.status(400).json({ success: false, message: "Branch context required" });
    }

    // Determine target duration based on Service or Package selection
    let newDuration = null;
    if (serviceId) {
      const service = await Service.findOne({ where: { id: serviceId, organizationId } });
      if (!service) return res.status(404).json({ success: false, message: "Service not found" });
      newDuration = service.duration != null ? parseInt(service.duration, 10) : null;
    } else if (packageId) {
      const packageObj = await Package.findOne({ where: { id: packageId, organizationId } });
      if (!packageObj) return res.status(404).json({ success: false, message: "Package not found" });
      newDuration = packageObj.duration != null ? parseInt(packageObj.duration, 10) : 60;
    }

    if (!newDuration || newDuration <= 0) {
      return res.status(200).json({
        success: true,
        data: {
          slots: [],
          serviceDuration: null,
          staffWorkingHours: null,
          isWorkingDay: true,
          message: "Target treatment duration is undefined. Please set a duration value.",
        },
      });
    }

    // Fetch existing appointments for the branch and date
    const existingApts = await Appointment.findAll({
      where: {
        organizationId,
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
    let singleStaffHours = null;

    if (staffId) {
      const staff = await Staff.findOne({ where: { id: staffId, organizationId, branchId } });
      if (!staff)
        return res.status(404).json({ success: false, message: "Staff not found" });

      slots = calculateSlotsForStaff(staff, newDuration, date, organizationId, existingApts);
      singleStaffHours = { start: staff.startTime || null, end: staff.endTime || null };

      // Check working day
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
      // Calculate union of slots for all active staff in the branch on this date
      const staffMembers = await Staff.findAll({ where: { branchId, isActive: true, organizationId } });
      const allSlotsSet = new Set();

      for (const staff of staffMembers) {
        const staffSlots = calculateSlotsForStaff(staff, newDuration, date, organizationId, existingApts);
        staffSlots.forEach(s => allSlotsSet.add(s));
      }

      slots = Array.from(allSlotsSet);
      slots.sort((a, b) => parseTimeSlotToMinutes(a) - parseTimeSlotToMinutes(b));
    }

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
      data: {
        slots: filteredSlots,
        serviceDuration: newDuration,
        staffWorkingHours: singleStaffHours,
        isWorkingDay,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getAvailableSlots error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
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
};