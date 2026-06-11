import { useState, useCallback, useEffect } from 'react';
import { Input } from '../../components/ui/input';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../../api/ApiService';
import { DataTable, Column } from '../../components/shared/DataTable';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Loader2,
  MapPin,
  Check,
  Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";

/*import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Building2,
  Package,
  TrendingUp,
  TrendingDown,
  Eye,
  History,
  X
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";*/

type ProductSellItem = {
  id: string;
  productName: string;
  sku: string;
  customerName: string;
  customerId: number;
  contactNumber: string;
  email: string;
  invoiceNo: string;
  referenceNo: string;
  saleDate: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  amount: number;
  categoryId?: number;
  categoryName?: string;
  brandId?: number;
  brandName?: string;
  currentStock?: number;
  purchasePrice?: number;
  profit?: number;
  saleId?: number;
  weight?: number;
  rate?: number;
  saleTotal?: number;
  driverName?: string;
  lorryNo?: string;
  note?: string;
};

/*type CategorySummary = {
  categoryId: number;
  categoryName: string;
  currentStock: number;
  totalUnitSold: number;
  totalAmount: number;
};

type BrandSummary = {
  brandId: number;
  brandName: string;
  currentStock: number;
  totalUnitSold: number;
  totalAmount: number;
};

type DateGroupSummary = {
  date: string;
  totalUnitSold: number;
  totalAmount: number;
};*/

export function ProductSellReport() {
  const { selectedBranchId, branches, setSelectedBranchId, selectedBranch } = useBranch();
  const { format: formatCurrency } = useCurrency();

  // Filter states
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [datePresetOpen, setDatePresetOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>(() => {
    return '2000-01-01';
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  });

  const [items, setItems] = useState<ProductSellItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totals, setTotals] = useState({ totalWeight: 0, totalAmount: 0 });

  /*const [activeTab, setActiveTab] = useState<'detailed' | 'detailedWithPurchase' | 'byCategory' | 'byBrand'>('detailed');
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [brandSummaries, setBrandSummaries] = useState<BrandSummary[]>([]);
  const [totalSummary, setTotalSummary] = useState({
    totalQuantity: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalTax: 0
  });
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [brandSearchOpen, setBrandSearchOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [brandSearchTerm, setBrandSearchTerm] = useState('');*/

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('from', fromDate);
      params.set('to', toDate);
      params.set('view', 'detailed');
      if (search) params.set('search', search);

      const res = await fetch(`${API_BASE}/reports/product-sell?${params.toString()}`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
        setTotalRecords(data.total || 0);
        setTotals({
          totalWeight: data.totalSummary?.totalWeight || 0,
          totalAmount: data.totalSummary?.totalAmount || 0,
        });
        /*setCategorySummaries(data.categorySummaries || []);
        setBrandSummaries(data.brandSummaries || []);
        setTotalSummary(data.totalSummary || { totalQuantity: 0, totalAmount: 0, totalDiscount: 0, totalTax: 0 });*/
      } else {
        setItems([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error('Failed to fetch product sell report:', err);
      setItems([]);
      setTotalRecords(0);
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

  /*useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, activeTab, selectedCategory, selectedBrand, search]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [selectedBranchId]);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/brands`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBrands(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, [fetchCategories, fetchBrands]);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );
  
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );

  const getSelectedCategoryName = () => {
    if (selectedCategory === 'all') return 'All Categories';
    const cat = categories.find(c => c.id.toString() === selectedCategory);
    return cat?.name || 'All Categories';
  };
  
  const getSelectedBrandName = () => {
    if (selectedBrand === 'all') return 'All Brands';
    const brand = brands.find(b => b.id.toString() === selectedBrand);
    return brand?.name || 'All Brands';
  };*/

  const handleDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'allTime') => {
    const today = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'allTime') {
      setFromDate('2000-01-01');
      setToDate(format(today));
    } else if (preset === 'today') {
      const dateStr = format(today);
      setFromDate(dateStr);
      setToDate(format(today));
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

  // Detailed columns
  const detailedColumns: Column<ProductSellItem>[] = [
    { header: 'Id', accessor: 'saleId' },
    { header: 'Date', render: (item) => new Date(item.saleDate).toLocaleDateString() },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Receipt', accessor: 'referenceNo' },
    { header: 'Weight', render: (item) => `${Number(item.weight || 0).toLocaleString()} kg`, align: 'right' },
    { header: 'Rate', render: (item) => formatCurrency(Number(item.rate || 0)), align: 'right' },
    { header: 'Total', render: (item) => formatCurrency(Number(item.saleTotal || 0)), align: 'right', className: 'font-bold' },
    { header: 'Driver', accessor: 'driverName' },
    { header: 'Lorry', accessor: 'lorryNo' },
    { header: 'Note', accessor: 'note' },
  ];

  /*// Detailed with Purchase columns (includes profit)
  const detailedWithPurchaseColumns: Column<ProductSellItem>[] = [
    { header: 'Product', accessor: 'productName', className: 'font-medium' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Contact', accessor: 'contactNumber' },
    { header: 'Invoice No.', accessor: 'invoiceNo' },
    { header: 'Date', render: (item) => new Date(item.saleDate).toLocaleDateString() },
    { header: 'Quantity', render: (item) => `${item.quantity} Pc(s)`, align: 'right' },
    { header: 'Unit Price', render: (item) => formatCurrency(item.unitPrice), align: 'right' },
    { header: 'Purchase Price', render: (item) => formatCurrency(item.purchasePrice || 0), align: 'right' },
    { header: 'Profit', render: (item) => formatCurrency(item.profit || 0), align: 'right', className: 'text-green-600 font-semibold' },
    { header: 'Amount', render: (item) => formatCurrency(item.amount), align: 'right', className: 'font-bold' }
  ];

  // Category summary columns
  const categoryColumns: Column<CategorySummary>[] = [
    { header: 'Category', accessor: 'categoryName', className: 'font-medium' },
    { header: 'Current Stock', render: (item) => `${item.currentStock} Pc(s)`, align: 'right' },
    { header: 'Total Unit Sold', render: (item) => `${item.totalUnitSold} Pc(s)`, align: 'right' },
    { header: 'Total Amount', render: (item) => formatCurrency(item.totalAmount), align: 'right', className: 'font-bold' }
  ];

  // Brand summary columns
  const brandColumns: Column<BrandSummary>[] = [
    { header: 'Brand', accessor: 'brandName', className: 'font-medium' },
    { header: 'Current Stock', render: (item) => `${item.currentStock} Pc(s)`, align: 'right' },
    { header: 'Total Unit Sold', render: (item) => `${item.totalUnitSold} Pc(s)`, align: 'right' },
    { header: 'Total Amount', render: (item) => formatCurrency(item.totalAmount), align: 'right', className: 'font-bold' }
  ];*/

  /*const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Quantity Sold</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalSummary.totalQuantity} Pc(s)</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalSummary.totalAmount)}</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Discount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalSummary.totalDiscount)}</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Tax</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalSummary.totalTax)}</p>
        </CardContent>
      </Card>
    </div>
  );*/

  return (
    /*<TooltipProvider>*/
    <div className="p-3 space-y-3 w-full">
        {/* Page Header with Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Sale Report</h1>
            <p className="text-gray-500 text-sm mt-1">
              Detailed sale records with receipt, weight, rate and transport info
            </p>
          </div>

          {/* Filters Section */}
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

        {/*renderSummaryCards()*/}

        {/*{/* Tabs for different views }
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <TabsList className="bg-white border p-1 h-12">
              <TabsTrigger value="detailed" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Package className="w-4 h-4 mr-2" /> Detailed
              </TabsTrigger>
              <TabsTrigger value="detailedWithPurchase" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <TrendingUp className="w-4 h-4 mr-2" /> Detailed (With Purchase)
              </TabsTrigger>
              <TabsTrigger value="byCategory" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Package className="w-4 h-4 mr-2" /> By Category
              </TabsTrigger>
              <TabsTrigger value="byBrand" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Tag className="w-4 h-4 mr-2" /> By Brand
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={categorySearchOpen} className="w-[180px] justify-between">
                    {getSelectedCategoryName()}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search category..." value={categorySearchTerm} onValueChange={setCategorySearchTerm} />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setSelectedCategory('all'); setCategorySearchOpen(false); setCategorySearchTerm(''); }}>
                          <Check className={`mr-2 h-4 w-4 ${selectedCategory === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                          All Categories
                        </CommandItem>
                        {filteredCategories.map((category) => (
                          <CommandItem key={category.id} onSelect={() => { setSelectedCategory(category.id.toString()); setCategorySearchOpen(false); setCategorySearchTerm(''); }}>
                            <Check className={`mr-2 h-4 w-4 ${selectedCategory === category.id.toString() ? 'opacity-100' : 'opacity-0'}`} />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Popover open={brandSearchOpen} onOpenChange={setBrandSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={brandSearchOpen} className="w-[160px] justify-between">
                    {getSelectedBrandName()}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search brand..." value={brandSearchTerm} onValueChange={setBrandSearchTerm} />
                    <CommandList>
                      <CommandEmpty>No brand found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setSelectedBrand('all'); setBrandSearchOpen(false); setBrandSearchTerm(''); }}>
                          <Check className={`mr-2 h-4 w-4 ${selectedBrand === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                          All Brands
                        </CommandItem>
                        {filteredBrands.map((brand) => (
                          <CommandItem key={brand.id} onSelect={() => { setSelectedBrand(brand.id.toString()); setBrandSearchOpen(false); setBrandSearchTerm(''); }}>
                            <Check className={`mr-2 h-4 w-4 ${selectedBrand === brand.id.toString() ? 'opacity-100' : 'opacity-0'}`} />
                            {brand.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <TabsContent value="detailed" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Product Sales Details"
              columns={detailedColumns} data={items} loading={loading}
              emptyMessage="No sales found for the selected criteria"
              exportable exportFileName="product-sales-detailed"
              pagination={{ total: totalRecords, page, limit, onPageChange: setPage, onLimitChange: setLimit, itemLabel: "sales records" }}
            />
          </TabsContent>

          <TabsContent value="detailedWithPurchase" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Product Sales with Purchase Details"
              columns={detailedWithPurchaseColumns} data={items} loading={loading}
              emptyMessage="No sales found for the selected criteria"
              exportable exportFileName="product-sales-with-purchase"
              pagination={{ total: totalRecords, page, limit, onPageChange: setPage, onLimitChange: setLimit, itemLabel: "sales records" }}
            />
          </TabsContent>

          <TabsContent value="byCategory" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Sales by Category"
              columns={categoryColumns} data={categorySummaries} loading={loading}
              emptyMessage="No category data found"
              exportable exportFileName="sales-by-category"
              pagination={{ total: categorySummaries.length, page: 1, limit: 100, onPageChange: () => {}, itemLabel: "categories" }}
            />
          </TabsContent>

          <TabsContent value="byBrand" className="mt-3 focus-visible:outline-none">
            <DataTable
              title="Sales by Brand"
              columns={brandColumns} data={brandSummaries} loading={loading}
              emptyMessage="No brand data found"
              exportable exportFileName="sales-by-brand"
              pagination={{ total: brandSummaries.length, page: 1, limit: 100, onPageChange: () => {}, itemLabel: "brands" }}
            />
          </TabsContent>
        </Tabs>*/}

        {/* Sale Report DataTable */}
        <DataTable
          title="Sale Records"
          columns={detailedColumns}
          data={items}
          loading={loading}
          emptyMessage="No sales found for the selected criteria"
          exportable
          exportFileName="sale-report"
          pagination={{
            total: totalRecords,
            page,
            limit,
            onPageChange: setPage,
            onLimitChange: setLimit,
            itemLabel: "sale records"
          }}
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
              <div className="relative">
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
    /*</TooltipProvider>*/
  );
}

/*// Add Tag icon if not already imported
const Tag = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.17 9.17a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83L12 2z"/>
    <path d="M7 7h.01"/>
  </svg>
);*/
