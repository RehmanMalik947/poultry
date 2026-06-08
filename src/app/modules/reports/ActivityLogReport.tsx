import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Activity, Calendar as CalendarIcon, MapPin, Check, ChevronDown, Filter, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Input } from '../../components/ui/input';
import { useBranch, getAuthHeadersWithBranch } from "../../contexts/BranchContext";
import { API_BASE } from "../../../api/ApiService";

interface ActivityLogRow {
  id: number;
  createdAt: string;
  module: string;
  action: string;
  description: string;
  User?: { id: number; name: string };
  Branch?: { id: number; name: string };
}

export default function ActivityLogReport() {
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);

  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [modulePopoverOpen, setModulePopoverOpen] = useState(false);

  const modules = ['Sales', 'Products', 'Inventory', 'Customers', 'Suppliers', 'Settings', 'Users', 'Cash Register'];

  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchBranches() {
      try {
        const headers = getAuthHeadersWithBranch(null);
        const res = await fetch(`${API_BASE}/branches`, { headers });
        const json = await res.json();
        if (json.success) {
          setBranches(json.data || []);
        }
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
      if (selectedModule) params.set('module', selectedModule);
      if (selectedBranchId) params.set('branchId', selectedBranchId.toString());
      if (search) params.set('search', search);

      const headers = getAuthHeadersWithBranch(null); // Fetch raw header without overriding branch parameter, passing branchId via query instead
      const res = await fetch(`${API_BASE}/reports/activity-log?${params.toString()}`, { headers });
      const json = await res.json();

      if (json.success) {
        setRows(json.data || []);
        setTotal(json.total || 0);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to fetch activity log report:", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedModule, page, limit, fromDate, toDate, search]);

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

  function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  const columns: Column<ActivityLogRow>[] = [
    { 
      header: 'Date & Time', 
      accessor: 'createdAt',
      render: (record) => formatDateTime(record.createdAt)
    },
    { 
      header: 'User', 
      render: (record) => record.User?.name || 'System'
    },
    { 
      header: 'Branch', 
      render: (record) => record.Branch?.name || 'All/HQ'
    },
    { 
      header: 'Module', 
      accessor: 'module',
      className: 'font-medium text-gray-800'
    },
    { 
      header: 'Action', 
      accessor: 'action',
      render: (record) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          record.action.toLowerCase() === 'created' ? 'bg-green-100 text-green-800' :
          record.action.toLowerCase() === 'updated' ? 'bg-blue-100 text-blue-800' :
          record.action.toLowerCase() === 'deleted' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {record.action}
        </span>
      )
    },
    { 
      header: 'Description', 
      accessor: 'description',
      className: 'max-w-xs truncate'
    }
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Activity Log</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track user actions and system changes across modules
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch Selector */}
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-accent"
              >
                <span className="flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 shrink-0 text-primary" />
                  {selectedBranch ? selectedBranch.name : 'All branches'}
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
                    setPage(1);
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
                        setPage(1);
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

          {/* Module Filter */}
          <Popover open={modulePopoverOpen} onOpenChange={setModulePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-accent"
              >
                <span className="flex items-center gap-2 truncate">
                  <Filter className="w-4 h-4 shrink-0 text-primary" />
                  {selectedModule ? selectedModule : 'All modules'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="min-w-[180px] z-[100] p-1" sideOffset={8}>
              <div className="max-h-[280px] overflow-y-auto" role="listbox">
                <button
                  onClick={() => {
                    setSelectedModule(null);
                    setModulePopoverOpen(false);
                    setPage(1);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${selectedModule === null ? 'bg-secondary font-medium text-tertiary' : ''}`}
                >
                  <span>All modules</span>
                  {selectedModule === null && <Check className="w-4 h-4 shrink-0 text-primary" />}
                </button>
                {modules.map((mod) => {
                  const isSelected = selectedModule === mod;
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => {
                        setSelectedModule(mod);
                        setModulePopoverOpen(false);
                        setPage(1);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${isSelected ? 'bg-secondary font-medium text-tertiary' : ''}`}
                    >
                      <span>{mod}</span>
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
        title="Activity Records"
        icon={Activity}
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No activities found for the selected criteria"
        exportable
        exportFileName="activity-log"
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
          total: total,
          page: page,
          limit: limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "activities"
        }}
      />
    </div>
  );
}
