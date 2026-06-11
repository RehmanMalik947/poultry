import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Calendar as CalendarIcon, MapPin,
  Check, ChevronDown, Package, Tag, Award, Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { DataTable, Column } from '../../components/shared/DataTable';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';

// ─── Types ───────────────────────────────────────────────────────────
interface Summary {
  openingStockPurchasePrice: number;
  openingStockSalePrice: number;
  totalPurchase: number;
  totalPurchaseShipping: number;
  totalPurchaseDiscount: number;
  totalExpense: number;
  totalSellDiscount: number;
  totalSellReturn: number;
  closingStockPurchasePrice: number;
  closingStockSalePrice: number;
  totalSales: number;
  totalSellShipping: number;
  totalPurchaseReturn: number;
  cogs: number;
  grossProfit: number;
  grossProfitPct: number;
  netProfit: number;
  netProfitPct: number;
}

interface BreakdownRow {
  id?: string | number;
  name: string;
  qty?: number;
  revenue: number;
  cost: number;
  grossProfit: number;
}

/*const TABS = [
  { key: 'products',   label: 'Profit by Products',   icon: Package },
  { key: 'categories', label: 'Profit by Categories', icon: Tag },
  { key: 'brands',     label: 'Profit by Brands',     icon: Award },
] as const;*/

const TABS = [
  { key: 'daily',     label: 'Daily P&L',             icon: TrendingUp },
  { key: 'products',   label: 'Profit by Products',   icon: Package },
  { key: 'categories', label: 'Profit by Categories', icon: Tag },
  { key: 'brands',     label: 'Profit by Brands',     icon: Award },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Main Component ───────────────────────────────────────────────────
export default function ProfitLossReport() {
  const { format: fmt } = useCurrency();

  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState('2000-01-01');
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<TabKey>('daily');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  // Fetch branches
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeadersWithBranch(null) });
        const json = await res.json();
        if (json.success) setBranches(json.data || []);
      } catch (err) { console.error(err); }
    }
    fetchBranches();
  }, []);

  // Fetch report
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (selectedBranchId) params.set('branchId', selectedBranchId.toString());

      const headers = getAuthHeadersWithBranch(null);
      const res = await fetch(`${API_BASE}/reports/profit-loss?${params}`, { headers });
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setBreakdown(json.data.breakdown || []);
        setTotalRecords(json.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch P&L report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate, activeTab, page, limit]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, activeTab, selectedBranchId]);

  // Date preset handler
  const handleDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'allTime') => {
    const today = new Date();
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (preset === 'allTime') {
      setFromDate('2000-01-01');
      setToDate(f(today));
    } else if (preset === 'today') {
      const s = f(today); setFromDate(s); setToDate(s);
    } else if (preset === 'yesterday') {
      const d = new Date(today); d.setDate(d.getDate() - 1); const s = f(d); setFromDate(s); setToDate(s);
    } else if (preset === '7days') {
      const d = new Date(today); d.setDate(d.getDate() - 7); setFromDate(f(d)); setToDate(f(today));
    } else if (preset === '30days') {
      const d = new Date(today); d.setDate(d.getDate() - 30); setFromDate(f(d)); setToDate(f(today));
    } else if (preset === 'thisMonth') {
      setFromDate(f(new Date(today.getFullYear(), today.getMonth(), 1)));
      setToDate(f(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    } else if (preset === 'lastMonth') {
      setFromDate(f(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setToDate(f(new Date(today.getFullYear(), today.getMonth(), 0)));
    }
    setDatePresetOpen(false);
  };

  const isNetPositive = (summary?.netProfit ?? 0) >= 0;

  // Calculate totals for footer
  const totals = breakdown.reduce((acc, row) => ({
    qty: acc.qty + (row.qty ?? 0),
    revenue: acc.revenue + row.revenue,
    cost: acc.cost + row.cost,
    grossProfit: acc.grossProfit + row.grossProfit,
    purchase: acc.purchase + (row as any).purchase || 0,
    sale: acc.sale + (row as any).sale || 0,
    profit: acc.profit + (row as any).profit || 0,
  }), { qty: 0, revenue: 0, cost: 0, grossProfit: 0, purchase: 0, sale: 0, profit: 0 });

  // ─── Render footer row based on active tab ──────────────────────────
  /*const renderFooter = () => {
    if (breakdown.length === 0) return undefined;
    
    if (activeTab === 'products') {
      return (
        <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
          <td className="px-4 py-3 text-gray-800 font-medium">Total</td>
          <td className="px-4 py-3 text-right text-gray-700">{totals.qty}</td>
          <td className="px-4 py-3 text-right text-gray-700">{fmt(totals.revenue)}</td>
          <td className="px-4 py-3 text-right text-gray-700">{fmt(totals.cost)}</td>
          <td className={`px-4 py-3 text-right font-semibold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(totals.grossProfit)}
          </td>
        </tr>
      );
    } else {
      return (
        <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
          <td className="px-4 py-3 text-gray-800 font-medium">Total</td>
          <td className="px-4 py-3 text-right text-gray-700">{fmt(totals.revenue)}</td>
          <td className="px-4 py-3 text-right text-gray-700">{fmt(totals.cost)}</td>
          <td className={`px-4 py-3 text-right font-semibold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(totals.grossProfit)}
          </td>
        </tr>
      );
    }
  };*/

  // ─── Breakdown Columns for DataTable ────────────────────────────────
  /*const getBreakdownColumns = (): Column<BreakdownRow>[] => {
    if (activeTab === 'products') {
      return [
        { header: 'Product', accessor: 'name', className: 'font-medium' },
        { header: 'Qty Sold', render: (row: BreakdownRow) => row.qty?.toString() || '—', align: 'right' },
        { header: 'Revenue', render: (row: BreakdownRow) => fmt(row.revenue), align: 'right' },
        { header: 'Cost', render: (row: BreakdownRow) => fmt(row.cost), align: 'right' },
        { header: 'Gross Profit', render: (row: BreakdownRow) => fmt(row.grossProfit), align: 'right', className: 'font-semibold' }
      ];
    } else {
      return [
        { header: activeTab === 'categories' ? 'Category' : 'Brand', accessor: 'name', className: 'font-medium' },
        { header: 'Revenue', render: (row: BreakdownRow) => fmt(row.revenue), align: 'right' },
        { header: 'Cost', render: (row: BreakdownRow) => fmt(row.cost), align: 'right' },
        { header: 'Gross Profit', render: (row: BreakdownRow) => fmt(row.grossProfit), align: 'right', className: 'font-semibold' }
      ];
    }
  };*/

  const dailyColumns: Column<BreakdownRow>[] = [
    { header: 'Id', accessor: 'id' },
    { header: 'Date', accessor: 'name' },
    { header: 'Purchase', render: (row: BreakdownRow) => fmt(row.cost), align: 'right' },
    { header: 'Sale', render: (row: BreakdownRow) => fmt(row.revenue), align: 'right' },
    { header: 'Profit / Loss', render: (row: BreakdownRow) => {
      const val = row.grossProfit;
      return <span className={val >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{fmt(val)}</span>;
    }, align: 'right' },
  ];

  /*const searched = breakdown.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedData = searched.slice((page - 1) * limit, page * limit);*/

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="p-3 space-y-3 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Profit / Loss Report</h1>
          <p className="text-gray-500 text-sm mt-1">Financial summary of revenue, costs, and net profit</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch */}
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-accent">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                {selectedBranch ? selectedBranch.name : 'All locations'}
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="min-w-[220px] z-[100] p-1" sideOffset={8}>
              <div className="max-h-[280px] overflow-y-auto" role="listbox">
                <button onClick={() => { setSelectedBranchId(null); setBranchPopoverOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${!selectedBranchId ? 'bg-secondary font-medium text-tertiary' : ''}`}>
                  <span>All locations</span>
                  {!selectedBranchId && <Check className="w-4 h-4 shrink-0 text-primary" />}
                </button>
                {branches.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBranchId(b.id); setBranchPopoverOpen(false); }}
                    className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${selectedBranchId === b.id ? 'bg-secondary font-medium text-tertiary' : ''}`}>
                    <span>{b.name}</span>
                    {selectedBranchId === b.id && <Check className="w-4 h-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date */}
          <Popover open={datePresetOpen} onOpenChange={setDatePresetOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-9 items-center justify-between gap-2 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-primary/95">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Filter by date
                </span>
                <ChevronDown className="w-4 h-4 text-white/80 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="end">
              <div className="flex flex-col space-y-0.5">
                <button onClick={() => handleDatePreset('allTime')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">All Time</button>
                <button onClick={() => handleDatePreset('today')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Today</button>
                <button onClick={() => handleDatePreset('yesterday')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Yesterday</button>
                <button onClick={() => handleDatePreset('7days')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last 7 Days</button>
                <button onClick={() => handleDatePreset('30days')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last 30 Days</button>
                <button onClick={() => handleDatePreset('thisMonth')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">This Month</button>
                <button onClick={() => handleDatePreset('lastMonth')} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last Month</button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-gray-500 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.totalSales)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-gray-500 font-medium">Gross Profit</p>
              <p className={`text-2xl font-bold mt-1 ${summary.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(summary.grossProfit)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-gray-500 font-medium">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${isNetPositive ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(summary.netProfit)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-gray-500 font-medium">COGS</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.cogs)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two-Column Cost & Revenue Breakdown */}
      {false && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* COSTS */}
          <Card className="shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-red-700 text-sm tracking-wide uppercase">Costs & Deductions</span>
            </div>
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Opening Stock (Purchase Price)</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.openingStockPurchasePrice)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Opening Stock (Sale Price)</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.openingStockSalePrice)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3 rounded-lg bg-blue-50 border border-blue-200">
                <div>
                  <span className="text-sm font-semibold text-blue-900">Total Purchase</span>
                  <p className="text-xs text-gray-400 mt-0.5">Exc. tax, Discount</p>
                </div>
                <span className="font-semibold text-blue-700 text-base">{fmt(summary.totalPurchase)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Total Expense</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalExpense)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Purchase Shipping Charge</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalPurchaseShipping)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Sell Discount</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalSellDiscount)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Sell Return</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalSellReturn)}</span>
              </div>
            </CardContent>
          </Card>

          {/* REVENUE */}
          <Card className="shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-100">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-700 text-sm tracking-wide uppercase">Revenue & Income</span>
            </div>
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Closing Stock (Purchase Price)</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.closingStockPurchasePrice)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Closing Stock (Sale Price)</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.closingStockSalePrice)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3 rounded-lg bg-blue-50 border border-blue-200">
                <div>
                  <span className="text-sm font-semibold text-blue-900">Total Sales</span>
                  <p className="text-xs text-gray-400 mt-0.5">Exc. tax, Discount</p>
                </div>
                <span className="font-semibold text-blue-700 text-base">{fmt(summary.totalSales)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Sell Shipping Charge</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalSellShipping)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Purchase Return</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalPurchaseReturn)}</span>
              </div>
              <div className="flex justify-between items-start py-2 px-3">
                <div>
                  <span className="text-sm text-gray-700">Purchase Discount</span>
                </div>
                <span className="font-semibold text-gray-800 text-sm">{fmt(summary.totalPurchaseDiscount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profit Calculations */}
      {false && summary && (
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                COGS: <span className="text-gray-900">{fmt(summary.cogs)}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Cost of Goods Sold = Starting inventory (opening stock) + purchases − ending inventory (closing stock)
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-lg font-bold text-gray-800">
                Gross Profit:{' '}
                <span className={summary.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {fmt(summary.grossProfit)}
                </span>{' '}
                <span className="text-sm font-normal text-gray-400">({summary.grossProfitPct}%)</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Total sell price − Total purchase price
              </p>
            </div>
            <div className="border-t pt-3">
              <p className={`text-2xl font-extrabold tracking-tight ${isNetPositive ? 'text-green-600' : 'text-red-600'}`}>
                Net Profit: {fmt(summary.netProfit)}{' '}
                <span className="text-base font-semibold opacity-70">({summary.netProfitPct}%)</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Gross Profit + (Total sell shipping charge + Sell additional expenses + Total Purchase Return + Total Purchase discount − Total transfer shipping charge − Purchase additional expenses − Total Expense − Total sell discount)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown Tabs with DataTable */}
      <Tabs value="daily">
        {/* Tab navigation buttons commented */}
        {/*<TabsList className="bg-white border p-1 h-12">
          {TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger 
              key={key} 
              value={key} 
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
            >
              <Icon className="w-4 h-4 mr-2" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>*/}

        <TabsContent value="daily" className="mt-3 focus-visible:outline-none">
          <DataTable
            title="Daily Profit / Loss"
            columns={dailyColumns}
            data={breakdown}
            loading={loading}
            emptyMessage="No data found for the selected period"
            exportable
            exportFileName="daily-profit-loss"
            pagination={{
              total: breakdown.length,
              page,
              limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
              itemLabel: "days"
            }}
            filters={
              <div className="flex items-center gap-2">
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[80px] h-9 border-gray-300 border-2 rounded-lg hover:bg-gray-50 text-sm [&>svg]:text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] min-w-0">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            footer={
              <div className="px-3 py-2.5 bg-gray-50/80 border-t border-gray-200 flex items-center justify-end gap-6 text-sm">
                <span className="font-semibold text-gray-700">
                  Total Purchase: <span className="text-gray-900">{fmt(totals.cost)}</span>
                </span>
                <span className="font-semibold text-gray-700">
                  Total Sale: <span className="text-gray-900">{fmt(totals.revenue)}</span>
                </span>
                <span className="font-semibold text-gray-700">
                  Net Profit / Loss: <span className={totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(totals.grossProfit)}</span>
                </span>
              </div>
            }
          />
        </TabsContent>

        {/*<TabsContent value="products" className="mt-3 focus-visible:outline-none">
          <DataTable
            title="Profit by Products"
            icon={Package}
            columns={getBreakdownColumns()}
            data={paginatedData}
            loading={loading}
            emptyMessage="No profit data found for the selected period"
            exportable
            exportFileName="profit-by-products"
            pagination={{
              total: searched.length,
              page,
              limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
              itemLabel: "products"
            }}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-3 focus-visible:outline-none">
          <DataTable
            title="Profit by Categories"
            icon={Tag}
            columns={getBreakdownColumns()}
            data={paginatedData}
            loading={loading}
            emptyMessage="No profit data found for the selected period"
            exportable
            exportFileName="profit-by-categories"
            pagination={{
              total: searched.length,
              page,
              limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
              itemLabel: "categories"
            }}
          />
        </TabsContent>

        <TabsContent value="brands" className="mt-3 focus-visible:outline-none">
          <DataTable
            title="Profit by Brands"
            icon={Award}
            columns={getBreakdownColumns()}
            data={paginatedData}
            loading={loading}
            emptyMessage="No profit data found for the selected period"
            exportable
            exportFileName="profit-by-brands"
            pagination={{
              total: searched.length,
              page,
              limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
              itemLabel: "brands"
            }}
            footer={renderFooter()}
          />
        </TabsContent>*/}
      </Tabs>
    </div>
  );
}
