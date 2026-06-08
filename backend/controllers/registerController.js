const { CashRegister, CashRegisterTransaction, Sale, SaleItem, Payment, Branch } = require("../models");
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

async function calculateRegisterSummary(register, organizationId) {
  const { Sale, SaleItem, Payment, CashRegisterTransaction } = require("../models");
  
  // Calculate sales summary
  const sales = await Sale.findAll({
    where: {
      organizationId,
      branchId: register.branchId,
      createdAt: { 
        [Op.gte]: register.openedAt,
        ...(register.closedAt ? { [Op.lte]: register.closedAt } : {})
      },
    },
    include: [
      { model: Payment, as: "Payments" },
      { model: SaleItem, as: "SaleItems" },
    ],
  });

  // Payment breakdown by method
  const paymentBreakdown = {};
  let grossSales = 0;
  let totalCollected = 0;

  sales.forEach((sale) => {
    grossSales += parseFloat(sale.total) || 0;
    if (sale.Payments) {
      sale.Payments.forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        const method = payment.paymentMethod || "other";
        totalCollected += amount;
        if (!paymentBreakdown[method]) {
          paymentBreakdown[method] = { sell: 0, dueCollected: 0 };
        }
        paymentBreakdown[method].sell += amount;
      });
    }
  });

  // Convenience aliases
  const cashSales = paymentBreakdown["cash"]?.sell || 0;
  const cardSales = paymentBreakdown["card"]?.sell || 0;
  let otherSales = 0;
  Object.entries(paymentBreakdown).forEach(([m, v]) => {
    if (m !== "cash" && m !== "card") otherSales += v.sell;
  });

  // Refunds from SaleReturns in this register session
  let { SaleReturn } = require("../models");
  const returns = await SaleReturn.findAll({
    where: {
      organizationId,
      branchId: register.branchId,
      createdAt: { 
        [Op.gte]: register.openedAt,
        ...(register.closedAt ? { [Op.lte]: register.closedAt } : {})
      },
    },
  });
  const totalRefunds = returns.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const netSales = grossSales - totalRefunds;

  // Cash drawer
  let cashIn = 0;
  let cashOut = 0;
  if (register.Transactions) {
    register.Transactions.forEach((tx) => {
      if (tx.type === "cash_in") cashIn += parseFloat(tx.amount);
      if (tx.type === "cash_out") cashOut += parseFloat(tx.amount);
    });
  }

  const expectedBalance =
    parseFloat(register.openingBalance) + cashSales + cashIn - cashOut;

  // Outstanding = gross sales - total collected payments
  const pendingFromCustomers = grossSales - totalCollected;

  // Aggregate items sold during this register session
  const itemMap = {};
  sales.forEach((sale) => {
    (sale.SaleItems || []).forEach((item) => {
      const key = item.itemName || `Item #${item.itemId}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          itemName: key,
          itemType: item.itemType,
          quantity: 0,
          total: 0,
        };
      }
      itemMap[key].quantity += parseFloat(item.quantity) || 0;
      itemMap[key].total += (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
    });
  });
  const itemsSold = Object.values(itemMap).sort((a, b) => b.total - a.total);

  return {
    ...register.toJSON(),
    summary: {
      cashSales,
      cardSales,
      otherSales,
      cashIn,
      cashOut,
      expectedBalance,
      grossSales,
      totalRefunds,
      netSales,
      totalSales: totalCollected,
      totalCollected,
      pendingFromCustomers,
      paymentBreakdown,
      itemsSold,
    },
  };
}

const registerController = {
  // Get current open register
  getCurrentRegister: async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const branchId = await getBranchIdFromHeader(req, organizationId);
      const userId = req.user?.id || req.staff?.id;

      let register = await CashRegister.findOne({
        where: {
          organizationId,
          branchId,
          userId,
          status: "open",
        },
        include: [
          {
            model: CashRegisterTransaction,
            as: "Transactions",
          },
        ],
      });

      if (!register) {
        return res.status(200).json({ success: true, message: "No open register found", data: null });
      }

      const data = await calculateRegisterSummary(register, organizationId);

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // Get specific register by ID
  getRegisterById: async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const { id } = req.params;

      const register = await CashRegister.findOne({
        where: { id, organizationId },
        include: [
          {
            model: CashRegisterTransaction,
            as: "Transactions",
          },
        ],
      });

      if (!register) {
        return res.status(404).json({ success: false, message: "Register not found" });
      }

      const data = await calculateRegisterSummary(register, organizationId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // Open Register
  openRegister: async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const branchId = await getBranchIdFromHeader(req, organizationId);
      const userId = req.user?.id || req.staff?.id;
      const { openingBalance, note } = req.body;

      // Check if already open
      const existing = await CashRegister.findOne({
        where: { organizationId, branchId, userId, status: "open" },
      });

      if (existing) {
        return res.status(400).json({ success: false, message: "Register is already open" });
      }

      const register = await CashRegister.create({
        organizationId,
        branchId,
        userId,
        openingBalance: openingBalance || 0,
        status: "open",
        openedAt: new Date(),
        note,
      });

      res.status(201).json({ success: true, data: register, message: "Register opened successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // Close Register
  closeRegister: async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const branchId = await getBranchIdFromHeader(req, organizationId);
      const userId = req.user?.id || req.staff?.id;
      const { closingBalance, expectedBalance, note } = req.body;

      const register = await CashRegister.findOne({
        where: { organizationId, branchId, userId, status: "open" },
      });

      if (!register) {
        return res.status(400).json({ success: false, message: "No open register found" });
      }

      register.status = "closed";
      register.closedAt = new Date();
      register.closingBalance = closingBalance;
      register.expectedBalance = expectedBalance;
      if (note) register.note = note;

      await register.save();

      res.status(200).json({ success: true, message: "Register closed successfully", data: register });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // Add transaction (Cash In / Out)
  addTransaction: async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const branchId = await getBranchIdFromHeader(req, organizationId);
      const userId = req.user?.id || req.staff?.id;
      const { type, amount, reason } = req.body;

      const register = await CashRegister.findOne({
        where: { organizationId, branchId, userId, status: "open" },
      });

      if (!register) {
        return res.status(400).json({ success: false, message: "No open register found" });
      }

      const transaction = await CashRegisterTransaction.create({
        registerId: register.id,
        type,
        amount,
        reason,
      });

      res.status(201).json({ success: true, message: "Transaction added successfully", data: transaction });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};

module.exports = registerController;
