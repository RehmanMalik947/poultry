import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockTransferSchema, type StockTransferFormValues } from "../../utils/validation";
import { useBranch } from "../../contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Search, Plus, Loader2, ArrowRightLeft, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../components/ui/sheet";
import { Label } from "../../components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../components/ui/command";
import { DataTable, Column } from "../../components/shared/DataTable";
import ApiService from "../../../api/ApiService";
import { toast } from "sonner";

interface TransferItem {
  productId: number;
  name: string;
  quantity: number;
  availableStock: number;
}

export default function StockTransfer() {
  const { selectedBranchId } = useBranch();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const form = useForm<StockTransferFormValues>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      productId: 0,
      fromBranchId: selectedBranchId ? Number(selectedBranchId) : 0,
      toBranchId: 0,
      qty: 0,
      reason: "",
    },
  });
  const [selectedItems, setSelectedItems] = useState<TransferItem[]>([]);
  
  // Data for Selects
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [selectedBranchId, page]);

  useEffect(() => {
    fetchBranches();
    fetchProducts();
  }, [selectedBranchId]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await ApiService.stock.getTransfers({ search: search || undefined, page, limit });
      setTransfers(res.data || []);
      setTotalItems(res.total ?? 0);
    } catch (err) {
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await ApiService.branches.getAll();
      setBranches(res.data || []);
    } catch (err) {
      console.error("Failed to fetch branches");
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch products for the source branch
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

    const newItem: TransferItem = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      availableStock: product.currentStock || 0
    };

    setSelectedItems([...selectedItems, newItem]);
    setProductSearchOpen(false);
  };

  const updateItem = (index: number, quantity: number) => {
    const newItems = [...selectedItems];
    newItems[index].quantity = quantity;
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

    if (data.fromBranchId === data.toBranchId) {
      toast.error("Source and Destination branches cannot be the same");
      return;
    }

    setSaving(true);
    try {
      await ApiService.stock.createTransfer({
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        notes: data.reason || "",
        items: selectedItems
      });
      toast.success("Transfer completed successfully");
      setSheetOpen(false);
      setSelectedItems([]);
      form.reset({ productId: 0, fromBranchId: selectedBranchId ? Number(selectedBranchId) : 0, toBranchId: 0, qty: 0, reason: "" });
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete transfer");
    } finally {
      setSaving(false);
    }
  });

  const transferColumns: Column<any>[] = [
    {
      header: 'Date',
      render: (trf) => new Date(trf.createdAt).toLocaleDateString(),
      className: 'text-gray-600'
    },
    { header: 'Reference No', accessor: 'referenceNo', className: 'font-medium text-primary' },
    { header: 'From Branch', render: (trf) => trf.fromBranch?.name },
    { header: 'To Branch', render: (trf) => trf.toBranch?.name },
    {
      header: 'Status',
      render: (trf) => (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {trf.status}
        </span>
      )
    },
    { header: 'Added By', render: (trf) => trf.user?.name || 'System', className: 'text-gray-500' },
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Stock Transfer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Move inventory between different business locations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-primary hover:bg-primary/90 shadow-sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Transfer
          </Button>
        </div>
      </div>

      <DataTable
        title="Recent Transfers"
        icon={ArrowRightLeft}
        columns={transferColumns}
        data={transfers}
        loading={loading}
        emptyMessage="No transfer records found"
        exportable
        exportFileName="transfers"
        pagination={{
          total: totalItems,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "transfers"
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
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              New Stock Transfer
            </SheetTitle>
          </SheetHeader>
          
          <Form {...form}>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Branch (Source)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300"><SelectValue placeholder="Select Source" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Branch (Destination)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300"><SelectValue placeholder="Select Destination" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Reason for transfer..." className="border-gray-300" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Product to Transfer</Label>
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
                    <TableHead className="w-24 text-xs font-semibold">Available</TableHead>
                    <TableHead className="w-24 text-xs font-semibold">Transfer Qty</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={item.productId} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-xs">{item.name}</TableCell>
                      <TableCell className="text-gray-500 text-xs">{item.availableStock}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          max={item.availableStock}
                          value={item.quantity} 
                          onChange={e => updateItem(index, Number(e.target.value))} 
                          className="h-8 text-xs border-gray-300" 
                        />
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
                        No products added for transfer yet
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
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <ArrowRightLeft className="h-4 w-4 mr-2"/>}
              Complete Transfer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}