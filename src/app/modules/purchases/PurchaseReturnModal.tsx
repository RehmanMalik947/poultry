import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { ApiService } from '../../../api/ApiService';
import { toast } from 'sonner';
import { useCurrency } from '../../contexts/CurrencyContext';

const purchaseReturnSchema = z.object({
  returnQuantities: z.record(z.string()),
  note: z.string().optional(),
  discountAmount: z.string().optional(),
  taxPercent: z.string().optional(),
});

export function PurchaseReturnModal({
  open,
  onOpenChange,
  purchase,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: any | null;
  onSuccess: () => void;
}) {
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const form = useForm({
    resolver: zodResolver(purchaseReturnSchema),
    defaultValues: {
      returnQuantities: {},
      note: "",
      discountAmount: "",
      taxPercent: "",
    },
  });
  const returnQuantities = form.watch("returnQuantities");
  const note = form.watch("note");
  const discountAmount = form.watch("discountAmount");
  const taxPercent = form.watch("taxPercent");

  useEffect(() => {
    if (open && purchase) {
      setItems(purchase.PurchaseItems || []);
      form.reset({
        returnQuantities: {},
        note: "",
        discountAmount: "",
        taxPercent: "",
      });
    }
  }, [open, purchase]);

  const handleQtyChange = (itemId: number, maxReturnable: number, val: string) => {
    const num = parseFloat(val);
    if (val !== "" && (!isNaN(num) && num > maxReturnable)) {
      toast.error(`Cannot return more than ${maxReturnable}`);
      return;
    }
    form.setValue(`returnQuantities.${itemId}`, val);
  };

  const calculateSubtotal = () => {
    let sub = 0;
    items.forEach(item => {
      const qty = parseFloat(returnQuantities[item.id] || "0");
      if (qty > 0) {
        sub += qty * parseFloat(item.unitCost || 0);
      }
    });
    return sub;
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const taxAmt = sub * (parseFloat(taxPercent || "0") / 100);
    const disc = parseFloat(discountAmount || "0");
    return sub + taxAmt - disc;
  };

  const handleReturnSubmit = form.handleSubmit(async () => {
    if (!purchase) return;
    const payloadItems = Object.entries(returnQuantities)
      .map(([itemId, qty]) => ({
        purchaseItemId: parseInt(itemId),
        quantityReturned: parseFloat(qty || "0")
      }))
      .filter(it => it.quantityReturned > 0);

    if (payloadItems.length === 0) {
      toast.error("Please enter quantity to return for at least one item.");
      return;
    }

    setLoading(true);
    try {
      await ApiService.purchases.createReturn(purchase.id, {
        items: payloadItems,
        note,
        discountAmount: parseFloat(discountAmount || "0"),
        taxPercent: parseFloat(taxPercent || "0")
      });
      toast.success("Purchase return processed successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  });

  const hasItemsToReturn = items.some(item => {
    const alreadyReturned = item.PurchaseReturnItems?.reduce((sum: number, ri: any) => sum + parseFloat(ri.quantityReturned), 0) || 0;
    return (parseFloat(item.quantity) - alreadyReturned) > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <DialogHeader className="shrink-0 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">Return Purchase Items</DialogTitle>
              <DialogDescription>
                Purchase #{purchase?.referenceNo || purchase?.id} • Supplier: {purchase?.Supplier?.name || "Unknown"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          {!hasItemsToReturn ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">All items returned</p>
              <p>There are no more items available to return from this purchase.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Unit Cost</TableHead>
                      <TableHead className="text-center">Purchased Qty</TableHead>
                      <TableHead className="text-center">Available Qty</TableHead>
                      <TableHead className="text-center w-32">Return Qty</TableHead>
                      <TableHead className="text-right">Return Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => {
                      const alreadyReturned = item.PurchaseReturnItems?.reduce((sum: number, ri: any) => sum + parseFloat(ri.quantityReturned), 0) || 0;
                      const maxReturnable = parseFloat(item.quantity) - alreadyReturned;
                      const currentQty = parseFloat(returnQuantities[item.id] || "0");
                      const amount = currentQty * parseFloat(item.unitCost || "0");
                      
                      return (
                        <TableRow key={item.id} className={maxReturnable === 0 ? "opacity-50 bg-slate-50 dark:bg-slate-900/20" : ""}>
                          <TableCell className="font-medium">
                            {item.name}
                            {maxReturnable === 0 && <Badge variant="outline" className="ml-2 text-xs">Returned</Badge>}
                          </TableCell>
                          <TableCell className="text-center">{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center font-medium text-blue-600 dark:text-blue-400">
                            {maxReturnable}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max={maxReturnable}
                              step="any"
                              value={returnQuantities[item.id] || ""}
                              onChange={(e) => handleQtyChange(item.id, maxReturnable, e.target.value)}
                              disabled={maxReturnable === 0 || loading}
                              className={`text-center font-bold ${currentQty > 0 ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold text-purple-700 dark:text-purple-400">
                            {formatCurrency(amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Note (Reason)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Why are these items being returned?" 
                            {...field}
                            rows={3}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/50 p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="taxPercent"
                    render={({ field }) => (
                      <FormItem className="flex justify-between items-center gap-4 space-y-0">
                        <FormLabel className="text-muted-foreground w-1/3">Tax (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field}
                            className="w-2/3 text-right"
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem className="flex justify-between items-center gap-4 pb-4 border-b border-border/50 space-y-0">
                        <FormLabel className="text-muted-foreground w-1/3">Discount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field}
                            className="w-2/3 text-right"
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold">Total Refund:</span>
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </Form>

        <DialogFooter className="shrink-0 pt-4 border-t mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleReturnSubmit} 
            disabled={!hasItemsToReturn || loading || calculateSubtotal() === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
