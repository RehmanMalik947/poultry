import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { canManage } from '../../utils/permissions';
import {
  DollarSign,
  Receipt,
  Calendar,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Pencil,
  Trash2,
  Clock,
  CreditCard,
  ChevronDown,
  MoreVertical,
  Eye,
  Package,
  FileText,
  Printer,
  ArrowLeft,
  User,
  User2,
  Building2,
  Hash,
  Calendar as CalendarIcon,
  Banknote,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  History,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useCurrency } from '../../contexts/CurrencyContext';
import React from 'react';
import { ApiService, API_BASE } from "../../../api/ApiService";
import { DataTable, Column } from '../../components/shared/DataTable';
import { EntityActions } from '../../components/shared/EntityActions';
import { SalePrintModal } from "./SalePrintDocument";

type BankRecord = {
  id: number;
  bankName?: string;
  name?: string;
  accountNumber: string | null;
  status?: string;
};

type SaleItem = {
  id: number;
  itemId: number;
  itemName: string;
  itemType: 'product' | 'service' | 'package';
  price: number;
  quantity: number;
  staffId?: number | null;
  // legacy field name from older data
  serviceName?: string;
};

type SaleRecord = {
  id: number;
  organizationId: number;
  branchId: number | null;
  invoiceNumber?: string;
  StaffId?: number | null;
  Staff?: { id: number; firstName: string; lastName: string; phone: string | null } | null;
  User?: { id: number; name: string } | null;
  CustomerId?: number | null;
  Customer?: { id: number; name: string; phone: string | null } | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  totalItems: number;
  status: 'paid' | 'unpaid' | 'partial' | 'draft' | 'credit';
  paymentMethod?: 'Cash' | 'Card' | 'Cheque' | 'Multiple' | 'Credit' | null;
  paymentStatus?: 'paid' | 'overdue' | 'due' | null;
  amountPaid?: number;
  remainingBalance?: number;
  dueDate?: string | null;
  weight?: number | string;
rate?: number | string;
driverName?: string | null;
lorryNo?: string | null;
referenceNo?: string | null;
additionalNotes?: string | null;
shippingDetails?: string | null;
  // Backend (Sequelize) returns SaleItems; legacy alias kept for compat
  SaleItems?: SaleItem[];
  items?: SaleItem[];
  Payments?: {
    id: number;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    cardHolder?: string;
    cardType?: string;
    cardNumberLast4?: string;
    chequeNo?: string;
    chequeBank?: string;
    chequeDate?: string;
    accountHolder?: string;
    createdAt: string;
  }[];
  SaleReturns?: {
    id: number;
    SaleReturnItems?: {
      saleItemId: number;
      quantityReturned: number;
    }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

type BreakdownSaleItem = { serviceName: string; price: number; quantity: number; lineTotal: number };
type MonthSalesBreakdown = { sales: { saleId: number; total: number; items: BreakdownSaleItem[] }[]; totalRevenue: number };

function formatDate(iso: string) {
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
}

function formatDateTime(iso: string) {
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
}

export function ListSales() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ View Sale State (like Customer/Product profile)
  const [viewingSaleId, setViewingSaleId] = useState<number | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [saleTab, setSaleTab] = useState<"details" | "payments" | "items">("details");

  const [deleteConfirmSale, setDeleteConfirmSale] = useState<SaleRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paySale, setPaySale] = useState<SaleRecord | null>(null);
  const [banks, setBanks] = useState<BankRecord[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const paySchema = z.object({
    amount: z.coerce.number().min(0.01, 'Enter a valid amount'),
    method: z.enum(['cash', 'card', 'bank_transfer', 'cheque']),
    bankId: z.coerce.number().optional(),
    transactionId: z.string().optional().default(''),
    note: z.string().optional().default(''),
    cardHolder: z.string().optional().default(''),
    transactionNo: z.string().optional().default(''),
    cardType: z.string().optional().default('VISA'),
    chequeNo: z.string().optional().default(''),
    chequeBank: z.string().optional().default(''),
    chequeDate: z.string().optional().default(''),
    accountHolder: z.string().optional().default(''),
  });
  type PayFormValues = z.infer<typeof paySchema>;
  const payForm = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: { amount: 0, method: 'cash', note: '' },
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial' | 'draft'>('all');
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesLimit, setSalesLimit] = useState(10);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // ── Return View State ────────────────────────────────────────────────────
  const [returningSale, setReturningSale] = useState<SaleRecord | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, string>>({});
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const returnSchema = z.object({
    note: z.string().optional().default(''),
  });
  type ReturnFormValues = z.infer<typeof returnSchema>;
  const returnForm = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: { note: '' },
  });

  const fetchBanks = useCallback(async () => {
    setLoadingBanks(true);
    try {
      const res = await ApiService.sales.getBanks();
      setBanks(res.data || []);
    } catch {
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: salesPage,
        limit: salesLimit,
      };

      if (selectedBranchId != null) params.branchId = selectedBranchId;
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;

      const res = await ApiService.sales.getAll(params);

      if (!res?.success) {
        setError(res?.message || "Failed to load sales");
        setSales([]);
        setSalesTotal(0);
        return;
      }

      setSales(res.data?.sales || []);
      setSalesTotal(res.data?.total || 0);
    } catch (err) {
      setError("Failed to load sales");
      setSales([]);
      setSalesTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, statusFilter, salesPage, search]);

  // ✅ Fetch Sale Details for View Page
  const fetchSaleDetails = useCallback(async (saleId: number) => {
    try {
      const res = await ApiService.get(`/pos/sale/${saleId}`);
      if (res.data) {
        setSelectedSale(res.data);
      }
    } catch (err) {
      toast.error("Failed to load sale details");
    }
  }, []);

  // ✅ Open Sale View (like Customer profile)
  // ✅ Open Inline Return View
  const openReturnView = async (sale: SaleRecord) => {
    try {
      const res = await ApiService.get(`/pos/sale/${sale.id}`);
      const fullSale: SaleRecord = res?.data ?? sale;
      const initQtys: Record<number, string> = {};
      (fullSale.SaleItems || []).forEach((item) => { initQtys[item.id] = "0"; });
      setReturnQtys(initQtys);
      returnForm.reset({ note: '' });
      setReturningSale(fullSale);
    } catch {
      toast.error("Failed to load sale details");
    }
  };

  const openSaleView = async (sale: SaleRecord) => {
    setSelectedSale(sale);
    setViewingSaleId(sale.id);
    await fetchSaleDetails(sale.id);
    setSaleTab("details");
  };

  // Load sale details when viewingSaleId changes
  useEffect(() => {
    if (viewingSaleId) {
      fetchSaleDetails(viewingSaleId);
    }
  }, [viewingSaleId, fetchSaleDetails]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    setSalesPage(1);
  }, [statusFilter]);

  // Handle auto-opening return modal if navigated from POS
  useEffect(() => {
    const returnSaleId = searchParams.get('returnSaleId');
    if (returnSaleId) {
      openReturnView({ id: Number(returnSaleId) } as SaleRecord);
      searchParams.delete('returnSaleId');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('returnSaleId')]);

  const handleDelete = async () => {
    if (!deleteConfirmSale) return;
    setDeleteLoading(true);
    try {
      const res = await ApiService.sales.delete(deleteConfirmSale.id);
      if (!res?.success) {
        toast.error(res?.message || "Failed to delete sale");
        return;
      }
      toast.success("Sale deleted");
      setDeleteConfirmSale(null);
      fetchSales();
      if (viewingSaleId === deleteConfirmSale.id) {
        setViewingSaleId(null);
        setSelectedSale(null);
      }
    } catch {
      toast.error("Failed to delete sale");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openPaymentDialog = (sale: SaleRecord) => {
    setPaySale(sale);
    const paid = Number(sale.amountPaid) || (sale.Payments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) ?? 0);
    const remaining = sale.remainingBalance ?? Math.max(0, Number(sale.total) - paid);
    payForm.reset({ amount: remaining > 0 ? remaining : 0, method: 'cash', note: '' });
    fetchBanks();
  };

  const totalPaid = paySale
    ? (Number(paySale.amountPaid) || (paySale.Payments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) ?? 0))
    : 0;

  const remainingToPay = paySale
    ? (paySale.remainingBalance ?? Math.max(0, Number(paySale.total) - totalPaid))
    : 0;

  const addPaymentRow = payForm.handleSubmit(async (data) => {
    if (!paySale) return;

    const apiMethod = data.method;

    if (apiMethod === "bank_transfer" && (!data.bankId || !data.transactionId?.trim())) {
      toast.error("Select a bank and enter transaction ID for bank transfer");
      return;
    }

    if (apiMethod === "card") {
      if (!data.cardHolder?.trim()) { toast.error("Card holder name is required"); return; }
      if (!data.transactionNo?.trim()) { toast.error("Transaction/Auth number is required"); return; }
    }

    if (apiMethod === "cheque") {
      if (!data.chequeNo?.trim()) { toast.error("Cheque number is required"); return; }
      if (!data.chequeBank?.trim()) { toast.error("Bank name is required"); return; }
    }

    const amount = data.amount;

    if (amount > remainingToPay) {
      toast.error("Amount cannot exceed remaining balance");
      return;
    }

    setPayLoading(true);

    try {
      const body: any = {
        amount: amount,
        paymentMethod: apiMethod,
      };

      if (apiMethod === "bank_transfer") {
        body.bankId = data.bankId;
        body.transactionId = data.transactionId.trim();
      }

      if (apiMethod === "card") {
        body.cardHolder = data.cardHolder.trim();
        body.transactionId = data.transactionNo.trim();
        body.cardType = data.cardType;
      }

      if (apiMethod === "cheque") {
        body.chequeNo = data.chequeNo.trim();
        body.chequeBank = data.chequeBank.trim();
        body.chequeDate = data.chequeDate;
        body.accountHolder = data.accountHolder.trim();
      }

      if (data.note?.trim()) body.note = data.note.trim();

      const res = await ApiService.sales.pay(paySale.id, body);

      if (!res?.success) {
        toast.error(res?.message || "Payment failed");
        return;
      }

      const updated = res.data as SaleRecord;

      // Compute remaining balance — backend sets it, fallback to calculation
      const updatedTotal = Number(updated?.total) || 0;
      const updatedPaid = Number(updated?.amountPaid) || 0;
      const newRemaining = updated?.remainingBalance != null
        ? Number(updated.remainingBalance)
        : Math.max(0, updatedTotal - updatedPaid);

      // Update the view panel immediately with fresh data (no extra API call needed)
      if (viewingSaleId === paySale.id) {
        setSelectedSale(updated);
      }

      setPaySale(null);
      fetchSales();

      if (newRemaining <= 0 || updated?.status === "paid") {
        toast.success("Payment completed — sale is now fully paid!");
      } else {
        payForm.setValue('amount', newRemaining);
        toast.success(`Payment added. ${formatCurrency(newRemaining)} remaining.`);
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setPayLoading(false);
    }
  });

  // Calculate payment summary
  const calculateTotals = () => {
    if (!selectedSale) return { totalPaid: 0, remaining: 0, paidPercentage: 0 };
    const total = selectedSale.total || 0;
    const paid = selectedSale.amountPaid || selectedSale.Payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const remaining = Math.max(0, total - paid);
    const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
    return { totalPaid: paid, remaining, paidPercentage };
  };

  const saleColumns: Column<SaleRecord>[] = [
    {
      header: 'Actions',
      align: 'right',
      render: (sale) => (
        <EntityActions
          onView={() => openSaleView(sale)}
          onEdit={() => navigate(`/sales/add?editSaleId=${sale.id}`)}          onDelete={() => setDeleteConfirmSale(sale)}
          extraActions={[
            {
              label: 'Print Invoice',
              icon: Printer,
              onClick: () => {
                setSelectedSale(sale);
                setPrintModalOpen(true);
              }
            },
            ...(canManage() && (sale.status === "unpaid" || sale.status === "partial" || sale.status === "credit")
              ? [{ label: 'Add Payment', icon: CreditCard, onClick: () => openPaymentDialog(sale) }]
              : []),
            {
              label: 'Sell Return',
              icon: RotateCcw,
              onClick: () => openReturnView(sale)
            }
          ]}
        />
      )
    },
    {
      header: 'Invoice No.',
      align: 'center',
      render: (sale) => {
        const hasReturns = Array.isArray(sale.SaleReturns) && sale.SaleReturns.length > 0;
        return (
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <span>{sale.invoiceNumber || `#${sale.id}`}</span>
            {hasReturns && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700" title="This sale has returned items">
                <RotateCcw className="w-3 h-3" />
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Customer',
      render: (sale) => sale.Customer ? (
        <div>
          <p className="font-medium text-gray-900">{sale.Customer.name}</p>
          {sale.Customer.phone && <p className="text-xs text-gray-500">{sale.Customer.phone}</p>}
        </div>
      ) : <span className="font-medium">Walk-in Customer</span>
    },
    
    // {
    //   header: "Stylist",
    //   render: (sale) => sale.Staff ? (
    //     <div>
    //       <p className="font-medium text-gray-900">{sale.Staff.firstName} {sale.Staff.lastName}</p>
    //       {sale.Staff.phone && <p className="text-xs text-gray-500">{sale.Staff.phone}</p>}
    //     </div>
    //   ) : (
    //     <span className="text-gray-400">—</span>
    //   )
    // },
    // { header: 'Items', accessor: 'totalItems', align: 'center' },
    // { header: 'Subtotal', render: (s) => formatCurrency(s.subtotal ?? 0) },
    // { header: 'Tax', render: (s) => formatCurrency(s.taxAmount ?? 0), align: 'right' },
    // { header: 'Discount', render: (s) => formatCurrency(s.discountAmount ?? 0), align: 'right' },
    // { header: 'Paid', render: (s) => formatCurrency(s.amountPaid ?? 0), className: 'text-green-600 font-medium' },
    // {
    //   header: 'Status',
    //   align: 'center',
    //   render: (sale) => (
    //     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${!sale.status || sale.status === "paid" ? "bg-green-100 text-green-700" : sale.status === "partial" ? "bg-amber-100 text-amber-700" : sale.status === "draft" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>
    //       {(sale.status || "COMPLETED").toUpperCase()}
    //     </span>
    //   )
    // },
    // { header: 'Payment Method', accessor: 'paymentMethod', className: 'text-green-600 font-medium', align: 'center' },
    // // Add this column after 'Paid' column
    // {
    //   header: 'Due Amount',
    //   align: 'right',
    //   render: (sale) => {
    //     const dueAmount = (sale.remainingBalance ??
    //       Math.max(0, (sale.total || 0) - (sale.amountPaid || 0)));
    //     return dueAmount > 0 ? (
    //       <span className="text-red-600 font-semibold">
    //         {formatCurrency(dueAmount)}
    //       </span>
    //     ) : (
    //       <span className="text-green-600"></span>
    //     );
    //   }
    // },
    // {
    //   header: 'Due Date',
    //   align: 'center',
    //   render: (sale) => {
    //     if (!sale.dueDate) return <span className="text-gray-400">—</span>;

    //     const dueDate = new Date(sale.dueDate);
    //     const today = new Date();
    //     today.setHours(0, 0, 0, 0);

    //     const isOverdue = dueDate < today && (sale.remainingBalance ??
    //       Math.max(0, sale.total - (sale.amountPaid || 0))) > 0;

    //     return (
    //       <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
    //         {dueDate.toLocaleDateString()}
    //         {isOverdue && <span className="ml-1 text-xs">⚠️</span>}
    //       </span>
    //     );
    //   }
    // },
        
    {
  header: "Weight",
  render: (sale: SaleRecord) => (
    <span className="font-medium">
      {Number(sale.weight || 0).toLocaleString()} kg
    </span>
  ),
},
{
  header: "Rate",
  render: (sale: SaleRecord) => formatCurrency(Number(sale.rate || 0)),
},
{ header: 'Total', render: (s) => formatCurrency(s.total), className: 'font-semibold text-purple-700' },

{
  header: "Driver Name",
  render: (sale: SaleRecord) => sale.driverName || "—",
},
{
  header: "Lorry No",
  render: (sale: SaleRecord) => sale.lorryNo || "—",
},

    { header: 'Date', render: (s) => formatDate(s.createdAt), className: 'text-gray-600' },
{
      header: "Added By",
      render: (sale) => sale.User ? (
        <div>
          <p className="font-medium text-gray-900">{sale.User.name}</p>
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      )
    },
  ];

  const { totalPaid: viewTotalPaid, remaining: viewRemaining, paidPercentage: viewPaidPercentage } = calculateTotals();

  return (
    <div className="p-3 space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap">
        <h1 className="text-3xl font-bold text-primary">Sales</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-10 border-2 font-medium" onClick={fetchSales} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          {/* <Link to="/pos">
            <Button className="bg-primary hover:bg-primary/90 gap-2 h-10">
              <ShoppingCart className="h-4 w-4" />
              Open POS
            </Button>
          </Link> */}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* ✅ RETURN VIEW - Inline sell return form */}
      {returningSale ? (
        <>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="-ml-2 gap-2" onClick={() => setReturningSale(null)}>
              <ArrowLeft className="w-4 h-4" /> Back to Sales
            </Button>
          </div>
          <div className="space-y-4">
            <Form {...returnForm}>
            {/* Header */}
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <RotateCcw className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Sell Return — Sale #{returningSale.id}</h2>
                      <p className="text-sm text-muted-foreground">
                        {returningSale.Customer?.name || "Walk-in Customer"} · {new Date(returningSale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Original Sale Total</p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(returningSale.total)}</p>
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
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-center">Sell Qty</TableHead>
                      <TableHead className="text-center w-36">Return Qty</TableHead>
                      <TableHead className="text-right">Return Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(returningSale.SaleItems || []).map((item, idx) => {
                      const qty = parseFloat(returnQtys[item.id] || "0");
                      const rowAmt = item.price * qty;

                      // Calculate already returned quantity
                      const alreadyReturned = (returningSale.SaleReturns || []).reduce((sum, ret) => {
                        const rItem = (ret.SaleReturnItems || []).find(r => r.saleItemId === item.id);
                        return sum + (rItem ? parseFloat(String(rItem.quantityReturned)) : 0);
                      }, 0);

                      const maxReturnable = item.quantity - alreadyReturned;

                      return (
                        <TableRow key={item.id} className={qty > 0 ? "bg-orange-50" : ""}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.itemType}</p>
                            {alreadyReturned > 0 && <p className="text-xs text-orange-600 font-medium mt-0.5">Already returned: {alreadyReturned}</p>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Input
                                type="number"
                                min={0}
                                max={maxReturnable}
                                disabled={maxReturnable <= 0}
                                value={returnQtys[item.id] ?? "0"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = parseFloat(val) || 0;
                                  if (num > maxReturnable) {
                                    toast.error(`Max returnable: ${maxReturnable}`);
                                    setReturnQtys(prev => ({ ...prev, [item.id]: String(maxReturnable) }));
                                  } else {
                                    setReturnQtys(prev => ({ ...prev, [item.id]: val }));
                                  }
                                }}
                                className={`w-24 text-center border-2 ${maxReturnable <= 0 ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'focus:border-orange-400'}`}
                              />
                              {maxReturnable <= 0 && <p className="text-[10px] text-red-500 font-medium mt-1">Fully returned</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {qty > 0 ? <span className="text-orange-600">{formatCurrency(rowAmt)}</span> : "—"}
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
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Reason / Note</FormLabel>
                        <FormControl>
                          <textarea
                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
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
              {(() => {
                const items = (returningSale.SaleItems || [])
                  .map(item => ({ ...item, qty: parseFloat(returnQtys[item.id] || "0") }))
                  .filter(i => i.qty > 0);
                const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
                const tax = sub * ((returningSale.taxPercent || 0) / 100);
                const origSub = returningSale.subtotal || 0;
                const disc = origSub > 0 ? (returningSale.discountAmount || 0) * (sub / origSub) : 0;
                const total = sub + tax - disc;
                return (
                  <Card className="border-2 border-orange-200 bg-orange-50">
                    <CardHeader><CardTitle className="text-base text-orange-700">Return Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(sub)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tax ({returningSale.taxPercent || 0}%)</span><span>{formatCurrency(tax)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(disc)}</span></div>
                      <div className="flex justify-between border-t pt-2 font-bold text-lg text-orange-700"><span>Total Refund</span><span>{formatCurrency(total)}</span></div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pb-6">
              <Button variant="outline" onClick={() => setReturningSale(null)}>Cancel</Button>
              <Button
                disabled={returnSubmitting || !(returningSale.SaleItems || []).some(item => parseFloat(returnQtys[item.id] || "0") > 0)}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                onClick={returnForm.handleSubmit(async (data) => {
                  const items = (returningSale.SaleItems || [])
                    .map(item => ({ saleItemId: item.id, quantityReturned: parseFloat(returnQtys[item.id] || "0") }))
                    .filter(i => i.quantityReturned > 0);
                  setReturnSubmitting(true);
                  try {
                    const res = await ApiService.sales.createReturn({ saleId: returningSale.id, items, note: data.note });
                    if (res?.success) {
                      toast.success("Sale return created successfully!");
                      setReturningSale(null);
                      fetchSales();
                    } else {
                      toast.error(res?.message || "Failed to create return");
                    }
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || "Failed to create return");
                  } finally {
                    setReturnSubmitting(false);
                  }
                })}
              >
                {returnSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Return
              </Button>
            </div>
            </Form>
          </div>
        </>
      ) : viewingSaleId && selectedSale && selectedSale.id === viewingSaleId ? (
        <>
          {/* Back Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => {
                setViewingSaleId(null);
                setSelectedSale(null);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sales
            </Button>
          </div>

          <div className="space-y-3">
            {/* Sale Header Card */}
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
                          Invoice {selectedSale.invoiceNumber ? `#${selectedSale.invoiceNumber}` : `#${selectedSale.id}`}
                        </h2>
                        {(() => {
                          const dueAmount = selectedSale.remainingBalance ?? Math.max(0, selectedSale.total - (selectedSale.amountPaid || 0));
                          let statusBadge = null;
                          if (dueAmount <= 0) {
                            statusBadge = <Badge className="bg-green-100 text-green-700">PAID</Badge>;
                          } else if (dueAmount === selectedSale.total) {
                            statusBadge = <Badge className="bg-red-100 text-red-700">UNPAID</Badge>;
                          } else {
                            statusBadge = <Badge className="bg-amber-100 text-amber-700">PARTIAL</Badge>;
                          }
                          return statusBadge;
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {formatDateTime(selectedSale.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {selectedSale.Customer && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-4 h-4" />
                            {selectedSale.Customer.name}
                          </span>
                        )}
                        {selectedSale.User && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <User2 className="w-4 h-4" />
                            Cashier: {selectedSale.User.name}
                          </div>
                        )}
                        {selectedSale.Staff && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <User2 className="w-4 h-4" />
                            Stylist: {selectedSale.Staff.firstName} {selectedSale.Staff.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount Summary */}
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold text-purple-700">{formatCurrency(selectedSale.total)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paid: {formatCurrency(viewTotalPaid)} | Due: {formatCurrency(viewRemaining)}
                    </p>
                    {viewRemaining > 0 && canManage() && (
                      <Button size="sm" className="mt-2 bg-primary" onClick={() => openPaymentDialog(selectedSale)}>
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
                {viewRemaining > 0 && viewRemaining < selectedSale.total && (
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
            <Tabs value={saleTab} onValueChange={(v) => setSaleTab(v as "details" | "payments" | "items")} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="details">Sale Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="payments">Payment History</TabsTrigger>
              </TabsList>

              {/* Tab 1: Sale Details */}
              <TabsContent value="details" className="mt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Invoice #</p>
                        <p className="text-sm text-foreground">  {selectedSale.invoiceNumber || selectedSale.id}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Customer</p>
                        <p className="text-sm text-foreground">{selectedSale.Customer?.name || "Walk-in Customer"}</p>
                      </div>
                     
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Stylist</p>
                        <p className="font-medium">
                          {selectedSale.Staff ? `${selectedSale.Staff.firstName} ${selectedSale.Staff.lastName}` : "—"}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                        <p className="text-sm text-foreground">{selectedSale.paymentMethod || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                        <p className="text-sm text-foreground">{formatCurrency(selectedSale.subtotal)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Discount</p>
                        <p className="text-sm text-foreground text-red-600">-{formatCurrency(selectedSale.discountAmount)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Tax ({selectedSale.taxPercent}%)</p>
                        <p className="text-sm text-foreground">{formatCurrency(selectedSale.taxAmount)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(selectedSale.total)}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <p className="text-sm text-gray-500">Weight</p>
    <p className="font-semibold">
      {Number(selectedSale.weight || 0).toLocaleString()} kg
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Rate</p>
    <p className="font-semibold">
      {formatCurrency(Number(selectedSale.rate || 0))}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Driver Name</p>
    <p className="font-semibold">
      {selectedSale.driverName || "—"}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Lorry No</p>
    <p className="font-semibold">
      {selectedSale.lorryNo || "—"}
    </p>
  </div>
   <div>
                        <p className="text-sm font-medium text-muted-foreground">Added By</p>
                        <p className="font-medium">
                          {selectedSale.User ? selectedSale.User.name : "—"}
                        </p>
                      </div>
</div>
                      {selectedSale.dueDate && (
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                          <p className="text-sm text-foreground">{formatDate(selectedSale.dueDate)}</p>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Created At</p>
                        <p className="text-sm text-foreground">{formatDateTime(selectedSale.createdAt)}</p>
                      </div>
                    </div>
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
                            <TableHead className="text-white">Item Name</TableHead>
                            <TableHead className="text-white text-right">Price</TableHead>
                            <TableHead className="text-white text-center">Quantity</TableHead>
                            <TableHead className="text-white text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedSale.SaleItems || selectedSale.items || []).map((item: any, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell className="font-medium">{item.itemName || item.serviceName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(item.price * item.quantity)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2">
                            <TableCell colSpan={4} className="text-right font-semibold">Subtotal:</TableCell>
                            <TableCell className="text-right">{formatCurrency(selectedSale.subtotal)}</TableCell>
                          </TableRow>
                          {selectedSale.discountAmount > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right text-red-600">Discount:</TableCell>
                              <TableCell className="text-right text-red-600">-{formatCurrency(selectedSale.discountAmount)}</TableCell>
                            </TableRow>
                          )}
                          {selectedSale.taxAmount > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right">Tax ({selectedSale.taxPercent}%):</TableCell>
                              <TableCell className="text-right">{formatCurrency(selectedSale.taxAmount)}</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="border-t-2">
                            <TableCell colSpan={4} className="text-right font-bold text-lg">Total:</TableCell>
                            <TableCell className="text-right font-bold text-purple-700 text-lg">{formatCurrency(selectedSale.total)}</TableCell>
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
                    {!selectedSale.Payments || !Array.isArray(selectedSale.Payments) || selectedSale.Payments.length === 0 ? (
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
                              <TableHead className="text-white">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedSale.Payments.map((payment, idx) => (
                              <TableRow key={payment.id}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {payment.paymentMethod}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">
                                  {payment.cardHolder && `Card: ${payment.cardHolder} `}
                                  {payment.chequeNo && `Cheque: ${payment.chequeNo} `}
                                  {payment.transactionId && `Ref: ${payment.transactionId}`}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 bg-gray-50">
                              <TableCell colSpan={3} className="text-right font-bold">Total Paid:</TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(selectedSale.Payments.reduce((sum, p) => sum + p.amount, 0))}
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
            </Tabs>
          </div>
        </>
      ) : (
        <DataTable
          title="All Sales"
          columns={saleColumns}
          data={sales}
          loading={loading}
          error={error}
          exportable
          exportFileName="sales"
          pagination={{
            total: salesTotal,
            page: salesPage,
            limit: salesLimit,
            onPageChange: setSalesPage,
            onLimitChange: setSalesLimit,
            itemLabel: "sales"
          }}
          filters={
            <>
              
              <Select value={String(salesLimit)} onValueChange={(v) => { setSalesLimit(Number(v)); setSalesPage(1); }}>
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
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as "all" | "paid" | "unpaid" | "partial" | "draft")}
              >
<SelectTrigger className="w-[80px] h-9 border-gray-300 border-2 rounded-lg hover:bg-gray-50 text-sm font-medium [&>svg]:text-gray-300">                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative ml-auto">
                <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search sales..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSalesPage(1); }}
                  className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                />
              </div>
            </>
          }
        />
      )}

      {/* Print Invoice Modal */}
      <Dialog open={printModalOpen} onOpenChange={(o) => !o && setPrintModalOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Print Invoice
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <SalePrintModal
              sale={selectedSale}
              onClose={() => setPrintModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmSale} onOpenChange={(o) => !o && setDeleteConfirmSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete Sale #{deleteConfirmSale?.id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      <Dialog open={!!paySale} onOpenChange={(o) => !o && setPaySale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment - Sale #{paySale?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="font-bold text-lg">{formatCurrency(paySale?.total || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Paid</p>
                <p className="font-bold text-lg text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Pay</label>
              <Input type="number" placeholder="0.00" {...payForm.register('amount', { valueAsNumber: true })} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Method</label>
              <Select value={payForm.watch('method')} onValueChange={(v: any) => payForm.setValue('method', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks
                        .filter((b) => !b.status || b.status.toLowerCase() === "active")
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.bankName || b.name || "Unnamed Bank"} ({b.accountNumber || "No Account #"})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction ID</label>
                  <Input placeholder="Enter reference" {...payForm.register('transactionId')} />
                </div>
              </>
            )}

            {payForm.watch('method') === 'card' && (
              <div className="grid grid-cols-1 gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700">Card Holder *</label>
                  <Input placeholder="NAME ON CARD" className="border-purple-200"
                    onChange={e => payForm.setValue('cardHolder', e.target.value.toUpperCase())}
                    value={payForm.watch('cardHolder')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-700">Transaction No *</label>
                    <Input placeholder="Auth ID" className="border-purple-200" {...payForm.register('transactionNo')} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-700">Card Type</label>
                    <Select value={payForm.watch('cardType')} onValueChange={(v) => payForm.setValue('cardType', v)}>
                      <SelectTrigger className="border-purple-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['VISA', 'Mastercard', 'AMEX', 'UnionPay'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {payForm.watch('method') === 'cheque' && (
              <div className="grid grid-cols-1 gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-teal-700">Cheque No *</label>
                    <Input placeholder="000XXX" className="border-teal-200" {...payForm.register('chequeNo')} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-teal-700">Cheque Date *</label>
                    <Input type="date" className="border-teal-200" {...payForm.register('chequeDate')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700">Bank Name *</label>
                  <Input placeholder="Bank Name" className="border-teal-200" {...payForm.register('chequeBank')} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <Input placeholder="Optional payment note" {...payForm.register('note')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaySale(null)}>Cancel</Button>
            <Button onClick={addPaymentRow} disabled={payLoading}>
              {payLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}