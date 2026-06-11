import { useCallback, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { useBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { ApiService } from "../../../api/ApiService";
import { DataTable, Column } from "../../components/shared/DataTable";
import { Input } from "../../components/ui/input";
import { Calendar as CalendarIcon, ChevronDown, Loader2, MapPin, Check, Package, Search } from "lucide-react";

/*type PurchaseItem = {
  id: number;
  name: string;
  quantity: number | string;
  unitCost: number | string;
};

type PurchaseRow = {
  id: number;
  referenceNo: string;
  purchaseDate: string;
  Supplier?: { name?: string | null } | null;
  PurchaseItems?: PurchaseItem[];
  totalAmount?: number | string;
};

type FlatPurchaseRecord = {
  id: string;
  productName: string;
  sku: string;
  supplierName: string;
  referenceNo: string;
  purchaseDate: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};*/

type PurchaseRecord = {
  id: number;
  referenceNo: string;
  purchaseDate: string;
  supplierName: string;
  weight: number;
  rate: number;
  totalAmount: number;
  lorryNo: string;
  transportName: string;
  additionalNotes: string;
};

export function ProductPurchaseReport() {
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

  /*const [allPurchases, setAllPurchases] = useState<PurchaseRow[]>([]);
  const [rows, setRows] = useState<FlatPurchaseRecord[]>([]);*/
  const [items, setItems] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [totals, setTotals] = useState({ totalWeight: 0, totalAmount: 0 });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.purchases.getAll({
        page,
        limit,
        branchId: selectedBranchId ?? undefined,
        from: fromDate,
        to: toDate,
        search: search || undefined,
      });
      if (res?.success) {
        const data: any[] = Array.isArray(res.data) ? res.data : [];
        const mapped: PurchaseRecord[] = data.map((p: any) => ({
          id: p.id,
          referenceNo: p.referenceNo || '',
          purchaseDate: p.purchaseDate ? String(p.purchaseDate).slice(0, 10) : '',
          supplierName: p.Supplier?.name || '—',
          weight: Number(p.weight) || 0,
          rate: Number(p.rate) || 0,
          totalAmount: Number(p.totalAmount) || 0,
          lorryNo: p.lorryNo || '',
          transportName: p.transportName || '',
          additionalNotes: p.additionalNotes || '',
        }));
        setItems(mapped);
        setTotal(res.total || 0);
        const tw = mapped.reduce((s, r) => s + r.weight, 0);
        const ta = mapped.reduce((s, r) => s + r.totalAmount, 0);
        setTotals({ totalWeight: tw, totalAmount: ta });
      } else {
        setItems([]);
        setTotal(0);
        setTotals({ totalWeight: 0, totalAmount: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch product purchase report:", error);
      setItems([]);
      setTotal(0);
      setTotals({ totalWeight: 0, totalAmount: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, page, limit, fromDate, toDate, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, search]);

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

  // Define columns for DataTable
  /*const columns: Column<FlatPurchaseRecord>[] = [
    { header: 'Product', accessor: 'productName', className: 'font-medium' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Supplier', accessor: 'supplierName' },
    { header: 'Reference No', accessor: 'referenceNo' },
    { header: 'Date', accessor: 'purchaseDate' },
    { header: 'Quantity', render: (record) => `${record.quantity.toFixed(2)} Pc(s)`, align: 'right' },
    { header: 'Unit Purchase Price', accessor: 'unitCost', render: (record) => formatCurrency(record.unitCost), align: 'right' },
    { header: 'Subtotal', accessor: 'subtotal', render: (record) => formatCurrency(record.subtotal), align: 'right', className: 'font-semibold' }
  ];*/

  const columns: Column<PurchaseRecord>[] = [
    { header: 'Id', accessor: 'id' },
    { header: 'Date', accessor: 'purchaseDate' },
    { header: 'Supplier', accessor: 'supplierName' },
    { header: 'Receipt', accessor: 'referenceNo' },
    { header: 'Weight', render: (record) => `${Number(record.weight || 0).toLocaleString()} kg`, align: 'right' },
    { header: 'Rate', render: (record) => formatCurrency(Number(record.rate || 0)), align: 'right' },
    { header: 'Total', render: (record) => formatCurrency(Number(record.totalAmount || 0)), align: 'right', className: 'font-bold' },
    { header: 'Driver', accessor: 'transportName' },
    { header: 'Lorry', accessor: 'lorryNo' },
    { header: 'Note', accessor: 'additionalNotes' },
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Purchase Report</h1>
          <p className="text-gray-500 text-sm mt-1">
            Detailed purchase records with receipt, weight, rate and transport info
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
        title="Purchase Records"
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No purchases found for the selected criteria"
        exportable
        exportFileName="purchase-report"
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
          itemLabel: "purchase records"
        }}
        footer={
          <div className="px-3 py-2.5 bg-gray-50/80 border-t border-gray-200 flex items-center justify-end gap-6 text-sm">
            <span className="font-semibold text-gray-700">
              Total Weight: <span className="text-gray-900">{Number(totals.totalWeight).toLocaleString()} kg</span>
            </span>
            <span className="font-semibold text-gray-700">
              Total Amount: <span className="text-gray-900">{formatCurrency(totals.totalAmount)}</span>
            </span>
          </div>
        }
      />
    </div>
  );
}
