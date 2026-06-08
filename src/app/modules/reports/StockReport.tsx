import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';
import { DataTable, Column } from '../../components/shared/DataTable';
import {
  Loader2,
  Calendar as CalendarIcon,
  MapPin,
  ChevronDown,
  History,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Package,
  Eye,
  Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import React from 'react';

const MOVEMENT_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ReactNode }> = {
  Added: {
    label: "Added",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  Deducted: {
    label: "Deducted",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    icon: <TrendingDown className="h-3 w-3" />,
  },
  TRANSFER_IN: {
    label: "Transfer In",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    icon: <ArrowLeftRight className="h-3 w-3" />,
  },
  TRANSFER_OUT: {
    label: "Transfer Out",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    icon: <ArrowLeftRight className="h-3 w-3" />,
  },
  SALE: {
    label: "Sale",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    icon: <TrendingDown className="h-3 w-3" />,
  },
  PURCHASE: {
    label: "Purchase",
    bgClass: "bg-teal-50",
    textClass: "text-teal-700",
    borderClass: "border-teal-200",
    icon: <TrendingUp className="h-3 w-3" />,
  },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

type StockReportItem = {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  variationName: string;
  category: string;
  location: string;
  unitSellingPrice: number;
  currentStock: number;
  currentStockValuePurchase: number;
  currentStockValueSale: number;
  potentialProfit: number;
  totalUnitSold: number;
  totalUnitTransfered: number;
  totalUnitAdjusted: number;
};

type StockReportTotals = {
  closingStockPurchasePrice: number;
  closingStockSalePrice: number;
  potentialProfit: number;
  profitMarginPercent: number;
};

type StockLog = {
  id: number;
  movementType: string;
  qtyChange: number;
  newQty: number;
  createdAt: string;
  notes: string;
  user?: { name: string };
};

export function StockReport() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();

  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  });

  const [items, setItems] = useState<StockReportItem[]>([]);
  const [totals, setTotals] = useState<StockReportTotals | null>(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");

  // View state
  const [viewingItem, setViewingItem] = useState<StockReportItem | null>(null);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const logsLimit = 10;

  const handleViewHistory = async (item: StockReportItem) => {
    setViewingItem(item);
    setLogsLoading(true);
    setLogsPage(1);
    try {
      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const params = new URLSearchParams();
      params.set('productId', item.productId.toString());
      if (selectedBranchId) params.set('branchId', selectedBranchId.toString());

      const res = await fetch(`${API_BASE}/stocks/logs?${params.toString()}`, { headers });
      const json = await res.json();
      if (json.success && json.data) {
        setStockLogs(json.data);
      } else {
        setStockLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch stock logs:', err);
      setStockLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('from', fromDate);
      params.set('to', toDate);

      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/stock?${params.toString()}`, {
        headers,
      });
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data);
        setTotals(json.totals);
        setTotalRecords(json.total || 0);
      } else {
        setItems([]);
        setTotals(null);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error('Failed to fetch stock report:', err);
      setItems([]);
      setTotals(null);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedBranchId, fromDate, toDate]);

  const handleDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth') => {
    const today = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'today') {
      const dateStr = format(today);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dateStr = format(yesterday);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setFromDate(format(past));
      setToDate(format(today));
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setFromDate(format(past));
      setToDate(format(today));
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFromDate(format(start));
      setToDate(format(end));
    } else if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(format(start));
      setToDate(format(end));
    }
    setPage(1);
    setDatePresetOpen(false);
  };

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Calculate summary statistics for history view
  const calculateHistorySummary = () => {
    const quantitiesIn = {
      purchase: stockLogs.filter(l => l.movementType === 'PURCHASE' || (l.movementType === 'Added' && l.notes?.toLowerCase().includes('purchase'))).reduce((sum, l) => sum + Number(l.qtyChange), 0),
      opening: stockLogs.filter(l => l.movementType === 'Added' && l.notes?.toLowerCase().includes('opening')).reduce((sum, l) => sum + Number(l.qtyChange), 0),
      sellReturn: stockLogs.filter(l => l.movementType === 'Added' && l.notes?.toLowerCase().includes('return')).reduce((sum, l) => sum + Number(l.qtyChange), 0),
      transferIn: stockLogs.filter(l => l.movementType === 'TRANSFER_IN').reduce((sum, l) => sum + Number(l.qtyChange), 0),
    };

    const quantitiesOut = {
      sold: Math.abs(stockLogs.filter(l => l.movementType === 'SALE' || (l.movementType === 'Deducted' && l.notes?.toLowerCase().includes('sale'))).reduce((sum, l) => sum + Number(l.qtyChange), 0)),
      adjustment: Math.abs(stockLogs.filter(l => l.notes?.toLowerCase().includes('adjustment') && Number(l.qtyChange) < 0).reduce((sum, l) => sum + Number(l.qtyChange), 0)),
      purchaseReturn: Math.abs(stockLogs.filter(l => l.movementType === 'Deducted' && l.notes?.toLowerCase().includes('return')).reduce((sum, l) => sum + Number(l.qtyChange), 0)),
      transferOut: Math.abs(stockLogs.filter(l => l.movementType === 'TRANSFER_OUT').reduce((sum, l) => sum + Number(l.qtyChange), 0)),
    };

    return { quantitiesIn, quantitiesOut };
  };

  // Define columns for main report DataTable
  const columns: Column<StockReportItem>[] = [
    {
      header: 'Action',
      render: (item) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-0 cursor-pointer text-blue-600 hover:bg-blue-50"
                onClick={() => handleViewHistory(item)}
              >
                <History className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Product stock history</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      align: 'center'
    },
    { header: 'SKU', accessor: 'sku', className: 'font-medium' },
    { header: 'Product', accessor: 'productName' },
    { header: 'Variation', accessor: 'variationName' },
    { header: 'Category', accessor: 'category' },
    { header: 'Location', accessor: 'location' },
    {
      header: 'Unit Selling Price',
      render: (item) => formatCurrency(item.unitSellingPrice),
      align: 'right'
    },
    {
      header: 'Current stock',
      render: (item) => `${item.currentStock} Pc(s)`,
      align: 'right'
    },
    {
      header: 'Current Stock Value (Purchase)',
      render: (item) => formatCurrency(item.currentStockValuePurchase),
      align: 'right'
    },
    {
      header: 'Current Stock Value (Sale)',
      render: (item) => formatCurrency(item.currentStockValueSale),
      align: 'right'
    },
    {
      header: 'Potential profit',
      render: (item) => formatCurrency(item.potentialProfit),
      align: 'right'
    },
    {
      header: 'Total unit sold',
      render: (item) => `${item.totalUnitSold} Pc(s)`,
      align: 'right'
    },
    {
      header: 'Total Unit Transfered',
      render: (item) => `${item.totalUnitTransfered} Pc(s)`,
      align: 'right'
    },
    {
      header: 'Total Unit Adjusted',
      render: (item) => `${item.totalUnitAdjusted} Pc(s)`,
      align: 'right'
    }
  ];

  // Define columns for history DataTable
  const historyColumns: Column<StockLog>[] = [
    {
      header: 'Type',
      render: (log) => {
        const isPositive = log.qtyChange > 0;
        const config = MOVEMENT_CONFIG[log.movementType] ?? {
          label: log.movementType.replace(/_/g, " "),
          bgClass: "bg-gray-50",
          textClass: "text-gray-700",
          borderClass: "border-gray-200",
          icon: null,
        };
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
            {config.icon}
            {config.label}
          </span>
        );
      }
    },
    {
      header: 'Quantity change',
      render: (log) => {
        const isPositive = log.qtyChange > 0;
        return (
          <span className={`font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{log.qtyChange}
          </span>
        );
      },
      align: 'center'
    },
    {
      header: 'New Quantity',
      accessor: 'newQty',
      render: (log) => <span className="font-semibold">{log.newQty}</span>,
      align: 'center'
    },
    {
      header: 'Date',
      render: (log) => formatDate(log.createdAt)
    },
    {
      header: 'Reference No',
      render: (log) => log.notes || "—"
    },
    {
      header: 'Customer/Supplier information',
      render: (log) => log.user?.name || "System"
    }
  ];

  return (
    <TooltipProvider>
      <div className="p-3 space-y-3 w-full">
        {viewingItem ? (
          // --- HISTORY VIEW ---
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  setViewingItem(null);
                  setStockLogs([]);
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-primary">Product Stock History</h1>
            </div>

            {/* Summary Cards for History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quantities In Card */}
              <Card className="shadow-sm border border-gray-100">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Quantities In</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchase</span>
                      <span className="font-medium text-emerald-600">
                        {calculateHistorySummary().quantitiesIn.purchase.toFixed(2)} Pc(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Stock</span>
                      <span className="font-medium text-emerald-600">
                        {calculateHistorySummary().quantitiesIn.opening.toFixed(2)} Pc(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sell Return</span>
                      <span className="font-medium text-emerald-600">
                        {calculateHistorySummary().quantitiesIn.sellReturn.toFixed(2)} Pc(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock Transfers (In)</span>
                      <span className="font-medium text-emerald-600">
                        {calculateHistorySummary().quantitiesIn.transferIn.toFixed(2)} Pc(s)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quantities Out Card */}
              <Card className="shadow-sm border border-gray-100">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Quantities Out</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sold</span>
                      <span className="font-medium text-red-600">
                        {calculateHistorySummary().quantitiesOut.sold.toFixed(2)} Pc(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Stock Adjustment</span>
                      <span className="font-medium text-red-600">
                        {calculateHistorySummary().quantitiesOut.adjustment.toFixed(2)} Pc(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchase Return</span>
                      <span className="font-medium text-red-600">
                        {calculateHistorySummary().quantitiesOut.purchaseReturn.toFixed(2)} Pc(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock Transfers (Out)</span>
                      <span className="font-medium text-red-600">
                        {calculateHistorySummary().quantitiesOut.transferOut.toFixed(2)} Pc(s)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Stock Summary */}
            <Card className="shadow-sm border border-gray-100 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Product</p>
                    <p className="font-semibold text-gray-900">{viewingItem.productName} ({viewingItem.sku})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Current Stock</p>
                    <p className="text-2xl font-bold text-primary">{Number(viewingItem.currentStock).toFixed(2)} Pc(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History DataTable */}
            <DataTable
              title="Stock Movement History"
              icon={History}
              columns={historyColumns}
              data={stockLogs}
              loading={logsLoading}
              emptyMessage="No stock history found"
              exportable
              exportFileName="stock-movement-history"
              pagination={{
                total: stockLogs.length,
                page: logsPage,
                limit: logsLimit,
                onPageChange: setLogsPage,
                itemLabel: "entries"
              }}
            />
          </div>
        ) : (
          // --- MAIN REPORT VIEW ---
          <>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-primary">Stock Report</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Detailed stock valuation and potential profit report
                </p>
              </div>

              {/* Branch Dropdown */}
              <div className="flex items-center gap-2">
                <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 truncate text-gray-700">
                        <MapPin className="w-4 h-4 text-primary" />
                        {selectedBranch ? selectedBranch.name : 'All branches'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-1" align="end">
                    <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                      <button
                        onClick={() => {
                          setSelectedBranchId(null);
                          setBranchPopoverOpen(false);
                          setPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${selectedBranchId === null ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'
                          }`}
                      >
                        All branches
                      </button>
                      {branches.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedBranchId(b.id);
                            setBranchPopoverOpen(false);
                            setPage(1);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${selectedBranchId === b.id ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'
                            }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover open={datePresetOpen} onOpenChange={setDatePresetOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-between gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/95"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Filter by date
                      </span>
                      <ChevronDown className="w-4 h-4 text-white/80 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-1" align="end">
                    <div className="flex flex-col space-y-0.5">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-sm border border-gray-100">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 font-medium">Closing stock (By purchase price)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : totals ? formatCurrency(totals.closingStockPurchasePrice) : formatCurrency(0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-gray-100">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 font-medium">Closing stock (By sale price)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : totals ? formatCurrency(totals.closingStockSalePrice) : formatCurrency(0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-gray-100">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 font-medium">Potential profit</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : totals ? formatCurrency(totals.potentialProfit) : formatCurrency(0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border border-gray-100">
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 font-medium">Profit Margin %</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : totals ? totals.profitMarginPercent.toFixed(2) + '%' : '0.00%'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Report DataTable */}
            {(() => {
              const searched = items.filter((item) =>
                item.productName.toLowerCase().includes(search.toLowerCase()) ||
                item.sku.toLowerCase().includes(search.toLowerCase()) ||
                item.variationName.toLowerCase().includes(search.toLowerCase()) ||
                item.category.toLowerCase().includes(search.toLowerCase()) ||
                item.location.toLowerCase().includes(search.toLowerCase())
              );
              const paginatedData = searched.slice((page - 1) * limit, page * limit);
              return (
            <DataTable
              title="Stock Inventory"
              icon={Package}
              columns={columns}
              data={paginatedData}
              loading={loading}
              emptyMessage="No stock data found for the selected criteria"
              exportable
              exportFileName="stock-report"
              pagination={{
                total: searched.length,
                page,
                limit,
                onPageChange: setPage,
                onLimitChange: setLimit,
                itemLabel: "stock records"
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
                   <div className="relative ml-auto">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                    />
                  </div>
                </div>
              }
            />
            ); })()}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}