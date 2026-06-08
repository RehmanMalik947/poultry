import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';
import {
  Loader2,
  Calendar as CalendarIcon,
  MapPin,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { TablePagination } from '../../components/shared/TablePagination';
import React from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type AdjustmentTotals = {
  totalNormal: number;
  totalAbnormal: number;
  totalStockAdjustment: number;
  totalAmountRecovered: number;
};

type AdjustmentRow = {
  id: number;
  referenceNo: string;
  adjustmentType: 'Normal' | 'Abnormal';
  totalAmount: number | string;
  reason: string | null;
  createdAt: string;
  Branch?: { id: number; name: string };
  user?: { id: number; name: string };
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

// ─── Component ───────────────────────────────────────────────────────────────

export function StockAdjustmentReport() {
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

  const [totals, setTotals] = useState<AdjustmentTotals | null>(null);
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('from', fromDate);
      params.set('to', toDate);

      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/stock-adjustment?${params.toString()}`, { headers });
      const json = await res.json();

      if (json.success) {
        setTotals(json.totals);
        setRows(json.data || []);
        setTotalRecords(json.total || 0);
      }
    } catch (err) {
      console.error('StockAdjustmentReport fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, page, fromDate, toDate]);

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

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4 min-h-screen pb-24">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Stock Adjustment Report</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of all stock adjustments by type and value</p>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Branch dropdown */}
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 min-w-[170px] items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-primary hover:bg-gray-50"
              >
                <span className="flex items-center gap-2 truncate text-gray-700">
                  <span className="p-1 bg-blue-600 rounded-md text-white">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  {selectedBranch ? selectedBranch.name : 'All branches'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-1" align="end">
              <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                <button
                  onClick={() => { setSelectedBranchId(null); setBranchPopoverOpen(false); setPage(1); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${selectedBranchId === null ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'}`}
                >
                  All branches
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBranchId(b.id); setBranchPopoverOpen(false); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${selectedBranchId === b.id ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'}`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left card */}
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="p-6 space-y-3">
            {[
              { label: 'Total Normal', value: totals ? formatCurrency(totals.totalNormal) : formatCurrency(0) },
              { label: 'Total Abnormal', value: totals ? formatCurrency(totals.totalAbnormal) : formatCurrency(0) },
              { label: 'Total Stock Adjustment', value: totals ? formatCurrency(totals.totalStockAdjustment) : formatCurrency(0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">{label}:</span>
                <span className="text-primary font-bold">{loading ? '...' : value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right card */}
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total Amount Recovered:</span>
              <span className="text-primary font-bold">
                {loading ? '...' : totals ? formatCurrency(totals.totalAmountRecovered) : formatCurrency(0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Stock Adjustments</h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                <TableRow className="hover:bg-primary/90 border-none">
                  <TableHead className="text-white font-semibold whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap">Reference No</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap">Location</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap">Adjustment Type</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap text-right">Total Amount</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap text-right">Total Amount Recovered</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap">Reason</TableHead>
                  <TableHead className="text-white font-semibold whitespace-nowrap">Added By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      <p className="mt-2 text-gray-500">Loading report...</p>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-gray-500">
                      No stock adjustments found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const isNormal = row.adjustmentType === 'Normal';
                    const amount = parseFloat(String(row.totalAmount)) || 0;
                    return (
                      <TableRow key={row.id} className="hover:bg-gray-50/50">
                        <TableCell className="whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{row.referenceNo}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.Branch?.name ?? '—'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${isNormal
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {row.adjustmentType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-medium">
                          {formatCurrency(amount)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isNormal ? formatCurrency(amount) : formatCurrency(0)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.reason ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.user?.name ?? 'System'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && rows.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <TablePagination
                total={totalRecords}
                page={page}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
                itemLabel="adjustments"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
