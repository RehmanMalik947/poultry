import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
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
import { Link } from 'react-router';
import { TablePagination } from '../../components/shared/TablePagination';
import React from 'react';



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
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

type SaleRecord = {
  id: number;
  total: number;
  customerId?: number | null;
  createdAt: string;
};

type SaleItemRecord = { id?: number; serviceName?: string; price: number; quantity: number };
type SaleWithItems = SaleRecord & { items?: SaleItemRecord[] };

type StatDetailSheet = 'total-revenue' | 'transactions' | 'avg-bill' | 'unique-customers' | null;

type SalesReportData = {
  totalRevenue: number;
  transactions: number;
  avgBill: number;
  uniqueCustomers: number;
  daily: { date: string; revenue: number; transactions: number; avgBill: number }[];
};

type InventoryItem = {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  minStock: number | null;
  status: string;
  costPrice: number | null;
  sellingPrice: number | null;
  totalValue: number | null;
};

type ProfitLossData = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: { categoryName: string; amount: number }[];
};



export function Reports() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const [reportFromDate, setReportFromDate] = useState(getDefaultFromDate);
  const [reportToDate, setReportToDate] = useState(getDefaultToDate);
  const [reportFromPickerOpen, setReportFromPickerOpen] = useState(false);
  const [reportToPickerOpen, setReportToPickerOpen] = useState(false);

  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [reportSalesList, setReportSalesList] = useState<SaleWithItems[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [statDetailSheet, setStatDetailSheet] = useState<StatDetailSheet>(null);
  const [salesReportPageSize, setSalesReportPageSize] = useState(10);
  const [salesReportPage, setSalesReportPage] = useState(1);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [plData, setPlData] = useState<ProfitLossData | null>(null);
  const [plLoading, setPlLoading] = useState(false);

  const fetchSalesReport = useCallback(async () => {
    setSalesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('from', reportFromDate);
      params.set('to', reportToDate);
      params.set('limit', '500');
      params.set('status', 'paid');
      if (selectedBranchId != null) params.set('branchId', String(selectedBranchId));
      const res = await fetch(`${API_BASE}/pos/sales?${params.toString()}`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const json = await res.json();
      if (!json.success || !json.data?.sales) {
        setSalesData(null);
        setReportSalesList([]);
        return;
      }
      const sales: SaleWithItems[] = json.data.sales || [];
      setReportSalesList(sales);
      const totalRevenue = sales.reduce((s, sale) => s + (Number(sale.total) || 0), 0);
      const transactions = sales.length;
      const uniqueCustomers = new Set(sales.map((s) => s.customerId).filter(Boolean)).size;
      const dailyMap: Record<string, { revenue: number; count: number }> = {};
      sales.forEach((sale) => {
        const dateStr = sale.createdAt ? sale.createdAt.slice(0, 10) : '';
        if (!dateStr) return;
        if (!dailyMap[dateStr]) dailyMap[dateStr] = { revenue: 0, count: 0 };
        dailyMap[dateStr].revenue += Number(sale.total) || 0;
        dailyMap[dateStr].count += 1;
      });
      const daily = Object.entries(dailyMap)
        .map(([date, d]) => ({
          date,
          revenue: Math.round(d.revenue * 100) / 100,
          transactions: d.count,
          avgBill: d.count ? Math.round((d.revenue / d.count) * 100) / 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setSalesData({
        totalRevenue,
        transactions,
        avgBill: transactions ? Math.round((totalRevenue / transactions) * 100) / 100 : 0,
        uniqueCustomers: uniqueCustomers,
        daily,
      });
    } catch {
      setSalesData(null);
      setReportSalesList([]);
    } finally {
      setSalesLoading(false);
    }
  }, [reportFromDate, reportToDate, selectedBranchId]);

  const fetchInventoryReport = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory?limit=500&page=1`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json)) {
        setInventoryItems(json);
      } else if (json?.data && Array.isArray(json.data)) {
        setInventoryItems(json.data);
      } else {
        setInventoryItems([]);
      }
    } catch {
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [selectedBranchId]);

  const fetchFinanceReport = useCallback(async () => {
    setPlLoading(true);
    try {
      const from = reportFromDate || getDefaultFromDate();
      const to = reportToDate || getDefaultToDate();
      const res = await fetch(
        `${API_BASE}/finance/profit-loss?fromDate=${encodeURIComponent(from)}&toDate=${encodeURIComponent(to)}`,
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
  }, [reportFromDate, reportToDate, selectedBranchId]);

  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  useEffect(() => {
    setSalesReportPage(1);
  }, [salesData?.daily?.length]);

  useEffect(() => {
    fetchInventoryReport();
  }, [fetchInventoryReport]);

  useEffect(() => {
    fetchFinanceReport();
  }, [fetchFinanceReport]);

  return (
    <div className="p-3 md:p-3 space-y-3">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Reports Hub
          </h1>
          <p className="text-gray-500 mt-1">
            Generate and export business reports
          </p>
        </div>
      </div>

      {/* Date range – used for Sales and Finance */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">From date</Label>
              <Popover open={reportFromPickerOpen} onOpenChange={setReportFromPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-[220px] sm:w-[280px] justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    {reportFromDate ? formatDisplayDate(reportFromDate) : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reportFromDate ? new Date(reportFromDate + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setReportFromDate(`${y}-${m}-${d}`);
                        setReportFromPickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">To date</Label>
              <Popover open={reportToPickerOpen} onOpenChange={setReportToPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-[220px] sm:w-[280px] justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    {reportToDate ? formatDisplayDate(reportToDate) : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reportToDate ? new Date(reportToDate + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setReportToDate(`${y}-${m}-${d}`);
                        setReportToPickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          {salesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : salesData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatDetailSheet('total-revenue')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-50 rounded-lg dark:bg-green-950/30">
                        <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesData.totalRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatDetailSheet('transactions')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-950/30">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-muted-foreground">Transactions</p>
                        <p className="text-2xl font-bold">{salesData.transactions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatDetailSheet('avg-bill')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-50 rounded-lg dark:bg-purple-950/30">
                        <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-muted-foreground">Avg Bill Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesData.avgBill)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatDetailSheet('unique-customers')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-50 rounded-lg dark:bg-orange-950/30">
                        <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-muted-foreground">Unique Customers</p>
                        <p className="text-2xl font-bold">{salesData.uniqueCustomers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {salesData.daily.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesData.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(v: number) => (typeof v === 'number' && v < 1000 ? v : formatCurrency(v))} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                        <Bar dataKey="transactions" fill="#3b82f6" name="Transactions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Sales Report</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesData.daily.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                          <TableRow className="hover:bg-primary/90 border-none">
                            <TableHead className="text-white font-semibold">Date</TableHead>
                            <TableHead className="text-white font-semibold text-right">Transactions</TableHead>
                            <TableHead className="text-white font-semibold text-right">Revenue</TableHead>
                            <TableHead className="text-white font-semibold text-right">Avg Bill</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.daily
                            .slice((salesReportPage - 1) * salesReportPageSize, salesReportPage * salesReportPageSize)
                            .map((row) => (
                              <TableRow key={row.date}>
                                <TableCell>{row.date}</TableCell>
                                <TableCell className="text-right">{row.transactions}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatCurrency(row.revenue)}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(row.avgBill)}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <TablePagination
                        total={salesData.daily.length}
                        page={salesReportPage}
                        limit={salesReportPageSize}
                        onPageChange={setSalesReportPage}
                        onLimitChange={setSalesReportPageSize}
                        itemLabel="rows"
                      />
                    </>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No sales in the selected period.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-gray-500">No sales data for the selected period.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-6">
          {inventoryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Inventory Report</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Current stock levels (branch filter applied)
                </p>
              </CardHeader>
              <CardContent>
                {inventoryItems.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                      <TableRow className="hover:bg-primary/90 border-none">
                        <TableHead className="text-white font-semibold">Item</TableHead>
                        <TableHead className="text-white font-semibold">Category</TableHead>
                        <TableHead className="text-white font-semibold text-right">Quantity</TableHead>
                        <TableHead className="text-white font-semibold text-right">Min Stock</TableHead>
                        <TableHead className="text-white font-semibold text-right">Status</TableHead>
                        <TableHead className="text-white font-semibold text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category ?? '–'}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit ?? ''}</TableCell>
                          <TableCell className="text-right">{item.minStock ?? '–'}</TableCell>
                          <TableCell className="text-right">
                            <span className={
                              item.status === 'critical' ? 'text-red-600 font-medium' :
                              item.status === 'low' ? 'text-amber-600' : 'text-gray-600'
                            }>
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.totalValue != null ? formatCurrency(item.totalValue) : item.costPrice != null ? formatCurrency(item.quantity * item.costPrice) : '–'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-8">No inventory items found.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Finance Report */}
        <TabsContent value="finance" className="space-y-6">
          {plLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : plData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(plData.revenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <Package className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cost of Goods Sold</p>
                        <p className="text-2xl font-bold">{formatCurrency(plData.cogs)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Expenses</p>
                        <p className="text-2xl font-bold">{formatCurrency(plData.totalExpenses)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Net Profit</p>
                        <p className="text-2xl font-bold">{formatCurrency(plData.netProfit)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {plData.expensesByCategory.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                        <TableRow className="hover:bg-primary/90 border-none">
                          <TableHead className="text-white font-semibold">Category</TableHead>
                          <TableHead className="text-white font-semibold text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plData.expensesByCategory.map((e) => (
                          <TableRow key={e.categoryName}>
                            <TableCell className="font-medium">{e.categoryName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-500">No expenses in this period.</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button variant="outline" asChild>
                  <Link to="/finance">Go to Finance Dashboard</Link>
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">
                  No financial data for the selected period. View detailed reports in the Finance Dashboard.
                </p>
                <div className="flex justify-center">
                  <Button variant="outline" asChild>
                    <Link to="/finance">Go to Finance Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Stat detail sheet – how the metric was calculated */}
      <Sheet open={statDetailSheet != null} onOpenChange={(open) => !open && setStatDetailSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {statDetailSheet === 'total-revenue' && 'Revenue – services and prices'}
              {statDetailSheet === 'transactions' && 'Transactions – how the count was calculated'}
              {statDetailSheet === 'avg-bill' && 'Avg Bill Value – how it was calculated'}
              {statDetailSheet === 'unique-customers' && 'Unique Customers – how it was calculated'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {statDetailSheet === 'total-revenue' && (
              <>
                <p className="text-sm text-muted-foreground">Sales in the selected period with line items. Total revenue is the sum of all sale totals.</p>
                {reportSalesList.length === 0 ? (
                  <p className="text-muted-foreground py-4">No sales in the selected period.</p>
                ) : (
                  <div className="space-y-6">
                    {reportSalesList.map((sale) => {
                      const total = Number(sale.total) || 0;
                      const items = sale.items || [];
                      return (
                        <div key={sale.id} className="border rounded-lg p-4 space-y-3">
                          <p className="font-semibold text-sm">Total service price: {formatCurrency(total)}</p>
                          <Table>
                            <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                              <TableRow className="hover:bg-primary/90 border-none">
                                <TableHead className="text-white font-semibold">Service</TableHead>
                                <TableHead className="text-white font-semibold text-right">Price</TableHead>
                                <TableHead className="text-white font-semibold text-right">Qty</TableHead>
                                <TableHead className="text-white font-semibold text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item, idx) => {
                                const qty = item.quantity || 1;
                                const price = Number(item.price) || 0;
                                const rowTotal = Math.round(price * qty * 100) / 100;
                                return (
                                  <TableRow key={item.id ?? idx}>
                                    <TableCell>{item.serviceName ?? '–'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                                    <TableCell className="text-right">{qty}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(rowTotal)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                    <div className="pt-4 border-t bg-green-50 dark:bg-green-950/20 rounded-lg px-4 py-3">
                      <p className="font-semibold text-green-800 dark:text-green-200">Total revenue: {formatCurrency(reportSalesList.reduce((s, sale) => s + (Number(sale.total) || 0), 0))}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            {statDetailSheet === 'transactions' && (
              <>
                <p className="text-sm text-muted-foreground">Each paid sale in the selected period counts as one transaction.</p>
                {reportSalesList.length === 0 ? (
                  <p className="text-muted-foreground py-4">No transactions in the selected period.</p>
                ) : (
                  <div className="space-y-2">
                    <Table>
                      <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                        <TableRow className="hover:bg-primary/90 border-none">
                          <TableHead className="text-white font-semibold">Date</TableHead>
                          <TableHead className="text-white font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportSalesList.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>{sale.createdAt ? sale.createdAt.slice(0, 10) : '–'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(sale.total) || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-sm font-medium pt-2">Total transactions: {reportSalesList.length}</p>
                  </div>
                )}
              </>
            )}
            {statDetailSheet === 'avg-bill' && (
              <>
                <p className="text-sm text-muted-foreground">Avg Bill Value = Total Revenue ÷ Number of Transactions.</p>
                {salesData && (
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                    <p><span className="text-muted-foreground">Total Revenue:</span> {formatCurrency(salesData.totalRevenue)}</p>
                    <p><span className="text-muted-foreground">Transactions:</span> {salesData.transactions}</p>
                    <p className="font-semibold pt-2">Avg Bill = {formatCurrency(salesData.totalRevenue)} ÷ {salesData.transactions} = {formatCurrency(salesData.avgBill)}</p>
                  </div>
                )}
                {reportSalesList.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Supporting sales (same period):</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {reportSalesList.slice(0, 15).map((s) => (
                        <li key={s.id}>Total service price: {formatCurrency(Number(s.total) || 0)}</li>
                      ))}
                      {reportSalesList.length > 15 && <li>… and {reportSalesList.length - 15} more</li>}
                    </ul>
                  </div>
                )}
              </>
            )}
            {statDetailSheet === 'unique-customers' && (
              <>
                <p className="text-sm text-muted-foreground">Unique customers = number of distinct customers who had at least one paid sale in the selected period.</p>
                {salesData && (
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="font-semibold">Unique customers: {salesData.uniqueCustomers}</p>
                  </div>
                )}
                {reportSalesList.length > 0 && (
                  <p className="text-sm text-muted-foreground">Based on {reportSalesList.length} transaction(s) in the selected date range.</p>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
