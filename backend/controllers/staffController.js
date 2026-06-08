const { Staff } = require("../models/staff");
const { Branch } = require("../models/branch");
const { User } = require("../models/users");
const { UserSalary } = require("../models/userSalary");
const { Service } = require("../models/service");
const { StaffService } = require("../models/staffService");
const { StaffLog } = require("../models");
const { Sale } = require("../models/sale");
const bcrypt = require("bcryptjs");
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

function isStaffSelfOnly(req) {
  return req.staff && (req.staff.role === "Manager" || req.staff.role === "Cashier");
}

function toSafeStaff(staff) {
  const s = staff.get ? staff.get({ plain: true }) : staff;
  const out = { ...s };
  delete out.password;
  return out;
}

/**
 * GET /api/staff
 * Query: branchId (optional) - filter by branch
 * Manager/Cashier: only get their own record.
 */
async function getAllStaff(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    if (isStaffSelfOnly(req)) {
      const staff = await Staff.findOne({
        where: { id: req.staff.id, organizationId },
        include: [{ model: Branch, as: "Branch", attributes: ["id", "name"] }],
      });
      const list = staff ? [toSafeStaff(staff)] : [];
      return res.status(200).json({ success: true, data: list, total: list.length, page: 1, limit: 10 });
    }

    const { branchId: branchIdQuery, page: pageParam, limit: limitParam, activeOnly: activeOnlyQuery, search } = req.query;
    const where = { organizationId };
    if (branchIdQuery != null && branchIdQuery !== "") {
      const id = parseInt(branchIdQuery, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid branchId" });
      }
      where.branchId = id;
    }
    if (activeOnlyQuery === "true" || activeOnlyQuery === "1") {
      where.isActive = true;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
      ];
    }

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10));
    const offset = (page - 1) * limit;

    const includeServices = req.query.includeServices === 'true' || req.query.includeServices === '1';

    const staffIncludes = [
      { model: Branch, as: "Branch", attributes: ["id", "name"] },
    ];
    if (includeServices) {
      staffIncludes.push({
        model: Service,
        as: "Services",
        through: {
          model: StaffService,
          attributes: ["commissionType", "commissionValue"],
        },
        attributes: ["id", "serviceName", "duration", "price"],
        required: false,
      });
    }

    const { count, rows: list } = await Staff.findAndCountAll({
      distinct: true,
      where,
      include: staffIncludes,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });


    return res.status(200).json({
      success: true,
      data: list.map(toSafeStaff),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getAllStaff error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/staff
 * Body: branchId*, firstName*, email*, ... (see model)
 * If allowLogin and password provided, password is hashed.
 */
async function createStaff(req, res) {
  try {
    if (req.staff) {
      return res.status(403).json({ success: false, message: "Only Admin can add staff." });
    }
    const organizationId = getOrganizationId(req);
    const body = req.body;

    const branchId = body.branchId != null ? parseInt(body.branchId, 10) : null;
    if (branchId == null || Number.isNaN(branchId)) {
      return res.status(400).json({ success: false, message: "Branch is required" });
    }

    const branch = await Branch.findOne({
      where: { id: branchId, organizationId },
    });
    if (!branch) {
      return res.status(400).json({ success: false, message: "Branch not found or does not belong to your organization" });
    }

    const firstName = body.firstName != null ? String(body.firstName).trim() : "";
    const email = body.email != null ? String(body.email).trim().toLowerCase() : "";
    if (!firstName) {
      return res.status(400).json({ success: false, message: "First name is required" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const allowLogin = !!body.allowLogin;
    const passwordPlain = body.password != null ? String(body.password) : "";
    if (allowLogin && !passwordPlain) {
      return res.status(400).json({ success: false, message: "Password is required when Allow login is enabled" });
    }

    const roleRaw = body.role != null ? String(body.role).trim() : "";
    const role = roleRaw || null;

    const existingEmail = await Staff.findOne({
      where: { organizationId, email },
    });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: "A staff member with this email already exists" });
    }

    const usernameForLogin = allowLogin
      ? (body.username != null && String(body.username).trim() ? String(body.username).trim().toLowerCase() : email)
      : (body.username != null && String(body.username).trim() ? String(body.username).trim() : null);

    let userId = null;
    if (allowLogin && passwordPlain) {
      const existingUserByEmail = await User.findOne({ where: { email } });
      if (existingUserByEmail) {
        return res.status(409).json({ success: false, message: "A user with this email already exists. Use a different email or disable login." });
      }
      if (usernameForLogin) {
        const existingUserByUsername = await User.findOne({ where: { username: usernameForLogin } });
        if (existingUserByUsername) {
          return res.status(409).json({ success: false, message: "This username is already taken. Choose another or use email as username." });
        }
      }
      const hashedPassword = await bcrypt.hash(passwordPlain, 10);
      const staffName = [firstName, body.lastName != null ? String(body.lastName).trim() : null].filter(Boolean).join(" ") || firstName;
      const newUser = await User.create({
        username: usernameForLogin || email,
        email,
        password: hashedPassword,
        name: staffName,
        organizationId,
        branchId,
        role: role || "Staff",
      });
      userId = newUser.id;
    }

    const accessLocations = body.accessLocations != null
      ? (typeof body.accessLocations === "string" ? body.accessLocations : JSON.stringify(body.accessLocations))
      : null;

    // Parse working days if provided
    let workingDaysValue = null;
    if (body.workingDays != null) {
      workingDaysValue = typeof body.workingDays === "string" ? body.workingDays : JSON.stringify(body.workingDays);
    }

    const staff = await Staff.create({
      organizationId,
      branchId,
      userId,
      prefix: body.prefix != null ? String(body.prefix).trim() || null : null,
      firstName,
      lastName: body.lastName != null ? String(body.lastName).trim() || null : null,
      email,
      isActive: body.isActive !== false,

      allowLogin,
      username: usernameForLogin,
      password: null,
      role,
      accessLocations,
      
      // Commission fields - ADD THESE
      commissionType: body.commissionType || 'percentage',
      commissionValue: body.commissionValue != null ? parseFloat(body.commissionValue) : 0,
      
      salesCommissionPercent: body.salesCommissionPercent != null && body.salesCommissionPercent !== "" ? parseFloat(body.salesCommissionPercent) : null,
      maxSalesDiscountPercent: body.maxSalesDiscountPercent != null && body.maxSalesDiscountPercent !== "" ? parseFloat(body.maxSalesDiscountPercent) : null,
      allowSelectedContacts: body.allowSelectedContacts === true,
      
      // Schedule fields - ADD THESE
      workingDays: workingDaysValue,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      breakStartTime: body.breakStartTime || null,
      breakEndTime: body.breakEndTime || null,
      
      // Personal information
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      maritalStatus: body.maritalStatus || null,
      bloodGroup: body.bloodGroup || null,
      mobileNumber: body.mobileNumber || null,
      alternateContactNumber: body.alternateContactNumber || null,
      familyContactNumber: body.familyContactNumber || null,
      facebookLink: body.facebookLink || null,
      twitterLink: body.twitterLink || null,
      socialMedia1: body.socialMedia1 || null,
      socialMedia2: body.socialMedia2 || null,
      customField: body.customField || null,
      guardianName: body.guardianName || null,
      idProofName: body.idProofName || null,  // ADD THIS
      idProofNumber: body.idProofNumber || null,
      permanentAddress: body.permanentAddress || null,
      currentAddress: body.currentAddress || null,
      
      // Bank details
      bankAccountHolderName: body.bankAccountHolderName || null,
      bankAccountNumber: body.bankAccountNumber || null,
      bankName: body.bankName || null,
      bankIdentifierCode: body.bankIdentifierCode || null,
      bankBranch: body.bankBranch || null,
      taxPayerId: body.taxPayerId || null,
    });

    return res.status(201).json({ success: true, data: toSafeStaff(staff) });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("createStaff error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/staff/:id
 * Manager/Cashier: only allowed for their own id.
 */
async function getStaffById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff id" });
    }
    if (isStaffSelfOnly(req) && id !== req.staff.id) {
      return res.status(403).json({ success: false, message: "You can only view your own details." });
    }

    const staff = await Staff.findOne({
      where: { id, organizationId },
      include: [
        { model: Branch, as: "Branch", attributes: ["id", "name", "address", "phone"] },
        {
          model: UserSalary,
          as: "UserSalaries",
          required: false,
          separate: true,
          order: [["effectiveFrom", "DESC"]],
          limit: 1,
          attributes: ["id", "salaryType", "amount", "effectiveFrom", "status"],
        },
      ],
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const data = toSafeStaff(staff);
    delete data.UserSalaries;
    const latestSalary = staff.UserSalaries && staff.UserSalaries[0];
    if (latestSalary) {
      data.userSalary = {
        id: latestSalary.id,
        salaryType: latestSalary.salaryType,
        amount: parseFloat(latestSalary.amount),
        effectiveFrom: latestSalary.effectiveFrom,
        status: latestSalary.status,
      };
    } else {
      data.userSalary = null;
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getStaffById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/staff/:id
 * Only Admin can update. Manager/Cashier have view-only access (no edit).
 */
/**
 * PUT /api/staff/:id
 * Only Admin can update. Manager/Cashier have view-only access (no edit).
 */
async function updateStaff(req, res) {
  try {
    if (isStaffSelfOnly(req)) {
      return res.status(403).json({ success: false, message: "You have view-only access. Editing is not allowed." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff id" });
    }

    const staff = await Staff.findOne({ where: { id, organizationId } });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const body = req.body;

    // Basic fields - FIXED lastName handling
    if (body.firstName !== undefined) {
      staff.firstName = String(body.firstName).trim();
    }
    if (body.lastName !== undefined) {
      // Allow lastName to be empty string or null
      staff.lastName = body.lastName ? String(body.lastName).trim() : null;
    }
    if (body.email !== undefined) {
      staff.email = String(body.email).trim().toLowerCase();
    }
    if (body.prefix !== undefined) {
      staff.prefix = body.prefix ? String(body.prefix).trim() : null;
    }
    if (typeof body.isActive === "boolean") staff.isActive = body.isActive;
    
    // Branch update
    if (body.branchId !== undefined && body.branchId !== null && body.branchId !== "") {
      const branchId = parseInt(body.branchId, 10);
      if (!Number.isNaN(branchId)) {
        const branch = await Branch.findOne({ 
          where: { id: branchId, organizationId } 
        });
        if (branch) {
          staff.branchId = branchId;
        }
      }
    }

    // Login fields
    if (typeof body.allowLogin === "boolean") staff.allowLogin = body.allowLogin;
    if (body.username !== undefined) {
      staff.username = body.username ? String(body.username).trim() : null;
    } else if (staff.allowLogin && !staff.username) {
      staff.username = staff.email;
    }
    if (body.role !== undefined) {
      const r = String(body.role).trim();
      staff.role = r || null;
    }
    if (body.accessLocations !== undefined) {
      staff.accessLocations = body.accessLocations ? (typeof body.accessLocations === "string" ? body.accessLocations : JSON.stringify(body.accessLocations)) : null;
    }
    if (body.salesCommissionPercent !== undefined) {
      staff.salesCommissionPercent = body.salesCommissionPercent === "" ? null : parseFloat(body.salesCommissionPercent);
    }
    if (body.maxSalesDiscountPercent !== undefined) {
      staff.maxSalesDiscountPercent = body.maxSalesDiscountPercent === "" ? null : parseFloat(body.maxSalesDiscountPercent);
    }
    if (typeof body.allowSelectedContacts === "boolean") staff.allowSelectedContacts = body.allowSelectedContacts;

    // Commission fields
    if (body.commissionType !== undefined) {
      staff.commissionType = body.commissionType;
    }
    if (body.commissionValue !== undefined) {
      staff.commissionValue = body.commissionValue === "" ? 0 : parseFloat(body.commissionValue);
    }

    // Schedule fields
    if (body.workingDays !== undefined) {
      staff.workingDays = body.workingDays ? (typeof body.workingDays === "string" ? body.workingDays : JSON.stringify(body.workingDays)) : null;
    }
    if (body.startTime !== undefined) staff.startTime = body.startTime || null;
    if (body.endTime !== undefined) staff.endTime = body.endTime || null;
    if (body.breakStartTime !== undefined) staff.breakStartTime = body.breakStartTime || null;
    if (body.breakEndTime !== undefined) staff.breakEndTime = body.breakEndTime || null;

    // Handle password and user login
    staff.password = null;
    if (staff.allowLogin) {
      const loginUsername = (staff.username || staff.email || "").toLowerCase();
      const loginEmail = staff.email;
      if (staff.userId) {
        const user = await User.findByPk(staff.userId);
        if (user) {
          if (body.password !== undefined && body.password && String(body.password).trim()) {
            user.password = await bcrypt.hash(String(body.password), 10);
          }
          if (body.username !== undefined) user.username = loginUsername;
          if (body.email !== undefined) user.email = loginEmail;
          // FIXED: Update user's name when firstName or lastName changes
          const fullName = [staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.firstName;
          user.name = fullName;
          user.role = staff.role || user.role;
          await user.save();
        }
      } else if (body.password && String(body.password).trim()) {
        const newPassword = String(body.password).trim();
        const existingUser = await User.findOne({ where: { email: loginEmail } });
        if (existingUser) {
          return res.status(409).json({ success: false, message: "A user with this email already exists." });
        }
        const uname = loginUsername || loginEmail;
        const existingByUsername = await User.findOne({ where: { username: uname } });
        if (existingByUsername) {
          return res.status(409).json({ success: false, message: "This username is already taken." });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const fullName = [staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.firstName;
        const newUser = await User.create({
          username: uname,
          email: loginEmail,
          password: hashedPassword,
          name: fullName,
          organizationId: staff.organizationId,
          branchId: staff.branchId,
          role: staff.role || "Staff",
        });
        staff.userId = newUser.id;
      }
    } else {
      staff.userId = null;
    }

    // All optional personal and bank fields
    const optional = [
      "dateOfBirth", "gender", "maritalStatus", "bloodGroup", "mobileNumber",
      "alternateContactNumber", "familyContactNumber", "facebookLink", "twitterLink",
      "socialMedia1", "socialMedia2", "customField",
      "guardianName", "idProofName", "idProofNumber", "permanentAddress", "currentAddress",
      "bankAccountHolderName", "bankAccountNumber", "bankName", "bankIdentifierCode", "bankBranch", "taxPayerId",
    ];
    optional.forEach((key) => {
      if (body[key] !== undefined) {
        staff[key] = body[key] === "" ? null : body[key];
      }
    });

    await staff.save();

    // Sync staff isActive to user_salaries
    if (typeof body.isActive === "boolean") {
      const newStatus = body.isActive ? "active" : "inactive";
      await UserSalary.update(
        { status: newStatus },
        { where: { staffId: id, organizationId } }
      );
    }

    // Update or create salary record if provided
    if (body.salaryAmount !== undefined && body.salaryAmount !== "" && body.salaryAmount !== null) {
      const salaryAmount = parseFloat(body.salaryAmount);
      if (!isNaN(salaryAmount) && salaryAmount >= 0) {
        const existingSalary = await UserSalary.findOne({
          where: { staffId: id, organizationId },
          order: [["effectiveFrom", "DESC"]],
        });
        
        const salaryData = {
          staffId: id,
          organizationId,
          branchId: staff.branchId,
          salaryType: body.salaryType || "monthly",
          amount: salaryAmount,
          effectiveFrom: body.salaryEffectiveFrom || new Date().toISOString().slice(0, 10),
          status: staff.isActive ? "active" : "inactive",
        };
        
        if (existingSalary && !body.createNewSalary) {
          await existingSalary.update(salaryData);
        } else if (body.salaryAmount !== undefined && body.salaryAmount !== "") {
          await UserSalary.create(salaryData);
        }
      }
    }

    // Fetch updated staff with relations
    const updatedStaff = await Staff.findOne({
      where: { id, organizationId },
      include: [
        { model: Branch, as: "Branch", attributes: ["id", "name", "address", "phone"] },
        {
          model: UserSalary,
          as: "UserSalaries",
          required: false,
          separate: true,
          order: [["effectiveFrom", "DESC"]],
          limit: 1,
        },
      ],
    });

    const data = toSafeStaff(updatedStaff);
    if (updatedStaff.UserSalaries && updatedStaff.UserSalaries[0]) {
      const latestSalary = updatedStaff.UserSalaries[0];
      data.userSalary = {
        id: latestSalary.id,
        salaryType: latestSalary.salaryType,
        amount: parseFloat(latestSalary.amount),
        effectiveFrom: latestSalary.effectiveFrom,
        status: latestSalary.status,
      };
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("updateStaff error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/staff/:id
 * Only Admin (org user) can delete. Manager/Cashier cannot delete anyone.
 */
async function deleteStaff(req, res) {
  try {
    if (req.staff) {
      return res.status(403).json({ success: false, message: "Only Admin can delete staff." });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff id" });
    }

    const staff = await Staff.findOne({ where: { id, organizationId } });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    const userId = staff.userId;
    await staff.destroy();
    if (userId) {
      await User.destroy({ where: { id: userId } }).catch(() => {});
    }
    return res.status(200).json({ success: true, message: "Staff deleted" });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("deleteStaff error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/staff/:id/logs
 * Query: dateRange (today, yesterday, this_week, this_month, custom), startDate, endDate
 */
async function getStaffLogs(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;
    const { dateRange, startDate, endDate } = req.query;

    const staffId = parseInt(id, 10);
    if (Number.isNaN(staffId)) {
      return res.status(400).json({ success: false, message: "Invalid staff ID" });
    }

    if (isStaffSelfOnly(req) && req.staff.id !== staffId) {
      return res.status(403).json({ success: false, message: "Cannot view logs for other staff" });
    }

    const where = { organizationId, staffId };
    
    // Apply Date Filters
    const now = new Date();
    if (dateRange === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      where.createdAt = { [require("sequelize").Op.between]: [start, end] };
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday.setHours(0, 0, 0, 0));
      const end = new Date(yesterday.setHours(23, 59, 59, 999));
      where.createdAt = { [require("sequelize").Op.between]: [start, end] };
    } else if (dateRange === 'this_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      where.createdAt = { [require("sequelize").Op.gte]: start };
    } else if (dateRange === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      where.createdAt = { [require("sequelize").Op.gte]: start };
    } else if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { [require("sequelize").Op.between]: [start, end] };
    }

    const logs = await StaffLog.findAll({
      where,
      include: [
        { model: Sale, as: "sale", attributes: ["id", "referenceNo", "createdAt"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    console.error("getStaffLogs error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  getAllStaff,
  createStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getStaffLogs,
};
