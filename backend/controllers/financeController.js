const { Sale, SaleItem, Expense, ExpenseCategory, Branch, Product, Payment, Customer, Purchase, Supplier, SaleReturn, SaleReturnPayment, PurchaseReturn } = require("../models");
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

/** Parse query into period start/end. Supports fromDate&toDate (YYYY-MM-DD) or month&year (single month). */
function getPeriodFromRequest(req) {
  const fromDate = req.query.fromDate != null ? String(req.query.fromDate).trim() : null;
  const toDate = req.query.toDate != null ? String(req.query.toDate).trim() : null;
  const now = new Date();

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      return { periodStart: start, periodEnd: end, periodStartStr: startStr, periodEndStr: endStr, isRange: true };
    }
  }

  const month = req.query.month != null ? parseInt(req.query.month, 10) : null;
  const year = req.query.year != null ? parseInt(req.query.year, 10) : null;
  const y = year != null && !Number.isNaN(year) ? year : now.getFullYear();
  const m = month != null && !Number.isNaN(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const periodStart = new Date(y, m - 1, 1);
  const periodEnd = new Date(y, m, 0, 23, 59, 59, 999);
  const periodStartStr = `${y}-${String(m).padStart(2, "0")}-01`;
  const periodEndStr = `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  return { periodStart, periodEnd, periodStartStr, periodEndStr, isRange: false, month: m, year: y };
}

/**
 * Helper: Calculate COGS for a set of sale IDs.
 * Finds all SaleItems with itemType='product', looks up purchasePriceExc, sums qty * cost.
 */
async function calculateCogs(saleIds) {
  if (!saleIds || saleIds.length === 0) return 0;

  const productItems = await SaleItem.findAll({
    where: { saleId: { [Op.in]: saleIds }, itemType: "product" },
    attributes: ["itemId", "quantity"],
  });

  if (productItems.length === 0) return 0;

  const uniqueProductIds = [...new Set(productItems.map((i) => i.itemId))];
  const products = await Product.findAll({
    where: { id: { [Op.in]: uniqueProductIds } },
    attributes: ["id", "purchasePriceExc"],
  });

  const priceMap = {};
  products.forEach((p) => { priceMap[p.id] = parseFloat(p.purchasePriceExc) || 0; });

  let cogs = 0;
  for (const item of productItems) {
    const qty = parseInt(item.quantity, 10) || 0;
    const cost = priceMap[item.itemId] || 0;
    cogs += qty * cost;
  }
  return cogs;
}

/**
 * GET /api/finance/profit-loss?fromDate=2026-03-01&toDate=2026-06-30
 * Returns P&L for the period: revenue, COGS, expenses by category, gross profit, net profit.
 */
async function getProfitLoss(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { periodStart, periodEnd, periodStartStr, periodEndStr, isRange, month: m, year: y } = getPeriodFromRequest(req);

    const saleWhere = { organizationId, status: "paid", createdAt: { [Op.gte]: periodStart, [Op.lte]: periodEnd } };
    if (branchId != null) saleWhere.branchId = branchId;

    const revenueResult = await Sale.sum("total", { where: saleWhere });
    const revenue = revenueResult != null ? Number(revenueResult) : 0;

    const saleIds = (await Sale.findAll({ where: saleWhere, attributes: ["id"] })).map((s) => s.id);
    const cogs = await calculateCogs(saleIds);

    const expWhere = { organizationId, date: { [Op.gte]: periodStartStr, [Op.lte]: periodEndStr } };
    if (branchId != null) expWhere.branchId = branchId;

    const expenses = await Expense.findAll({
      where: expWhere,
      include: [{ model: ExpenseCategory, as: "ExpenseCategory", attributes: ["id", "name"] }],
      attributes: ["id", "categoryId", "amount", "date"],
    });

    let totalExpenses = 0;
    const byCategory = {};
    for (const exp of expenses) {
      const amount = parseFloat(exp.amount) || 0;
      totalExpenses += amount;
      const catName = exp.ExpenseCategory ? (exp.ExpenseCategory.name || "Other") : "Other";
      if (!byCategory[catName]) byCategory[catName] = 0;
      byCategory[catName] += amount;
    }

    const grossProfit = revenue - cogs;
    const netProfit = revenue - totalExpenses;
    const expensesByCategory = Object.entries(byCategory)
      .map(([name, amount]) => ({ categoryName: name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const period = isRange ? { fromDate: periodStartStr, toDate: periodEndStr } : { month: m, year: y };
    return res.status(200).json({
      success: true,
      data: {
        period,
        revenue: Math.round(revenue * 100) / 100,
        cogs: Math.round(cogs * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        expensesByCategory,
        netProfit: Math.round(netProfit * 100) / 100,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getProfitLoss error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/finance/cash-flow?fromDate=2026-03-01&toDate=2026-06-30
 * Returns cash flow: inflows (Sales), outflows (COGS + Expenses), net cash flow.
 */
async function getCashFlow(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { periodStart, periodEnd, periodStartStr, periodEndStr, isRange, month: m, year: y } = getPeriodFromRequest(req);

    const saleWhere = { organizationId, status: "paid", createdAt: { [Op.gte]: periodStart, [Op.lte]: periodEnd } };
    if (branchId != null) saleWhere.branchId = branchId;

    const revenueResult = await Sale.sum("total", { where: saleWhere });
    const salesInflow = revenueResult != null ? Number(revenueResult) : 0;

    const saleIds = (await Sale.findAll({ where: saleWhere, attributes: ["id"] })).map((s) => s.id);
    const stockCost = await calculateCogs(saleIds);

    const expWhere = { organizationId, date: { [Op.gte]: periodStartStr, [Op.lte]: periodEndStr } };
    if (branchId != null) expWhere.branchId = branchId;

    const expenses = await Expense.findAll({
      where: expWhere,
      include: [{ model: ExpenseCategory, as: "ExpenseCategory", attributes: ["id", "name"] }],
      attributes: ["id", "categoryId", "amount", "date"],
    });

    const outflows = [];
    outflows.push({ label: "Cost of Goods Sold (COGS)", amount: Math.round(stockCost * 100) / 100 });

    const byCategory = {};
    for (const exp of expenses) {
      const amount = parseFloat(exp.amount) || 0;
      const catName = exp.ExpenseCategory ? (exp.ExpenseCategory.name || "Other") : "Other";
      if (!byCategory[catName]) byCategory[catName] = 0;
      byCategory[catName] += amount;
    }
    const expensesByCategory = Object.entries(byCategory)
      .map(([name, amount]) => ({ label: name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);
    outflows.push(...expensesByCategory);

    const totalInflow = Math.round(salesInflow * 100) / 100;
    const totalOutflow = outflows.reduce((sum, o) => sum + o.amount, 0);
    const netCashFlow = Math.round((totalInflow - totalOutflow) * 100) / 100;

    const period = isRange ? { fromDate: periodStartStr, toDate: periodEndStr } : { month: m, year: y };
    return res.status(200).json({
      success: true,
      data: {
        period,
        inflows: [{ label: "Sales", amount: totalInflow }],
        outflows,
        totalInflow,
        totalOutflow: Math.round(totalOutflow * 100) / 100,
        netCashFlow,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getCashFlow error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/finance/receivables
 * Returns receivables: Unpaid Sales, Pending (partial), Total Receivables, and list of items.
 */
async function getReceivables(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId, status: { [Op.in]: ["unpaid", "partial"] } };
    if (branchId != null) where.branchId = branchId;

    const sales = await Sale.findAll({
      where,
      include: [
        { model: Payment, as: "Payments", attributes: ["id", "amount", "paymentMethod", "createdAt"] },
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile"], required: false },
      ],
      order: [["createdAt", "DESC"]],
    });

    let unpaidSalesTotal = 0;
    let pendingFromPartialTotal = 0;
    const items = [];

    for (const sale of sales) {
      const total = parseFloat(sale.total) || 0;
      const totalPaid = (sale.Payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const remainingBalance = Math.round((total - totalPaid) * 100) / 100;
      const customer = sale.Customer;

      if (sale.status === "unpaid") {
        unpaidSalesTotal += total;
      } else {
        pendingFromPartialTotal += remainingBalance;
      }

      items.push({
        id: sale.id,
        clientName: customer ? customer.name : null,
        clientPhone: customer ? customer.mobile : null,
        createdAt: sale.createdAt,
        total: Math.round(total * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remainingBalance,
        status: sale.status,
      });
    }

    unpaidSalesTotal = Math.round(unpaidSalesTotal * 100) / 100;
    pendingFromPartialTotal = Math.round(pendingFromPartialTotal * 100) / 100;
    const totalReceivables = Math.round((unpaidSalesTotal + pendingFromPartialTotal) * 100) / 100;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          unpaidSalesTotal,
          pendingFromPartialTotal,
          totalReceivables,
          unpaidCount: sales.filter((s) => s.status === "unpaid").length,
          partialCount: sales.filter((s) => s.status === "partial").length,
        },
        items,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getReceivables error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/finance/payables
 * Returns payables: Unpaid/Partial Purchases (owing suppliers) + Unpaid/Partial Sale Returns (owing customers).
 */
async function getPayables(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const purchaseWhere = { organizationId, paymentStatus: { [Op.in]: ["due", "partial"] } };
    if (branchId != null) purchaseWhere.branchId = branchId;

    const purchases = await Purchase.findAll({
      where: purchaseWhere,
      include: [
        { model: Supplier, as: "Supplier", attributes: ["id", "name", "phone"], required: false },
      ],
      order: [["purchaseDate", "DESC"]],
    });

    const saleReturnWhere = { organizationId, status: { [Op.in]: ["due", "partial"] } };
    if (branchId != null) saleReturnWhere.branchId = branchId;

    const saleReturns = await SaleReturn.findAll({
      where: saleReturnWhere,
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile"], required: false },
      ],
      order: [["returnDate", "DESC"]],
    });

    let totalPurchaseDues = 0;
    let totalSaleReturnDues = 0;
    const items = [];

    // Process Purchases (Suppliers)
    for (const p of purchases) {
      const total = parseFloat(p.totalAmount) || 0;
      const totalPaid = parseFloat(p.paidAmount) || 0;
      const remainingBalance = Math.round((total - totalPaid) * 100) / 100;
      const supplier = p.Supplier;

      totalPurchaseDues += remainingBalance;

      items.push({
        id: `PUR-${p.id}`,
        type: "Purchase",
        referenceNo: p.referenceNo || `PO-${p.id}`,
        partyName: supplier ? supplier.name : null,
        partyPhone: supplier ? supplier.phone : null,
        date: p.purchaseDate,
        total: Math.round(total * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remainingBalance,
        status: p.paymentStatus,
      });
    }

    // Process Sale Returns (Customers)
    for (const sr of saleReturns) {
      const total = parseFloat(sr.total) || 0;
      const totalPaid = parseFloat(sr.amountReturned) || 0;
      const remainingBalance = Math.round((total - totalPaid) * 100) / 100;
      const customer = sr.Customer;

      totalSaleReturnDues += remainingBalance;

      items.push({
        id: `SR-${sr.id}`,
        type: "Sale Return",
        referenceNo: sr.invoiceNumber || `SR-${sr.id}`,
        partyName: customer ? customer.name : null,
        partyPhone: customer ? customer.mobile : null,
        date: sr.returnDate,
        total: Math.round(total * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remainingBalance,
        status: sr.status,
      });
    }

    // Sort combined items by date descending
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    totalPurchaseDues = Math.round(totalPurchaseDues * 100) / 100;
    totalSaleReturnDues = Math.round(totalSaleReturnDues * 100) / 100;
    const totalPayables = Math.round((totalPurchaseDues + totalSaleReturnDues) * 100) / 100;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPurchaseDues,
          totalSaleReturnDues,
          totalPayables,
          purchaseCount: purchases.length,
          saleReturnCount: saleReturns.length,
        },
        items,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getPayables error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/finance/revenue-breakdown?fromDate=...&toDate=...
 * Returns paid sales with line items for the amount-detail dialog.
 */
async function getRevenueBreakdown(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { periodStart, periodEnd, periodStartStr, periodEndStr } = getPeriodFromRequest(req);

    const saleWhere = { organizationId, status: "paid", createdAt: { [Op.gte]: periodStart, [Op.lte]: periodEnd } };
    if (branchId != null) saleWhere.branchId = branchId;

    const sales = await Sale.findAll({
      where: saleWhere,
      include: [{ model: SaleItem, as: "SaleItems", attributes: ["itemName", "price", "quantity", "itemType"] }],
      order: [["createdAt", "ASC"]],
    });

    const salesData = [];
    let totalRevenue = 0;
    for (const sale of sales) {
      const total = parseFloat(sale.total) || 0;
      totalRevenue += total;
      const items = (sale.SaleItems || []).map((it) => {
        const price = parseFloat(it.price) || 0;
        const qty = parseInt(it.quantity, 10) || 1;
        return {
          serviceName: it.itemName || "—",
          price: Math.round(price * 100) / 100,
          quantity: qty,
          lineTotal: Math.round(price * qty * 100) / 100,
        };
      });
      salesData.push({ saleId: sale.id, createdAt: sale.createdAt, total: Math.round(total * 100) / 100, items });
    }

    return res.status(200).json({
      success: true,
      data: { period: { fromDate: periodStartStr, toDate: periodEndStr }, sales: salesData, totalRevenue: Math.round(totalRevenue * 100) / 100 },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getRevenueBreakdown error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/finance/cogs-breakdown?fromDate=...&toDate=...
 * Returns COGS line items (product cost per sale item) for the amount-detail dialog.
 */
async function getCogsBreakdown(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { periodStart, periodEnd, periodStartStr, periodEndStr } = getPeriodFromRequest(req);

    const saleWhere = { organizationId, status: "paid", createdAt: { [Op.gte]: periodStart, [Op.lte]: periodEnd } };
    if (branchId != null) saleWhere.branchId = branchId;

    const saleIds = (await Sale.findAll({ where: saleWhere, attributes: ["id"] })).map((s) => s.id);

    if (saleIds.length === 0) {
      return res.status(200).json({ success: true, data: { period: { fromDate: periodStartStr, toDate: periodEndStr }, lines: [], totalCogs: 0 } });
    }

    const productItems = await SaleItem.findAll({
      where: { saleId: { [Op.in]: saleIds }, itemType: "product" },
      attributes: ["saleId", "itemId", "itemName", "quantity"],
    });

    const uniqueProductIds = [...new Set(productItems.map((i) => i.itemId))];
    const priceMap = {};
    const nameMap = {};

    if (uniqueProductIds.length > 0) {
      const products = await Product.findAll({
        where: { id: { [Op.in]: uniqueProductIds } },
        attributes: ["id", "name", "purchasePriceExc"],
      });
      products.forEach((p) => {
        priceMap[p.id] = parseFloat(p.purchasePriceExc) || 0;
        nameMap[p.id] = p.name || "—";
      });
    }

    const lines = [];
    let totalCogs = 0;
    for (const item of productItems) {
      const qty = parseInt(item.quantity, 10) || 0;
      const costPrice = priceMap[item.itemId] || 0;
      const lineCost = qty * costPrice;
      totalCogs += lineCost;
      lines.push({
        saleId: item.saleId,
        productName: nameMap[item.itemId] || item.itemName || "—",
        quantity: qty,
        costPrice: Math.round(costPrice * 100) / 100,
        lineCost: Math.round(lineCost * 100) / 100,
      });
    }

    return res.status(200).json({
      success: true,
      data: { period: { fromDate: periodStartStr, toDate: periodEndStr }, lines, totalCogs: Math.round(totalCogs * 100) / 100 },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getCogsBreakdown error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/finance/expense-category-breakdown?fromDate=...&toDate=...&categoryName=Salaries
 */
async function getExpenseCategoryBreakdown(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { periodStartStr, periodEndStr } = getPeriodFromRequest(req);
    const categoryName = req.query.categoryName != null ? String(req.query.categoryName).trim() : null;
    if (!categoryName) return res.status(400).json({ success: false, message: "categoryName is required" });

    const category = await ExpenseCategory.findOne({ where: { organizationId, name: categoryName }, attributes: ["id", "name"] });
    if (!category) {
      return res.status(200).json({ success: true, data: { categoryName, period: { fromDate: periodStartStr, toDate: periodEndStr }, expenses: [], totalAmount: 0 } });
    }

    const expWhere = { organizationId, categoryId: category.id, date: { [Op.gte]: periodStartStr, [Op.lte]: periodEndStr } };
    if (branchId != null) expWhere.branchId = branchId;

    const expenses = await Expense.findAll({ where: expWhere, attributes: ["id", "date", "description", "amount"], order: [["date", "ASC"], ["id", "ASC"]] });
    const items = expenses.map((exp) => ({ id: exp.id, date: exp.date, description: exp.description || null, amount: Math.round((parseFloat(exp.amount) || 0) * 100) / 100 }));
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    return res.status(200).json({
      success: true,
      data: { categoryName: category.name, period: { fromDate: periodStartStr, toDate: periodEndStr }, expenses: items, totalAmount: Math.round(totalAmount * 100) / 100 },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("finance getExpenseCategoryBreakdown error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getProfitLoss, getCashFlow, getReceivables, getPayables, getRevenueBreakdown, getCogsBreakdown, getExpenseCategoryBreakdown };
