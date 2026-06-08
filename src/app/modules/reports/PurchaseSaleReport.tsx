import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';
import {
  Loader2,
  Calendar as CalendarIcon,
  Info,
  MapPin,
  Printer,
  ChevronDown
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import React from 'react';

type ReportData = {
  purchases: {
    totalPurchase: number;
    purchaseIncludingTax: number;
    totalPurchaseReturn: number;
    purchaseDue: number;
  };
  sales: {
    totalSale: number;
    saleIncludingTax: number;
    totalSellReturn: number;
    saleDue: number;
  };
  overall: {
    saleMinusPurchase: number;
    overallDue: number;
  };
};

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

export function PurchaseSaleReport() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();

  // Date states
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`; // First of this month
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`; // Last day of this month
  });

  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('from', fromDate);
      params.set('to', toDate);
      
      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/purchase-sale?${params.toString()}`, {
        headers,
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedBranchId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
    setDatePresetOpen(false);
  };

  // Static print button handler for now

  return (
    <div className="p-4 space-y-4 relative min-h-screen pb-24">


      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print print-full-width">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            Purchase & Sale Report
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Purchase & sale details for the selected date range
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:self-end">
          {/* Branch Dropdown */}
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-gray-50"
              >
                <span className="flex items-center gap-2 truncate text-gray-700">
                  <span className="p-1  rounded-md text-white">
                     <MapPin className="w-4 h-4 text-primary" />
                  </span>
                  {selectedBranch ? selectedBranch.name : 'Select the branch'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-1" align="end">
              <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBranchId(b.id);
                      setBranchPopoverOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-gray-100 ${
                      selectedBranchId === b.id ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Preset Date Filter */}
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

      {/* Date Pickers (Custom range display) */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border rounded-xl no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">From:</span>
          <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 border-gray-200 text-gray-700"
              >
                <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                {fromDate ? formatDisplayDate(fromDate) : 'Select Date'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate ? new Date(fromDate + 'T12:00:00') : undefined}
                onSelect={(d) => {
                  if (d) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setFromDate(`${y}-${m}-${day}`);
                    setFromPickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">To:</span>
          <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 border-gray-200 text-gray-700"
              >
                <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                {toDate ? formatDisplayDate(toDate) : 'Select Date'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate ? new Date(toDate + 'T12:00:00') : undefined}
                onSelect={(d) => {
                  if (d) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setToDate(`${y}-${m}-${day}`);
                    setToPickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="space-y-6 print-full-width">
          
          {/* Main Grid: Purchases & Sales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-card-grid">
            
            {/* Purchases Card */}
            <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden print-card">
              <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-700">Purchases</h2>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 text-sm">
                  <div className="flex justify-between items-center px-5 py-4 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600">Total Purchase:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.purchases.totalPurchase)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 bg-gray-50/10 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600">Purchase Including tax:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.purchases.purchaseIncludingTax)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600">Total Purchase Return Including Tax:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.purchases.totalPurchaseReturn)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 bg-gray-50/10 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                      Purchase Due:
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-blue-500 hover:text-blue-600 no-print">
                            <Info className="w-4 h-4 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-3 text-xs text-gray-600 leading-relaxed">
                          This represents unpaid outstanding dues for purchases made within the selected date range.
                        </PopoverContent>
                      </Popover>
                    </span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.purchases.purchaseDue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Card */}
            <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden print-card">
              <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-700">Sales</h2>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 text-sm">
                  <div className="flex justify-between items-center px-5 py-4 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600">Total Sale:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.sales.totalSale)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 bg-gray-50/10 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600">Sale Including tax:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.sales.saleIncludingTax)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600">Total Sell Return Including Tax:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.sales.totalSellReturn)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 bg-gray-50/10 hover:bg-gray-50/30">
                    <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                      Sale Due:
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-blue-500 hover:text-blue-600 no-print">
                            <Info className="w-4 h-4 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-3 text-xs text-gray-600 leading-relaxed">
                          This represents outstanding client balances or pending receivables for sales within this date range.
                        </PopoverContent>
                      </Popover>
                    </span>
                    <span className="font-bold text-gray-900">{formatCurrency(data.sales.saleDue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Overall Profit/Difference Card */}
          <Card className="shadow-sm border border-gray-100 rounded-2xl print-overall-card">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 border-b pb-4 border-gray-100">
                <h3 className="text-base font-bold text-gray-700 flex items-center gap-2">
                  Overall ((Sale - Sell Return) - (Purchase - Purchase Return))
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-blue-500 hover:text-blue-600 no-print">
                        <Info className="w-4 h-4 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-3 text-xs text-gray-600 leading-relaxed">
                      Calculates the actual operational financial net output by subtracting net purchases (Purchases minus Returns) from net sales (Sales minus Returns).
                    </PopoverContent>
                  </Popover>
                </h3>
              </div>
              
             <div className="space-y-3">
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
    <span className="text-2xl text-gray-600 font-medium">Sale - Purchase:</span>
    <span className={`text-2xl font-semibold tracking-tight ${
      data.overall.saleMinusPurchase < 0 ? 'text-red-500' : 'text-green-600'
    }`}>
      {formatCurrency(data.overall.saleMinusPurchase)}
    </span>
  </div>

  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
    <span className="text-2xl text-gray-600 font-medium">Due amount:</span>
    <span className={`text-2xl font-semibold tracking-tight ${
      data.overall.overallDue < 0 ? 'text-red-500' : 'text-green-600'
    }`}>
      {formatCurrency(data.overall.overallDue)}
    </span>
  </div>
</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border border-gray-100 rounded-2xl shadow-sm">
          <CardContent className="py-24 text-center text-gray-500">
            No transaction records found for the selected branch or period.
          </CardContent>
        </Card>
      )}

      {/* Floating/Bottom print button */}
      <div className="fixed bottom-6 right-6">
        <button
          type="button"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 px-6 text-white font-bold shadow-lg transition-transform active:scale-95"
        >
          <Printer className="w-5 h-5" />
          Print
        </button>
      </div>

    </div>
  );
}
