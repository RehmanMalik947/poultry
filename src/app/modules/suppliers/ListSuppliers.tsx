import { useState, useEffect, useCallback } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBranch } from "../../contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Truck,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  CreditCard,
  Info,
  History,
  ShoppingCart,
  TrendingDown,
  FileText,
  Package,
  Banknote,
  CalendarIcon
} from "lucide-react"; import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";
import { canManage } from "../../utils/permissions";
import { EntityActions } from "../../components/shared/EntityActions";
import { ApiService } from "../../../api/ApiService";
import { DataTable, Column } from "../../components/shared/DataTable";
import { useNavigate } from "react-router";

type Supplier = {
  id: number;
  organizationId?: number;
  branchId?: number | null;
  name: string;
  contactId: string | null;
  isIndividual: boolean;
  prefix: string | null;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  phone: string | null;
  alternateNumber: string | null;
  landline: string | null;
  email: string | null;
  address: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  taxNumber: string | null;
  payTerm: number | null;
  payTermType: 'days' | 'months' | null;
  openingBalance: string | number | null;
  advanceBalance: string | number | null;
  contactPersons?: any[];
  totalPurchaseDue?: number;
  totalPurchaseReturnDue?: number;
  balanceDue?: number;
  status?: string | null;
  user?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}


const paymentSchema = z.object({
  paymentAmount: z.string().min(1, "Amount is required"),
  paymentDate: z.date(),
  paymentAccount: z.string().min(1, "Account is required"),
  paymentMethod: z.string(),
  chequeNo: z.string().optional(),
  externalAccountNo: z.string().optional(),
  paymentNote: z.string().optional(),
});

export function ListSuppliers() {

  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  const [viewingSupplierId, setViewingSupplierId] = useState<number | null>(null);
  const [viewedSupplier, setViewedSupplier] = useState<Supplier | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Ledger State
  const [ledgerSupplierTarget, setLedgerSupplierTarget] = useState<Supplier | null>(null);
  const [ledgerLogs, setLedgerLogs] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Purchases State
  const [purchasesSupplierTarget, setPurchasesSupplierTarget] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  //payment modal states
  // Payment States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
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
  const fetchLedger = async (s: Supplier) => {
    setLedgerSupplierTarget(s);
    setLedgerLoading(true);
    try {
      const res = await ApiService.suppliers.getLedger(s.id);
      setLedgerLogs(res.data?.transactions ?? []);
      setLedgerSummary(res.data?.summary ?? null);
    } catch (err) {
      toast.error("Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  const fetchPurchases = async (s: Supplier) => {
    setPurchasesSupplierTarget(s);
    setPurchasesLoading(true);
    try {
      const res = await ApiService.purchases.getAll({ supplierId: s.id });
      setSupplierPurchases(res.data ?? []);
    } catch (err) {
      toast.error("Failed to load purchases");
    } finally {
      setPurchasesLoading(false);
    }
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.suppliers.getAll({
        page,
        limit,
        search: searchQuery.trim() || undefined,
      });
      setSuppliers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Please sign in.");
      } else {
        setError(err.response?.data?.message || "Failed to load suppliers");
      }
      setSuppliers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, selectedBranchId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    ApiService.accounts.getAll()
      .then(res => setAccounts(res.data || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (viewingSupplierId == null) {
      setViewedSupplier(null);
      return;
    }
    setViewLoading(true);
    ApiService.suppliers.getById(viewingSupplierId)
      .then((data) => {
        if (data.success && data.data) setViewedSupplier(data.data);
        else setViewedSupplier(null);
      })
      .catch(() => setViewedSupplier(null))
      .finally(() => setViewLoading(false));
  }, [viewingSupplierId]);

  const openView = (s: Supplier) => setViewingSupplierId(s.id);
  const openEdit = (s: Supplier) => navigate(`/suppliers/edit/${s.id}`);
  const openEditFromView = () => {
    if (viewedSupplier) navigate(`/suppliers/edit/${viewedSupplier.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.suppliers.delete(deleteTarget.id);
      toast.success("Supplier deleted");
      if (viewingSupplierId === deleteTarget.id) {
        setViewingSupplierId(null);
        setViewedSupplier(null);
      }
      setDeleteTarget(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setDeleting(false);
    }
  };

  const openPaymentModal = (supplier: Supplier) => {
    const dueAmount = supplier.balanceDue || 0;

    if (dueAmount <= 0) {
      toast.info("This supplier has no due balance.");
      return;
    }

    setSelectedSupplier(supplier);
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
    if (!selectedSupplier) return;

    setIsSubmittingPayment(true);

    try {
      await ApiService.suppliers.addPayment(selectedSupplier.id, {
        amount: data.paymentAmount,
        accountId: data.paymentAccount,
        paymentMethod: data.paymentMethod,
        chequeNo: data.paymentMethod === "cheque" ? data.chequeNo : undefined,
        externalAccountNo:
          data.paymentMethod === "bank_transfer"
            ? data.externalAccountNo
            : undefined,
        paymentDate: data.paymentDate,
        note: data.paymentNote,
      });

      toast.success("Payment added successfully");

      setPaymentModalOpen(false);

      fetchSuppliers();

    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  });

  const supplierColumns: Column<Supplier>[] = [
    {
      header: 'Actions',
      align: 'center',
      render: (s) => (
        <EntityActions
          onView={() => openView(s)}
          onEdit={canManage() ? () => openEdit(s) : undefined}
          onDelete={canManage() ? () => setDeleteTarget(s) : undefined}
          extraActions={[
            {
              label: "Ledger",
              icon: History,
              onClick: () => fetchLedger(s)
            },
            {
              label: "Purchases",
              icon: ShoppingCart,
              onClick: () => fetchPurchases(s)
            },
            {
              label: "Add Payment",
              icon: Banknote,
              onClick: () => openPaymentModal(s),
              className: "text-green-600"
            }
          ]}
        />
      )
    },
    // {
    //   header: 'Contact ID',
    //   accessor: 'contactId',
    //   render: (s) => s.contactId ?? "—"
    // },
    {
      header: 'Business Name',
      accessor: 'businessName',
      render: (s) => s.businessName ?? "—"
    },
    {
      header: 'Name',
      accessor: 'name',
      className: 'font-medium',
      render: (s) => (
        <div className="flex flex-col">
          <span>{s.name}</span>
          {s.businessName && s.isIndividual && (
            <span className="text-[10px] text-muted-foreground uppercase">{s.businessName}</span>
          )}
        </div>
      )
    },
    {
      header: 'Mobile',
      accessor: 'phone',
      render: (s) => s.phone ?? "—"
    },
    // {
    //   header: 'Email',
    //   accessor: 'email',
    //   render: (s) => s.email ?? "—"
    // },
    {
      header: 'CNIC',
      accessor: 'taxNumber',
      render: (s) => s.taxNumber ?? "—"
    },
    // {
    //   header: 'Pay Term',
    //   accessor: 'payTerm',
    //   render: (s) => s.payTerm ? `${s.payTerm} ${s.payTermType}` : "—"
    // },
    {
      header: 'Opening Balance',
      accessor: 'openingBalance',
      render: (s) => {
        const balance = typeof s.openingBalance === 'number'
          ? s.openingBalance
          : parseFloat(s.openingBalance as string) || 0;
        return (
          <span className={balance < 0 ? 'text-red-600' : 'text-green-600'}>
            {formatCurrency(balance)}
          </span>
        );
      }
    },
    // {
    //   header: 'Advance Balance',
    //   accessor: 'advanceBalance',
    //   render: (s) => {
    //     const balance = typeof s.advanceBalance === 'number'
    //       ? s.advanceBalance
    //       : parseFloat(s.advanceBalance as string) || 0;
    //     return (
    //       <span className={balance < 0 ? 'text-red-600' : 'text-green-600'}>
    //         {formatCurrency(balance)}
    //       </span>
    //     );
    //   }
    // },
    // {
    //   header: 'Purchase Due',
    //   accessor: 'totalPurchaseDue',
    //   render: (s) => {
    //     const balance = s.totalPurchaseDue || 0;
    //     return (
    //       <span className={`font-medium ${balance > 0 ? 'text-red-500' : 'text-gray-500'}`}>
    //         {formatCurrency(balance)}
    //       </span>
    //     );
    //   }
    // },
    // {
    //   header: 'Total Due',
    //   accessor: 'balanceDue',
    //   render: (s) => {
    //     const balance = s.balanceDue || 0;
    //     return (
    //       <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
    //         {formatCurrency(balance)}
    //       </span>
    //     );
    //   }
    // },
    // {
    //   header: 'Added On',
    //   accessor: 'createdAt',
    //   render: (s) => formatDate(s.createdAt)
    // },
    {
      header: 'Status',
      accessor: 'status',
      render: (s) => {
        const isActive = s.status !== 'inactive'; // Default to active if undefined
        return (
          <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    // {
    //   header: 'Added By',
    //   accessor: 'user',
    //   render: (s) => s.user?.name || "System"
    // },

    // {
    //   header: 'Total Purchase Return Due',
    //   accessor: 'totalPurchaseReturnDue',
    //   render: (s) => formatCurrency(0) // Will be calculated from purchase returns
    // },

  ];

  return (
    <div className="p-3 space-y-3  w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary dark:text-gray-100">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage suppliers for inventory and purchasing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage() && !viewingSupplierId && (
            <Button className="gap-2" onClick={() => navigate("/suppliers/add")}>
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {viewingSupplierId ? (
        <>
          <Button type="button" variant="ghost" className="mb-4 -ml-2 gap-2" onClick={() => { setViewingSupplierId(null); setViewedSupplier(null); }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Suppliers
          </Button>
          {viewLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : viewedSupplier ? (
            <div className="space-y-6">
              <Card className="overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950/30 dark:to-blue-950/30 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Truck className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{viewedSupplier.name}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">Added {formatDate(viewedSupplier.createdAt)}</p>
                      </div>
                    </div>
                    {canManage() && (
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={openEditFromView}>
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Contact details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Contact person</p>
                      <p className="text-sm text-foreground">
                        {viewedSupplier.contactPersons && viewedSupplier.contactPersons[0]
                          ? `${viewedSupplier.contactPersons[0].firstName} ${viewedSupplier.contactPersons[0].lastName}`
                          : viewedSupplier.name}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</p>
                      <p className="text-sm text-foreground">{viewedSupplier.phone || "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Email</p>
                      <p className="text-sm text-foreground">{viewedSupplier.email || "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="w-4 h-4" /> Tax Number</p>
                      <p className="text-sm text-foreground">{viewedSupplier.taxNumber || "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Info className="w-4 h-4" /> Pay Term</p>
                      <p className="text-sm text-foreground">{viewedSupplier.payTerm ? `${viewedSupplier.payTerm} ${viewedSupplier.payTermType}` : "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="w-4 h-4" /> Opening Balance</p>
                      <p className="text-sm text-foreground font-bold text-primary">{formatCurrency(viewedSupplier.openingBalance || 0)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Advance Balance</p>
                      <p className="text-sm text-foreground font-bold text-green-600">{formatCurrency(viewedSupplier.advanceBalance || 0)}</p>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</p>
                      <p className="text-sm text-foreground">
                        {viewedSupplier.address || [viewedSupplier.addressLine1, viewedSupplier.city, viewedSupplier.state, viewedSupplier.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Supplier not found or could not be loaded.</CardContent></Card>
          )}
        </>
      ) : (
        <>
          <div className="overflow-x-auto"><DataTable
            title="All Suppliers"
            icon={Truck}
            columns={supplierColumns}
            data={suppliers}
            loading={loading}
            error={error}
            exportable
            exportFileName="suppliers"
            pagination={{
              total: total,
              page: page,
              limit: limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
              itemLabel: "suppliers"
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
                <div className="relative w-64 ml-auto">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search suppliers..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                  />
                </div>
              </div>
            }
          /></div>

          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete supplier</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove &quot;{deleteTarget?.name}&quot;. Inventory items linked to this supplier will keep the supplier name but the link will be removed. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {/* ── Ledger Dialog ────────────────────────────────────────── */}
      <Dialog open={!!ledgerSupplierTarget} onOpenChange={(open) => !open && setLedgerSupplierTarget(null)}>
        <DialogContent className="!max-w-5xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">Transaction History</h2>
                <p className="text-sm text-gray-500 leading-tight">
                  {ledgerSupplierTarget?.name}
                </p>
              </div>
            </div>

          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {ledgerLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                <p className="text-sm text-gray-400">Loading ledger...</p>
              </div>
            ) : ledgerLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <History className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium">No transactions found</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/95">
                      <TableHead className="text-white font-semibold text-xs py-3 w-10">#</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Type</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Debit</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Credit</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Balance</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Description</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerLogs.map((log, idx) => {
                      const isCredit = parseFloat(log.credit) > 0;
                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="text-gray-400 text-xs py-3">{idx + 1}</TableCell>
                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${isCredit ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                              {isCredit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {log.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-red-500 font-medium">
                            {parseFloat(log.debit) > 0 ? formatCurrency(log.debit) : "—"}
                          </TableCell>
                          <TableCell className="py-3 text-emerald-600 font-medium">
                            {parseFloat(log.credit) > 0 ? formatCurrency(log.credit) : "—"}
                          </TableCell>
                          <TableCell className="py-3 font-semibold text-gray-800">
                            {formatCurrency(log.balance)}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-sm text-gray-700 font-medium">{log.note}</span>
                            <span className="block text-[10px] text-gray-400 uppercase">Ref: {log.referenceNo || "—"}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(log.date).toLocaleDateString("en-PK", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-xs text-gray-400">
              {ledgerLogs.length > 0 ? `Showing ${ledgerLogs.length} transaction${ledgerLogs.length !== 1 ? "s" : ""}` : "No records found"}
            </p>
            <Button variant="outline" onClick={() => setLedgerSupplierTarget(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Purchases Dialog ────────────────────────────────────────── */}
      <Dialog open={!!purchasesSupplierTarget} onOpenChange={(open) => !open && setPurchasesSupplierTarget(null)}>
        <DialogContent className="!max-w-5xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">Purchases</h2>
                <p className="text-sm text-gray-500 leading-tight">
                  {purchasesSupplierTarget?.name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {purchasesLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                <p className="text-sm text-gray-400">Loading purchases...</p>
              </div>
            ) : supplierPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <ShoppingCart className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium">No purchases found</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/95">
                      <TableHead className="text-white font-semibold text-xs py-3 w-10">#</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Ref No</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Total Amount</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Paid Amount</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Due Amount</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Status</TableHead>
                      <TableHead className="text-white font-semibold text-xs py-3">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPurchases.map((p, idx) => (
                      <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="text-gray-400 text-xs py-3">{idx + 1}</TableCell>
                        <TableCell className="py-3 font-medium">{p.referenceNo || `PO-${p.id}`}</TableCell>
                        <TableCell className="py-3 font-semibold text-gray-800">{formatCurrency(p.totalAmount)}</TableCell>
                        <TableCell className="py-3 text-emerald-600 font-medium">{formatCurrency(p.paidAmount)}</TableCell>
                        <TableCell className="py-3 text-red-500 font-medium">{formatCurrency((p.totalAmount || 0) - (p.paidAmount || 0))}</TableCell>
                        <TableCell className="py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${p.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : p.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {p.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-gray-500">
                          {new Date(p.purchaseDate).toLocaleDateString("en-PK", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-xs text-gray-400">
              {supplierPurchases.length > 0 ? `Showing ${supplierPurchases.length} purchase${supplierPurchases.length !== 1 ? "s" : ""}` : "No records found"}
            </p>
            <Button variant="outline" onClick={() => setPurchasesSupplierTarget(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Supplier Payment</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Supplier</Label>
              <div className="col-span-3 font-medium">
                {selectedSupplier?.name}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Total Due</Label>
              <div className="col-span-3 font-semibold text-red-600">
                {formatCurrency(selectedSupplier?.balanceDue || 0)}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount</Label>

              <Input
                type="number"
                value={paymentForm.watch("paymentAmount")}
                onChange={(e) => paymentForm.setValue("paymentAmount", e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Account</Label>

              <Select value={paymentForm.watch("paymentAccount")} onValueChange={(v) => paymentForm.setValue("paymentAccount", v)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>

                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.bankName} ({acc.accountNumber || "Cash"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Method</Label>

              <Select value={paymentForm.watch("paymentMethod")} onValueChange={(v) => paymentForm.setValue("paymentMethod", v)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentForm.watch("paymentMethod") === "cheque" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Cheque No</Label>

                <Input
                  value={paymentForm.watch("chequeNo")}
                  onChange={(e) => paymentForm.setValue("chequeNo", e.target.value)}
                  className="col-span-3"
                />
              </div>
            )}

            {paymentForm.watch("paymentMethod") === "bank_transfer" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Account No</Label>

                <Input
                  value={paymentForm.watch("externalAccountNo")}
                  onChange={(e) => paymentForm.setValue("externalAccountNo", e.target.value)}
                  className="col-span-3"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Note</Label>

              <Textarea
                value={paymentForm.watch("paymentNote")}
                onChange={(e) => paymentForm.setValue("paymentNote", e.target.value)}
                className="col-span-3"
              />
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleAddPayment}
              disabled={isSubmittingPayment}
            >
              {isSubmittingPayment ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}