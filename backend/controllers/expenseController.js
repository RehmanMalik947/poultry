const { Expense, ExpenseCategory, Branch, Staff, User, Bank, BankTransaction } = require("../models");
const { Op } = require("sequelize");
const { logActivity } = require("../utils/activityLogger");

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function staffToName(staff) {
  if (!staff) return null;
  const name = `${staff.firstName || ""} ${staff.lastName || ""}`.trim();
  return name || staff.email || null;
}

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) throw Object.assign(new Error("Organization context required"), { statusCode: 403 });
  return id;
}

function canEdit(req) {
  return (
    req.user ||
    (req.staff && ["Admin", "Manager"].includes(req.staff.role))
  );
}

async function getBranchId(req, organizationId) {
  const branchId = req.headers["x-branch-id"];
  if (!branchId) return null;

  const branch = await Branch.findOne({
    where: { id: Number(branchId), organizationId },
  });

  return branch ? branch.id : null;
}

// ─────────────────────────────────────────────
// Response Mapper
// ─────────────────────────────────────────────

function toJson(exp, category, createdByStaff, usedBy, createdByUser, paymentAccount) {
  return {
    id: exp.id,
    organizationId: exp.organizationId,
    branchId: exp.branchId,

    categoryId: exp.categoryId,
    categoryName: category?.name || null,

    amount: Number(exp.amount),
    date: exp.date,

    referenceNo: exp.referenceNo || null,
    expenseFor: exp.expenseFor || null,

    description: exp.description || null,

    paymentMethod: exp.paymentMethod || null,
    paymentAccount: exp.paymentAccount || null,
    paymentNote: exp.paymentNote || null,
    paidOn: exp.paidOn || null,
    createdById: exp.createdById || null,
     applicableTax: exp.applicableTax || "none",
    taxAmount: exp.taxAmount ? Number(exp.taxAmount) : 0,

    paymentAccountId: exp.paymentAccountId || null,
    paymentAccountName: paymentAccount?.name || (exp.paymentAccountId ? "Bank" : "Cash"),
    chequeNo: exp.chequeNo || null,
    externalAccountNo: exp.externalAccountNo || null,

    createdBy: createdByStaff
      ? { id: createdByStaff.id, name: staffToName(createdByStaff) }
      : createdByUser
      ? { id: createdByUser.id, name: createdByUser.name || createdByUser.username || "Admin" }
      : null,

    usedBy: usedBy
      ? { id: usedBy.id, name: staffToName(usedBy) }
      : null,

    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt,
  };
}

// ─────────────────────────────────────────────
// GET SUMMARY
// ─────────────────────────────────────────────

async function getSummary(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchId(req, organizationId);

    const where = { organizationId };
    if (branchId) where.branchId = branchId;

    const count = await Expense.count({ where });

    const total = await Expense.sum("amount", { where });

    return res.json({
      success: true,
      data: {
        expenseCount: count,
        totalAmount: Number(total || 0),
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}

// ─────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────

async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchId(req, organizationId);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const where = { organizationId };
    if (branchId) where.branchId = branchId;

    const { rows, count } = await Expense.findAndCountAll({
      where,
      include: [
        { model: ExpenseCategory, as: "ExpenseCategory" },
        { model: Staff, as: "CreatedByStaff" },
        { model: User, as: "CreatedByUser" },
        { model: Staff, as: "UsedByStaff" },
        { model: Bank, as: "PaymentAccount" },
      ],
      order: [["date", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: rows.map((e) =>
        toJson(e, e.ExpenseCategory, e.CreatedByStaff, e.UsedByStaff, e.CreatedByUser, e.PaymentAccount)
      ),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────

async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = Number(req.params.id);

    const exp = await Expense.findOne({
      where: { id, organizationId },
      include: [
        { model: ExpenseCategory, as: "ExpenseCategory" },
        { model: Staff, as: "CreatedByStaff" },
        { model: User, as: "CreatedByUser" },
        { model: Staff, as: "UsedByStaff" },
        { model: Bank, as: "PaymentAccount" },
      ],
    });

    if (!exp)
      return res.status(404).json({ success: false, message: "Not found" });

    return res.json({
      success: true,
      data: toJson(exp, exp.ExpenseCategory, exp.CreatedByStaff, exp.UsedByStaff, exp.CreatedByUser, exp.PaymentAccount),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
async function create(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed",
      });
    }

    const organizationId = getOrganizationId(req);
    const branchId = await getBranchId(req, organizationId);

    const {
      categoryId,
      subCategoryId,
      amount,
      date,
      description,
      referenceNo,
      expenseFor,
      usedById,
      paymentMethod,
      paymentAccountId,
      chequeNo,
      externalAccountNo,
      paymentNote,
      paidOn,
       applicableTax,
  taxAmount,
    } = req.body;

    // ─────────────────────────────
    // VALIDATION
    // ─────────────────────────────
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category required",
      });
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date required",
      });
    }

    // ─────────────────────────────
    // CATEGORY VALIDATION
    // ─────────────────────────────
    const category = await ExpenseCategory.findOne({
      where: {
        id: categoryId,
        organizationId,
      },
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    // ─────────────────────────────
    // SUBCATEGORY VALIDATION
    // ─────────────────────────────
    let finalSubCategoryId = null;

    if (subCategoryId && subCategoryId !== "none") {
      const subCategory = await ExpenseCategory.findOne({
        where: {
          id: subCategoryId,
          parentId: categoryId,
          organizationId,
        },
      });

      if (subCategory) {
        finalSubCategoryId = subCategory.id;
      }
    }

    // ─────────────────────────────
    // USED BY (STAFF)
    // ─────────────────────────────
    let finalUsedById = null;

    if (usedById && usedById !== "none") {
      const staff = await Staff.findOne({
        where: {
          id: usedById,
          organizationId,
        },
      });

      if (staff) {
        finalUsedById = staff.id;
      }
    }

    // ─────────────────────────────
    // CREATED BY (LOGIN USER)
    // ─────────────────────────────
    const createdById = req.staff?.id || req.user?.id || null;

    // ─────────────────────────────
    // CREATE EXPENSE
    // ─────────────────────────────
    const exp = await Expense.create({
      organizationId,
      branchId,

      categoryId,
      subCategoryId: finalSubCategoryId,

      amount: Number(amount),
      date,

      description: description || null,
      referenceNo: referenceNo || null,
      expenseFor: expenseFor || null,

      usedById: finalUsedById,
      createdById,

      paymentAccountId: paymentAccountId && paymentAccountId !== "none" ? paymentAccountId : null,
      paymentMethod: paymentMethod || null,
      paymentNote: paymentNote || null,
      paidOn: paidOn || null,
      chequeNo: chequeNo || null,
      externalAccountNo: externalAccountNo || null,
       applicableTax: applicableTax || "none",
  taxAmount: taxAmount || 0,
    });

    // ─────────────────────────────
    // BANK LOGGING
    // ─────────────────────────────
    if (paymentAccountId && paymentAccountId !== "none") {
      const bank = await Bank.findByPk(paymentAccountId);
      if (bank) {
        // Create Transaction
        await BankTransaction.create({
          organizationId,
          bankId: paymentAccountId,
          type: "debit",
          amount: Number(amount),
          transactionType: "expense",
          referenceId: exp.id,
          description: `Expense: ${expenseFor || category.name}`,
          transactionDate: paidOn || date,
        });

        // Update Balance
        bank.balance = Number(bank.balance) - Number(amount);
        await bank.save();
      }
    }

    logActivity({
      organizationId,
      branchId: branchId || null,
      userId: createdById,
      module: 'Expenses',
      action: 'Created',
      description: `Expense created for ${expenseFor || category.name} with amount ${amount}`
    });

    return res.status(201).json({
      success: true,
      data: exp,
    });

  } catch (err) {
    console.error("Create Expense Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}
// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

async function update(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false });
    }

    const organizationId = getOrganizationId(req);
    const id = Number(req.params.id);

    const oldExp = await Expense.findOne({
      where: { id, organizationId },
    });

    if (!oldExp)
      return res.status(404).json({ success: false, message: "Not found" });

    // Reverse Old Transaction if exists
    if (oldExp.paymentAccountId) {
      const oldBank = await Bank.findByPk(oldExp.paymentAccountId);
      if (oldBank) {
        oldBank.balance = Number(oldBank.balance) + Number(oldExp.amount);
        await oldBank.save();
      }
      await BankTransaction.destroy({
        where: { bankId: oldExp.paymentAccountId, transactionType: "expense", referenceId: id }
      });
    }

    const {
      categoryId,
      subCategoryId,
      amount,
      date,
      description,
      referenceNo,
      expenseFor,
      usedById,
      paymentMethod,
      paymentAccountId,
      chequeNo,
      externalAccountNo,
      paymentNote,
      paidOn,
       applicableTax,      
  taxAmount, 
    } = req.body;

    // Update data
    oldExp.categoryId = categoryId;
    oldExp.subCategoryId = subCategoryId === "none" ? null : subCategoryId;
    oldExp.amount = Number(amount);
    oldExp.date = date;
    oldExp.description = description || null;
    oldExp.referenceNo = referenceNo || null;
    oldExp.expenseFor = expenseFor || null;
    oldExp.usedById = usedById === "none" ? null : usedById;
    oldExp.paymentMethod = paymentMethod || "cash";
    oldExp.paymentAccountId = paymentAccountId === "none" ? null : paymentAccountId;
    oldExp.chequeNo = chequeNo || null;
    oldExp.externalAccountNo = externalAccountNo || null;
    oldExp.paymentNote = paymentNote || null;
    oldExp.paidOn = paidOn || null;
oldExp.applicableTax = applicableTax || "none";
oldExp.taxAmount = taxAmount || 0;
    await oldExp.save();

    // Apply New Transaction
    if (paymentAccountId && paymentAccountId !== "none") {
      const newBank = await Bank.findByPk(paymentAccountId);
      if (newBank) {
        await BankTransaction.create({
          organizationId,
          bankId: paymentAccountId,
          type: "debit",
          amount: Number(amount),
          transactionType: "expense",
          referenceId: id,
          description: `Expense (Updated): ${expenseFor || oldExp.expenseFor}`,
          transactionDate: paidOn || date,
        });
        newBank.balance = Number(newBank.balance) - Number(amount);
        await newBank.save();
      }
    }

    logActivity({
      organizationId,
      branchId: oldExp.branchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Expenses',
      action: 'Updated',
      description: `Expense ID ${oldExp.id} updated to amount ${amount}`
    });

    return res.json({
      success: true,
      data: oldExp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

async function remove(req, res) {
  try {
    if (!canEdit(req)) {
      return res.status(403).json({ success: false });
    }

    const organizationId = getOrganizationId(req);
    const id = Number(req.params.id);

    const exp = await Expense.findOne({
      where: { id, organizationId },
    });

    if (!exp) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Reverse Bank Transaction if exists
    if (exp.paymentAccountId) {
      const bank = await Bank.findByPk(exp.paymentAccountId);
      if (bank) {
        bank.balance = Number(bank.balance) + Number(exp.amount);
        await bank.save();
      }
      await BankTransaction.destroy({
        where: { bankId: exp.paymentAccountId, transactionType: "expense", referenceId: id }
      });
    }

    await exp.destroy();

    logActivity({
      organizationId,
      branchId: exp.branchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Expenses',
      action: 'Deleted',
      description: `Expense ID ${id} deleted (amount ${exp.amount})`
    });

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getSummary,
  getAll,
  getById,
  create,
  update,
  remove,
};