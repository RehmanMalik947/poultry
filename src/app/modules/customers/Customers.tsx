import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerFormValues } from "../../utils/validation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Label } from "../../components/ui/label";
import { COLORS } from '../../constants/colors';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../../components/ui/sheet";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Search, Plus, User, Phone, Mail, Pencil, Trash2, Loader2, Star, Gift, ArrowLeft, DollarSign, Calendar as CalendarIcon, FileDown, Eye, Briefcase, ShoppingCart } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { useBranch, getAuthHeadersWithBranch } from "../../contexts/BranchContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { canManage } from "../../utils/permissions";
import { EntityActions } from "../../components/shared/EntityActions";
import { TablePagination } from "../../components/shared/TablePagination";
import { Link, useLocation } from "react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Calendar } from "../../components/ui/calendar";
import { Checkbox } from "../../components/ui/checkbox";
import { ApiService, API_BASE } from '../../../api/ApiService';
import { DataTable, Column } from "../../components/shared/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";



type Customer = {
  id: number;
  name: string;
  businessName: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  creditLimit: number | null;
  payTerm: string | null;
  openingBalance: number | null;
  customerGroup: string | null;
  active: boolean;
  // platinum: boolean; // old field hidden/not used
  organizationId: number;
  branchId?: number | null;
  visits: number;
  totalSpent: number;
  loyaltyPoints: number;
  lastVisit: string | null;
  rating: number | null;
  totalSaleDue: number;
  totalSellReturnDue: number;
  customField1: string | null;
  customField2: string | null;
  customField3: string | null;
  customField4: string | null;
  customField5: string | null;
  customField6: string | null;
  customField7: string | null;
  customField8: string | null;
  customField9: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerStatSheetId = "total-customers" | "avg-rating" | "loyalty-points";

const EMPTY_FORM = {
  name: "",
  businessName: "",
  email: "",
  mobile: "",
  address: "",
  taxNumber: "",
  creditLimit: 0,
  payTerm: 0,
  openingBalance: 0,
  customerGroup: "",
  active: true,
  // platinum: false,
  customField1: "",
  customField2: "",
  customField3: "",
  customField4: "",
  customField5: "",
  customField6: "",
  customField7: "",
  customField8: "",
  customField9: "",
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

function formatReportDateDisplay(dateStr: string) {
  if (!dateStr) return "Select date";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function Customers() {
  const { format: formatCurrency } = useCurrency();
  const { selectedBranchId } = useBranch();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showFormSheet, setShowFormSheet] = useState(false);
  const [customerFormStep, setCustomerFormStep] = useState<1 | 2 | 3>(1);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerLimit, setCustomerLimit] = useState(10);
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);
  const [profileTab, setProfileTab] = useState<"personal" | "overview" | "history">("personal");
  const [customerStatSheet, setCustomerStatSheet] = useState<CustomerStatSheetId | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDatePickerOpen, setReportDatePickerOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportDownloading, setReportDownloading] = useState(false);
  const [lastServices, setLastServices] = useState<string[]>([]);
  const location = useLocation();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    mode: "onChange",
    defaultValues: { ...EMPTY_FORM },
  });
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [openCustomerIdFromSearch, setOpenCustomerIdFromSearch] = useState<number | null>(() => {
    const state = location.state as { openCustomerId?: number } | null;
    return typeof state?.openCustomerId === "number" ? state.openCustomerId : null;
  });

  const resetForm = () => form.reset({ ...EMPTY_FORM });

  const fetchCustomers = useCallback(async () => {
    if (selectedBranchId == null) {
      setCustomers([]);
      setCustomerTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.customers.getAll({
        page: customerPage,
        limit: customerLimit,
        search: searchQuery.trim() || undefined
      });
      setCustomers(data.data ?? []);
      setCustomerTotal(data.total ?? 0);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Please sign in with an organization account.");
      } else {
        setError(err.response?.data?.message || "Cannot connect to server. Is the backend running?");
      }
      setCustomers([]);
      setCustomerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedBranchId, customerPage]);
  const fetchCustomerHistory = useCallback(async () => {
    if (!viewingProfileId) return;
    setHistoryLoading(true);
    try {
      const params: any = { dateRange: historyDateFilter };
      if (historyDateFilter === 'custom') {
        params.startDate = historyStartDate;
        params.endDate = historyEndDate;
      }
      const data = await ApiService.customers.getHistory(viewingProfileId, params);
      if (data.success) {
        setHistory(data.data || []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customer history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [viewingProfileId, historyDateFilter, historyStartDate, historyEndDate]);

  useEffect(() => {
    if (profileTab === 'history' && viewingProfileId) {
      fetchCustomerHistory();
    }
  }, [profileTab, viewingProfileId, fetchCustomerHistory, historyDateFilter]);


  useEffect(() => {
    if (openCustomerIdFromSearch == null || selectedBranchId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ApiService.customers.getById(parseInt(openCustomerIdFromSearch, 10));
        if (!data?.success || !data.data || cancelled) return;
        const customer = data.data as Customer;
        setSelectedCustomer(customer);
        setViewingProfileId(customer.id);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setOpenCustomerIdFromSearch(null);
      }
    })();
    return () => { cancelled = true; };
  }, [openCustomerIdFromSearch, selectedBranchId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setCustomerPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!viewingProfileId || !selectedCustomer || selectedCustomer.id !== viewingProfileId || selectedBranchId == null) {
      setLastServices([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await ApiService.get(`/customers/${viewingProfileId}/last-services`);
        if (!cancelled && data.success && Array.isArray(data.data?.lastServices)) {
          setLastServices(data.data.lastServices);
        } else if (!cancelled) {
          setLastServices([]);
        }
      } catch {
        if (!cancelled) setLastServices([]);
      }
    })();
    return () => { cancelled = true; };
  }, [viewingProfileId, selectedCustomer?.id, selectedBranchId]);

  const openCreate = () => {
    setFormMode("create");
    setCustomerFormStep(1);
    resetForm();
    setShowFormSheet(true);
  };

  const openEdit = (customer: Customer) => {
    setFormMode("edit");
    setCustomerFormStep(1);
    setSelectedCustomer(customer);
    form.reset({
      name: customer.name ?? "",
      businessName: customer.businessName ?? "",
      email: customer.email ?? "",
      mobile: customer.mobile ?? customer.phone ?? "",
      address: customer.address ?? "",
      taxNumber: customer.taxNumber ?? "",
      creditLimit: customer.creditLimit ?? 0,
      payTerm: customer.payTerm ? Number(customer.payTerm) : 0,
      openingBalance: customer.openingBalance ?? 0,
      customerGroup: customer.customerGroup ?? "",
      active: customer.active ?? true,
      // platinum: customer.platinum ?? false,
      customField1: customer.customField1 ?? "",
      customField2: customer.customField2 ?? "",
      customField3: customer.customField3 ?? "",
      customField4: customer.customField4 ?? "",
      customField5: customer.customField5 ?? "",
      customField6: customer.customField6 ?? "",
      customField7: customer.customField7 ?? "",
      customField8: customer.customField8 ?? "",
      customField9: customer.customField9 ?? "",
    });
    setShowFormSheet(true);
  };

  const openProfile = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewingProfileId(customer.id);
  };

  const closeFormSheet = () => {
    form.reset({ ...EMPTY_FORM });
    setShowFormSheet(false);
    setCustomerFormStep(1);
    if (!viewingProfileId) setSelectedCustomer(null);
    setFormSubmitting(false);
  };

  const handleSubmitForm = async (values: CustomerFormValues) => {
    setFormSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        businessName: values.businessName || undefined,
        email: values.email || undefined,
        mobile: values.mobile || undefined,
        address: values.address || undefined,
        taxNumber: values.taxNumber || undefined,
        creditLimit: values.creditLimit || undefined,
        payTerm: values.payTerm ? String(values.payTerm) : undefined,
        openingBalance: values.openingBalance || undefined,
        customerGroup: values.customerGroup || undefined,
        active: values.active,
        // platinum: values.platinum,
        customField1: values.customField1 || undefined,
        customField2: values.customField2 || undefined,
        customField3: values.customField3 || undefined,
        customField4: values.customField4 || undefined,
        customField5: values.customField5 || undefined,
        customField6: values.customField6 || undefined,
        customField7: values.customField7 || undefined,
        customField8: values.customField8 || undefined,
        customField9: values.customField9 || undefined,
      };
      if (formMode === "create") {
        await ApiService.customers.create(payload);
        toast.success("Customer created");
        closeFormSheet();
        fetchCustomers();
      } else if (selectedCustomer) {
        const data = await ApiService.customers.update(selectedCustomer.id, payload);
        toast.success("Customer updated");
        closeFormSheet();
        fetchCustomers();
        if (viewingProfileId != null && selectedCustomer && data.data) {
          setSelectedCustomer(data.data as Customer);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const onNextStep = async () => {
    const fields = customerFormStep === 1
      ? ["name", "businessName", "mobile", "address", "taxNumber", "openingBalance", "active"] as const
      : [];
    const valid = fields.length === 0 || await form.trigger(fields as any);
    if (valid) setCustomerFormStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.customers.delete(deleteTarget.id);
      toast.success("Customer deleted");
      setDeleteTarget(null);
      setViewingProfileId(null);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setDeleting(false);
    }
  };

  const customerColumns: Column<Customer>[] = [
    {
      header: 'Actions',
      render: (c) => (
        <EntityActions
          onView={() => openProfile(c)}
          onEdit={() => openEdit(c)}
          onDelete={() => setDeleteTarget(c)}
        />
      )
    },
    {
      header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-secondary text-primary text-xs">
              {c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{c.name}</span>
            <span className="text-xs text-gray-500">{c.businessName || 'No shop name'}</span>
          </div>
        </div>
      )
    },
    { header: 'Mobile', accessor: 'mobile', render: (c) => c.mobile || c.phone || "—", className: 'text-gray-600' },
    { header: 'CNIC', accessor: 'taxNumber', render: (c) => c.taxNumber || "—", className: 'text-gray-600' },
    { header: 'Shop Name', accessor: 'businessName', render: (c) => c.businessName || "—", className: 'text-gray-600' },
    { header: 'Address', accessor: 'address', render: (c) => c.address || "—", className: 'text-gray-600' },
    {
      header: 'Opening Balance',
      render: (c) => (
        <span className="font-medium text-green-600">
          {formatCurrency(c.openingBalance ?? 0)}
        </span>
      )
    },
    {
      header: 'Active',
      align: 'center',
      render: (c) => (
        <Badge variant={c.active ? "default" : "outline"} className={c.active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}>
          {c.active ? "✓ Active" : "Inactive"}
        </Badge>
      )
    },
    // Hidden for now - old detailed Salon POS fields kept for later use
    // { header: 'Email', accessor: 'email', render: (c) => c.email || "—", className: 'text-gray-600' },
    // {
    //   header: 'Total Spent',
    //   render: (c) => (
    //     <span className="font-medium text-green-600">
    //       {formatCurrency(c.totalSpent ?? 0)}
    //     </span>
    //   )
    // },
    // {
    //   header: 'Loyalty Points',
    //   render: (c) => (
    //     <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
    //       {c.loyaltyPoints ?? 0} pts
    //     </Badge>
    //   ),
    //   align: 'center'
    // },
  ];

  const historyColumns: Column<any>[] = [
    {
      header: 'Date',
      render: (sale) => formatDate(sale.createdAt)
    },
    {
      header: 'Invoice No.',
      render: (sale) => sale.referenceNo || `#${sale.id}`
    },
    {
      header: 'Items Purchased',
      render: (sale) => (
        <div className="flex flex-wrap gap-1">
          {sale.SaleItems?.map((item: any) => (
            <Badge key={item.id} variant="outline" className="text-xs">
              {item.itemName} (x{item.quantity})
            </Badge>
          ))}
        </div>
      )
    },
    {
      header: 'Total Amount',
      render: (sale) => (
        <span className="font-semibold text-purple-700">
          {formatCurrency(Number(sale.total))}
        </span>
      )
    },
    {
      header: 'Status',
      align: 'center',
      render: (sale) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sale.status === "paid" ? "bg-green-100 text-green-700" : sale.status === "partial" ? "bg-amber-100 text-amber-700" : sale.status === "draft" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>
          {(sale.status || "paid").toUpperCase()}
        </span>
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Customers</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage() && (
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={openCreate}
              disabled={selectedBranchId == null}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Customer
            </Button>
          )}
        </div>
      </div>

      {viewingProfileId && selectedCustomer && selectedCustomer.id === viewingProfileId ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => setViewingProfileId(null)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </Button>
          </div>
          <div className="space-y-3">
            <Card className="overflow-hidden bg-gradient-to-br from-secondary to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar className="w-20 h-20 border-4 border-white dark:border-gray-800 shadow">
                    <AvatarFallback className="bg-secondary dark:bg-purple-900/50 text-primary dark:text-purple-300 text-2xl">
                      {selectedCustomer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                      <Badge variant="secondary">Customer</Badge>
                      {selectedCustomer.active && (
                        <Badge className="bg-amber-400 text-amber-900">Active</Badge>
                      )}
                    </div>
                    {selectedCustomer.businessName && (
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedCustomer.businessName}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Added {formatDate(selectedCustomer.createdAt)}
                    </p>
                    {selectedCustomer.rating != null && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{selectedCustomer.rating} Rating</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      {(selectedCustomer.mobile || selectedCustomer.phone) && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {selectedCustomer.mobile || selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {selectedCustomer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={profileTab} onValueChange={(v) => setProfileTab(v as "personal" | "overview" | "history")} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>

              </TabsList>
              <TabsContent value="personal" className="mt-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Customer Information</CardTitle>
                    {canManage() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={() => openEdit(selectedCustomer)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="text-sm text-foreground">{selectedCustomer.name || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                        <p className="text-sm text-foreground">{selectedCustomer.mobile || selectedCustomer.phone || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">CNIC</p>
                        <p className="text-sm text-foreground">{selectedCustomer.taxNumber || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Shop Name</p>
                        <p className="text-sm text-foreground">{selectedCustomer.businessName || "—"}</p>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p className="text-sm text-foreground">{selectedCustomer.address || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Opening Balance</p>
                        <p className="text-sm text-foreground">
                          {selectedCustomer.openingBalance != null ? formatCurrency(selectedCustomer.openingBalance) : "—"}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Active</p>
                        <p className="text-sm text-foreground">{selectedCustomer.active ? "Yes" : "No"}</p>
                      </div>
                    </div>

                    {/* Hidden for now - old detailed Salon POS profile fields kept by commenting */}
                    {/*
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-sm text-foreground">{selectedCustomer.email || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Customer Group</p>
                        <p className="text-sm text-foreground">{selectedCustomer.customerGroup || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Pay Term</p>
                        <p className="text-sm text-foreground">{selectedCustomer.payTerm || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Credit Limit</p>
                        <p className="text-sm text-foreground">
                          {selectedCustomer.creditLimit != null ? formatCurrency(selectedCustomer.creditLimit) : "—"}
                        </p>
                      </div>
                    </div>
                    */}
                    {/* Hidden for now - service usage is not part of the requested basic customer fields */}
                    {/*
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Services used</p>
                      {lastServices.length > 0 ? (
                        <ul className="text-sm text-foreground list-disc list-inside space-y-0.5">
                          {lastServices.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No services recorded yet.</p>
                      )}
                    </div>

                    */}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="overview" className="mt-3">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Visits</p>
                      <p className="text-xl font-bold text-primary">{selectedCustomer.visits ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(Number(selectedCustomer.totalSpent ?? 0))}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Loyalty Points</p>
                      <p className="text-xl font-bold text-blue-600">{selectedCustomer.loyaltyPoints ?? 0} pts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Last Visit</p>
                      <p className="text-xl font-bold">{formatDate(selectedCustomer.lastVisit)}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <div className="space-y-4">
                  {/* Controls Card */}
                  <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                      <CardTitle className="text-base font-semibold">Purchase & Service History</CardTitle>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Select
                          value={historyDateFilter}
                          onValueChange={(v: any) => setHistoryDateFilter(v)}
                        >
                          <SelectTrigger className="w-[150px] h-9">
                            <SelectValue placeholder="Select Date Range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            {/* <SelectItem value="custom">Custom Range</SelectItem> */}
                          </SelectContent>
                        </Select>

                        {historyDateFilter === 'custom' && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              className="h-9 w-[130px] text-xs"
                              value={historyStartDate}
                              onChange={(e) => setHistoryStartDate(e.target.value)}
                            />
                            <span className="text-xs text-muted-foreground text-center">to</span>
                            <Input
                              type="date"
                              className="h-9 w-[130px] text-xs"
                              value={historyEndDate}
                              onChange={(e) => setHistoryEndDate(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-9 text-xs"
                              onClick={fetchCustomerHistory}
                            >
                              Go
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border shadow-sm bg-white dark:bg-gray-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Visits / Purchases</p>
                          <p className="text-lg font-bold">{history.length}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm bg-white dark:bg-gray-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Spent (in Period)</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(history.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0))}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm bg-white dark:bg-gray-800">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Items Purchased</p>
                          <p className="text-lg font-bold text-purple-600">
                            {history.reduce((sum, sale) => sum + (sale.SaleItems?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Table of logs */}
                  <DataTable
                    columns={historyColumns}
                    data={history}
                    loading={historyLoading}
                    emptyMessage="No purchase history found for this period."
                  />
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </>
      ) : (
        <>
          <Sheet open={customerStatSheet != null} onOpenChange={(open) => !open && setCustomerStatSheet(null)}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col overflow-hidden p-0 gap-0">
              <SheetHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b px-6 py-5 pr-12 shrink-0">
                <div className="space-y-1.5">
                  <SheetTitle className="text-xl">
                    {customerStatSheet === "total-customers" && "Total Customers"}
                    {customerStatSheet === "avg-rating" && "Average Rating"}
                    {customerStatSheet === "loyalty-points" && "Highest Loyalty Points"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {customerStatSheet === "total-customers" && "Registered in this branch"}
                    {customerStatSheet === "avg-rating" && "From current page"}
                    {customerStatSheet === "loyalty-points" && "Among loaded customers"}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link to="/customers">View all customers</Link>
                </Button>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {customerStatSheet === "total-customers" && (
                  <Card className="overflow-hidden shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 bg-secondary dark:border-purple-800 dark:bg-purple-950/40">
                          <User className="w-5 h-5 text-primary dark:text-purple-400" />
                        </span>
                        Total Customers - this branch
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">Total number of customers registered for the selected branch.</p>
                      <div className="px-4 py-3 bg-secondary dark:bg-purple-950/20 border rounded-b-lg font-semibold text-tertiary dark:text-purple-200">
                        Total: {customerTotal} customer(s)
                      </div>
                    </CardContent>
                  </Card>
                )}
                {customerStatSheet === "avg-rating" && (
                  <Card className="overflow-hidden shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                          <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </span>
                        Average Rating - current page
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">Average of customer ratings (from the current page of results).</p>
                      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border rounded-b-lg font-semibold text-amber-800 dark:text-amber-200">
                        {(() => {
                          const withRating = customers.filter((c) => c.rating != null);
                          if (withRating.length === 0) return "No ratings on this page.";
                          const avg = withRating.reduce((s, c) => s + (c.rating ?? 0), 0) / withRating.length;
                          return `Average: ${avg.toFixed(1)} (from ${withRating.length} customer(s) with a rating)`;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {customerStatSheet === "loyalty-points" && (
                  <Card className="overflow-hidden shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40">
                          <Gift className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </span>
                        Highest Loyalty Points - current page
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">Highest loyalty points among the customers on the current page.</p>
                      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border rounded-b-lg font-semibold text-blue-800 dark:text-blue-200">
                        {customers.length === 0
                          ? "No customers loaded."
                          : `Max: ${Math.max(...customers.map((c) => c.loyaltyPoints ?? 0), 0)} points (among ${customers.length} customer(s) on this page)`}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <DataTable
            title="All Customers"
            icon={User}
            columns={customerColumns}
            data={customers}
            loading={loading}
            error={error}
            exportable
            exportFileName="customers"
            onRowClick={openProfile}
            pagination={{
              total: customerTotal,
              page: customerPage,
              limit: customerLimit,
              onPageChange: setCustomerPage,
              onLimitChange: setCustomerLimit,
              itemLabel: "customers"
            }}
            filters={
              <div className="flex gap-3 items-center flex-wrap">
                <Select value={String(customerLimit)} onValueChange={(v) => { setCustomerLimit(Number(v)); setCustomerPage(1); }}>
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
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, mobile, CNIC, shop..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                  />
                </div>
                
                {/* <Popover open={reportOpen} onOpenChange={setReportOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-2 h-9"
                      disabled={selectedBranchId == null}
                    >
                      <FileDown className="w-4 h-4" />
                      Report
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4" align="end">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Download customer data (Excel)</p>
                      <div className="space-y-2">
                        <Label className="text-xs">Date *</Label>
                        <Popover open={reportDatePickerOpen} onOpenChange={setReportDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                            >
                              <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                              {formatReportDateDisplay(reportDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={reportDate ? new Date(reportDate + "T12:00:00") : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, "0");
                                  const d = String(date.getDate()).padStart(2, "0");
                                  setReportDate(`${y}-${m}-${d}`);
                                  setReportDatePickerOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Period</Label>
                        <Select value={reportPeriod} onValueChange={(v) => setReportPeriod(v as typeof reportPeriod)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="w-full gap-2"
                        disabled={reportDownloading || selectedBranchId == null}
                        onClick={async () => {
                          if (selectedBranchId == null) return;
                          setReportDownloading(true);
                          try {
                            const params = new URLSearchParams({ period: reportPeriod, date: reportDate });
                            const data = await ApiService.get(`/customers/report?${params.toString()}`);
                            if (!data?.success) {
                              toast.error(data.message || "Failed to generate report");
                              return;
                            }
                            const rows = data.data || [];
                            const headers = ["Date", "Name", "Number", "Email", "Last Services Used"];
                            const escape = (s: string) => {
                              const t = String(s ?? "");
                              return t.includes(",") || t.includes('"') || t.includes("\n") ? `"${t.replace(/"/g, '""')}"` : t;
                            };
                            const csv = [headers.join(","), ...rows.map((r: { date: string; name: string; number: string; email: string; lastServicesUsed: string }) =>
                              [r.date, r.name, r.number, r.email, r.lastServicesUsed].map(escape).join(",")
                            )].join("\n");
                            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `customer-report-${reportDate}-${reportPeriod}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                            setReportOpen(false);
                            toast.success("Report downloaded");
                          } catch {
                            toast.error("Failed to download report");
                          } finally {
                            setReportDownloading(false);
                          }
                        }}
                      >
                        {reportDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Download Excel
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover> */}
              </div>
            }
          />

        </>
      )}

      {/* Create / Edit Customer Sheet */}
      <Sheet open={showFormSheet} onOpenChange={(open) => !open && closeFormSheet()}>
        <SheetContent side="right" className="w-full flex flex-col overflow-hidden p-0 gap-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle>{formMode === "edit" ? "Edit Customer" : "Add Customer"}</SheetTitle>
            <div className="space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Basic customer details for poultry farm services.
              </p>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6" id="customer-form">
                {/* Visible poultry customer fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Customer name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="03XX XXXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNIC</FormLabel>
                          <FormControl>
                            <Input placeholder="xxxxx-xxxxxxx-x" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Shop name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Customer address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="openingBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Balance</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step={0.01} placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-8">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer">Active</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Hidden for now - old detailed Salon POS customer fields kept by commenting */}
                {/*
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customerGroup" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Group</FormLabel>
                    <FormControl><Input placeholder="e.g. VIP, Regular" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="creditLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl><Input type="number" min={0} step={0.01} placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="payTerm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Term</FormLabel>
                    <FormControl><Input type="number" min={0} placeholder="e.g. 30" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                  <FormField key={n} control={form.control} name={`customField${n}` as keyof CustomerFormValues} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Field {n}</FormLabel>
                      <FormControl><Input placeholder={`Custom field ${n}`} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
                */}
              </form>
            </Form>
          </div>

          <SheetFooter className="shrink-0 flex flex-row gap-3 justify-end px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={closeFormSheet} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="customer-form" disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {formMode === "create" ? "Add Customer" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}