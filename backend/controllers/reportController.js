const { Sale, SaleReturn, Purchase, PurchaseReturn, Branch, Customer, Supplier, ProductVariation, Product, Category, SaleItem, Brand, Stock, SupplierTransaction, Expense } = require("../models");
const { Op, Sequelize } = require("sequelize");

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

async function getPurchaseSaleReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const fromStr = req.query.from;
    const toStr = req.query.to;

    // Set default start/end dates
    let startDate = new Date();
    startDate.setDate(1); // First day of this month
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (fromStr) {
      const parsedFrom = new Date(fromStr);
      if (!Number.isNaN(parsedFrom.getTime())) {
        startDate = parsedFrom;
        startDate.setHours(0, 0, 0, 0);
      }
    }
    if (toStr) {
      const parsedTo = new Date(toStr);
      if (!Number.isNaN(parsedTo.getTime())) {
        endDate = parsedTo;
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // 1. Sales query
    const saleWhere = {
      organizationId,
      createdAt: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
    if (branchId != null) saleWhere.branchId = branchId;

    const sales = await Sale.findAll({ where: saleWhere });

    let totalSale = 0;
    let saleIncludingTax = 0;
    let saleDue = 0;

    for (const sale of sales) {
      const subtotal = parseFloat(sale.subtotal) || 0;
      const total = parseFloat(sale.total) || 0;
      const paid = parseFloat(sale.amountPaid) || 0;

      totalSale += subtotal;
      saleIncludingTax += total;
      saleDue += Math.max(0, total - paid);
    }

    // 2. Sale Returns query
    const saleReturnWhere = {
      organizationId,
      createdAt: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
    if (branchId != null) saleReturnWhere.branchId = branchId;

    const saleReturns = await SaleReturn.findAll({ where: saleReturnWhere });
    let totalSaleReturn = 0;
    for (const ret of saleReturns) {
      totalSaleReturn += parseFloat(ret.total) || 0;
    }

    // 3. Purchases query
    const purchaseWhere = {
      organizationId,
      createdAt: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
    if (branchId != null) purchaseWhere.branchId = branchId;

    const purchases = await Purchase.findAll({ where: purchaseWhere });

    let totalPurchase = 0;
    let purchaseIncludingTax = 0;
    let purchaseDue = 0;

    for (const purchase of purchases) {
      const totalAmt = parseFloat(purchase.totalAmount) || 0;
      const taxAmt = parseFloat(purchase.taxAmount) || 0;
      const shippingAmt = parseFloat(purchase.shippingCharges) || 0;
      const paidAmt = parseFloat(purchase.paidAmount) || 0;

      // Calculate totalPurchase before tax and shipping charges
      totalPurchase += Math.max(0, totalAmt - taxAmt);
      purchaseIncludingTax += totalAmt;
      purchaseDue += Math.max(0, totalAmt - paidAmt);
    }

    // 4. Purchase Returns query
    const purchaseReturnWhere = {
      organizationId,
      createdAt: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
    if (branchId != null) purchaseReturnWhere.branchId = branchId;

    const purchaseReturns = await PurchaseReturn.findAll({ where: purchaseReturnWhere });
    let totalPurchaseReturn = 0;
    for (const ret of purchaseReturns) {
      totalPurchaseReturn += parseFloat(ret.total) || 0;
    }

    // Math.round to 2 decimal places
    const round2 = (num) => Math.round(num * 100) / 100;

    return res.status(200).json({
      success: true,
      data: {
        purchases: {
          totalPurchase: round2(totalPurchase),
          purchaseIncludingTax: round2(purchaseIncludingTax),
          totalPurchaseReturn: round2(totalPurchaseReturn),
          purchaseDue: round2(purchaseDue),
        },
        sales: {
          totalSale: round2(totalSale),
          saleIncludingTax: round2(saleIncludingTax),
          totalSellReturn: round2(totalSaleReturn), // named totalSellReturn to match standard naming
          saleDue: round2(saleDue),
        },
        overall: {
          saleMinusPurchase: round2((saleIncludingTax - totalSaleReturn) - (purchaseIncludingTax - totalPurchaseReturn)),
          overallDue: round2(saleDue - purchaseDue),
        },
      },
    });
  } catch (err) {
    console.error("getPurchaseSaleReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// 1. Add these models to your destructured require at the top of reportController.js
// const { Sale, SaleReturn, Purchase, PurchaseReturn, Branch, Customer, Supplier } = require("../models");

async function getSupplierCustomerReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const fromStr = req.query.from;
    const toStr = req.query.to;
    const type = req.query.type || "all"; // 'all', 'customer', 'supplier'
    
    // ✅ Add pagination params (matching products controller pattern)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    // Set default start/end dates
    let startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (fromStr) {
      const parsedFrom = new Date(fromStr);
      if (!Number.isNaN(parsedFrom.getTime())) {
        startDate = parsedFrom;
        startDate.setHours(0, 0, 0, 0);
      }
    }
    if (toStr) {
      const parsedTo = new Date(toStr);
      if (!Number.isNaN(parsedTo.getTime())) {
        endDate = parsedTo;
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const reportItems = [];

    // 1. Fetch Customers if type is 'all' or 'customer'
    if (type === "all" || type === "customer") {
      const customerWhere = { organizationId };
      if (branchId != null) customerWhere.branchId = branchId;

      const customers = await Customer.findAll({ where: customerWhere });

      for (const cust of customers) {
        // Query sales in date range
        const saleWhere = {
          organizationId,
          customerId: cust.id,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
        if (branchId != null) saleWhere.branchId = branchId;

        const sales = await Sale.findAll({ where: saleWhere });
        let totalSale = 0;
        let totalSalePaid = 0;
        for (const s of sales) {
          totalSale += parseFloat(s.total) || 0;
          totalSalePaid += parseFloat(s.amountPaid) || 0;
        }

        // Query sale returns in date range
        const returnWhere = {
          organizationId,
          customerId: cust.id,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
        if (branchId != null) returnWhere.branchId = branchId;

        const returns = await SaleReturn.findAll({ where: returnWhere });
        let totalSellReturn = 0;
        for (const r of returns) {
          totalSellReturn += parseFloat(r.total) || 0;
        }

        const openingBalance = parseFloat(cust.openingBalance) || 0;
        const due = openingBalance + (totalSale - totalSellReturn - totalSalePaid);

        reportItems.push({
          contactId: cust.id,
          contactName: cust.name + (cust.businessName ? ` (${cust.businessName})` : ""),
          contactType: "Customer",
          totalPurchase: 0,
          totalPurchaseReturn: 0,
          totalSale: totalSale,
          totalSellReturn: totalSellReturn,
          openingBalanceDue: openingBalance,
          due: due,
        });
      }
    }

    // 2. Fetch Suppliers if type is 'all' or 'supplier'
    if (type === "all" || type === "supplier") {
      const supplierWhere = { organizationId };
      if (branchId != null) supplierWhere.branchId = branchId;

      const suppliers = await Supplier.findAll({ where: supplierWhere });

      for (const supp of suppliers) {
        // Query purchases in date range
        const purchaseWhere = {
          organizationId,
          supplierId: supp.id,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
        if (branchId != null) purchaseWhere.branchId = branchId;

        const purchases = await Purchase.findAll({ where: purchaseWhere });
        let totalPurchase = 0;
        let totalPurchasePaid = 0;
        for (const p of purchases) {
          totalPurchase += parseFloat(p.totalAmount) || 0;
          totalPurchasePaid += parseFloat(p.paidAmount) || 0;
        }

        // Query purchase returns in date range
        const prWhere = {
          organizationId,
          supplierId: supp.id,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
        if (branchId != null) prWhere.branchId = branchId;

        const pReturns = await PurchaseReturn.findAll({ where: prWhere });
        let totalPurchaseReturn = 0;
        for (const r of pReturns) {
          totalPurchaseReturn += parseFloat(r.total) || 0;
        }

        const openingBalance = parseFloat(supp.openingBalance) || 0;
        // Due = opening balance + (total paid - total purchase)
        const due = openingBalance + (totalPurchasePaid - totalPurchase);

        reportItems.push({
          contactId: supp.id,
          contactName: supp.name + (supp.businessName ? ` (${supp.businessName})` : ""),
          contactType: "Supplier",
          totalPurchase: totalPurchase,
          totalPurchaseReturn: totalPurchaseReturn,
          totalSale: 0,
          totalSellReturn: 0,
          openingBalanceDue: openingBalance,
          due: due,
        });
      }
    }

    const round2 = (num) => Math.round(num * 100) / 100;

    // ✅ Calculate totals for ALL records (before pagination)
    const totals = {
      totalPurchase: round2(reportItems.reduce((sum, item) => sum + item.totalPurchase, 0)),
      totalPurchaseReturn: round2(reportItems.reduce((sum, item) => sum + item.totalPurchaseReturn, 0)),
      totalSale: round2(reportItems.reduce((sum, item) => sum + item.totalSale, 0)),
      totalSellReturn: round2(reportItems.reduce((sum, item) => sum + item.totalSellReturn, 0)),
      totalOpeningBalance: round2(reportItems.reduce((sum, item) => sum + item.openingBalanceDue, 0)),
      totalDue: round2(reportItems.reduce((sum, item) => sum + item.due, 0)),
    };

    // ✅ Apply pagination (matching products controller pattern)
    const total = reportItems.length;
    const offset = (page - 1) * limit;
    const paginatedItems = reportItems.slice(offset, offset + limit);

    const formattedItems = paginatedItems.map((item) => ({
      ...item,
      totalPurchase: round2(item.totalPurchase),
      totalPurchaseReturn: round2(item.totalPurchaseReturn),
      totalSale: round2(item.totalSale),
      totalSellReturn: round2(item.totalSellReturn),
      openingBalanceDue: round2(item.openingBalanceDue),
      due: round2(item.due),
    }));

    // ✅ Response matching products controller structure
    return res.status(200).json({
      success: true,
      data: formattedItems,
      total: total,           // ← Added for pagination
      totals: totals,         // ← Added aggregated totals
      page: page,             // ← Added for consistency
      limit: limit,           // ← Added for consistency
      totalPages: Math.ceil(total / limit), // ← Added for consistency
    });
  } catch (err) {
    console.error("getSupplierCustomerReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getStockReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    
    // We will query ProductVariation
    const productWhere = { organizationId };
    if (branchId != null) productWhere.branchId = branchId;

    const variations = await ProductVariation.findAll({
      include: [
        {
          model: Product,
          where: productWhere,
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name'] }
          ],
          attributes: ['id', 'name', 'productType', 'categoryId', 'branchId']
        }
      ],
      order: [['id', 'DESC']]
    });

    let totalClosingStockPurchase = 0;
    let totalClosingStockSale = 0;
    let totalPotentialProfit = 0;

    const reportItems = variations.map((variation) => {
      const currentStock = parseFloat(variation.currentStock) || 0;
      const purchasePriceInc = parseFloat(variation.purchasePriceInc) || 0;
      const sellingPriceInc = parseFloat(variation.sellingPriceInc) || 0;

      const currentStockValuePurchase = currentStock * purchasePriceInc;
      const currentStockValueSale = currentStock * sellingPriceInc;
      const potentialProfit = (sellingPriceInc - purchasePriceInc) * currentStock;

      totalClosingStockPurchase += currentStockValuePurchase;
      totalClosingStockSale += currentStockValueSale;
      totalPotentialProfit += potentialProfit;

      return {
        id: variation.id,
        productId: variation.productId,
        sku: variation.sku || "-",
        productName: variation.Product?.name || "-",
        variationName: variation.name || "-",
        category: variation.Product?.category?.name || "-",
        location: variation.Product?.branch?.name || "-",
        unitSellingPrice: sellingPriceInc,
        currentStock: currentStock,
        currentStockValuePurchase: currentStockValuePurchase,
        currentStockValueSale: currentStockValueSale,
        potentialProfit: potentialProfit,
        totalUnitSold: 0, // Placeholder for now
        totalUnitTransfered: 0, // Placeholder
        totalUnitAdjusted: 0 // Placeholder
      };
    });

    const round2 = (num) => Math.round(num * 100) / 100;

    const totals = {
      closingStockPurchasePrice: round2(totalClosingStockPurchase),
      closingStockSalePrice: round2(totalClosingStockSale),
      potentialProfit: round2(totalPotentialProfit),
      profitMarginPercent: totalClosingStockPurchase > 0 
        ? round2((totalPotentialProfit / totalClosingStockPurchase) * 100) 
        : 0
    };

    const total = reportItems.length;
    const offset = (page - 1) * limit;
    const paginatedItems = reportItems.slice(offset, offset + limit);

    const formattedItems = paginatedItems.map(item => ({
      ...item,
      unitSellingPrice: round2(item.unitSellingPrice),
      currentStock: round2(item.currentStock),
      currentStockValuePurchase: round2(item.currentStockValuePurchase),
      currentStockValueSale: round2(item.currentStockValueSale),
      potentialProfit: round2(item.potentialProfit)
    }));

    return res.status(200).json({
      success: true,
      data: formattedItems,
      total: total,
      totals: totals,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error("getStockReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getStockAdjustmentReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { from: fromStr, to: toStr, page: pageParam, limit: limitParam } = req.query;

    const page  = Math.max(1, parseInt(pageParam,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    // Build date range where clause
    const dateWhere = {};
    if (fromStr) {
      const from = new Date(fromStr);
      from.setHours(0, 0, 0, 0);
      dateWhere[Op.gte] = from;
    }
    if (toStr) {
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);
      if (dateWhere[Op.gte]) {
        dateWhere[Op.lte] = to;
      } else {
        dateWhere[Op.lte] = to;
      }
    }

    const where = { organizationId };
    if (branchId) where.branchId = branchId;
    if (fromStr || toStr) where.createdAt = dateWhere;

    // Fetch all for totals, then paginated for list
    const { StockAdjustment, User } = require("../models");

    const allAdjustments = await StockAdjustment.findAll({ where, attributes: ["adjustmentType", "totalAmount"] });

    let totalNormal   = 0;
    let totalAbnormal = 0;
    allAdjustments.forEach((a) => {
      const amt = parseFloat(a.totalAmount) || 0;
      if (a.adjustmentType === "Normal")   totalNormal   += amt;
      else                                  totalAbnormal += amt;
    });
    const totalStockAdjustment = totalNormal + totalAbnormal;
    // "Amount Recovered" = value of Normal adjustments (positive recoveries)
    const totalAmountRecovered = totalNormal;

    // Paginated list
    const { count, rows } = await StockAdjustment.findAndCountAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["id", "name"] },
        { model: Branch, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      totals: {
        totalNormal,
        totalAbnormal,
        totalStockAdjustment,
        totalAmountRecovered,
      },
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error("getStockAdjustmentReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
/**
 * GET /api/reports/product-sell
 * Query params: from, to, page, limit, view, categoryId, brandId, search
 */
/**
 * GET /api/reports/product-sell
 * Query params: from, to, page, limit, view, categoryId, brandId, search
 */
async function getProductSellReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { 
      from: fromStr, 
      to: toStr, 
      page: pageParam, 
      limit: limitParam,
      view = 'detailed',
      categoryId,
      brandId,
      search 
    } = req.query;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    // Set date range
    let startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (fromStr) {
      const parsedFrom = new Date(fromStr);
      if (!Number.isNaN(parsedFrom.getTime())) {
        startDate = parsedFrom;
        startDate.setHours(0, 0, 0, 0);
      }
    }
    if (toStr) {
      const parsedTo = new Date(toStr);
      if (!Number.isNaN(parsedTo.getTime())) {
        endDate = parsedTo;
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // Base where clause for sales
    const saleWhere = {
      organizationId,
      createdAt: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };
    if (branchId != null) saleWhere.branchId = branchId;

    // Get all sales with their items
    const sales = await Sale.findAll({
      where: saleWhere,
      include: [
        {
          model: SaleItem,
          as: 'SaleItems',
          where: {
            [Op.or]: [
              { itemType: 'product' },
              { itemType: 'Product' },
              { itemType: null },
              { itemType: '' },
            ],
          },
          required: true,
          include: [
            {
              model: ProductVariation,
              as: 'ProductVariation',
              include: [
                {
                  model: Product,
                  include: [
                    { model: Category, as: 'category', attributes: ['id', 'name'] },
                    { model: Brand, as: 'brand', attributes: ['id', 'name'] }
                  ]
                }
              ]
            }
          ]
        },
        { model: Customer, as: 'Customer', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: Branch, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Preload simple (non-variation) products referenced by SaleItems.itemId
    const simpleProductIds = new Set();
    for (const sale of sales) {
      for (const item of sale.SaleItems || []) {
        if (!item.variationId && item.itemId) {
          simpleProductIds.add(item.itemId);
        }
      }
    }

    const simpleProducts = simpleProductIds.size
      ? await Product.findAll({
          where: {
            organizationId,
            id: { [Op.in]: Array.from(simpleProductIds) },
          },
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Brand, as: 'brand', attributes: ['id', 'name'] },
          ],
        })
      : [];
    const simpleProductMap = new Map(simpleProducts.map((p) => [p.id, p]));

    // Build report items
    const reportItems = [];
    const categoryMap = new Map();
    const brandMap = new Map();

    // Calculate TOTAL true stock for ALL products bound to each category and brand
    const allProductsForStock = await Product.findAll({
      where: {
        organizationId,
        ...(branchId != null ? { branchId: { [Op.or]: [branchId, null] } } : {})
      },
      include: [
        { model: ProductVariation, as: "ProductVariations", required: false },
        { model: Stock, as: "Stocks", required: false, where: branchId != null ? { branchId } : undefined },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Brand, as: 'brand', attributes: ['id', 'name'] }
      ]
    });

    for (const p of allProductsForStock) {
      const catKey = p.categoryId || 'uncategorized';
      const brandKey = p.brandId || 'no-brand';
      
      let pStock = 0;
      if (p.ProductVariations && p.ProductVariations.length > 0) {
        pStock = p.ProductVariations.reduce((sum, v) => sum + (parseFloat(v.currentStock) || 0), 0);
      } else {
        pStock = p.Stocks && p.Stocks.length > 0 ? parseFloat(p.Stocks[0].qty) : 0;
      }

      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, {
          categoryId: p.categoryId,
          categoryName: p.category?.name || 'Uncategorized',
          currentStock: 0,
          totalUnitSold: 0,
          totalAmount: 0
        });
      }
      categoryMap.get(catKey).currentStock += pStock;

      if (!brandMap.has(brandKey)) {
        brandMap.set(brandKey, {
          brandId: p.brandId,
          brandName: p.brand?.name || 'No Brand',
          currentStock: 0,
          totalUnitSold: 0,
          totalAmount: 0
        });
      }
      brandMap.get(brandKey).currentStock += pStock;
    }

    let totalQuantity = 0;
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const sale of sales) {
      // --- Prorate sale-level discount & tax across product line items ---
      // SaleItem has no discountAmount/taxAmount columns — they live on the Sale row.
      // We distribute them proportionally by each item's share of the product subtotal.
      const saleDiscount = parseFloat(sale.discountAmount) || 0;
      const saleTax     = parseFloat(sale.taxAmount)      || 0;

      // Compute the raw subtotal for PRODUCT items only (the denominator for proration)
      const productItemsSubtotal = sale.SaleItems.reduce((sum, it) => {
        return sum + (parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 0);
      }, 0);

      for (const item of sale.SaleItems) {
        const variation = item.ProductVariation;
        const product = variation
          ? (variation.Product || variation.product)
          : simpleProductMap.get(item.itemId);
        if (!product) continue;

        // Apply category filter
        if (categoryId && categoryId !== 'all' && product.categoryId !== parseInt(categoryId)) continue;
        
        // Apply brand filter
        if (brandId && brandId !== 'all' && product.brandId !== parseInt(brandId)) continue;
        
        // Apply search filter
        if (search && search.trim()) {
          const searchTerm = search.toLowerCase();
          const skuText = String(variation?.sku || '').toLowerCase();
          if (!product.name.toLowerCase().includes(searchTerm) && 
              !skuText.includes(searchTerm)) continue;
        }

        const quantity  = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.price)    || 0;
        const lineRaw   = unitPrice * quantity;

        // Prorate: this item's share of total product subtotal
        const ratio    = productItemsSubtotal > 0 ? lineRaw / productItemsSubtotal : 0;
        const discount = Math.round(saleDiscount * ratio * 100) / 100;
        const tax      = Math.round(saleTax      * ratio * 100) / 100;

        // amount = (price × qty) − prorated discount + prorated tax
        const amount = lineRaw - discount + tax;

        totalQuantity += quantity;
        totalAmount   += amount;
        totalDiscount += discount;
        totalTax      += tax;

        // For variation products → use variation.purchasePriceInc
        // For simple products   → fall back to product.purchasePriceInc
        const purchasePrice = variation
          ? (parseFloat(variation.purchasePriceInc) || 0)
          : (parseFloat(product.purchasePriceInc) || 0);

        // Profit = actual revenue received (after discount & tax) minus cost of goods
        const profit = amount - (purchasePrice * quantity);

        const reportItem = {
          id: `${sale.id}-${item.id}`,
          productName: product.name,
          sku: variation?.sku || product.sku || '-',
          customerName: sale.Customer?.name || 'Walk-in Customer',
          customerId: sale.customerId || null,
          contactNumber: sale.Customer?.mobile || '-',
          email: sale.Customer?.email || '-',
          invoiceNo: sale.invoiceNumber || `SALE-${sale.id}`,
          saleDate: sale.createdAt,
          quantity,
          unitPrice,
          subtotalPrice: lineRaw,       // gross line total before discount/tax
          discount,
          tax,
          amount,                        // net amount = lineRaw − discount + tax
          categoryId: product.categoryId,
          categoryName: product.category?.name || 'Uncategorized',
          brandId: product.brandId,
          brandName: product.brand?.name || 'No Brand',
          currentStock: variation
            ? (parseFloat(variation.currentStock) || 0)
            : (parseFloat(product.currentStock) || 0),
          purchasePrice,
          profit,                        // amount − (purchasePrice × qty)
        };

        reportItems.push(reportItem);

        // Aggregate by category
        const catKey = product.categoryId || 'uncategorized';
        if (!categoryMap.has(catKey)) {
          categoryMap.set(catKey, {
            categoryId: product.categoryId,
            categoryName: product.category?.name || 'Uncategorized',
            currentStock: 0,
            totalUnitSold: 0,
            totalAmount: 0
          });
        }
        const catData = categoryMap.get(catKey);
        // currentStock is already pre-calculated globally for all bound products
        catData.totalUnitSold += quantity;
        catData.totalAmount += amount;

        // Aggregate by brand
        const brandKey = product.brandId || 'no-brand';
        if (!brandMap.has(brandKey)) {
          brandMap.set(brandKey, {
            brandId: product.brandId,
            brandName: product.brand?.name || 'No Brand',
            currentStock: 0,
            totalUnitSold: 0,
            totalAmount: 0
          });
        }
        const brandData = brandMap.get(brandKey);
        // currentStock is already pre-calculated globally for all bound products
        brandData.totalUnitSold += quantity;
        brandData.totalAmount += amount;
      }
    }

    // Convert maps to arrays
    const categorySummaries = Array.from(categoryMap.values());
    const brandSummaries = Array.from(brandMap.values());

    // Apply pagination
    const total = reportItems.length;
    const paginatedItems = reportItems.slice(offset, offset + limit);

    const round2 = (num) => Math.round(num * 100) / 100;

    const formattedItems = paginatedItems.map(item => ({
      ...item,
      quantity: round2(item.quantity),
      unitPrice: round2(item.unitPrice),
      discount: round2(item.discount),
      tax: round2(item.tax),
      amount: round2(item.amount),
      profit: round2(item.profit),
      currentStock: round2(item.currentStock)
    }));

    return res.status(200).json({
      success: true,
      data: formattedItems,
      total: total,
      totalSummary: {
        totalQuantity: round2(totalQuantity),
        totalAmount: round2(totalAmount),
        totalDiscount: round2(totalDiscount),
        totalTax: round2(totalTax)
      },
      categorySummaries: categorySummaries.map(c => ({
        ...c,
        currentStock: round2(c.currentStock),
        totalUnitSold: round2(c.totalUnitSold),
        totalAmount: round2(c.totalAmount)
      })),
      brandSummaries: brandSummaries.map(b => ({
        ...b,
        currentStock: round2(b.currentStock),
        totalUnitSold: round2(b.totalUnitSold),
        totalAmount: round2(b.totalAmount)
      })),
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("reports productSell error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getPurchasePaymentReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    
    const { search, page: pageParam, limit: limitParam, from: fromStr, to: toStr } = req.query;
    
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    const where = {
      organizationId,
      type: { [Op.in]: ['purchase_payment', 'advance_payment'] },
      credit: { [Op.gt]: 0 }
    };
    
    if (fromStr || toStr) {
      const dateWhere = {};
      if (fromStr) {
        const fromDate = new Date(fromStr);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          dateWhere[Op.gte] = fromDate;
        }
      }
      if (toStr) {
        const toDate = new Date(toStr);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateWhere[Op.lte] = toDate;
        }
      }
      if (Object.keys(dateWhere).length > 0) {
        where.date = dateWhere;
      }
    }

    if (branchId != null) {
      const branchCond = {
        [Op.or]: [
          { purchaseId: null },
          { purchaseId: { [Op.in]: Sequelize.literal(`(SELECT id FROM purchases WHERE branch_id = ${branchId} OR branch_id IS NULL)`) } }
        ]
      };
      if (where[Op.and]) {
        where[Op.and].push(branchCond);
      } else {
        where[Op.and] = [branchCond];
      }
    }

    if (search) {
      const term = `%${search.trim()}%`;
      const searchOr = {
        [Op.or]: [
          { referenceNo: { [Op.like]: term } },
          { '$Supplier.name$': { [Op.like]: term } },
          { '$Purchase.referenceNo$': { [Op.like]: term } }
        ]
      };
      if (where[Op.and]) {
        where[Op.and].push(searchOr);
      } else {
        where[Op.and] = [searchOr];
      }
    }

    const { count, rows } = await SupplierTransaction.findAndCountAll({
      where,
      include: [
        { model: Supplier, attributes: ['id', 'name'] },
        { model: Purchase, as: 'Purchase', attributes: ['id', 'referenceNo', 'branchId'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset,
      subQuery: false
    });
    
    // Calculate global total
    const totalAmountResult = await SupplierTransaction.findAll({
      attributes: [[Sequelize.fn('SUM', Sequelize.col('credit')), 'totalAmount']],
      where,
      include: [
        { model: Supplier, attributes: [] },
        { model: Purchase, as: 'Purchase', attributes: [] }
      ],
      raw: true,
      subQuery: false
    });
    
    const globalTotalAmount = totalAmountResult && totalAmountResult[0] && totalAmountResult[0].totalAmount 
      ? parseFloat(totalAmountResult[0].totalAmount) 
      : 0;

    const data = rows.map(r => ({
      id: r.id,
      referenceNo: r.referenceNo || '-',
      paidOn: r.date,
      amount: parseFloat(r.credit) || 0,
      supplierName: r.Supplier ? r.Supplier.name : '-',
      paymentMethod: r.paymentMethod || '-',
      purchaseReference: r.Purchase ? r.Purchase.referenceNo : '-',
    }));

    return res.status(200).json({
      success: true,
      data,
      total: count,
      totalAmount: globalTotalAmount,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });

  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("reports purchasePayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getSellPaymentReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    
    const { search, page: pageParam, limit: limitParam, from: fromStr, to: toStr } = req.query;
    
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    const saleWhere = { organizationId };
    if (branchId != null) {
      saleWhere.branchId = branchId;
    }

    const where = {};
    
    if (fromStr || toStr) {
      const dateWhere = {};
      if (fromStr) {
        const fromDate = new Date(fromStr);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          dateWhere[Op.gte] = fromDate;
        }
      }
      if (toStr) {
        const toDate = new Date(toStr);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateWhere[Op.lte] = toDate;
        }
      }
      if (Object.keys(dateWhere).length > 0) {
        where.createdAt = dateWhere;
      }
    }

    if (search) {
      const term = `%${search.trim()}%`;
      const searchOr = {
        [Op.or]: [
          { transactionId: { [Op.like]: term } },
          { '$Sale.referenceNo$': { [Op.like]: term } },
          { '$Sale.Customer.name$': { [Op.like]: term } }
        ]
      };
      if (where[Op.and]) {
        where[Op.and].push(searchOr);
      } else {
        where[Op.and] = [searchOr];
      }
    }

    const { Payment, Sale, Customer } = require('../models');

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        { 
          model: Sale, 
          where: saleWhere,
          required: true,
          include: [
            { model: Customer, as: 'Customer', required: false, attributes: ['id', 'name', 'customerGroup'] }
          ],
          attributes: ['id', 'referenceNo', 'invoiceNumber']
        }
      ],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
      subQuery: false
    });

    const totalAmountResult = await Payment.findAll({
      attributes: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']],
      where,
      include: [
        { 
          model: Sale, 
          where: saleWhere,
          required: true,
          attributes: []
        }
      ],
      raw: true,
      subQuery: false
    });

    const globalTotalAmount = totalAmountResult && totalAmountResult[0] && totalAmountResult[0].totalAmount 
      ? parseFloat(totalAmountResult[0].totalAmount) 
      : 0;

    const data = rows.map(r => ({
      id: r.id,
      paidOn: r.createdAt,
      amount: parseFloat(r.amount) || 0,
      customerName: r.Sale && r.Sale.Customer ? r.Sale.Customer.name : 'Walk-In Customer',
      customerGroup: r.Sale && r.Sale.Customer ? (r.Sale.Customer.customerGroup || '-') : '-',
      paymentMethod: r.paymentMethod || '-',
      saleReference: r.Sale ? (r.Sale.invoiceNumber || r.Sale.referenceNo || '-') : '-',
    }));

    return res.status(200).json({
      success: true,
      data,
      total: count,
      totalAmount: globalTotalAmount,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getSellPaymentReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getExpenseReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { page: pageParam, limit: limitParam, from: fromStr, to: toStr, categoryId: categoryIdParam, search } = req.query;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    const where = { organizationId };

    if (branchId != null) {
      where.branchId = branchId;
    }

    if (fromStr || toStr) {
      const dateWhere = {};
      if (fromStr) {
        const fromDate = new Date(fromStr);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          dateWhere[Op.gte] = fromDate;
        }
      }
      if (toStr) {
        const toDate = new Date(toStr);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateWhere[Op.lte] = toDate;
        }
      }
      if (Object.keys(dateWhere).length > 0) {
        where.createdAt = dateWhere;
      }
    }

    if (categoryIdParam && !isNaN(parseInt(categoryIdParam, 10))) {
      where.categoryId = parseInt(categoryIdParam, 10);
    }

    if (search) {
      where[Op.or] = [
        { referenceNo: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { Expense, ExpenseCategory } = require('../models');

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include: [
        { model: ExpenseCategory, as: 'ExpenseCategory', required: false, attributes: ['id', 'name'] }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
    });

    const totalAmountResult = await Expense.findAll({
      attributes: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']],
      where,
      raw: true,
    });

    const globalTotalAmount = totalAmountResult?.[0]?.totalAmount
      ? parseFloat(totalAmountResult[0].totalAmount)
      : 0;

    // Fetch categories for the filter dropdown
    const categories = await ExpenseCategory.findAll({
      where: { organizationId },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    const data = rows.map(r => ({
      id: r.id,
      date: r.date,
      category: r.ExpenseCategory ? r.ExpenseCategory.name : '-',
      categoryId: r.categoryId,
      expenseFor: r.expenseFor || '-',
      paymentMethod: r.paymentMethod || '-',
      amount: parseFloat(r.amount) || 0,
    }));

    return res.status(200).json({
      success: true,
      data,
      total: count,
      totalAmount: globalTotalAmount,
      categories,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getExpenseReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


async function getCashRegisterReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const { page: pageParam, limit: limitParam, from: fromStr, to: toStr, status, search } = req.query;
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    const where = { organizationId };
    if (branchId != null) {
      where.branchId = branchId;
    }
    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { '$CashRegister.name$': { [Op.like]: `%${search}%` } },
        { '$User.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    if (fromStr || toStr) {
      const dateWhere = {};
      if (fromStr) {
        const fromDate = new Date(fromStr);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          dateWhere[Op.gte] = fromDate;
        }
      }
      if (toStr) {
        const toDate = new Date(toStr);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateWhere[Op.lte] = toDate;
        }
      }
      if (Object.keys(dateWhere).length > 0) {
        where.openedAt = dateWhere;
      }
    }

    const { CashRegister, CashRegisterTransaction, Sale, Payment, User, Branch } = require('../models');

    const { count, rows } = await CashRegister.findAndCountAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Branch, as: 'Branch', attributes: ['id', 'name'] },
        { model: CashRegisterTransaction, as: 'Transactions', required: false }
      ],
      order: [['openedAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
    });

    const data = [];
    
    // For each register, calculate the totals
    for (const register of rows) {
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
          { model: Payment, as: "Payments" }
        ],
      });

      let grossSales = 0;
      let totalCollected = 0;
      let totalCheques = 0;
      let totalCash = 0;
      let totalBankTransfer = 0;
      let totalAdvancePayment = 0;
      let otherPayments = 0;

      sales.forEach((sale) => {
        grossSales += parseFloat(sale.total) || 0;
        if (sale.Payments) {
          sale.Payments.forEach((payment) => {
            const amount = parseFloat(payment.amount) || 0;
            const method = payment.paymentMethod || "other";
            totalCollected += amount;

            if (method === 'cash') totalCash += amount;
            else if (method === 'cheque') totalCheques += amount;
            else if (method === 'bank_transfer') totalBankTransfer += amount;
            else if (method === 'advance_payment') totalAdvancePayment += amount;
            else otherPayments += amount;
          });
        }
      });

      let cashIn = 0;
      let cashOut = 0;
      if (register.Transactions) {
        register.Transactions.forEach((tx) => {
          if (tx.type === "cash_in") cashIn += parseFloat(tx.amount);
          if (tx.type === "cash_out") cashOut += parseFloat(tx.amount);
        });
      }

      const expectedBalance = parseFloat(register.openingBalance) + totalCash + cashIn - cashOut;

      data.push({
        id: register.id,
        status: register.status,
        openTime: register.openedAt,
        closeTime: register.closedAt,
        location: register.Branch ? register.Branch.name : '-',
        user: register.User ? register.User.name : '-',
        grossSales,
        totalCheques,
        totalCash,
        totalBankTransfer,
        totalAdvancePayment,
        otherPayments,
        totalCollected,
        expectedBalance,
      });
    }

    return res.status(200).json({
      success: true,
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getCashRegisterReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getActivityLogReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const userBranchId = await getBranchIdFromHeader(req, organizationId);
    
    const { from: fromStr, to: toStr, page: pageParam, limit: limitParam, userId, module: filterModule, branchId: filterBranchId, search } = req.query;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 25));
    const offset = (page - 1) * limit;

    const where = { organizationId };

    if (userBranchId != null) {
      where.branchId = userBranchId;
    } else if (filterBranchId && filterBranchId !== 'all') {
      where.branchId = filterBranchId;
    }

    if (userId && userId !== 'all') where.userId = userId;
    if (filterModule && filterModule !== 'all') where.module = filterModule;

    if (search) {
      where[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { '$User.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    if (fromStr || toStr) {
      where.createdAt = {};
      if (fromStr) {
        const from = new Date(fromStr);
        from.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = from;
      }
      if (toStr) {
        const to = new Date(toStr);
        to.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = to;
      }
    }

    const { ActivityLog, User, Branch } = require("../models");

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      include: [
        { model: User, as: "User", attributes: ["id", "name"] },
        { model: Branch, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("getActivityLogReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getProfitLossReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { from: fromStr, to: toStr, tab = 'products' } = req.query;

    const round2 = (n) => Math.round((n || 0) * 100) / 100;

    // ─── Date Range ───────────────────────────────────────
    let startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    if (fromStr) { const p = new Date(fromStr); if (!isNaN(p)) { startDate = p; startDate.setHours(0,0,0,0); } }
    if (toStr)   { const p = new Date(toStr);   if (!isNaN(p)) { endDate = p;   endDate.setHours(23,59,59,999); } }

    const dateFilter = { [Op.gte]: startDate, [Op.lte]: endDate };
    const base = { organizationId };
    if (branchId) base.branchId = branchId;

    // ─── 1. Total Sales ───────────────────────────────────
    const sales = await Sale.findAll({
      where: { ...base, createdAt: dateFilter },
      attributes: ['total', 'subtotal', 'discountAmount', 'shippingCharges', 'taxAmount'],
    });
    let totalSales = 0, totalSellDiscount = 0, totalSellShipping = 0;
    for (const s of sales) {
      totalSales      += parseFloat(s.total) || 0;
      totalSellDiscount += parseFloat(s.discountAmount) || 0;
      totalSellShipping += parseFloat(s.shippingCharges) || 0;
    }

    // ─── 2. Sale Returns ──────────────────────────────────
    const saleReturns = await SaleReturn.findAll({ where: { ...base, createdAt: dateFilter } });
    let totalSellReturn = 0;
    for (const r of saleReturns) totalSellReturn += parseFloat(r.total) || 0;

    // ─── 3. Total Purchases ───────────────────────────────
    const purchases = await Purchase.findAll({
      where: { ...base, createdAt: dateFilter },
      attributes: ['totalAmount', 'shippingCharges', 'discountAmount'],
    });
    let totalPurchase = 0, totalPurchaseShipping = 0, totalPurchaseDiscount = 0;
    for (const p of purchases) {
      totalPurchase         += parseFloat(p.totalAmount) || 0;
      totalPurchaseShipping += parseFloat(p.shippingCharges) || 0;
      totalPurchaseDiscount += parseFloat(p.discountAmount) || 0;
    }

    // ─── 4. Purchase Returns ──────────────────────────────
    const purchaseReturns = await PurchaseReturn.findAll({ where: { ...base, createdAt: dateFilter } });
    let totalPurchaseReturn = 0;
    for (const r of purchaseReturns) totalPurchaseReturn += parseFloat(r.total) || 0;

    // ─── 5. Expenses ──────────────────────────────────────
    const expenses = await Expense.findAll({
      where: { ...base, createdAt: dateFilter },
      attributes: ['amount'],
    });
    let totalExpense = 0;
    for (const e of expenses) totalExpense += parseFloat(e.amount) || 0;

    // ─── 6. Closing Stock (current snapshot) ─────────────
    const stockWhere = { organizationId };
    if (branchId) stockWhere.branchId = branchId;
    const stocks = await Stock.findAll({
      where: stockWhere,
      include: [{ model: Product, as: 'product', attributes: ['purchasePriceExc', 'sellingPriceInc'] }],
    });
    let closingStockPurchasePrice = 0, closingStockSalePrice = 0;
    for (const s of stocks) {
      const qty  = parseFloat(s.qty) || 0;
      const pp   = parseFloat(s.product?.purchasePriceExc) || 0;
      const sp   = parseFloat(s.product?.sellingPriceInc) || 0;
      closingStockPurchasePrice += qty * pp;
      closingStockSalePrice     += qty * sp;
    }

    // ─── 7. Gross & Net Profit ────────────────────────────
    // COGS = total purchases - purchase returns (simplified stock-based COGS)
    const cogs = round2(totalPurchase - totalPurchaseReturn);
    // Gross Profit = Total Sales - COGS
    const grossProfit = round2(totalSales - totalSellReturn - cogs);
    // Net Profit = Gross Profit - Expenses - Discounts + Purchase Discounts + Shipping Revenue
    const netProfit = round2(
      grossProfit
      - totalExpense
      - totalSellDiscount
      + totalPurchaseDiscount
      + totalSellShipping
      - totalPurchaseShipping
    );
    const grossProfitPct = totalSales > 0 ? round2((grossProfit / totalSales) * 100) : 0;
    const netProfitPct   = totalSales > 0 ? round2((netProfit   / totalSales) * 100) : 0;

    // ─── 8. Breakdown by tab ──────────────────────────────
    let breakdown = [];

    if (tab === 'products' || tab === 'categories' || tab === 'brands') {
      // Fetch sold items in the date range
      const soldItems = await SaleItem.findAll({
        where: { '$Sale.organization_id$': organizationId, '$Sale.created_at$': dateFilter },
        include: [{
          model: Sale,
          as: 'Sale',
          attributes: [],
          where: branchId ? { branchId } : {},
        }],
        attributes: ['itemId', 'itemType', 'itemName', 'price', 'quantity'],
      });

      // Build map: product/service id -> { totalRevenue, totalCost, qty }
      const itemMap = {};
      for (const item of soldItems) {
        if (item.itemType !== 'product') continue;
        const id = item.itemId;
        if (!itemMap[id]) itemMap[id] = { revenue: 0, cost: 0, qty: 0, name: item.itemName };
        const revenue = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
        itemMap[id].revenue += revenue;
        itemMap[id].qty     += parseInt(item.quantity) || 0;
      }

      // Fetch purchase prices for all sold products
      const productIds = Object.keys(itemMap).map(Number);
      if (productIds.length > 0) {
        const products = await Product.findAll({
          where: { id: { [Op.in]: productIds }, organizationId },
          attributes: ['id', 'name', 'purchasePriceExc', 'categoryId', 'brandId'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Brand,    as: 'brand',    attributes: ['id', 'name'] },
          ],
        });

        for (const p of products) {
          const id = p.id;
          if (itemMap[id]) {
            const cost = (parseFloat(p.purchasePriceExc) || 0) * itemMap[id].qty;
            itemMap[id].cost        = cost;
            itemMap[id].productName = p.name;
            itemMap[id].categoryId  = p.categoryId;
            itemMap[id].categoryName= p.category?.name || 'Uncategorized';
            itemMap[id].brandId     = p.brandId;
            itemMap[id].brandName   = p.brand?.name || 'No Brand';
          }
        }
      }

      if (tab === 'products') {
        breakdown = Object.entries(itemMap).map(([id, d]) => ({
          id,
          name: d.productName || d.name,
          qty: d.qty,
          revenue: round2(d.revenue),
          cost: round2(d.cost),
          grossProfit: round2(d.revenue - d.cost),
        }));
      } else if (tab === 'categories') {
        const catMap = {};
        for (const [, d] of Object.entries(itemMap)) {
          const key = d.categoryName || 'Uncategorized';
          if (!catMap[key]) catMap[key] = { revenue: 0, cost: 0, qty: 0 };
          catMap[key].revenue += d.revenue;
          catMap[key].cost    += d.cost;
          catMap[key].qty     += d.qty;
        }
        breakdown = Object.entries(catMap).map(([name, d]) => ({
          name, qty: d.qty, revenue: round2(d.revenue), cost: round2(d.cost), grossProfit: round2(d.revenue - d.cost),
        }));
      } else if (tab === 'brands') {
        const brandMap = {};
        for (const [, d] of Object.entries(itemMap)) {
          const key = d.brandName || 'No Brand';
          if (!brandMap[key]) brandMap[key] = { revenue: 0, cost: 0, qty: 0 };
          brandMap[key].revenue += d.revenue;
          brandMap[key].cost    += d.cost;
          brandMap[key].qty     += d.qty;
        }
        breakdown = Object.entries(brandMap).map(([name, d]) => ({
          name, qty: d.qty, revenue: round2(d.revenue), cost: round2(d.cost), grossProfit: round2(d.revenue - d.cost),
        }));
      }
    } else if (tab === 'locations') {
      // Group sales by branch
      const branchSales = await Sale.findAll({
        where: { organizationId, createdAt: dateFilter },
        attributes: ['branchId', [Sequelize.fn('SUM', Sequelize.col('total')), 'totalSales']],
        include: [{ model: Branch, as: 'Branch', attributes: ['name'] }],
        group: ['branchId', 'Branch.id'],
      });
      breakdown = branchSales.map(s => ({
        name: s.Branch?.name || 'Unknown',
        revenue: round2(parseFloat(s.dataValues.totalSales) || 0),
        cost: 0,
        grossProfit: round2(parseFloat(s.dataValues.totalSales) || 0),
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          // COSTS
          openingStockPurchasePrice: 0,   // simplified: not computed
          openingStockSalePrice: 0,
          totalPurchase:         round2(totalPurchase),
          totalPurchaseShipping: round2(totalPurchaseShipping),
          totalPurchaseDiscount: round2(totalPurchaseDiscount),
          totalExpense:          round2(totalExpense),
          totalSellDiscount:     round2(totalSellDiscount),
          totalSellReturn:       round2(totalSellReturn),
          // REVENUE
          closingStockPurchasePrice: round2(closingStockPurchasePrice),
          closingStockSalePrice:     round2(closingStockSalePrice),
          totalSales:            round2(totalSales),
          totalSellShipping:     round2(totalSellShipping),
          totalPurchaseReturn:   round2(totalPurchaseReturn),
          // TOTALS
          cogs,
          grossProfit,
          grossProfitPct,
          netProfit,
          netProfitPct,
        },
        breakdown,
        tab,
      },
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error('getProfitLossReport error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getTaxReport(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const fromStr = req.query.from;
    const toStr = req.query.to;

    let startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (fromStr) {
      const parsedFrom = new Date(fromStr);
      if (!isNaN(parsedFrom.getTime())) {
        startDate = parsedFrom;
        startDate.setHours(0, 0, 0, 0);
      }
    }
    if (toStr) {
      const parsedTo = new Date(toStr);
      if (!isNaN(parsedTo.getTime())) {
        endDate = parsedTo;
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const whereSales = { organizationId, createdAt: { [Op.between]: [startDate, endDate] } };
    const wherePurchases = { organizationId, purchaseDate: { [Op.between]: [startDate, endDate] } };
    const whereExpenses = { organizationId, date: { [Op.between]: [startDate, endDate] } };

    if (branchId) {
      whereSales.branchId = branchId;
      wherePurchases.branchId = branchId;
      whereExpenses.branchId = branchId;
    }

    // Sales (Output Tax)
    const sales = await Sale.findAll({
      where: whereSales,
      include: [{ model: Customer, as: "Customer", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
      attributes: ["id", "createdAt", "invoiceNumber", "total", "paymentMethod", "discountAmount", "taxAmount"]
    });

    // Purchases (Input Tax)
    const purchases = await Purchase.findAll({
      where: wherePurchases,
      include: [{ model: Supplier, as: "Supplier", attributes: ["id", "name"] }],
      order: [["purchaseDate", "DESC"]],
      attributes: ["id", "purchaseDate", "referenceNo", "totalAmount", "paymentStatus", "discountAmount", "taxAmount"]
    });

    // Expenses (Expense Tax)
    const expenses = await Expense.findAll({
      where: whereExpenses,
      order: [["date", "DESC"]],
      attributes: ["id", "date", "referenceNo", "amount", "paymentMethod", "taxAmount"]
    });

    let totalOutputTax = 0;
    let totalInputTax = 0;
    let totalExpenseTax = 0;

    const formattedSales = sales.map(s => {
      const t = parseFloat(s.taxAmount || 0);
      totalOutputTax += t;
      return {
        id: s.id,
        date: s.createdAt,
        invoiceNumber: s.invoiceNumber || '-',
        customerName: s.Customer ? (s.Customer.name || 'Unknown Customer') : 'Walk-in Customer',
        total: parseFloat(s.total || 0),
        paymentMethod: s.paymentMethod || 'Unknown',
        discount: parseFloat(s.discountAmount || 0),
        taxAmount: t,
      };
    });

    const formattedPurchases = purchases.map(p => {
      const t = parseFloat(p.taxAmount || 0);
      totalInputTax += t;
      return {
        id: p.id,
        date: p.purchaseDate,
        referenceNo: p.referenceNo || '-',
        supplierName: p.Supplier ? p.Supplier.name : 'Unknown Supplier',
        total: parseFloat(p.totalAmount || 0),
        paymentMethod: p.paymentStatus || 'Unknown',
        discount: parseFloat(p.discountAmount || 0),
        taxAmount: t,
      };
    });

    const formattedExpenses = expenses.map(e => {
      const t = parseFloat(e.taxAmount || 0);
      totalExpenseTax += t;
      return {
        id: e.id,
        date: e.date,
        referenceNo: e.referenceNo || '-',
        total: parseFloat(e.amount || 0),
        paymentMethod: e.paymentMethod || 'Unknown',
        taxAmount: t,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          outputTax: totalOutputTax,
          inputTax: totalInputTax,
          expenseTax: totalExpenseTax,
          netTax: totalOutputTax - totalInputTax - totalExpenseTax,
        },
        sales: formattedSales,
        purchases: formattedPurchases,
        expenses: formattedExpenses,
      }
    });

  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error('getTaxReport error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getPurchaseSaleReport,
  getSupplierCustomerReport,
  getStockReport,
  getStockAdjustmentReport,
  getProductSellReport,
  getPurchasePaymentReport,
  getSellPaymentReport,
  getExpenseReport,
  getCashRegisterReport,
  getActivityLogReport,
  getProfitLossReport,
  getTaxReport,
};
