import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, MapPin, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { DataTable, Column } from '../../components/shared/DataTable';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';

interface AccountRow {
  id: number;
  account: string;
  opening: number;
  received: number;
  paid: number;
  closing: number;
}

export default function CashSummaryReport() {
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
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);

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
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (selectedBranchId) params.set('branchId', selectedBranchId.toString());

      const headers = getAuthHeadersWithBranch(null);
      const res = await fetch(`${API_BASE}/reports/cash-summary?${params}`, { headers });
      const json = await res.json();
      if (json.success) setRows(json.data || []);
    } catch (err) {
      console.error('Failed to fetch cash summary report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

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
    opening: acc.opening + r.opening,
    received: acc.received + r.received,
    paid: acc.paid + r.paid,
    closing: acc.closing + r.closing,
  }), { opening: 0, received: 0, paid: 0, closing: 0 });

  const columns: Column<AccountRow>[] = [
    { header: 'Id', accessor: 'id' },
    { header: 'Account', accessor: 'account', className: 'font-medium' },
    { header: 'Opening', render: (row: AccountRow) => fmt(row.opening), align: 'right' },
    { header: 'Received', render: (row: AccountRow) => fmt(row.received), align: 'right' },
    { header: 'Paid', render: (row: AccountRow) => fmt(row.paid), align: 'right' },
    { header: 'Closing', render: (row: AccountRow) => <span className={row.closing >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{fmt(row.closing)}</span>, align: 'right' },
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cash Summary</h1>
          <p className="text-gray-500 text-sm mt-1">Account-wise summary of opening, received, paid, and closing balances</p>
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
        title="Account Summary"
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No accounts found"
        exportable
        exportFileName="cash-summary"
        footer={
          <div className="px-3 py-2.5 bg-gray-50/80 border-t border-gray-200 flex items-center justify-end gap-6 text-sm">
            <span className="font-semibold text-gray-700">Total Opening: <span className="text-gray-900">{fmt(totals.opening)}</span></span>
            <span className="font-semibold text-gray-700">Total Received: <span className="text-green-600">{fmt(totals.received)}</span></span>
            <span className="font-semibold text-gray-700">Total Paid: <span className="text-red-500">{fmt(totals.paid)}</span></span>
            <span className="font-semibold text-gray-700">Total Closing: <span className={totals.closing >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(totals.closing)}</span></span>
          </div>
        }
      />
    </div>
  );
}
