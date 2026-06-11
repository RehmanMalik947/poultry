const { Purchase, PurchaseItem, Product, Stock, Bank, BankTransaction, SupplierTransaction, PurchaseReturn, User,PurchaseReturnItem, PurchaseReturnPayment, sequelize } = require("../models");
const { Op } = require("sequelize");
const { logActivity } = require("../utils/activityLogger");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

async function generatePaymentReference(organizationId, type, transaction) {
  const year = new Date().getFullYear();
  const prefix = type === "advance" ? `ADV${year}-` : `SP${year}-`;
  
  const lastTx = await SupplierTransaction.findOne({
    where: { organizationId, referenceNo: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
    transaction
  });

  let refNo = `${prefix}0001`;
  if (lastTx && lastTx.referenceNo) {
    const parts = lastTx.referenceNo.split('-');
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      refNo = `${prefix}${String(parseInt(parts[1], 10) + 1).padStart(4, '0')}`;
    }
  }
  return refNo;
}

async function createPurchase(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const {
      supplierId,
      refNo,
      locationId,
      purchaseDate,
      purchaseStatus,
      discountType,
      discountAmount,
      purchaseTax,
      additionalNotes,
      shippingDetails,
      shippingCharges,
      paymentAmount,
      paymentMethod,
      paymentAccount,
      paymentNote,
      paymentDate,
      chequeNo,
      externalAccountNo,
      items,
      rate,
weight,
lorryNo,
transportName,
    } = req.body;

    const finalBranchId = locationId ? parseInt(locationId, 10) : null;

    let finalRefNo = refNo;
    if (!finalRefNo || finalRefNo.trim() === "") {
      const lastPurchase = await Purchase.findOne({
        where: { organizationId },
        order: [["id", "DESC"]],
        transaction
      });
      const nextId = lastPurchase ? lastPurchase.id + 1 : 1;
      finalRefNo = `PO-${String(nextId).padStart(4, '0')}`;
    }

    // Calculate totals
    const finalRate = parseFloat(rate) || 0;
const finalWeight = parseFloat(weight) || 0;
let subtotal = finalWeight * finalRate;
    let totalDiscount = 0;
    if (discountType === "fixed") totalDiscount = parseFloat(discountAmount) || 0;
    else if (discountType === "percentage") totalDiscount = subtotal * (parseFloat(discountAmount) || 0) / 100;

    const baseForTax = subtotal - totalDiscount;
    let taxAmount = 0;
    if (purchaseTax !== "none") taxAmount = baseForTax * 0.05; // Mock 5% tax

    const shipping = parseFloat(shippingCharges) || 0;
    const totalAmount = baseForTax + taxAmount + shipping;

    const paidAmount = parseFloat(paymentAmount) || 0;
    let finalPaymentStatus = "due";
    if (paidAmount >= totalAmount && totalAmount > 0) {
      finalPaymentStatus = "paid";
    } else if (paidAmount > 0) {
      finalPaymentStatus = "partial";
    }

    const purchase = await Purchase.create({
      organizationId,
      branchId: finalBranchId,
      supplierId: supplierId ? parseInt(supplierId, 10) : null,
      referenceNo: finalRefNo,
      purchaseDate: purchaseDate || new Date(),
      status: purchaseStatus || "received",
      discountType: discountType || "none",
      discountAmount: totalDiscount,
      taxAmount: taxAmount,
      shippingDetails,
      shippingCharges: shipping,
      totalAmount,
      paidAmount,
      additionalNotes,
      paymentStatus: finalPaymentStatus,
      rate: parseFloat(rate) || 0,
weight: parseFloat(weight) || 0,
lorryNo: lorryNo || null,
transportName: transportName || null,
addedById: req.staff?.id || req.user?.id || null,
    }, { transaction });

    for (const item of items) {
      await PurchaseItem.create({
        purchaseId: purchase.id,
        productId: item.productId,
        name: item.name,
        quantity: item.qty,
        unitCost: item.unitCost,
        discountPercent: item.discountPercent || 0,
        profitMargin: item.profitMargin || 0,
        sellingPrice: item.sellingPrice || 0,
        lineTotal: item.qty * item.unitCost
      }, { transaction });

      // Update product stock if status is 'received'
      if (purchaseStatus === "received") {
        // 1. Update Product's total stock (legacy/cache)
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          product.currentStock = parseFloat(product.currentStock || 0) + parseFloat(item.qty);
          await product.save({ transaction });
        }

        // 2. Update Branch-specific Stock table
        if (finalBranchId) {
          let stock = await Stock.findOne({
            where: {
              organizationId,
              branchId: finalBranchId,
              productId: item.productId
            },
            transaction
          });

          if (!stock) {
            stock = await Stock.create({
              organizationId,
              branchId: finalBranchId,
              productId: item.productId,
              qty: 0,
              alertQty: 0
            }, { transaction });
          }

          stock.qty = parseFloat(stock.qty) + parseFloat(item.qty);
          await stock.save({ transaction });
        }
      }
    }

    // ─────────────────────────────
    // BANK LOGGING & SUPPLIER PAYMENT LOGGING
    // ─────────────────────────────
    let paymentRefNo = null;
    if (paidAmount > 0) {
      paymentRefNo = await generatePaymentReference(organizationId, 'payment', transaction);
    }

    if (paymentAccount && paymentAccount !== "none" && paidAmount > 0) {
      const bank = await Bank.findByPk(paymentAccount, { transaction });
      if (bank) {
        await BankTransaction.create({
          organizationId,
          bankId: paymentAccount,
          type: "debit",
          amount: paidAmount,
          transactionType: "purchase",
          referenceId: purchase.id,
          description: `Purchase Payment: ${paymentRefNo} (PO: ${finalRefNo})`,
          transactionDate: paymentDate || purchaseDate || new Date(),
        }, { transaction });

        bank.balance = Number(bank.balance) - Number(paidAmount);
        await bank.save({ transaction });
      }
    }

    // ─────────────────────────────
    // SUPPLIER TRANSACTION LOGGING
    // ─────────────────────────────
    if (supplierId) {
      const sid = parseInt(supplierId, 10);

      // Get last balance for this supplier
      const lastTx = await SupplierTransaction.findOne({
        where: { organizationId, supplierId: sid },
        order: [["id", "DESC"]],
        transaction,
      });
      const prevBalance = lastTx ? parseFloat(lastTx.balance) : 0;

      // Entry 1: Purchase debit (we owe supplier this amount)
      const balanceAfterPurchase = prevBalance + totalAmount;
      await SupplierTransaction.create({
        organizationId,
        supplierId: sid,
        purchaseId: purchase.id,
        type: "purchase",
        debit: totalAmount,
        credit: 0,
        balance: balanceAfterPurchase,
        referenceNo: finalRefNo,
        note: `Purchase ${finalRefNo}`,
        date: purchaseDate || new Date(),
      }, { transaction });

      // Entry 2: Payment credit (if paid at time of purchase)
      if (paidAmount > 0) {
        const balanceAfterPayment = balanceAfterPurchase - paidAmount;
        await SupplierTransaction.create({
          organizationId,
          supplierId: sid,
          purchaseId: purchase.id,
          type: "purchase_payment",
          debit: 0,
          credit: paidAmount,
          balance: balanceAfterPayment,
          paymentMethod: paymentMethod || "cash",
          bankId: paymentAccount && paymentAccount !== "none" ? parseInt(paymentAccount, 10) : null,
          referenceNo: paymentRefNo,
          note: `Payment ${paymentRefNo} for purchase ${finalRefNo}`,
          date: paymentDate || purchaseDate || new Date(),
        }, { transaction });
      }
    }

    await transaction.commit();

    logActivity({
      organizationId,
      branchId: finalBranchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Purchases',
      action: 'Created',
      description: `Purchase ${finalRefNo} created with total ${totalAmount}`
    });

    return res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    await transaction.rollback();
    console.error("createPurchase error:", err?.message || err);
    console.error("createPurchase stack:", err?.stack);
    console.error("createPurchase original:", err?.original?.message || "");
    return res.status(500).json({
      success: false,
      message: err?.original?.message || err?.message || "Server error"
    });
  }
}

async function getPurchases(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { supplierId, branchId, page = 1, limit = 10, search, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { organizationId };
    if (supplierId) {
      whereClause.supplierId = parseInt(supplierId, 10);
    }
    if (branchId) {
      whereClause.branchId = parseInt(branchId, 10);
    }
    if (search) {
      whereClause[Op.or] = [
        { referenceNo: { [Op.like]: `%${search}%` } },
        { '$Supplier.name$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (from || to) {
      const dateWhere = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          dateWhere[Op.gte] = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateWhere[Op.lte] = toDate;
        }
      }
      if (Object.keys(dateWhere).length > 0) {
        // Support both new and legacy records:
        // some purchases rely on purchaseDate while others rely on createdAt.
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { purchaseDate: dateWhere },
              { createdAt: dateWhere },
            ],
          },
        ];
      }
    }

    const { count, rows } = await Purchase.findAndCountAll({
      distinct: true,
      where: whereClause,
include: [
  "PurchaseItems",
  "Branch",
  "Supplier",
  {
    model: User,
    as: "AddedBy",
    attributes: ["id", "name"],
  },
],      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });
    return res.status(200).json({ success: true, data: rows, total: count });
  } catch (err) {
    console.error("getPurchases error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getPurchaseById(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    const purchase = await Purchase.findOne({
      where: { id: req.params.id, organizationId },
      include: [
        "PurchaseItems",
        "Branch",
        "Supplier",
        {
          model: User,
          as: "AddedBy",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (err) {
    console.error("getPurchaseById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}


async function updatePurchase(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const purchaseId = req.params.id;

    const purchase = await Purchase.findOne({
      where: { id: purchaseId, organizationId },
      include: ["PurchaseItems"],
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    const {
      supplierId,
      refNo,
      locationId,
      purchaseDate,
      purchaseStatus,
      discountType,
      discountAmount,
      purchaseTax,
      additionalNotes,
      shippingDetails,
      shippingCharges,
      items,
      rate,
      weight,
      lorryNo,
      transportName,
    } = req.body;

    const finalBranchId = locationId ? parseInt(locationId, 10) : purchase.branchId;

    // Recalculate totals
    const finalRate = parseFloat(rate) || purchase.rate || 0;
    const finalWeight = parseFloat(weight) || purchase.weight || 0;
    let subtotal = finalWeight * finalRate;
    let totalDiscount = 0;
    if (discountType === "fixed") totalDiscount = parseFloat(discountAmount) || 0;
    else if (discountType === "percentage") totalDiscount = subtotal * (parseFloat(discountAmount) || 0) / 100;

    const baseForTax = subtotal - totalDiscount;
    let taxAmount = 0;
    if (purchaseTax !== "none") taxAmount = baseForTax * 0.05;

    const shipping = parseFloat(shippingCharges) || 0;
    const totalAmount = baseForTax + taxAmount + shipping;

    const oldStatus = purchase.status;
    const oldBranchId = purchase.branchId;

    // Update purchase record
    await purchase.update({
      supplierId: supplierId ? parseInt(supplierId, 10) : purchase.supplierId,
      referenceNo: refNo || purchase.referenceNo,
      branchId: finalBranchId,
      purchaseDate: purchaseDate || purchase.purchaseDate,
      status: purchaseStatus || purchase.status,
      discountType: discountType || purchase.discountType,
      discountAmount: totalDiscount,
      taxAmount,
      shippingDetails: shippingDetails !== undefined ? shippingDetails : purchase.shippingDetails,
      shippingCharges: shipping,
      additionalNotes: additionalNotes !== undefined ? additionalNotes : purchase.additionalNotes,
      rate: finalRate,
      weight: finalWeight,
      lorryNo: lorryNo !== undefined ? lorryNo : purchase.lorryNo,
      transportName: transportName !== undefined ? transportName : purchase.transportName,
      totalAmount,
    }, { transaction });

    // Handle stock reversals if branch changed or status changed
    if (purchase.PurchaseItems && purchase.PurchaseItems.length > 0) {
      // Reverse old stock
      const oldItems = purchase.PurchaseItems;
      if (oldStatus === "received") {
        for (const item of oldItems) {
          const product = await Product.findByPk(item.productId, { transaction });
          if (product) {
            product.currentStock = Math.max(0, parseFloat(product.currentStock || 0) - parseFloat(item.quantity));
            await product.save({ transaction });
          }
          if (oldBranchId) {
            const stock = await Stock.findOne({
              where: { organizationId, branchId: oldBranchId, productId: item.productId },
              transaction
            });
            if (stock) {
              stock.qty = Math.max(0, parseFloat(stock.qty) - parseFloat(item.quantity));
              await stock.save({ transaction });
            }
          }
        }
      }

      // Delete old purchase items
      for (const item of oldItems) {
        await item.destroy({ transaction });
      }
    }

    // Re-create purchase items
    if (items && items.length > 0) {
      for (const item of items) {
        await PurchaseItem.create({
          purchaseId: purchase.id,
          productId: item.productId,
          name: item.name,
          quantity: item.qty,
          unitCost: item.unitCost,
          discountPercent: item.discountPercent || 0,
          profitMargin: item.profitMargin || 0,
          sellingPrice: item.sellingPrice || 0,
          lineTotal: item.qty * item.unitCost
        }, { transaction });

        // Add new stock if status is received
        const newStatus = purchaseStatus || oldStatus;
        if (newStatus === "received") {
          const product = await Product.findByPk(item.productId, { transaction });
          if (product) {
            product.currentStock = parseFloat(product.currentStock || 0) + parseFloat(item.qty);
            await product.save({ transaction });
          }
          if (finalBranchId) {
            let stock = await Stock.findOne({
              where: { organizationId, branchId: finalBranchId, productId: item.productId },
              transaction
            });
            if (!stock) {
              stock = await Stock.create({
                organizationId,
                branchId: finalBranchId,
                productId: item.productId,
                qty: 0,
                alertQty: 0
              }, { transaction });
            }
            stock.qty = parseFloat(stock.qty) + parseFloat(item.qty);
            await stock.save({ transaction });
          }
        }
      }
    }

    await transaction.commit();

    logActivity({
      organizationId,
      branchId: finalBranchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Purchases',
      action: 'Updated',
      description: `Purchase ${purchase.referenceNo || purchase.id} updated`
    });

    return res.status(200).json({ success: true, data: purchase });
  } catch (err) {
    await transaction.rollback();
    console.error("updatePurchase error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

async function getPurchasePayments(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const transactions = await BankTransaction.findAll({
      where: {
        organizationId,
        transactionType: "purchase",
        referenceId: req.params.id
      },
      include: [
        {
          model: Bank,
          as: "Bank",           // apne model association ka 'as' naam check karo
          attributes: ["id", "bankName", "accountNumber"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    console.error("getPurchasePayments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function addPayment(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const purchaseId = req.params.id;
    const { amount, accountId, paymentDate, paymentMethod, paymentNote, chequeNo, externalAccountNo } = req.body;

    const purchase = await Purchase.findOne({
      where: { id: purchaseId, organizationId },
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }

    // Generate Payment Reference
    const paymentRefNo = await generatePaymentReference(organizationId, 'payment', transaction);

    // Record Bank Transaction
    if (accountId && accountId !== "none") {
      const bank = await Bank.findByPk(accountId, { transaction });
      if (!bank) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid bank account" });
      }

      await BankTransaction.create({
        organizationId,
        bankId: accountId,
        type: "debit",
        amount: paymentAmount,
        transactionType: "purchase",
        referenceId: purchase.id,
        description: `Purchase Payment: ${paymentRefNo} (PO: ${purchase.referenceNo || purchase.id})${paymentNote ? ' - ' + paymentNote : ''}`,
        transactionDate: paymentDate || new Date(),
      }, { transaction });

      bank.balance = Number(bank.balance) - Number(paymentAmount);
      await bank.save({ transaction });
    }

    // Update Purchase paid amount and status
    purchase.paidAmount = Number(purchase.paidAmount || 0) + paymentAmount;
    
    if (purchase.paidAmount >= purchase.totalAmount && purchase.totalAmount > 0) {
      purchase.paymentStatus = "paid";
    } else if (purchase.paidAmount > 0) {
      purchase.paymentStatus = "partial";
    } else {
      purchase.paymentStatus = "due";
    }

    await purchase.save({ transaction });

    // ─────────────────────────────
    // SUPPLIER TRANSACTION LOGGING
    // ─────────────────────────────
    if (purchase.supplierId) {
      const lastTx = await SupplierTransaction.findOne({
        where: { organizationId, supplierId: purchase.supplierId },
        order: [["id", "DESC"]],
        transaction,
      });
      const prevBalance = lastTx ? parseFloat(lastTx.balance) : 0;
      const newBalance = prevBalance - paymentAmount;

      await SupplierTransaction.create({
        organizationId,
        supplierId: purchase.supplierId,
        purchaseId: purchase.id,
        type: "purchase_payment",
        debit: 0,
        credit: paymentAmount,
        balance: newBalance,
        paymentMethod: paymentMethod || "cash",
        bankId: accountId && accountId !== "none" ? parseInt(accountId, 10) : null,
        referenceNo: paymentRefNo,
        note: paymentNote || `Payment ${paymentRefNo} for purchase ${purchase.referenceNo || purchase.id}`,
        date: paymentDate || new Date(),
      }, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({ success: true, message: "Payment added successfully", data: purchase });
  } catch (err) {
    await transaction.rollback();
    console.error("addPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deletePurchase(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const purchaseId = req.params.id;

    const purchase = await Purchase.findOne({
      where: { id: purchaseId, organizationId },
      include: ["PurchaseItems"],
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    // 1. Reverse Bank Transactions
    const bankTransactions = await BankTransaction.findAll({
      where: {
        organizationId,
        transactionType: "purchase",
        referenceId: purchaseId
      },
      transaction
    });

    for (const bt of bankTransactions) {
      const bank = await Bank.findByPk(bt.bankId, { transaction });
      if (bank) {
        // Reverse debit -> add back to balance
        bank.balance = Number(bank.balance) + Number(bt.amount);
        await bank.save({ transaction });
      }
      await bt.destroy({ transaction });
    }

    // 2. Reverse Stock
    if (purchase.status === "received" && purchase.PurchaseItems) {
      for (const item of purchase.PurchaseItems) {
        // Reverse Product total stock
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          product.currentStock = Math.max(0, parseFloat(product.currentStock || 0) - parseFloat(item.quantity));
          await product.save({ transaction });
        }

        // Reverse Branch specific stock
        if (purchase.branchId) {
          const stock = await Stock.findOne({
            where: {
              organizationId,
              branchId: purchase.branchId,
              productId: item.productId
            },
            transaction
          });

          if (stock) {
            stock.qty = Math.max(0, parseFloat(stock.qty) - parseFloat(item.quantity));
            await stock.save({ transaction });
          }
        }
      }
    }

    // 3. Delete Purchase Items manually just in case cascade is not setup
    if (purchase.PurchaseItems) {
      for (const item of purchase.PurchaseItems) {
        await item.destroy({ transaction });
      }
    }
    
    // 4. Delete Supplier Transactions linked to this purchase
    await SupplierTransaction.destroy({
      where: { purchaseId, organizationId },
      transaction,
    });

    // Delete the purchase itself
    await purchase.destroy({ transaction });

    await transaction.commit();

    logActivity({
      organizationId,
      branchId: purchase.branchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Purchases',
      action: 'Deleted',
      description: `Purchase ${purchase.referenceNo || purchaseId} deleted`
    });

    return res.status(200).json({ success: true, message: "Purchase deleted successfully" });
  } catch (err) {
    await transaction.rollback();
    console.error("deletePurchase error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function createPurchaseReturn(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const purchaseId = req.params.purchaseId;
    const { items, note, discountAmount = 0, taxPercent = 0 } = req.body;

    const purchase = await Purchase.findOne({
      where: { id: purchaseId, organizationId },
      include: [{ model: PurchaseItem, as: "PurchaseItems" }],
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    const returnItems = [];
    let subtotal = 0;

    for (const it of items) {
      const purchaseItem = purchase.PurchaseItems.find(p => p.id === it.purchaseItemId);
      if (!purchaseItem) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid purchase item" });
      }

      // Calculate already returned qty
      const alreadyReturned = await PurchaseReturnItem.sum("quantityReturned", {
        where: { purchaseItemId: it.purchaseItemId },
        include: [{ model: PurchaseReturn, as: "PurchaseReturn", where: { purchaseId, organizationId } }],
        transaction
      }) || 0;

      const maxReturnable = parseFloat(purchaseItem.quantity) - alreadyReturned;
      const qty = Math.min(parseFloat(it.quantityReturned), maxReturnable);
      if (qty <= 0) continue;

      const amount = qty * parseFloat(purchaseItem.unitCost);
      subtotal += amount;
      returnItems.push({ purchaseItemId: it.purchaseItemId, quantityReturned: qty, amount });

      // Update Stock (since we are returning, stock should decrease)
      if (purchase.status === "received") {
        const product = await Product.findByPk(purchaseItem.productId, { transaction });
        if (product) {
          product.currentStock = Math.max(0, parseFloat(product.currentStock || 0) - qty);
          await product.save({ transaction });
        }

        if (purchase.branchId) {
          const stock = await Stock.findOne({
            where: { organizationId, branchId: purchase.branchId, productId: purchaseItem.productId },
            transaction
          });
          if (stock) {
            stock.qty = Math.max(0, parseFloat(stock.qty) - qty);
            await stock.save({ transaction });
          }
        }
      }
    }

    if (returnItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "No valid items to return" });
    }

    const taxAmount = subtotal * (parseFloat(taxPercent) / 100);
    const discount = parseFloat(discountAmount);
    const total = subtotal + taxAmount - discount;

    const lastReturn = await PurchaseReturn.findOne({
      where: { organizationId },
      order: [["id", "DESC"]],
      transaction
    });
    const nextReturnId = lastReturn ? lastReturn.id + 1 : 1;
    const invoiceNumber = `PO-RT-${String(nextReturnId).padStart(2, '0')}`;

    const purchaseReturn = await PurchaseReturn.create(
      {
        organizationId,
        supplierId: purchase.supplierId,
        branchId: purchase.branchId,
        purchaseId,
        note,
        subtotal,
        taxPercent,
        taxAmount,
        discountAmount: discount,
        total,
        invoiceNumber
      },
      { transaction }
    );

    for (const ri of returnItems) {
      await PurchaseReturnItem.create(
        {
          purchaseReturnId: purchaseReturn.id,
          purchaseItemId: ri.purchaseItemId,
          quantityReturned: ri.quantityReturned,
          amount: ri.amount
        },
        { transaction }
      );
    }

    await transaction.commit();

    logActivity({
      organizationId,
      branchId: purchase.branchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Purchases',
      action: 'Created',
      description: `Purchase Return ${invoiceNumber} created for PO ${purchase.referenceNo || purchase.id}`
    });

    return res.status(201).json({ success: true, data: purchaseReturn });
  } catch (err) {
    await transaction.rollback();
    console.error("createPurchaseReturn error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

async function getAllPurchaseReturns(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const { page = 1, limit = 10, branchId, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { organizationId };
    if (branchId) {
      whereClause.branchId = parseInt(branchId, 10);
    }
    if (search) {
      whereClause[Op.or] = [
        { referenceNo: { [Op.like]: `%${search}%` } },
        { '$Purchase.referenceNo$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await PurchaseReturn.findAndCountAll({
      distinct: true,
      where: whereClause,
      include: [
        { association: 'Supplier', attributes: ['id', 'name', 'phone'] },
        { association: 'Purchase', attributes: ['id', 'referenceNo', 'totalAmount'] },
        { association: 'ReturnItems' },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.status(200).json({ success: true, data: rows, total: count });
  } catch (err) {
    console.error('getAllPurchaseReturns error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function listPurchaseReturns(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const purchaseId = req.params.purchaseId;

    const returns = await PurchaseReturn.findAll({
      where: { purchaseId, organizationId },
      include: [{ model: PurchaseReturnItem, as: "ReturnItems" }],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({ success: true, data: returns });
  } catch (err) {
    console.error("listPurchaseReturns error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getPurchaseReturnById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const ret = await PurchaseReturn.findOne({
      where: { id: req.params.returnId, organizationId },
      include: [
        { model: PurchaseReturnItem, as: "ReturnItems", include: [{ model: PurchaseItem, as: "PurchaseItem" }] },
        { model: PurchaseReturnPayment, as: "Payments", include: [{ model: Bank, as: "Bank", attributes: ["id", "bankName", "accountNumber"] }] }
      ]
    });

    if (!ret) return res.status(404).json({ success: false, message: "Return not found" });
    return res.status(200).json({ success: true, data: ret });
  } catch (err) {
    console.error("getPurchaseReturnById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function addPurchaseReturnPayment(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const returnId = req.params.returnId;
    const { amount, accountId, paymentDate, paymentMethod, paymentNote, transactionId } = req.body;

    const purchaseReturn = await PurchaseReturn.findOne({
      where: { id: returnId, organizationId },
      transaction
    });

    if (!purchaseReturn) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Purchase Return not found" });
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }

    const payment = await PurchaseReturnPayment.create({
      organizationId,
      purchaseReturnId: purchaseReturn.id,
      amount: paymentAmount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || "cash",
      bankId: accountId && accountId !== "none" ? parseInt(accountId, 10) : null,
      transactionId,
      note: paymentNote
    }, { transaction });

    // Update Bank Balance (Credit cash inflow)
    if (accountId && accountId !== "none") {
      const bank = await Bank.findByPk(accountId, { transaction });
      if (!bank) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid bank account" });
      }

      await BankTransaction.create({
        organizationId,
        bankId: accountId,
        type: "credit",
        amount: paymentAmount,
        transactionType: "purchase_return",
        referenceId: purchaseReturn.id,
        description: `Refund payout from supplier (Return ID: ${purchaseReturn.id})`,
        transactionDate: paymentDate || new Date()
      }, { transaction });

      bank.balance = Number(bank.balance) + Number(paymentAmount);
      await bank.save({ transaction });
    }

    // Update PurchaseReturn paid balance & status
    const newAmountReturned = Math.round((parseFloat(purchaseReturn.amountReturned) + paymentAmount) * 100) / 100;
    const isFullyPaid = newAmountReturned >= parseFloat(purchaseReturn.total);
    purchaseReturn.amountReturned = newAmountReturned;
    purchaseReturn.status = isFullyPaid ? "paid" : "partial";
    await purchaseReturn.save({ transaction });

    // Update Supplier Ledger (Supplier owes us less now)
    if (purchaseReturn.supplierId) {
      const lastTx = await SupplierTransaction.findOne({
        where: { organizationId, supplierId: purchaseReturn.supplierId },
        order: [["id", "DESC"]],
        transaction,
      });
      const prevBalance = lastTx ? parseFloat(lastTx.balance) : 0;
      // Money received from supplier, so debit their account
      const newBalance = prevBalance + paymentAmount;

      await SupplierTransaction.create({
        organizationId,
        supplierId: purchaseReturn.supplierId,
        purchaseId: purchaseReturn.purchaseId,
        type: "purchase_return_payment",
        debit: paymentAmount,
        credit: 0,
        balance: newBalance,
        paymentMethod: paymentMethod || "cash",
        bankId: accountId && accountId !== "none" ? parseInt(accountId, 10) : null,
        referenceNo: purchaseReturn.invoiceNumber,
        note: paymentNote || `Refund payment for purchase return ${purchaseReturn.invoiceNumber}`,
        date: paymentDate || new Date(),
      }, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({ success: true, message: "Payment added successfully", data: payment });
  } catch (err) {
    await transaction.rollback();
    console.error("addPurchaseReturnPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  addPayment,
  deletePurchase,
  getPurchasePayments,
  getAllPurchaseReturns,
  createPurchaseReturn,
  listPurchaseReturns,
  getPurchaseReturnById,
  addPurchaseReturnPayment
};