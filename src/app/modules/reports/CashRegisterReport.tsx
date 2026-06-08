import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Monitor, Calendar as CalendarIcon, MapPin, Check, ChevronDown, Eye, XCircle, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Input } from '../../components/ui/input';
import { useBranch, getAuthHeadersWithBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { API_BASE } from "../../../api/ApiService";
import RegisterDetailsModal from '../../modules/Sales/components/RegisterDetailsModal';

interface RegisterRow {
  id: number;
  status: 'open' | 'closed';
  openTime: string;
  closeTime: string | null;
  location: string;
  user: string;
  grossSales: number;
  totalCheques: number;
  totalCash: number;
  totalBankTransfer: number;
  totalAdvancePayment: number;
  otherPayments: number;
  totalCollected: number;
  expectedBalance: number;
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function CashRegisterReport() {
  const { format: formatCurrency } = useCurrency();
  
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);

  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  // View modal state
  const [viewRegisterId, setViewRegisterId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const headers = getAuthHeadersWithBranch(null);
        const res = await fetch(`${API_BASE}/branches`, { headers });
        const json = await res.json();
        if (json.success) setBranches(json.data || []);
      } catch (err) {
        console.error("Failed to fetch branches:", err);
      }
    }
    fetchBranches();
  }, []);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/cash-register?${params.toString()}`, { headers });
      const json = await res.json();

      if (json.success) {
        setRows(json.data || []);
        setTotal(json.total || 0);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to fetch register report:", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, page, limit, fromDate, toDate, statusFilter, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDatePreset = (preset: string) => {
    const today = new Date();
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    if (preset === 'today') { const s = fmt(today); setFromDate(s); setToDate(s); }
    else if (preset === 'yesterday') { const y = new Date(today); y.setDate(today.getDate() - 1); const s = fmt(y); setFromDate(s); setToDate(s); }
    else if (preset === '7days') { const p = new Date(today); p.setDate(today.getDate() - 7); setFromDate(fmt(p)); setToDate(fmt(today)); }
    else if (preset === '30days') { const p = new Date(today); p.setDate(today.getDate() - 30); setFromDate(fmt(p)); setToDate(fmt(today)); }
    else if (preset === 'thisMonth') { setFromDate(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setToDate(fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0))); }
    else if (preset === 'lastMonth') { setFromDate(fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1))); setToDate(fmt(new Date(today.getFullYear(), today.getMonth(), 0))); }
    setPage(1);
    setDatePresetOpen(false);
  };

  // Calculate totals for all numeric columns
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      grossSales: acc.grossSales + (row.grossSales || 0),
      totalCash: acc.totalCash + (row.totalCash || 0),
      totalBankTransfer: acc.totalBankTransfer + (row.totalBankTransfer || 0),
      totalCheques: acc.totalCheques + (row.totalCheques || 0),
      totalAdvanceOther: acc.totalAdvanceOther + ((row.totalAdvancePayment || 0) + (row.otherPayments || 0)),
      expectedBalance: acc.expectedBalance + (row.expectedBalance || 0),
    }), {
      grossSales: 0,
      totalCash: 0,
      totalBankTransfer: 0,
      totalCheques: 0,
      totalAdvanceOther: 0,
      expectedBalance: 0,
    });
  }, [rows]);

  const statusDropdown = (
    <div className="flex items-center gap-2">
      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value as any);
          setPage(1);
        }}
className="inline-flex w-[90px] h-9 items-center justify-between rounded-lg border-2 border-gray-300 bg-white px-3 text-sm hover:bg-gray-50"      >
        <option value="all">All</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
    </div>
  );

  // Footer component with all column totals
  const footerContent = (
    <div className="flex justify-between items-center px-4 py-3 bg-gray-100 border-t-2 border-gray-300">
      <span className="font-bold text-gray-700 text-sm">Totals:</span>
      <div className="flex gap-6">
        <div className="text-right">
          <div className="text-xs text-gray-500">Total Sales</div>
          <div className="font-bold text-sm">{formatCurrency(totals.grossSales)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Cash</div>
          <div className="font-bold text-sm">{formatCurrency(totals.totalCash)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Card/Bank</div>
          <div className="font-bold text-sm">{formatCurrency(totals.totalBankTransfer)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Cheques</div>
          <div className="font-bold text-sm">{formatCurrency(totals.totalCheques)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Advance/Other</div>
          <div className="font-bold text-sm">{formatCurrency(totals.totalAdvanceOther)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total Expected</div>
          <div className="font-bold text-sm text-indigo-700">{formatCurrency(totals.expectedBalance)}</div>
        </div>
      </div>
    </div>
  );

  const columns: Column<RegisterRow>[] = [
    {
      header: 'Location / User',
      render: (r) => (
        <div>
          <div className="font-medium text-gray-800">{r.location}</div>
          <div className="text-xs text-gray-500">{r.user}</div>
        </div>
      )
    },
    {
      header: 'Time',
      render: (r) => (
        <div className="text-xs text-gray-600 whitespace-nowrap">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            {formatDateTime(r.openTime)}
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            {r.closeTime ? formatDateTime(r.closeTime) : <span className="italic text-gray-400">Still Open</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Total Sales',
      accessor: 'grossSales',
      render: (r) => <span className="font-semibold text-gray-800">{formatCurrency(r.grossSales)}</span>,
      align: 'right'
    },
    {
      header: 'Cash',
      accessor: 'totalCash',
      render: (r) => formatCurrency(r.totalCash),
      align: 'right'
    },
    {
      header: 'Card / Bank',
      render: (r) => formatCurrency(r.totalBankTransfer),
      align: 'right'
    },
    {
      header: 'Cheques',
      accessor: 'totalCheques',
      render: (r) => formatCurrency(r.totalCheques),
      align: 'right'
    },
    {
      header: 'Advance / Other',
      render: (r) => formatCurrency(r.totalAdvancePayment + r.otherPayments),
      align: 'right'
    },
    {
      header: 'Total Expected',
      accessor: 'expectedBalance',
      render: (r) => <span className="font-bold text-indigo-700">{formatCurrency(r.expectedBalance)}</span>,
      align: 'right'
    },
    {
      header: 'Action',
      render: (r) => (
        <div className="flex gap-2 items-center justify-end">
          <button 
            onClick={() => setViewRegisterId(r.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
          >
            <Eye size={14} /> View
          </button>
          {r.status === 'open' && (
            <button 
              onClick={() => setViewRegisterId(r.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <XCircle size={14} /> Close
            </button>
          )}
        </div>
      ),
      align: 'right'
    }
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cash Register Report</h1>
          <p className="text-gray-500 text-sm mt-1">History of register sessions and payment breakdowns</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Branch Selector */}
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium shadow-sm hover:border-primary">
                <MapPin className="w-4 h-4 text-primary" />
                {selectedBranch ? selectedBranch.name : 'Select branch'}
                <ChevronDown className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="min-w-[220px] z-[100] p-1">
              <div className="max-h-[280px] overflow-y-auto">
                <button
                  onClick={() => { setSelectedBranchId(null); setBranchPopoverOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${selectedBranchId === null ? 'bg-secondary font-medium text-tertiary' : ''}`}
                >
                  <span>All branches</span>
                  {selectedBranchId === null && <Check className="w-4 h-4 text-primary" />}
                </button>
                {branches.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBranchId(b.id); setBranchPopoverOpen(false); }}
                    className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${selectedBranchId === b.id ? 'bg-secondary font-medium text-tertiary' : ''}`}>
                    <span>{b.name}</span>
                    {selectedBranchId === b.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Filter */}
          <Popover open={datePresetOpen} onOpenChange={setDatePresetOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary text-white px-3 text-sm font-medium shadow-sm hover:bg-primary/95">
                <CalendarIcon className="w-4 h-4" />
                Filter by date
                <ChevronDown className="w-4 h-4 text-white/80" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="end">
              <div className="flex flex-col space-y-0.5">
                {['today', 'yesterday', '7days', '30days', 'thisMonth', 'lastMonth'].map(p => (
                  <button key={p} onClick={() => handleDatePreset(p)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">
                    {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7days' ? 'Last 7 Days' : p === '30days' ? 'Last 30 Days' : p === 'thisMonth' ? 'This Month' : 'Last Month'}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Registers"
        icon={Monitor}
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No registers found for the selected criteria"
        exportable
        exportFileName="cash-registers"
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
            {statusDropdown}
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
              />
            </div>
          </div>
        }
        pagination={{
          total,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: 'registers'
        }}
        footer={footerContent}
      />

      <RegisterDetailsModal
        isOpen={viewRegisterId !== null}
        onClose={() => {
          setViewRegisterId(null);
          // Optional: refresh report after closing register
          fetchReport();
        }}
        branchId={selectedBranchId}
        registerId={viewRegisterId}
      />
    </div>
  );
}