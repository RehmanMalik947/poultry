const { sequelize } = require("../config/db");
const { Organization } = require("./organization");
const { User } = require("./users");
const { Customer } = require("./customer");
const { Branch } = require("./branch");
const { Staff } = require("./staff");
const { StaffLog } = require("./staffLog");
const { StaffAttachment } = require("./staffAttachment");
const { Role } = require("./role");
const { Supplier } = require("./supplier");
const { Service } = require("./service");
const { Package } = require("./package");
const { StaffService } = require("./staffService"); // Pehly import krain
const { ServiceItem } = require("./serviceItem");
const { Category } = require("./category");
const { Product } = require("./product");
const { Sale } = require("./sale");
const { SaleItem } = require("./saleItem");
const { SaleReturn } = require("./saleReturn");
const { SaleReturnItem } = require("./saleReturnItem");
const { SaleReturnPayment } = require("./saleReturnPayment");
const { Payment } = require("./payment");
const { Bank } = require("./bank");
const { Appointment } = require("./appointment");
const { ExpenseCategory } = require("./expenseCategory");
const { Expense } = require("./expense");
const { UserSalary } = require("./userSalary");
const { Attendance } = require("./attendance");
const { Payroll } = require("./payroll");
const { PayrollBonusDeduction } = require("./payrollBonusDeduction");
const { Purchase } = require("./purchase");
const { PurchaseItem } = require("./purchaseItem");
const { PurchaseReturn } = require("./purchaseReturn");
const { PurchaseReturnItem } = require("./purchaseReturnItem");
const { PurchaseReturnPayment } = require("./purchaseReturnPayment");
const { Unit } = require("./unit");
const { Brand } = require("./brand");
const { Variation } = require("./variation");
const { ProductVariation } = require("./productVariation");
const { Stock } = require("./stock");
const { StockLog } = require("./stockLog");
const { StockAdjustment } = require("./stockAdjustment");
const { StockTransfer } = require("./stockTransfer");
const { BankTransaction } = require("./bankTransaction");
const { SupplierTransaction } = require("./supplierTransaction");
const { CashRegister } = require("./cashRegister");
const { CashRegisterTransaction } = require("./cashRegisterTransaction");
const { ActivityLog } = require("./activityLog");


require("./superAdmin"); // ensure SuperAdmin table is synced

// Associations
Organization.hasMany(Role, { foreignKey: "organizationId" });
Role.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(User, { foreignKey: "organizationId" });
User.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(User, { foreignKey: "branchId" });
User.belongsTo(Branch, { foreignKey: "branchId" });
Organization.hasMany(Customer, { foreignKey: "organizationId" });
Customer.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(Branch, { foreignKey: "organizationId" });
Branch.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Customer, { foreignKey: "branchId" });
Customer.belongsTo(Branch, { foreignKey: "branchId" });

Branch.hasMany(Staff, { foreignKey: "branchId" });
Staff.belongsTo(Branch, { foreignKey: "branchId" });
Organization.hasMany(Staff, { foreignKey: "organizationId" });
Staff.belongsTo(Organization, { foreignKey: "organizationId" });
User.hasOne(Staff, { foreignKey: "userId" });
Staff.belongsTo(User, { foreignKey: "userId" });

Organization.hasMany(Supplier, { foreignKey: "organizationId" });
Supplier.belongsTo(Organization, { foreignKey: "organizationId" });

Supplier.hasMany(Purchase, { foreignKey: "supplierId" });


Organization.hasMany(Product, { foreignKey: "organizationId" });
Product.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Product, { foreignKey: "branchId" });
Product.belongsTo(Branch, { foreignKey: "branchId" });

Organization.hasMany(Category, { foreignKey: "organizationId" });
Category.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Category, { foreignKey: "branchId" });
Category.belongsTo(Branch, { foreignKey: "branchId" });

Organization.hasMany(Unit, { foreignKey: "organizationId" });
Unit.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Unit, { foreignKey: "branchId" });
Unit.belongsTo(Branch, { foreignKey: "branchId" });

Organization.hasMany(Brand, { foreignKey: "organizationId" });
Brand.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Brand, { foreignKey: "branchId" });
Brand.belongsTo(Branch, { foreignKey: "branchId" });

Organization.hasMany(Variation, { foreignKey: "organizationId" });
Variation.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Variation, { foreignKey: "branchId" });
Variation.belongsTo(Branch, { foreignKey: "branchId" });

Organization.hasMany(Service, { foreignKey: "organizationId" });
Service.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Service, { foreignKey: "branchId" });
Service.belongsTo(Branch, { foreignKey: "branchId" });
Category.hasMany(Service, { foreignKey: "categoryId" });
Service.belongsTo(Category, { foreignKey: "categoryId" });

Organization.hasMany(Package, { foreignKey: "organizationId" });
Package.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Package, { foreignKey: "branchId" });
Package.belongsTo(Branch, { foreignKey: "branchId" });

Service.hasMany(ServiceItem, { foreignKey: "serviceId" });
ServiceItem.belongsTo(Service, { foreignKey: "serviceId" });
Service.belongsToMany(Staff, { through: StaffService, foreignKey: "serviceId", as: "Staffs" });
Staff.belongsToMany(Service, { through: StaffService, foreignKey: "staffId", as: "Services" });

Product.hasMany(ServiceItem, { foreignKey: "productId" });
ServiceItem.belongsTo(Product, { foreignKey: "productId" });

// Sales (POS bills)
Organization.hasMany(Sale, { foreignKey: "organizationId" });
Sale.belongsTo(Organization, { foreignKey: "organizationId" });
Sale.belongsTo(Branch, { foreignKey: "branchId" });
Branch.hasMany(Sale, { foreignKey: "branchId" });
Sale.belongsTo(Customer, { foreignKey: "customerId", as: "Customer" });
Customer.hasMany(Sale, { foreignKey: "customerId" });

Sale.belongsTo(User, { foreignKey: "userId", as: "User" });
User.hasMany(Sale, { foreignKey: "userId", as: "Sales" });

Sale.belongsTo(Staff, { foreignKey: "staffId", as: "Staff" });
Staff.hasMany(Sale, { foreignKey: "staffId" });

Sale.hasMany(SaleItem, { foreignKey: "saleId", as: "SaleItems" });
SaleItem.belongsTo(Sale, { foreignKey: "saleId" });

// Sale Returns associations
Organization.hasMany(SaleReturn, { foreignKey: "organizationId" });
SaleReturn.belongsTo(Organization, { foreignKey: "organizationId" });

Branch.hasMany(SaleReturn, { foreignKey: "branchId" });
SaleReturn.belongsTo(Branch, { foreignKey: "branchId" });

Customer.hasMany(SaleReturn, { foreignKey: "customerId", as: "SaleReturns" });
SaleReturn.belongsTo(Customer, { foreignKey: "customerId", as: "Customer" });

Sale.hasMany(SaleReturn, { foreignKey: "saleId", as: "SaleReturns" });
SaleReturn.belongsTo(Sale, { foreignKey: "saleId" });

SaleReturn.hasMany(SaleReturnItem, { foreignKey: "saleReturnId", as: "SaleReturnItems" });
SaleReturnItem.belongsTo(SaleReturn, { foreignKey: "saleReturnId" });

SaleReturn.hasMany(SaleReturnPayment, { foreignKey: "saleReturnId", as: "SaleReturnPayments" });
SaleReturnPayment.belongsTo(SaleReturn, { foreignKey: "saleReturnId" });

Bank.hasMany(SaleReturnPayment, { foreignKey: "bankId" });
SaleReturnPayment.belongsTo(Bank, { foreignKey: "bankId", as: "Bank" });


Sale.hasMany(Payment, { foreignKey: "saleId", as: "Payments" });
Payment.belongsTo(Sale, { foreignKey: "saleId" });
Bank.hasMany(Payment, { foreignKey: "bankId" });
Payment.belongsTo(Bank, { foreignKey: "bankId", as: "Bank" });
Organization.hasMany(Bank, { foreignKey: "organizationId" });
Bank.belongsTo(Organization, { foreignKey: "organizationId" });

// Bank Transactions
Organization.hasMany(BankTransaction, { foreignKey: "organizationId" });
BankTransaction.belongsTo(Organization, { foreignKey: "organizationId" });
Bank.hasMany(BankTransaction, { foreignKey: "bankId" });
BankTransaction.belongsTo(Bank, { foreignKey: "bankId" });

// Appointments
Organization.hasMany(Appointment, { foreignKey: "organizationId" });
Appointment.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Appointment, { foreignKey: "branchId" });
Appointment.belongsTo(Branch, { foreignKey: "branchId" });
Customer.hasMany(Appointment, { foreignKey: "customerId" });
Appointment.belongsTo(Customer, { foreignKey: "customerId" });
Service.hasMany(Appointment, { foreignKey: "serviceId" });
Appointment.belongsTo(Service, { foreignKey: "serviceId" });
Staff.hasMany(Appointment, { foreignKey: "staffId" });
Appointment.belongsTo(Staff, { foreignKey: "staffId" });
Package.hasMany(Appointment, { foreignKey: "packageId" });
Appointment.belongsTo(Package, { foreignKey: "packageId", as: "Package" });

Organization.hasMany(ExpenseCategory, { foreignKey: "organizationId" });
ExpenseCategory.belongsTo(Organization, { foreignKey: "organizationId" });

ExpenseCategory.hasMany(Expense, { foreignKey: "categoryId" });
Expense.belongsTo(ExpenseCategory, { as: "ExpenseCategory", foreignKey: "categoryId" });
Organization.hasMany(Expense, { foreignKey: "organizationId" });
Expense.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Expense, { foreignKey: "branchId" });
Expense.belongsTo(Branch, { foreignKey: "branchId" });
Bank.hasMany(Expense, { foreignKey: "paymentAccountId" });
Expense.belongsTo(Bank, { as: "PaymentAccount", foreignKey: "paymentAccountId" });
Staff.hasMany(Expense, { foreignKey: "createdById", constraints: false });
Expense.belongsTo(Staff, { as: "CreatedByStaff", foreignKey: "createdById", constraints: false });
User.hasMany(Expense, { foreignKey: "createdById", constraints: false });
Expense.belongsTo(User, { as: "CreatedByUser", foreignKey: "createdById", constraints: false });
Staff.hasMany(Expense, { foreignKey: "usedById" });
Expense.belongsTo(Staff, { as: "UsedByStaff", foreignKey: "usedById" });

// Payroll: UserSalary, Attendance, Payroll, PayrollBonusDeduction (multi-tenant: organizationId, branchId)
Organization.hasMany(UserSalary, { foreignKey: "organizationId" });
UserSalary.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(UserSalary, { foreignKey: "branchId" });
UserSalary.belongsTo(Branch, { foreignKey: "branchId" });
Staff.hasMany(UserSalary, { foreignKey: "staffId" });
UserSalary.belongsTo(Staff, { foreignKey: "staffId" });

Organization.hasMany(Attendance, { foreignKey: "organizationId" });
Attendance.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Attendance, { foreignKey: "branchId" });
Attendance.belongsTo(Branch, { foreignKey: "branchId" });
Staff.hasMany(Attendance, { foreignKey: "staffId" });
Attendance.belongsTo(Staff, { foreignKey: "staffId" });

// Staff attachments
Organization.hasMany(StaffAttachment, { foreignKey: "organizationId" });
StaffAttachment.belongsTo(Organization, { foreignKey: "organizationId" });
Staff.hasMany(StaffAttachment, { foreignKey: "staffId" });
StaffAttachment.belongsTo(Staff, { foreignKey: "staffId" });
Staff.hasMany(StaffAttachment, { foreignKey: "uploadedByStaffId", as: "UploadedAttachments" });
StaffAttachment.belongsTo(Staff, { foreignKey: "uploadedByStaffId", as: "UploadedByStaff" });
Staff.hasMany(StaffLog, { foreignKey: 'staffId', as: 'logs' });
StaffLog.belongsTo(Staff, { foreignKey: 'staffId', as: 'staff' });
Sale.hasMany(StaffLog, { foreignKey: 'saleId', as: 'staffLogs' });
StaffLog.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });

Organization.hasMany(Payroll, { foreignKey: "organizationId" });
Payroll.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Payroll, { foreignKey: "branchId" });
Payroll.belongsTo(Branch, { foreignKey: "branchId" });
Staff.hasMany(Payroll, { foreignKey: "staffId" });
Payroll.belongsTo(Staff, { foreignKey: "staffId" });
Staff.hasMany(Payroll, { foreignKey: "generatedById" });
Payroll.belongsTo(Staff, { as: "GeneratedByStaff", foreignKey: "generatedById" });

Payroll.hasMany(PayrollBonusDeduction, { foreignKey: "payrollId" });
PayrollBonusDeduction.belongsTo(Payroll, { foreignKey: "payrollId" });
Organization.hasMany(PayrollBonusDeduction, { foreignKey: "organizationId" });
PayrollBonusDeduction.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(PayrollBonusDeduction, { foreignKey: "branchId" });
PayrollBonusDeduction.belongsTo(Branch, { foreignKey: "branchId" });

// Purchases
Organization.hasMany(Purchase, { foreignKey: "organizationId" });
Purchase.belongsTo(Organization, { foreignKey: "organizationId" });
Branch.hasMany(Purchase, { foreignKey: "branchId" });
Purchase.belongsTo(Branch, { foreignKey: "branchId" });
Supplier.hasMany(Purchase, { foreignKey: "supplierId" });
Purchase.belongsTo(Supplier, { foreignKey: "supplierId" });
Purchase.hasMany(PurchaseItem, { foreignKey: "purchaseId" });
PurchaseItem.belongsTo(Purchase, { foreignKey: "purchaseId" });
Product.hasMany(PurchaseItem, { foreignKey: "productId" });
PurchaseItem.belongsTo(Product, { foreignKey: "productId" });

// Purchase Returns associations
Organization.hasMany(PurchaseReturn, { foreignKey: "organizationId" });
PurchaseReturn.belongsTo(Organization, { foreignKey: "organizationId" });

Supplier.hasMany(PurchaseReturn, { foreignKey: "supplierId", as: "PurchaseReturns" });
PurchaseReturn.belongsTo(Supplier, { foreignKey: "supplierId", as: "Supplier" });

Branch.hasMany(PurchaseReturn, { foreignKey: "branchId" });
PurchaseReturn.belongsTo(Branch, { foreignKey: "branchId" });

Purchase.hasMany(PurchaseReturn, { foreignKey: "purchaseId", as: "PurchaseReturns" });
PurchaseReturn.belongsTo(Purchase, { foreignKey: "purchaseId" });

PurchaseReturn.hasMany(PurchaseReturnItem, { foreignKey: "purchaseReturnId", as: "ReturnItems" });
PurchaseReturnItem.belongsTo(PurchaseReturn, { foreignKey: "purchaseReturnId" });
PurchaseReturnItem.belongsTo(PurchaseItem, { foreignKey: "purchaseItemId", as: "PurchaseItem" });

PurchaseReturn.hasMany(PurchaseReturnPayment, { foreignKey: "purchaseReturnId", as: "Payments" });
PurchaseReturnPayment.belongsTo(PurchaseReturn, { foreignKey: "purchaseReturnId" });

Bank.hasMany(PurchaseReturnPayment, { foreignKey: "bankId" });
PurchaseReturnPayment.belongsTo(Bank, { foreignKey: "bankId", as: "Bank" });

// Supplier Transactions (Ledger)
Supplier.hasMany(SupplierTransaction, { foreignKey: "supplierId", as: "SupplierTransactions" });
SupplierTransaction.belongsTo(Supplier, { foreignKey: "supplierId" });
Purchase.hasMany(SupplierTransaction, { foreignKey: "purchaseId", as: "SupplierTransactions", constraints: false });
SupplierTransaction.belongsTo(Purchase, { foreignKey: "purchaseId", as: "Purchase", constraints: false });
Bank.hasMany(SupplierTransaction, { foreignKey: "bankId" });
SupplierTransaction.belongsTo(Bank, { foreignKey: "bankId", as: "Bank" });
Organization.hasMany(SupplierTransaction, { foreignKey: "organizationId" });
SupplierTransaction.belongsTo(Organization, { foreignKey: "organizationId" });
// ================= PRODUCT RELATIONS =================

// Brand
Brand.hasMany(Product, { foreignKey: "brandId" });
Product.belongsTo(Brand, {
  foreignKey: "brandId",
  as: "brand",
});

// Unit
Unit.hasMany(Product, { foreignKey: "unitId" });
Product.belongsTo(Unit, {
  foreignKey: "unitId",
  as: "unit",
});

// Category
Category.hasMany(Product, { foreignKey: "categoryId" });
Product.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// SubCategory
Category.hasMany(Product, { foreignKey: "subCategoryId" });
Product.belongsTo(Category, {
  foreignKey: "subCategoryId",
  as: "subCategory",
});

// Branch
Branch.hasMany(Product, { foreignKey: "branchId" });
Product.belongsTo(Branch, {
  foreignKey: "branchId",
  as: "branch",
});

Product.hasMany(ProductVariation, { foreignKey: "productId", as: "ProductVariations" });
ProductVariation.belongsTo(Product, { foreignKey: "productId" });

// SaleItem → ProductVariation (for variation tracking)
SaleItem.belongsTo(ProductVariation, { foreignKey: "variationId", as: "ProductVariation", constraints: false });
ProductVariation.hasMany(SaleItem, { foreignKey: "variationId", as: "SaleItems", constraints: false });

// Product -> Stock
Product.hasMany(Stock, { foreignKey: "productId", as: "Stocks" });
Stock.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Branch -> Stock
Branch.hasMany(Stock, { foreignKey: "branchId", as: "Stocks" });
Stock.belongsTo(Branch, { foreignKey: "branchId", as: "branch" });

// User -> Stock
User.hasMany(Stock, { foreignKey: "userId", as: "Stocks" });
Stock.belongsTo(User, { foreignKey: "userId", as: "user" });

// StockLog Relations
Organization.hasMany(StockLog, { foreignKey: "organizationId" });
StockLog.belongsTo(Organization, { foreignKey: "organizationId" });

Branch.hasMany(StockLog, { foreignKey: "branchId" });
StockLog.belongsTo(Branch, { foreignKey: "branchId" });

Product.hasMany(StockLog, { foreignKey: "productId", as: "StockLogs" });
StockLog.belongsTo(Product, { foreignKey: "productId", as: "product" });

User.hasMany(StockLog, { foreignKey: "userId" });
StockLog.belongsTo(User, { foreignKey: "userId", as: "user" });

// StockAdjustment Relations
Organization.hasMany(StockAdjustment, { foreignKey: "organizationId" });
StockAdjustment.belongsTo(Organization, { foreignKey: "organizationId" });

Branch.hasMany(StockAdjustment, { foreignKey: "branchId" });
StockAdjustment.belongsTo(Branch, { foreignKey: "branchId" });

User.hasMany(StockAdjustment, { foreignKey: "userId" });
StockAdjustment.belongsTo(User, { foreignKey: "userId", as: "user" });

// Log mapping: Aik Adjustment ke multiple logs ho sakte hain
StockAdjustment.hasMany(StockLog, { foreignKey: "referenceId", as: "logs", constraints: false });
StockLog.belongsTo(StockAdjustment, { foreignKey: "referenceId", as: "adjustment", constraints: false });




// StockTransfer Relations
Organization.hasMany(StockTransfer, { foreignKey: "organizationId" });
StockTransfer.belongsTo(Organization, { foreignKey: "organizationId" });

StockTransfer.belongsTo(Branch, { foreignKey: "fromBranchId", as: "fromBranch" });
StockTransfer.belongsTo(Branch, { foreignKey: "toBranchId", as: "toBranch" });
StockTransfer.belongsTo(User, { foreignKey: "userId", as: "user" });

StockTransfer.hasMany(StockLog, { foreignKey: "referenceId", as: "logs", constraints: false });
StockLog.belongsTo(StockTransfer, { foreignKey: "referenceId", as: "transfer", constraints: false });

// Cash Registers
Organization.hasMany(CashRegister, { foreignKey: "organizationId" });
CashRegister.belongsTo(Organization, { foreignKey: "organizationId" });

Branch.hasMany(CashRegister, { foreignKey: "branchId" });
CashRegister.belongsTo(Branch, { foreignKey: "branchId" });

User.hasMany(CashRegister, { foreignKey: "userId", as: "CashRegisters" });
CashRegister.belongsTo(User, { foreignKey: "userId", as: "User" });

CashRegister.hasMany(CashRegisterTransaction, { foreignKey: "registerId", as: "Transactions" });
CashRegisterTransaction.belongsTo(CashRegister, { foreignKey: "registerId" });

// Activity Logs
Organization.hasMany(ActivityLog, { foreignKey: "organizationId" });
ActivityLog.belongsTo(Organization, { foreignKey: "organizationId" });

Branch.hasMany(ActivityLog, { foreignKey: "branchId" });
ActivityLog.belongsTo(Branch, { foreignKey: "branchId" });

User.hasMany(ActivityLog, { foreignKey: "userId", as: "ActivityLogs" });
ActivityLog.belongsTo(User, { foreignKey: "userId", as: "User" });

module.exports = {
  sequelize,
  Organization,
  User,
  Customer,
  Branch,
  Staff,
  StaffLog,
  Role,
  Supplier,
  Category,
  Product,
  Service,
  ServiceItem,
  StaffService,
  Sale,
  SaleItem,
  SaleReturn,
  SaleReturnItem,
  SaleReturnPayment,
  Payment,
  Bank,
  Appointment,
  ExpenseCategory,
  Expense,
  UserSalary,
  Attendance,
  Payroll,
  PayrollBonusDeduction,
  StaffAttachment,
  Purchase,
  PurchaseItem,
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnPayment,
  Unit,
  Brand,
  Variation,
  ProductVariation,
  Stock,
  StockLog,
  StockAdjustment,
  StockTransfer,
  BankTransaction,
  SupplierTransaction,
  Package,
  CashRegister,
  CashRegisterTransaction,
  ActivityLog,
};

