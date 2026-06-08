import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiService } from '../../../api/ApiService';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
  AlertDialogAction
} from '../../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  RefreshCw, Loader2, CreditCard, Trash2, RotateCcw, 
  Receipt, FileText, AlertCircle,
  CheckCircle, XCircle, ArrowLeft,
  Package, History, Banknote, Truck,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useBranch } from '../../contexts/BranchContext';
import { EntityActions } from '../../components/shared/EntityActions';

interface PurchaseReturnRecord {
  id: number;
  invoiceNumber?: string;
  purchaseId: number;
  returnDate: string;
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  discountAmount: number;
  total: number;
  amountReturned: number;
  status: 'paid' | 'partial' | 'due';
  note?: string;
  Supplier?: { id: number; name: string; phone?: string };
  Purchase?: { id: number; referenceNo?: string; total?: number };
  createdAt: string;
  ReturnItems?: Array<{
    id: number;
    purchaseItemId: number;
    quantityReturned: number;
    amount: number;
    PurchaseItem?: { id: number; name?: string; unitCost?: number };
  }>;
  Payments?: Array<{
    id: number;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    note?: string;
    createdAt: string;
    Bank?: { id: number; bankName?: string; accountNumber?: string };
  }>;
}

interface BankRecord {
  id: number;
  bankName?: string;
  name?: string;
  accountNumber?: string;
  status?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgClass: string; icon: React.ReactNode }> = {
  paid: {
    label: 'Paid',
    color: 'text-green-700',
    bgClass: 'bg-green-100',
    icon: <CheckCircle className="h-3 w-3" />
  },
  partial: {
    label: 'Partial',
    color: 'text-yellow-700',
    bgClass: 'bg-yellow-100',
    icon: <AlertCircle className="h-3 w-3" />
  },
  due: {
    label: 'Due',
    color: 'text-red-700',
    bgClass: 'bg-red-100',
    icon: <XCircle className="h-3 w-3" />
  }
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return d;
  }
}

const paymentSchema = z.object({
  payAmount: z.string().min(1, "Amount is required"),
  payMethod: z.string(),
  payBankId: z.number().nullable().optional(),
  payTransactionId: z.string().optional(),
  payNote: z.string().optional(),
});

export function ListPurchaseReturns() {
  const { format: formatCurrency } = useCurrency();
  const { selectedBranchId } = useBranch();
  const [returns, setReturns] = useState<PurchaseReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  // Payment dialog
  const [payReturn, setPayReturn] = useState<PurchaseReturnRecord | null>(null);
  const payForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payAmount: "",
      payMethod: "cash",
      payBankId: null,
      payTransactionId: "",
      payNote: "",
    },
  });
  const [payLoading, setPayLoading] = useState(false);
  const [banks, setBanks] = useState<BankRecord[]>([]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<PurchaseReturnRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detail view
  const [viewingReturnId, setViewingReturnId] = useState<number | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturnRecord | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  // ── Fetch all purchase returns (across all purchases) ──────────────────────
  // We list all returns. Backend needs a GET /supplier-purchases/returns/all
  // For now we call the list endpoint with no purchaseId filter — 
  // If backend doesn't support it yet we show empty with an error.
  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Generic list — we request page & limit; backend route is
      // GET /supplier-purchases/returns?page=&limit= (all-returns route)
      const res = await ApiService.purchases.getAllReturns({ page, limit, branchId: selectedBranchId || undefined, search: search || undefined });
      if (res?.success) {
        setReturns(res.data || []);
        setTotal(res.total || 0);
      } else {
        setError(res?.message || 'Failed to load purchase returns');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load purchase returns');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedBranchId]);

  const fetchBanks = useCallback(async () => {
    try {
      const res = await ApiService.sales.getBanks();
      setBanks(res?.data || []);
    } catch {
      setBanks([]);
    }
  }, []);

  const fetchReturnDetails = useCallback(async (returnId: number) => {
    setReturnLoading(true);
    try {
      const res = await ApiService.purchases.getReturnById(returnId);
      if (res?.success) {
        setSelectedReturn(res.data);
      } else {
        toast.error(res?.message || 'Failed to load return details');
      }
    } catch {
      toast.error('Failed to load return details');
    } finally {
      setReturnLoading(false);
    }
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);
  useEffect(() => { fetchBanks(); }, [fetchBanks]);
  useEffect(() => {
    if (viewingReturnId) fetchReturnDetails(viewingReturnId);
  }, [viewingReturnId, fetchReturnDetails]);

  const openReturnView = (ret: PurchaseReturnRecord) => {
    setSelectedReturn(ret);
    setViewingReturnId(ret.id);
  };

  const openPayDialog = (ret: PurchaseReturnRecord) => {
    const outstanding = parseFloat(String(ret.total)) - parseFloat(String(ret.amountReturned));
    setPayReturn(ret);
    payForm.reset({
      payAmount: outstanding.toFixed(2),
      payMethod: "cash",
      payBankId: null,
      payTransactionId: "",
      payNote: "",
    });
  };

  const handleAddPayment = payForm.handleSubmit(async (data) => {
    if (!payReturn) return;
    const amt = parseFloat(data.payAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setPayLoading(true);
    try {
      const res = await ApiService.purchases.addReturnPayment(payReturn.id, {
        amount: amt,
        paymentMethod: data.payMethod,
        accountId: data.payBankId || null,
        transactionId: data.payTransactionId || null,
        paymentNote: data.payNote || null,
      });
      if (res?.success) {
        toast.success('Refund payment recorded!');
        setPayReturn(null);
        fetchReturns();
        if (viewingReturnId === payReturn.id) {
          await fetchReturnDetails(payReturn.id);
        }
      } else {
        toast.error(res?.message || 'Payment failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      // delete not implemented on backend yet — show info
      toast.info('Delete not yet supported for purchase returns.');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Table Columns ──────────────────────────────────────────────────────────
  const returnColumns: Column<PurchaseReturnRecord>[] = [
    {
      header: 'Actions',
      align: 'center',
      render: (ret) => (
        <EntityActions
          onView={() => openReturnView(ret)}
          extraActions={[
            {
              label: 'Add Payment',
              icon: CreditCard,
              onClick: () => openPayDialog(ret),
              disabled: ret.status === 'paid'
            },
            {
              label: 'View Payments',
              icon: History,
              onClick: () => openReturnView(ret)
            }
          ]}
        />
      )
    },
    {
      header: 'Return No.',
      render: (ret) => <span className="font-medium">{ret.invoiceNumber || `#${ret.id}`}</span>,
      align: 'center'
    },
    {
      header: 'Purchase No.',
      render: (ret) => (
        <span className="font-medium text-purple-700">
          {ret.Purchase?.referenceNo || `#${ret.purchaseId}`}
        </span>
      ),
      align: 'center'
    },
    {
      header: 'Supplier',
      render: (ret) => ret.Supplier
        ? <div><p className="font-medium">{ret.Supplier.name}</p></div>
        : <span className="text-muted-foreground">—</span>
    },
    {
      header: 'Date',
      render: (ret) => formatDate(ret.returnDate || ret.createdAt)
    },
    {
      header: 'Refund Total',
      align: 'right',
      render: (ret) => <span className="font-semibold text-purple-600">{formatCurrency(ret.total)}</span>
    },
    {
      header: 'Received',
      align: 'right',
      render: (ret) => <span className="font-medium text-green-600">{formatCurrency(ret.amountReturned)}</span>
    },
    {
      header: 'Outstanding',
      align: 'right',
      render: (ret) => {
        const outstanding = parseFloat(String(ret.total)) - parseFloat(String(ret.amountReturned));
        return outstanding > 0
          ? <span className="text-red-600 font-semibold">{formatCurrency(outstanding)}</span>
          : <span className="text-green-600">—</span>;
      }
    },
    {
      header: 'Status',
      align: 'center',
      render: (ret) => {
        const config = STATUS_CONFIG[ret.status] || STATUS_CONFIG.due;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.bgClass} ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
        );
      }
    }
  ];

  const outstanding = payReturn
    ? parseFloat(String(payReturn.total)) - parseFloat(String(payReturn.amountReturned))
    : 0;

  return (
    <div className="p-3 space-y-3 w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <RotateCcw className="w-7 h-7" /> Purchase Returns
        </h1>
        <Button variant="outline" className="gap-2" onClick={fetchReturns} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* ── Detail View ── */}
      {viewingReturnId && selectedReturn && selectedReturn.id === viewingReturnId ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => { setViewingReturnId(null); setSelectedReturn(null); }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Returns
            </Button>
          </div>

          {returnLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header Card */}
              <Card className="overflow-hidden bg-gradient-to-br from-secondary to-purple-50 dark:from-purple-950/30 dark:to-purple-900/30 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <RotateCcw className="w-8 h-8 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-bold">
                            Return {selectedReturn.invoiceNumber || `#${selectedReturn.id}`}
                          </h2>
                          <Badge className={`${STATUS_CONFIG[selectedReturn.status]?.bgClass} ${STATUS_CONFIG[selectedReturn.status]?.color}`}>
                            {STATUS_CONFIG[selectedReturn.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Return Date: {formatDate(selectedReturn.returnDate || selectedReturn.createdAt)}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          {selectedReturn.Purchase && (
                            <span className="flex items-center gap-1">
                              <Receipt className="w-4 h-4" />
                              Purchase {selectedReturn.Purchase.referenceNo || `#${selectedReturn.purchaseId}`}
                            </span>
                          )}
                          {selectedReturn.Supplier && (
                            <span className="flex items-center gap-1">
                              <Truck className="w-4 h-4" />
                              {selectedReturn.Supplier.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount Summary */}
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Refund Total</p>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(selectedReturn.total)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount Received</p>
                        <p className="text-xl font-semibold text-green-700">{formatCurrency(selectedReturn.amountReturned)}</p>
                      </div>
                      {(selectedReturn.total - selectedReturn.amountReturned) > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className="text-xl font-semibold text-red-700">
                            {formatCurrency(selectedReturn.total - selectedReturn.amountReturned)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {selectedReturn.status !== 'paid' && (
                  <Button onClick={() => openPayDialog(selectedReturn)} variant="outline" size="sm">
                    <Banknote className="w-4 h-4 mr-2" /> Record Refund Payment
                  </Button>
                )}
              </div>

              {/* Return Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Returned Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-primary">
                        <tr>
                          <th className="text-white p-3 text-left">Product</th>
                          <th className="text-white p-3 text-right">Quantity Returned</th>
                          <th className="text-white p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedReturn.ReturnItems || []).map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-3 font-medium">
                              {item.PurchaseItem?.name || `Item #${item.purchaseItemId}`}
                            </td>
                            <td className="p-3 text-right">{item.quantityReturned}</td>
                            <td className="p-3 text-right font-semibold text-purple-600">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tbody className="bg-gray-50">
                        <tr>
                          <td colSpan={2} className="p-3 text-right font-semibold">Subtotal:</td>
                          <td className="p-3 text-right">{formatCurrency(selectedReturn.subtotal)}</td>
                        </tr>
                        {selectedReturn.taxAmount > 0 && (
                          <tr>
                            <td colSpan={2} className="p-3 text-right">Tax ({selectedReturn.taxPercent}%):</td>
                            <td className="p-3 text-right">{formatCurrency(selectedReturn.taxAmount)}</td>
                          </tr>
                        )}
                        {selectedReturn.discountAmount > 0 && (
                          <tr>
                            <td colSpan={2} className="p-3 text-right">Discount:</td>
                            <td className="p-3 text-right text-red-600">-{formatCurrency(selectedReturn.discountAmount)}</td>
                          </tr>
                        )}
                        <tr className="bg-purple-50">
                          <td colSpan={2} className="p-3 text-right font-bold text-lg">Refund Total:</td>
                          <td className="p-3 text-right font-bold text-lg text-purple-600">
                            {formatCurrency(selectedReturn.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              {selectedReturn.Payments && selectedReturn.Payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Refund Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-left">Method</th>
                            <th className="p-3 text-left">Transaction ID</th>
                            <th className="p-3 text-left">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReturn.Payments.map((payment) => (
                            <tr key={payment.id} className="border-b">
                              <td className="p-3">{formatDate(payment.createdAt)}</td>
                              <td className="p-3 text-right font-semibold text-green-600">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="p-3 capitalize">
                                {payment.paymentMethod.replace('_', ' ')}
                                {payment.Bank && (
                                  <span className="block text-xs text-muted-foreground">
                                    {payment.Bank.bankName} ({payment.Bank.accountNumber})
                                  </span>
                                )}
                              </td>
                              <td className="p-3">{payment.transactionId || '—'}</td>
                              <td className="p-3">{payment.note || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedReturn.note && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedReturn.note}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <DataTable
          title="All Purchase Returns"
          icon={RotateCcw}
          columns={returnColumns}
          data={returns}
          loading={loading}
          error={error}
          exportable
          exportFileName="purchase-returns"
          filters={
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative ml-auto">
                <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search purchase returns..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                />
              </div>
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
          }
          pagination={{ total, page, limit, onPageChange: setPage, onLimitChange: setLimit, itemLabel: 'returns' }}
        />
      )}

      {/* ── Add Refund Payment Dialog ── */}
      <Dialog open={!!payReturn} onOpenChange={(o) => !o && setPayReturn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Supplier Refund — Return #{payReturn?.invoiceNumber || payReturn?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Refund</p>
                <p className="font-bold text-lg">{formatCurrency(payReturn?.total || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Outstanding</p>
                <p className="font-bold text-lg text-red-600">{formatCurrency(outstanding)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Received from Supplier</label>
              <Input type="number" value={payForm.watch("payAmount")} onChange={(e) => payForm.setValue("payAmount", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={payForm.watch("payMethod")} onValueChange={(v) => payForm.setValue("payMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payForm.watch("payMethod") === 'bank_transfer' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Account (to credit)</label>
                  <Select value={payForm.watch("payBankId")?.toString()} onValueChange={(v) => payForm.setValue("payBankId", parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder="Select Bank" /></SelectTrigger>
                    <SelectContent>
                      {banks.filter(b => !b.status || b.status.toLowerCase() === 'active').map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.bankName || b.name || 'Unnamed'} ({b.accountNumber || '—'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction ID</label>
                  <Input value={payForm.watch("payTransactionId")} onChange={(e) => payForm.setValue("payTransactionId", e.target.value)} placeholder="Reference #" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input value={payForm.watch("payNote")} onChange={(e) => payForm.setValue("payNote", e.target.value)} placeholder="Refund note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayReturn(null)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={payLoading} className="bg-purple-600 hover:bg-purple-700">
              {payLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Record Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return #{deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this purchase return record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
