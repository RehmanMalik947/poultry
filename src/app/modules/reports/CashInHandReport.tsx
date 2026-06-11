import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, MapPin, Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DataTable, Column } from '../../components/shared/DataTable';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';

interface CashRow {
  id: string;
  date: string;
  type: 'Receive' | 'Payment' | 'Expense';
  receipt: string;
  received: number;
  paid: number;
  balance: number;
  particular: string;
}

export default function CashInHandReport() {
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
  const [rows, setRows] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const headers = getAuthHeadersWithBranch(null);
        const res = await fetch(`${API_BASE}/branches`, { headers });
        const json = await res.json();
        if (json.success) setBranches(json.data || []);
      } catch (err) { console.error(err); }
    }
    fetchBranches();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (selectedBranchId) params.set('branchId', selectedBranchId.toString());
      if (search) params.set('search', search);

      const headers = getAuthHeadersWithBranch(null);
      const res = await fetch(`${API_BASE}/reports/cash-in-hand?${params}`, { headers });
      const json = await res.json();
      if (json.success) {
        setRows(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch cash in hand report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate, page, limit, search]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  useEffect(() => { setPage(1); }, [fromDate, toDate, selectedBranchId]);

  const handleDatePreset = (preset: string) => {
    const today = new Date();
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === 'allTime') { setFromDate('2000-01-01'); setToDate(f(today)); }
    else if (preset === 'today') { const s = f(today); setFromDate(s); setToDate(s); }
    else if (preset === 'yesterday') { const d = new Date(today); d.setDate(d.getDate() - 1); const s = f(d); setFromDate(s); setToDate(s); }
    else if (preset === '7days') { const d = new Date(today); d.setDate(d.getDate() - 7); setFromDate(f(d)); setToDate(f(today)); }
    else if (preset === '30days') { const d = new Date(today); d.setDate(d.getDate() - 30); setFromDate(f(d)); setToDate(f(today)); }
    else if (preset === 'thisMonth') { setFromDate(f(new Date(today.getFullYear(), today.getMonth(), 1))); setToDate(f(new Date(today.getFullYear(), today.getMonth() + 1, 0))); }
    else if (preset === 'lastMonth') { setFromDate(f(new Date(today.getFullYear(), today.getMonth() - 1, 1))); setToDate(f(new Date(today.getFullYear(), today.getMonth(), 0))); }
    setDatePresetOpen(false);
  };

  const totals = rows.reduce((acc, r) => ({
    received: acc.received + r.received,
    paid: acc.paid + r.paid,
  }), { received: 0, paid: 0 });

  const columns: Column<CashRow>[] = [
    { header: 'Id', accessor: 'id' },
    { header: 'Date', render: (row: CashRow) => new Date(row.date).toLocaleDateString() },
    {
      header: 'Type',
      render: (row: CashRow) => {
        const colors = { Receive: 'text-green-600 bg-green-50', Payment: 'text-red-500 bg-red-50', Expense: 'text-orange-500 bg-orange-50' };
        return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[row.type]}`}>{row.type}</span>;
      },
    },
    { header: 'Receipt', accessor: 'receipt' },
    { header: 'Received', render: (row: CashRow) => row.received > 0 ? fmt(row.received) : '—', align: 'right' },
    { header: 'Paid', render: (row: CashRow) => row.paid > 0 ? fmt(row.paid) : '—', align: 'right' },
    { header: 'Balance', render: (row: CashRow) => <span className={row.balance >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{fmt(row.balance)}</span>, align: 'right' },
    { header: 'Particular', accessor: 'particular' },
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cash in Hand</h1>
          <p className="text-gray-500 text-sm mt-1">Track all cash inflows and outflows</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      <DataTable
        title="Cash Transactions"
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No cash transactions found for the selected period"
        exportable
        exportFileName="cash-in-hand"
        pagination={{
          total,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: 'transactions',
        }}
        filters={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-9 w-[180px] border-gray-300 border-2 rounded-lg text-sm"
              />
            </div>
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
              Total Received: <span className="text-green-600">{fmt(totals.received)}</span>
            </span>
            <span className="font-semibold text-gray-700">
              Total Paid: <span className="text-red-500">{fmt(totals.paid)}</span>
            </span>
            <span className="font-semibold text-gray-700">
              Net: <span className={totals.received - totals.paid >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(totals.received - totals.paid)}</span>
            </span>
          </div>
        }
      />
    </div>
  );
}
