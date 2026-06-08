import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  businessName: z.string().optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional().default(""),
  address: z.string().optional().default(""),
  taxNumber: z.string().optional().default(""),
  creditLimit: z.coerce.number().min(0, "Must be positive").optional().default(0),
  payTerm: z.coerce.number().min(0).optional().default(0),
  openingBalance: z.coerce.number().min(0, "Must be positive").optional().default(0),
  customerGroup: z.string().optional().default(""),
  platinum: z.boolean().optional().default(false),
  customField1: z.string().optional().default(""),
  customField2: z.string().optional().default(""),
  customField3: z.string().optional().default(""),
  customField4: z.string().optional().default(""),
  customField5: z.string().optional().default(""),
  customField6: z.string().optional().default(""),
  customField7: z.string().optional().default(""),
  customField8: z.string().optional().default(""),
  customField9: z.string().optional().default(""),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

export const staffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Valid email is required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
  password: z.string().min(5, "Password must be at least 5 characters").optional().or(z.literal("")),
  role: z.string().optional().default(""),
  branchId: z.coerce.number().optional(),
  phone: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});
export type StaffFormValues = z.infer<typeof staffSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  sku: z.string().optional().default(""),
  unitId: z.coerce.number().optional(),
  brandId: z.coerce.number().optional(),
  categoryId: z.coerce.number().optional(),
  purchasePriceExc: z.coerce.number().min(0, "Must be positive").optional().default(0),
  sellingPriceExc: z.coerce.number().min(0, "Must be positive").optional().default(0),
  purchasePriceInc: z.coerce.number().min(0).optional().default(0),
  sellingPriceInc: z.coerce.number().min(0).optional().default(0),
  currentStock: z.coerce.number().int().min(0).optional().default(0),
  alertQuantity: z.coerce.number().int().min(0).optional().default(0),
  productDescription: z.string().optional().default(""),
});
export type ProductFormValues = z.infer<typeof productSchema>;

export const serviceSchema = z.object({
  serviceName: z.string().trim().min(1, "Service name is required"),
  price: z.coerce.number().min(0, "Price must be positive").default(0),
  duration: z.coerce.number().int().min(0).default(0),
  categoryId: z.coerce.number().optional(),
  description: z.string().optional().default(""),
  status: z.string().optional().default("active"),
  branchId: z.coerce.number().optional(),
});
export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  businessName: z.string().optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  alternateNumber: z.string().optional().default(""),
  address: z.string().optional().default(""),
  taxNumber: z.string().optional().default(""),
  openingBalance: z.coerce.number().min(0, "Must be positive").optional().default(0),
  advanceBalance: z.coerce.number().min(0, "Must be positive").optional().default(0),
});
export type SupplierFormValues = z.infer<typeof supplierSchema>;

export const expenseSchema = z.object({
  categoryId: z.coerce.number().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().default(""),
  referenceNo: z.string().optional().default(""),
  paymentMethod: z.string().optional().default(""),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const appointmentSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  staffId: z.coerce.number().optional(),
  serviceId: z.coerce.number().optional(),
  packageId: z.coerce.number().optional(),
  notes: z.string().optional().default(""),
});
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export const loginSchema = z.object({
  login: z.string().trim().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  password: z.string().min(5, "Password must be at least 5 characters"),
});
export type SignupFormValues = z.infer<typeof signupSchema>;

export const signupOrganizationSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  emergencyContact: z.string().optional().default(""),
  address: z.string().optional().default(""),
  totalEmployees: z.coerce.number().int().min(0).optional().default(0),
  industryCategory: z.string().optional().default(""),
  timezone: z.string().optional().default("UTC"),
});
export type SignupOrganizationFormValues = z.infer<typeof signupOrganizationSchema>;

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
});
export type BranchFormValues = z.infer<typeof branchSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  code: z.string().optional().default(""),
  description: z.string().optional().default(""),
  categoryType: z.string().optional().default(""),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

export const unitSchema = z.object({
  name: z.string().trim().min(1, "Unit name is required"),
  shortName: z.string().trim().min(1, "Short name is required"),
  allowDecimal: z.boolean().optional().default(false),
});
export type UnitFormValues = z.infer<typeof unitSchema>;

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required"),
  description: z.string().optional().default(""),
});
export type BrandFormValues = z.infer<typeof brandSchema>;

export const bankSchema = z.object({
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountHolder: z.string().optional().default(""),
  accountNumber: z.string().optional().default(""),
  accountType: z.string().optional().default(""),
  balance: z.coerce.number().min(0, "Must be positive").optional().default(0),
  note: z.string().optional().default(""),
});
export type BankFormValues = z.infer<typeof bankSchema>;

export const variationSchema = z.object({
  name: z.string().trim().min(1, "Variation name is required"),
});
export type VariationFormValues = z.infer<typeof variationSchema>;

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  code: z.string().optional().default(""),
  description: z.string().optional().default(""),
});
export type ExpenseCategoryFormValues = z.infer<typeof expenseCategorySchema>;

export const purchaseSchema = z.object({
  supplierId: z.coerce.number().optional(),
  purchaseDate: z.string().optional().default(""),
  locationId: z.coerce.number().optional(),
  discountAmount: z.coerce.number().min(0, "Must be positive").optional().default(0),
  shippingCharges: z.coerce.number().min(0, "Must be positive").optional().default(0),
  notes: z.string().optional().default(""),
  items: z.array(z.object({
    productId: z.coerce.number().min(1, "Product is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    purchasePrice: z.coerce.number().min(0, "Must be positive"),
    sellingPrice: z.coerce.number().min(0, "Must be positive"),
  })).optional().default([]),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export const saleItemSchema = z.object({
  itemId: z.coerce.number().min(1, "Item is required"),
  itemType: z.enum(["product", "service", "package"]),
  itemName: z.string().optional().default(""),
  price: z.coerce.number().min(0, "Must be positive"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  staffId: z.coerce.number().optional(),
});
export type SaleItemFormValues = z.infer<typeof saleItemSchema>;

export const saleSchema = z.object({
  customerId: z.coerce.number().optional(),
  staffId: z.coerce.number().optional(),
  status: z.enum(["paid", "credit", "partial", "draft"]).optional().default("paid"),
  paymentMethod: z.string().optional().default("cash"),
  amountPaid: z.coerce.number().min(0, "Must be positive").optional().default(0),
  taxPercent: z.coerce.number().min(0, "Must be positive").optional().default(0),
  discountType: z.enum(["fixed", "percentage"]).optional().default("fixed"),
  discountAmount: z.coerce.number().min(0, "Must be positive").optional().default(0),
  discountRate: z.coerce.number().min(0, "Must be positive").optional().default(0),
  note: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
  items: z.array(saleItemSchema).optional().default([]),
  payments: z.array(z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    bankId: z.coerce.number().optional(),
  })).optional().default([]),
});
export type SaleFormValues = z.infer<typeof saleSchema>;

export const stockManageSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  branchId: z.coerce.number().optional(),
  qty: z.coerce.number().min(0, "Must be positive").optional().default(0),
  type: z.enum(["add", "subtract", "set"]).optional(),
  reason: z.string().optional().default(""),
  alertQuantity: z.coerce.number().min(0, "Must be positive").optional().default(0),
});
export type StockManageFormValues = z.infer<typeof stockManageSchema>;

export const stockTransferSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  fromBranchId: z.coerce.number().min(1, "Source branch is required"),
  toBranchId: z.coerce.number().min(1, "Destination branch is required"),
  qty: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  reason: z.string().optional().default(""),
});
export type StockTransferFormValues = z.infer<typeof stockTransferSchema>;

export const stockAdjustmentSchema = z.object({
  branchId: z.coerce.number().min(1, "Branch is required"),
  adjustmentType: z.string().optional().default(""),
  reason: z.string().optional().default(""),
  items: z.array(z.object({
    productId: z.coerce.number().min(1, "Product is required"),
    action: z.enum(["add", "remove"]),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  })).min(1, "At least one item is required"),
});
export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

export const packageSchema = z.object({
  packageName: z.string().trim().min(1, "Package name is required"),
  packageCode: z.string().optional().default(""),
  price: z.coerce.number().min(0, "Must be positive").optional().default(0),
  discountType: z.enum(["fixed", "percentage"]).optional(),
  discount: z.coerce.number().min(0, "Must be positive").optional().default(0),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  description: z.string().optional().default(""),
  duration: z.coerce.number().int().min(0).optional().default(0),
  services: z.array(z.object({
    serviceId: z.coerce.number().min(1, "Service is required"),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").optional().default(1),
  })).min(1, "At least one service is required"),
});
export type PackageFormValues = z.infer<typeof packageSchema>;

export const attendanceSchema = z.object({
  staffId: z.coerce.number().min(1, "Staff is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "leave", "late"]).optional().default("present"),
});
export type AttendanceFormValues = z.infer<typeof attendanceSchema>;

export const userSalarySchema = z.object({
  staffId: z.coerce.number().min(1, "Staff is required"),
  salaryType: z.enum(["daily", "weekly", "monthly"]),
  amount: z.coerce.number().min(0, "Must be positive"),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  branchId: z.coerce.number().optional(),
});
export type UserSalaryFormValues = z.infer<typeof userSalarySchema>;

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  permissions: z.array(z.string()).optional().default([]),
});
export type RoleFormValues = z.infer<typeof roleSchema>;

export const registerSchema = z.object({
  openingBalance: z.coerce.number().min(0, "Must be positive").optional().default(0),
  note: z.string().optional().default(""),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const publicBookingSchema = z.object({
  orgId: z.string().min(1, "Organization is required"),
  branchId: z.coerce.number().min(1, "Branch is required"),
  date: z.string().min(1, "Date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  name: z.string().trim().min(1, "Name is required"),
  mobile: z.string().trim().min(1, "Mobile number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  serviceId: z.coerce.number().optional(),
  staffId: z.coerce.number().optional(),
  notes: z.string().optional().default(""),
});
export type PublicBookingFormValues = z.infer<typeof publicBookingSchema>;

export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  timezone: z.string().optional().default("UTC"),
  isSelfServiceEnabled: z.boolean().optional().default(false),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;
