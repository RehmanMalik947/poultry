import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Download,
  Loader2,
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  MapPin,
} from 'lucide-react';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { TablePagination } from '../../components/shared/TablePagination';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { Info, Receipt, Package, Calculator, Wallet, Clock, CircleDollarSign } from 'lucide-react';
import React from 'react';
import { API_BASE } from '../../../api/ApiService';

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const str = String(dateStr).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
}

const AMOUNT_DETAIL_BREAKDOWN_TYPES = ['revenue', 'cash_sales', 'cogs', 'cash_inventory', 'gross_profit', 'net_profit', 'total_expenses'] as const;
function isBreakdownType(type: string): type is (typeof AMOUNT_DETAIL_BREAKDOWN_TYPES)[number] {
  return AMOUNT_DETAIL_BREAKDOWN_TYPES.includes(type as any);
}
const SHEET_BREAKDOWN_TYPES = ['receivable_unpaid', 'receivable_partial', 'receivable_total', 'cash_total_outflow', 'cash_net'] as const;
function showBreakdownSheet(amountDetail: { type: string; label?: string } | null): boolean {
  return !!amountDetail && (
    isBreakdownType(amountDetail.type) ||
    (amountDetail.type === 'expense_category' && !!amountDetail.label) ||
    SHEET_BREAKDOWN_TYPES.includes(amountDetail.type as any)
  );
}

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type RevenueBreakdownSale = {
  saleId: number;
  createdAt: string;
  total: number;
  items: { serviceName: string; price: number; quantity: number; lineTotal: number }[];
};
type RevenueBreakdownData = { sales: RevenueBreakdownSale[]; totalRevenue: number };
type CogsBreakdownLine = { saleId: number; inventoryName: string; quantity: number; costPrice: number; lineCost: number };
type CogsBreakdownData = { lines: CogsBreakdownLine[]; totalCogs: number };
type ExpenseCategoryBreakdownData = {
  categoryName: string;
  expenses: { id: number; date: string; description: string | null; amount: number }[];
  totalAmount: number;
};

type ProfitLossData = {
  period: { month?: number; year?: number; fromDate?: string; toDate?: string };
  revenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  expensesByCategory: { categoryName: string; amount: number }[];
  netProfit: number;
};

type CashFlowData = {
  period: { month?: number; year?: number; fromDate?: string; toDate?: string };
  inflows: { label: string; amount: number }[];
  outflows: { label: string; amount: number }[];
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
};

type ReceivablesData = {
  summary: {
    unpaidSalesTotal: number;
    pendingFromPartialTotal: number;
    totalReceivables: number;
    unpaidCount: number;
    partialCount: number;
  };
  items: {
    id: number;
    clientName: string | null;
    clientPhone: string | null;
    createdAt: string;
    total: number;
    totalPaid: number;
    remainingBalance: number;
    status: string;
  }[];
};

type PayablesData = {
  summary: {
    totalPurchaseDues: number;
    totalSaleReturnDues: number;
    totalPayables: number;
    purchaseCount: number;
    saleReturnCount: number;
  };
  items: {
    id: string;
    type: string;
    referenceNo: string;
    partyName: string | null;
    partyPhone: string | null;
    date: string;
    total: number;
    totalPaid: number;
    remainingBalance: number;
    status: string;
  }[];
};

function formatPeriodLabel(period: ProfitLossData['period'] | CashFlowData['period'] | undefined): string {
  if (!period) return 'Select range';
  if (period.fromDate && period.toDate) {
    const d1 = new Date(period.fromDate);
    const d2 = new Date(period.toDate);
    const fromLabel = d1.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const toLabel = d2.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;
  }
  if (period.month != null && period.year != null) return `${MONTHS[period.month]} ${period.year}`;
  return 'Select range';
}

function getDefaultFromDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
function getDefaultToDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

const AMOUNT_EXPLANATIONS: Record<string, { title: string; howGenerated: string; whereAppears: string[] }> = {
  revenue: {
    title: 'Revenue',
    howGenerated: 'Sum of all paid POS sales (status = Paid) for the selected period. Each sale total includes subtotal + tax. Below are the services and prices that make up this total.',
    whereAppears: ['Overview (Revenue card)', 'Profit & Loss (Revenue row)', 'Cash Flow (Sales inflow)'],
  },
  cogs: {
    title: 'Cost of Goods Sold',
    howGenerated: 'Cost of stock used when customers paid for sales. Calculated from "POS Sale #" utilization records: for each paid sale, ingredients (quantity × cost price) are summed. Only sales that still exist are counted.',
    whereAppears: ['Overview (Cost of Goods Sold card)', 'Profit & Loss (Cost of Goods Sold row)', 'Cash Flow (Cost of Stock outflow)'],
  },
  total_expenses: {
    title: 'Total Expenses',
    howGenerated: 'Sum of all expenses from the Expense module for the selected period, grouped by expense category.',
    whereAppears: ['Overview (Total Expenses card)', 'Profit & Loss (expense category rows)', 'Cash Flow (expense category outflows)'],
  },
  expense_category: {
    title: 'Expense Category',
    howGenerated: 'Sum of expenses in this category from the Expense module for the selected period.',
    whereAppears: ['Profit & Loss (this category row)', 'Cash Flow (this category in Outflows)'],
  },
  gross_profit: {
    title: 'Gross Profit',
    howGenerated: 'Revenue minus Cost of Goods Sold. Represents profit before operating expenses.',
    whereAppears: ['Profit & Loss (Gross Profit row)'],
  },
  net_profit: {
    title: 'Net Profit',
    howGenerated: 'Revenue minus Total Expenses (operating expenses). Does not subtract COGS twice; P&L shows Revenue − COGS = Gross Profit, then expense categories. Net Profit = Revenue − Total Expenses.',
    whereAppears: ['Overview (Net Profit card)', 'Profit & Loss (Net Profit row)'],
  },
  cash_sales: {
    title: 'Sales (Cash Inflow)',
    howGenerated: 'Same as Revenue: total amount from paid POS sales in the selected period. Money received from customers.',
    whereAppears: ['Cash Flow (Sales row under Inflows)', 'Profit & Loss (Revenue)', 'Overview (Revenue)'],
  },
  cash_inventory: {
    title: 'Cost of Stock (Cash Outflow)',
    howGenerated: 'Same as Cost of Goods Sold: cost of stock used for paid sales in the period. Treated as cash outflow in the cash flow statement.',
    whereAppears: ['Cash Flow (Cost of Stock row under Outflows)', 'Profit & Loss (Cost of Goods Sold)', 'Overview (COGS)'],
  },
  cash_net: {
    title: 'Net Cash Flow',
    howGenerated: 'Total Inflow (Sales) minus Total Outflow (Cost of Stock + all expense categories). Positive means more cash in than out for the period.',
    whereAppears: ['Cash Flow (Net Cash Flow row)'],
  },
  cash_total_outflow: {
    title: 'Total Outflow',
    howGenerated: 'Sum of Cost of Stock (COGS) and all expense categories for the period. Money going out.',
    whereAppears: ['Cash Flow (Total Outflow row)'],
  },
  receivable_unpaid: {
    title: 'Unpaid Sales',
    howGenerated: 'Sum of sale totals where status is Unpaid (no payment received yet). Full amount due from customers.',
    whereAppears: ['Receivables (Unpaid Sales card)', 'Receivables table (rows with status Unpaid)'],
  },
  receivable_partial: {
    title: 'Pending Client Payments',
    howGenerated: 'Sum of remaining balance (total − amount already paid) for sales with status Partial. Amount still owed by customers who have paid in part.',
    whereAppears: ['Receivables (Pending Client Payments card)', 'Receivables table (Balance Due for Partial sales)'],
  },
  receivable_total: {
    title: 'Total Receivables',
    howGenerated: 'Unpaid Sales total + Pending Client Payments total. All money owed to you by customers that has not yet been collected.',
    whereAppears: ['Receivables (Total Receivables card)'],
  },
  payable_purchase: {
    title: 'Purchase Dues',
    howGenerated: 'Sum of remaining balances for purchases with status Due or Partial. Money owed to suppliers.',
    whereAppears: ['Payables (Purchase Dues card)'],
  },
  payable_sale_return: {
    title: 'Sale Return Dues',
    howGenerated: 'Sum of remaining balances for sale returns with status Due or Partial. Money owed to customers.',
    whereAppears: ['Payables (Sale Return Dues card)'],
  },
  payable_total: {
    title: 'Total Payables',
    howGenerated: 'Purchase Dues + Sale Return Dues. All money owed to others.',
    whereAppears: ['Payables (Total Payables card)'],
  },
};



export function FinancialDashboard() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const [plFromDate, setPlFromDate] = useState(getDefaultFromDate);
  const [plToDate, setPlToDate] = useState(getDefaultToDate);
  const [plFromPickerOpen, setPlFromPickerOpen] = useState(false);
  const [plToPickerOpen, setPlToPickerOpen] = useState(false);
  const [plData, setPlData] = useState<ProfitLossData | null>(null);
  const [plLoading, setPlLoading] = useState(false);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);
  const [receivablesData, setReceivablesData] = useState<ReceivablesData | null>(null);
  const [receivablesLoading, setReceivablesLoading] = useState(false);
  const RECEIVABLES_PAGE_SIZE = 10;
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [payablesData, setPayablesData] = useState<PayablesData | null>(null);
  const [payablesLoading, setPayablesLoading] = useState(false);
  const PAYABLES_PAGE_SIZE = 10;
  const [payablesPage, setPayablesPage] = useState(1);
  const [amountDetail, setAmountDetail] = useState<{ type: string; label?: string } | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownData | null>(null);
  const [cogsBreakdown, setCogsBreakdown] = useState<CogsBreakdownData | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseCategoryBreakdownData | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);

  const openAmountDetail = (type: string, label?: string) => () => setAmountDetail({ type, label });

  const getDateRangeParams = useCallback(() => {
    const fromDate = plFromDate || getDefaultFromDate();
    const toDate = plToDate || getDefaultToDate();
    if (fromDate > toDate) return { fromDate: toDate, toDate: fromDate };
    return { fromDate, toDate };
  }, [plFromDate, plToDate]);

  const fetchProfitLoss = useCallback(async () => {
    setPlLoading(true);
    try {
      const { fromDate, toDate } = getDateRangeParams();
      const res = await fetch(
        `${API_BASE}/finance/profit-loss?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const json = await res.json();
      if (json.success && json.data) setPlData(json.data);
      else setPlData(null);
    } catch {
      setPlData(null);
    } finally {
      setPlLoading(false);
    }
  }, [getDateRangeParams, selectedBranchId]);

  const fetchCashFlow = useCallback(async () => {
    setCashFlowLoading(true);
    try {
      const { fromDate, toDate } = getDateRangeParams();
      const res = await fetch(
        `${API_BASE}/finance/cash-flow?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const json = await res.json();
      if (json.success && json.data) setCashFlowData(json.data);
      else setCashFlowData(null);
    } catch {
      setCashFlowData(null);
    } finally {
      setCashFlowLoading(false);
    }
  }, [getDateRangeParams, selectedBranchId]);

  const fetchReceivables = useCallback(async () => {
    setReceivablesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finance/receivables`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const json = await res.json();
      if (json.success && json.data) setReceivablesData(json.data);
      else setReceivablesData(null);
    } catch {
      setReceivablesData(null);
    } finally {
      setReceivablesLoading(false);
    }
  }, [selectedBranchId]);

  const fetchPayables = useCallback(async () => {
    setPayablesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finance/payables`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const json = await res.json();
      if (json.success && json.data) setPayablesData(json.data);
      else setPayablesData(null);
    } catch {
      setPayablesData(null);
    } finally {
      setPayablesLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchProfitLoss();
    fetchCashFlow();
  }, [fetchProfitLoss, fetchCashFlow]);

  useEffect(() => {
    fetchReceivables();
    fetchPayables();
  }, [fetchReceivables, fetchPayables]);

  useEffect(() => {
    setReceivablesPage(1);
  }, [receivablesData?.items?.length]);

  useEffect(() => {
    setPayablesPage(1);
  }, [payablesData?.items?.length]);

  useEffect(() => {
    if (!amountDetail) {
      setRevenueBreakdown(null);
      setCogsBreakdown(null);
      setExpenseBreakdown(null);
      return;
    }
    const type = amountDetail.type;
    const needRevenue = ['revenue', 'cash_sales', 'gross_profit', 'net_profit'].includes(type);
    const needCogs = ['cogs', 'cash_inventory', 'gross_profit', 'net_profit'].includes(type);
    const needExpenseCategory = type === 'expense_category' && amountDetail.label;

    if (!needRevenue && !needCogs && !needExpenseCategory) return;

    let cancelled = false;
    setBreakdownLoading(true);
    setRevenueBreakdown(null);
    setCogsBreakdown(null);
    setExpenseBreakdown(null);
    const { fromDate, toDate } = getDateRangeParams();
    const headers = getAuthHeadersWithBranch(selectedBranchId);

    const revPromise = needRevenue
      ? fetch(`${API_BASE}/finance/revenue-breakdown?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`, { headers }).then((r) => r.json())
      : Promise.resolve(null);
    const cogsPromise = needCogs
      ? fetch(`${API_BASE}/finance/cogs-breakdown?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`, { headers }).then((r) => r.json())
      : Promise.resolve(null);
    const expensePromise = needExpenseCategory
      ? fetch(`${API_BASE}/finance/expense-category-breakdown?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&categoryName=${encodeURIComponent(amountDetail.label!)}`, { headers }).then((r) => r.json())
      : Promise.resolve(null);

    Promise.all([revPromise, cogsPromise, expensePromise])
      .then(([revRes, cogsRes, expRes]) => {
        if (cancelled) return;
        if (needRevenue && revRes?.success && revRes?.data) setRevenueBreakdown(revRes.data);
        if (needCogs && cogsRes?.success && cogsRes?.data) setCogsBreakdown(cogsRes.data);
        if (needExpenseCategory && expRes?.success && expRes?.data) setExpenseBreakdown(expRes.data);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setBreakdownLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [amountDetail, getDateRangeParams, selectedBranchId]);

  const plRows: { category: string; amount: number; type: 'income' | 'expense'; bold?: boolean }[] = [];
  if (plData) {
    plRows.push({ category: 'Revenue', amount: plData.revenue, type: 'income' });
    plRows.push({ category: 'Cost of Goods Sold (Stock)', amount: -plData.cogs, type: 'expense' });
    plRows.push({ category: 'Gross Profit', amount: plData.grossProfit, type: 'income', bold: true });
    plData.expensesByCategory.forEach((e) => {
      plRows.push({ category: e.categoryName, amount: -e.amount, type: 'expense' });
    });
    plRows.push({ category: 'Net Profit', amount: plData.netProfit, type: 'income', bold: true });
  }


  const handleDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'allTime') => {
    const today = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'allTime') {
      setPlFromDate('2000-01-01');
      setPlToDate(format(today));
    } else if (preset === 'today') {
      const dateStr = format(today);
      setPlFromDate(dateStr);
      setPlToDate(dateStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dateStr = format(yesterday);
      setPlFromDate(dateStr);
      setPlToDate(dateStr);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setPlFromDate(format(past));
      setPlToDate(format(today));
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setPlFromDate(format(past));
      setPlToDate(format(today));
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setPlFromDate(format(start));
      setPlToDate(format(end));
    } else if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setPlFromDate(format(start));
      setPlToDate(format(end));
    }

    setDatePresetOpen(false);
  };
  const handleExport = () => {
    const periodLabel = formatPeriodLabel(plData?.period ?? cashFlowData?.period) || `${plFromDate} to ${plToDate}`;
    const lines: string[] = ['Financial Report', `Period: ${periodLabel}`, ''];

    if (plData) {
      lines.push('Profit & Loss', 'Category,Amount', `Revenue,${plData.revenue}`, `Cost of Goods Sold,${plData.cogs}`, `Gross Profit,${plData.grossProfit}`);
      plData.expensesByCategory.forEach((e) => lines.push(`${e.categoryName},${e.amount}`));
      lines.push(`Net Profit,${plData.netProfit}`, '');
    }
    if (cashFlowData) {
      lines.push('Cash Flow', 'Category,Inflow,Outflow');
      cashFlowData.inflows.forEach((i) => lines.push(`${i.label},${i.amount},`));
      cashFlowData.outflows.forEach((o) => lines.push(`${o.label},,${o.amount}`));
      lines.push(`Total,${cashFlowData.totalInflow},${cashFlowData.totalOutflow}`, `Net Cash Flow,${cashFlowData.netCashFlow}`, '');
    }
    if (lines.length <= 3) {
      lines.push('No data for the selected period.');
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${plFromDate}-to-${plToDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 space-y-3 w-full">
      {/* Page Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Financial Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Detailed financial visibility for decision making
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-accent"
              >
                <span className="flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 shrink-0 text-primary" />
                  {selectedBranch ? selectedBranch.name : 'All branches'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="min-w-[220px] z-[100] p-1" sideOffset={8}>
              <div className="max-h-[280px] overflow-y-auto" role="listbox">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchId(null);
                    setBranchPopoverOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${selectedBranchId === null ? 'bg-secondary font-medium text-tertiary' : ''}`}
                >
                  <span>All branches</span>
                  {selectedBranchId === null && <Check className="w-4 h-4 shrink-0 text-primary" />}
                </button>
                {branches.map((branch) => {
                  const isSelected = selectedBranchId === branch.id;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setBranchPopoverOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${isSelected ? 'bg-secondary font-medium text-tertiary' : ''}`}
                    >
                      <span>{branch.name}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={datePresetOpen} onOpenChange={setDatePresetOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                <CalendarIcon className="w-4 h-4" />
                Date Range
                <ChevronDown className="w-4 h-4 text-white/80 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="end">
              <div className="flex flex-col space-y-0.5">
                <button type="button" onClick={() => handleDatePreset('allTime')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">All Time</button>
                <button type="button" onClick={() => handleDatePreset('today')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Today</button>
                <button type="button" onClick={() => handleDatePreset('yesterday')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Yesterday</button>
                <button type="button" onClick={() => handleDatePreset('7days')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last 7 Days</button>
                <button type="button" onClick={() => handleDatePreset('30days')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last 30 Days</button>
                <button type="button" onClick={() => handleDatePreset('thisMonth')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">This Month</button>
                <button type="button" onClick={() => handleDatePreset('lastMonth')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last Month</button>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleExport} className="gap-2 h-9 font-medium bg-primary hover:bg-primary/90" type="button">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v || 'overview')} className="space-y-3">
        <TabsList className="bg-white border p-1 h-12">
          <TabsTrigger value="overview" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <TrendingUp className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Wallet className="w-4 h-4 mr-2" /> Cash Flow
          </TabsTrigger>
          <TabsTrigger value="receivables" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <CreditCard className="w-4 h-4 mr-2" /> Receivables
          </TabsTrigger>
          <TabsTrigger value="payables" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Receipt className="w-4 h-4 mr-2" /> Payables
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 focus-visible:outline-none">
          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">From</Label>
                  <Popover open={plFromPickerOpen} onOpenChange={setPlFromPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-[220px] justify-start gap-2 font-normal text-left border-gray-200 bg-white hover:border-primary hover:bg-accent"
                      >
                        <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                        {plFromDate ? formatDisplayDate(plFromDate) : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={plFromDate ? new Date(plFromDate + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setPlFromDate(`${y}-${m}-${d}`);
                            setPlFromPickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">To</Label>
                  <Popover open={plToPickerOpen} onOpenChange={setPlToPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-[220px] justify-start gap-2 font-normal text-left border-gray-200 bg-white hover:border-primary hover:bg-accent"
                      >
                        <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                        {plToDate ? formatDisplayDate(plToDate) : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={plToDate ? new Date(plToDate + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setPlToDate(`${y}-${m}-${d}`);
                            setPlToPickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-sm text-muted-foreground">Report from selected date range</span>
              </div>
            </CardContent>
          </Card>

          {plLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading overview…
            </div>
          ) : (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={openAmountDetail('revenue')}
                  className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="p-3 bg-green-50 rounded-xl w-fit mb-4">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">{plData ? formatCurrency(plData.revenue) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">From sales</p>
                </button>
                <button
                  type="button"
                  onClick={openAmountDetail('cogs')}
                  className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="p-3 bg-amber-50 rounded-xl w-fit mb-4">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Cost of Goods Sold</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">{plData ? formatCurrency(plData.cogs) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Inventory cost</p>
                </button>
                <button
                  type="button"
                  onClick={openAmountDetail('total_expenses')}
                  className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="p-3 bg-orange-50 rounded-xl w-fit mb-4">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">{plData ? formatCurrency(plData.totalExpenses) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Operating expenses</p>
                </button>
                <button
                  type="button"
                  onClick={openAmountDetail('net_profit')}
                  className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className={`p-3 rounded-xl w-fit mb-4 ${plData && plData.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <DollarSign className={`w-5 h-5 ${plData && plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold tracking-tight mt-1 ${plData && plData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{plData ? formatCurrency(plData.netProfit) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plData && plData.revenue > 0 ? `Margin: ${((plData.netProfit / plData.revenue) * 100).toFixed(1)}%` : 'Revenue − COGS − Expenses'}
                  </p>
                </button>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue vs Expenses</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatPeriodLabel(plData?.period)}</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={
                          plData
                            ? [
                              {
                                month: formatPeriodLabel(plData.period),
                                revenue: plData.revenue,
                                expenses: plData.totalExpenses,
                              },
                            ]
                            : []
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatPeriodLabel(plData?.period)}</p>
                  </CardHeader>
                  <CardContent>
                    {plData && plData.expensesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={plData.expensesByCategory.map((e, i) => ({
                              name: e.categoryName,
                              value: e.amount,
                              color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'][i % 6],
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            dataKey="value"
                          >
                            {plData.expensesByCategory.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No expenses in this period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Payables Tab */}
        <TabsContent value="payables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Payable</CardTitle>
            </CardHeader>
            <CardContent>
              {payablesLoading ? (
                <p className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </p>
              ) : !payablesData ? (
                <p className="py-8 text-center text-muted-foreground">
                  Could not load payables.
                </p>
              ) : payablesData.summary.totalPayables === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No pending payables at this time.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    <button
                      type="button"
                      onClick={openAmountDetail('payable_purchase')}
                      className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="p-3 bg-amber-50 rounded-xl w-fit mb-4">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Purchase Dues</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                        {formatCurrency(payablesData.summary.totalPurchaseDues)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{payablesData.summary.purchaseCount} pending purchase(s)</p>
                    </button>
                    <button
                      type="button"
                      onClick={openAmountDetail('payable_sale_return')}
                      className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="p-3 bg-blue-50 rounded-xl w-fit mb-4">
                        <Receipt className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Sale Return Dues</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                        {formatCurrency(payablesData.summary.totalSaleReturnDues)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{payablesData.summary.saleReturnCount} pending return(s)</p>
                    </button>
                    <button
                      type="button"
                      onClick={openAmountDetail('payable_total')}
                      className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="p-3 bg-red-50 rounded-xl w-fit mb-4">
                        <CircleDollarSign className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Total Payables</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                        {formatCurrency(payablesData.summary.totalPayables)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total outstanding amount</p>
                    </button>
                  </div>
                  <Table>
                    <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                      <TableRow className="hover:bg-primary/90 border-none">
                        <TableHead className="text-white font-semibold">Date</TableHead>
                        <TableHead className="text-white font-semibold">Type</TableHead>
                        <TableHead className="text-white font-semibold">Ref No.</TableHead>
                        <TableHead className="text-white font-semibold">Party</TableHead>
                        <TableHead className="text-white font-semibold text-right">Total</TableHead>
                        <TableHead className="text-white font-semibold text-right">Paid</TableHead>
                        <TableHead className="text-white font-semibold text-right">Balance Due</TableHead>
                        <TableHead className="text-white font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payablesData.items
                        .slice((payablesPage - 1) * PAYABLES_PAGE_SIZE, payablesPage * PAYABLES_PAGE_SIZE)
                        .map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(row.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${row.type === 'Purchase' ? 'bg-purple-100 text-purple-800' : 'bg-pink-100 text-pink-800'}`}>
                                {row.type}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-gray-700">{row.referenceNo}</TableCell>
                            <TableCell>
                              {row.partyName ?? '—'}
                              {row.partyPhone ? (
                                <span className="block text-xs text-muted-foreground">{row.partyPhone}</span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(row.totalPaid)}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">{formatCurrency(row.remainingBalance)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${row.status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {row.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    total={payablesData.items.length}
                    page={payablesPage}
                    pageSize={PAYABLES_PAGE_SIZE}
                    onPageChange={setPayablesPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <CardTitle>Cash Flow Statement</CardTitle>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">From</Label>
                  <Popover open={plFromPickerOpen} onOpenChange={setPlFromPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-[220px] sm:w-[280px] justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        {plFromDate ? formatDisplayDate(plFromDate) : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={plFromDate ? new Date(plFromDate + 'T12:00:00') : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setPlFromDate(`${y}-${m}-${d}`); setPlFromPickerOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">To</Label>
                  <Popover open={plToPickerOpen} onOpenChange={setPlToPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-[220px] sm:w-[280px] justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        {plToDate ? formatDisplayDate(plToDate) : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={plToDate ? new Date(plToDate + 'T12:00:00') : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setPlToDate(`${y}-${m}-${d}`); setPlToPickerOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <p className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </p>
              ) : !cashFlowData ? (
                <p className="py-8 text-center text-muted-foreground">
                  No cash flow data for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                    <TableRow className="hover:bg-primary/90 border-none">
                      <TableHead className="text-white font-semibold">Category</TableHead>
                      <TableHead className="text-white font-semibold text-right">Inflow</TableHead>
                      <TableHead className="text-white font-semibold text-right">Outflow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlowData.inflows.map((item, index) => (
                      <TableRow
                        key={`in-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={openAmountDetail('cash_sales')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAmountDetail('cash_sales')(); } }}
                        className="cursor-pointer hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <TableCell>{item.label}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                      </TableRow>
                    ))}
                    {cashFlowData.outflows.map((item, index) => {
                      const isCogs = item.label === 'Cost of Inventory (COGS)';
                      return (
                        <TableRow
                          key={`out-${index}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => openAmountDetail(isCogs ? 'cash_inventory' : 'expense_category', isCogs ? undefined : item.label)()}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAmountDetail(isCogs ? 'cash_inventory' : 'expense_category', isCogs ? undefined : item.label)(); } }}
                          className="cursor-pointer hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          <TableCell className="pl-8">{item.label}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow
                      role="button"
                      tabIndex={0}
                      onClick={openAmountDetail('cash_sales')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAmountDetail('cash_sales')(); } }}
                      className="bg-muted/50 font-medium cursor-pointer hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <TableCell>Total Inflow</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(cashFlowData.totalInflow)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                    <TableRow
                      role="button"
                      tabIndex={0}
                      onClick={openAmountDetail('cash_total_outflow')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAmountDetail('cash_total_outflow')(); } }}
                      className="bg-muted/50 font-medium cursor-pointer hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <TableCell>Total Outflow</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(cashFlowData.totalOutflow)}</TableCell>
                    </TableRow>
                    <TableRow
                      role="button"
                      tabIndex={0}
                      onClick={openAmountDetail('cash_net')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAmountDetail('cash_net')(); } }}
                      className="font-bold bg-gray-100 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <TableCell>Net Cash Flow</TableCell>
                      <TableCell className="text-right text-green-600">{cashFlowData.netCashFlow >= 0 ? formatCurrency(cashFlowData.netCashFlow) : '—'}</TableCell>
                      <TableCell className="text-right text-red-600">{cashFlowData.netCashFlow < 0 ? formatCurrency(-cashFlowData.netCashFlow) : '—'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Unpaid sales, customer credit / pending client payments, and amounts not yet collected
              </p>
            </CardHeader>
            <CardContent>
              {receivablesLoading ? (
                <p className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </p>
              ) : !receivablesData ? (
                <p className="py-8 text-center text-muted-foreground">
                  Could not load receivables.
                </p>
              ) : receivablesData.summary.totalReceivables === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No pending receivables at this time.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    <button
                      type="button"
                      onClick={openAmountDetail('receivable_unpaid')}
                      className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="p-3 bg-amber-50 rounded-xl w-fit mb-4">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Unpaid Sales</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                        {formatCurrency(receivablesData.summary.unpaidSalesTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{receivablesData.summary.unpaidCount} sale(s) not paid</p>
                    </button>
                    <button
                      type="button"
                      onClick={openAmountDetail('receivable_partial')}
                      className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="p-3 bg-blue-50 rounded-xl w-fit mb-4">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Pending Client Payments</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                        {formatCurrency(receivablesData.summary.pendingFromPartialTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{receivablesData.summary.partialCount} partial payment(s) remaining</p>
                    </button>
                    <button
                      type="button"
                      onClick={openAmountDetail('receivable_total')}
                      className="w-full text-left rounded-lg border border-gray-100 bg-card shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="p-3 bg-green-50 rounded-xl w-fit mb-4">
                        <CircleDollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Total Receivables</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                        {formatCurrency(receivablesData.summary.totalReceivables)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Outstanding from customers</p>
                    </button>
                  </div>
                  <Table>
                    <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                      <TableRow className="hover:bg-primary/90 border-none">
                        <TableHead className="text-white font-semibold">Date</TableHead>
                        <TableHead className="text-white font-semibold">Client</TableHead>
                        <TableHead className="text-white font-semibold text-right">Total</TableHead>
                        <TableHead className="text-white font-semibold text-right">Paid</TableHead>
                        <TableHead className="text-white font-semibold text-right">Balance Due</TableHead>
                        <TableHead className="text-white font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivablesData.items
                        .slice((receivablesPage - 1) * RECEIVABLES_PAGE_SIZE, receivablesPage * RECEIVABLES_PAGE_SIZE)
                        .map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(row.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell>
                              {row.clientName ?? '—'}
                              {row.clientPhone ? (
                                <span className="block text-xs text-muted-foreground">{row.clientPhone}</span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(row.totalPaid)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(row.remainingBalance)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${row.status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {row.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    total={receivablesData.items.length}
                    page={receivablesPage}
                    limit={RECEIVABLES_PAGE_SIZE}
                    onPageChange={setReceivablesPage}
                    itemLabel="rows"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report-style sheet for Revenue / COGS / Gross / Net / Expense category breakdown */}
      <Sheet open={showBreakdownSheet(amountDetail)} onOpenChange={(open) => !open && setAmountDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden">
          {amountDetail && showBreakdownSheet(amountDetail) && (
            <>
              <SheetHeader className="border-b bg-gradient-to-b from-muted/30 to-background px-6 py-5 shrink-0">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div>
                    <SheetTitle className="text-xl font-bold text-foreground">
                      {amountDetail.type === 'expense_category' && amountDetail.label
                        ? amountDetail.label
                        : AMOUNT_EXPLANATIONS[amountDetail.type]?.title ?? amountDetail.type}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plFromDate && plToDate ? `${plFromDate} – ${plToDate}` : 'Selected period'}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                    Finance report
                  </span>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {breakdownLoading && (isBreakdownType(amountDetail.type) || amountDetail.type === 'expense_category') && amountDetail.type !== 'total_expenses' ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Total Expenses – by category (same style as Revenue breakdown) */}
                    {amountDetail.type === 'total_expenses' && plData && (
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40">
                              <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </span>
                            Total Expenses – by category
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {plData.expensesByCategory && plData.expensesByCategory.length > 0 ? (
                            <div className="rounded-lg border bg-card">
                              <div className="max-h-72 overflow-y-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Category</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {plData.expensesByCategory.map((row, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="font-medium">{row.categoryName}</TableCell>
                                        <TableCell className="text-right font-semibold text-orange-700 dark:text-orange-400">{formatCurrency(row.amount)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950/20 border-t font-semibold text-orange-800 dark:text-orange-200">
                                Total expenses: {formatCurrency(plData.totalExpenses)}
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground py-6 text-center">No expenses in the selected period.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Receivables – itemized list (Unpaid / Partial / Total) */}
                    {['receivable_unpaid', 'receivable_partial', 'receivable_total'].includes(amountDetail.type) && receivablesData && (
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-blue-600" />
                            {amountDetail.type === 'receivable_unpaid' && 'Unpaid Sales'}
                            {amountDetail.type === 'receivable_partial' && 'Pending Client Payments'}
                            {amountDetail.type === 'receivable_total' && 'Total Receivables'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {(() => {
                            const items = amountDetail.type === 'receivable_unpaid'
                              ? receivablesData.items.filter((i) => i.status === 'unpaid')
                              : amountDetail.type === 'receivable_partial'
                                ? receivablesData.items.filter((i) => i.status === 'partial')
                                : receivablesData.items;
                            if (items.length === 0) {
                              return <p className="text-muted-foreground py-6 text-center">No items in this category.</p>;
                            }
                            return (
                              <div className="rounded-lg border bg-card">
                                <div className="max-h-72 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Paid</TableHead>
                                        <TableHead className="text-right">Balance Due</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((row) => (
                                        <TableRow key={row.id}>
                                          <TableCell className="font-medium">{row.createdAt ? new Date(row.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}</TableCell>
                                          <TableCell>{row.clientName ?? '—'} {row.clientPhone ? `(${row.clientPhone})` : ''}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                                          <TableCell className="text-right text-green-600">{formatCurrency(row.totalPaid)}</TableCell>
                                          <TableCell className="text-right font-semibold">{formatCurrency(row.remainingBalance)}</TableCell>
                                          <TableCell>
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${row.status === 'partial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                              {row.status}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-t font-semibold text-blue-800 dark:text-blue-200">
                                  Total: {formatCurrency(items.reduce((s, i) => s + i.remainingBalance, 0))}
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    {/* Cash Flow – Total Outflow breakdown */}
                    {amountDetail.type === 'cash_total_outflow' && cashFlowData && (
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-red-600" />
                            Total Outflow – breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="rounded-lg border bg-card">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>Category</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cashFlowData.outflows.map((item, i) => (
                                  <TableRow key={i}>
                                    <TableCell>{item.label}</TableCell>
                                    <TableCell className="text-right font-semibold text-red-700 dark:text-red-400">{formatCurrency(item.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <div className="px-4 py-3 bg-red-50 dark:bg-red-950/20 border-t font-semibold text-red-800 dark:text-red-200">
                              Total Outflow: {formatCurrency(cashFlowData.totalOutflow)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Cash Flow – Net Cash Flow summary (like pic2) */}
                    {amountDetail.type === 'cash_net' && cashFlowData && (
                      <>
                        <Card className="overflow-hidden shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Receipt className="w-5 h-5 text-emerald-600" />
                              Inflows
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="rounded-lg border bg-card">
                              {cashFlowData.inflows.map((item, i) => (
                                <div key={i} className="flex justify-between items-center px-4 py-2 border-b last:border-b-0">
                                  <span>{item.label}</span>
                                  <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-t font-semibold text-emerald-800 dark:text-emerald-200">
                                Total Inflow: {formatCurrency(cashFlowData.totalInflow)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="overflow-hidden shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Package className="w-5 h-5 text-red-600" />
                              Outflows
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="rounded-lg border bg-card">
                              {cashFlowData.outflows.map((item, i) => (
                                <div key={i} className="flex justify-between items-center px-4 py-2 border-b last:border-b-0">
                                  <span>{item.label}</span>
                                  <span className="font-semibold text-red-700 dark:text-red-400">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                              <div className="px-4 py-3 bg-red-50 dark:bg-red-950/20 border-t font-semibold text-red-800 dark:text-red-200">
                                Total Outflow: {formatCurrency(cashFlowData.totalOutflow)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/20 border-primary/20">
                          <CardContent className="pt-4">
                            <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
                            <p className={`text-xl font-bold ${cashFlowData.netCashFlow >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {formatCurrency(cashFlowData.netCashFlow)}
                            </p>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Revenue section */}
                    {['revenue', 'cash_sales', 'gross_profit', 'net_profit'].includes(amountDetail.type) && (
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-emerald-600" />
                            Revenue – services and prices
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {revenueBreakdown && revenueBreakdown.sales?.length > 0 ? (
                            <div className="rounded-lg border bg-card">
                              <div className="max-h-72 overflow-y-auto">
                                {revenueBreakdown.sales.map((sale) => (
                                  <div key={sale.saleId} className="border-b last:border-b-0">
                                    <div className="bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
                                      Total service price: {formatCurrency(sale.total)}
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                          <TableHead>Service</TableHead>
                                          <TableHead className="text-right">Price</TableHead>
                                          <TableHead className="text-right">Qty</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sale.items.map((item, i) => (
                                          <TableRow key={i}>
                                            <TableCell className="font-medium">{item.serviceName}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(item.lineTotal)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ))}
                              </div>
                              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-t font-semibold text-emerald-800 dark:text-emerald-200">
                                Total revenue: {formatCurrency(revenueBreakdown.totalRevenue)}
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground py-6 text-center">No sales in the selected period.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* COGS section */}
                    {['cogs', 'cash_inventory', 'gross_profit', 'net_profit'].includes(amountDetail.type) && (
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-600" />
                            Cost of goods sold – stock and cost
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {cogsBreakdown && cogsBreakdown.lines?.length > 0 ? (
                            <div className="rounded-lg border bg-card">
                              <div className="max-h-72 overflow-y-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Item</TableHead>
                                      <TableHead className="text-right">Qty</TableHead>
                                      <TableHead className="text-right">Cost/unit</TableHead>
                                      <TableHead className="text-right">Line cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cogsBreakdown.lines.map((line, i) => (
                                      <TableRow key={i}>
                                        <TableCell>{line.inventoryName}</TableCell>
                                        <TableCell className="text-right">{line.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(line.costPrice)}</TableCell>
                                        <TableCell className="text-right font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(line.lineCost)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-t font-semibold text-amber-800 dark:text-amber-200">
                                Total COGS: {formatCurrency(cogsBreakdown.totalCogs)}
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground py-6 text-center">No stock cost in the selected period.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Expense category section – itemized list (Salaries, etc.) */}
                    {amountDetail.type === 'expense_category' && (
                      <Card className="overflow-hidden shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-slate-600" />
                            Expenses – {expenseBreakdown?.categoryName ?? amountDetail.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {expenseBreakdown && expenseBreakdown.expenses?.length > 0 ? (
                            <div className="rounded-lg border bg-card">
                              <div className="max-h-72 overflow-y-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Date</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expenseBreakdown.expenses.map((exp) => (
                                      <TableRow key={exp.id}>
                                        <TableCell className="font-medium">{exp.date}</TableCell>
                                        <TableCell>{exp.description ?? '—'}</TableCell>
                                        <TableCell className="text-right font-semibold text-red-700 dark:text-red-400">{formatCurrency(exp.amount)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border-t font-semibold text-slate-800 dark:text-slate-200">
                                Total: {formatCurrency(expenseBreakdown.totalAmount)}
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground py-6 text-center">No expenses in this category for the selected period.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Summary for Gross / Net profit */}
                    {(amountDetail.type === 'gross_profit' || amountDetail.type === 'net_profit') && plData && (
                      <Card className="bg-muted/20 border-primary/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-primary" />
                            Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {amountDetail.type === 'net_profit' ? (
                            <p className="text-sm text-foreground">
                              Revenue {formatCurrency(plData.revenue)} − COGS {formatCurrency(plData.cogs)} − Total expenses {formatCurrency(plData.totalExpenses)} = <strong className="text-primary">Net profit {formatCurrency(plData.netProfit)}</strong>
                            </p>
                          ) : (
                            <p className="text-sm text-foreground">
                              Revenue {formatCurrency(plData.revenue)} − COGS {formatCurrency(plData.cogs)} = <strong className="text-primary">Gross profit {formatCurrency(plData.grossProfit)}</strong>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog for other amount types (receivables, net cash flow, total expenses – not breakdown sheet) */}
      <Dialog open={!!amountDetail && !showBreakdownSheet(amountDetail)} onOpenChange={(open) => !open && setAmountDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-muted-foreground" />
              {amountDetail && (amountDetail.type === 'expense_category' && amountDetail.label
                ? amountDetail.label
                : AMOUNT_EXPLANATIONS[amountDetail.type]?.title ?? amountDetail.type)}
            </DialogTitle>
          </DialogHeader>
          {amountDetail && AMOUNT_EXPLANATIONS[amountDetail.type] && !isBreakdownType(amountDetail.type) && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground mb-1">How it is generated</p>
                <p className="text-foreground">
                  {amountDetail.type === 'expense_category' && amountDetail.label
                    ? `Sum of expenses in "${amountDetail.label}" from the Expense module for the selected period. Shown in Profit & Loss and Cash Flow (Outflows).`
                    : AMOUNT_EXPLANATIONS[amountDetail.type].howGenerated}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1">Where it appears</p>
                <ul className="list-disc list-inside space-y-0.5 text-foreground">
                  {(amountDetail.type === 'expense_category' && amountDetail.label
                    ? ['Profit & Loss (this category row)', 'Cash Flow (this category in Outflows)']
                    : AMOUNT_EXPLANATIONS[amountDetail.type].whereAppears
                  ).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
