require("dotenv").config();
const { sequelize } = require("../config/db");
const { Branch, Customer, Staff, Product, Service, Supplier, Bank, Variation, Stock, Payroll, PayrollBonusDeduction, Purchase, PurchaseReturn, PurchaseReturnPayment, PurchaseItem, Sale, SaleItem, SaleReturn, SaleReturnItem, SaleReturnPayment, StaffService, ProductVariation } = require("../models");

const ORG_ID = 1;
const TARGET = 50;

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("Connected\n");

    const allBranches = await Branch.findAll({ where: { organizationId: ORG_ID } });
    const allStaff = await Staff.findAll({ where: { organizationId: ORG_ID } });
    const allSuppliers = await Supplier.findAll({ where: { organizationId: ORG_ID } });
    const allProducts = await Product.findAll({ where: { organizationId: ORG_ID } });
    const allServices = await Service.findAll({ where: { organizationId: ORG_ID } });
    const allCustomers = await Customer.findAll({ where: { organizationId: ORG_ID } });
    const allBanks = await Bank.findAll({ where: { organizationId: ORG_ID } });
    const allVariations = await Variation.findAll({ where: { organizationId: ORG_ID } });

    // ===== 1. STAFF SERVICES (49 -> 50, need +1) =====
    let ssCount = await StaffService.count();
    if (ssCount < TARGET) {
      for (const stf of allStaff) {
        for (const svc of allServices) {
          if (ssCount >= TARGET) break;
          try {
            await StaffService.findOrCreate({
              where: { staffId: stf.id, serviceId: svc.id },
              defaults: { staffId: stf.id, serviceId: svc.id, commissionType: "percentage", commissionValue: 10 }
            });
            ssCount++;
          } catch (e) {}
        }
        if (ssCount >= TARGET) break;
      }
      console.log(`Staff-Services: now ${ssCount}`);
    }

    // ===== 2. PRODUCT VARIATIONS (45 -> 50, need +5) =====
    let pvCount = await ProductVariation.count();
    if (pvCount < TARGET) {
      for (const prod of allProducts) {
        if (pvCount >= TARGET) break;
        for (const v of allVariations) {
          if (pvCount >= TARGET) break;
          try {
            await ProductVariation.findOrCreate({
              where: { productId: prod.id, name: v.name },
              defaults: { productId: prod.id, name: v.name, sku: `VAR-FIX-${prod.id}-${v.id}`, sellingPriceExc: Math.floor(Math.random() * 5000) + 100 }
            });
            pvCount++;
          } catch (e) {}
        }
      }
      console.log(`Product Variations: now ${pvCount}`);
    }

    // ===== 3. PURCHASE RETURN PAYMENTS (2 -> 50, need +48) =====
    let prpCount = await PurchaseReturnPayment.count();
    if (prpCount < TARGET) {
      const purchReturns = await PurchaseReturn.findAll({ where: { organizationId: ORG_ID } });
      for (const pr of purchReturns) {
        if (prpCount >= TARGET) break;
        const bank = allBanks[prpCount % allBanks.length];
        try {
          await PurchaseReturnPayment.findOrCreate({
            where: { purchaseReturnId: pr.id, amount: pr.total / 2 },
            defaults: {
              purchaseReturnId: pr.id, amount: pr.total / 2,
              paymentMethod: "Bank Transfer", bankId: bank.id,
              transactionId: `TXN-PRP-${prpCount}`,
              note: `Payment ${prpCount + 1}`,
            }
          });
          prpCount++;
        } catch (e) {}
      }
      // Create more directly
      if (prpCount < TARGET) {
        for (let i = 0; i < TARGET - prpCount && i < purchReturns.length; i++) {
          const pr = purchReturns[i % purchReturns.length];
          const bank = allBanks[i % allBanks.length];
          try {
            await sequelize.query(
              "INSERT INTO purchase_return_payments (purchase_return_id, amount, payment_method, bank_id, transaction_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
              { replacements: [pr.id, pr.total * 0.3, "Cash", bank.id, `TXN-${Date.now()}-${i}`, `Auto payment ${i}`] }
            );
            prpCount++;
          } catch (e) {}
        }
      }
      console.log(`Purchase Return Payments: now ${prpCount}`);
    }

    // ===== 4. PAYROLL BONUS DEDUCTIONS (41 -> 50, need +9) =====
    let pbdCount = await PayrollBonusDeduction.count({ where: { organizationId: ORG_ID } });
    if (pbdCount < TARGET) {
      const payrolls = await Payroll.findAll({ where: { organizationId: ORG_ID } });
      for (const pl of payrolls) {
        if (pbdCount >= TARGET) break;
        try {
          await PayrollBonusDeduction.create({
            organizationId: ORG_ID, branchId: 1,
            payrollId: pl.id, type: "bonus", amount: 1000 + (pbdCount * 100),
            reason: `Additional bonus ${pbdCount}`, date: "2026-05-01",
          });
          pbdCount++;
        } catch (e) {}
        if (pbdCount >= TARGET) break;
        try {
          await PayrollBonusDeduction.create({
            organizationId: ORG_ID, branchId: 1,
            payrollId: pl.id, type: "deduction", amount: 500 + (pbdCount * 50),
            reason: `Additional deduction ${pbdCount}`, date: "2026-05-01",
          });
          pbdCount++;
        } catch (e) {}
      }
      console.log(`Payroll Bonus/Deductions: now ${pbdCount}`);
    }

    // ===== 5. SUPPLIER PURCHASES (0 -> 50) =====
    try {
      let spCount = 0;
      for (let i = 0; i < 55; i++) {
        const supplier = allSuppliers[i % allSuppliers.length];
        const branch = allBranches[i % allBranches.length];
        try {
          await sequelize.query(
            `INSERT INTO supplier_purchases (organization_id, branch_id, supplier_id, inventory_id, purchase_date, quantity, unit, unit_cost, total_amount, notes, created_at, updated_at) 
             VALUES (?, ?, ?, NULL, CURDATE(), ?, ?, ?, ?, ?, NOW(), NOW())`,
            { replacements: [ORG_ID, branch.id, supplier.id, Math.floor(Math.random() * 20) + 1, "pcs", Math.floor(Math.random() * 200) + 50, Math.floor(Math.random() * 30000) + 1000, `Auto purchase ${i}`] }
          );
          spCount++;
        } catch (e) {}
      }
      console.log(`Supplier Purchases: +${spCount}`);
    } catch (e) { console.log("supplier_purchases skipped"); }

    // ===== 6. WASTAGES (0 -> 50) =====
    try {
      let wsCount = 0;
      const reasons = ["Damaged","Expired","Spilled","Broken","Contaminated","Leakage","Spoiled","Defective"];
      for (let i = 0; i < 55; i++) {
        const branch = allBranches[i % allBranches.length];
        try {
          await sequelize.query(
            `INSERT INTO wastages (organization_id, branch_id, date, item_name, quantity, reason, created_at, updated_at) 
             VALUES (?, ?, CURDATE(), ?, ?, ?, NOW(), NOW())`,
            { replacements: [ORG_ID, branch.id, `Waste Item ${i + 1}`, Math.floor(Math.random() * 5) + 1, reasons[i % reasons.length]] }
          );
          wsCount++;
        } catch (e) {}
      }
      console.log(`Wastages: +${wsCount}`);
    } catch (e) { console.log("wastages skipped"); }

    // ===== 7. INVENTORY (4 -> 50) =====
    try {
      let invCount = 0;
      for (let i = 0; i < 55; i++) {
        const product = allProducts[i % allProducts.length];
        const branch = allBranches[i % allBranches.length];
        const supplier = allSuppliers[i % allSuppliers.length];
        try {
          await sequelize.query(
            `INSERT INTO inventory (organization_id, branch_id, name, category, min_stock, unit, quantity, supplier, cost_price, selling_price, supplier_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            { replacements: [ORG_ID, branch.id, product.name, "General", Math.floor(Math.random() * 10) + 5, "pcs", Math.floor(Math.random() * 100) + 10, supplier.name, Math.floor(Math.random() * 2000) + 100, Math.floor(Math.random() * 3000) + 200, supplier.id] }
          );
          invCount++;
        } catch (e) {}
      }
      console.log(`Inventory: +${invCount}`);
    } catch (e) { console.log("inventory skipped"); }

    // ===== 8. STAFF ATTACHMENTS (0 -> skip, requires file upload) =====
    console.log("Staff Attachments: skipped (requires file uploads)");

    // ===== Final summary =====
    const tables = [
      ["staff_services", "SELECT COUNT(*) as c FROM staff_services"],
      ["product_variations", "SELECT COUNT(*) as c FROM product_variations"],
      ["purchase_return_payments", "SELECT COUNT(*) as c FROM purchase_return_payments"],
      ["payroll_bonus_deductions", "SELECT COUNT(*) as c FROM payroll_bonus_deductions WHERE organization_id = 1"],
      ["supplier_purchases", "SELECT COUNT(*) as c FROM supplier_purchases WHERE organization_id = 1"],
      ["wastages", "SELECT COUNT(*) as c FROM wastages WHERE organization_id = 1"],
      ["inventory", "SELECT COUNT(*) as c FROM inventory WHERE organization_id = 1"],
    ];
    console.log("\n=== Final Counts ===");
    for (const [name, query] of tables) {
      const [res] = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
      console.log(`${name}: ${res.c}`);
    }

    console.log("\n=== FIX SEED COMPLETED ===");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
