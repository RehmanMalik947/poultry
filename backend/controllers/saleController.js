const { Op } = require("sequelize");
const { Sale, SaleItem, Payment, Bank, BankTransaction, Product, Service, Customer, Branch, Staff, Stock, ServiceItem, StockLog, StaffLog, StaffService, Package, SaleReturn, SaleReturnItem, SaleReturnPayment, ProductVariation } = require("../models");
const { sequelize } = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

// Helper to get organizationId from request
function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

// Helper to get branchId from header
async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (raw == null || raw === "") return null;
  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;
  const branch = await Branch.findOne({ where: { id: branchId, organizationId } });
  return branch ? branch.id : null;
}

// Recalculate and update Sale totals
async function updateSaleTotals(saleId, transaction = null) {
  const sale = await Sale.findByPk(saleId, { transaction });
  if (!sale) return;

  const items = await SaleItem.findAll({ where: { saleId }, transaction });
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  const discount = parseFloat(sale.discountAmount) || 0;
  const taxPercent = parseFloat(sale.taxPercent) || 0;

  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = taxableAmount * (taxPercent / 100);
  const total = taxableAmount + taxAmount;

  await sale.update({
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  }, { transaction });
}

/**
 * Generate a sequential invoice number for a sale or sale return.
 * Format: {BRANCH_CODE}-{NNNN}      e.g.  LHR-0001
 *         {BRANCH_CODE}-RT-{NNNN}   e.g.  LHR-RT-0001  (for returns)
 * Falls back to  first 3 letters of branch name or INV-{NNNN} / RET-{NNNN}
 */
async function generateInvoiceNumber(type, branchId, organizationId, transaction) {
  // Get branch details
  let branchCode = 'INV'; // Default
  
  if (branchId) {
    const branch = await Branch.findOne({ 
      where: { id: branchId, organizationId }, 
      transaction 
    });
    if (branch) {
      if (branch.code && branch.code.trim() !== '') {
        branchCode = branch.code.toUpperCase().trim();
      } else if (branch.name && branch.name.trim() !== '') {
        // Fallback to first 3 characters of branch name
        branchCode = branch.name.substring(0, 3).toUpperCase().trim();
      }
    }
  }
  
  // Get the last record for this branch to find the last sequence number
  let lastRecord;
  if (type === 'return') {
    lastRecord = await SaleReturn.findOne({ 
      where: { 
        organizationId, 
        branchId: branchId 
      }, 
      order: [['id', 'DESC']],
      transaction 
    });
  } else {
    lastRecord = await Sale.findOne({ 
      where: { 
        organizationId, 
        branchId: branchId 
      }, 
      order: [['id', 'DESC']],
      transaction 
    });
  }
  
  let nextSeq = 1;
  let parsedSuccessfully = false;

  if (lastRecord && lastRecord.invoiceNumber) {
    const parts = lastRecord.invoiceNumber.split('-');
    const lastSeqStr = parts[parts.length - 1];
    const lastSeqNum = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeqNum) && lastSeqNum > 0) {
      nextSeq = lastSeqNum + 1;
      parsedSuccessfully = true;
    }
  }
  
  if (!parsedSuccessfully) {
    // Fallback if no last record, or it didn't have an invoiceNumber, or parsing failed
    // Using count + 1 ensures it's sequential. We DO NOT use ID to avoid gaps.
    const count = type === 'return' 
      ? await SaleReturn.count({ where: { organizationId, branchId }, transaction })
      : await Sale.count({ where: { organizationId, branchId }, transaction });
    nextSeq = count + 1;
  }
  
  // Generate unique invoice number
  let invoiceStr = "";
  while (true) {
    const seq = String(nextSeq).padStart(4, '0');
    invoiceStr = type === 'return' ? `${branchCode}-RT-${seq}` : `${branchCode}-${seq}`;
    
    // Check if it already exists
    const existing = type === 'return'
      ? await SaleReturn.findOne({ where: { organizationId, invoiceNumber: invoiceStr }, transaction })
      : await Sale.findOne({ where: { organizationId, invoiceNumber: invoiceStr }, transaction });
      
    if (!existing) {
      break; // Found a unique number
    }
    nextSeq++; // Increment and try again
  }
  
  return invoiceStr;
}

/**
 * POST /api/pos/sale/submit
 * Create or update a sale entirely in one request (For local cart)
 */
exports.submitSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const {
      saleId, status, customerId, staffId, taxPercent, discountType, discountAmount, discountRate,
      items, paymentMethod, paymentStatus, dueDate, amountPaid, note, bankId, transactionId, totalItems,
      payments, paymentDetails, total: totalFromReq,
      referenceNo, shippingDetails, shippingCharges,
      shippingAddress, shippingStatus, deliveredTo, deliveryPerson,
      payTermNumber,
      payTermType,
      saleDate,
    } = req.body;

    let finalDueDate = dueDate;
    if (!finalDueDate && payTermNumber > 0) {
      const d = new Date(saleDate || new Date());
      if (payTermType === 'days') d.setDate(d.getDate() + parseInt(payTermNumber));
      else if (payTermType === 'months') d.setMonth(d.getMonth() + parseInt(payTermNumber));
      finalDueDate = d;
    }

    // Normalize paymentMethod to match Sale ENUM: "Cash","Card","Cheque","Multiple","other","credit"
    const normalizePaymentMethod = (method) => {
      if (!method) return null;
      const map = {
        cash: 'Cash',
        card: 'Card',
        cheque: 'Cheque',
        multiple: 'Multiple',
        other: 'other',
        credit: 'credit',
        bank_transfer: 'other'
      };
      return map[method.toLowerCase()] || method;
    };
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    let sale;
    if (saleId) {
      sale = await Sale.findOne({ where: { id: saleId, organizationId }, transaction: t });
      if (!sale) throw new Error("Sale not found");
      await SaleItem.destroy({ where: { saleId }, transaction: t });
      await sale.update({
        customerId: customerId || null,
        staffId: staffId || null,
        userId: req.user?.id || req.staff?.id || null,
        taxPercent: taxPercent || 0,
        discountType: discountType || 'fixed',
        discountAmount: discountAmount || 0,
        discountRate: discountRate || 0,
        amountPaid: amountPaid || 0,
        status: status || 'paid',
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: paymentStatus || 'paid',
        totalItems: totalItems || null,
        referenceNo: referenceNo || null,
        shippingDetails: shippingDetails || null,
        shippingCharges: shippingCharges || 0,
        additionalNotes: note || null,
        shippingAddress: shippingAddress || null,
        shippingStatus: shippingStatus || 'pending',
        deliveredTo: deliveredTo || null,
        deliveryPerson: deliveryPerson || null,
        payTermNumber: payTermNumber || 0,
        payTermType: payTermType || 'days',
        dueDate: finalDueDate || null,
        createdAt: saleDate || undefined,
      }, { transaction: t });
    } else {
      // Generate invoice number for new sale
      const invoiceNumber = await generateInvoiceNumber('sale', branchId, organizationId, t);

      sale = await Sale.create({
        organizationId,
        branchId,
        invoiceNumber,
        customerId: customerId || null,
        staffId: staffId || null,
        userId: req.user?.id || req.staff?.id || null,
        taxPercent: taxPercent || 0,
        discountType: discountType || 'fixed',
        discountAmount: discountAmount || 0,
        discountRate: discountRate || 0,
        amountPaid: amountPaid || 0,
        status: status || 'paid',
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: paymentStatus || 'paid',
        totalItems: totalItems || null,
        referenceNo: referenceNo || null,
        shippingDetails: shippingDetails || null,
        shippingCharges: shippingCharges || 0,
        additionalNotes: note || null,
        shippingAddress: shippingAddress || null,
        shippingStatus: shippingStatus || 'pending',
        deliveredTo: deliveredTo || null,
        deliveryPerson: deliveryPerson || null,
        payTermNumber: payTermNumber || 0,
        payTermType: payTermType || 'days',
        dueDate: finalDueDate || null,
        createdAt: saleDate || new Date(),
      }, { transaction: t });
    }

    let subtotal = 0;
    if (items && items.length > 0) {
      const saleItemsData = items.map(i => {
        subtotal += parseFloat(i.price) * i.quantity;
        return {
          saleId: sale.id,
          itemId: i.itemId,
          itemType: i.itemType,
          itemName: i.itemName,
          price: i.price,
          quantity: i.quantity,
          variationId: i.variationId || null,
        };
      });
      await SaleItem.bulkCreate(saleItemsData, { transaction: t });

      // Commission Logic (StaffLog)
      const staffLogsData = [];
      for (const item of items) {
        const itemStaffId = item.staffId || staffId;
        if (itemStaffId) {
          let commType = 'percentage';
          let commValue = 0;
          let amountEarned = 0;
          let rateLabel = '0%';

          if (item.itemType === 'service' || item.itemType === 'package') {
            if (item.itemType === 'service' && StaffService) {
              const specificRate = await StaffService.findOne({
                where: { staffId: itemStaffId, serviceId: item.itemId },
                transaction: t
              });
              
              if (specificRate && specificRate.commissionValue != null) {
                commType = specificRate.commissionType || 'percentage';
                commValue = parseFloat(specificRate.commissionValue);
              } else {
                // Fallback to global staff commission
                const staffMember = await Staff.findByPk(itemStaffId, { transaction: t });
                if (staffMember) {
                  commType = staffMember.commissionType || 'percentage';
                  commValue = parseFloat(staffMember.commissionValue) || 0;
                }
              }
            } else {
              // Fallback to Staff global directly (e.g. for package)
              const staffMember = await Staff.findByPk(itemStaffId, { transaction: t });
              if (staffMember) {
                commType = staffMember.commissionType || 'percentage';
                commValue = parseFloat(staffMember.commissionValue) || 0;
              }
            }

            if (commValue > 0) {
              const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
              amountEarned = commType === 'percentage' 
                ? (itemTotal * (commValue / 100)) 
                : (commValue * parseInt(item.quantity));
            }
            rateLabel = commType === 'percentage' ? `${commValue}%` : `${commValue} Fixed`;
          } else {
            // Product or other item types: 0% commission
            rateLabel = '0% (No comm.)';
            amountEarned = 0;
          }

          staffLogsData.push({
            organizationId,
            branchId,
            staffId: itemStaffId,
            saleId: sale.id,
            actionType: 'Commission',
            itemName: item.itemName,
            price: item.price,
            commissionRate: rateLabel,
            amountEarned: amountEarned
          });
        }
      }

      if (staffLogsData.length > 0 && StaffLog) {
        await StaffLog.bulkCreate(staffLogsData, { transaction: t });
      }
    }

    const discount = parseFloat(sale.discountAmount) || 0;
    const taxP = parseFloat(sale.taxPercent) || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = taxableAmount * (taxP / 100);

    // Use the total from request if provided, otherwise use calculated
    const finalTotal = (totalFromReq !== undefined && totalFromReq !== null)
      ? parseFloat(totalFromReq)
      : (taxableAmount + taxAmount);

    await sale.update({
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      amountPaid: (amountPaid !== undefined && amountPaid !== null)
        ? (parseFloat(amountPaid) || 0)
        : (status === 'paid' ? Math.round(finalTotal * 100) / 100 : 0)
    }, { transaction: t });

    if ((status === 'paid' || status === 'credit' || status === 'partial') && ((payments && payments.length > 0) || amountPaid > 0)) {
      const paymentList = payments || [
        {
          amount: amountPaid,
          paymentMethod: paymentMethod || 'cash',
          bankId: bankId || null,
          transactionId: transactionId || null,
          note: note || null,
          paymentDetails: paymentDetails || null
        }
      ];

      for (const p of paymentList) {
        const pd = p.paymentDetails || {};
        console.log(`[DEBUG] Creating payment record: ${p.paymentMethod} - Rs.${p.amount}`, pd);
        
        // Map Bank Transfer fields if method is bank_transfer
        const bankId = p.bankId || pd.bankAccountId || null;
        const transactionId = p.transactionId || pd.transferReferenceNo || null;
        const bankAccountNumber = pd.bankAccountNumber || null;
        const transferDate = pd.transferDate || null;

        await Payment.create({
          saleId: sale.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          bankId: bankId,
          transactionId: transactionId,
          note: p.note,
          // Card fields
          cardHolder: pd.cardHolder || null,
          cardType: pd.cardType || null,
          cardNumberLast4: pd.cardNumber || null,
          cardMonth: pd.cardMonth || null,
          cardYear: pd.cardYear || null,
          // Cheque fields
          chequeNo: pd.chequeNo || null,
          chequeBank: pd.chequeBankName || null,
          chequeDate: pd.chequeDate || null,
          accountHolder: pd.chequeAccountName || null,
          // Bank Transfer fields
          bankAccountNumber,
          transferDate
        }, { transaction: t });

        // Update Bank Balance if bankId is provided
        if (bankId && p.amount > 0) {
          const bank = await Bank.findByPk(bankId, { transaction: t });
          if (bank) {
            const oldBalance = parseFloat(bank.balance) || 0;
            const newBalance = oldBalance + parseFloat(p.amount);
            await bank.update({ balance: newBalance }, { transaction: t });
            
            // Create Bank Transaction Log (Audit Trail)
            await BankTransaction.create({
              organizationId,
              bankId: bank.id,
              type: 'credit',
              amount: p.amount,
              transactionType: 'sale',
              referenceId: sale.id,
              description: `Sale payment via ${p.paymentMethod} (Sale ID: ${sale.id})`,
              transactionDate: new Date()
            }, { transaction: t });
          }
        }
      }

      // Deduct stock for paid sales
      if (status === 'paid') {
        for (const item of items) {
          if (item.itemType === "product") {
            if (item.variationId) {
              const variation = await ProductVariation.findByPk(item.variationId, { transaction: t });
              if (variation) {
                await variation.update({
                  currentStock: Math.max(0, parseFloat(variation.currentStock) - item.quantity)
                }, { transaction: t });
              }
            }
            const product = await Product.findByPk(item.itemId, { transaction: t });
            if (product && product.manageStock) {
              await product.update({
                currentStock: Math.max(0, parseFloat(product.currentStock) - item.quantity)
              }, { transaction: t });

              // Sync Stock table for product
              const stockItem = await Stock.findOne({
                where: {
                  organizationId,
                  productId: product.id,
                  branchId: branchId || null
                },
                transaction: t
              });
              if (stockItem) {
                const oldQty = parseFloat(stockItem.qty);
                const newQty = Math.max(0, oldQty - item.quantity);
                await stockItem.update({ qty: newQty }, { transaction: t });

                await StockLog.create({
                  organizationId,
                  branchId: branchId || null,
                  productId: product.id,
                  userId: req.user?.id || req.staff?.id || null,
                  movementType: 'SALE',
                  qtyChange: -item.quantity,
                  previousQty: oldQty,
                  newQty: newQty,
                  notes: `Sold in POS (Sale ID: ${sale.id})`
                }, { transaction: t });
              } else if (branchId) {
                await Stock.create({
                  organizationId,
                  productId: product.id,
                  branchId,
                  qty: -item.quantity,
                  alertQty: 0
                }, { transaction: t });

                await StockLog.create({
                  organizationId,
                  branchId,
                  productId: product.id,
                  userId: req.user?.id || req.staff?.id || null,
                  movementType: 'SALE',
                  qtyChange: -item.quantity,
                  previousQty: 0,
                  newQty: 0,
                  notes: `Sold in POS (Sale ID: ${sale.id})`
                }, { transaction: t });
              }
            }
          } else if (item.itemType === "service") {
            const recipes = await ServiceItem.findAll({ where: { serviceId: item.itemId }, transaction: t });
            for (const recipe of recipes) {
              const stockItem = await Stock.findOne({
                where: {
                  organizationId,
                  productId: recipe.productId,
                  branchId: branchId || null
                },
                transaction: t
              });
              if (stockItem) {
                const oldQty = parseFloat(stockItem.qty);
                const deductedQty = parseFloat(recipe.quantity) * item.quantity;
                const newQty = Math.max(0, oldQty - deductedQty);
                await stockItem.update({ qty: newQty }, { transaction: t });

                await StockLog.create({
                  organizationId,
                  branchId: branchId || null,
                  productId: recipe.productId,
                  userId: req.user?.id || req.staff?.id || null,
                  movementType: 'SALE',
                  qtyChange: -deductedQty,
                  previousQty: oldQty,
                  newQty: newQty,
                  notes: `Sold in POS via Service (Sale ID: ${sale.id})`
                }, { transaction: t });
              }
            }
          } else if (item.itemType === "package") {
            const pkg = await Package.findByPk(item.itemId, { transaction: t });
            if (pkg && pkg.services) {
              const servicesList = Array.isArray(pkg.services) ? pkg.services : JSON.parse(pkg.services || "[]");
              for (const svcItem of servicesList) {
                const recipes = await ServiceItem.findAll({ where: { serviceId: svcItem.serviceId }, transaction: t });
                for (const recipe of recipes) {
                  const stockItem = await Stock.findOne({
                    where: {
                      organizationId,
                      productId: recipe.productId,
                      branchId: branchId || null
                    },
                    transaction: t
                  });
                  if (stockItem) {
                    const oldQty = parseFloat(stockItem.qty);
                    const deductedQty = parseFloat(recipe.quantity) * (parseInt(svcItem.quantity) || 1) * item.quantity;
                    const newQty = Math.max(0, oldQty - deductedQty);
                    await stockItem.update({ qty: newQty }, { transaction: t });

                    await StockLog.create({
                      organizationId,
                      branchId: branchId || null,
                      productId: recipe.productId,
                      userId: req.user?.id || req.staff?.id || null,
                      movementType: 'SALE',
                      qtyChange: -deductedQty,
                      previousQty: oldQty,
                      newQty: newQty,
                      notes: `Sold in POS via Package (Sale ID: ${sale.id})`
                    }, { transaction: t });
                  }
                }
              }
            }
          }
        }
      }
    }

    await t.commit();
    
    // Log the activity
    logActivity({
      organizationId,
      branchId,
      userId: req.user?.id || req.staff?.id || null,
      module: 'Sales',
      action: saleId ? 'Updated' : 'Created',
      description: `Sale ${sale.invoiceNumber} was ${saleId ? 'updated' : 'created'} for total ${sale.total}`
    });

    return res.json({ success: true, data: sale });
  } catch (error) {
    await t.rollback();
    // Enhanced error logging for debugging
    console.error('[submitSale] Error:', error.name, error.message);
    
    let detailedMessage = error.message;
    if (error.errors && error.errors.length > 0) {
      detailedMessage = error.errors.map(e => `${e.path} (${e.value}): ${e.message}`).join(', ');
    } else if (error.parent) {
      detailedMessage = error.parent.message;
    }
    
    return res.status(500).json({ success: false, message: detailedMessage, rawError: error.name });
  }
};



/**
 * POST /api/pos/sale/:saleId/item
 * Add item to sale
 */
exports.addItemToSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const { saleId } = req.params;
    const { itemId, itemType, quantity } = req.body;

    const sale = await Sale.findOne({ where: { id: saleId, organizationId }, transaction: t });
    if (!sale) throw new Error("Sale not found");

    let price = 0;
    let itemName = "";

    if (itemType === "service") {
      const service = await Service.findOne({ where: { id: itemId, organizationId }, transaction: t });
      if (!service) throw new Error("Service not found");
      price = parseFloat(service.price) || 0;
      itemName = service.serviceName;
    } else if (itemType === "package") {
      const pkg = await Package.findOne({ where: { id: itemId, organizationId }, transaction: t });
      if (!pkg) throw new Error("Package not found");
      price = parseFloat(pkg.price) || 0;
      itemName = pkg.packageName;
    } else {
      const product = await Product.findOne({ where: { id: itemId, organizationId }, transaction: t });
      if (!product) throw new Error("Product not found");
      price = parseFloat(product.sellingPriceInc || product.sellingPriceExc) || 0;
      itemName = product.name;
    }

    let saleItem = await SaleItem.findOne({
      where: { saleId, itemId, itemType },
      transaction: t
    });

    if (saleItem) {
      await saleItem.update({
        quantity: saleItem.quantity + (quantity || 1)
      }, { transaction: t });
    } else {
      saleItem = await SaleItem.create({
        saleId,
        itemId,
        itemType: itemType || "product",
        itemName,
        price,
        quantity: quantity || 1,

      }, { transaction: t });
    }

    await updateSaleTotals(saleId, t);
    await t.commit();

    const updatedSale = await Sale.findByPk(saleId, {
      include: [{ model: SaleItem, as: "SaleItems" }]
    });

    return res.json({ success: true, data: updatedSale });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/pos/sale/:saleId/item/:itemId
 * Remove item from sale
 */
exports.removeItemFromSale = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const { saleId, itemId } = req.params;

    const saleItem = await SaleItem.findOne({
      where: { id: itemId, saleId },
      include: [{ model: Sale, where: { organizationId } }]
    });

    if (!saleItem) return res.status(404).json({ success: false, message: "Item not found" });

    await saleItem.destroy();
    await updateSaleTotals(saleId);

    const updatedSale = await Sale.findByPk(saleId, {
      include: [{ model: SaleItem, as: "SaleItems" }]
    });

    return res.json({ success: true, data: updatedSale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/sale/:saleId/pay
 * Process payment
 */
exports.processPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const { saleId } = req.params;
    const {
      amount, paymentMethod, bankId, transactionId, note,
      cardHolder, cardType, cardNumberLast4, cardMonth, cardYear,
      chequeNo, chequeBank, chequeDate, accountHolder
    } = req.body;

    const sale = await Sale.findOne({
      where: { id: saleId, organizationId },
      include: [{ model: SaleItem, as: "SaleItems" }],
      transaction: t
    });
    if (!sale) throw new Error("Sale not found");

    const pd = req.body.paymentDetails || {};
    const bankIdToUse = bankId || pd.bankAccountId;
    const transactionIdToUse = transactionId || pd.transferReferenceNo;

    const payment = await Payment.create({
      saleId,
      amount,
      paymentMethod,
      bankId: bankIdToUse,
      transactionId: transactionIdToUse,
      note,
      cardHolder,
      cardType,
      cardNumberLast4,
      cardMonth,
      cardYear,
      chequeNo,
      chequeBank,
      chequeDate,
      accountHolder,
      bankAccountNumber: pd.bankAccountNumber || null,
      transferDate: pd.transferDate || null
    }, { transaction: t });

    // Update Bank Balance if bankId is provided
    if (bankIdToUse && amount > 0) {
      const bank = await Bank.findByPk(bankIdToUse, { transaction: t });
      if (bank) {
        const oldBalance = parseFloat(bank.balance) || 0;
        const newBalance = oldBalance + parseFloat(amount);
        await bank.update({ balance: newBalance }, { transaction: t });

        // Create Bank Transaction Log (Audit Trail)
        await BankTransaction.create({
          organizationId,
          bankId: bank.id,
          type: 'credit',
          amount: amount,
          transactionType: 'sale',
          referenceId: sale.id,
          description: `Direct payment via ${paymentMethod} (Sale ID: ${sale.id})`,
          transactionDate: new Date()
        }, { transaction: t });
      }
    }

    // Update status
    // FIX: Payment.sum() alone is wrong — partial/credit sales store amountPaid directly
    // on the Sale row without creating Payment table rows. We must add to existing amountPaid.
    const previouslyPaid = parseFloat(sale.amountPaid) || 0;
    const newPaymentAmount = parseFloat(amount) || 0;
    const newAmountPaid = Math.round((previouslyPaid + newPaymentAmount) * 100) / 100;
    const saleTotal = parseFloat(sale.total) || 0;

    const newStatus = newAmountPaid >= saleTotal ? "paid" : "partial";
    const newPaymentStatus = newAmountPaid >= saleTotal ? "paid" : "due";
    const newRemainingBalance = Math.max(0, Math.round((saleTotal - newAmountPaid) * 100) / 100);

    await sale.update({
      status: newStatus,
      paymentStatus: newPaymentStatus,
      paymentMethod: paymentMethod, // update to last used method
      amountPaid: newAmountPaid,
      remainingBalance: newRemainingBalance
    }, { transaction: t });

    // If fully paid, deduct stock/inventory
    if (newStatus === "paid") {
      for (const item of sale.SaleItems) {
        if (item.itemType === "product") {
          if (item.variationId) {
            const variation = await ProductVariation.findByPk(item.variationId, { transaction: t });
            if (variation) {
              await variation.update({
                currentStock: Math.max(0, parseFloat(variation.currentStock) - item.quantity)
              }, { transaction: t });
            }
          }
          const product = await Product.findByPk(item.itemId, { transaction: t });
          if (product && product.manageStock) {
            await product.update({
              currentStock: Math.max(0, parseFloat(product.currentStock) - item.quantity)
            }, { transaction: t });

            const stockItem = await Stock.findOne({
              where: {
                organizationId,
                productId: product.id,
                branchId: sale.branchId || null
              },
              transaction: t
            });

            if (stockItem) {
              const oldQty = parseFloat(stockItem.qty);
              const newQty = Math.max(0, oldQty - item.quantity);
              await stockItem.update({ qty: newQty }, { transaction: t });

              await StockLog.create({
                organizationId,
                branchId: sale.branchId || null,
                productId: product.id,
                userId: req.user?.id || req.staff?.id || null,
                movementType: 'SALE',
                qtyChange: -item.quantity,
                previousQty: oldQty,
                newQty: newQty,
                notes: `Sold in POS via Payment (Sale ID: ${sale.id})`
              }, { transaction: t });
            }
          }
        } else if (item.itemType === "service") {
          // Deduct from recipes
          const recipes = await ServiceItem.findAll({ where: { serviceId: item.itemId }, transaction: t });
          for (const recipe of recipes) {
            const stockItem = await Stock.findOne({
              where: {
                organizationId,
                productId: recipe.productId,
                branchId: sale.branchId || null
              },
              transaction: t
            });
            if (stockItem) {
              const oldQty = parseFloat(stockItem.qty);
              const deductedQty = parseFloat(recipe.quantity) * item.quantity;
              const newQty = Math.max(0, oldQty - deductedQty);
              await stockItem.update({ qty: newQty }, { transaction: t });
              await StockLog.create({
                organizationId,
                branchId: sale.branchId || null,
                productId: recipe.productId,
                userId: req.user?.id || req.staff?.id || null,
                movementType: 'SALE',
                qtyChange: -deductedQty,
                previousQty: oldQty,
                newQty: newQty,
                notes: `Sold in POS via Service Payment (Sale ID: ${sale.id})`
              }, { transaction: t });
            }
          }
        } else if (item.itemType === "package") {
          const pkg = await Package.findByPk(item.itemId, { transaction: t });
          if (pkg && pkg.services) {
            const servicesList = Array.isArray(pkg.services) ? pkg.services : JSON.parse(pkg.services || "[]");
            for (const svcItem of servicesList) {
              const recipes = await ServiceItem.findAll({ where: { serviceId: svcItem.serviceId }, transaction: t });
              for (const recipe of recipes) {
                const stockItem = await Stock.findOne({
                  where: {
                    organizationId,
                    productId: recipe.productId,
                    branchId: sale.branchId || null
                  },
                  transaction: t
                });
                if (stockItem) {
                  const oldQty = parseFloat(stockItem.qty);
                  const deductedQty = parseFloat(recipe.quantity) * (parseInt(svcItem.quantity) || 1) * item.quantity;
                  const newQty = Math.max(0, oldQty - deductedQty);
                  await stockItem.update({ qty: newQty }, { transaction: t });
                  await StockLog.create({
                    organizationId,
                    branchId: sale.branchId || null,
                    productId: recipe.productId,
                    userId: req.user?.id || req.staff?.id || null,
                    movementType: 'SALE',
                    qtyChange: -deductedQty,
                    previousQty: oldQty,
                    newQty: newQty,
                    notes: `Sold in POS via Package Payment (Sale ID: ${sale.id})`
                  }, { transaction: t });
                }
              }
            }
          }
        }
      }
    }

    await t.commit();

    // Return the freshly fetched sale so the frontend gets updated amountPaid, remainingBalance, status
    const updatedSale = await Sale.findByPk(saleId, {
      include: [
        { model: SaleItem, as: "SaleItems" },
        { model: Payment, as: "Payments" },
        { model: Customer, as: "Customer" }
      ]
    });
    return res.json({ success: true, data: updatedSale, payment });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/pos/sale/:saleId
 */
exports.getCurrentSale = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const sale = await Sale.findOne({
      where: { id: req.params.saleId, organizationId },
      include: [
        { model: SaleItem, as: "SaleItems" },
        { model: Payment, as: "Payments" },
        { model: Customer, as: "Customer" },
        { 
          model: SaleReturn, 
          as: "SaleReturns",
          include: [{ model: SaleReturnItem, as: "SaleReturnItems" }]
        }
      ]
    });
    return res.json({ success: true, data: sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/pos/sale/:saleId
 */
exports.updateSale = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const sale = await Sale.findOne({ where: { id: req.params.saleId, organizationId } });
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });

    await sale.update(req.body);
    await updateSaleTotals(sale.id);

    const updatedSale = await Sale.findByPk(sale.id, {
      include: [{ model: SaleItem, as: "SaleItems" }]
    });

    return res.json({ success: true, data: updatedSale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/pos/sales
 */
exports.getSalesList = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    const whereClause = { organizationId };
    if (branchId) whereClause.branchId = branchId;

    if (search) {
      whereClause[Op.or] = [
        { referenceNo: { [Op.like]: `%${search}%` } },
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { '$Customer.name$': { [Op.like]: `%${search}%` } },
      ];
    }

    if (req.query.status && req.query.status !== "all") {
      if (req.query.status === 'unpaid') {
        whereClause.status = { [Op.in]: ['unpaid', 'credit'] };
      } else {
        whereClause.status = req.query.status;
      }
    }

    const { User, Customer, Staff, SaleItem, SaleReturn } = require("../models");
    const { rows, count } = await Sale.findAndCountAll({
      distinct: true,
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        { model: Customer, as: "Customer" },
        { model: Staff, as: "Staff" },
        { model: User, as: "User", attributes: ["id", "name"] },
        { model: SaleItem, as: "SaleItems" },
        { model: SaleReturn, as: "SaleReturns", attributes: ["id", "total"] },
        { model: require("../models").Payment, as: "Payments" }
      ]
    });

    return res.json({
      success: true,
      data: {
        sales: rows,
        total: count,
        page,
        limit,
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/pos/sale/:saleId
 */
/**
 * DELETE /api/pos/sale/:saleId
 */
exports.deleteSale = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    
    // 👇 Use the same pattern as expense controller — destructure the id
    const saleId = Number(req.params.saleId);  // or req.params.id depending on your route

    const sale = await Sale.findOne({ 
      where: { id: saleId, organizationId } 
    });
    
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    // Optional: Reverse bank transactions if any payments were made via bank
    const payments = await Payment.findAll({ where: { saleId: sale.id } });
    for (const payment of payments) {
      if (payment.bankId && parseFloat(payment.amount) > 0) {
        const bank = await Bank.findByPk(payment.bankId);
        if (bank) {
          bank.balance = Number(bank.balance) - Number(payment.amount);
          await bank.save();
        }
        await BankTransaction.destroy({
          where: { bankId: payment.bankId, transactionType: "sale", referenceId: sale.id }
        });
      }
    }

    // Clean up related records
    await SaleItem.destroy({ where: { saleId: sale.id } });
    await Payment.destroy({ where: { saleId: sale.id } });
    await StaffLog.destroy({ where: { saleId: sale.id } });
    
    await sale.destroy();

    // 👇 Log activity — same pattern as expense controller
    logActivity({
      organizationId,
      branchId: branchId || sale.branchId || null,
      userId: req.user?.id || req.staff?.id || null,
      module: 'Sales',
      action: 'Deleted',
      description: `Sale ${sale.invoiceNumber} was deleted`
    });

    return res.json({ success: true, message: "Sale deleted" });
  } catch (error) {
    console.error('[deleteSale] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/pos/customers
 */
exports.getCustomers = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const customers = await Customer.findAll({ where: { organizationId } });
    return res.json({ success: true, data: customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/pos/banks
 */
exports.getBanks = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const banks = await Bank.findAll({
      where: {
        organizationId,
        status: { [Op.in]: ["Active", "active"] }
      }
    });
    return res.json({ success: true, data: banks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/returns
 * Create a new Sale Return
 */
exports.createSaleReturn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { saleId, items, note, returnDate } = req.body;

    // 1. Fetch original Sale
    const sale = await Sale.findOne({
      where: { id: saleId, organizationId },
      include: [{ model: SaleItem, as: "SaleItems" }],
      transaction: t
    });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Original sale not found" });
    }

    // 2. Validate items and calculate return totals
    let returnSubtotal = 0;
    const validatedItems = [];

    for (const returnItem of items) {
      const originalItem = sale.SaleItems.find(si => si.id === returnItem.saleItemId);
      if (!originalItem) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Item ID ${returnItem.saleItemId} does not belong to this sale` });
      }

      const qtyReturned = parseFloat(returnItem.quantityReturned);
      const qtySold = parseFloat(originalItem.quantity);

      // Check return quantity limits
      if (qtyReturned <= 0) continue;
      if (qtyReturned > qtySold) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Return quantity (${qtyReturned}) for ${originalItem.itemName} cannot exceed sold quantity (${qtySold})` 
        });
      }

      // Check if there are already returned items for this sale item
      const alreadyReturnedRows = await SaleReturnItem.findAll({
        where: { saleItemId: originalItem.id },
        include: [{ model: SaleReturn, where: { organizationId } }],
        transaction: t
      });
      const totalAlreadyReturned = alreadyReturnedRows.reduce((sum, r) => sum + parseFloat(r.quantityReturned), 0);
      if (totalAlreadyReturned + qtyReturned > qtySold) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Total returned quantity (${totalAlreadyReturned + qtyReturned}) for ${originalItem.itemName} cannot exceed sold quantity (${qtySold})`
        });
      }

      const itemPrice = parseFloat(originalItem.price);
      returnSubtotal += itemPrice * qtyReturned;

      validatedItems.push({
        saleItemId: originalItem.id,
        itemId: originalItem.itemId,
        itemType: originalItem.itemType,
        itemName: originalItem.itemName,
        price: itemPrice,
        quantityReturned: qtyReturned
      });
    }

    if (validatedItems.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "No items to return" });
    }

    // 3. Proportional Tax & Discount Calculations
    const originalSubtotal = parseFloat(sale.subtotal) || 0;
    const taxPercent = parseFloat(sale.taxPercent) || 0;

    // Check for existing SaleReturn
    let saleReturn = await SaleReturn.findOne({
      where: { saleId: sale.id, organizationId },
      transaction: t
    });

    let returnTotal = 0;
    let oldTotal = 0;

    if (saleReturn) {
      // Merge with existing return
      oldTotal = parseFloat(saleReturn.total) || 0;
      const oldSubtotal = parseFloat(saleReturn.subtotal) || 0;
      const newSubtotal = oldSubtotal + returnSubtotal;

      const taxAmount = Math.round((newSubtotal * (taxPercent / 100)) * 100) / 100;
      let discountAmount = 0;
      if (originalSubtotal > 0) {
        const originalDiscount = parseFloat(sale.discountAmount) || 0;
        discountAmount = Math.round((originalDiscount * (newSubtotal / originalSubtotal)) * 100) / 100;
      }

      const newTotal = Math.round((newSubtotal + taxAmount - discountAmount) * 100) / 100;
      returnTotal = newTotal;

      const amountReturned = parseFloat(saleReturn.amountReturned) || 0;
      let newStatus = "due";
      if (amountReturned >= newTotal) {
        newStatus = "paid";
      } else if (amountReturned > 0) {
        newStatus = "partial";
      }

      await saleReturn.update({
        subtotal: newSubtotal,
        taxAmount,
        discountAmount,
        total: newTotal,
        status: newStatus,
        note: note ? (saleReturn.note ? `${saleReturn.note}\n${note}` : note) : saleReturn.note
      }, { transaction: t });

    } else {
      // Create new return
      const taxAmount = Math.round((returnSubtotal * (taxPercent / 100)) * 100) / 100;
      let discountAmount = 0;
      if (originalSubtotal > 0) {
        const originalDiscount = parseFloat(sale.discountAmount) || 0;
        discountAmount = Math.round((originalDiscount * (returnSubtotal / originalSubtotal)) * 100) / 100;
      }

      const newTotal = Math.round((returnSubtotal + taxAmount - discountAmount) * 100) / 100;
      returnTotal = newTotal;

      // Generate return invoice number
      const returnBranchId = branchId || sale.branchId;
      const returnInvoiceNumber = await generateInvoiceNumber('return', returnBranchId, organizationId, t);

      saleReturn = await SaleReturn.create({
        organizationId,
        branchId: returnBranchId,
        saleId: sale.id,
        customerId: sale.customerId,
        returnDate: returnDate || new Date(),
        invoiceNumber: returnInvoiceNumber,
        subtotal: returnSubtotal,
        taxPercent,
        taxAmount,
        discountAmount,
        total: newTotal,
        amountReturned: 0,
        status: "due",
        note
      }, { transaction: t });
    }

    // 4. Create or Update SaleReturnItems and Update Inventory
    for (const vItem of validatedItems) {
      let existingReturnItem = await SaleReturnItem.findOne({
        where: { saleReturnId: saleReturn.id, saleItemId: vItem.saleItemId },
        transaction: t
      });

      if (existingReturnItem) {
        const newQty = parseFloat(existingReturnItem.quantityReturned) + vItem.quantityReturned;
        await existingReturnItem.update({
          quantityReturned: newQty
        }, { transaction: t });
      } else {
        await SaleReturnItem.create({
          saleReturnId: saleReturn.id,
          saleItemId: vItem.saleItemId,
          itemId: vItem.itemId,
          itemType: vItem.itemType,
          itemName: vItem.itemName,
          price: vItem.price,
          quantityReturned: vItem.quantityReturned
        }, { transaction: t });
      }

      // If product, restore stock
      if (vItem.itemType === "product") {
        if (originalItem.variationId) {
          const variation = await ProductVariation.findByPk(originalItem.variationId, { transaction: t });
          if (variation) {
            await variation.update({
              currentStock: parseFloat(variation.currentStock) + vItem.quantityReturned
            }, { transaction: t });
          }
        }
        const stockItem = await Stock.findOne({
          where: {
            organizationId,
            productId: vItem.itemId,
            branchId: saleReturn.branchId || null
          },
          transaction: t
        });

        if (stockItem) {
          const oldQty = parseFloat(stockItem.qty) || 0;
          const newQty = oldQty + vItem.quantityReturned;
          await stockItem.update({ qty: newQty }, { transaction: t });

          // Create stock movement log
          await StockLog.create({
            organizationId,
            branchId: saleReturn.branchId,
            productId: vItem.itemId,
            userId: req.user?.id || req.staff?.id || null,
            movementType: "SALE_RETURN",
            qtyChange: vItem.quantityReturned,
            previousQty: oldQty,
            newQty: newQty,
            unitCost: vItem.price,
            referenceId: saleReturn.id,
            notes: `Returned from Sale ID: ${sale.id}`
          }, { transaction: t });
        }
      }
    }

    // 5. Update Customer Return Due Balance (only by the incremental change)
    const totalDifference = returnTotal - oldTotal;
    if (sale.customerId && totalDifference > 0) {
      const customer = await Customer.findByPk(sale.customerId, { transaction: t });
      if (customer) {
        const oldReturnDue = parseFloat(customer.totalSellReturnDue) || 0;
        await customer.update({
          totalSellReturnDue: oldReturnDue + totalDifference
        }, { transaction: t });
      }
    }

    await t.commit();
    return res.json({ success: true, message: "Sale return processed successfully", data: saleReturn });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/pos/returns
 * List all Sale Returns
 */
exports.listSaleReturns = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { page = 1, limit = 10, search } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = { organizationId };
    if (branchId) whereClause.branchId = branchId;

    if (search) {
      whereClause[Op.or] = [
        { referenceNo: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await SaleReturn.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
      include: [
        { model: Customer, as: "Customer", attributes: ["id", "name", "mobile"] },
        { model: Sale, attributes: ["id", "invoiceNumber", "total", "created_at"] }
      ]
    });

    return res.json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/pos/returns/:id
 * Get detailed return view
 */
exports.getSaleReturnById = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;

    const saleReturn = await SaleReturn.findOne({
      where: { id, organizationId },
      include: [
        { model: Customer, as: "Customer" },
        { model: SaleReturnItem, as: "SaleReturnItems" },
        { model: SaleReturnPayment, as: "SaleReturnPayments", include: [{ model: Bank, as: "Bank", attributes: ["id", "bankName", "accountNumber"] }] }
      ]
    });

    if (!saleReturn) {
      return res.status(404).json({ success: false, message: "Sale return record not found" });
    }

    return res.json({ success: true, data: saleReturn });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/returns/:id/pay
 * Add refund payment
 */
exports.addSaleReturnPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;
    const { amount, paymentMethod, bankId, transactionId, note } = req.body;

    const saleReturn = await SaleReturn.findOne({
      where: { id, organizationId },
      transaction: t
    });

    if (!saleReturn) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Sale return record not found" });
    }

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }

    const outstanding = parseFloat(saleReturn.total) - parseFloat(saleReturn.amountReturned);
    if (payAmount > outstanding) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Payment amount exceeds outstanding refund balance of ${outstanding}` });
    }

    // 1. Create SaleReturnPayment row
    const payment = await SaleReturnPayment.create({
      saleReturnId: saleReturn.id,
      amount: payAmount,
      paymentMethod,
      bankId: bankId || null,
      transactionId: transactionId || null,
      note
    }, { transaction: t });

    // 2. Update Bank Balance (Debit cash outflow)
    if (bankId && payAmount > 0) {
      const bank = await Bank.findOne({
        where: { id: bankId, organizationId },
        transaction: t
      });
      if (bank) {
        const oldBalance = parseFloat(bank.balance) || 0;
        const newBalance = oldBalance - payAmount; // refund deductions
        await bank.update({ balance: newBalance }, { transaction: t });

        // Record Bank transaction audit
        await BankTransaction.create({
          organizationId,
          bankId: bank.id,
          type: "debit",
          amount: payAmount,
          transactionType: "sale_return",
          referenceId: saleReturn.id,
          description: `Refund payout via ${paymentMethod} (Return ID: ${saleReturn.id})`,
          transactionDate: new Date()
        }, { transaction: t });
      }
    }

    // 3. Update SaleReturn paid balance & status
    const newAmountReturned = Math.round((parseFloat(saleReturn.amountReturned) + payAmount) * 100) / 100;
    const isFullyPaid = newAmountReturned >= parseFloat(saleReturn.total);
    const newStatus = isFullyPaid ? "paid" : "partial";

    await saleReturn.update({
      amountReturned: newAmountReturned,
      status: newStatus
    }, { transaction: t });

    // 4. Update Customer Ledger
    if (saleReturn.customerId) {
      const customer = await Customer.findByPk(saleReturn.customerId, { transaction: t });
      if (customer) {
        const oldReturnDue = parseFloat(customer.totalSellReturnDue) || 0;
        const newReturnDue = Math.max(0, oldReturnDue - payAmount);
        await customer.update({ totalSellReturnDue: newReturnDue }, { transaction: t });
      }
    }

    await t.commit();
    return res.json({ success: true, message: "Payment added successfully", data: payment });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/pos/returns/:id
 * Delete sale return (Revert everything)
 */
exports.deleteSaleReturn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params;

    const saleReturn = await SaleReturn.findOne({
      where: { id, organizationId },
      include: [
        { model: SaleReturnItem, as: "SaleReturnItems" },
        { model: SaleReturnPayment, as: "SaleReturnPayments" }
      ],
      transaction: t
    });

    if (!saleReturn) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Sale return not found" });
    }

    // 1. Revert Inventory Restorations
    for (const item of saleReturn.SaleReturnItems) {
      if (item.itemType === "product") {
        const saleItem = await SaleItem.findByPk(item.saleItemId, { transaction: t });
        if (saleItem && saleItem.variationId) {
          const variation = await ProductVariation.findByPk(saleItem.variationId, { transaction: t });
          if (variation) {
            await variation.update({
              currentStock: Math.max(0, parseFloat(variation.currentStock) - parseFloat(item.quantityReturned))
            }, { transaction: t });
          }
        }
        const stockItem = await Stock.findOne({
          where: {
            organizationId,
            productId: item.itemId,
            branchId: saleReturn.branchId || null
          },
          transaction: t
        });
        if (stockItem) {
          const oldQty = parseFloat(stockItem.qty) || 0;
          // Deduct previously returned quantity
          const newQty = Math.max(0, oldQty - parseFloat(item.quantityReturned));
          await stockItem.update({ qty: newQty }, { transaction: t });

          // Log stock deduction
          await StockLog.create({
            organizationId,
            branchId: saleReturn.branchId,
            productId: item.itemId,
            userId: req.user?.id || req.staff?.id || null,
            movementType: "Deducted",
            qtyChange: -parseFloat(item.quantityReturned),
            previousQty: oldQty,
            newQty: newQty,
            unitCost: item.price,
            referenceId: saleReturn.id,
            notes: `Deleted sale return (ID: ${saleReturn.id}). Restoring stock.`
          }, { transaction: t });
        }
      }
    }

    // 2. Revert Bank Payouts
    for (const payment of saleReturn.SaleReturnPayments) {
      if (payment.bankId) {
        const bank = await Bank.findOne({
          where: { id: payment.bankId, organizationId },
          transaction: t
        });
        if (bank) {
          const oldBalance = parseFloat(bank.balance) || 0;
          // Put the cash back into the bank
          await bank.update({ balance: oldBalance + parseFloat(payment.amount) }, { transaction: t });

          // Add credit transaction to nullify the debit
          await BankTransaction.create({
            organizationId,
            bankId: bank.id,
            type: "credit",
            amount: payment.amount,
            transactionType: "sale_return",
            referenceId: saleReturn.id,
            description: `Reverted refund payout (Return ID: ${saleReturn.id} deleted)`,
            transactionDate: new Date()
          }, { transaction: t });
        }
      }
    }

    // 3. Revert Customer return dues
    const outstandingRefund = parseFloat(saleReturn.total) - parseFloat(saleReturn.amountReturned);
    if (saleReturn.customerId && outstandingRefund > 0) {
      const customer = await Customer.findByPk(saleReturn.customerId, { transaction: t });
      if (customer) {
        const oldReturnDue = parseFloat(customer.totalSellReturnDue) || 0;
        await customer.update({
          totalSellReturnDue: Math.max(0, oldReturnDue - outstandingRefund)
        }, { transaction: t });
      }
    }

    // 4. Destroy return record (cascades items & payments)
    await saleReturn.destroy({ transaction: t });

    await t.commit();
    return res.json({ success: true, message: "Sale return deleted successfully" });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};