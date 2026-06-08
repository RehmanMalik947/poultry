import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankSchema, type BankFormValues } from "../../utils/validation";
import { useBranch } from "../../contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { Search, Plus, Pencil, Trash2, Loader2, Tag, MoreVertical, Eye, Landmark, ArrowLeft, History, TrendingUp, TrendingDown, Package, Building2, CreditCard, DollarSign, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "../../components/shared/TablePagination";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { ApiService } from "../../../api/ApiService";
import { Link, useNavigate } from "react-router";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";

type Account = {
  id: number;
  bankName: string;
  accountHolder: string;
  accountType: string;
  accountNumber: string;
  note: string;
  balance: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type TransactionLog = {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  transactionType: string;
  referenceId: number;
  transactionDate: string;
  createdAt: string;
};

// Transaction Config
const TRANSACTION_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ReactNode }> = {
  credit: {
    label: "Credit",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  debit: {
    label: "Debit",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    icon: <TrendingDown className="h-3 w-3" />,
  },
};

function formatDate(iso: string | null) {
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

export function ListAccounts() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // View Account State (like Customer/Product profile)
  const [viewingAccountId, setViewingAccountId] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountTab, setAccountTab] = useState<"details" | "transactions">("details");
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sheet state (Add/Edit)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bankName: "", accountHolder: "", accountNumber: "", accountType: "Savings", balance: 0, note: "" },
  });
  const [formStatus, setFormStatus] = useState("Active");
  // Transaction pagination state - Add these after the existing state declarations
const [transactionsPage, setTransactionsPage] = useState(1);
const transactionsLimit = 10; // You can adjust this as needed

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  // FETCH DATA
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.accounts.getAll();
      setAccounts(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ✅ Fetch Account Details
  const fetchAccountDetails = useCallback(async (accountId: number) => {
    try {
      const res = await ApiService.accounts.getById(accountId);
      if (res.data) {
        setSelectedAccount(res.data);
      }
    } catch (err) {
      toast.error("Failed to load account details");
    }
  }, []);

  // ✅ Fetch Account Transactions
  const fetchAccountTransactions = useCallback(async (accountId: number) => {
    setTransactionsLoading(true);
    try {
      const res = await ApiService.accounts.getTransactions(accountId);
      setTransactions(res.data ?? []);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // ✅ Open Account View (like Customer profile)
  const openAccountView = (account: Account) => {
    setSelectedAccount(account);
    setViewingAccountId(account.id);
    fetchAccountTransactions(account.id);
    setAccountTab("details");
  };

  // ✅ Open transactions directly from action button
  const openTransactions = async (account: Account) => {
    setSelectedAccount(account);
    setViewingAccountId(account.id);
    await fetchAccountTransactions(account.id);
    setAccountTab("transactions");
  };

  // Load account details when viewingAccountId changes
  useEffect(() => {
    if (viewingAccountId) {
      fetchAccountDetails(viewingAccountId);
    }
  }, [viewingAccountId, fetchAccountDetails]);

  // FILTER (search + status)
  const filtered = accounts.filter((a) => {
    const matchesSearch =
      a.bankName?.toLowerCase().includes(search.toLowerCase()) ||
      a.accountHolder?.toLowerCase().includes(search.toLowerCase()) ||
      a.accountType?.toLowerCase().includes(search.toLowerCase()) ||
      a.accountNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  // DELETE
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.accounts.delete(deleteTarget.id);
      toast.success("Account deleted");
      setDeleteTarget(null);
      fetchAccounts();
      if (viewingAccountId === deleteTarget.id) {
        setViewingAccountId(null);
        setSelectedAccount(null);
      }
    } catch (err) {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ bankName: "", accountHolder: "", accountNumber: "", accountType: "Savings", balance: 0, note: "" });
    setFormStatus("Active");
    setSheetOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditTarget(acc);
    form.reset({ bankName: acc.bankName, accountHolder: acc.accountHolder || "", accountNumber: acc.accountNumber || "", accountType: acc.accountType || "Savings", balance: acc.balance || 0, note: acc.note || "" });
    setFormStatus(acc.status || "Active");
    setSheetOpen(true);
  };

  const handleSave = async (values: BankFormValues) => {
    setSaving(true);
    try {
      const payload = {
        bankName: values.bankName.trim(),
        accountHolder: values.accountHolder.trim(),
        accountType: values.accountType,
        accountNumber: values.accountNumber.trim(),
        note: values.note.trim(),
        balance: values.balance || 0,
        status: formStatus,
      };

      if (editTarget) {
        const res = await ApiService.accounts.update(editTarget.id, payload);
        if (res.success) {
          toast.success("Account updated");
          fetchAccounts();
          if (viewingAccountId === editTarget.id) {
            await fetchAccountDetails(viewingAccountId);
          }
        }
      } else {
        const res = await ApiService.accounts.create(payload);
        if (res.success) {
          toast.success("Account added");
          fetchAccounts();
        }
      }
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const accountColumns: Column<Account>[] = [
    {
      header: 'Actions',
      align: 'center',
      render: (acc) => (
        <EntityActions
          onView={() => openAccountView(acc)}
          onEdit={() => openEdit(acc)}
          onDelete={() => setDeleteTarget(acc)}
          extraActions={[
            {
              label: 'Transaction History',
              icon: History,
              onClick: () => openTransactions(acc)
            }
          ]}
        />
      )
    },
    { header: 'Bank Name', accessor: 'bankName', className: 'font-medium' },
    { header: 'Account Holder', accessor: 'accountHolder', className: 'text-gray-600' },
    {
      header: 'Account Type',
      render: (acc) => (
        <span className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
          {acc.accountType}
        </span>
      )
    },
    { header: 'Account Number', accessor: 'accountNumber', className: 'text-gray-600' },
    {
      header: 'Balance',
      render: (acc) => (
        <span className={`font-semibold ${Number(acc.balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatCurrency(acc.balance || 0)}
        </span>
      )
    },
    {
      header: 'Status',
      align: 'center',
      render: (acc) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${acc.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {acc.status}
        </span>
      )
    },
    { header: 'Note', accessor: 'note', className: 'text-gray-500 max-w-[150px] truncate' },
  ];

  // Calculate transaction summary
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-3 space-y-3 w-full">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Accounts</h1>
        <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Account
        </Button>
      </div>

      {/* ✅ ACCOUNT DETAIL VIEW - Like Customer/Product Profile */}
      {viewingAccountId && selectedAccount && selectedAccount.id === viewingAccountId ? (
        <>
          {/* Back Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => {
                setViewingAccountId(null);
                setSelectedAccount(null);
                setTransactions([]);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Accounts
            </Button>
          </div>

          <div className="space-y-3">
            {/* Account Header Card */}
            <Card className="overflow-hidden bg-gradient-to-br from-secondary to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Account Icon */}
                  <div className="w-20 h-20 rounded-lg bg-primary/10 border-4 border-white dark:border-gray-800 shadow flex items-center justify-center">
                    {selectedAccount.accountType === 'Cash' ? (
                      <DollarSign className="w-10 h-10 text-primary" />
                    ) : (
                      <Building2 className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedAccount.bankName}</h2>
                      <Badge variant="secondary">{selectedAccount.accountType}</Badge>
                      {selectedAccount.status === 'Active' ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Closed</Badge>
                      )}
                    </div>
                    {selectedAccount.accountHolder && (
                      <p className="text-sm text-muted-foreground mt-0.5">Holder: {selectedAccount.accountHolder}</p>
                    )}
                    {selectedAccount.accountNumber && (
                      <p className="text-sm text-muted-foreground">Account: {selectedAccount.accountNumber}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Added {formatDate(selectedAccount.createdAt || null)}
                    </p>
                  </div>

                  {/* Balance Badge */}
                  <div className={`px-4 py-2 rounded-lg text-center ${(selectedAccount.balance ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className={`text-2xl font-bold ${(selectedAccount.balance ?? 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(selectedAccount.balance ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={accountTab} onValueChange={(v) => setAccountTab(v as "details" | "transactions")} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="details">Account Details</TabsTrigger>
                <TabsTrigger value="transactions">Transaction History</TabsTrigger>
              </TabsList>

              {/* Tab 1: Account Details */}
              <TabsContent value="details" className="mt-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Account Information</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => openEdit(selectedAccount)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                        <p className="text-sm text-foreground">{selectedAccount.bankName || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Account Holder</p>
                        <p className="text-sm text-foreground">{selectedAccount.accountHolder || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                        <p className="text-sm text-foreground">{selectedAccount.accountType || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                        <p className="text-sm text-foreground">{selectedAccount.accountNumber || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-sm text-foreground">{selectedAccount.status || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Created At</p>
                        <p className="text-sm text-foreground">{formatDate(selectedAccount.createdAt || null)}</p>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Note</p>
                        <p className="text-sm text-foreground">{selectedAccount.note || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Transaction History */}
              {/* Tab 2: Transaction History */}
<TabsContent value="transactions" className="mt-3">
  <div className="space-y-4">
    {/* Transaction Summary Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Credits</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCredits)}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-lg">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Debits</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebits)}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Transactions</p>
            <p className="text-xl font-bold text-blue-600">{transactions.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Transactions Table with Pagination */}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Transaction History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactionsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions recorded
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary/95">
                    <TableHead className="text-white whitespace-nowrap">#</TableHead>
                    <TableHead className="text-white whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-white whitespace-nowrap">Amount</TableHead>
                    <TableHead className="text-white whitespace-nowrap">Description</TableHead>
                    <TableHead className="text-white whitespace-nowrap">Reference</TableHead>
                    <TableHead className="text-white whitespace-nowrap">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .slice((transactionsPage - 1) * transactionsLimit, transactionsPage * transactionsLimit)
                    .map((log, idx) => {
                      const isCredit = log.type === 'credit';
                      const config = TRANSACTION_CONFIG[log.type] || TRANSACTION_CONFIG.credit;
                      const globalIndex = ((transactionsPage - 1) * transactionsLimit) + idx + 1;

                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="text-gray-400 text-xs py-3">{globalIndex}</TableCell>
                          
                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
                              {config.icon}
                              {config.label}
                            </span>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-0.5 font-bold text-sm ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                              {isCredit ? "+" : "-"}{formatCurrency(log.amount)}
                            </span>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-sm text-gray-700 font-medium">{log.description}</span>
                            <span className="block text-[10px] text-gray-400 uppercase">{log.transactionType}</span>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-xs text-gray-500">ID: {log.referenceId || "—"}</span>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDateTime(log.transactionDate)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Component */}
            <div className="border-t px-4 py-3">
              <TablePagination
                total={transactions.length}
                page={transactionsPage}
                limit={transactionsLimit}
                onPageChange={setTransactionsPage}
                itemLabel="transactions"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  </div>
</TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <DataTable
          title="All Accounts"
          icon={Landmark}
          columns={accountColumns}
          data={paginated}
          loading={loading}
          exportable
          exportFileName="accounts"
          pagination={{
            total: filtered.length,
            page: page,
            limit: limit,
            onPageChange: setPage,
            onLimitChange: setLimit,
            itemLabel: "accounts"
          }}
          emptyMessage="No accounts found"
          filters={
            <div className="flex gap-3 flex-wrap">
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
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[140px] border-2 font-medium">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-72 ml-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts..."
                  value={search}
                  onChange={handleSearch}
                  className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                />
              </div>
            </div>
          }
        />
      )}

      {/* ── Add / Edit Sheet ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={open => !open && setSheetOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {editTarget ? "Edit Account" : "Add Account"}
            </SheetTitle>
          </SheetHeader>

          <Form {...form}>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <FormField
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HBL, Meezan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder</FormLabel>
                  <FormControl>
                    <Input placeholder="Name on account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1234-5678-90" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Balance (Initial)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FormField
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Extra details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          </Form>

          <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={form.handleSubmit(handleSave)}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editTarget ? "Update" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.bankName}"</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}