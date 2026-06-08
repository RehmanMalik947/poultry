import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Badge } from "../../components/ui/badge";
import {
  Loader2,
  Users,
  Info,
  Calendar as CalendarIcon,
  MapPin,
  ChevronDown,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { useBranch, getAuthHeadersWithBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { API_BASE } from "../../../api/ApiService";
import { DataTable, Column } from "../../components/shared/DataTable";

type ContactRecord = {
  contactId: number;
  contactName: string;
  contactType: "Customer" | "Supplier";
  totalPurchase: number;
  totalPurchaseReturn: number;
  totalSale: number;
  totalSellReturn: number;
  openingBalanceDue: number;
  due: number;
};

type ReportResponse = {
  success: boolean;
  data: ContactRecord[];
  total: number;
  totals: {
    totalPurchase: number;
    totalPurchaseReturn: number;
    totalSale: number;
    totalSellReturn: number;
    totalOpeningBalance: number;
    totalDue: number;
  };
  page: number;
  limit: number;
  totalPages: number;
};

export function SupplierCustomerReport() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();

  const [contactType, setContactType] = useState<"all" | "customer" | "supplier">("all");
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

  const [records, setRecords] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState("");

  const [totals, setTotals] = useState({
    totalPurchase: 0,
    totalPurchaseReturn: 0,
    totalSale: 0,
    totalSellReturn: 0,
    totalOpeningBalance: 0,
    totalDue: 0,
  });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("type", contactType);
      params.set("from", fromDate);
      params.set("to", toDate);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/supplier-customer?${params.toString()}`, {
        headers,
      });
      const json: ReportResponse = await res.json();

      if (json.success && json.data) {
        setRecords(json.data);
        setTotalItems(json.total || json.data.length);
        if (json.totals) {
          setTotals(json.totals);
        } else {
          setTotals({
            totalPurchase: json.data.reduce((sum: number, r: ContactRecord) => sum + r.totalPurchase, 0),
            totalPurchaseReturn: json.data.reduce((sum: number, r: ContactRecord) => sum + r.totalPurchaseReturn, 0),
            totalSale: json.data.reduce((sum: number, r: ContactRecord) => sum + r.totalSale, 0),
            totalSellReturn: json.data.reduce((sum: number, r: ContactRecord) => sum + r.totalSellReturn, 0),
            totalOpeningBalance: json.data.reduce((sum: number, r: ContactRecord) => sum + r.openingBalanceDue, 0),
            totalDue: json.data.reduce((sum: number, r: ContactRecord) => sum + r.due, 0),
          });
        }
      } else {
        setRecords([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch supplier customer report:", err);
      setError("Failed to load report data");
      setRecords([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [contactType, fromDate, toDate, selectedBranchId, page]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    setPage(1);
  }, [contactType, selectedBranchId, fromDate, toDate]);

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

  const columns: Column<ContactRecord>[] = [
    {
      header: "Contact",
      render: (record) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{record.contactName}</span>
          <Badge variant="outline" className="w-fit mt-0.5 text-xs">
            {record.contactType}
          </Badge>
        </div>
      ),
    },
    {
      header: "Total Purchase",
      align: "right",
      render: (record) => formatCurrency(record.totalPurchase),
    },
    {
      header: "Purchase Return",
      align: "right",
      render: (record) => formatCurrency(record.totalPurchaseReturn),
    },
    {
      header: "Total Sale",
      align: "right",
      render: (record) => formatCurrency(record.totalSale),
    },
    {
      header: "Sell Return",
      align: "right",
      render: (record) => formatCurrency(record.totalSellReturn),
    },
    {
      header: "Opening Balance",
      align: "right",
      render: (record) => formatCurrency(record.openingBalanceDue),
    },
    {
      header: "Due Amount",
      align: "right",
      render: (record) => (
        <div className="flex items-center justify-end gap-1">
          <span className={record.due < 0 ? "text-red-600 font-semibold" : record.due > 0 ? "text-green-600 font-semibold" : "text-gray-900"}>
            {formatCurrency(record.due)}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-blue-500 hover:text-blue-600">
                <Info className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3 text-xs text-gray-600 font-normal normal-case leading-relaxed">
              For customers, outstanding balance is positive if they owe you. For suppliers, outstanding balance is negative if you owe them.
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
  ];

  const searched = records.filter((item) =>
    item.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = searched.slice((page - 1) * limit, page * limit);

  const footerRow = searched.length > 0 ? (
    <tr className="bg-gray-100/60 font-bold border-t-2 border-gray-200">
      <td className="px-4 py-3 text-gray-900 text-base">Total:</td>
      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.totalPurchase)}</td>
      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.totalPurchaseReturn)}</td>
      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.totalSale)}</td>
      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.totalSellReturn)}</td>
      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.totalOpeningBalance)}</td>
      <td className="px-4 py-3 text-right">
        <span className={totals.totalDue < 0 ? "text-red-600" : totals.totalDue > 0 ? "text-green-600" : "text-gray-900"}>
          {formatCurrency(totals.totalDue)}
        </span>
      </td>
    </tr>
  ) : null;

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Customers & Suppliers Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-gray-50"
              >
                <span className="flex items-center gap-2 truncate text-gray-700">
                  <MapPin className="w-4 h-4 text-primary" />
                  {selectedBranch ? selectedBranch.name : "All branches"}
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
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${selectedBranchId === null ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"}`}
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
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${selectedBranchId === b.id ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"}`}
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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <DataTable
        title="Contact Summary"
        icon={Users}
        columns={columns}
        data={paginatedData}
        loading={loading}
        exportable
        exportFileName="contact-summary"
        pagination={{
          total: searched.length,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "contacts",
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
            <Select
              value={contactType}
              onValueChange={(v) => setContactType(v as typeof contactType)}
            >
              <SelectTrigger className="w-[160px] h-9 border-gray-300 border-2 rounded-lg hover:bg-gray-50 text-sm [&>svg]:text-gray-300">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="customer">Customers Only</SelectItem>
                <SelectItem value="supplier">Suppliers Only</SelectItem>
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
        footer={footerRow}
      />
    </div>
  );
}
