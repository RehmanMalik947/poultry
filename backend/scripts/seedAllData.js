require("dotenv").config();
const { sequelize } = require("../config/db");
const { Organization, Branch, User, Customer, Category, Brand, Unit, Product, Service, Package, Role, Staff, Supplier, Bank, Variation, ProductVariation, Stock, StockLog, StockAdjustment, StockTransfer, Appointment, Attendance, UserSalary, Payroll, PayrollBonusDeduction, ExpenseCategory, Expense, Purchase, PurchaseItem, PurchaseReturn, PurchaseReturnItem, PurchaseReturnPayment, Sale, SaleItem, SaleReturn, SaleReturnItem, SaleReturnPayment, Payment, BankTransaction, SupplierTransaction, ServiceItem, StaffService, StaffLog } = require("../models");
const { Subscription } = require("../models/subscription");

const ORG_ID = 1;
const BRANCH_IDS = [1, 2];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");

    // ========== SUBSCRIPTIONS ==========
    const subscriptionPlans = [
      { name: "Monthly Basic", durationDays: 30, price: 29.99 },
      { name: "Monthly Premium", durationDays: 30, price: 79.99 },
      { name: "Quarterly Basic", durationDays: 90, price: 79.99 },
      { name: "Quarterly Premium", durationDays: 90, price: 199.99 },
      { name: "Yearly Basic", durationDays: 365, price: 299.99 },
      { name: "Yearly Premium", durationDays: 365, price: 799.99 },
    ];
    for (const sub of subscriptionPlans) {
      await Subscription.findOrCreate({
        where: { name: sub.name },
        defaults: sub,
      });
    }
    console.log("Subscriptions seeded:", subscriptionPlans.length);

    // ========== STAFF ==========
    const staffData = [
      { firstName: "Ali", lastName: "Hassan", email: "ali.hassan@salon.com", role: "Barber", commissionType: "percentage", commissionValue: 10, mobileNumber: "03001112221", gender: "Male", startTime: "09:00", endTime: "18:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
      { firstName: "Sara", lastName: "Ahmed", email: "sara.ahmed@salon.com", role: "Hairdresser", commissionType: "percentage", commissionValue: 12, mobileNumber: "03001112222", gender: "Female", startTime: "10:00", endTime: "19:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
      { firstName: "Usman", lastName: "Khan", email: "usman.khan@salon.com", role: "Barber", commissionType: "percentage", commissionValue: 8, mobileNumber: "03001112223", gender: "Male", startTime: "09:00", endTime: "17:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday"]) },
      { firstName: "Fatima", lastName: "Ali", email: "fatima.ali@salon.com", role: "Hairdresser", commissionType: "percentage", commissionValue: 15, mobileNumber: "03001112224", gender: "Female", startTime: "11:00", endTime: "20:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]) },
      { firstName: "Ahmed", lastName: "Raza", email: "ahmed.raza@salon.com", role: "Receptionist", commissionType: "fixed", commissionValue: 0, mobileNumber: "03001112225", gender: "Male", startTime: "08:00", endTime: "17:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
      { firstName: "Zainab", lastName: "Iqbal", email: "zainab.iqbal@salon.com", role: "Nail Technician", commissionType: "percentage", commissionValue: 10, mobileNumber: "03001112226", gender: "Female", startTime: "10:00", endTime: "19:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
      { firstName: "Bilal", lastName: "Mahmood", email: "bilal.mahmood@salon.com", role: "Barber", commissionType: "percentage", commissionValue: 10, mobileNumber: "03001112227", gender: "Male", startTime: "09:00", endTime: "18:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
      { firstName: "Hira", lastName: "Nawaz", email: "hira.nawaz@salon.com", role: "Hairdresser", commissionType: "percentage", commissionValue: 12, mobileNumber: "03001112228", gender: "Female", startTime: "10:00", endTime: "19:00", workingDays: JSON.stringify(["Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]) },
      { firstName: "Kamran", lastName: "Sheikh", email: "kamran.sheikh@salon.com", role: "Shampoo Boy", commissionType: "fixed", commissionValue: 5000, mobileNumber: "03001112229", gender: "Male", startTime: "08:00", endTime: "17:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
      { firstName: "Mahnoor", lastName: "Tariq", email: "mahnoor.tariq@salon.com", role: "Junior Stylist", commissionType: "percentage", commissionValue: 5, mobileNumber: "03001112230", gender: "Female", startTime: "11:00", endTime: "20:00", workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]) },
    ];
    const staffRecords = {};
    for (const s of staffData) {
      const [record] = await Staff.findOrCreate({
        where: { email: s.email },
        defaults: { ...s, organizationId: ORG_ID, branchId: 1, isActive: true, allowLogin: false },
      });
      staffRecords[record.firstName] = record;
    }
    console.log("Staff seeded:", Object.keys(staffRecords).length);

    // ========== SUPPLIERS ==========
    const supplierData = [
      { name: "Beauty Products Distributors", businessName: "BPD Lahore", email: "info@bpd.com", phone: "042-11122233", address: "23 Main Market, Gulberg, Lahore", taxNumber: "SUP-1001", payTerm: 30, payTermType: "days" },
      { name: "Salon Equipment Co.", businessName: "SEC Pvt Ltd", email: "sales@seco.com", phone: "042-33344455", address: "45 Defence Road, Lahore", taxNumber: "SUP-1002", payTerm: 45, payTermType: "days" },
      { name: "Hair Care Wholesale", businessName: "HCW Traders", email: "orders@hcw.com", phone: "042-55566677", address: "12 Shah Alam Market, Lahore", taxNumber: "SUP-1003", payTerm: 30, payTermType: "days" },
      { name: "Nail Art Supplies", businessName: "NAS International", email: "info@nas.com", phone: "042-77788899", address: "78 MM Alam Road, Lahore", taxNumber: "SUP-1004", payTerm: 60, payTermType: "days" },
      { name: "Fragrance & Oils LLC", businessName: "F&O Trading", email: "sales@fno.com", phone: "042-99900011", address: "34 Liberty Market, Lahore", taxNumber: "SUP-1005", payTerm: 30, payTermType: "days" },
    ];
    const supplierRecords = {};
    for (const s of supplierData) {
      const [record] = await Supplier.findOrCreate({
        where: { businessName: s.businessName },
        defaults: { ...s, organizationId: ORG_ID, branchId: 1 },
      });
      supplierRecords[s.businessName] = record;
      supplierRecords[s.name] = record;
    }
    console.log("Suppliers seeded:", Object.keys(supplierRecords).length);

    // ========== BANKS ==========
    const bankData = [
      { bankName: "Habib Bank Limited", accountHolder: "Salon POS Main", accountType: "Current", accountNumber: "HBL-001-1234567", balance: 250000, status: "Active" },
      { bankName: "MCB Bank", accountHolder: "Salon POS Revenue", accountType: "Current", accountNumber: "MCB-002-7654321", balance: 150000, status: "Active" },
      { bankName: "Allied Bank", accountHolder: "Salon POS Payroll", accountType: "Current", accountNumber: "ABL-003-9988776", balance: 50000, status: "Active" },
      { bankName: "United Bank Limited", accountHolder: "Salon POS Savings", accountType: "Savings", accountNumber: "UBL-004-4455667", balance: 500000, status: "Active" },
      { bankName: "Bank Alfalah", accountHolder: "Salon POS Tax", accountType: "Current", accountNumber: "BAF-005-1122334", balance: 75000, status: "Active" },
    ];
    const bankRecords = {};
    for (const b of bankData) {
      const [record] = await Bank.findOrCreate({
        where: { bankName: b.bankName, organizationId: ORG_ID },
        defaults: { ...b, organizationId: ORG_ID, branchId: 1 },
      });
      bankRecords[b.bankName] = record;
    }
    console.log("Banks seeded:", Object.keys(bankRecords).length);

    // ========== VARIATIONS ==========
    const variationData = [
      { name: "Size", values: JSON.stringify(["100ml", "200ml", "300ml", "500ml"]) },
      { name: "Color", values: JSON.stringify(["Red", "Blue", "Green", "Black", "Brown", "Gold", "Silver", "Pink"]) },
      { name: "Type", values: JSON.stringify(["Normal", "Dry", "Oily", "Sensitive"]) },
    ];
    for (const v of variationData) {
      await Variation.findOrCreate({
        where: { name: v.name, organizationId: ORG_ID },
        defaults: { ...v, organizationId: ORG_ID, branchId: 1 },
      });
    }
    console.log("Variations seeded:", variationData.length);

    // ========== EXPENSE CATEGORIES ==========
    const expenseCatData = [
      { name: "Rent", description: "Office/Salon rent payments" },
      { name: "Utilities", description: "Electricity, water, gas, internet" },
      { name: "Salaries & Wages", description: "Employee salaries and wages" },
      { name: "Inventory Purchase", description: "Product & material purchases" },
      { name: "Marketing & Advertising", description: "Social media ads, flyers, promotions" },
      { name: "Maintenance & Repairs", description: "Equipment and premises maintenance" },
      { name: "Licenses & Permits", description: "Business licenses and permits" },
      { name: "Insurance", description: "Business insurance premiums" },
      { name: "Cleaning & Supplies", description: "Cleaning products and salon supplies" },
      { name: "Miscellaneous", description: "Other miscellaneous expenses" },
    ];
    const expenseCatRecords = {};
    for (const ec of expenseCatData) {
      const [record] = await ExpenseCategory.findOrCreate({
        where: { name: ec.name, organizationId: ORG_ID },
        defaults: { ...ec, organizationId: ORG_ID, branchId: 1 },
      });
      expenseCatRecords[ec.name] = record;
    }
    console.log("Expense categories seeded:", Object.keys(expenseCatRecords).length);

    // ========== EXPENSES ==========
    const expenseData = [
      { categoryName: "Rent", amount: 50000, date: "2026-05-01", expenseFor: "May Rent", description: "Monthly salon rent", paymentMethod: "cash", paidOn: "2026-05-01" },
      { categoryName: "Utilities", amount: 8500, date: "2026-05-05", expenseFor: "May Electricity", description: "Electricity bill for May", paymentMethod: "bank_transfer", paidOn: "2026-05-05" },
      { categoryName: "Utilities", amount: 3200, date: "2026-05-05", expenseFor: "May Internet", description: "Internet bill", paymentMethod: "bank_transfer", paidOn: "2026-05-05" },
      { categoryName: "Marketing & Advertising", amount: 15000, date: "2026-05-10", expenseFor: "Facebook Ads", description: "Social media advertising campaign", paymentMethod: "cheque", paidOn: "2026-05-12" },
      { categoryName: "Maintenance & Repairs", amount: 7500, date: "2026-05-15", expenseFor: "AC Repair", description: "AC compressor replacement", paymentMethod: "cash", paidOn: "2026-05-15" },
      { categoryName: "Cleaning & Supplies", amount: 4500, date: "2026-05-18", expenseFor: "Monthly cleaning supplies", description: "Towels, sanitizers, cleaning agents", paymentMethod: "cash", paidOn: "2026-05-18" },
      { categoryName: "Licenses & Permits", amount: 12000, date: "2026-05-20", expenseFor: "Annual renewal", description: "Salon license renewal fee", paymentMethod: "cheque", paidOn: "2026-05-20" },
      { categoryName: "Insurance", amount: 9500, date: "2026-05-22", expenseFor: "Quarterly premium", description: "Business insurance premium", paymentMethod: "bank_transfer", paidOn: "2026-05-22" },
      { categoryName: "Utilities", amount: 2800, date: "2026-05-25", expenseFor: "Water bill", description: "Water supply bill", paymentMethod: "cash", paidOn: "2026-05-25" },
      { categoryName: "Miscellaneous", amount: 2000, date: "2026-05-28", expenseFor: "Tea & snacks", description: "Staff refreshments", paymentMethod: "cash", paidOn: "2026-05-28" },
      { categoryName: "Rent", amount: 50000, date: "2026-04-01", expenseFor: "April Rent", description: "Monthly salon rent", paymentMethod: "cash", paidOn: "2026-04-01" },
      { categoryName: "Utilities", amount: 7800, date: "2026-04-06", expenseFor: "April Electricity", description: "Electricity bill", paymentMethod: "bank_transfer", paidOn: "2026-04-06" },
    ];
    for (const e of expenseData) {
      const cat = expenseCatRecords[e.categoryName];
      if (cat) {
        await Expense.findOrCreate({
          where: { referenceNo: `${e.expenseFor}-${e.date}` },
          defaults: {
            organizationId: ORG_ID, branchId: 1,
            categoryId: cat.id,
            referenceNo: `${e.expenseFor}-${e.date}`,
            amount: e.amount,
            date: e.date,
            expenseFor: e.expenseFor,
            description: e.description,
            paymentMethod: e.paymentMethod,
            paidOn: e.paidOn,
          },
        });
      }
    }
    const expenseCount = await Expense.count({ where: { organizationId: ORG_ID } });
    console.log("Expenses seeded:", expenseCount);

    // ========== STAFF SERVICES ==========
    const allServices = await Service.findAll({ where: { organizationId: ORG_ID } });
    const allStaff = await Staff.findAll({ where: { organizationId: ORG_ID } });
    const staffServiceLinks = [
      { staffFirstName: "Ali", serviceCode: "SVC-HC-001" },
      { staffFirstName: "Ali", serviceCode: "SVC-HC-002" },
      { staffFirstName: "Ali", serviceCode: "SVC-COL-001" },
      { staffFirstName: "Ali", serviceCode: "SVC-BRIDE-002" },
      { staffFirstName: "Usman", serviceCode: "SVC-HC-001" },
      { staffFirstName: "Usman", serviceCode: "SVC-FCL-001" },
      { staffFirstName: "Bilal", serviceCode: "SVC-HC-001" },
      { staffFirstName: "Bilal", serviceCode: "SVC-HC-002" },
      { staffFirstName: "Bilal", serviceCode: "SVC-COL-001" },
      { staffFirstName: "Sara", serviceCode: "SVC-HC-001" },
      { staffFirstName: "Sara", serviceCode: "SVC-HC-002" },
      { staffFirstName: "Sara", serviceCode: "SVC-COL-001" },
      { staffFirstName: "Sara", serviceCode: "SVC-COL-002" },
      { staffFirstName: "Sara", serviceCode: "SVC-COL-003" },
      { staffFirstName: "Sara", serviceCode: "SVC-TRT-001" },
      { staffFirstName: "Sara", serviceCode: "SVC-TRT-002" },
      { staffFirstName: "Sara", serviceCode: "SVC-TRT-003" },
      { staffFirstName: "Fatima", serviceCode: "SVC-HC-001" },
      { staffFirstName: "Fatima", serviceCode: "SVC-COL-001" },
      { staffFirstName: "Fatima", serviceCode: "SVC-COL-002" },
      { staffFirstName: "Fatima", serviceCode: "SVC-COL-003" },
      { staffFirstName: "Fatima", serviceCode: "SVC-TRT-001" },
      { staffFirstName: "Fatima", serviceCode: "SVC-TRT-002" },
      { staffFirstName: "Fatima", serviceCode: "SVC-BRIDE-001" },
      { staffFirstName: "Fatima", serviceCode: "SVC-BRIDE-002" },
      { staffFirstName: "Hira", serviceCode: "SVC-FCL-001" },
      { staffFirstName: "Hira", serviceCode: "SVC-FCL-002" },
      { staffFirstName: "Hira", serviceCode: "SVC-BRIDE-001" },
      { staffFirstName: "Mahnoor", serviceCode: "SVC-HC-001" },
      { staffFirstName: "Mahnoor", serviceCode: "SVC-NAIL-001" },
      { staffFirstName: "Zainab", serviceCode: "SVC-NAIL-001" },
      { staffFirstName: "Zainab", serviceCode: "SVC-NAIL-002" },
      { staffFirstName: "Zainab", serviceCode: "SVC-NAIL-003" },
    ];
    let ssc = 0;
    for (const link of staffServiceLinks) {
      const staff = allStaff.find(s => s.firstName === link.staffFirstName);
      const service = allServices.find(s => s.serviceCode === link.serviceCode);
      if (staff && service) {
        const [rec, created] = await StaffService.findOrCreate({
          where: { staffId: staff.id, serviceId: service.id },
          defaults: { staffId: staff.id, serviceId: service.id, commissionType: "percentage", commissionValue: 10 },
        });
        if (created) ssc++;
      }
    }
    console.log("Staff-Service links seeded:", ssc);

    // ========== SERVICE ITEMS ==========
    const products = await Product.findAll({ where: { organizationId: ORG_ID } });
    let siCount = 0;
    const serviceItemsMap = [
      { serviceCode: "SVC-HC-001", productName: "L'Oreal Serie Expert Shampoo", qty: 0.5 },
      { serviceCode: "SVC-COL-001", productName: "Hair Color Brown", qty: 1 },
      { serviceCode: "SVC-COL-002", productName: "Hair Color Brown", qty: 2 },
      { serviceCode: "SVC-COL-003", productName: "Hair Color Brown", qty: 2.5 },
      { serviceCode: "SVC-TRT-001", productName: "Keratin Hair Mask", qty: 1.5 },
      { serviceCode: "SVC-TRT-002", productName: "Keratin Hair Mask", qty: 1 },
      { serviceCode: "SVC-NAIL-001", productName: "OPI Nail Lacquer - Bubble Bath", qty: 0.3 },
      { serviceCode: "SVC-NAIL-002", productName: "OPI Nail Lacquer - Bubble Bath", qty: 0.5 },
      { serviceCode: "SVC-FCL-001", productName: "Golden Facial Kit", qty: 1 },
    ];
    for (const si of serviceItemsMap) {
      const svc = allServices.find(s => s.serviceCode === si.serviceCode);
      const prod = products.find(p => p.name === si.productName);
      if (svc && prod) {
        const [rec, created] = await ServiceItem.findOrCreate({
          where: { serviceId: svc.id, productId: prod.id },
          defaults: { serviceId: svc.id, productId: prod.id, quantity: si.qty },
        });
        if (created) siCount++;
      }
    }
    console.log("Service items seeded:", siCount);

    // ========== PURCHASES ==========
    const purchaseData = [
      { ref: "PO-2026-001", supplierName: "Beauty Products Distributors", date: "2026-05-02", amount: 45000, status: "received", paymentStatus: "paid" },
      { ref: "PO-2026-002", supplierName: "Hair Care Wholesale", date: "2026-05-05", amount: 28500, status: "received", paymentStatus: "paid" },
      { ref: "PO-2026-003", supplierName: "Salon Equipment Co.", date: "2026-05-10", amount: 62000, status: "received", paymentStatus: "partial" },
      { ref: "PO-2026-004", supplierName: "Nail Art Supplies", date: "2026-05-15", amount: 18500, status: "received", paymentStatus: "paid" },
      { ref: "PO-2026-005", supplierName: "Fragrance & Oils LLC", date: "2026-05-20", amount: 32000, status: "ordered", paymentStatus: "due" },
      { ref: "PO-2026-006", supplierName: "Beauty Products Distributors", date: "2026-04-03", amount: 52000, status: "received", paymentStatus: "paid" },
      { ref: "PO-2026-007", supplierName: "Hair Care Wholesale", date: "2026-04-12", amount: 19700, status: "received", paymentStatus: "paid" },
      { ref: "PO-2026-008", supplierName: "Salon Equipment Co.", date: "2026-04-18", amount: 88000, status: "received", paymentStatus: "paid" },
    ];
    const purchaseRecords = [];
    for (const p of purchaseData) {
      const supplier = supplierRecords[p.supplierName];
      if (supplier) {
        const [record] = await Purchase.findOrCreate({
          where: { referenceNo: p.ref, organizationId: ORG_ID },
          defaults: {
            organizationId: ORG_ID, branchId: 1,
            supplierId: supplier.id,
            referenceNo: p.ref,
            purchaseDate: p.date,
            status: p.status,
            totalAmount: p.amount,
            paymentStatus: p.paymentStatus,
            paidAmount: p.paymentStatus === "paid" ? p.amount : p.paymentStatus === "partial" ? p.amount * 0.5 : 0,
          },
        });
        purchaseRecords.push(record);
      }
    }
    console.log("Purchases seeded:", purchaseRecords.length);

    // ========== PURCHASE ITEMS ==========
    const purchaseItemsData = [
      { ref: "PO-2026-001", productName: "L'Oreal Serie Expert Shampoo", qty: 10, cost: 650, sellingPrice: 950 },
      { ref: "PO-2026-001", productName: "Wella SP Conditioner", qty: 8, cost: 700, sellingPrice: 1050 },
      { ref: "PO-2026-002", productName: "Schwarzkopf Got2b Glued Gel", qty: 15, cost: 350, sellingPrice: 550 },
      { ref: "PO-2026-002", productName: "Matrix Biolage Hairspray", qty: 12, cost: 800, sellingPrice: 1200 },
      { ref: "PO-2026-003", productName: "Golden Facial Kit", qty: 5, cost: 1500, sellingPrice: 2100 },
      { ref: "PO-2026-003", productName: "Keratin Hair Mask", qty: 8, cost: 1200, sellingPrice: 1600 },
      { ref: "PO-2026-004", productName: "OPI Nail Lacquer - Bubble Bath", qty: 20, cost: 900, sellingPrice: 1400 },
      { ref: "PO-2026-005", productName: "Moroccanoil Treatment", qty: 6, cost: 2500, sellingPrice: 3800 },
      { ref: "PO-2026-005", productName: "Olaplex No.3 Hair Perfector", qty: 5, cost: 3200, sellingPrice: 4500 },
    ];
    let piCount = 0;
    for (const pi of purchaseItemsData) {
      const purch = purchaseRecords.find(p => p.referenceNo === pi.ref);
      const prod = products.find(p => p.name === pi.productName);
      if (purch && prod) {
        const [rec, created] = await PurchaseItem.findOrCreate({
          where: { purchaseId: purch.id, productId: prod.id },
          defaults: {
            purchaseId: purch.id,
            productId: prod.id,
            name: pi.productName,
            quantity: pi.qty,
            unitCost: pi.cost,
            sellingPrice: pi.sellingPrice,
            lineTotal: pi.qty * pi.cost,
          },
        });
        if (created) piCount++;
      }
    }
    console.log("Purchase items seeded:", piCount);

    // ========== STOCKS ==========
    const stockData = [
      { productName: "L'Oreal Serie Expert Shampoo", qty: 25, alertQty: 10 },
      { productName: "Wella SP Conditioner", qty: 15, alertQty: 10 },
      { productName: "Moroccanoil Treatment", qty: 8, alertQty: 5 },
      { productName: "Olaplex No.3 Hair Perfector", qty: 6, alertQty: 5 },
      { productName: "Schwarzkopf Got2b Glued Gel", qty: 20, alertQty: 10 },
      { productName: "Matrix Biolage Hairspray", qty: 18, alertQty: 10 },
      { productName: "OPI Nail Lacquer - Bubble Bath", qty: 30, alertQty: 6 },
      { productName: "Redken All Soft Shampoo", qty: 12, alertQty: 10 },
      { productName: "Paul Mitchell Tea Tree Special Shampoo", qty: 10, alertQty: 8 },
      { productName: "Nexxus Keraphix Hair Mask", qty: 7, alertQty: 5 },
    ];
    let stockCount = 0;
    for (const sd of stockData) {
      const prod = products.find(p => p.name === sd.productName);
      if (prod) {
        const [rec, created] = await Stock.findOrCreate({
          where: { organizationId: ORG_ID, branchId: 1, productId: prod.id },
          defaults: { organizationId: ORG_ID, branchId: 1, productId: prod.id, qty: sd.qty, alertQty: sd.alertQty },
        });
        if (created) stockCount++;
      }
    }
    console.log("Stocks seeded:", stockCount);

    // ========== STOCK LOGS ==========
    const stockLogMovements = [
      { productName: "L'Oreal Serie Expert Shampoo", movement: "PURCHASE", qtyChange: 10, prevQty: 0, newQty: 10 },
      { productName: "L'Oreal Serie Expert Shampoo", movement: "SALE", qtyChange: -2, prevQty: 10, newQty: 8 },
      { productName: "Wella SP Conditioner", movement: "PURCHASE", qtyChange: 8, prevQty: 0, newQty: 8 },
      { productName: "Moroccanoil Treatment", movement: "PURCHASE", qtyChange: 6, prevQty: 0, newQty: 6 },
      { productName: "Olaplex No.3 Hair Perfector", movement: "PURCHASE", qtyChange: 5, prevQty: 0, newQty: 5 },
      { productName: "OPI Nail Lacquer - Bubble Bath", movement: "PURCHASE", qtyChange: 20, prevQty: 0, newQty: 20 },
      { productName: "OPI Nail Lacquer - Bubble Bath", movement: "SALE", qtyChange: -3, prevQty: 20, newQty: 17 },
    ];
    let slCount = 0;
    for (const sl of stockLogMovements) {
      const prod = products.find(p => p.name === sl.productName);
      if (prod) {
        const [rec, created] = await StockLog.findOrCreate({
          where: { organizationId: ORG_ID, branchId: 1, productId: prod.id, movementType: sl.movement, referenceId: Math.floor(Math.random() * 1000) },
          defaults: { organizationId: ORG_ID, branchId: 1, productId: prod.id, movementType: sl.movement, qtyChange: sl.qtyChange, previousQty: sl.prevQty, newQty: sl.newQty },
        });
        if (created) slCount++;
      }
    }
    console.log("Stock logs seeded:", slCount);

    // ========== STOCK ADJUSTMENTS ==========
    const adjustmentData = [
      { ref: "ADJ-2026-001", reason: "Damaged goods", totalAmount: 3500 },
      { ref: "ADJ-2026-002", reason: "Expired products", totalAmount: 2200 },
      { ref: "ADJ-2026-003", reason: "Inventory count correction", totalAmount: 1500 },
    ];
    for (const adj of adjustmentData) {
      await StockAdjustment.findOrCreate({
        where: { referenceNo: adj.ref, organizationId: ORG_ID },
        defaults: { organizationId: ORG_ID, branchId: 1, referenceNo: adj.ref, adjustmentType: "Normal", reason: adj.reason, totalAmount: adj.totalAmount },
      });
    }
    console.log("Stock adjustments seeded:", adjustmentData.length);

    // ========== STOCK TRANSFERS ==========
    const transferData = [
      { ref: "TRF-2026-001", fromBranch: 1, toBranch: 2, notes: "Transfer excess stock", status: "Completed" },
      { ref: "TRF-2026-002", fromBranch: 2, toBranch: 1, notes: "Return unused items", status: "Completed" },
    ];
    for (const t of transferData) {
      await StockTransfer.findOrCreate({
        where: { referenceNo: t.ref, organizationId: ORG_ID },
        defaults: { organizationId: ORG_ID, fromBranchId: t.fromBranch, toBranchId: t.toBranch, referenceNo: t.ref, status: t.status, notes: t.notes },
      });
    }
    console.log("Stock transfers seeded:", transferData.length);

    // ========== USER SALARIES ==========
    const salaryData = [
      { staffFirstName: "Ali", type: "monthly", amount: 25000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Sara", type: "monthly", amount: 30000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Usman", type: "monthly", amount: 22000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Fatima", type: "monthly", amount: 35000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Ahmed", type: "monthly", amount: 20000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Zainab", type: "monthly", amount: 28000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Bilal", type: "monthly", amount: 25000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Hira", type: "monthly", amount: 30000, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Kamran", type: "daily", amount: 500, effectiveFrom: "2026-01-01" },
      { staffFirstName: "Mahnoor", type: "monthly", amount: 15000, effectiveFrom: "2026-01-01" },
    ];
    let salCount = 0;
    for (const sal of salaryData) {
      const staff = allStaff.find(s => s.firstName === sal.staffFirstName);
      if (staff) {
        const [rec, created] = await UserSalary.findOrCreate({
          where: { staffId: staff.id, effectiveFrom: sal.effectiveFrom },
          defaults: { organizationId: ORG_ID, branchId: 1, staffId: staff.id, salaryType: sal.type, amount: sal.amount, effectiveFrom: sal.effectiveFrom, status: "active" },
        });
        if (created) salCount++;
      }
    }
    console.log("User salaries seeded:", salCount);

    // ========== ATTENDANCES ==========
    const months = ["03", "04", "05"];
    const days = ["01","02","03","04","05","07","08","09","10","11","12","14","15","16","17","18","19","21","22","23","24","25","26"];
    const statuses = ["present","present","present","present","present","present","present","present","late","absent"];
    let attCount = 0;
    for (const staff of allStaff) {
      for (const m of months) {
        const sampleDays = days.slice(0, 8 + Math.floor(Math.random() * 5));
        for (const d of sampleDays) {
          const date = `2026-${m}-${d}`;
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const [rec, created] = await Attendance.findOrCreate({
            where: { staffId: staff.id, date },
            defaults: { organizationId: ORG_ID, branchId: 1, staffId: staff.id, date, status },
          });
          if (created) attCount++;
        }
      }
    }
    console.log("Attendances seeded:", attCount);

    // ========== PAYROLLS ==========
    const freshStaff = await Staff.findAll({ where: { organizationId: ORG_ID } });
    const payrollStaff = freshStaff.filter(s => s.firstName !== "Kamran");
    let payCount = 0;
    for (const pStaff of payrollStaff) {
      for (const month of [3, 4, 5]) {
        const salary = salaryData.find(sd => sd.staffFirstName === pStaff.firstName);
        if (salary) {
          const baseSalary = salary.amount;
          const bonus = Math.random() > 0.7 ? Math.floor(Math.random() * 3000) + 1000 : 0;
          const deduction = Math.random() > 0.75 ? Math.floor(Math.random() * 2000) + 500 : 0;
          const netSalary = baseSalary + bonus - deduction;
          const status = month < 5 ? "paid" : "pending";
          try {
            const [rec, created] = await Payroll.findOrCreate({
              where: { staffId: pStaff.id, month, year: 2026 },
              defaults: {
                organizationId: ORG_ID, branchId: 1,
                staffId: pStaff.id, month, year: 2026,
                baseSalary, bonus, deduction, netSalary,
                status, paidAt: status === "paid" ? `2026-${String(month + 1).padStart(2, "0")}-05` : null,
              },
            });
            if (created) {
              payCount++;
              if (bonus > 0 || deduction > 0) {
                if (bonus > 0) {
                  await PayrollBonusDeduction.create({
                    organizationId: ORG_ID, branchId: 1,
                    payrollId: rec.id, type: "bonus", amount: bonus,
                    reason: "Performance bonus", date: `2026-${String(month + 1).padStart(2, "0")}-01`,
                  });
                }
                if (deduction > 0) {
                  await PayrollBonusDeduction.create({
                    organizationId: ORG_ID, branchId: 1,
                    payrollId: rec.id, type: "deduction", amount: deduction,
                    reason: "Late arrival / unpaid leave", date: `2026-${String(month + 1).padStart(2, "0")}-01`,
                  });
                }
              }
            }
          } catch (fkErr) {}
        }
      }
    }
    console.log("Payrolls seeded:", payCount);

    // ========== APPOINTMENTS ==========
    const apptStatuses = ["booked", "completed", "completed", "completed", "cancelled"];
    const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    const customers = await Customer.findAll({ where: { organizationId: ORG_ID } });
    const freshServices = await Service.findAll({ where: { organizationId: ORG_ID } });
    let apptCount = 0;
    const apptDates = ["2026-05-01","2026-05-02","2026-05-03","2026-05-05","2026-05-06","2026-05-07","2026-05-08","2026-05-09","2026-05-10","2026-05-12","2026-05-13","2026-05-14","2026-05-15","2026-05-16","2026-05-17","2026-05-19","2026-05-20","2026-05-22","2026-05-23","2026-05-24","2026-05-26","2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-06-01","2026-06-02","2026-06-03","2026-05-25"];
    for (const date of apptDates) {
      const numAppts = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numAppts; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = freshServices[Math.floor(Math.random() * freshServices.length)];
        const staff = allStaff[Math.floor(Math.random() * allStaff.length)];
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const status = apptStatuses[Math.floor(Math.random() * apptStatuses.length)];
        const isCompleted = status === "completed";
        try {
          const [rec, created] = await Appointment.findOrCreate({
            where: { customerId: customer.id, date, timeSlot, serviceId: service.id },
            defaults: {
              organizationId: ORG_ID, branchId: 1,
              customerId: customer.id, serviceId: service.id, staffId: staff.id,
              date, timeSlot, status, notes: status === "cancelled" ? "Customer cancelled" : "",
              checkInTime: isCompleted ? `${date} ${timeSlot}:00` : null,
              checkOutTime: isCompleted ? `${date} ${String(parseInt(timeSlot) + Math.ceil((service.duration || 30) / 60)).padStart(2, "0")}:00:00` : null,
              serviceDuration: service.duration || 30,
            },
          });
          if (created) apptCount++;
        } catch (fkErr) {
          // Skip FK constraint errors (e.g. deleted service)
        }
      }
    }
    console.log("Appointments seeded:", apptCount);

    // ========== BANK TRANSACTIONS ==========
    let btCount = 0;
    const banks = await Bank.findAll({ where: { organizationId: ORG_ID } });
    const txTypes = ["credit", "debit"];
    const txDesc = ["Deposit", "Withdrawal", "Transfer", "Payment received", "Fee charge", "Interest"];
    for (const bank of banks) {
      for (let i = 0; i < 3; i++) {
        const type = txTypes[Math.floor(Math.random() * txTypes.length)];
        const amount = Math.floor(Math.random() * 50000) + 1000;
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const txDate = new Date();
        txDate.setDate(txDate.getDate() - daysAgo);
        const [rec, created] = await BankTransaction.findOrCreate({
          where: { bankId: bank.id, amount, transactionType: txDesc[i], description: `${txDesc[i]} to bank account`, type },
          defaults: {
            organizationId: ORG_ID,
            bankId: bank.id, type, amount,
            transactionType: txDesc[i],
            description: `${txDesc[i]} to bank account`,
            transactionDate: txDate.toISOString().split("T")[0],
          },
        });
        if (created) btCount++;
      }
    }
    console.log("Bank transactions seeded:", btCount);

    // ========== SUPPLIER TRANSACTIONS ==========
    let stCount = 0;
    const suppliers = await Supplier.findAll({ where: { organizationId: ORG_ID } });
    for (const supplier of suppliers) {
      for (let i = 0; i < 2; i++) {
        const amount = Math.floor(Math.random() * 40000) + 5000;
        const type = Math.random() > 0.5 ? "purchase" : "purchase_payment";
        const [rec, created] = await SupplierTransaction.findOrCreate({
          where: { supplierId: supplier.id, debit: type === "purchase" ? amount : 0, credit: type === "purchase_payment" ? amount : 0 },
          defaults: {
            organizationId: ORG_ID,
            supplierId: supplier.id, type,
            debit: type === "purchase" ? amount : 0,
            credit: type === "purchase_payment" ? amount : 0,
            balance: amount,
            note: type === "purchase" ? "New purchase" : "Payment made",
            date: new Date().toISOString().split("T")[0],
          },
        });
        if (created) stCount++;
      }
    }
    console.log("Supplier transactions seeded:", stCount);

    // ========== STAFF LOGS ==========
    const salesRecords = await Sale.findAll({ where: { organizationId: ORG_ID }, limit: 20, order: [["id", "DESC"]] });
    let staffLogCount = 0;
    for (const staff of allStaff) {
      for (let i = 0; i < 2; i++) {
        const sale = salesRecords[Math.floor(Math.random() * salesRecords.length)];
        const price = Math.floor(Math.random() * 5000) + 500;
        const logKey = `stafflog-${staff.id}-${i}-${Date.now()}`;
        try {
          const [rec, created] = await StaffLog.findOrCreate({
            where: { staffId: staff.id, actionType: "Commission", itemName: logKey },
            defaults: {
              organizationId: ORG_ID, branchId: 1,
              staffId: staff.id, saleId: sale?.id || null,
              actionType: "Commission",
              itemName: logKey,
              price, commissionRate: "10%", amountEarned: price * 0.1,
            },
          });
          if (created) staffLogCount++;
        } catch (fkErr) {}
      }
    }
    console.log("Staff logs seeded:", staffLogCount);

    console.log("\n=== SEED COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
