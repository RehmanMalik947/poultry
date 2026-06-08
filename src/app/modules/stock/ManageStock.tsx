import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockManageSchema, type StockManageFormValues } from "../../utils/validation";
import { useBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Search, Plus, Loader2, Package, Check, ChevronsUpDown, MoreHorizontal, Edit, MoreVertical } from "lucide-react";
import { TablePagination } from "../../components/shared/TablePagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../components/ui/command";
import { cn } from "../../components/ui/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import ApiService from "../../../api/ApiService";

function useDebounce(value: string, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export default function ManageStock() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();

  const [stocks, setStocks] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);
  const debouncedSearch = useDebounce(search, 500);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [editingStock, setEditingStock] = useState<any>(null);

  const form = useForm<StockManageFormValues>({
    resolver: zodResolver(stockManageSchema),
    defaultValues: { productId: 0, qty: 0, alertQuantity: 0, type: "add", reason: "" },
  });

  const [savingStock, setSavingStock] = useState(false);

  const fetchStocks = async () => {
    try {
      setLoading(true);

      const res = await ApiService.stock.getAll({
        search: debouncedSearch,
        branchId: selectedBranchId,
        page,
        limit,
      });

      setStocks(res.data || []);
      setTotalItems(res.total ?? 0);
    } catch (err) {
      console.error("Stock fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [debouncedSearch, selectedBranchId, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchProducts = async () => {
    try {
      const res = await ApiService.products.getAll({ limit: 1000 });
      setProducts(res.data || []);
    } catch (err) {
      console.error("Products fetch error:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSaveStock = form.handleSubmit(async (data) => {
    try {
      setSavingStock(true);
      await ApiService.stock.manage({
        productId: data.productId,
        branchId: selectedBranchId,
        qty: data.qty,
        alertQuantity: data.alertQuantity,
        type: editingStock ? "set" : "add",
        reason: editingStock ? "Manual Stock Edit from Manage Stock" : "Manual Stock Add from Manage Stock",
      });
      handleCloseSheet();
      fetchStocks();
    } catch (err) {
      console.error("Failed to save stock:", err);
    } finally {
      setSavingStock(false);
    }
  });

  const handleEditStock = (stock: any) => {
    setEditingStock(stock);
    form.reset({
      productId: stock.productId,
      qty: stock.qty,
      alertQuantity: stock.alertQty || 0,
      type: "set",
      reason: "Manual Stock Edit from Manage Stock",
    });
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingStock(null);
    form.reset({ productId: 0, qty: 0, alertQuantity: 0, type: "add", reason: "" });
  };

  const stockColumns: Column<any>[] = [
    {
      header: '#',
      render: (_, index) => index + 1,
      width: '50px'
    } as any,
    { header: 'Product Name', render: (stock) => stock.product?.name, className: 'font-medium' },
    { header: 'Location', render: (stock) => stock.branch?.name || "-" },
    { header: 'Current Quantity', accessor: 'qty', align: 'center' },
    { header: 'Alert Quantity', accessor: 'alertQty', align: 'center' },
    { header: 'Unit Price', render: (stock) => formatCurrency(stock.product?.sellingPriceInc || 0), align: 'right' },
    { header: 'Added By', render: (stock) => stock.user ? stock.user.name : "-", className: 'text-gray-500' },
    {
      header: 'Actions',
      align: 'center',
      render: (stock) => (
        <EntityActions
          onEdit={() => handleEditStock(stock)}
        />
      )
    }
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Manage Stock</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-primary hover:bg-primary/90 shadow-sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Stock
          </Button>
        </div>
      </div>

      <DataTable
        title="Stock Inventory"
        icon={Package}
        columns={stockColumns}
        data={stocks}
        loading={loading}
        emptyMessage="No stock records found"
        exportable
        exportFileName="stock"
        pagination={{
          total: totalItems,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "stock records"
        }}
        filters={
          <div className="flex gap-3 items-center">
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
            <div className="relative w-72 ml-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
              />
            </div>
          </div>
        }
      />

      <Sheet open={sheetOpen} onOpenChange={open => !open && handleCloseSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editingStock ? "Edit Stock" : "Add Stock"}
            </SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Product <span className="text-red-500">*</span></FormLabel>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            disabled={!!editingStock}
                            className="w-full justify-between font-normal border-gray-300"
                          >
                            {field.value
                              ? products.find((p) => p.id === field.value)?.name
                              : "Search and select product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="w-[380px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  onSelect={() => {
                                    field.onChange(p.id);
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === p.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {p.name} {p.sku ? `(${p.sku})` : ""}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        value={field.value || ""}
                        onChange={e => field.onChange(Number(e.target.value))}
                        className="border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alertQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        value={field.value || ""}
                        onChange={e => field.onChange(Number(e.target.value))}
                        className="border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
          <SheetFooter className="shrink-0 border-t px-6 py-4 flex flex-row gap-3 justify-end bg-gray-50/50">
            <Button variant="outline" onClick={handleCloseSheet}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleSaveStock}
              disabled={savingStock || !form.watch("productId") || !form.watch("qty")}
            >
              {savingStock ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingStock ? "Update Stock" : "Save Stock"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}