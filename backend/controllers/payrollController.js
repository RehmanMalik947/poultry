const { Payroll, PayrollBonusDeduction, UserSalary, Attendance, Staff, Branch } = require("../models");
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

function canEdit(req) {
  if (req.user) return true;
  if (req.staff && (req.staff.role === "Admin" || req.staff.role === "Manager")) return true;
  return false;
}

function staffToName(s) {
  if (!s) return null;
  const first = s.firstName || "";
  const last = s.lastName || "";
  return [first, last].filter(Boolean).join(" ").trim() || s.email || null;
}

function toJson(p, staff, generatedByStaff) {
  return {
    id: p.id,
    organizationId: p.organizationId,
    branchId: p.branchId,
    staffId: p.staffId,
    staffName: staff ? staffToName(staff) : null,
    month: p.month,
    year: p.year,
    baseSalary: parseFloat(p.baseSalary),
    bonus: parseFloat(p.bonus),
    deduction: parseFloat(p.deduction),
    netSalary: parseFloat(p.netSalary),
    status: p.status,
    staffRole: staff ? staff.role : null,
    generatedById: p.generatedById ?? null,
    generatedBy: generatedByStaff ? staffToName(generatedByStaff) : null,
    paidAt: p.paidAt ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * GET /api/payrolls?month=3&year=2025&page=1&limit=10
 * Current payroll: pass month & year & X-Branch-Id. Pagination.
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;

    const month = req.query.month != null ? parseInt(req.query.month, 10) : null;
    const year = req.query.year != null ? parseInt(req.query.year, 10) : null;
    if (month != null && !Number.isNaN(month)) where.month = month;
    if (year != null && !Number.isNaN(year)) where.year = year;

    const { search } = req.query;
    if (search) {
      where[Op.or] = [
        { '$Staff.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: list } = await Payroll.findAndCountAll({
      where,
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    });

    const data = list.map((p) => toJson(p, p.Staff, p.GeneratedByStaff));
    return res.status(200).json({ success: true, data, total: count, page, limit });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/payrolls/history?page=1&limit=10
 * All payrolls for branch, grouped by month. X-Branch-Id.
 */
async function getHistory(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;

    const { search } = req.query;
    if (search) {
      where[Op.or] = [
        { '$Staff.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: list } = await Payroll.findAndCountAll({
      where,
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    });

    const data = list.map((p) => toJson(p, p.Staff, p.GeneratedByStaff));
    return res.status(200).json({ success: true, data, total: count, page, limit });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll getHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/payrolls/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const p = await Payroll.findOne({
      where: { id, organizationId },
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });

    return res.status(200).json({ success: true, data: toJson(p, p.Staff, p.GeneratedByStaff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/** Last day of month (YYYY-MM-DD) */
function lastDayOfMonth(y, m) {
  const d = new Date(y, m, 0);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

/** Days in month */
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

/**
 * Generate payroll for one staff (shared logic).
 * Returns { payroll, isNew }.
 */
async function generateOneStaff(organizationId, branchId, staff, month, year, lastDay, monthStart, generatedById) {
  const salaryRow = await UserSalary.findOne({
    where: {
      organizationId,
      staffId: staff.id,
      status: "active",
      effectiveFrom: { [Op.lte]: lastDay },
      [Op.or]: [{ branchId }, { branchId: null }],
    },
    order: [["effectiveFrom", "DESC"]],
  });

  let baseSalary = 0;
  if (salaryRow) {
    const amount = parseFloat(salaryRow.amount);
    const type = salaryRow.salaryType;

    if (type === "monthly") {
      baseSalary = amount;
    } else if (type === "weekly") {
      const days = daysInMonth(year, month);
      const weeks = Math.ceil(days / 7);
      baseSalary = amount * weeks;
    } else {
      const attendances = await Attendance.findAll({
        where: {
          organizationId,
          branchId,
          staffId: staff.id,
          date: { [Op.gte]: monthStart, [Op.lte]: lastDay },
        },
        attributes: ["status"],
      });
      let workDays = 0;
      for (const a of attendances) {
        if (a.status === "present") workDays += 1;
        else if (a.status === "half-day") workDays += 0.5;
      }
      baseSalary = amount * workDays;
    }
  }
  const ALLOWED_ABSENTS = 2;
  const absentDays = await Attendance.count({
    where: {
      organizationId,
      branchId,
      staffId: staff.id,
      status: "absent",
      date: { [Op.gte]: monthStart, [Op.lte]: lastDay },
    },
  });
  const totalDays = daysInMonth(year, month);
  const extraAbsents = Math.max(0, absentDays - ALLOWED_ABSENTS);
  const dailyRate = baseSalary / totalDays;
  const absenceDeduction = extraAbsents * dailyRate;

  const [p, isNew] = await Payroll.findOrCreate({
    where: { organizationId, branchId: staff.branchId, staffId: staff.id, month, year },
    defaults: {
      organizationId,
      branchId: staff.branchId,
      staffId: staff.id,
      month,
      year,
      baseSalary,
      bonus: 0,
      deduction: 0,
      netSalary: baseSalary,
      status: "pending",
      generatedById,
    },
  });

  if (!isNew) {
    await p.update({
      baseSalary,
      netSalary: parseFloat(p.bonus) - parseFloat(p.deduction) + baseSalary,
    });
  }

  // Clear any existing Attendance Deduction lines to avoid duplicates on re-generation
  await PayrollBonusDeduction.destroy({
    where: {
      payrollId: p.id,
      organizationId,
      reason: "Attendance Deduction",
    },
  });

  if (absenceDeduction > 0) {
    await PayrollBonusDeduction.create({
      organizationId,
      branchId: staff.branchId,
      payrollId: p.id,
      type: "deduction",
      amount: absenceDeduction,
      reason: "Attendance Deduction",
    });
  }

  await recalcPayrollTotals(p.id, organizationId);

  const withStaff = await Payroll.findByPk(p.id, {
    include: [
      { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
      { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
    ],
  });
  return { payroll: toJson(withStaff, withStaff.Staff, withStaff.GeneratedByStaff), isNew };
}

/**
 * POST /api/payrolls/generate
 * Body: { month, year, staffIds?: number[], branchIds?: number[] }.
 * - staffIds: generate only for these staff (their branches).
 * - branchIds: generate for all active staff in these branches.
 * - Neither: X-Branch-Id required, generate for all active staff in that branch.
 * Returns { data, generated, skipped }.
 * Admin/Manager only.
 */
async function generate(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can generate payroll." });
    }
    const organizationId = getOrganizationId(req);
    const headerBranchId = await getBranchIdFromHeader(req, organizationId);

    const month = req.body.month != null ? parseInt(req.body.month, 10) : null;
    const year = req.body.year != null ? parseInt(req.body.year, 10) : null;
    if (month == null || year == null || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: "Valid month (1-12) and year are required." });
    }

    const staffIds = Array.isArray(req.body.staffIds)
      ? req.body.staffIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id))
      : null;
    const branchIds = Array.isArray(req.body.branchIds)
      ? req.body.branchIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id))
      : null;

    let staffList = [];
    if (staffIds != null && staffIds.length > 0) {
      const staff = await Staff.findAll({
        where: { organizationId, id: { [Op.in]: staffIds }, isActive: true },
        attributes: ["id", "firstName", "lastName", "email", "branchId"],
      });
      staffList = staff;
    } else if (branchIds != null && branchIds.length > 0) {
      const staff = await Staff.findAll({
        where: { organizationId, branchId: { [Op.in]: branchIds }, isActive: true },
        attributes: ["id", "firstName", "lastName", "email", "branchId"],
      });
      staffList = staff;
    } else {
      if (headerBranchId == null) {
        return res.status(400).json({ success: false, message: "Select staff, locations, or set branch to generate payroll." });
      }
      staffList = await Staff.findAll({
        where: { organizationId, branchId: headerBranchId, isActive: true },
        attributes: ["id", "firstName", "lastName", "email", "branchId"],
      });
    }

    const lastDay = lastDayOfMonth(year, month);
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const generatedById = req.staff ? req.staff.id : null;

    // If staffEntries is provided, it's a detailed manual generation
    if (Array.isArray(req.body.staffEntries) && req.body.staffEntries.length > 0) {
      const results = [];
      let generatedCount = 0;
      let skippedCount = 0;

      for (const entry of req.body.staffEntries) {
        const { staffId, baseSalary, status, details } = entry;
        const staff = await Staff.findOne({ where: { id: staffId, organizationId, isActive: true } });
        if (!staff) continue;

        // Calculate absent deduction
        const ALLOWED_ABSENTS = 2;
        const absentDays = await Attendance.count({
          where: {
            organizationId,
            branchId: staff.branchId,
            staffId: staffId,
            status: "absent",
            date: { [Op.gte]: monthStart, [Op.lte]: lastDay },
          },
        });

        const totalDays = daysInMonth(year, month);
        const extraAbsents = Math.max(0, absentDays - ALLOWED_ABSENTS);
        const dailyRate = (parseFloat(baseSalary) || 0) / totalDays;
        const absenceDeduction = extraAbsents * dailyRate;

        const [p, isNew] = await Payroll.findOrCreate({
          where: { organizationId, branchId: staff.branchId, staffId, month, year },
          defaults: {
            organizationId,
            branchId: staff.branchId,
            staffId,
            month,
            year,
            baseSalary: parseFloat(baseSalary) || 0,
            bonus: 0,
            deduction: 0,
            netSalary: parseFloat(baseSalary) || 0,
            status: status || "pending",
            generatedById,
          },
        });

        if (!isNew) {
          await p.update({ 
            baseSalary: parseFloat(baseSalary) || 0, 
            status: status || p.status 
          });
          await PayrollBonusDeduction.destroy({ where: { payrollId: p.id, organizationId } });
        }

        // Add Attendance Deduction if applicable
        if (absenceDeduction > 0) {
          await PayrollBonusDeduction.create({
            organizationId,
            branchId: staff.branchId,
            payrollId: p.id,
            type: "deduction",
            amount: absenceDeduction,
            reason: "Attendance Deduction",
          });
        }


    // Add Bonus/Deduction Lines from details
    const lines = [];
    const mapping = {
      hra: { type: "bonus", label: "HRA Allowance" },
      conveyance: { type: "bonus", label: "Conveyance" },
      medical: { type: "bonus", label: "Medical Allowance" },
      bonus: { type: "bonus", label: "Bonus" },
      pf: { type: "deduction", label: "PF" },
      profTax: { type: "deduction", label: "Professional Tax" },
      tds: { type: "deduction", label: "TDS" },
      loans: { type: "deduction", label: "Loans & Others" },
    };

    if (details) {
      for (const [key, val] of Object.entries(details)) {
        const amount = parseFloat(val);
        if (amount > 0 && mapping[key]) {
          await PayrollBonusDeduction.create({
            organizationId,
            branchId: staff.branchId,
            payrollId: p.id,
            type: mapping[key].type,
            amount,
            reason: mapping[key].label,
          });
        }
      }
    }

    await recalcPayrollTotals(p.id, organizationId);
    
    const updated = await Payroll.findByPk(p.id, {
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    results.push(toJson(updated, updated.Staff, updated.GeneratedByStaff));
    if (isNew) generatedCount++;
    else skippedCount++;
  }

  return res.status(201).json({
    success: true,
    data: results,
    generatedCount,
    skippedCount,
    message: `Payroll generated: ${generatedCount} created, ${skippedCount} updated.`,
  });
}

    // Default automated generation logic (fallback)
    const staffIdList = staffList.map((s) => s.id);
    const salaryRows = await UserSalary.findAll({
      where: {
        organizationId,
        staffId: { [Op.in]: staffIdList },
        status: "active",
      },
      attributes: ["staffId", "effectiveFrom"],
      raw: true,
    });
    const earliestByStaff = {};
    for (const row of salaryRows) {
      const d = row.effectiveFrom ? String(row.effectiveFrom).slice(0, 10) : null;
      if (!d) continue;
      if (!earliestByStaff[row.staffId] || d < earliestByStaff[row.staffId]) {
        earliestByStaff[row.staffId] = d;
      }
    }
    const eligibleStaffList = staffList.filter((s) => {
      const earliest = earliestByStaff[s.id];
      return earliest && earliest <= monthStart; // Fixed to include 1st day joiners as discussed
    });

    const created = [];
    let generatedCount = 0;
    let skippedCount = 0;

    for (const staff of eligibleStaffList) {
      const branchId = staff.branchId;
      const { payroll, isNew } = await generateOneStaff(
        organizationId,
        branchId,
        staff,
        month,
        year,
        lastDay,
        monthStart,
        generatedById
      );
      created.push(payroll);
      if (isNew) generatedCount++;
      else skippedCount++;
      if (!isNew) {
  skippedCount++;
  continue; // Skip updating existing records
}

    }

    const excludedByRule = staffList.length - eligibleStaffList.length;
    const message = excludedByRule > 0
      ? `Payroll generated: ${generatedCount} created, ${skippedCount} already had payroll. ${excludedByRule} staff excluded (joined after period).`
      : `Payroll generated: ${generatedCount} created, ${skippedCount} skipped (duplicate).`;
    return res.status(201).json({
      success: true,
      data: created,
      generatedCount,
      skippedCount,
      message,
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll generate error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PATCH /api/payrolls/:id/paid or PUT /api/payrolls/:id with body { status: "paid" }
 * Mark payroll as paid. Admin/Manager only.
 */
async function markPaid(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can mark payroll as paid." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const p = await Payroll.findOne({
      where: { id, organizationId },
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });

    p.status = "paid";
p.paidAt = new Date();
await p.save();

    const updated = await Payroll.findByPk(p.id, {
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    return res.status(200).json({ success: true, data: toJson(updated, updated.Staff, updated.GeneratedByStaff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll markPaid error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/payrolls/:id
 * Body: { bonus?, deduction? } - recalc netSalary = baseSalary + bonus - deduction
 */
async function update(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can edit payroll." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const p = await Payroll.findOne({
      where: { id, organizationId },
      include: [{ model: Staff, as: "Staff" }, { model: Staff, as: "GeneratedByStaff" }],
    });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });

    if (req.body.bonus != null) {
      const bonus = parseFloat(req.body.bonus);
      if (!Number.isNaN(bonus) && bonus >= 0) p.bonus = bonus;
    }
    if (req.body.deduction != null) {
      const deduction = parseFloat(req.body.deduction);
      if (!Number.isNaN(deduction) && deduction >= 0) p.deduction = deduction;
    }
    const base = parseFloat(p.baseSalary);
    const bonus = parseFloat(p.bonus);
    const deduction = parseFloat(p.deduction);
    p.netSalary = base + bonus - deduction;
    await p.save();

    const updated = await Payroll.findByPk(p.id, {
      include: [
        { model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role"] },
        { model: Staff, as: "GeneratedByStaff", attributes: ["id", "firstName", "lastName", "email"] },
      ],
    });
    return res.status(200).json({ success: true, data: toJson(updated, updated.Staff, updated.GeneratedByStaff) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/payrolls/:id/slip
 * Returns payroll + staff info for salary slip download (view: all authenticated).
 */
async function getSlip(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const p = await Payroll.findOne({
      where: { id, organizationId },
      include: [{ model: Staff, as: "Staff", attributes: ["id", "firstName", "lastName", "email", "role", "mobileNumber", "bankAccountNumber", "bankName"] }],
    });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });

    const lines = await PayrollBonusDeduction.findAll({
      where: { payrollId: p.id, organizationId },
      order: [["type", "ASC"], ["id", "ASC"]],
    });

    const staff = p.Staff;
    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return res.status(200).json({
      success: true,
      data: {
        id: p.id,
        staffId: p.staffId,
        staffName: staff ? staffToName(staff) : null,
        month: p.month,
        year: p.year,
        monthName: monthNames[p.month] || "",
        baseSalary: parseFloat(p.baseSalary),
        bonus: parseFloat(p.bonus),
        deduction: parseFloat(p.deduction),
        netSalary: parseFloat(p.netSalary),
        status: p.status,
        paidAt: p.paidAt,
        bonusDeductionLines: lines.map((l) => ({
          type: l.type,
          amount: parseFloat(l.amount),
          reason: l.reason ?? null,
        })),
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll getSlip error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/** Recalculate payroll totals from bonus/deduction lines and save */
async function recalcPayrollTotals(payrollId, organizationId) {
  const payroll = await Payroll.findOne({ where: { id: payrollId, organizationId } });
  if (!payroll) return;
  const lines = await PayrollBonusDeduction.findAll({
    where: { payrollId, organizationId },
    attributes: ["type", "amount"],
  });
  let bonusTotal = 0;
  let deductionTotal = 0;
  for (const line of lines) {
    const amt = parseFloat(line.amount) || 0;
    if (line.type === "bonus") bonusTotal += amt;
    else deductionTotal += amt;
  }
  const base = parseFloat(payroll.baseSalary);
  payroll.bonus = bonusTotal;
  payroll.deduction = deductionTotal;
  payroll.netSalary = base + bonusTotal - deductionTotal;
  await payroll.save();
}

/**
 * GET /api/payrolls/:payrollId/bonus-deductions
 * List bonus and deduction lines for a payroll (with reason). View: all authenticated.
 */
async function listBonusDeductions(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const payrollId = parseInt(req.params.payrollId, 10);
    if (Number.isNaN(payrollId)) return res.status(400).json({ success: false, message: "Invalid payroll id" });

    const payroll = await Payroll.findOne({ where: { id: payrollId, organizationId } });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    const lines = await PayrollBonusDeduction.findAll({
      where: { payrollId, organizationId },
      order: [["type", "ASC"], ["id", "ASC"]],
    });

    const data = lines.map((l) => ({
      id: l.id,
      payrollId: l.payrollId,
      type: l.type,
      amount: parseFloat(l.amount),
      reason: l.reason ?? null,
      date: l.date ?? null,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll listBonusDeductions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/payrolls/:payrollId/bonus-deductions
 * Body: { type: "bonus"|"deduction", amount, reason? }
 * Admin/Manager only. Updates parent Payroll totals.
 */
async function createBonusDeduction(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can add bonus/deduction." });
    }
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const payrollId = parseInt(req.params.payrollId, 10);
    if (Number.isNaN(payrollId)) return res.status(400).json({ success: false, message: "Invalid payroll id" });

    const payroll = await Payroll.findOne({ where: { id: payrollId, organizationId } });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    const type = req.body.type === "deduction" ? "deduction" : "bonus";
    const amount = req.body.amount != null ? parseFloat(req.body.amount) : NaN;
    const reason = req.body.reason != null ? String(req.body.reason).trim().slice(0, 255) || null : null;

    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const line = await PayrollBonusDeduction.create({
      organizationId,
      branchId: branchId ?? payroll.branchId,
      payrollId,
      type,
      amount,
      reason,
    });

    await recalcPayrollTotals(payrollId, organizationId);

    return res.status(201).json({
      success: true,
      data: {
        id: line.id,
        payrollId: line.payrollId,
        type: line.type,
        amount: parseFloat(line.amount),
        reason: line.reason ?? null,
        date: line.date ?? null,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll createBonusDeduction error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/payrolls/bonus-deductions/:id
 * Admin/Manager only. Recalculates parent Payroll totals.
 */
async function deleteBonusDeduction(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can remove bonus/deduction." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const line = await PayrollBonusDeduction.findOne({ where: { id, organizationId } });
    if (!line) return res.status(404).json({ success: false, message: "Not found" });

    const payrollId = line.payrollId;
    await line.destroy();
    await recalcPayrollTotals(payrollId, organizationId);

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll deleteBonusDeduction error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/payrolls/:id
 * Remove a payroll record (and its bonus/deduction lines). Admin/Manager only.
 */
async function remove(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false, message: "Only Admin or Manager can delete payroll." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const p = await Payroll.findOne({ where: { id, organizationId } });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });

    await p.destroy();
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("payroll remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAll, getHistory, getById, generate, markPaid, update, getSlip, listBonusDeductions, createBonusDeduction, deleteBonusDeduction, remove };