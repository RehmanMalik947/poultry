const { User } = require("../models/users");
const { Organization } = require("../models/organization");
const { SuperAdmin } = require("../models/superAdmin");
const { Staff } = require("../models/staff");
const { Role } = require("../models/role");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/token");
const { randomPassword } = require("../utils/randomPassword");
const { sendLoginCredentials } = require("../utils/sendEmail");
const { sequelize } = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

/**
 * Create Organization: create organization + first admin user, send password by email.
 * POST /api/auth/register
 * Body: organizationName*, username*, email*, phone*, emergencyContact?, address?, totalEmployees?, industryCategory?
 */
async function register(req, res) {
  try {
    const {
      organizationName,
      name: bodyName,
      username: bodyUsername,
      email,
      phone,
      emergencyContact,
      address,
      totalEmployees,
      industryCategory,
      timezone,
    } = req.body;
    const orgName = (organizationName || bodyName || "").trim();
    const username = bodyUsername != null ? String(bodyUsername).trim() : "";
    if (!orgName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Organization name, email and phone are required",
      });
    }
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.toLowerCase();
    const existingEmail = await User.findOne({ where: { email: normalizedEmail } });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    const existingUsername = await User.findOne({ where: { username: normalizedUsername } });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: "This username is already taken",
      });
    }

    const plainPassword = randomPassword(12);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Using transaction to prevent orphan organizations
    const result = await sequelize.transaction(async (t) => {
      const org = await Organization.create({
        name: orgName,
        email: normalizedEmail,
        phone: String(phone).trim(),
        emergencyContact: emergencyContact ? String(emergencyContact).trim() : null,
        address: address ? String(address).trim() : null,
        totalEmployees: totalEmployees != null && totalEmployees !== "" ? parseInt(totalEmployees, 10) : null,
        industryCategory: industryCategory ? String(industryCategory).trim() : null,
        timezone: timezone ? String(timezone).trim() : "UTC",
        status: "pending",
      }, { transaction: t });

      const user = await User.create({
        name: orgName,
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        organizationId: org.id,
        role: "ADMIN",
      }, { transaction: t });

      return { org, user };
    });

    const { org, user } = result;

    // Email sending removed from registration.
    // Password will be generated and sent via email upon Super Admin approval.

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please wait for Super Admin approval.",
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: org.id,
        },
        organization: {
          id: org.id,
          name: org.name,
          email: org.email,
          phone: org.phone,
          emergencyContact: org.emergencyContact,
          address: org.address,
          totalEmployees: org.totalEmployees,
          industryCategory: org.industryCategory,
        },
      },
    });
  } catch (err) {
    console.error("Auth register error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * Login: username or email + password. User can sign in with either username or email.
 * POST /api/auth/login
 * Body: { login, password } or { email, password } - login/email can be username or email
 */
async function login(req, res) {
  try {
    const loginValue = req.body.login != null ? req.body.login : req.body.email;
    const password = req.body.password;
    if (!loginValue || !password) {
      return res.status(400).json({ success: false, message: "Username/email and password are required" });
    }

    const input = String(loginValue).trim();
    const isEmail = input.includes("@");
    const normalizedEmail = isEmail ? input.toLowerCase() : null;
    const normalizedUsername = !isEmail ? input.toLowerCase() : null;

    // Try Super Admin first (by email only; SuperAdmin has no username)
    if (normalizedEmail) {
      const superAdmin = await SuperAdmin.findOne({ where: { email: normalizedEmail } });
      if (superAdmin) {
        const match = await bcrypt.compare(String(password), superAdmin.password);
        if (match) {
          const token = generateToken({
            id: superAdmin.id,
            email: superAdmin.email,
            isSuperAdmin: true,
          });
          return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
              token,
              isSuperAdmin: true,
              user: {
                id: superAdmin.id,
                name: superAdmin.name,
                email: superAdmin.email,
              },
              organization: null,
            },
          });
        }
      }
    }

    // Sign-in is via User model only (users table). Staff who can sign in have a User row with branchId set.
    const userWhere = normalizedEmail
      ? { email: normalizedEmail }
      : { username: normalizedUsername };
    const user = await User.findOne({
      where: userWhere,
      include: [{ model: Organization, as: "Organization", attributes: ["id", "name", "email", "phone"] }],
    });

    if (user) {
      const match = await bcrypt.compare(String(password), user.password);
      if (match) {
        const org = user.Organization;
        const isStaff = user.branchId != null;
        let staffId = null;
        let staffRecord = null;
        if (isStaff) {
          staffRecord = await Staff.findOne({ where: { userId: user.id } });
          staffId = staffRecord ? staffRecord.id : user.id;
        }
        const roleName = user.role || (staffRecord && staffRecord.role) || "";
        let permissions = [];
        if (user.organizationId && roleName) {
          const roleRow = await Role.findOne({
            where: { organizationId: user.organizationId, name: roleName },
            attributes: ["permissions"],
          });
          if (roleRow && Array.isArray(roleRow.permissions)) {
            permissions = roleRow.permissions;
          }
        }
        const token = generateToken({
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
          branchId: user.branchId || undefined,
          role: roleName,
          ...(isStaff && { staffId, isStaff: true }),
        });
        const userPayload = isStaff && staffRecord
          ? {
            id: staffRecord.id,
            staffId: staffRecord.id,
            username: user.username,
            email: user.email,
            firstName: staffRecord.firstName,
            lastName: staffRecord.lastName,
            role: roleName,
            organizationId: user.organizationId,
            branchId: user.branchId,
            permissions,
          }
          : {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: roleName,
            organizationId: user.organizationId,
            permissions: user.organizationId && roleName ? permissions : [],
          };
          
        // Log the activity
        logActivity({
          organizationId: user.organizationId,
          branchId: user.branchId || null,
          userId: user.id,
          module: 'Auth',
          action: 'Login',
          description: `User ${user.name} logged in successfully`
        });

        return res.status(200).json({
          success: true,
          message: "Login successful",
          data: {
            token,
            isSuperAdmin: false,
            isStaff: isStaff,
            user: userPayload,
            organization: isStaff ? null : (org ? { id: org.id, name: org.name, email: org.email, phone: org.phone } : null),
          },
        });
      }
    }

    return res.status(401).json({ success: false, message: "Invalid username/email or password" });
  } catch (err) {
    console.error("Auth login error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

async function changePassword(req, res) {
  try {
    // Admin ka ID `req.user.id` se aayega, aur Staff ka `req.staff.userId` se
    const userId = req.user ? req.user.id : (req.staff ? req.staff.userId : null);
    if (!userId) {
      return res.status(403).json({ success: false, message: "User context not found" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Purana password theek hai ya nahi
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    // Naya password hash kar ke save kar dein
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function logout(req, res) {
  try {
    const userId = req.user ? req.user.id : (req.staff ? req.staff.userId : null);
    const orgId = req.user ? req.user.organizationId : (req.staff ? req.staff.organizationId : null);
    
    if (userId && orgId) {
      const user = await User.findByPk(userId);
      logActivity({
        organizationId: orgId,
        branchId: req.user?.branchId || req.staff?.branchId || null,
        userId: userId,
        module: 'Auth',
        action: 'Logout',
        description: `User ${user ? user.name : 'Unknown'} logged out`
      });
    }
    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  register,
  login,
  changePassword,
  logout,
};
