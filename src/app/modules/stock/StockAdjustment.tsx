import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from "../../utils/validation";
import { useBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Search, Plus, Loader2, SlidersHorizontal, Package, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../components/ui/sheet";
import { Label } from "../../components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../components/ui/command";
import { DataTable, Column } from "../../components/shared/DataTable";
import ApiService from "../../../api/ApiService";
import { toast } from "sonner";

interface AdjustmentItem {
  productId: number;
  name: string;
  quantity: number;
  action: "add" | "subtract";
  unitCost: number;
  subtotal: number;
}

export default function StockAdjustment() {
  const { format: formatCurrency } = useCurrency();
  const { selectedBranchId } = useBranch();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: { branchId: selectedBranchId ? Number(selectedBranchId) : 0, adjustmentType: "Normal", reason: "", items: [] },
  });
  const [selectedItems, setSelectedItems] = useState<AdjustmentItem[]>([]);
  
  // Product Search State
  const [products, setProducts] = useState<any[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  useEffect(() => {
    fetchAdjustments();
  }, [selectedBranchId, page]);

  useEffect(() => {
    fetchProducts();
  }, [selectedBranchId]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await ApiService.stock.getAdjustments({ branchId: selectedBranchId, search: search || undefined, page, limit });
      setAdjustments(res.data || []);
      setTotalItems(res.total ?? 0);
    } catch (err) {
      toast.error("Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await ApiService.products.getAll({ limit: 1000 });
      setProducts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch products");
    }
  };

  const handleAddProduct = (product: any) => {
    if (selectedItems.find(i => i.productId === product.id)) {
      toast.error("Product already added");
      return;
    }

    const newItem: AdjustmentItem = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      action: "subtract",
      unitCost: product.purchasePrice || 0,
      subtotal: product.purchasePrice || 0
    };

    setSelectedItems([...selectedItems, newItem]);
    setProductSearchOpen(false);
  };

  const updateItem = (index: number, updates: Partial<AdjustmentItem>) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], ...updates };
    newItems[index].subtotal = newItems[index].quantity * newItems[index].unitCost;
    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    if (selectedItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    setSaving(true);
    try {
      await ApiService.stock.createAdjustment({
        branchId: data.branchId,
        adjustmentType: data.adjustmentType,
        reason: data.reason || "",
        items: selectedItems
      });
      toast.success("Adjustment saved successfully");
      setSheetOpen(false);
      setSelectedItems([]);
      form.reset({ branchId: selectedBranchId ? Number(selectedBranchId) : 0, adjustmentType: "Normal", reason: "", items: [] });
      fetchAdjustments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save adjustment");
    } finally {
      setSaving(false);
    }
  });

  const adjustmentColumns: Column<any>[] = [
    {
      header: 'Date',
      render: (adj) => new Date(adj.createdAt).toLocaleDateString(),
      className: 'text-gray-600'
    },
    { header: 'Reference No', accessor: 'referenceNo', className: 'font-medium text-primary' },
    { header: 'Type', accessor: 'adjustmentType' },
    { header: 'Reason', render: (adj) => adj.reason || "—", className: 'text-gray-500' },
    { 
      header: 'Total Amount', 
      render: (adj) => formatCurrency(adj.totalAmount),
      align: 'right',
      className: 'font-bold text-gray-900'
    },
    { header: 'Added By', render: (adj) => adj.user?.name || 'System', className: 'text-gray-500' },
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Stock Adjustment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Adjust stock levels manually for damages, losses, or corrections.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-primary hover:bg-primary/90 shadow-sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Adjustment
          </Button>
        </div>
      </div>

      <DataTable
        title="Adjustments"
        icon={SlidersHorizontal}
        columns={adjustmentColumns}
        data={adjustments}
        loading={loading}
        emptyMessage="No adjustment records found"
        exportable
        exportFileName="adjustments"
        pagination={{
          total: totalItems,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "adjustments"
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
                placeholder="Search Ref No..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300" 
              />
            </div>
          </div>
        }
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              New Stock Adjustment
            </SheetTitle>
          </SheetHeader>
          
          <Form {...form}>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adjustmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Abnormal">Abnormal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="eg: Damage" className="border-gray-300" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Product</Label>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between border-gray-300 font-normal">
                    <div className="flex items-center">
                      <Search className="h-4 w-4 mr-2 opacity-50" />
                      Select Product...
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {products.map(p => (
                          <CommandItem key={p.id} onSelect={() => handleAddProduct(p)}>
                            {p.name} (Stock: {p.currentStock})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="border rounded-lg overflow-hidden border-gray-200">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="w-20 text-xs font-semibold">Qty</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={item.productId} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-xs">{item.name}</TableCell>
                      <TableCell>
                        <Select value={item.action} onValueChange={(val:any) => updateItem(index, {action: val})}>
                          <SelectTrigger className="h-8 text-xs border-gray-300"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">Add (+)</SelectItem>
                            <SelectItem value="subtract">Reduce (-)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.quantity} onChange={e => updateItem(index, {quantity: Number(e.target.value)})} className="h-8 text-xs border-gray-300" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-400 text-xs italic">
                        No products added to adjustment yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          </Form>

          <SheetFooter className="shrink-0 border-t px-6 py-4 flex flex-row gap-3 justify-end bg-gray-50/50">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90 shadow-md" onClick={handleSubmit} disabled={saving || selectedItems.length === 0}>
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
              Save Adjustment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
