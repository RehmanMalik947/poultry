const { Supplier } = require("../models/supplier");
const { SupplierTransaction } = require("../models/supplierTransaction");
const { Purchase } = require("../models/purchase");
const { Bank } = require("../models/bank");
const { BankTransaction } = require("../models/bankTransaction");
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { Branch } = require("../models/branch");

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

  const branch = await Branch.findOne({
    where: { id: branchId, organizationId },
  });

  return branch ? branch.id : null;
}

function canEditDelete(req) {
  if (req.user) return true;

  if (
    req.staff &&
    (req.staff.role === "Admin" || req.staff.role === "Manager")
  ) {
    return true;
  }

  return false;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;

  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1" ||
    value === "on"
  );
}

async function generatePaymentReference(organizationId, type, transaction) {
  const year = new Date().getFullYear();
  const prefix = type === "advance" ? `ADV${year}-` : `SP${year}-`;

  const lastTx = await SupplierTransaction.findOne({
    where: {
      organizationId,
      referenceNo: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["id", "DESC"]],
    transaction,
  });

  let refNo = `${prefix}0001`;

  if (lastTx && lastTx.referenceNo) {
    const parts = lastTx.referenceNo.split("-");

    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      refNo = `${prefix}${String(parseInt(parts[1], 10) + 1).padStart(
        4,
        "0"
      )}`;
    }
  }

  return refNo;
}

function toJson(s) {
  return {
    id: s.id,
    organizationId: s.organizationId,
    branchId: s.branchId,

    // Main visible fields
    name: s.name,
    phone: s.phone,
    taxNumber: s.taxNumber,
    businessName: s.businessName,
    address: s.address,
    openingBalance: s.openingBalance,
    active: s.active,

    // Old / detailed fields kept for compatibility
    contactId: s.contactId,
    isIndividual: s.isIndividual,
    prefix: s.prefix,
    firstName: s.firstName,
    lastName: s.lastName,
    alternateNumber: s.alternateNumber,
    landline: s.landline,
    email: s.email,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    city: s.city,
    state: s.state,
    country: s.country,
    zipCode: s.zipCode,
    payTerm: s.payTerm,
    payTermType: s.payTermType,
    advanceBalance: s.advanceBalance,
    customField1: s.customField1,
    customField2: s.customField2,
    customField3: s.customField3,
    customField4: s.customField4,
    customField5: s.customField5,
    customField6: s.customField6,
    customField7: s.customField7,
    customField8: s.customField8,
    customField9: s.customField9,
    customField10: s.customField10,
    contactPersons: s.contactPersons,

    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/** Get start and end date (YYYY-MM-DD) for period. dateStr = YYYY-MM-DD. */
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
 * GET /api/suppliers/report?period=daily|weekly|monthly|yearly&date=YYYY-MM-DD
 */
async function getSupplierReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { period = "monthly", date: dateParam } = req.query;
    const dateStr = dateParam ? String(dateParam).trim().slice(0, 10) : null;

    const { start, end } = getDateRangeForPeriod(String(period), dateStr);

    const where = { organizationId };

    if (branchId) {
      where.branchId = branchId;
    }

    const suppliers = await Supplier.findAll({
      where,
      order: [["name", "ASC"]],
    });

    const filtered = suppliers.filter((s) => {
      const createdDate = s.createdAt
        ? s.createdAt.toISOString().slice(0, 10)
        : null;

      return createdDate && createdDate >= start && createdDate <= end;
    });

    const rows = filtered.map((s) => {
      const dateVal = s.createdAt ? s.createdAt.toISOString().slice(0, 10) : "";

      return {
        date: dateVal,
        name: s.name || "",
        mobile: s.phone || "",
        phone: s.phone || "",
        cnic: s.taxNumber || "",
        farmName: s.businessName || "",
        address: s.address || s.addressLine1 || "",
        openingBalance:
          s.openingBalance != null ? parseFloat(s.openingBalance) : 0,
        active: s.active,
        email: s.email || "",
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

    console.error("getSupplierReport error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/suppliers/list
 */
async function getList(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId };

    if (branchId) {
      where.branchId = branchId;
    }

    const list = await Supplier.findAll({
      where,
      order: [["name", "ASC"]],
      attributes: [
        "id",
        "name",
        "phone",
        "email",
        "businessName",
        "taxNumber",
        "active",
      ],
    });

    return res.status(200).json({
      success: true,
      data: list.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone ?? null,
        email: s.email ?? null,
        businessName: s.businessName ?? null,
        taxNumber: s.taxNumber ?? null,
        active: s.active,
      })),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("suppliers getList error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/suppliers/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const userBranchId = await getBranchIdFromHeader(req, organizationId);

    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const where = { id, organizationId };

    if (userBranchId) {
      where.branchId = userBranchId;
    }

    const s = await Supplier.findOne({ where });

    if (!s) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const purchases = await Purchase.findAll({
      where: {
        supplierId: s.id,
        organizationId,
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("totalAmount")), "totalPurchases"],
        [sequelize.fn("SUM", sequelize.col("paidAmount")), "totalPaid"],
      ],
    });

    const totalPurchases = purchases[0]?.getDataValue("totalPurchases") || 0;
    const totalPaid = purchases[0]?.getDataValue("totalPaid") || 0;
    const openingBalance = parseFloat(s.openingBalance) || 0;
    const advanceBalance = parseFloat(s.advanceBalance) || 0;

    const balanceDue =
      openingBalance + totalPurchases - totalPaid - advanceBalance;

    const data = {
      ...toJson(s),
      totalPurchases: parseFloat(totalPurchases),
      totalPaid: parseFloat(totalPaid),
      balanceDue: parseFloat(balanceDue),
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("suppliers getById error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/suppliers?search=&page=1&limit=20
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { search, page: pageParam, limit: limitParam } = req.query;

    const where = { organizationId };

    if (branchId) {
      where.branchId = branchId;
    }

    if (search != null && String(search).trim() !== "") {
      const term = `%${String(search).trim()}%`;

      where[Op.or] = [
        { name: { [Op.like]: term } },
        { businessName: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
        { taxNumber: { [Op.like]: term } },
        { email: { [Op.like]: term } },
      ];
    }

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const offset = (page - 1) * limit;

    const { count, rows: list } = await Supplier.findAndCountAll({
      where,
      order: [["name", "ASC"]],
      limit,
      offset,
    });

    const supplierIds = list.map((s) => s.id);

    const purchases = await Purchase.findAll({
      where: {
        supplierId: supplierIds,
        organizationId,
      },
      attributes: [
        "supplierId",
        [sequelize.fn("SUM", sequelize.col("totalAmount")), "totalPurchases"],
        [sequelize.fn("SUM", sequelize.col("paidAmount")), "totalPaid"],
      ],
      group: ["supplierId"],
    });

    const purchaseMap = {};

    purchases.forEach((p) => {
      purchaseMap[p.supplierId] = {
        totalPurchases: parseFloat(p.getDataValue("totalPurchases") || 0),
        totalPaid: parseFloat(p.getDataValue("totalPaid") || 0),
      };
    });

    const enrichedList = list.map((s) => {
      const p = purchaseMap[s.id] || {
        totalPurchases: 0,
        totalPaid: 0,
      };

      const opening = parseFloat(s.openingBalance) || 0;
      const advance = parseFloat(s.advanceBalance) || 0;

      const totalPurchaseDue = p.totalPurchases - p.totalPaid;
      const balanceDue = opening + p.totalPurchases - p.totalPaid - advance;

      return {
        ...toJson(s),
        balanceDue,
        totalPurchaseDue,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedList,
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

    console.error("suppliers getAll error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * POST /api/suppliers
 */
async function create(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can add suppliers.",
      });
    }

    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const body = req.body;

    const name = body.name != null ? String(body.name).trim() : "";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const s = await Supplier.create({
      organizationId,
      branchId,

      // Main visible fields
      name,
      phone: body.phone || null,
      taxNumber: body.taxNumber || null,
      businessName: body.businessName || null,
      address: body.address || null,
      openingBalance: parseFloat(body.openingBalance) || 0,
      active: parseBoolean(body.active, true),

      // Old / detailed fields kept for compatibility
      contactId: body.contactId || null,
      isIndividual: parseBoolean(body.isIndividual, false),
      prefix: body.prefix || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      alternateNumber: body.alternateNumber || null,
      landline: body.landline || null,
      email: body.email || null,
      addressLine1: body.addressLine1 || null,
      addressLine2: body.addressLine2 || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      zipCode: body.zipCode || null,
      payTerm: body.payTerm || null,
      payTermType: body.payTermType || "days",
      advanceBalance: parseFloat(body.advanceBalance) || 0,
      customField1: body.customField1 || null,
      customField2: body.customField2 || null,
      customField3: body.customField3 || null,
      customField4: body.customField4 || null,
      customField5: body.customField5 || null,
      customField6: body.customField6 || null,
      customField7: body.customField7 || null,
      customField8: body.customField8 || null,
      customField9: body.customField9 || null,
      customField10: body.customField10 || null,
      contactPersons: body.contactPersons || null,
    });

    return res.status(201).json({
      success: true,
      data: toJson(s),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("suppliers create error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * PUT /api/suppliers/:id
 */
async function update(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can edit suppliers.",
      });
    }

    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const s = await Supplier.findOne({
      where: {
        id,
        organizationId,
      },
    });

    if (!s) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const body = req.body;

    // Main visible fields
    if (body.name != null) {
      s.name = String(body.name).trim();
    }

    if (body.phone !== undefined) {
      s.phone = body.phone || null;
    }

    if (body.taxNumber !== undefined) {
      s.taxNumber = body.taxNumber || null;
    }

    if (body.businessName !== undefined) {
      s.businessName = body.businessName || null;
    }

    if (body.address !== undefined) {
      s.address = body.address || null;
    }

    if (body.openingBalance !== undefined) {
      s.openingBalance = parseFloat(body.openingBalance) || 0;
    }

    if (body.active !== undefined) {
      s.active = parseBoolean(body.active, true);
    }

    // Branch
    if (body.branchId !== undefined) {
      s.branchId = body.branchId;
    }

    // Old / detailed fields kept for compatibility
    if (body.contactId !== undefined) s.contactId = body.contactId;
    if (body.isIndividual !== undefined) {
      s.isIndividual = parseBoolean(body.isIndividual, false);
    }
    if (body.prefix !== undefined) s.prefix = body.prefix;
    if (body.firstName !== undefined) s.firstName = body.firstName;
    if (body.lastName !== undefined) s.lastName = body.lastName;
    if (body.alternateNumber !== undefined) {
      s.alternateNumber = body.alternateNumber;
    }
    if (body.landline !== undefined) s.landline = body.landline;
    if (body.email !== undefined) s.email = body.email;
    if (body.addressLine1 !== undefined) s.addressLine1 = body.addressLine1;
    if (body.addressLine2 !== undefined) s.addressLine2 = body.addressLine2;
    if (body.city !== undefined) s.city = body.city;
    if (body.state !== undefined) s.state = body.state;
    if (body.country !== undefined) s.country = body.country;
    if (body.zipCode !== undefined) s.zipCode = body.zipCode;
    if (body.payTerm !== undefined) s.payTerm = body.payTerm;
    if (body.payTermType !== undefined) s.payTermType = body.payTermType;
    if (body.advanceBalance !== undefined) {
      s.advanceBalance = parseFloat(body.advanceBalance) || 0;
    }

    for (let i = 1; i <= 10; i++) {
      const field = `customField${i}`;

      if (body[field] !== undefined) {
        s[field] = body[field];
      }
    }

    if (body.contactPersons !== undefined) {
      s.contactPersons = body.contactPersons;
    }

    await s.save();

    return res.status(200).json({
      success: true,
      data: toJson(s),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("suppliers update error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * DELETE /api/suppliers/:id
 */
async function remove(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can delete suppliers.",
      });
    }

    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const s = await Supplier.findOne({
      where: {
        id,
        organizationId,
      },
    });

    if (!s) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    await s.destroy();

    return res.status(200).json({
      success: true,
      message: "Supplier deleted",
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("suppliers remove error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * GET /api/suppliers/:id/ledger
 */
async function getSupplierLedger(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const s = await Supplier.findOne({
      where: {
        id,
        organizationId,
      },
    });

    if (!s) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const transactions = await SupplierTransaction.findAll({
      where: {
        supplierId: id,
        organizationId,
      },
      include: [
        {
          model: Purchase,
          as: "Purchase",
          attributes: ["referenceNo", "totalAmount", "status"],
        },
        {
          model: Bank,
          as: "Bank",
          attributes: ["bankName", "accountNumber"],
        },
      ],
      order: [["id", "DESC"]],
    });

    const purchases = await Purchase.findAll({
      where: {
        supplierId: id,
        organizationId,
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("totalAmount")), "totalPurchases"],
        [sequelize.fn("SUM", sequelize.col("paidAmount")), "totalPaid"],
      ],
    });

    const totalPurchases = purchases[0]?.getDataValue("totalPurchases") || 0;
    const totalPaid = purchases[0]?.getDataValue("totalPaid") || 0;
    const openingBalance = parseFloat(s.openingBalance) || 0;
    const advanceBalance = parseFloat(s.advanceBalance) || 0;

    const balanceDue =
      openingBalance + totalPurchases - totalPaid - advanceBalance;

    return res.status(200).json({
      success: true,
      data: {
        supplier: toJson(s),
        summary: {
          openingBalance,
          advanceBalance,
          totalPurchases: parseFloat(totalPurchases),
          totalPaid: parseFloat(totalPaid),
          balanceDue: parseFloat(balanceDue),
        },
        transactions,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("getSupplierLedger error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * POST /api/suppliers/:id/payment
 */
async function addSupplierPayment(req, res) {
  const transaction = await sequelize.transaction();

  try {
    if (!canEditDelete(req)) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can add supplier payments.",
      });
    }

    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const s = await Supplier.findOne({
      where: {
        id,
        organizationId,
      },
      transaction,
    });

    if (!s) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    let {
      cashPayment,
      bankPayment,
      totalPaid,
      bankId,
      referenceNo,
      note,
      date,
    } = req.body;

    const cPayment = parseFloat(cashPayment) || 0;
    const bPayment = parseFloat(bankPayment) || 0;
    let paymentAmount = cPayment + bPayment;

    if (paymentAmount <= 0 && parseFloat(totalPaid) > 0) {
      paymentAmount = parseFloat(totalPaid);
    }

    if (paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    let paymentRefNo = referenceNo;
    if (!paymentRefNo || (typeof paymentRefNo === 'string' && paymentRefNo.trim() === "")) {
      paymentRefNo = await generatePaymentReference(
        organizationId,
        "payment",
        transaction
      );
    }

    let paymentMethod = "cash";
    if (bPayment > 0 && cPayment === 0) paymentMethod = "bank_transfer";
    else if (cPayment > 0 && bPayment > 0) paymentMethod = "multiple";

    if (bPayment > 0 && bankId) {
      const bank = await Bank.findOne({
        where: { id: bankId, organizationId },
        transaction,
      });

      if (!bank) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid bank account" });
      }

      if (Number(bank.balance) < bPayment) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Insufficient bank balance" });
      }

      await BankTransaction.create(
        {
          organizationId,
          bankId: bank.id,
          type: "debit",
          amount: bPayment,
          transactionType: "supplier_payment",
          referenceId: s.id,
          description: `Supplier Payment: ${s.name} (${paymentRefNo})`,
          transactionDate: date || new Date(),
        },
        { transaction }
      );

      bank.balance = Number(bank.balance) - Number(bPayment);
      await bank.save({ transaction });
    }

    let remainingPayment = paymentAmount;

    const duePurchases = await Purchase.findAll({
      where: {
        supplierId: id,
        organizationId,
        paymentStatus: {
          [Op.ne]: "paid",
        },
      },
      order: [
        ["purchaseDate", "ASC"],
        ["id", "ASC"],
      ],
      transaction,
    });

    for (const p of duePurchases) {
      if (remainingPayment <= 0) break;

      const purchaseDue =
        parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0);

      const applyAmount = Math.min(remainingPayment, purchaseDue);

      if (applyAmount > 0) {
        p.paidAmount = parseFloat(p.paidAmount || 0) + applyAmount;

        if (p.paidAmount >= p.totalAmount) {
          p.paymentStatus = "paid";
        } else {
          p.paymentStatus = "partial";
        }

        await p.save({ transaction });

        remainingPayment -= applyAmount;

        const lastTxForBalance = await SupplierTransaction.findOne({
          where: {
            organizationId,
            supplierId: s.id,
          },
          order: [["id", "DESC"]],
          transaction,
        });

        const prevBal = lastTxForBalance
          ? parseFloat(lastTxForBalance.balance)
          : 0;

        await SupplierTransaction.create(
          {
            organizationId,
            supplierId: s.id,
            purchaseId: p.id,
            type: "purchase_payment",
            debit: 0,
            credit: applyAmount,
            balance: prevBal - applyAmount,
            paymentMethod: paymentMethod || "cash",
            bankId: bankId || null,
            referenceNo: paymentRefNo,
            note:
              note ||
              `Payment ${paymentRefNo} for purchase ${p.referenceNo || p.id}`,
            date: date || new Date(),
          },
          { transaction }
        );
      }
    }

    if (remainingPayment > 0) {
      let advRefNo = referenceNo;

      if (!advRefNo) {
        advRefNo = await generatePaymentReference(
          organizationId,
          "advance",
          transaction
        );
      }

      const lastTxForBalance = await SupplierTransaction.findOne({
        where: {
          organizationId,
          supplierId: s.id,
        },
        order: [["id", "DESC"]],
        transaction,
      });

      const prevBal = lastTxForBalance
        ? parseFloat(lastTxForBalance.balance)
        : 0;

      await SupplierTransaction.create(
        {
          organizationId,
          supplierId: s.id,
          type: "advance_payment",
          debit: 0,
          credit: remainingPayment,
          balance: prevBal - remainingPayment,
          paymentMethod: paymentMethod || "cash",
          bankId: bankId || null,
          referenceNo: advRefNo,
          note: note || `Advance payment ${advRefNo} to supplier`,
          date: date || new Date(),
        },
        { transaction }
      );

      s.advanceBalance = parseFloat(s.advanceBalance || 0) + remainingPayment;

      await s.save({ transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: {
        supplierId: s.id,
        totalPayment: paymentAmount,
        appliedToPurchases: paymentAmount - remainingPayment,
        addedToAdvance: remainingPayment,
      },
    });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    console.error("addSupplierPayment error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error: " + err.message,
    });
  }
}

module.exports = {
  getAll,
  getList,
  getById,
  create,
  update,
  remove,
  getSupplierReport,
  getSupplierLedger,
  addSupplierPayment,
};