import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';
import { DataTable, Column } from '../../components/shared/DataTable';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ReceiptText,
  Search,
  MapPin,
  Calculator,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  TooltipProvider,
} from '../../components/ui/tooltip';

type TabKey = 'input' | 'output' | 'expense';

type TaxSummary = {
  outputTax: number;
  inputTax: number;
  expenseTax: number;
  netTax: number;
};

type SalesTaxRow = {
  id: number | string;
  date: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  discount: number;
  taxAmount: number;
};

type PurchaseTaxRow = {
  id: number | string;
  date: string;
  referenceNo: string;
  supplierName: string;
  total: number;
  paymentMethod: string;
  discount: number;
  taxAmount: number;
};

type ExpenseTaxRow = {
  id: number | string;
  date: string;
  referenceNo: string;
  total: number;
  paymentMethod: string;
  taxAmount: number;
};

const emptySummary: TaxSummary = {
  outputTax: 0,
  inputTax: 0,
  expenseTax: 0,
  netTax: 0,
};

export default function TaxReport() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();

  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>(() => '2000-01-01');
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState<TabKey>('input');
  const [summary, setSummary] = useState<TaxSummary>(emptySummary);
  const [salesData, setSalesData] = useState<SalesTaxRow[]>([]);
  const [purchasesData, setPurchasesData] = useState<PurchaseTaxRow[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseTaxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('from', fromDate);
      params.set('to', toDate);

      // Kept for compatibility if your tax endpoint still reads branchId from query.
      // Your Product Sell Report style uses x-branch-id from getAuthHeadersWithBranch.
      if (selectedBranchId) params.set('branchId', selectedBranchId.toString());

      const res = await fetch(`${API_BASE}/reports/tax?${params.toString()}`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });

      const data = await res.json();

      if (data.success) {
        const payload = data.data || data;
        setSummary(payload.summary || emptySummary);
        setSalesData(payload.sales || []);
        setPurchasesData(payload.purchases || []);
        setExpensesData(payload.expenses || []);
      } else {
        setSummary(emptySummary);
        setSalesData([]);
        setPurchasesData([]);
        setExpensesData([]);
      }
    } catch (err) {
      console.error('Failed to fetch tax report:', err);
      setSummary(emptySummary);
      setSalesData([]);
      setPurchasesData([]);
      setExpensesData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, selectedBranchId, activeTab, search]);

  const handleDatePreset = (
    preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'allTime'
  ) => {
    const today = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'allTime') {
      setFromDate('2000-01-01');
      setToDate(format(today));
    } else if (preset === 'today') {
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

  const formatDate = (date: string) => {
    if (!date) return '-';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString();
  };

  const normalize = (value: unknown) => String(value || '').toLowerCase();

  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return purchasesData;

    return purchasesData.filter((item) => {
      return (
        normalize(item.referenceNo).includes(term) ||
        normalize(item.supplierName).includes(term) ||
        normalize(item.paymentMethod).includes(term) ||
        normalize(item.total).includes(term) ||
        normalize(item.taxAmount).includes(term)
      );
    });
  }, [purchasesData, search]);

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return salesData;

    return salesData.filter((item) => {
      return (
        normalize(item.invoiceNumber).includes(term) ||
        normalize(item.customerName).includes(term) ||
        normalize(item.paymentMethod).includes(term) ||
        normalize(item.total).includes(term) ||
        normalize(item.taxAmount).includes(term)
      );
    });
  }, [salesData, search]);

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expensesData;

    return expensesData.filter((item) => {
      return (
        normalize(item.referenceNo).includes(term) ||
        normalize(item.paymentMethod).includes(term) ||
        normalize(item.total).includes(term) ||
        normalize(item.taxAmount).includes(term)
      );
    });
  }, [expensesData, search]);

  const currentTotalRecords =
    activeTab === 'input'
      ? filteredPurchases.length
      : activeTab === 'output'
        ? filteredSales.length
        : filteredExpenses.length;

  const offset = (page - 1) * limit;
  const paginatedPurchases = filteredPurchases.slice(offset, offset + limit);
  const paginatedSales = filteredSales.slice(offset, offset + limit);
  const paginatedExpenses = filteredExpenses.slice(offset, offset + limit);

  const paymentMethodLabel = (method: string) => {
    if (!method) return '-';
    return method
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const purchaseColumns: Column<PurchaseTaxRow>[] = [
    { header: 'Date', render: (item) => formatDate(item.date) },
    { header: 'Reference No.', accessor: 'referenceNo', className: 'font-medium text-primary' },
    { header: 'Supplier', accessor: 'supplierName' },
    { header: 'Payment Method', render: (item) => paymentMethodLabel(item.paymentMethod) },
    { header: 'Total Amount', render: (item) => formatCurrency(item.total || 0), align: 'right' },
    { header: 'Discount', render: (item) => formatCurrency(item.discount || 0), align: 'right' },
    { header: 'Input Tax', render: (item) => formatCurrency(item.taxAmount || 0), align: 'right', className: 'font-bold' },
  ];

  const salesColumns: Column<SalesTaxRow>[] = [
    { header: 'Date', render: (item) => formatDate(item.date) },
    { header: 'Invoice No.', accessor: 'invoiceNumber', className: 'font-medium text-primary' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Payment Method', render: (item) => paymentMethodLabel(item.paymentMethod) },
    { header: 'Total Amount', render: (item) => formatCurrency(item.total || 0), align: 'right' },
    { header: 'Discount', render: (item) => formatCurrency(item.discount || 0), align: 'right' },
    { header: 'Output Tax', render: (item) => formatCurrency(item.taxAmount || 0), align: 'right', className: 'font-bold' },
  ];

  const expenseColumns: Column<ExpenseTaxRow>[] = [
    { header: 'Date', render: (item) => formatDate(item.date) },
    { header: 'Reference No.', accessor: 'referenceNo', className: 'font-medium text-primary' },
    { header: 'Payment Method', render: (item) => paymentMethodLabel(item.paymentMethod) },
    { header: 'Total Amount', render: (item) => formatCurrency(item.total || 0), align: 'right' },
    { header: 'Expense Tax', render: (item) => formatCurrency(item.taxAmount || 0), align: 'right', className: 'font-bold' },
  ];

  const tableFilters = (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setLimit(Number(value));
            setPage(1);
          }}
        >
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

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
        />
      </div>
    </>
  );

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-medium">Output Tax</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.outputTax || 0)}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-medium">Input Tax</p>
            <TrendingDown className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.inputTax || 0)}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-medium">Expense Tax</p>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.expenseTax || 0)}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-medium">Net Tax</p>
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <p className={`text-2xl font-bold mt-1 ${(summary.netTax || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(summary.netTax || 0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="p-3 space-y-3 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Tax Report</h1>
            <p className="text-gray-500 text-sm mt-1">
              Input, output, expense, and net tax analysis for selected branches and dates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-accent"
                >
                  <span className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 shrink-0 text-primary" />
                    {selectedBranch ? selectedBranch.name : 'Select branch'}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[220px] z-[100] p-1" sideOffset={8}>
                <div className="max-h-[280px] overflow-y-auto" role="listbox">
                  <button
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
                  className="inline-flex h-9 items-center justify-between gap-2 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-primary/95"
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

        {renderSummaryCards()}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <TabsList className="bg-white border p-1 h-12">
              <TabsTrigger value="input" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <TrendingDown className="w-4 h-4 mr-2" /> Input Tax
              </TabsTrigger>
              <TabsTrigger value="output" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <TrendingUp className="w-4 h-4 mr-2" /> Output Tax
              </TabsTrigger>
              <TabsTrigger value="expense" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <DollarSign className="w-4 h-4 mr-2" /> Expense Tax
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="input" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Input Tax Details"
              icon={TrendingDown}
              columns={purchaseColumns}
              data={paginatedPurchases}
              loading={loading}
              emptyMessage="No input tax found for the selected criteria"
              exportable
              exportFileName="input-tax-report"
              pagination={{
                total: currentTotalRecords,
                page,
                limit,
                onPageChange: setPage,
                onLimitChange: setLimit,
                itemLabel: 'purchase tax records',
              }}
              filters={tableFilters}
            />
          </TabsContent>

          <TabsContent value="output" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Output Tax Details"
              icon={ReceiptText}
              columns={salesColumns}
              data={paginatedSales}
              loading={loading}
              emptyMessage="No output tax found for the selected criteria"
              exportable
              exportFileName="output-tax-report"
              pagination={{
                total: currentTotalRecords,
                page,
                limit,
                onPageChange: setPage,
                onLimitChange: setLimit,
                itemLabel: 'sales tax records',
              }}
              filters={tableFilters}
            />
          </TabsContent>

          <TabsContent value="expense" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Expense Tax Details"
              icon={DollarSign}
              columns={expenseColumns}
              data={paginatedExpenses}
              loading={loading}
              emptyMessage="No expense tax found for the selected criteria"
              exportable
              exportFileName="expense-tax-report"
              pagination={{
                total: currentTotalRecords,
                page,
                limit,
                onPageChange: setPage,
                onLimitChange: setLimit,
                itemLabel: 'expense tax records',
              }}
              filters={tableFilters}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
