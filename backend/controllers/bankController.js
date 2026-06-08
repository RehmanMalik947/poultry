const { Bank, Branch, BankTransaction } = require("../models");
const { Op } = require("sequelize");

/* =========================
   ORGANIZATION CONTEXT
========================= */
function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

/* =========================
   BRANCH CONTEXT (HEADER)
========================= */
async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (!raw) return null;

  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;

  const branch = await Branch.findOne({
    where: { id: branchId, organizationId },
  });

  return branch ? branch.id : null;
}

/* =========================
   GET ALL BANKS
========================= */
async function getAllBanks(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId ,status: "Active"};

    // same logic as products (branch + global fallback)
    if (branchId != null) {
      where[Op.or] = [
        { branchId },
        { branchId: null },
      ];
    }

    const banks = await Bank.findAll({
      where,
      order: [["bankName", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: banks,
    });
  } catch (err) {
    console.error("Error fetching banks:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* =========================
   GET BANK BY ID
========================= */
async function getBankById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { id } = req.params;

    const where = {
      id,
      organizationId,
    };

    if (branchId != null) {
      where[Op.or] = [
        { branchId },
        { branchId: null },
      ];
    }

    const bank = await Bank.findOne({ where });

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (err) {
    console.error("Error fetching bank:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* =========================
   CREATE BANK
========================= */
async function createBank(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const headerBranchId = await getBranchIdFromHeader(req, organizationId);

    const {
      bankName,
      accountHolder,
      accountNumber,
      accountType,
      note,
      balance,
      status,
      branchId: bodyBranchId,
    } = req.body;

    if (!bankName) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required",
      });
    }

    // priority: body > header > null
    const finalBranchId =
      bodyBranchId ? parseInt(bodyBranchId, 10) : headerBranchId;

    const bank = await Bank.create({
      organizationId,
      branchId: finalBranchId,

      bankName,
      accountHolder,
      accountNumber,
      accountType,
      note,

      balance: balance || 0,
      status: status || "Active",
    });

    return res.status(201).json({
      success: true,
      data: bank,
    });
  } catch (err) {
    console.error("Error creating bank:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* =========================
   UPDATE BANK
========================= */
async function updateBank(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { id } = req.params;

    const where = { id, organizationId };

    if (branchId != null) {
      where[Op.or] = [
        { branchId },
        { branchId: null },
      ];
    }

    const bank = await Bank.findOne({ where });

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    const body = req.body;

    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined) {
        bank[key] = body[key];
      }
    });

    await bank.save();

    return res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (err) {
    console.error("Error updating bank:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* =========================
   DELETE BANK
========================= */
async function deleteBank(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { id } = req.params;

    const where = { id, organizationId };

    if (branchId != null) {
      where[Op.or] = [
        { branchId },
        { branchId: null },
      ];
    }

    const bank = await Bank.findOne({ where });

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    await bank.destroy();

    return res.status(200).json({
      success: true,
      message: "Bank deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting bank:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* =========================
   GET BANK TRANSACTIONS (LOGS)
   ========================= */
async function getBankTransactions(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { id: bankId } = req.params;

    const where = {
      bankId,
      organizationId,
    };

    const transactions = await BankTransaction.findAll({
      where,
      order: [["transactionDate", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (err) {
    console.error("Error fetching bank transactions:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  getAllBanks,
  getBankById,
  createBank,
  updateBank,
  deleteBank,
  getBankTransactions,
};