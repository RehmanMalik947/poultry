const { body, param, query, validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map((e) => e.msg).join(". "),
      errors: errors.array(),
    });
  }
  next();
}

const customer = {
  create: [
    body("name").trim().notEmpty().withMessage("Customer name is required"),
    body("email").optional({ values: "falsy" }).isEmail().withMessage("Invalid email format"),
    body("mobile").optional({ values: "falsy" }).trim(),
    body("creditLimit").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Credit limit must be a positive number"),
    body("openingBalance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Opening balance must be a positive number"),
    body("payTerm").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("Pay term must be a valid number"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Customer name cannot be empty"),
    body("email").optional({ values: "falsy" }).isEmail().withMessage("Invalid email format"),
    body("creditLimit").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Credit limit must be positive"),
    handleValidation,
  ],
};

const staff = {
  create: [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("email").trim().isEmail().withMessage("Valid email is required"),
    body("username").optional({ values: "falsy" }).trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("password").if(body("allowLogin").equals("true")).isLength({ min: 5 }).withMessage("Password must be at least 5 characters when login is enabled"),
    body("branchId").optional({ values: "falsy" }).isInt().withMessage("Branch ID must be a number"),
    body("role").optional().trim().notEmpty().withMessage("Role cannot be empty"),
    handleValidation,
  ],
  update: [
    body("firstName").optional().trim().notEmpty().withMessage("First name cannot be empty"),
    body("email").optional().trim().isEmail().withMessage("Valid email is required"),
    body("password").optional({ values: "falsy" }).isLength({ min: 5 }).withMessage("Password must be at least 5 characters"),
    handleValidation,
  ],
};

const product = {
  create: [
    body("name").trim().notEmpty().withMessage("Product name is required"),
    body("unitId").optional({ values: "falsy" }).isInt().withMessage("Unit ID must be a number"),
    body("brandId").optional({ values: "falsy" }).isInt().withMessage("Brand ID must be a number"),
    body("categoryId").optional({ values: "falsy" }).isInt().withMessage("Category ID must be a number"),
    body("sku").optional().trim(),
    body("purchasePriceExc").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Purchase price must be positive"),
    body("sellingPriceExc").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Selling price must be positive"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Product name cannot be empty"),
    handleValidation,
  ],
};

const service = {
  create: [
    body("serviceName").trim().notEmpty().withMessage("Service name is required"),
    body("date").optional({ values: "falsy" }).trim().notEmpty().withMessage("Date is required"),
    body("price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("duration").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("Duration must be a valid number"),
    body("categoryId").optional({ values: "falsy" }).isInt().withMessage("Category ID must be a number"),
    handleValidation,
  ],
  update: [
    body("serviceName").optional().trim().notEmpty().withMessage("Service name cannot be empty"),
    handleValidation,
  ],
};

const supplier = {
  create: [
    body("name").trim().notEmpty().withMessage("Supplier name is required"),
    body("email").optional({ values: "falsy" }).isEmail().withMessage("Invalid email format"),
    body("phone").optional({ values: "falsy" }).trim(),
    body("openingBalance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Opening balance must be positive"),
    body("advanceBalance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Advance balance must be positive"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Supplier name cannot be empty"),
    handleValidation,
  ],
};

const appointment = {
  create: [
    body("customerId").isInt({ min: 1 }).withMessage("Customer is required"),
    body("date").trim().notEmpty().withMessage("Date is required"),
    body("timeSlot").trim().notEmpty().withMessage("Time slot is required"),
    body("staffId").optional({ values: "falsy" }).isInt().withMessage("Staff ID must be a number"),
    body("branchId").optional({ values: "falsy" }).isInt().withMessage("Branch ID must be a number"),
    handleValidation,
  ],
};

const expense = {
  create: [
    body("categoryId").isInt({ min: 1 }).withMessage("Expense category is required"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
    body("date").trim().notEmpty().withMessage("Date is required"),
    body("description").optional().trim(),
    body("referenceNo").optional().trim(),
    handleValidation,
  ],
  update: [
    body("amount").optional().isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
    body("categoryId").optional().isInt({ min: 1 }).withMessage("Category is required"),
    handleValidation,
  ],
};

const branch = {
  create: [
    body("name").trim().notEmpty().withMessage("Branch name is required"),
    body("phone").optional({ values: "falsy" }).trim(),
    body("address").optional({ values: "falsy" }).trim(),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Branch name cannot be empty"),
    handleValidation,
  ],
};

const category = {
  create: [
    body("name").trim().notEmpty().withMessage("Category name is required"),
    body("code").optional({ values: "falsy" }).trim(),
    body("categoryType").optional().trim(),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Category name cannot be empty"),
    handleValidation,
  ],
};

const unit = {
  create: [
    body("name").trim().notEmpty().withMessage("Unit name is required"),
    body("shortName").trim().notEmpty().withMessage("Short name is required"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Unit name cannot be empty"),
    handleValidation,
  ],
};

const brand = {
  create: [
    body("name").trim().notEmpty().withMessage("Brand name is required"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Brand name cannot be empty"),
    handleValidation,
  ],
};

const variation = {
  create: [
    body("name").trim().notEmpty().withMessage("Variation name is required"),
    handleValidation,
  ],
};

const bank = {
  create: [
    body("bankName").trim().notEmpty().withMessage("Bank name is required"),
    body("accountHolder").optional({ values: "falsy" }).trim(),
    body("accountNumber").optional({ values: "falsy" }).trim(),
    body("accountType").optional().trim(),
    body("balance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Balance must be a positive number"),
    handleValidation,
  ],
  update: [
    body("bankName").optional().trim().notEmpty().withMessage("Bank name cannot be empty"),
    handleValidation,
  ],
};

const auth = {
  register: [
    body("organizationName").trim().notEmpty().withMessage("Organization name is required"),
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").trim().isEmail().withMessage("Valid email is required"),
    body("phone").trim().notEmpty().withMessage("Phone number is required"),
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("password").optional({ values: "falsy" }).isLength({ min: 5 }).withMessage("Password must be at least 5 characters"),
    handleValidation,
  ],
  login: [
    body("login").trim().notEmpty().withMessage("Username or email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidation,
  ],
};

const purchase = {
  create: [
    body("supplierId").optional({ values: "falsy" }).isInt().withMessage("Supplier ID must be a number"),
    body("purchaseDate").optional({ values: "falsy" }).trim().notEmpty().withMessage("Purchase date is required"),
    body("locationId").optional({ values: "falsy" }).isInt().withMessage("Location ID must be a number"),
    body("discountAmount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Discount must be positive"),
    body("shippingCharges").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Shipping charges must be positive"),
    handleValidation,
  ],
};

const expenseCategory = {
  create: [
    body("name").trim().notEmpty().withMessage("Expense category name is required"),
    body("code").optional({ values: "falsy" }).trim(),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Expense category name cannot be empty"),
    handleValidation,
  ],
};

const sale = {
  submit: [
    body("customerId").optional({ values: "falsy" }).isInt().withMessage("Customer ID must be a number"),
    body("staffId").optional({ values: "falsy" }).isInt().withMessage("Staff ID must be a number"),
    body("items").optional().isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.itemId").optional().isInt().withMessage("Item ID must be a number"),
    body("items.*.itemType").optional().isIn(["product", "service", "package"]).withMessage("Item type must be product, service, or package"),
    body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("items.*.price").optional().isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("status").optional().isIn(["paid", "unpaid", "credit", "partial", "draft"]).withMessage("Invalid sale status"),
    body("paymentMethod").optional().trim(),
    body("amountPaid").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Amount paid must be positive"),
    body("taxPercent").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Tax percent must be positive"),
    body("discountType").optional().isIn(["fixed", "percentage"]).withMessage("Discount type must be fixed or percentage"),
    body("discountAmount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Discount must be positive"),
    handleValidation,
  ],
  update: [
    body("customerId").optional({ values: "falsy" }).isInt().withMessage("Customer ID must be a number"),
    body("status").optional().isIn(["paid", "unpaid", "credit", "partial", "draft"]).withMessage("Invalid sale status"),
    handleValidation,
  ],
  addItem: [
    body("itemId").isInt({ min: 1 }).withMessage("Item ID is required"),
    body("itemType").isIn(["product", "service", "package"]).withMessage("Item type must be product, service, or package"),
    body("quantity").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    handleValidation,
  ],
  processPayment: [
    body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
    body("paymentMethod").trim().notEmpty().withMessage("Payment method is required"),
    body("bankId").optional({ values: "falsy" }).isInt().withMessage("Bank ID must be a number"),
    handleValidation,
  ],
  createReturn: [
    body("saleId").isInt({ min: 1 }).withMessage("Sale ID is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.saleItemId").isInt({ min: 1 }).withMessage("Sale item ID is required"),
    body("items.*.quantityReturned").isFloat({ min: 0.01 }).withMessage("Return quantity must be greater than 0"),
    handleValidation,
  ],
  addReturnPayment: [
    body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
    body("paymentMethod").trim().notEmpty().withMessage("Payment method is required"),
    body("bankId").optional({ values: "falsy" }).isInt().withMessage("Bank ID must be a number"),
    handleValidation,
  ],
};

const cashRegister = {
  open: [
    body("openingBalance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Opening balance must be positive"),
    body("note").optional().trim(),
    handleValidation,
  ],
  close: [
    body("closingBalance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Closing balance must be positive"),
    body("expectedBalance").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Expected balance must be positive"),
    body("note").optional().trim(),
    handleValidation,
  ],
  addTransaction: [
    body("type").isIn(["cash_in", "cash_out"]).withMessage("Type must be cash_in or cash_out"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
    body("reason").optional().trim(),
    handleValidation,
  ],
};

const stock = {
  manage: [
    body("productId").isInt({ min: 1 }).withMessage("Product ID is required"),
    body("qty").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Quantity must be positive"),
    body("type").optional().isIn(["add", "subtract", "set"]).withMessage("Type must be add, subtract, or set"),
    body("newQuantity").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("New quantity must be positive"),
    body("reason").optional().trim(),
    handleValidation,
  ],
  transfer: [
    body("productId").isInt({ min: 1 }).withMessage("Product ID is required"),
    body("fromBranchId").isInt({ min: 1 }).withMessage("Source branch ID is required"),
    body("toBranchId").isInt({ min: 1 }).withMessage("Destination branch ID is required"),
    body("qty").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0"),
    body("reason").optional().trim(),
    handleValidation,
  ],
  createAdjustment: [
    body("branchId").isInt({ min: 1 }).withMessage("Branch ID is required"),
    body("adjustmentType").optional().trim(),
    body("reason").optional().trim(),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.productId").isInt({ min: 1 }).withMessage("Product ID is required"),
    body("items.*.action").isIn(["add", "remove"]).withMessage("Action must be add or remove"),
    body("items.*.quantity").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0"),
    handleValidation,
  ],
  createBulkTransfer: [
    body("fromBranchId").isInt({ min: 1 }).withMessage("Source branch ID is required"),
    body("toBranchId").isInt({ min: 1 }).withMessage("Destination branch ID is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.productId").isInt({ min: 1 }).withMessage("Product ID is required"),
    body("items.*.quantity").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0"),
    body("notes").optional().trim(),
    handleValidation,
  ],
};

const payroll = {
  generate: [
    body("month").isInt({ min: 1, max: 12 }).withMessage("Month must be between 1 and 12"),
    body("year").isInt({ min: 2000, max: 2100 }).withMessage("Year must be between 2000 and 2100"),
    body("staffIds").optional().isArray().withMessage("Staff IDs must be an array"),
    body("branchIds").optional().isArray().withMessage("Branch IDs must be an array"),
    handleValidation,
  ],
  markPaid: [
    handleValidation,
  ],
  update: [
    body("bonus").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Bonus must be positive"),
    body("deduction").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Deduction must be positive"),
    handleValidation,
  ],
  createBonusDeduction: [
    body("type").isIn(["bonus", "deduction"]).withMessage("Type must be bonus or deduction"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("reason").optional().trim(),
    handleValidation,
  ],
};

const attendance = {
  create: [
    body("staffId").optional({ values: "falsy" }).isInt().withMessage("Staff ID must be a number"),
    body("date").trim().notEmpty().withMessage("Date is required"),
    body("status").optional().isIn(["present", "absent", "leave", "late"]).withMessage("Status must be present, absent, leave, or late"),
    body("entries").optional().isArray().withMessage("Entries must be an array"),
    body("entries.*.staffId").optional().isInt().withMessage("Staff ID must be a number"),
    body("entries.*.status").optional().isIn(["present", "absent", "leave", "late"]).withMessage("Status must be present, absent, leave, or late"),
    handleValidation,
  ],
  update: [
    body("status").optional().isIn(["present", "absent", "leave", "late"]).withMessage("Status must be present, absent, leave, or late"),
    handleValidation,
  ],
};

const package = {
  create: [
    body("packageName").trim().notEmpty().withMessage("Package name is required"),
    body("price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("services").isArray({ min: 1 }).withMessage("At least one service is required"),
    body("services.*.serviceId").isInt({ min: 1 }).withMessage("Service ID is required"),
    body("services.*.quantity").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("packageCode").optional().trim(),
    body("discountType").optional().isIn(["fixed", "percentage"]).withMessage("Discount type must be fixed or percentage"),
    body("discount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Discount must be positive"),
    body("status").optional().isIn(["active", "inactive"]).withMessage("Status must be active or inactive"),
    body("description").optional().trim(),
    handleValidation,
  ],
  update: [
    body("packageName").optional().trim().notEmpty().withMessage("Package name cannot be empty"),
    body("price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("services").optional().isArray({ min: 1 }).withMessage("At least one service is required"),
    handleValidation,
  ],
};

const role = {
  create: [
    body("name").trim().notEmpty().withMessage("Role name is required"),
    body("permissions").optional().isArray().withMessage("Permissions must be an array"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Role name cannot be empty"),
    body("permissions").optional().isArray().withMessage("Permissions must be an array"),
    handleValidation,
  ],
};

const userSalary = {
  create: [
    body("staffId").isInt({ min: 1 }).withMessage("Staff ID is required"),
    body("salaryType").isIn(["daily", "weekly", "monthly"]).withMessage("Salary type must be daily, weekly, or monthly"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("effectiveFrom").trim().notEmpty().withMessage("Effective from date is required"),
    body("branchId").optional({ values: "falsy" }).isInt().withMessage("Branch ID must be a number"),
    handleValidation,
  ],
  update: [
    body("salaryType").optional().isIn(["daily", "weekly", "monthly"]).withMessage("Salary type must be daily, weekly, or monthly"),
    body("amount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("effectiveFrom").optional().trim().notEmpty().withMessage("Effective from date cannot be empty"),
    body("status").optional().isIn(["active", "inactive"]).withMessage("Status must be active or inactive"),
    handleValidation,
  ],
};

const superAdmin = {
  login: [
    body("email").trim().isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidation,
  ],
};

const organizationRegister = {
  create: [
    body("salonName").trim().notEmpty().withMessage("Salon name is required"),
    body("email").trim().isEmail().withMessage("Valid email is required"),
    body("phone").optional().trim(),
    body("location").optional().trim(),
    body("numberOfMembers").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("Number of members must be a valid number"),
    handleValidation,
  ],
};

const organizationProfile = {
  update: [
    body("name").optional().trim().notEmpty().withMessage("Organization name cannot be empty"),
    body("email").optional().trim().isEmail().withMessage("Valid email is required"),
    body("phone").optional().trim(),
    body("emergencyContact").optional().trim(),
    body("address").optional().trim(),
    body("totalEmployees").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("Total employees must be positive"),
    body("timezone").optional().trim(),
    body("isSelfServiceEnabled").optional().isBoolean().withMessage("Self-service must be a boolean"),
    handleValidation,
  ],
};

const publicBooking = {
  book: [
    body("orgId").trim().notEmpty().withMessage("Organization ID is required"),
    body("branchId").isInt({ min: 1 }).withMessage("Branch ID is required"),
    body("date").trim().notEmpty().withMessage("Date is required"),
    body("timeSlot").trim().notEmpty().withMessage("Time slot is required"),
    body("name").trim().notEmpty().withMessage("Customer name is required"),
    body("mobile").trim().notEmpty().withMessage("Mobile number is required"),
    body("email").optional().trim().isEmail().withMessage("Invalid email format"),
    body("serviceId").optional({ values: "falsy" }).isInt().withMessage("Service ID must be a number"),
    body("staffId").optional({ values: "falsy" }).isInt().withMessage("Staff ID must be a number"),
    body("notes").optional().trim(),
    handleValidation,
  ],
};

const plan = {
  create: [
    body("name").trim().notEmpty().withMessage("Plan name is required"),
    body("price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("durationDays").isInt({ min: 1 }).withMessage("Duration days is required and must be positive"),
    handleValidation,
  ],
  update: [
    body("name").optional().trim().notEmpty().withMessage("Plan name cannot be empty"),
    body("price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("durationDays").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("Duration days must be positive"),
    handleValidation,
  ],
};

module.exports = {
  handleValidation,
  customer,
  staff,
  product,
  service,
  supplier,
  appointment,
  expense,
  branch,
  category,
  unit,
  brand,
  variation,
  bank,
  auth,
  purchase,
  expenseCategory,
  sale,
  cashRegister,
  stock,
  payroll,
  attendance,
  package,
  role,
  userSalary,
  superAdmin,
  organizationRegister,
  organizationProfile,
  publicBooking,
  plan,
};
