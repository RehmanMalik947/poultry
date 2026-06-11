import { useState, useCallback, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Wallet,
  AlertCircle,
  Clock,
  Loader2,
  Receipt,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  LineChart,
  Line,
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
import React from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { API_BASE } from '../../../api/ApiService';
import { Link } from 'react-router';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const POS_API = `${API_BASE}/pos`;
const FINANCE_API = `${API_BASE}/finance`;
const INVENTORY_API = `${API_BASE}/stocks`;
const CLIENTS_API = `${API_BASE}/customers`;
const APPOINTMENTS_API = `${API_BASE}/appointments`;



function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

type POSSummary = {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
  totalRevenue: number;
  totalSalesCount: number;
};

type ProfitLossData = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  expensesByCategory: { categoryName: string; amount: number }[];
  netProfit: number;
};

type SaleRecord = {
  id: number;
  total: number;
  status?: string;
  createdAt: string;
  SaleItems?: { itemName: string; price: number; quantity: number }[];
  Payments?: { amount: number; paymentMethod: string }[];
};

type LowStockItem = {
  id: number;
  qty: string | number;
  alertQty: string | number | null;
  product?: { name: string; alertQuantity: number | null };
};

type BookedAppointment = {
  id: number;
  date: string;
  timeSlot: string;
  status: string;
  customer: { id: number; name: string; phone: string | null } | null;
  service: { id: number; serviceName: string; price: number | null } | null;
  staff: { id: number; firstName: string; lastName: string | null; name?: string } | null;
};

type RevenueBreakdownSale = {
  saleId: number;
  createdAt?: string;
  total: number;
  items: { serviceName: string; price: number; quantity: number; lineTotal: number }[];
};
type RevenueBreakdownData = { sales: RevenueBreakdownSale[]; totalRevenue: number; period?: { fromDate: string; toDate: string } };

export function Dashboard() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [posSummary, setPosSummary] = useState<POSSummary | null>(null);
  const [plCurrent, setPlCurrent] = useState<ProfitLossData | null>(null);
  const [plPrevious, setPlPrevious] = useState<ProfitLossData | null>(null);
  const [salesForPeriod, setSalesForPeriod] = useState<SaleRecord[]>([]);
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<{ today: { sales: number; purchases: number; expenses: number }; month: { sales: number; purchases: number; expenses: number } } | null>(null);
  type KpiBreakdownId = 'today-sales' | 'total-customers' | 'total-expenses' | 'net-profit';
  const [kpiBreakdown, setKpiBreakdown] = useState<KpiBreakdownId | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [todaySalesBreakdown, setTodaySalesBreakdown] = useState<RevenueBreakdownData | null>(null);
  const [customerCount, setCustomerCount] = useState<number>(0);

  const getDateRange = useCallback((period: 'day' | 'week' | 'month') => {
    const end = new Date();
    const start = new Date();
    if (period === 'day') {
      start.setDate(start.getDate() - 1);
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), start, end };
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (selectedBranchId == null) {
      setLoading(false);
      setPosSummary(null);
      setPlCurrent(null);
      setPlPrevious(null);
      setSalesForPeriod([]);
      setLowStock([]);
      setCustomerCount(0);
      setBookedAppointments([]);
      return;
    }
    setLoading(true);
    setError(null);
    const headers = getAuthHeadersWithBranch(selectedBranchId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const fromStr = monthStart.toISOString().slice(0, 10);
    const toStr = monthEnd.toISOString().slice(0, 10);
    const prevFromStr = prevMonthStart.toISOString().slice(0, 10);
    const prevToStr = prevMonthEnd.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    try {
      const [salesRes, plCurRes, plPrevRes, salesMonthRes, lowStockRes, customersRes, appointmentsRes, dashSumRes] = await Promise.all([
        fetch(
          `${POS_API}/sales?todayFrom=${todayStart.toISOString()}&todayTo=${todayEnd.toISOString()}&page=1&limit=1${selectedBranchId != null ? `&branchId=${selectedBranchId}` : ''}`,
          { headers }
        ).then((r) => r.json()),
        fetch(
          `${FINANCE_API}/profit-loss?fromDate=${fromStr}&toDate=${toStr}`,
          { headers }
        ).then((r) => r.json()),
        fetch(
          `${FINANCE_API}/profit-loss?fromDate=${prevFromStr}&toDate=${prevToStr}`,
          { headers }
        ).then((r) => r.json()),
        fetch(
          `${POS_API}/sales?from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}&page=1&limit=500${selectedBranchId != null ? `&branchId=${selectedBranchId}` : ''}`,
          { headers }
        ).then((r) => r.json()),
        fetch(`${INVENTORY_API}/low`, { headers }).then((r) => r.json()),
        fetch(`${CLIENTS_API}?page=1&limit=1`, { headers }).then((r) => r.json()),
        fetch(`${APPOINTMENTS_API}?date=${todayStr}&page=1&limit=100`, { headers }).then((r) => r.json()),
        fetch(`${FINANCE_API}/dashboard-summary`, { headers }).then((r) => r.json()),
      ]);

      if (salesRes?.data?.summary) setPosSummary(salesRes.data.summary);
      else setPosSummary(null);

      if (plCurRes?.success && plCurRes?.data) setPlCurrent(plCurRes.data);
      else setPlCurrent(null);
      if (plPrevRes?.success && plPrevRes?.data) setPlPrevious(plPrevRes.data);
      else setPlPrevious(null);

      if (salesMonthRes?.success && Array.isArray(salesMonthRes?.data?.sales)) setSalesForPeriod(salesMonthRes.data.sales);
      else setSalesForPeriod([]);

      if (lowStockRes?.success && Array.isArray(lowStockRes?.data)) setLowStock(lowStockRes.data);
      else setLowStock([]);

      const customerTotal = typeof customersRes?.total === 'number' ? customersRes.total : 0;
      setCustomerCount(customerTotal);

      const apptList = appointmentsRes?.data ?? [];
      const booked = Array.isArray(apptList) ? apptList.filter((a: BookedAppointment) => ['booked', 'arrived', 'completed'].includes(a.status)) : [];
      setBookedAppointments(booked);

      if (dashSumRes?.success) setDashboardSummary(dashSumRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      setPosSummary(null);
      setPlCurrent(null);
      setPlPrevious(null);
      setSalesForPeriod([]);
      setLowStock([]);
      setCustomerCount(0);
      setBookedAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!kpiBreakdown || selectedBranchId == null || kpiBreakdown === 'total-customers') {
      setTodaySalesBreakdown(null);
      return;
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fromStr = monthStart.toISOString().slice(0, 10);
    const toStr = monthEnd.toISOString().slice(0, 10);
    const headers = getAuthHeadersWithBranch(selectedBranchId);

    if (kpiBreakdown === 'today-sales') {
      setBreakdownLoading(true);
      setTodaySalesBreakdown(null);
      const from = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate(), 0, 0, 0, 0).toISOString();
      const to = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999).toISOString();
      fetch(
        `${POS_API}/sales?from=${from}&to=${to}&page=1&limit=100&branchId=${selectedBranchId}`,
        { headers }
      )
        .then((r) => r.json())
        .then((data) => {
          const sales: SaleRecord[] = data?.data?.sales ?? [];
          const paid = sales.filter((s: SaleRecord) => s.status === 'paid');
          const salesData: RevenueBreakdownSale[] = paid.map((s: SaleRecord) => ({
            saleId: s.id,
            createdAt: s.createdAt,
            total: Number(s.total) || 0,
            items: (s.SaleItems || []).map((it) => {
              const price = Number(it.price) || 0;
              const qty = Number(it.quantity) || 1;
              return {
                serviceName: it.itemName || '—',
                price,
                quantity: qty,
                lineTotal: Math.round(price * qty * 100) / 100,
              };
            }),
          }));
          const totalRevenue = salesData.reduce((sum, s) => sum + s.total, 0);
          setTodaySalesBreakdown({ sales: salesData, totalRevenue: Math.round(totalRevenue * 100) / 100, period: { fromDate: fromStr, toDate: toStr } });
        })
        .catch(() => setTodaySalesBreakdown(null))
        .finally(() => setBreakdownLoading(false));
    } else {
      setTodaySalesBreakdown(null);
    }
  }, [kpiBreakdown, selectedBranchId]);

  const [salesTrendData, setSalesTrendData] = useState<{ day: string; sales: number }[]>([]);
  const [salesTrendLoading, setSalesTrendLoading] = useState(false);

  useEffect(() => {
    if (selectedBranchId == null) {
      setSalesTrendData([]);
      return;
    }
    let cancelled = false;
    setSalesTrendLoading(true);
    const { start, end } = getDateRange(salesTrendPeriod);
    const from = start.toISOString();
    const to = end.toISOString();
    fetch(
      `${POS_API}/sales?from=${from}&to=${to}&page=1&limit=500&branchId=${selectedBranchId}`,
      { headers: getAuthHeadersWithBranch(selectedBranchId) }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const sales: SaleRecord[] = data?.data?.sales ?? [];
        const byDay: Record<string, number> = {};
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        sales.forEach((s) => {
          const d = new Date(s.createdAt);
          const key = d.toISOString().slice(0, 10);
          byDay[key] = (byDay[key] || 0) + (Number(s.total) || 0);
        });
        const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
        const out = sorted.map(([date, salesVal]) => {
          const d = new Date(date + 'T12:00:00');
          const label = salesTrendPeriod === 'day' ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : dayLabels[d.getDay()];
          return { day: salesTrendPeriod === 'month' ? date.slice(5) : label, sales: Math.round(salesVal * 100) / 100 };
        });
        if (out.length === 0 && salesTrendPeriod === 'week') {
          for (let i = 6; i >= 0; i--) {
            const d = new Date(end);
            d.setDate(d.getDate() - i);
            out.push({ day: dayLabels[d.getDay()], sales: 0 });
          }
        }
        setSalesTrendData(out);
      })
      .catch(() => { if (!cancelled) setSalesTrendData([]); })
      .finally(() => { if (!cancelled) setSalesTrendLoading(false); });
    return () => { cancelled = true; };
  }, [selectedBranchId, salesTrendPeriod]);

  const paymentTypeData = React.useMemo(() => {
    const byMethod: Record<string, number> = {};
    let total = 0;
    salesForPeriod.forEach((s) => {
      (s.Payments || []).forEach((p) => {
        const method = (p.paymentMethod || 'Other').replace(/_/g, ' ');
        const amt = Number(p.amount) || 0;
        byMethod[method] = (byMethod[method] || 0) + amt;
        total += amt;
      });
    });
    if (total === 0) return [{ name: 'No payments', value: 100, color: '#9ca3af' }];
    const colors: Record<string, string> = { cash: '#10b981', card: '#3b82f6', 'bank transfer': '#8b5cf6' };
    return Object.entries(byMethod).map(([name, amount]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((amount / total) * 100),
      color: colors[name.toLowerCase()] || '#6b7280',
    }));
  }, [salesForPeriod]);

  const topServices = React.useMemo(() => {
    const byService: Record<string, { count: number; revenue: number }> = {};
    salesForPeriod.forEach((s) => {
      (s.SaleItems || []).forEach((it) => {
        const name = it.itemName || 'Unknown';
        const rev = (Number(it.price) || 0) * (Number(it.quantity) || 1);
        if (!byService[name]) byService[name] = { count: 0, revenue: 0 };
        byService[name].count += Number(it.quantity) || 1;
        byService[name].revenue += rev;
      });
    });
    return Object.entries(byService)
      .map(([name, d]) => ({ name, count: d.count, revenue: d.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [salesForPeriod]);

  const todaySales = posSummary?.todayTotal ?? 0;
  const monthRevenue = plCurrent?.revenue ?? posSummary?.monthTotal ?? 0;
  const totalExpenses = plCurrent?.totalExpenses ?? 0;
  const netProfit = plCurrent?.netProfit ?? 0;

  const prevMonthRevenue = plPrevious?.revenue ?? 0;
  const prevMonthExpenses = plPrevious?.totalExpenses ?? 0;
  const prevNetProfit = plPrevious?.netProfit ?? 0;

  const changeToday = posSummary?.todayCount !== undefined && plPrevious ? null : null;
  const changeRevenue = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : null;
  const changeExpenses = prevMonthExpenses > 0 ? ((totalExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : null;
  const changeProfit = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const periodLabel = `${monthStart.toISOString().slice(0, 10)} – ${monthEnd.toISOString().slice(0, 10)}`;

  const todaySalesVal = dashboardSummary?.today?.sales ?? 0;
  const todayPurchaseVal = dashboardSummary?.today?.purchases ?? 0;
  const todayExpenseVal = dashboardSummary?.today?.expenses ?? 0;
  const todayProfitVal = todaySalesVal - todayPurchaseVal - todayExpenseVal;
  const monthSalesVal = dashboardSummary?.month?.sales ?? monthRevenue;
  const monthPurchaseVal = dashboardSummary?.month?.purchases ?? 0;
  const monthExpenseVal = dashboardSummary?.month?.expenses ?? totalExpenses;
  const monthProfitVal = monthSalesVal - monthPurchaseVal - monthExpenseVal;

  const todayCards = [
    { title: "Today's Sales", value: todaySalesVal, icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: "Today's Purchase", value: todayPurchaseVal, icon: CreditCard, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: "Today's Expense", value: todayExpenseVal, icon: Wallet, color: 'text-red-600', bgColor: 'bg-red-50' },
    { title: "Today's Profit", value: todayProfitVal, icon: TrendingUp, color: todayProfitVal >= 0 ? 'text-blue-600' : 'text-red-600', bgColor: 'bg-blue-50' },
  ];

  const monthCards = [
    { title: "This Month's Sales", value: monthSalesVal, icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: "This Month's Purchase", value: monthPurchaseVal, icon: CreditCard, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: "This Month's Expense", value: monthExpenseVal, icon: Wallet, color: 'text-red-600', bgColor: 'bg-red-50' },
    { title: "This Month's Profit", value: monthProfitVal, icon: TrendingUp, color: monthProfitVal >= 0 ? 'text-blue-600' : 'text-red-600', bgColor: 'bg-blue-50' },
  ];


  if (selectedBranchId == null) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
          Select a branch from the header to view the Executive Dashboard.
        </p>
      </div>
    );
  }

  if (loading && !posSummary && !plCurrent) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-3 space-y-3">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Executive Dashboard</h1>
        <p className="text-base text-gray-600">Complete business overview at a glance</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>Retry</Button>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {todayCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={`text-2xl font-bold tracking-tight ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {monthCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={`text-2xl font-bold tracking-tight ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Sales Trend</CardTitle>
              <Tabs value={salesTrendPeriod} onValueChange={(v) => setSalesTrendPeriod(v as 'day' | 'week' | 'month')} className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {salesTrendLoading ? (
              <div className="h-[280px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: number) => [formatCurrency(val), 'Sales']} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Payment Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: number) => [`${val}%`, 'Share']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/*<div className="grid grid-cols-1 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Top Services</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topServices.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No sales data for this period.</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((service, index) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{service.name}</p>
                        <p className="text-sm text-gray-600">{service.count} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(service.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>*/}

      {/*<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                Low Stock Alerts
              </CardTitle>
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link to="/stock/manage">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No low stock items.</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((item) => {
                  const qty = Number(item.qty);
                  const minStock = Number(item.alertQty || item.product?.alertQuantity || 0);
                  const isCritical = qty === 0 || qty < (minStock / 2);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white border-2 border-orange-100 hover:border-orange-200 transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.product?.name || 'Unknown Item'}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="text-gray-600">Current: <span className="font-semibold text-orange-600">{qty}</span></span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-600">Min: <span className="font-medium">{minStock || '—'}</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={isCritical ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}>
                          {isCritical ? 'critical' : 'low'}
                        </Badge>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" asChild>
                          <Link to="/stock/manage">Reorder</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                Booked Appointments
              </CardTitle>
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link to="/appointments">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {bookedAppointments.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No booked appointments for today.</p>
            ) : (
              <div className="space-y-3">
                {bookedAppointments.map((appt) => (
                  <Link key={appt.id} to="/appointments" className="block">
                    <div className="flex flex-col gap-1 p-4 rounded-xl bg-white border-2 border-blue-100 hover:border-blue-200 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{appt.customer?.name ?? '—'}</p>
                          <p className="text-sm text-gray-600 truncate">{appt.service?.serviceName ?? '—'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-blue-600">{appt.timeSlot}</p>
                          <p className="text-xs text-gray-500">{appt.date}</p>
                        </div>
                      </div>
                      {appt.staff?.name && (
                        <p className="text-xs text-gray-500">Staff: {appt.staff.name}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>*/}

      {/* KPI breakdown – slides in from the right */}
      <Sheet open={kpiBreakdown != null} onOpenChange={(open) => !open && setKpiBreakdown(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col overflow-hidden p-0 gap-0">
          <SheetHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b px-6 py-5 pr-12 shrink-0">
            <div className="space-y-1.5">
              <SheetTitle className="text-xl">
                {kpiBreakdown === 'today-sales' && 'Monthly Sales'}
                {kpiBreakdown === 'total-expenses' && 'Total Expenses'}
                {kpiBreakdown === 'net-profit' && 'Net Profit'}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {kpiBreakdown === 'today-sales' && periodLabel.replace(' – ', ' - ')}
                {kpiBreakdown === 'total-expenses' && periodLabel.replace(' – ', ' - ')}
                {kpiBreakdown === 'net-profit' && periodLabel.replace(' – ', ' - ')}
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link to="/finance">Finance report</Link>
            </Button>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {breakdownLoading && kpiBreakdown === 'today-sales' && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
            {!breakdownLoading && kpiBreakdown === 'today-sales' && todaySalesBreakdown && (
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Monthly Sales - services and prices
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {todaySalesBreakdown.sales?.length > 0 ? (
                    <div className="rounded-lg border bg-card">
                      <div className="max-h-72 overflow-y-auto">
                        {todaySalesBreakdown.sales.map((sale) => (
                          <div key={sale.saleId} className="border-b last:border-b-0">
                            <div className="bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
                              Sale #{sale.saleId} · {formatCurrency(sale.total)}
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
                        Total sales: {formatCurrency(todaySalesBreakdown.totalRevenue)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-6 text-center">No paid sales this month.</p>
                  )}
                </CardContent>
              </Card>
            )}
            {kpiBreakdown === 'total-expenses' && plCurrent && (
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    Total Expenses – by category
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {plCurrent.expensesByCategory?.length > 0 ? (
                    <div className="rounded-lg border bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plCurrent.expensesByCategory.map((cat, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{cat.categoryName}</TableCell>
                              <TableCell className="text-right font-semibold text-orange-700">{formatCurrency(cat.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950/20 border-t font-semibold text-orange-800 dark:text-orange-200">
                        Total expenses: {formatCurrency(plCurrent.totalExpenses)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-6 text-center">No expenses in the selected period.</p>
                  )}
                </CardContent>
              </Card>
            )}
            {kpiBreakdown === 'net-profit' && plCurrent && (
              <Card className="overflow-hidden shadow-sm bg-muted/20 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">How Net Profit is calculated</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-foreground">
                    Revenue {formatCurrency(plCurrent.revenue)} − COGS {formatCurrency(plCurrent.cogs)} − Total expenses {formatCurrency(plCurrent.totalExpenses)} = <strong className="text-primary">Net profit {formatCurrency(plCurrent.netProfit)}</strong>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
