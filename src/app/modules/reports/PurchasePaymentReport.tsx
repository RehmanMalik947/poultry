import { useCallback, useEffect, useState } from "react";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { useCurrency } from "../../contexts/CurrencyContext";
import { ApiService } from "../../../api/ApiService";
import { DataTable, Column } from "../../components/shared/DataTable";
// Add getAuthHeadersWithBranch and API_BASE
import { useBranch, getAuthHeadersWithBranch } from "../../contexts/BranchContext";
import { API_BASE } from "../../../api/ApiService";
import { Calendar as CalendarIcon, ChevronDown, Loader2, MapPin, Check, DollarSign, FileText, Search } from "lucide-react";

type PurchasePaymentRow = {
  id: number;
  referenceNo: string;
  paidOn: string;
  amount: number;
  supplierName: string;
  paymentMethod: string;
  purchaseReference: string;
};

export function PurchasePaymentReport() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();

  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  });

  const [rows, setRows] = useState<PurchasePaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalAmount, setGlobalAmount] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (search) params.set('search', search);

      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/purchase-payment?${params.toString()}`, { headers });
      const json = await res.json();

      if (json.success) {
        setRows(json.data || []);
        setTotal(json.total || 0);
        setGlobalAmount(json.totalAmount || 0);
      } else {
        setRows([]);
        setTotal(0);
        setGlobalAmount(0);
      }
    } catch (error) {
      console.error("Failed to fetch purchase payment report:", error);
      setRows([]);
      setTotal(0);
      setGlobalAmount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, page, limit, fromDate, toDate, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDatePreset = (preset: "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "lastMonth") => {
    const today = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "today") {
      const dateStr = format(today);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dateStr = format(yesterday);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === "7days") {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setFromDate(format(past));
      setToDate(format(today));
    } else if (preset === "30days") {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setFromDate(format(past));
      setToDate(format(today));
    } else if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFromDate(format(start));
      setToDate(format(end));
    } else if (preset === "lastMonth") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(format(start));
      setToDate(format(end));
    }
    setPage(1);
    setDatePresetOpen(false);
  };

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  // Define columns for DataTable
  const columns: Column<PurchasePaymentRow>[] = [
    { 
      header: 'Reference No', 
      accessor: 'referenceNo',
      className: 'font-medium'
    },
    { 
      header: 'Paid on', 
      accessor: 'paidOn',
      render: (record) => formatDate(record.paidOn)
    },
    { 
      header: 'Amount', 
      accessor: 'amount',
      render: (record) => formatCurrency(record.amount),
      align: 'left',
      className: 'font-semibold'
    },
    { 
      header: 'Supplier', 
      accessor: 'supplierName'
    },
    { 
      header: 'Payment Method', 
      accessor: 'paymentMethod',
      render: (record) => record.paymentMethod?.replace('_', ' ') || '—',
      className: 'capitalize'
    },
    { 
      header: 'Purchase', 
      accessor: 'purchaseReference'
    }
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Purchase Payment Report</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track all purchase payments and supplier payment history
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Branch Selector */}
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

          {/* Date Filter */}
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
                <button onClick={() => handleDatePreset("today")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Today</button>
                <button onClick={() => handleDatePreset("yesterday")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Yesterday</button>
                <button onClick={() => handleDatePreset("7days")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last 7 Days</button>
                <button onClick={() => handleDatePreset("30days")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last 30 Days</button>
                <button onClick={() => handleDatePreset("thisMonth")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">This Month</button>
                <button onClick={() => handleDatePreset("lastMonth")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">Last Month</button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Report DataTable */}
      <DataTable
        title="Payment History"
        icon={DollarSign}
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No payments found for the selected criteria"
        exportable
        exportFileName="purchase-payments"
        filters={
          <>
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
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
              />
            </div>
            
          </>
        }
        pagination={{
          total: total,
          page: page,
          limit: limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "payment records"
        }}
        footer={
          <div className="flex justify-between items-center px-4 py-3 bg-gray-50/80 border-t rounded-b-xl">
            <span className="font-bold text-gray-700">Total Payments:</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(globalAmount)}</span>
          </div>
        }
      />
    </div>
  );
}