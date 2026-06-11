import { createBrowserRouter, redirect } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { SuperAdminLayout } from "./components/layout/SuperAdminLayout";
import { Login } from "./modules/auth/Login";
import { Signup } from "./modules/auth/Signup";
import { Dashboard } from "./modules/dashboard/Dashboard";
import { FinancialDashboard } from "./modules/dashboard/FinancialDashboard";
import { ListSales } from "./modules/Sales/ListSales";
import { POS } from "./modules/Sales/POS";
import { Appointments } from "./modules/appointments/Appointments";
import AddAppointment from "./modules/appointments/AddAppointment";
import { Customers } from "./modules/customers/Customers";
import { Services } from "./modules/services/Services";

import { AddSupplier} from "./modules/suppliers/AddSupplier";
import { ListSuppliers } from "./modules/suppliers/ListSuppliers";
import { Staff } from "./modules/staff/Staff";
import { Payroll } from "./modules/staff/Payroll";
import { Reports } from "./modules/reports/Reports";
import { PurchaseSaleReport } from "./modules/reports/PurchaseSaleReport";
import { StockReport } from "./modules/reports/StockReport";
import { WhatsAppCenter } from "./modules/whatsapp/WhatsAppCenter";
import { Settings } from "./modules/settings/Settings";
import { ModulesManager } from "./modules/settings/ModulesManager";
import { SuperAdminDashboard } from "./modules/super-admin/SuperAdminDashboard";
import { SuperAdminStores } from "./modules/super-admin/SuperAdminStores";
import { SuperAdminPlans } from "./modules/super-admin/SuperAdminPlans";
import { SuperAdminPending } from "./modules/super-admin/SuperAdminPending";
import { SuperAdminActive } from "./modules/super-admin/SuperAdminActive";
import { SuperAdminBilling } from "./modules/super-admin/SuperAdminBilling";
import { SuperAdminSettings } from "./modules/super-admin/SuperAdminSettings";
import { AddPurchase } from "./modules/purchases/AddPurchase";
import { AddProduct } from "./modules/products/AddProduct";
import { ListProducts } from "./modules/products/ListProducts";
import { ListPurchases } from "./modules/purchases/ListPurchases";
import { ListPurchaseReturns } from "./modules/purchases/ListPurchaseReturns";
import { Categories } from "./modules/products/Categories";
import { Variations } from "./modules/products/Variations";
import { Units } from "./modules/products/Units";
import { Brands } from "./modules/products/Brands";
import { AddSale } from "./modules/Sales/AddSale";
import { ListAccounts } from "./modules/bank-accounts/ListAccounts";
import { ReceiveFromCustomers } from "./modules/bank-accounts/ReceiveFromCustomers";
import { PayToSupplier } from "./modules/bank-accounts/PayToSupplier";
import ManageStock from "./modules/stock/ManageStock";
import StockAdjustment from "./modules/stock/StockAdjustment";
import StockTransfer from "./modules/stock/StockTransfer";
import { Expense }  from "./modules/expense/ListExpense";
import AddExpense  from "./modules/expense/AddExpense";
import ExpenseCategories from "./modules/expense/ExpenseCategories";
import { CustomerDisplay } from "./modules/Sales/CustomerDisplay";
import { SelfService } from "./modules/public/selfService";
import { ListSellReturns } from "./modules/Sales/ListSellReturns";
import { SupplierCustomerReport } from "./modules/reports/SupplierCustomerReport";
import { StockAdjustmentReport } from "./modules/reports/StockAdjustmentReport";
import { ProductPurchaseReport } from "./modules/reports/ProductPurchaseReport";
import { ProductSellReport } from "./modules/reports/ProductSellReport";
import { PurchasePaymentReport } from "./modules/reports/PurchasePaymentReport";
import SellPaymentReport from "./modules/reports/SellPaymentReport";
import ExpenseReport from "./modules/reports/ExpenseReport";
import CashRegisterReport from "./modules/reports/CashRegisterReport";
import ActivityLogReport from "./modules/reports/ActivityLogReport";
import ProfitLossReport from "./modules/reports/ProfitLossReport";
import TaxReport from "./modules/reports/TaxReport";
import CashInHandReport from "./modules/reports/CashInHandReport";
import CashSummaryReport from "./modules/reports/CashSummaryReport";

function requireAuth() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) throw redirect("/login");
  return null;
}

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  {
    path: "/super-admin",
    loader: requireAuth,
    Component: SuperAdminLayout,
    children: [
      { index: true, Component: SuperAdminDashboard },
      { path: "stores", Component: SuperAdminStores },
      { path: "plans", Component: SuperAdminPlans },
      { path: "pending", Component: SuperAdminPending },
      { path: "active", Component: SuperAdminActive },
      { path: "billing", Component: SuperAdminBilling },
      { path: "settings", Component: SuperAdminSettings },
    ],
  },
  {
    path: "/",
    loader: requireAuth,
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "finance", Component: FinancialDashboard },
      { path: "sales", Component: ListSales },
      { path: "sales/add", Component: AddSale },

      { path: "sales/returns", Component: ListSellReturns },
      { path: "pos", Component: POS },
      { path: "appointments", Component: Appointments },
      { path: "appointments/add", Component: AddAppointment },
      { path: "appointments/edit/:id", Component: AddAppointment },
      { path: "suppliers", Component: ListSuppliers },
      { path: "suppliers/add", Component: AddSupplier },
      { path: "suppliers/edit/:id", Component: AddSupplier },
      { path: "customers", Component: Customers },
      { path: "staff", Component: Staff },
      { path: "expense", Component: Expense },
      { path: "payroll", Component: Payroll },
      { path: "reports", Component: Reports },
      { path: "reports/purchase-sale", Component: PurchaseSaleReport },
      { path: "reports/stock", Component: StockReport },
      { path: "reports/supplier-customer", Component: SupplierCustomerReport },
      { path: "reports/stock-adjustment", Component: StockAdjustmentReport },
      { path: "reports/product-purchase", Component: ProductPurchaseReport },
      { path: "reports/product-sell", Component: ProductSellReport },
      { path: "reports/purchase-payment", Component: PurchasePaymentReport },
      { path: "reports/sell-payment", Component: SellPaymentReport },
      { path: "reports/expense", Component: ExpenseReport },
      { path: "reports/cash-register", Component: CashRegisterReport },
      { path: "reports/activity-log", Component: ActivityLogReport },
      { path: "reports/profit-loss", Component: ProfitLossReport },
      { path: "reports/tax", Component: TaxReport },
      { path: "reports/cash-in-hand", Component: CashInHandReport },
      { path: "reports/cash-summary", Component: CashSummaryReport },
      { path: "whatsapp", Component: WhatsAppCenter },
      { path: "services", Component: Services },
      { path: "settings", Component: Settings },
      { path: "modules", Component: ModulesManager },
      { path: "products", Component: ListProducts },
      { path: "products/add", Component: AddProduct },
      { path: "products/edit/:id", Component: AddProduct },
      { path: "products/categories", Component: Categories },
      { path: "products/variations", Component: Variations },
      { path: "products/units", Component: Units },
      { path: "products/brands", Component: Brands },
      { path: "purchases", Component: ListPurchases },
      { path: "purchases/add", Component: AddPurchase },
      { path: "purchases/edit/:id", Component: AddPurchase },
      { path: "purchases/return", Component: ListPurchaseReturns },
{ path: "accounts", Component: ListAccounts },
{ path: "accounts/receive-from-customers", Component: ReceiveFromCustomers },
{ path: "accounts/pay-to-supplier", Component: PayToSupplier },      { path: "stock/manage", Component: ManageStock },
      { path: "stock/adjustment", Component: StockAdjustment },
      { path: "stock/transfer", Component: StockTransfer },
      { path: "/expense", Component: Expense },
      { path: "/expense/add", Component: AddExpense },
      { path: "/expense/edit/:id", Component: AddExpense },
      { path: "/expense/categories", Component: ExpenseCategories },
      { path: "services", Component: Services },  // List services ke liye
   

    ],
  },
  { path: "/customer-display", Component: CustomerDisplay },
  { path: "/self-service", Component: SelfService },
]);
