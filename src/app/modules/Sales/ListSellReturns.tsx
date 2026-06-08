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
  RefreshCw, Loader2, CreditCard, Trash2, RotateCcw, Eye,
  Receipt, DollarSign, Calendar, User, FileText, AlertCircle,
  CheckCircle, XCircle, Printer, Send, ArrowLeft, TrendingUp,
  TrendingDown, Package, Clock, Banknote, History, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '../../contexts/CurrencyContext';
import { EntityActions } from '../../components/shared/EntityActions';
import { Link, useNavigate } from 'react-router';

interface ReturnRecord {
  id: number;
  invoiceNumber?: string;
  saleId: number;
  returnDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountReturned: number;
  status: 'paid' | 'partial' | 'due';
  note?: string;
  Customer?: { id: number; name: string; mobile?: string };
  Sale?: { id: number; invoiceNumber?: string; total?: number; created_at?: string };
  createdAt: string;
  SaleReturnItems?: Array<{
    id: number;
    itemName: string;
    itemType: string;
    quantityReturned: number;
    price: number;
  }>;
  SaleReturnPayments?: Array<{
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
    label: "Paid",
    color: "text-green-700",
    bgClass: "bg-green-100",
    icon: <CheckCircle className="h-3 w-3" />
  },
  partial: {
    label: "Partial",
    color: "text-yellow-700",
    bgClass: "bg-yellow-100",
    icon: <AlertCircle className="h-3 w-3" />
  },
  due: {
    label: "Due",
    color: "text-red-700",
    bgClass: "bg-red-100",
    icon: <XCircle className="h-3 w-3" />
  }
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return d;
  }
}

export function ListSellReturns() {
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  // Payment Dialog
  const [search, setSearch] = useState("");
  const [payReturn, setPayReturn] = useState<ReturnRecord | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [banks, setBanks] = useState<BankRecord[]>([]);

  const paySchema = z.object({
    amount: z.coerce.number().min(0.01, 'Enter a valid amount'),
    method: z.string().min(1, 'Method is required'),
    bankId: z.coerce.number().optional(),
    transactionId: z.string().optional().default(''),
    note: z.string().optional().default(''),
  });
  type PayFormValues = z.infer<typeof paySchema>;
  const payForm = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: { amount: 0, method: 'cash', bankId: undefined, transactionId: '', note: '' },
  });

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<ReturnRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Return Detail View States
  const [viewingReturnId, setViewingReturnId] = useState<number | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.sales.listReturns({ page, limit, search: search || undefined });
      if (res?.success) {
        setReturns(res.data || []);
        setTotal(res.total || 0);
      } else {
        setError(res?.message || 'Failed to load returns');
      }
    } catch {
      setError('Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

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
      const res = await ApiService.sales.getReturnById(returnId);
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

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  useEffect(() => {
    if (viewingReturnId) {
      fetchReturnDetails(viewingReturnId);
    }
  }, [viewingReturnId, fetchReturnDetails]);

  const openReturnView = (ret: ReturnRecord) => {
    setSelectedReturn(ret);
    setViewingReturnId(ret.id);
  };

  const openPayDialog = (ret: ReturnRecord) => {
    const outstanding = parseFloat(String(ret.total)) - parseFloat(String(ret.amountReturned));
    setPayReturn(ret);
    payForm.reset({ amount: outstanding, method: 'cash', bankId: undefined, transactionId: '', note: '' });
  };

  const handleAddPayment = payForm.handleSubmit(async (data) => {
    if (!payReturn) return;
    setPayLoading(true);
    try {
      const res = await ApiService.sales.addReturnPayment(payReturn.id, {
        amount: data.amount,
        paymentMethod: data.method,
        bankId: data.bankId || null,
        transactionId: data.transactionId || null,
        note: data.note || null,
      });
      if (res?.success) {
        toast.success('Return payment added!');
        setPayReturn(null);
        fetchReturns();
        // Refresh details if viewing
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
      const res = await ApiService.sales.deleteReturn(deleteTarget.id);
      if (res?.success) {
        toast.success('Return deleted');
        setDeleteTarget(null);
        if (viewingReturnId === deleteTarget.id) {
          setViewingReturnId(null);
          setSelectedReturn(null);
        }
        fetchReturns();
      } else {
        toast.error(res?.message || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePrintReturn = (ret: ReturnRecord) => {
    window.open(`/sales/returns/invoice/${ret.id}`, '_blank');
  };

  const handleSendWhatsApp = async (ret: ReturnRecord) => {
    if (!ret.Customer?.mobile) {
      toast.error("Customer phone number not available");
      return;
    }
    try {
      await ApiService.whatsapp.sendReturnInvoice({
        returnId: ret.id,
        phoneNumber: ret.Customer.mobile
      });
      toast.success("Return invoice sent via WhatsApp");
    } catch {
      toast.error("Failed to send invoice");
    }
  };

  const returnColumns: Column<ReturnRecord>[] = [
    {
      header: 'Actions',
      align: 'center',
      render: (ret) => (
        <EntityActions
          onView={() => openReturnView(ret)}
          onDelete={() => setDeleteTarget(ret)}
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
      header: 'Sale No.',
      render: (ret) => <span className="font-medium text-purple-700">{ret.Sale?.invoiceNumber || `#${ret.saleId}`}</span>,
      align: 'center'
    },
    {
      header: 'Date',
      render: (ret) => formatDate(ret.returnDate || ret.createdAt)
    },
    {
      header: 'Customer',
      render: (ret) => ret.Customer ? (
        <div>
          <p className="font-medium">{ret.Customer.name}</p>
          {ret.Customer.mobile && <p className="text-xs text-muted-foreground">{ret.Customer.mobile}</p>}
        </div>
      ) : <span className="text-muted-foreground">Walk-in</span>
    },
    {
      header: 'Refund Total',
      align: 'right',
      render: (ret) => <span className="font-semibold text-orange-600">{formatCurrency(ret.total)}</span>
    },
    {
      header: 'Returned',
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
        const config = STATUS_CONFIG[ret.status];
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.bgClass} ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
        );
      }
    },
  ];

  const outstanding = payReturn
    ? parseFloat(String(payReturn.total)) - parseFloat(String(payReturn.amountReturned))
    : 0;

  return (
    <div className="p-3 space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <RotateCcw className="w-7 h-7" /> Sale Returns
        </h1>
        <Button variant="outline" className="gap-2" onClick={fetchReturns} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* RETURN DETAIL VIEW - Like Product View */}
      {viewingReturnId && selectedReturn && selectedReturn.id === viewingReturnId ? (
        <>
          {/* Back Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => {
                setViewingReturnId(null);
                setSelectedReturn(null);
              }}
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
              {/* Return Header Card */}
              <Card className="overflow-hidden bg-gradient-to-br from-secondary to-orange-50 dark:from-purple-950/30 dark:to-orange-950/30 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <RotateCcw className="w-8 h-8 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-bold">Return No. {selectedReturn.invoiceNumber || `#${selectedReturn.id}`}</h2>
                          <Badge className={STATUS_CONFIG[selectedReturn.status]?.bgClass + " " + STATUS_CONFIG[selectedReturn.status]?.color}>
                            {STATUS_CONFIG[selectedReturn.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Return Date: {formatDate(selectedReturn.returnDate || selectedReturn.createdAt)}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          {/* <span className="flex items-center gap-1">
                            <Receipt className="w-4 h-4" />
                            Sale No. {selectedReturn.Sale?.invoiceNumber || `#${selectedReturn.saleId}`}
                          </span> */}
                          {selectedReturn.Customer && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {selectedReturn.Customer.name}
                            </span>
                          )}
                          {selectedReturn.Customer?.mobile && (
                            <span className="flex items-center gap-1">
                              <span>📞</span>
                              {selectedReturn.Customer.mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount Summary */}
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Refund Total</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(selectedReturn.total)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount Returned</p>
                        <p className="text-xl font-semibold text-green-700">
                          {formatCurrency(selectedReturn.amountReturned)}
                        </p>
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

              {/* Action Buttons for Return */}
              <div className="flex flex-wrap gap-2">
                {selectedReturn.status !== 'paid' && (
                  <Button onClick={() => openPayDialog(selectedReturn)} variant="outline" size="sm">
                    <CreditCard className="w-4 h-4 mr-2" /> Add Payment
                  </Button>
                )}
                <Button onClick={() => handlePrintReturn(selectedReturn)} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" /> Print Invoice
                </Button>
                {selectedReturn.Customer?.mobile && (
                  <Button onClick={() => handleSendWhatsApp(selectedReturn)} variant="outline" size="sm">
                    <Send className="w-4 h-4 mr-2" /> Send WhatsApp
                  </Button>
                )}
              </div>

              {/* Return Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Return Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-primary">
                        <tr>
                          <th className="text-white p-3 text-left">Product</th>
                          <th className="text-white p-3 text-right">Quantity</th>
                          <th className="text-white p-3 text-right">Unit Price</th>
                          <th className="text-white p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.SaleReturnItems?.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-3 font-medium">
                              <p className="font-medium text-gray-900">{item.itemName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{item.itemType}</p>
                            </td>
                            <td className="p-3 text-right">{item.quantityReturned}</td>
                            <td className="p-3 text-right">{formatCurrency(item.price)}</td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(parseFloat(String(item.price)) * parseFloat(String(item.quantityReturned)))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tbody className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="p-3 text-right font-semibold">Subtotal:</td>
                          <td className="p-3 text-right">{formatCurrency(selectedReturn.subtotal)}</td>
                        </tr>
                        {selectedReturn.discountAmount > 0 && (
                          <tr>
                            <td colSpan={3} className="p-3 text-right">Discount:</td>
                            <td className="p-3 text-right text-red-600">-{formatCurrency(selectedReturn.discountAmount)}</td>
                          </tr>
                        )}
                        {selectedReturn.taxAmount > 0 && (
                          <tr>
                            <td colSpan={3} className="p-3 text-right">Tax:</td>
                            <td className="p-3 text-right">{formatCurrency(selectedReturn.taxAmount)}</td>
                          </tr>
                        )}
                        <tr className="bg-orange-50">
                          <td colSpan={3} className="p-3 text-right font-bold text-lg">Refund Total:</td>
                          <td className="p-3 text-right font-bold text-lg text-orange-600">
                            {formatCurrency(selectedReturn.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              {selectedReturn.SaleReturnPayments && selectedReturn.SaleReturnPayments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Payment History
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
                          {selectedReturn.SaleReturnPayments.map((payment) => (
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

              {/* Notes if exists */}
              {selectedReturn.note && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notes
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
          title="All Sale Returns"
          icon={RotateCcw}
          columns={returnColumns}
          data={returns}
          loading={loading}
          error={error}
          exportable
          exportFileName="sale-returns"
          pagination={{ total, page, limit, onPageChange: setPage, onLimitChange: setLimit, itemLabel: 'returns' }}
          filters={
            <>
              
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
                  placeholder="Search returns..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                />
              </div>
            </>
          }
        />
      )}

      {/* Add Payment Dialog */}
      <Dialog open={!!payReturn} onOpenChange={(o) => !o && setPayReturn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Return Payment — Return #{payReturn?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 p-3 bg-orange-50 rounded-lg">
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
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" placeholder="0.00" {...payForm.register('amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Method</label>
              <Select value={payForm.watch('method')} onValueChange={(v) => payForm.setValue('method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payForm.watch('method') === 'bank_transfer' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank</label>
                  <Select value={payForm.watch('bankId')?.toString()} onValueChange={(v) => payForm.setValue('bankId', parseInt(v))}>
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
                  <Input placeholder="Reference #" {...payForm.register('transactionId')} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input placeholder="Payment note" {...payForm.register('note')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayReturn(null)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={payLoading} className="bg-green-600 hover:bg-green-700">
              {payLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return #{deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this return, restore inventory levels, and revert customer balance changes. This cannot be undone.
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