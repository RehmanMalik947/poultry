const { Customer } = require("../models/customer");
const { Branch } = require("../models/branch");
const { Sale } = require("../models/sale");
const { SaleItem } = require("../models/saleItem");
const { Op } = require("sequelize");

function customerToJson(customer) {
  return {
    id: customer.id,

    // Basic
    name: customer.name,
    businessName: customer.businessName,
    email: customer.email,
    mobile: customer.mobile,
    address: customer.address,

    // Business
    taxNumber: customer.taxNumber,
    creditLimit: customer.creditLimit != null ? parseFloat(customer.creditLimit) : 0,
    payTerm: customer.payTerm,

    // Financial
    openingBalance:
      customer.openingBalance != null ? parseFloat(customer.openingBalance) : 0,

    // NOTE:
    // advanceBalance was previously used in this controller,
    // but your Customer model does not currently contain advanceBalance.
    // Keep it commented unless you add it to the model/database.
    // advanceBalance:
    //   customer.advanceBalance != null ? parseFloat(customer.advanceBalance) : 0,

    totalSaleDue:
      customer.totalSaleDue != null ? parseFloat(customer.totalSaleDue) : 0,
    totalSellReturnDue:
      customer.totalSellReturnDue != null
        ? parseFloat(customer.totalSellReturnDue)
        : 0,

    // Classification
    customerGroup: customer.customerGroup,

    // New proper Active field
    active: customer.active,

    // Old field kept only for compatibility
    platinum: customer.platinum,

    // Custom Fields
    customField1: customer.customField1,
    customField2: customer.customField2,
    customField3: customer.customField3,
    customField4: customer.customField4,
    customField5: customer.customField5,
    customField6: customer.customField6,
    customField7: customer.customField7,
    customField8: customer.customField8,
    customField9: customer.customField9,

    // System
    organizationId: customer.organizationId,
    branchId: customer.branchId,

    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;

  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }

  return id;
}

/** Admin or Manager may update/delete customers. */
function canManageCustomers(req) {
  const role = req.user?.role ?? req.staff?.role;
  return role === "Admin" || role === "ADMIN" || role === "Manager";
}

/** Admin, Manager, or Staff may create customers. */
function canCreateCustomer(req) {
  const role = req.user?.role ?? req.staff?.role;
  return (
    role === "Admin" ||
    role === "ADMIN" ||
    role === "Manager" ||
    role === "Staff"
  );
}

/**
 * Get branch ID from X-Branch-Id header.
 * Validates branch belongs to org.
 * Returns null if header missing.
 */
async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];

  if (raw == null || raw === "") return null;

  const branchId = parseInt(raw, 10);

  if (Number.isNaN(branchId)) return null;

  const branch = await Branch.findOne({
    where: { id: branchId, organizationId },
  });

  return branch ? branch.id : null;
}

/**
 * Resolve branch ID:
 * from body.branchId if valid for org,
 * otherwise from X-Branch-Id header.
 */
async function resolveBranchId(req, organizationId) {
  const fromBody =
    req.body?.branchId != null ? parseInt(req.body.branchId, 10) : null;

  if (fromBody != null && !Number.isNaN(fromBody)) {
    const branch = await Branch.findOne({
      where: { id: fromBody, organizationId },
    });

    if (branch) return branch.id;
  }

  return getBranchIdFromHeader(req, organizationId);
}

/**
 * POST /api/customers
 */
async function createCustomer(req, res) {
  try {
    if (!canCreateCustomer(req)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add customers.",
      });
    }

    const organizationId = getOrganizationId(req);
    const branchId = await resolveBranchId(req, organizationId);

    const {
      name,
      businessName,
      email,
      mobile,
      address,
      taxNumber,
      creditLimit,
      payTerm,
      openingBalance,
      customerGroup,
      active,

      // Old field kept only for backward compatibility.
      // Do not use platinum as Active anymore.
      platinum,

      customField1,
      customField2,
      customField3,
      customField4,
      customField5,
      customField6,
      customField7,
      customField8,
      customField9,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const customer = await Customer.create({
      name: name.trim(),
      businessName: businessName || null,
      email: email || null,
      mobile: mobile || null,
      address: address || null,

      taxNumber: taxNumber || null,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      payTerm: payTerm ? parseInt(payTerm, 10) : null,

      openingBalance: openingBalance ? parseFloat(openingBalance) : 0,

      totalSaleDue: 0,
      totalSellReturnDue: 0,

      customerGroup: customerGroup || null,

      // Proper Active field
      active:
        active === undefined
          ? true
          : active === true || active === "true" || active === 1 || active === "1",

      // Keep old platinum value if frontend/backend sends it,
      // but it is no longer used as Active.
      platinum:
        platinum === true ||
        platinum === "true" ||
        platinum === 1 ||
        platinum === "1",

      customField1,
      customField2,
      customField3,
      customField4,
      customField5,
      customField6,
      customField7,
      customField8,
      customField9,

      organizationId,
      branchId: branchId || null,
    });

    return res.status(201).json({
      success: true,
      data: customerToJson(customer),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("createCustomer error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/customers?search=John&page=1&limit=10
 */
async function getAllCustomers(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { search, page: pageParam, limit: limitParam } = req.query;

    const where = { organizationId };

    if (branchId != null) {
      where.branchId = branchId;
    }

    if (search != null && String(search).trim() !== "") {
      const trimmedSearch = String(search).trim();

      where[Op.or] = [
        { name: { [Op.like]: `%${trimmedSearch}%` } },
        { mobile: { [Op.like]: `%${trimmedSearch}%` } },
        { businessName: { [Op.like]: `%${trimmedSearch}%` } },
        { taxNumber: { [Op.like]: `%${trimmedSearch}%` } },
      ];
    }

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(5000, Math.max(1, parseInt(limitParam, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: customers } = await Customer.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: customers.map(customerToJson),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("getAllCustomers error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/customers/:id
 */
async function getCustomerById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { id } = req.params;

    const where = {
      id: Number(id),
      organizationId,
    };

    if (branchId != null) {
      where.branchId = branchId;
    }

    const customer = await Customer.findOne({ where });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customerToJson(customer),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("getCustomerById error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * PUT /api/customers/:id
 */
async function updateCustomer(req, res) {
  try {
    if (!canManageCustomers(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can edit customers.",
      });
    }

    const organizationId = getOrganizationId(req);
    const branchIdHeader = await getBranchIdFromHeader(req, organizationId);

    const { id } = req.params;

    const {
      name,
      businessName,
      email,
      mobile,
      address,
      taxNumber,
      creditLimit,
      payTerm,
      openingBalance,
      customerGroup,
      active,

      // Old field only for compatibility
      platinum,

      customField1,
      customField2,
      customField3,
      customField4,
      customField5,
      customField6,
      customField7,
      customField8,
      customField9,

      branchId: bodyBranchId,
    } = req.body;

    const where = {
      id: Number(id),
      organizationId,
    };

    if (branchIdHeader != null) {
      where.branchId = branchIdHeader;
    }

    const customer = await Customer.findOne({ where });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (bodyBranchId !== undefined) {
      const bid =
        bodyBranchId === null || bodyBranchId === ""
          ? null
          : parseInt(bodyBranchId, 10);

      if (bid != null && !Number.isNaN(bid)) {
        const branch = await Branch.findOne({
          where: { id: bid, organizationId },
        });

        if (branch) {
          customer.branchId = branch.id;
        }
      } else {
        customer.branchId = null;
      }
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      customer.name = name.trim();
    }

    if (businessName !== undefined) {
      customer.businessName = businessName || null;
    }

    if (email !== undefined) {
      customer.email = email != null ? String(email).trim() || null : null;
    }

    if (mobile !== undefined) {
      customer.mobile = mobile != null ? String(mobile).trim() || null : null;
    }

    if (address !== undefined) {
      customer.address = address || null;
    }

    if (taxNumber !== undefined) {
      customer.taxNumber = taxNumber || null;
    }

    if (creditLimit !== undefined) {
      customer.creditLimit = creditLimit ? parseFloat(creditLimit) : 0;
    }

    if (payTerm !== undefined) {
      customer.payTerm = payTerm ? parseInt(payTerm, 10) : null;
    }

    if (openingBalance !== undefined) {
      customer.openingBalance = openingBalance ? parseFloat(openingBalance) : 0;
    }

    if (customerGroup !== undefined) {
      customer.customerGroup = customerGroup || null;
    }

    // Proper Active field update
    if (active !== undefined) {
      customer.active =
        active === true || active === "true" || active === 1 || active === "1";
    }

    // Old platinum field compatibility only
    if (platinum !== undefined) {
      customer.platinum =
        platinum === true ||
        platinum === "true" ||
        platinum === 1 ||
        platinum === "1";
    }

    // Custom fields
    if (customField1 !== undefined) customer.customField1 = customField1;
    if (customField2 !== undefined) customer.customField2 = customField2;
    if (customField3 !== undefined) customer.customField3 = customField3;
    if (customField4 !== undefined) customer.customField4 = customField4;
    if (customField5 !== undefined) customer.customField5 = customField5;
    if (customField6 !== undefined) customer.customField6 = customField6;
    if (customField7 !== undefined) customer.customField7 = customField7;
    if (customField8 !== undefined) customer.customField8 = customField8;
    if (customField9 !== undefined) customer.customField9 = customField9;

    await customer.save();

    return res.status(200).json({
      success: true,
      data: customerToJson(customer),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("updateCustomer error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * DELETE /api/customers/:id
 */
async function deleteCustomer(req, res) {
  try {
    if (!canManageCustomers(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can delete customers.",
      });
    }

    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { id } = req.params;

    const where = {
      id: Number(id),
      organizationId,
    };

    if (branchId != null) {
      where.branchId = branchId;
    }

    const customer = await Customer.findOne({ where });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await customer.destroy();

    return res.status(200).json({
      success: true,
      message: "Customer deleted",
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("deleteCustomer error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * Get start and end date YYYY-MM-DD for report period.
 */
function getDateRangeForPeriod(period, dateStr) {
  const d = dateStr ? new Date(dateStr + "T12:00:00") : new Date();

  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  let start;
  let end;

  if (period === "daily") {
    start = end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  } else if (period === "weekly") {
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const mon = new Date(d);
    mon.setDate(diff);

    start = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(mon.getDate()).padStart(2, "0")}`;

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    end = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(sun.getDate()).padStart(2, "0")}`;
  } else if (period === "monthly") {
    start = `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const lastDay = new Date(year, month + 1, 0).getDate();

    end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`;
  } else if (period === "yearly") {
    start = `${year}-01-01`;
    end = `${year}-12-31`;
  } else {
    start = end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  }

  return { start, end };
}

/**
 * GET /api/customers/report?period=daily|weekly|monthly|yearly&date=YYYY-MM-DD
 */
async function getCustomerReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    if (branchId == null) {
      return res.status(400).json({
        success: false,
        message: "Branch required (X-Branch-Id header)",
      });
    }

    const { period = "monthly", date: dateParam } = req.query;
    const dateStr = dateParam ? String(dateParam).trim().slice(0, 10) : null;

    const { start, end } = getDateRangeForPeriod(String(period), dateStr);

    const where = {
      organizationId,
      branchId,
    };

    const customers = await Customer.findAll({
      where,
      order: [["name", "ASC"]],
    });

    const filtered = customers.filter((c) => {
      const lastVisitOk = c.lastVisit && c.lastVisit >= start && c.lastVisit <= end;

      const createdDate = c.createdAt
        ? c.createdAt.toISOString().slice(0, 10)
        : null;

      const createdOk =
        createdDate && createdDate >= start && createdDate <= end;

      return lastVisitOk || createdOk;
    });

    const customerIds = filtered.map((c) => c.id);
    const lastServicesByCustomer = {};

    if (customerIds.length > 0) {
      const sales = await Sale.findAll({
        where: {
          customerId: { [Op.in]: customerIds },
        },
        include: [
          {
            model: SaleItem,
            as: "SaleItems",
            attributes: ["itemName", "itemType"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      for (const sale of sales) {
        if (
          sale.customerId != null &&
          lastServicesByCustomer[sale.customerId] == null
        ) {
          const names = (sale.SaleItems || [])
            .filter((i) => i.itemType === "service" || i.itemType === "package")
            .map((i) => i.itemName)
            .filter(Boolean);

          lastServicesByCustomer[sale.customerId] = [...new Set(names)].join(
            ", "
          );
        }
      }
    }

    const rows = filtered.map((c) => {
      const dateVal =
        c.lastVisit || (c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "");

      return {
        date: dateVal,
        name: c.name || "",
        number: c.mobile || "",
        mobile: c.mobile || "",
        cnic: c.taxNumber || "",
        shopName: c.businessName || "",
        address: c.address || "",
        openingBalance:
          c.openingBalance != null ? parseFloat(c.openingBalance) : 0,
        active: c.active,
        email: c.email || "",
        lastServicesUsed: lastServicesByCustomer[c.id] || "",
      };
    });

    return res.status(200).json({
      success: true,
      data: rows,
      start,
      end,
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("getCustomerReport error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/customers/:id/last-services
 */
async function getCustomerLastServices(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { id } = req.params;

    const where = {
      id: Number(id),
      organizationId,
    };

    if (branchId != null) {
      where.branchId = branchId;
    }

    const customer = await Customer.findOne({ where });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const lastSale = await Sale.findOne({
      where: { customerId: customer.id },
      include: [
        {
          model: SaleItem,
          as: "SaleItems",
          attributes: ["itemName", "itemType"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const lastServices =
      lastSale && lastSale.SaleItems
        ? [
            ...new Set(
              lastSale.SaleItems
                .filter(
                  (i) => i.itemType === "service" || i.itemType === "package"
                )
                .map((i) => i.itemName)
                .filter(Boolean)
            ),
          ]
        : [];

    return res.status(200).json({
      success: true,
      data: { lastServices },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("getCustomerLastServices error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

async function getCustomerHistory(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { id } = req.params;
    const { dateRange, startDate, endDate } = req.query;

    const where = {
      customerId: Number(id),
      organizationId,
    };

    if (branchId != null) {
      where.branchId = branchId;
    }

    const now = new Date();

    if (dateRange === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));

      where.createdAt = {
        [Op.between]: [start, end],
      };
    } else if (dateRange === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const start = new Date(yesterday.setHours(0, 0, 0, 0));
      const end = new Date(yesterday.setHours(23, 59, 59, 999));

      where.createdAt = {
        [Op.between]: [start, end],
      };
    } else if (dateRange === "this_week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);

      where.createdAt = {
        [Op.gte]: start,
      };
    } else if (dateRange === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);

      where.createdAt = {
        [Op.gte]: start,
      };
    } else if (dateRange === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.createdAt = {
        [Op.between]: [start, end],
      };
    }

    const sales = await Sale.findAll({
      where,
      include: [
        {
          model: SaleItem,
          as: "SaleItems",
          attributes: ["itemName", "itemType", "price", "quantity"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("getCustomerHistory error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerReport,
  getCustomerLastServices,
  getCustomerHistory,
};