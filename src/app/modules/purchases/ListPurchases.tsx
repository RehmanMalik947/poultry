import { useState, useEffect, useCallback } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { useBranch } from "../../contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, Plus, ShoppingCart, Banknote, CalendarIcon, ArrowLeft, Receipt, User, Building2, CheckCircle2, CreditCard, History, Loader2, RotateCcw } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { ApiService } from "../../../api/ApiService";
import { format } from "date-fns";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { useCurrency } from "../../contexts/CurrencyContext";

const paymentSchema = z.object({
  paymentAmount: z.string().min(1, "Amount is required"),
  paymentDate: z.date(),
  paymentAccount: z.string().min(1, "Account is required"),
  paymentMethod: z.string(),
  chequeNo: z.string().optional(),
  externalAccountNo: z.string().optional(),
  paymentNote: z.string().optional(),
});

const listReturnSchema = z.object({
  returnQtys: z.record(z.string()),
  returnNote: z.string().optional(),
  returnDiscount: z.string().optional(),
  returnTaxPercent: z.string().optional(),
});

export function ListPurchases() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  // View State - Full screen inline view like ListSales
  const [viewingPurchaseId, setViewingPurchaseId] = useState<number | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [purchaseTab, setPurchaseTab] = useState<"details" | "items" | "payments" | "returns">("details");
  const [purchaseLogs, setPurchaseLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  // ── Return View State (Inline like Sales) ──────────────────────────────
  const [returningPurchase, setReturningPurchase] = useState<any>(null);
  const returnForm = useForm({
    resolver: zodResolver(listReturnSchema),
    defaultValues: {
      returnQtys: {},
      returnNote: "",
      returnDiscount: "",
      returnTaxPercent: "",
    },
  });
  const returnQtys = returnForm.watch("returnQtys");
  const returnNote = returnForm.watch("returnNote");
  const returnDiscount = returnForm.watch("returnDiscount");
  const returnTaxPercent = returnForm.watch("returnTaxPercent");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<any>(null);
  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentAmount: "",
      paymentDate: new Date(),
      paymentAccount: "",
      paymentMethod: "cash",
      chequeNo: "",
      externalAccountNo: "",
      paymentNote: "",
    },
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Delete confirmation
  const [deleteConfirmPurchase, setDeleteConfirmPurchase] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    ApiService.accounts.getAll()
      .then(res => setAccounts(res.data || []))
      .catch(() => {});
  }, []);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.purchases.getAll({ page, limit, search: search || undefined, branchId: selectedBranchId || undefined });
      const data = Array.isArray(res) ? res : res.data ?? [];
      setPurchases(data);
      setTotalItems(res.total ?? data.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedBranchId]);

  // Fetch Purchase Details for View Page
  const fetchPurchaseDetails = useCallback(async (purchaseId: number) => {
    try {
      const res = await ApiService.purchases.getById(purchaseId);
      if (res.data) {
        setSelectedPurchase(res.data);
      }
    } catch (err) {
      toast.error("Failed to load purchase details");
    }
  }, []);

  // Fetch payment logs
  const fetchPaymentLogs = useCallback(async (purchaseId: number) => {
    setLoadingLogs(true);
    try {
      const logsRes = await ApiService.purchases.getPayments(purchaseId);
      setPurchaseLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment history");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchPurchaseReturns = useCallback(async (purchaseId: number) => {
    setLoadingReturns(true);
    try {
      const res = await ApiService.purchases.getReturns(purchaseId);
      setPurchaseReturns(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load returns history");
    } finally {
      setLoadingReturns(false);
    }
  }, []);

  // Open Purchase View (full screen inline)
  const openPurchaseView = async (purchase: any) => {
    setSelectedPurchase(purchase);
    setViewingPurchaseId(purchase.id);
    await fetchPurchaseDetails(purchase.id);
    await fetchPaymentLogs(purchase.id);
    await fetchPurchaseReturns(purchase.id);
    setPurchaseTab("details");
  };

  useEffect(() => {
    if (viewingPurchaseId) {
      fetchPurchaseDetails(viewingPurchaseId);
      fetchPaymentLogs(viewingPurchaseId);
      fetchPurchaseReturns(viewingPurchaseId);
    }
  }, [viewingPurchaseId, fetchPurchaseDetails, fetchPaymentLogs, fetchPurchaseReturns]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteConfirmPurchase) return;
    setDeleteLoading(true);
    try {
      await ApiService.purchases.delete(deleteConfirmPurchase.id);
      toast.success("Purchase deleted successfully");
      setDeleteConfirmPurchase(null);
      fetchPurchases();
      if (viewingPurchaseId === deleteConfirmPurchase.id) {
        setViewingPurchaseId(null);
        setSelectedPurchase(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete purchase");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openPaymentModal = (purchase: any) => {
    const dueAmount = parseFloat(purchase.totalAmount || 0) - parseFloat(purchase.paidAmount || 0);
    if (dueAmount <= 0) {
      toast.info("This purchase is already fully paid.");
      return;
    }
    setSelectedPurchaseForPayment(purchase);
    paymentForm.reset({
      paymentAmount: dueAmount.toFixed(2),
      paymentDate: new Date(),
      paymentAccount: "",
      paymentMethod: "cash",
      chequeNo: "",
      externalAccountNo: "",
      paymentNote: "",
    });
    setPaymentModalOpen(true);
  };

  const handleAddPayment = paymentForm.handleSubmit(async (data) => {
    if (!selectedPurchaseForPayment) return;
    const amt = data.paymentAmount;
    const acct = data.paymentAccount;
    if (!amt || Number(amt) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await ApiService.purchases.addPayment(selectedPurchaseForPayment.id, {
        amount: amt,
        accountId: acct,
        paymentMethod: data.paymentMethod,
        chequeNo: data.paymentMethod === 'cheque' ? data.chequeNo : undefined,
        externalAccountNo: data.paymentMethod === 'bank_transfer' ? data.externalAccountNo : undefined,
        paymentDate: format(data.paymentDate, "yyyy-MM-dd"),
        paymentNote: data.paymentNote
      });
      toast.success("Payment added successfully");
      setPaymentModalOpen(false);
      fetchPurchases();
      
      // Update the view if we're viewing this purchase
      if (viewingPurchaseId === selectedPurchaseForPayment.id) {
        await fetchPurchaseDetails(selectedPurchaseForPayment.id);
        await fetchPaymentLogs(selectedPurchaseForPayment.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  });

  // ── Open Inline Return View ─────────────────────────────────────────────
  const openReturnView = async (purchase: any) => {
    try {
      // Fetch full purchase details if needed
      const res = await ApiService.purchases.getById(purchase.id);
      const fullPurchase = res?.data ?? purchase;
      const initQtys: Record<string, string> = {};
      (fullPurchase.PurchaseItems || []).forEach((item: any) => { 
        initQtys[item.id] = "0"; 
      });
      returnForm.reset({
        returnQtys: initQtys,
        returnNote: "",
        returnDiscount: "",
        returnTaxPercent: "",
      });
      setReturningPurchase(fullPurchase);
    } catch {
      toast.error("Failed to load purchase details");
    }
  };

  const handleQtyChange = (itemId: number, maxReturnable: number, val: string) => {
    const num = parseFloat(val);
    if (val !== "" && (!isNaN(num) && num > maxReturnable)) {
      toast.error(`Cannot return more than ${maxReturnable}`);
      return;
    }
    returnForm.setValue(`returnQtys.${itemId}`, val);
  };

  const calculateReturnSubtotal = () => {
    if (!returningPurchase) return 0;
    let sub = 0;
    (returningPurchase.PurchaseItems || []).forEach((item: any) => {
      const qty = parseFloat(returnQtys[item.id] || "0");
      if (qty > 0) {
        sub += qty * parseFloat(item.unitCost || 0);
      }
    });
    return sub;
  };

  const calculateReturnTotal = () => {
    const sub = calculateReturnSubtotal();
    const taxAmt = sub * (parseFloat(returnTaxPercent || "0") / 100);
    const disc = parseFloat(returnDiscount || "0");
    return sub + taxAmt - disc;
  };

  const handleReturnSubmit = returnForm.handleSubmit(async () => {
    if (!returningPurchase) return;
    
    const payloadItems = Object.entries(returnForm.getValues("returnQtys"))
      .map(([itemId, qty]) => ({
        purchaseItemId: parseInt(itemId),
        quantityReturned: parseFloat(qty || "0")
      }))
      .filter(it => it.quantityReturned > 0);

    if (payloadItems.length === 0) {
      toast.error("Please enter quantity to return for at least one item.");
      return;
    }

    setReturnSubmitting(true);
    try {
      await ApiService.purchases.createReturn(returningPurchase.id, {
        items: payloadItems,
        note: returnForm.getValues("returnNote"),
        discountAmount: parseFloat(returnForm.getValues("returnDiscount") || "0"),
        taxPercent: parseFloat(returnForm.getValues("returnTaxPercent") || "0")
      });
      toast.success("Purchase return processed successfully!");
      setReturningPurchase(null);
      fetchPurchases();
      if (viewingPurchaseId === returningPurchase.id) {
        await fetchPurchaseDetails(returningPurchase.id);
        await fetchPurchaseReturns(returningPurchase.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process return");
    } finally {
      setReturnSubmitting(false);
    }
  });

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    let classes = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ";
    if (s === "received") classes += "bg-green-100 text-green-700";
    else if (s === "pending") classes += "bg-orange-100 text-orange-700";
    else classes += "bg-blue-100 text-blue-700";
    return <span className={classes}>{status?.charAt(0).toUpperCase() + status?.slice(1) || "Pending"}</span>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "due";
    let classes = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ";
    if (s === "paid") classes += "bg-green-100 text-green-700";
    else if (s === "due") classes += "bg-red-100 text-red-700";
    else if (s === "partial") classes += "bg-amber-100 text-amber-700";
    else classes += "bg-gray-100 text-gray-700";
    return <span className={classes}>{status?.charAt(0).toUpperCase() + status?.slice(1) || "Due"}</span>;
  };

  const totalGrandTotal = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
  const totalPaymentDue = purchases.reduce((sum, p) => sum + (parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0)), 0);

  // Helper function to format date
  const formatDate = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Calculate totals for the view
  const calculateTotals = () => {
    if (!selectedPurchase) return { totalPaid: 0, remaining: 0, paidPercentage: 0 };
    const total = parseFloat(selectedPurchase.totalAmount || 0);
    const paid = parseFloat(selectedPurchase.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
    return { totalPaid: paid, remaining, paidPercentage };
  };

  const { totalPaid: viewTotalPaid, remaining: viewRemaining, paidPercentage: viewPaidPercentage } = calculateTotals();

  const purchaseColumns: Column<any>[] = [
    {
      header: 'Actions',
      align: 'left',
      render: (p) => (
        <EntityActions
          onView={() => openPurchaseView(p)}
          onEdit={() => toast.info('Edit purchase feature is currently under construction.')}
          onDelete={() => setDeleteConfirmPurchase(p)}
          extraActions={[
            {
              label: "Add Payment",
              icon: Banknote,
              onClick: () => openPaymentModal(p),
              className: "text-green-600"
            },
            {
              label: "Return Purchase",
              icon: RotateCcw,
              onClick: () => openReturnView(p),
              className: "text-purple-600"
            }
          ]}
        />
      )
    },
    {
      header: 'Date',
      render: (p) => p.purchaseDate ? format(new Date(p.purchaseDate), "MM/dd/yyyy HH:mm") : "—",
      className: 'text-sm whitespace-nowrap'
    },
    { header: 'Reference No', accessor: 'referenceNo', className: 'font-medium text-primary hover:underline cursor-pointer' },
    { header: 'Location', render: (p) => p.Branch?.name || "—", className: 'text-sm text-gray-600' },
    { header: 'Supplier', render: (p) => p.Supplier?.name || "—", className: 'text-sm text-gray-600' },
    {
      header: 'Status',
      render: (p) => getStatusBadge(p.status || 'pending')
    },
    {
      header: 'Payment Status',
      render: (p) => getPaymentStatusBadge(p.paymentStatus || 'due')
    },
    {
      header: 'Grand Total',
      render: (p) => formatCurrency(p.totalAmount || 0),
      className: 'font-semibold text-purple-700'
    },
    {
      header: 'Paid',
      render: (p) => formatCurrency(p.paidAmount || 0),
      className: 'text-green-600 font-medium'
    },
    {
      header: 'Due Amount',
      align: 'right',
      render: (p) => {
        const dueAmount = parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0);
        return dueAmount > 0 ? (
          <span className="text-red-600 font-semibold">
            {formatCurrency(dueAmount)}
          </span>
        ) : (
          <span className="text-green-600">—</span>
        );
      }
    },
    { header: 'Added By', render: () => <span className="text-sm whitespace-nowrap">—</span> }
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      {/* ✅ RETURN VIEW - Inline purchase return form (like Sales) */}
      {returningPurchase ? (
        <>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="-ml-2 gap-2" onClick={() => setReturningPurchase(null)}>
              <ArrowLeft className="w-4 h-4" /> Back to Purchases
            </Button>
          </div>
          <div className="space-y-4">
            <Form {...returnForm}>
            {/* Header */}
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                      <RotateCcw className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Purchase Return — #{returningPurchase.referenceNo || returningPurchase.id}</h2>
                      <p className="text-sm text-muted-foreground">
                        {returningPurchase.Supplier?.name || "Unknown Supplier"} · {new Date(returningPurchase.purchaseDate || returningPurchase.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Original Purchase Total</p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(returningPurchase.totalAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader><CardTitle>Select Items to Return</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-center">Purchased Qty</TableHead>
                      <TableHead className="text-center">Available Qty</TableHead>
                      <TableHead className="text-center w-36">Return Qty</TableHead>
                      <TableHead className="text-right">Return Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(returningPurchase.PurchaseItems || []).map((item: any, idx: number) => {
                      const alreadyReturned = item.PurchaseReturnItems?.reduce((sum: number, ri: any) => sum + parseFloat(ri.quantityReturned), 0) || 0;
                      const maxReturnable = parseFloat(item.quantity) - alreadyReturned;
                      const qty = parseFloat(returnQtys[item.id] || "0");
                      const rowAmt = item.unitCost * qty;

                      return (
                        <TableRow key={item.id} className={qty > 0 ? "bg-purple-50" : maxReturnable === 0 ? "opacity-50 bg-slate-50" : ""}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium">{item.name || 'Unknown Product'}</p>
                            {alreadyReturned > 0 && <p className="text-xs text-purple-600 font-medium mt-0.5">Already returned: {alreadyReturned}</p>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                          <TableCell className="text-center font-medium text-blue-600">
                            {maxReturnable}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Input
                                type="number"
                                min={0}
                                max={maxReturnable}
                                disabled={maxReturnable <= 0}
                                value={returnQtys[item.id] ?? "0"}
                                onChange={(e) => handleQtyChange(item.id, maxReturnable, e.target.value)}
                                className={`w-24 text-center border-2 ${maxReturnable <= 0 ? 'bg-gray-100 cursor-not-allowed text-gray-400' : qty > 0 ? 'border-purple-500 bg-purple-50' : 'focus:border-purple-400'}`}
                              />
                              {maxReturnable <= 0 && <p className="text-[10px] text-red-500 font-medium mt-1">Fully returned</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {qty > 0 ? <span className="text-purple-600">{formatCurrency(rowAmt)}</span> : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Note + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Reason / Note</CardTitle></CardHeader>
                <CardContent>
                  <FormField
                    control={returnForm.control}
                    name="returnNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Reason / Note</FormLabel>
                        <FormControl>
                          <textarea
                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows={3}
                            placeholder="Reason for return..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader><CardTitle className="text-base text-purple-700">Return Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(calculateReturnSubtotal())}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <Label className="text-muted-foreground">Tax (%)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={returnTaxPercent} 
                      onChange={e => returnForm.setValue("returnTaxPercent", e.target.value)}
                      className="w-24 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <Label className="text-muted-foreground">Discount</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={returnDiscount} 
                      onChange={e => returnForm.setValue("returnDiscount", e.target.value)}
                      className="w-24 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-lg text-purple-700">
                    <span>Total Refund</span>
                    <span>{formatCurrency(calculateReturnTotal())}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pb-6">
              <Button variant="outline" onClick={() => setReturningPurchase(null)}>Cancel</Button>
              <Button
                disabled={returnSubmitting || !(returningPurchase.PurchaseItems || []).some((item: any) => parseFloat(returnQtys[item.id] || "0") > 0)}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                onClick={handleReturnSubmit}
              >
                {returnSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Return
              </Button>
            </div>
            </Form>
          </div>
        </>
      ) : viewingPurchaseId && selectedPurchase && selectedPurchase.id === viewingPurchaseId ? (
        <>
          {/* Back Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => {
                setViewingPurchaseId(null);
                setSelectedPurchase(null);
                setPurchaseLogs([]);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Purchases
            </Button>
          </div>

          <div className="space-y-3">
            {/* Purchase Header Card */}
            <Card className="overflow-hidden bg-gradient-to-br from-secondary to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Invoice Icon */}
                    <div className="w-20 h-20 rounded-lg bg-primary/10 border-4 border-white dark:border-gray-800 shadow flex items-center justify-center">
                      <Receipt className="w-10 h-10 text-primary" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold">
                          Purchase {selectedPurchase.referenceNo ? `#${selectedPurchase.referenceNo}` : `#${selectedPurchase.id}`}
                        </h2>
                        {viewRemaining <= 0 ? (
                          <Badge className="bg-green-100 text-green-700">PAID</Badge>
                        ) : viewRemaining === parseFloat(selectedPurchase.totalAmount || 0) ? (
                          <Badge className="bg-red-100 text-red-700">UNPAID</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">PARTIAL</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {formatDateTime(selectedPurchase.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {selectedPurchase.Supplier && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-4 h-4" />
                            {selectedPurchase.Supplier.name}
                          </span>
                        )}
                        {selectedPurchase.Branch && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            Location: {selectedPurchase.Branch.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount Summary */}
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold text-purple-700">{formatCurrency(selectedPurchase.totalAmount || 0)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paid: {formatCurrency(viewTotalPaid)} | Due: {formatCurrency(viewRemaining)}
                    </p>
                    {viewRemaining > 0 && (
                      <Button size="sm" className="mt-2 bg-primary" onClick={() => openPaymentModal(selectedPurchase)}>
                        <CreditCard className="w-4 h-4 mr-1" /> Add Payment
                      </Button>
                    )}
                    {viewRemaining <= 0 && (
                      <div className="flex items-center gap-1 mt-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Fully Paid</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar for Partial Payments */}
                {viewRemaining > 0 && viewRemaining < parseFloat(selectedPurchase.totalAmount || 0) && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Payment Progress</span>
                      <span>{viewPaidPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${viewPaidPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={purchaseTab} onValueChange={(v) => setPurchaseTab(v as any)} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="details">Purchase Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="payments">Payment History</TabsTrigger>
                <TabsTrigger value="returns">Returns</TabsTrigger>
              </TabsList>

              {/* Tab 1: Purchase Details */}
              <TabsContent value="details" className="mt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Reference #</p>
                        <p className="text-sm text-foreground">{selectedPurchase.referenceNo || selectedPurchase.id}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                        <p className="text-sm text-foreground">{selectedPurchase.Supplier?.name || "—"}</p>
                      </div>
                      {selectedPurchase.Supplier?.phone && (
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Supplier Phone</p>
                          <p className="text-sm text-foreground">{selectedPurchase.Supplier.phone}</p>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Location</p>
                        <p className="text-sm text-foreground">{selectedPurchase.Branch?.name || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-sm text-foreground">{getStatusBadge(selectedPurchase.status || 'pending')}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                        <p className="text-sm text-foreground">{getPaymentStatusBadge(selectedPurchase.paymentStatus || 'due')}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                        <p className="text-sm text-foreground">{formatCurrency(selectedPurchase.subtotal || 0)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Discount</p>
                        <p className="text-sm text-foreground text-red-600">-{formatCurrency(selectedPurchase.discountAmount || 0)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Tax</p>
                        <p className="text-sm text-foreground">{formatCurrency(selectedPurchase.taxAmount || 0)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Shipping Charges</p>
                        <p className="text-sm text-foreground">{formatCurrency(selectedPurchase.shippingCharges || 0)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(selectedPurchase.totalAmount || 0)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                        <p className="text-sm text-foreground text-green-600 font-semibold">{formatCurrency(selectedPurchase.paidAmount || 0)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                        <p className="text-sm text-foreground">{formatDateTime(selectedPurchase.purchaseDate)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Created At</p>
                        <p className="text-sm text-foreground">{formatDateTime(selectedPurchase.createdAt)}</p>
                      </div>
                    </div>

                    {selectedPurchase.additionalNotes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</p>
                        <p className="text-sm text-foreground bg-amber-50 p-3 rounded-lg border border-amber-100">
                          {selectedPurchase.additionalNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Items */}
              <TabsContent value="items" className="mt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Items Purchased</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="bg-primary hover:bg-primary/95">
                            <TableHead className="text-white">#</TableHead>
                            <TableHead className="text-white">Product Name</TableHead>
                            <TableHead className="text-white text-center">Quantity</TableHead>
                            <TableHead className="text-white text-right">Unit Cost</TableHead>
                            <TableHead className="text-white text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPurchase.PurchaseItems?.length > 0 ? (
                            selectedPurchase.PurchaseItems.map((item: any, idx: number) => (
                              <TableRow key={item.id}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell className="font-medium">{item.name || 'Unknown Product'}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitCost || 0)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.lineTotal || 0)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500 py-6">No items found.</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="border-t-2">
                            <TableCell colSpan={4} className="text-right font-semibold">Subtotal:</TableCell>
                            <TableCell className="text-right">{formatCurrency(selectedPurchase.subtotal || 0)}</TableCell>
                          </TableRow>
                          {selectedPurchase.discountAmount > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right text-red-600">Discount:</TableCell>
                              <TableCell className="text-right text-red-600">-{formatCurrency(selectedPurchase.discountAmount)}</TableCell>
                            </TableRow>
                          )}
                          {selectedPurchase.taxAmount > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right">Tax:</TableCell>
                              <TableCell className="text-right">{formatCurrency(selectedPurchase.taxAmount)}</TableCell>
                            </TableRow>
                          )}
                          {selectedPurchase.shippingCharges > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right">Shipping:</TableCell>
                              <TableCell className="text-right">{formatCurrency(selectedPurchase.shippingCharges)}</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="border-t-2">
                            <TableCell colSpan={4} className="text-right font-bold text-lg">Total:</TableCell>
                            <TableCell className="text-right font-bold text-purple-700 text-lg">{formatCurrency(selectedPurchase.totalAmount || 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Payment History */}
              <TabsContent value="payments" className="mt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingLogs ? (
                      <div className="flex items-center justify-center py-8 text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading payments...
                      </div>
                    ) : purchaseLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No payments recorded</div>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow className="bg-primary hover:bg-primary/95">
                              <TableHead className="text-white">#</TableHead>
                              <TableHead className="text-white">Date</TableHead>
                              <TableHead className="text-white">Method</TableHead>
                              <TableHead className="text-white text-right">Amount</TableHead>
                              <TableHead className="text-white">Reference / Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseLogs.map((log, idx) => (
                              <TableRow key={log.id}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{formatDateTime(log.transactionDate)}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {log.paymentMethod || 'Cash'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {formatCurrency(log.amount)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">
                                  {log.description || '—'}
                                  {log.chequeNo && ` Cheque: ${log.chequeNo}`}
                                  {log.externalAccountNo && ` Account: ${log.externalAccountNo}`}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 bg-gray-50">
                              <TableCell colSpan={3} className="text-right font-bold">Total Paid:</TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(purchaseLogs.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 4: Returns History */}
              <TabsContent value="returns" className="mt-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Purchase Returns</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => openReturnView(selectedPurchase)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Return
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingReturns ? (
                      <div className="flex items-center justify-center py-8 text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading returns...
                      </div>
                    ) : purchaseReturns.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No returns recorded</div>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow className="bg-primary hover:bg-primary/95">
                              <TableHead className="text-white">Return No.</TableHead>
                              <TableHead className="text-white">Date</TableHead>
                              <TableHead className="text-white text-center">Items</TableHead>
                              <TableHead className="text-white text-right">Total Refund</TableHead>
                              <TableHead className="text-white text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseReturns.map((ret) => (
                              <TableRow key={ret.id}>
                                <TableCell className="font-medium">{ret.invoiceNumber || `#${ret.id}`}</TableCell>
                                <TableCell>{formatDateTime(ret.returnDate || ret.createdAt)}</TableCell>
                                <TableCell className="text-center">
                                  {ret.ReturnItems?.reduce((acc: any, curr: any) => acc + parseFloat(curr.quantityReturned), 0) || 0}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-purple-700">
                                  {formatCurrency(ret.total)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={ret.status === 'paid' ? 'bg-green-100 text-green-700' : ret.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                    {(ret.status || 'Due').toUpperCase()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        /* Purchases Table View */
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">Purchases</h1>
            <Link to="/purchases/add">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-10">
                <Plus className="h-4 w-4" /> Add Purchase
              </Button>
            </Link>
          </div>

          <DataTable
            title="All Purchases"
            icon={ShoppingCart}
            columns={purchaseColumns}
            data={purchases}
            loading={loading}
            exportable
            exportFileName="purchases"
            pagination={{
              total: totalItems,
              page: page,
              limit: limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
              itemLabel: "purchases"
            }}
            emptyMessage="No purchases found"
            filters={
              <div className="flex gap-3 items-center flex-wrap">
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
                    placeholder="Search purchases..."
                    value={search}
                    onChange={handleSearch}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                  />
                </div>
              </div>
            }
            footer={
              <div className="bg-gray-50 p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                  <div className="col-span-1 md:col-span-2 flex items-center gap-4">
                    <span className="text-xl font-bold text-primary">Totals:</span>
                    <div className="text-xs space-y-0.5">
                      <div className="font-semibold text-gray-600">Items: {totalItems}</div>
                    </div>
                  </div>
                  <div className="text-center font-bold text-gray-900 border-l border-gray-200 px-4">
                    <div className="text-xs text-gray-500 font-normal uppercase mb-1">Grand Total</div>
                    <div className="text-lg text-purple-700">{formatCurrency(totalGrandTotal)}</div>
                  </div>
                  <div className="text-center font-bold text-gray-900 border-l border-gray-200 px-4 space-y-1">
                    <div className="text-xs text-gray-500 font-normal uppercase mb-1">Total Due</div>
                    <div className="text-lg text-red-600">{formatCurrency(totalPaymentDue)}</div>
                  </div>
                </div>
              </div>
            }
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmPurchase} onOpenChange={(open) => !open && setDeleteConfirmPurchase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete Purchase #{deleteConfirmPurchase?.referenceNo || deleteConfirmPurchase?.id}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPurchase(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Payment - Purchase #{selectedPurchaseForPayment?.referenceNo || selectedPurchaseForPayment?.id}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Total Due</Label>
              <div className="col-span-3 font-semibold text-red-600">
                {selectedPurchaseForPayment ? formatCurrency(parseFloat(selectedPurchaseForPayment.totalAmount || 0) - parseFloat(selectedPurchaseForPayment.paidAmount || 0)) : formatCurrency(0)}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentForm.watch("paymentAmount")}
                onChange={(e) => paymentForm.setValue("paymentAmount", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Date</Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {paymentForm.watch("paymentDate") ? format(paymentForm.watch("paymentDate"), "MM/dd/yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentForm.watch("paymentDate")}
                      onSelect={(d) => d && paymentForm.setValue("paymentDate", d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Account</Label>
              <Select value={paymentForm.watch("paymentAccount")} onValueChange={(v) => paymentForm.setValue("paymentAccount", v)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Bank/Cash Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.bankName} ({acc.accountNumber || "Cash"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Payment Method</Label>
              <Select value={paymentForm.watch("paymentMethod")} onValueChange={(v) => paymentForm.setValue("paymentMethod", v)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentForm.watch("paymentMethod") === 'cheque' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="chequeNo" className="text-right">Cheque Number</Label>
                <Input
                  id="chequeNo"
                  value={paymentForm.watch("chequeNo")}
                  onChange={(e) => paymentForm.setValue("chequeNo", e.target.value)}
                  className="col-span-3"
                  placeholder="Enter Cheque Number"
                />
              </div>
            )}
            {paymentForm.watch("paymentMethod") === 'bank_transfer' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="externalAccountNo" className="text-right">Transfer Ref</Label>
                <Input
                  id="externalAccountNo"
                  value={paymentForm.watch("externalAccountNo")}
                  onChange={(e) => paymentForm.setValue("externalAccountNo", e.target.value)}
                  className="col-span-3"
                  placeholder="Enter Transfer Reference"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="note" className="text-right mt-2">Note (Optional)</Label>
              <Textarea
                id="note"
                value={paymentForm.watch("paymentNote")}
                onChange={(e) => paymentForm.setValue("paymentNote", e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}