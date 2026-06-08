import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DataTable, Column } from '../../components/shared/DataTable';
import { ReceiptText, Calendar as CalendarIcon, MapPin, Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { useBranch, getAuthHeadersWithBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Input } from '../../components/ui/input';
import { API_BASE } from "../../../api/ApiService";

interface ExpenseRow {
  id: number;
  date: string;
  category: string;
  categoryId: number;
  expenseFor: string;
  paymentMethod: string;
  amount: number;
}

interface CategoryOption {
  id: number;
  name: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ExpenseReport() {
  const { format: formatCurrency } = useCurrency();
  
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);

  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('All categories');
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categorySearchInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalAmount, setGlobalAmount] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  // Fetch branches
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
      if (selectedCategoryId != null) params.set('categoryId', selectedCategoryId.toString());
      if (search) params.set('search', search);

      const headers = getAuthHeadersWithBranch(selectedBranchId);
      const res = await fetch(`${API_BASE}/reports/expense?${params.toString()}`, { headers });
      const json = await res.json();

      if (json.success) {
        setRows(json.data || []);
        setTotal(json.total || 0);
        setGlobalAmount(json.totalAmount || 0);
        if (json.categories && json.categories.length > 0) {
          setCategories(json.categories);
        }
      } else {
        setRows([]);
        setTotal(0);
        setGlobalAmount(0);
      }
    } catch (error) {
      console.error("Failed to fetch expense report:", error);
      setRows([]);
      setTotal(0);
      setGlobalAmount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, page, limit, fromDate, toDate, selectedCategoryId, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Focus search input when category popover opens
  useEffect(() => {
    if (categoryPopoverOpen && categorySearchInputRef.current) {
      setTimeout(() => categorySearchInputRef.current?.focus(), 100);
    }
  }, [categoryPopoverOpen]);

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

  // Filter categories based on search
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Category filter component with search
  const categoryFilter = (
    <div className="flex items-center gap-2">
      <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
className="inline-flex w-[160px] h-9 items-center justify-between rounded-lg border-2 border-gray-300 bg-white px-3 text-sm hover:bg-gray-50"          >
            <span className="truncate">{selectedCategoryName}</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="min-w-[200px] z-[100] p-1">
          <div className="space-y-1">
            {/* Search Input */}
            <div className="relative px-1 pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                ref={categorySearchInputRef}
                type="text"
                placeholder="Search category..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {categorySearch && (
                <button
                  onClick={() => setCategorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Divider */}
            <div className="border-t border-gray-100" />
            
            {/* Category List */}
            <div className="max-h-[200px] overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSelectedCategoryName('All categories');
                  setCategoryPopoverOpen(false);
                  setCategorySearch('');
                  setPage(1);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${selectedCategoryId === null ? 'bg-secondary font-medium text-tertiary' : ''}`}
              >
                <span>All categories</span>
                {selectedCategoryId === null && <Check className="w-4 h-4 text-primary" />}
              </button>
              
              {filteredCategories.length === 0 ? (
                <div className="px-2 py-3 text-center text-sm text-gray-500">
                  No categories found
                </div>
              ) : (
                filteredCategories.map(c => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(c.id);
                        setSelectedCategoryName(c.name);
                        setCategoryPopoverOpen(false);
                        setCategorySearch('');
                        setPage(1);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${isSelected ? 'bg-secondary font-medium text-tertiary' : ''}`}
                    >
                      <span>{c.name}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Clear Filter Button */}
      {selectedCategoryId != null && (
        <button
          onClick={() => {
            setSelectedCategoryId(null);
            setSelectedCategoryName('All categories');
            setPage(1);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Clear filter"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const columns: Column<ExpenseRow>[] = [
    {
      header: 'Date',
      accessor: 'date',
      render: (r) => formatDate(r.date),
      className: 'text-gray-600'
    },
    {
      header: 'Category',
      accessor: 'category',
      className: 'font-medium text-gray-800'
    },
    {
      header: 'Expense For',
      accessor: 'expenseFor',
      className: 'text-gray-600'
    },
    {
      header: 'Payment Method',
      accessor: 'paymentMethod',
      render: (r) => (
        <span className="capitalize">{r.paymentMethod.replace('_', ' ')}</span>
      )
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (r) => (
        <span className="font-semibold text-gray-800">{formatCurrency(r.amount)}</span>
      ),
      align: 'left'
    }
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Expense Report</h1>
          <p className="text-gray-500 text-sm mt-1">Track and analyse all business expenses</p>
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
        title="Expenses"
        icon={ReceiptText}
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No expenses found for the selected criteria"
        exportable
        exportFileName="expense-report"
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
            {categoryFilter}
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
          itemLabel: 'expenses'
        }}
        footer={
          <div className="flex justify-between items-center px-4 py-3 bg-gray-50/80 border-t rounded-b-xl">
            <span className="font-bold text-gray-700">Total Expenses:</span>
            <span className="font-bold text-lg text-red-600">{formatCurrency(globalAmount)}</span>
          </div>
        }
      />
    </div>
  );
}