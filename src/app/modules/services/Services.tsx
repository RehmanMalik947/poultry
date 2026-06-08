import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormValues, packageSchema, type PackageFormValues, categorySchema, type CategoryFormValues } from "../../utils/validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Checkbox } from "../../components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "../../components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { Plus, Scissors, Tag, Search, Loader2, ChevronDown, X, Users, Package, Eye ,CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ApiService } from "../../../api/ApiService";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useBranch } from "../../contexts/BranchContext";

// ─── Types ───────────────────────────────────────────────────────────────────
type ServiceRecord = {
  id: number;
  serviceName: string;
  categoryName: string | null;
  categoryId: number | null;
  serviceCode: string | null;
  price: number | null;
  createdAt: string;
  staffs?: { id: number; firstName: string; lastName?: string | null }[];
  duration:number | null;
   description: string | null;
  status: 'active' | 'inactive';
  totalCost?: number;
  items?: any[];
};


type CategoryRecord = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
};

type PackageRecord = {
  id: number;
  packageName: string;
  packageCode: string | null;
  price: number;
  discountType: 'fixed' | 'percentage' | null;
  discount: number;
  status: 'active' | 'inactive';
  description: string | null;
  duration: number | null; // Added duration type
  services: {
    serviceId: number;
    serviceName: string;
    price: number;
    quantity: number;
  }[];
  totalServicesPrice?: number;
  createdAt: string;
};

type StaffOption = { id: number; firstName: string; lastName?: string | null };

// ─── Main Component ───────────────────────────────────────────────────────────
export function Services() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("services");

  // Reset pages when branch changes
  useEffect(() => {
    setServicePage(1);
    setCatPage(1);
    setPkgPage(1);
  }, [selectedBranchId]);

  // ── Service list state ──
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicePage, setServicePage] = useState(1);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [serviceLimit, setServiceLimit] = useState(10);

  // ── Service form state ──
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [svcStep, setSvcStep] = useState<1 | 2 | 3>(1);
  const [editService, setEditService] = useState<ServiceRecord | null>(null);
  const svcForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { serviceName: "", price: 0, duration: 0, categoryId: undefined, description: "", status: "active", branchId: undefined },
  });
  const [svcCode, setSvcCode] = useState("");
  const [svcStaffIds, setSvcStaffIds] = useState<number[]>([]);
  const [svcDiscount, setSvcDiscount] = useState("");
  const [svcDiscountType, setSvcDiscountType] = useState("fixed");
  const [svcItems, setSvcItems] = useState<{ productId: string; qty: string }[]>([]);
  const [svcSaving, setSvcSaving] = useState(false);
  const [deleteService, setDeleteService] = useState<ServiceRecord | null>(null);
  const [serviceDeleting, setServiceDeleting] = useState(false);
  const [productOptions, setProductOptions] = useState<{ id: number; name: string }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [viewService, setViewService] = useState<ServiceRecord | null>(null);

  // ── Package list state ──
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgPage, setPkgPage] = useState(1);
  const [pkgTotal, setPkgTotal] = useState(0);
  const [pkgLimit, setPkgLimit] = useState(10);

  // ── Package form state ──
  const [pkgFormOpen, setPkgFormOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<PackageRecord | null>(null);
  const pkgForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: { packageName: "", packageCode: "", price: 0, discountType: undefined, discount: 0, status: "active", description: "", duration: 0, services: [] },
  });
  const [pkgBasePrice, setPkgBasePrice] = useState("");
  const [pkgServices, setPkgServices] = useState<{ serviceId: string; qty: string }[]>([]);
  const [pkgSaving, setPkgSaving] = useState(false);
  const [deletePackage, setDeletePackage] = useState<PackageRecord | null>(null);
  const [pkgDeleting, setPkgDeleting] = useState(false);
  const [viewPackage, setViewPackage] = useState<PackageRecord | null>(null);
  const [serviceOptions, setServiceOptions] = useState<{ id: number; serviceName: string; price: number; duration?: number | null }[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");

  // ── Calculate base price as sum of constituent services ──
  useEffect(() => {
    if (!pkgFormOpen) return;
    const sum = pkgServices.reduce((acc, item) => {
      const s = serviceOptions.find(opt => String(opt.id) === String(item.serviceId));
      return acc + (s ? s.price * (parseFloat(item.qty) || 0) : 0);
    }, 0);
    setPkgBasePrice(String(sum));
  }, [pkgServices, serviceOptions, pkgFormOpen]);

  // ── Calculate package duration as sum of constituent service durations ──
  useEffect(() => {
    if (!pkgFormOpen) return;
    const totalDuration = pkgServices.reduce((acc, item) => {
      const s = serviceOptions.find(opt => String(opt.id) === String(item.serviceId));
      return acc + (s && s.duration ? s.duration * (parseInt(item.qty, 10) || 0) : 0);
    }, 0);
    pkgForm.setValue("duration", totalDuration);
  }, [pkgServices, serviceOptions, pkgFormOpen]);

  const pkgDiscountVal = pkgForm.watch("discount") ?? 0;
  const pkgDiscountTypeVal = pkgForm.watch("discountType");

  // ── Calculate final package price based on base price & discount ──
  useEffect(() => {
    if (!pkgFormOpen) return;
    const base = parseFloat(pkgBasePrice) || 0;
    const disc = Number(pkgDiscountVal) || 0;
    if (pkgDiscountTypeVal === "fixed") {
      pkgForm.setValue("price", Math.max(0, base - disc));
    } else if (pkgDiscountTypeVal === "percentage") {
      pkgForm.setValue("price", Math.max(0, base - (base * disc) / 100));
    } else {
      pkgForm.setValue("price", base);
    }
  }, [pkgBasePrice, pkgDiscountVal, pkgDiscountTypeVal, pkgFormOpen]);

  // ── Category list state ──
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catSearch, setCatSearch] = useState("");
  const [catPage, setCatPage] = useState(1);
  const [catTotal, setCatTotal] = useState(0);
  const [catLimit, setCatLimit] = useState(10);

  // ── Category form state ──
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryRecord | null>(null);
  const catForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", code: "", description: "", categoryType: "service" },
  });
  const [catSaving, setCatSaving] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<CategoryRecord | null>(null);
  const [catDeleting, setCatDeleting] = useState(false);

  // ── Shared options ──
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [catOptions, setCatOptions] = useState<CategoryRecord[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");

  // ─── Fetch Services ───────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    setServiceLoading(true);
    try {
      const res = await ApiService.services.getAll({
        page: servicePage,
        limit: serviceLimit,
        search: serviceSearch || undefined,
        branchId: selectedBranchId || undefined,
      });
      setServices(res.data || []);
      setServiceTotal(res.total ?? (res.data || []).length);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setServiceLoading(false);
    }
  }, [servicePage, serviceSearch, selectedBranchId]);

  // ─── Fetch Service Categories ─────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await ApiService.categories.getAll({ 
        type: "service",
        branchId: selectedBranchId || undefined,
      });
      const data: CategoryRecord[] = Array.isArray(res) ? res : res.data ?? [];
      const filtered = data.filter((c) =>
        c.name.toLowerCase().includes(catSearch.toLowerCase())
      );
      setCatTotal(filtered.length);
      setCategories(filtered.slice((catPage - 1) * catLimit, catPage * catLimit));
      setCatOptions(data); 
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setCatLoading(false);
    }
  }, [catPage, catSearch, selectedBranchId]);

  useEffect(() => { fetchServices(); }, [fetchServices]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ─── Fetch Packages ───────────────────────────────────────────────────────
  const fetchPackages = useCallback(async () => {
    setPkgLoading(true);
    try {
      const res = await ApiService.packages.getAll({
        branchId: selectedBranchId || undefined,
      });
      const data: PackageRecord[] = res.data || [];
      const filtered = data.filter((p) =>
        p.packageName.toLowerCase().includes(pkgSearch.toLowerCase())
      );
      setPkgTotal(filtered.length);
      setPackages(filtered.slice((pkgPage - 1) * pkgLimit, pkgPage * pkgLimit));
    } catch {
      toast.error("Failed to load packages");
    } finally {
      setPkgLoading(false);
    }
  }, [pkgPage, pkgSearch, selectedBranchId]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const fetchNextServiceCode = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const res = await ApiService.services.getNextCode(selectedBranchId);
      if (res.success && res.data?.serviceCode) {
        setSvcCode(res.data.serviceCode);
      }
    } catch (err) {
      console.error("Failed to fetch next service code", err);
    }
  }, [selectedBranchId]);

  // ─── Open Service Form ────────────────────────────────────────────────────
  const openServiceForm = async (svc: ServiceRecord | null = null) => {
    setEditService(svc);
    setSvcStep(1);
    svcForm.reset({
      serviceName: svc?.serviceName ?? "",
      price: svc?.price ?? 0,
      duration: svc?.duration ?? 0,
      categoryId: svc?.categoryId ?? undefined,
      description: svc?.description ?? "",
      status: svc?.status ?? "active",
      branchId: undefined,
    });
    setSvcCode(svc?.serviceCode ?? "");
    setSvcStaffIds(svc?.staffs?.map((s) => s.id) ?? []);
    setSvcDiscount((svc as any)?.discount ? String((svc as any).discount) : "");
    setSvcDiscountType((svc as any)?.discountType ?? "fixed");
    setSvcItems((svc as any)?.items?.map((i: any) => ({ productId: String(i.productId), qty: String(i.quantity) })) ?? []);
    setProductSearch("");
    setServiceFormOpen(true);

    if (!svc && selectedBranchId) {
      fetchNextServiceCode();
    }

    setOptionsLoading(true);
    try {
      const [staffRes, prodRes] = await Promise.all([
        ApiService.staff.getAll({ limit: 200 }),
        ApiService.products.getAll({ limit: 200 }),
      ]);
      setStaffOptions(staffRes.data || []);
      setProductOptions((prodRes.data || []).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {
      toast.error("Failed to load options");
    } finally {
      setOptionsLoading(false);
    }
  };

  // ─── Step Navigation ──────────────────────────────────────────────────────
  const handleNextStep = async () => {
    if (svcStep === 1) {
      const valid = await svcForm.trigger("serviceName");
      if (!valid) return;
    }
    setSvcStep((s) => (s + 1) as 1 | 2 | 3);
  };

  // ─── Save Service ─────────────────────────────────────────────────────────
  const handleSaveService = async (values: ServiceFormValues) => {
    setSvcSaving(true);
    try {
      const validItems = svcItems
        .filter((i) => i.productId && i.qty && parseFloat(i.qty) > 0)
        .map((i) => ({ productId: parseInt(i.productId), quantity: parseFloat(i.qty) }));

      const payload = {
        serviceName: values.serviceName.trim(),
        price: values.price || null,
        duration: values.duration || null,
        status: values.status,
        description: values.description?.trim() || null,
        serviceCode: svcCode.trim() || null,
        categoryId: values.categoryId || null,
        staffIds: svcStaffIds,
        items: validItems,
        discount: svcDiscount ? parseFloat(svcDiscount) : 0,
        discountType: svcDiscountType,
        date: new Date().toISOString().slice(0, 10),
      };
      if (editService) {
        await ApiService.services.update(editService.id, payload);
        toast.success("Service updated");
      } else {
        await ApiService.services.create(payload);
        toast.success("Service created");
      }
      setServiceFormOpen(false);
      fetchServices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save service");
    } finally {
      setSvcSaving(false);
    }
  };

  // ─── Delete Service ───────────────────────────────────────────────────────
  const handleDeleteService = async () => {
    if (!deleteService) return;
    setServiceDeleting(true);
    try {
      await ApiService.services.delete(deleteService.id);
      toast.success("Service deleted");
      setDeleteService(null);
      fetchServices();
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setServiceDeleting(false);
    }
  };

  // ─── Open Package Form ────────────────────────────────────────────────────
  const openPackageForm = async (pkg: PackageRecord | null = null) => {
    let activeServices = [];
    try {
      const res = await ApiService.services.getAll({ limit: 1000, status: "active" });
      activeServices = res.data || [];
      setServiceOptions(activeServices);
    } catch {
      toast.error("Failed to load service options");
    }

    setEditPackage(pkg);
    pkgForm.reset({
      packageName: pkg?.packageName ?? "",
      packageCode: pkg?.packageCode ?? "",
      price: pkg?.price ?? 0,
      discountType: pkg?.discountType ?? undefined,
      discount: pkg?.discount ?? 0,
      status: pkg?.status ?? "active",
      description: pkg?.description ?? "",
      duration: pkg?.duration ?? 0,
      services: [],
    });
    
    const mappedServices = pkg?.services?.map((s) => ({
      serviceId: String(s.serviceId),
      qty: String(s.quantity),
    })) ?? [];
    setPkgServices(mappedServices);

    const initialSum = mappedServices.reduce((sum, item) => {
      const s = activeServices.find((opt: any) => String(opt.id) === String(item.serviceId));
      return sum + (s ? s.price * (parseFloat(item.qty) || 0) : 0);
    }, 0);
    setPkgBasePrice(pkg?.totalServicesPrice != null ? String(pkg.totalServicesPrice) : String(initialSum));

    setServiceSearchQuery("");
    setPkgFormOpen(true);
  };

  // ─── Save Package ─────────────────────────────────────────────────────────
  const handleSavePackage = async (values: PackageFormValues) => {
    const validServices = pkgServices
      .filter((s) => s.serviceId && s.qty && parseInt(s.qty) > 0)
      .map((s) => ({
        serviceId: parseInt(s.serviceId),
        quantity: parseInt(s.qty),
      }));

    if (validServices.length === 0) {
      toast.error("At least one service is required in a package");
      return;
    }

    setPkgSaving(true);
    try {
      const payload = {
        packageName: values.packageName.trim(),
        packageCode: values.packageCode?.trim() || null,
        price: values.price || 0,
        discountType: values.discountType || null,
        discount: values.discount || 0,
        status: values.status,
        description: values.description?.trim() || null,
        services: validServices,
        duration: values.duration || null,
      };

      if (editPackage) {
        await ApiService.packages.update(editPackage.id, payload);
        toast.success("Package updated");
      } else {
        await ApiService.packages.create(payload);
        toast.success("Package created");
      }
      setPkgFormOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save package");
    } finally {
      setPkgSaving(false);
    }
  };

  // ─── Delete Package ───────────────────────────────────────────────────────
  const handleDeletePackage = async () => {
    if (!deletePackage) return;
    setPkgDeleting(true);
    try {
      await ApiService.packages.delete(deletePackage.id);
      toast.success("Package deleted");
      setDeletePackage(null);
      fetchPackages();
    } catch {
      toast.error("Failed to delete package");
    } finally {
      setPkgDeleting(false);
    }
  };

  // ─── Open Category Form ───────────────────────────────────────────────────
  const openCategoryForm = (cat: CategoryRecord | null = null) => {
    setEditCategory(cat);
    catForm.reset({ name: cat?.name ?? "", code: cat?.code ?? "", description: cat?.description ?? "", categoryType: "service" });
    setCatFormOpen(true);
  };

  // ─── Save Category ────────────────────────────────────────────────────────
  const handleSaveCategory = async (values: CategoryFormValues) => {
    setCatSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim() || null,
        description: values.description.trim() || null,
        categoryType: "service",
      };
      if (editCategory) {
        await ApiService.categories.update(editCategory.id, payload);
        toast.success("Category updated");
      } else {
        await ApiService.categories.create(payload);
        toast.success("Category created");
      }
      setCatFormOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save category");
    } finally {
      setCatSaving(false);
    }
  };

  // ─── Delete Category ──────────────────────────────────────────────────────
  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    setCatDeleting(true);
    try {
      await ApiService.categories.delete(deleteCategory.id);
      toast.success("Category deleted");
      setDeleteCategory(null);
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setCatDeleting(false);
    }
  };

  // ─── Table Columns ────────────────────────────────────────────────────────
  const serviceColumns: Column<ServiceRecord>[] = [
    {
      header: "Actions",
      align: "left",
      render: (row) => (
        <EntityActions
          onView={() => setViewService(row)}
          onEdit={() => openServiceForm(row)}
          onDelete={() => setDeleteService(row)}
        />
      ),
    },
    { header: "SKU", accessor: "serviceCode", className: "text-gray-500 font-mono text-xs" },
    { header: "Service Name", accessor: "serviceName", className: "font-medium" },
    { header: "Category", render: (row) => row.categoryName ?? "—" },
    { header: "Price", render: (row) => formatCurrency(row.price) },
    {
      header: "Staff Assigned",
      render: (row) =>
        row.staffs && row.staffs.length > 0
          ? row.staffs.map((s) => s.firstName).join(", ")
          : <span className="text-gray-400 text-xs">Any Staff</span>,
    },
  ];

  const categoryColumns: Column<CategoryRecord>[] = [
    {
      header: "Actions",
      align: "left",
      render: (row) => (
        <EntityActions
          onEdit={() => openCategoryForm(row)}
          onDelete={() => setDeleteCategory(row)}
        />
      ),
    },
    { header: "#", render: (_, idx) => (catPage - 1) * catLimit + idx + 1 },
    { header: "Category Name", accessor: "name", className: "font-medium" },
    { header: "Code", render: (row) => row.code ?? "—", className: "text-gray-500" },
    { header: "Description", render: (row) => row.description ?? "—", className: "text-gray-500" },
  ];

  const packageColumns: Column<PackageRecord>[] = [
    {
      header: "Actions",
      align: "left",
      render: (row) => (
        <EntityActions
          onView={() => setViewPackage(row)}
          onEdit={() => openPackageForm(row)}
          onDelete={() => setDeletePackage(row)}
        />
      ),
    },
    { header: "SKU", accessor: "packageCode", className: "text-gray-500 font-mono text-xs" },
    { header: "Package Name", accessor: "packageName", className: "font-medium" },
    {
      header: "Constituent Services",
      render: (row) =>
        row.services && row.services.length > 0
          ? row.services.map((s) => `${s.serviceName} (x${s.quantity})`).join(", ")
          : "—",
    },
    { header: "Duration", render: (row) => row.duration ? `${row.duration} mins` : "—" }, // Added duration column
    { header: "Price", render: (row) => formatCurrency(row.price) },
    {
      header: "Discount",
      render: (row) =>
        row.discount > 0
          ? `${row.discount} ${row.discountType === "percentage" ? "%" : "Rs."}`
          : "—",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-3 space-y-3 w-full">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-primary">Services Management</h1>

      {/* Tabs + Add Button on same row */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-white border p-1 h-12">
            <TabsTrigger
              value="services"
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
            >
              <Scissors className="w-4 h-4" /> Services
            </TabsTrigger>
            <TabsTrigger
              value="packages"
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
            >
              <Package className="w-4 h-4" /> Packages
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
            >
              <Tag className="w-4 h-4" /> Categories
            </TabsTrigger>
          </TabsList>

          {activeTab === "services" ? (
            <Button onClick={() => openServiceForm()} className="h-10">
              <Plus className="w-4 h-4 mr-2" /> Add Service
            </Button>
          ) : activeTab === "packages" ? (
            <Button onClick={() => openPackageForm()} className="h-10">
              <Plus className="w-4 h-4 mr-2" /> Add Package
            </Button>
          ) : (
            <Button onClick={() => openCategoryForm()} className="h-10">
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          )}
        </div>

        {/* ── Services Tab ── */}
        <TabsContent value="services" className="mt-3">
          <DataTable
            title="All Services"
            icon={Scissors}
            columns={serviceColumns}
            data={services}
            loading={serviceLoading}
            exportable
            exportFileName="services"
            pagination={{
              total: serviceTotal,
              page: servicePage,
              limit: serviceLimit,
              onPageChange: setServicePage,
              onLimitChange: setServiceLimit,
              itemLabel: "services",
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => { setServiceSearch(e.target.value); setServicePage(1); }}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(serviceLimit)} onValueChange={(v) => { setServiceLimit(Number(v)); setServicePage(1); }}>
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
              </div>
            }
          />
        </TabsContent>

        {/* ── Packages Tab ── */}
        <TabsContent value="packages" className="mt-3">
          <DataTable
            title="All Packages"
            icon={Package}
            columns={packageColumns}
            data={packages}
            loading={pkgLoading}
            exportable
            exportFileName="packages"
            pagination={{
              total: pkgTotal,
              page: pkgPage,
              limit: pkgLimit,
              onPageChange: setPkgPage,
              onLimitChange: setPkgLimit,
              itemLabel: "packages",
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search packages..."
                    value={pkgSearch}
                    onChange={(e) => { setPkgSearch(e.target.value); setPkgPage(1); }}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pkgLimit)} onValueChange={(v) => { setPkgLimit(Number(v)); setPkgPage(1); }}>
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
              </div>
            }
          />
        </TabsContent>

        {/* ── Categories Tab ── */}
        <TabsContent value="categories" className="mt-3">
          <DataTable
            title="Service Categories"
            icon={Tag}
            columns={categoryColumns}
            data={categories}
            loading={catLoading}
            exportable
            exportFileName="service-categories"
            pagination={{
              total: catTotal,
              page: catPage,
              limit: catLimit,
              onPageChange: setCatPage,
              onLimitChange: setCatLimit,
              itemLabel: "categories",
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search categories..."
                    value={catSearch}
                    onChange={(e) => { setCatSearch(e.target.value); setCatPage(1); }}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(catLimit)} onValueChange={(v) => { setCatLimit(Number(v)); setCatPage(1); }}>
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
              </div>
            }
          />
        </TabsContent>
      </Tabs>

      {/* ── View Service Details Sheet ── */}
      <Sheet open={!!viewService} onOpenChange={(open) => !open && setViewService(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-5 w-5 text-primary" />
              Service Details
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{viewService?.serviceName}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${viewService?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {viewService?.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">SKU</p>
                  <p className="text-sm font-medium">{viewService?.serviceCode || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Price</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(viewService?.price)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duration</p>
                  <p className="text-sm font-medium">{viewService?.duration || 0} min</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category</p>
                  <p className="text-sm font-medium">{viewService?.categoryName || "No Category"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Discount</p>
                  <p className="text-sm font-medium">
                    {(viewService as any)?.discount || 0} {(viewService as any)?.discountType === 'percentage' ? '%' : 'Rs.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Staff Assigned Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-tight">
                <Users className="w-4 h-4 text-primary" />
                Staff Assigned
              </div>
              <div className="flex flex-wrap gap-2">
                {viewService?.staffs && viewService.staffs.length > 0 ? (
                  viewService.staffs.map((s) => (
                    <span key={s.id} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium border border-primary/10">
                      {s.firstName} {s.lastName || ""}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No specific staff assigned (available for everyone)</p>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Required Products Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-tight">
                <Package className="w-4 h-4 text-primary" />
                Required Products
              </div>
              <div className="rounded-lg border overflow-hidden">
                {(viewService as any)?.items && (viewService as any).items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Product</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Cost</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(viewService as any).items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-700">{item.itemName || item.productName || `Product #${item.productId}`}</td>
                          <td className="px-3 py-2 text-center font-medium text-gray-900">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(item.unitCost)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/50 font-bold border-t">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-gray-600">Product Subtotal</td>
                        <td className="px-3 py-2 text-right text-amber-600">{formatCurrency(viewService?.totalCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-400">No products associated with this service</div>
                )}
              </div>
            </div>

            {viewService?.description && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="space-y-2">
                  <div className="text-sm font-bold text-gray-900 uppercase tracking-tight">Description</div>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border">
                    {viewService.description}
                  </p>
                </div>
              </>
            )}

            <div className="h-px bg-gray-100" />

            {/* Financial Overview */}
            <div className="space-y-3">
              <div className="text-sm font-bold text-gray-900 uppercase tracking-tight">Financial Overview</div>
              <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Service Price (Revenue)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(viewService?.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Product Consumption Cost</span>
                  <span className="font-semibold text-amber-600">
                    {viewService?.totalCost != null ? formatCurrency(viewService.totalCost) : formatCurrency(0)}
                  </span>
                </div>
                <div className="h-px bg-primary/10 my-1" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-gray-900">Total Value</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">
                      {formatCurrency((viewService?.price || 0) + (viewService?.totalCost || 0))}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Gross Service Valuation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button variant="outline" className="w-full" onClick={() => setViewService(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>


      {/* ── Add / Edit Service Sheet ── */}
      <Sheet open={serviceFormOpen} onOpenChange={(open) => { setServiceFormOpen(open); if (!open) setSvcStep(1); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">

          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Scissors className="h-5 w-5 text-primary" />
              {editService ? "Edit Service" : "Add Service"}
            </SheetTitle>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">Step {svcStep} of 2</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { step: 1, icon: Scissors, label: "Basic Info & Staff" },
                  { step: 2, icon: Tag,      label: "Products" },
                ].map(({ step, icon: Icon, label }) => (
                  <div key={step} className={`flex flex-col items-center gap-1 ${svcStep >= step ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${svcStep === step ? "bg-primary text-primary-foreground" : "border border-muted-foreground/40 bg-muted/30"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </SheetHeader>
          <Form {...svcForm}>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {svcStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={svcForm.control}
                    name="serviceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Hair Cut" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1.5">
                    <Label>SKU / Code</Label>
                    <Input
                      placeholder="e.g. MB-SVR-001"
                      value={svcCode}
                      onChange={(e) => setSvcCode(e.target.value)}
                    />
                    {!editService && selectedBranchId && (
                      <p className="text-xs text-muted-foreground">
                        Auto-generated from branch (e.g. Main Branch → MB-SVR-001)
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={svcForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={svcForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (min)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 30" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                    <Label>Discount Type</Label>
                    <Select value={svcDiscountType} onValueChange={setSvcDiscountType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Discount</Label>
                    <Input type="number" placeholder="0" value={svcDiscount} onChange={(e) => setSvcDiscount(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={svcForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value ? String(field.value) : "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {catOptions.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={svcForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Assign Staff</Label>
                  {optionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading staff...
                    </div>
                  ) : (
                    <Popover open={staffDropdownOpen} onOpenChange={setStaffDropdownOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className="w-full flex items-center justify-between gap-2 rounded-md border-2 border-gray-300 bg-background px-3 py-2 text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary">
                          <div className="flex flex-wrap gap-1 flex-1">
                            {svcStaffIds.length === 0 ? (
                              <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Select staff members...</span>
                            ) : (
                              svcStaffIds.map((id) => {
                                const s = staffOptions.find((o) => o.id === id);
                                return s ? (
                                  <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                                    {s.firstName} {s.lastName || ""}
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSvcStaffIds((prev) => prev.filter((x) => x !== id)); }} className="hover:text-red-500 ml-0.5">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ) : null;
                              })
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${staffDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input placeholder="Search staff..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto p-1">
                          {staffOptions.filter((s) => `${s.firstName} ${s.lastName || ""}`.toLowerCase().includes(staffSearch.toLowerCase())).map((staff) => (
                            <button key={staff.id} type="button"
                              onClick={() => setSvcStaffIds((prev) => prev.includes(staff.id) ? prev.filter((id) => id !== staff.id) : [...prev, staff.id])}
                              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${svcStaffIds.includes(staff.id) ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
                            >
                              <Checkbox checked={svcStaffIds.includes(staff.id)} onCheckedChange={() => {}} onClick={(e) => e.stopPropagation()} />
                              <span>{staff.firstName} {staff.lastName || ""}</span>
                            </button>
                          ))}
                          {staffOptions.filter((s) => `${s.firstName} ${s.lastName || ""}`.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                            <p className="text-center text-sm text-gray-400 py-4">No staff found</p>
                          )}
                        </div>
                        {svcStaffIds.length > 0 && (
                          <div className="border-t p-2 flex items-center justify-between bg-gray-50">
                            <span className="text-xs text-gray-500">{svcStaffIds.length} selected</span>
                            <button type="button" onClick={() => setSvcStaffIds([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear all</button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )}

            {svcStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Required Products</Label>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-gray-50/50 overflow-hidden">
                    {svcItems.length > 0 && (
                      <div className="grid grid-cols-[1fr_100px_40px] gap-2 px-3 py-2 bg-gray-100/50 border-b text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <span>Product Name</span>
                        <span className="text-center">Quantity</span>
                        <span></span>
                      </div>
                    )}

                    <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                      {svcItems.length === 0 ? (
                        <div className="p-8 text-center bg-white">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No products added yet.</p>
                            <p className="text-xs">Click "Add Product" below to add items.</p>
                          </div>
                        </div>
                      ) : (
                        svcItems.map((item, idx) => {
                          const selectedProduct = productOptions.find(p => p.id === parseInt(item.productId));
                          return (
                            <div key={idx} className="grid grid-cols-[1fr_100px_40px] gap-2 items-center p-3 bg-white hover:bg-gray-50 transition-colors">
                              <div className="flex-1">
                                <Select 
                                  value={item.productId} 
                                  onValueChange={(val) => {
                                    setSvcItems((prev) => {
                                      const existingIndex = prev.findIndex((it, i) => i !== idx && String(it.productId) === String(val));
                                      if (existingIndex > -1) {
                                        return prev
                                          .map((it, i) => {
                                            if (i === existingIndex) {
                                              const currentQty = parseFloat(it.qty) || 0;
                                              const addedQty = parseFloat(prev[idx].qty) || 1;
                                              return { ...it, qty: String(currentQty + addedQty) };
                                            }
                                            return it;
                                          })
                                          .filter((_, i) => i !== idx);
                                      } else {
                                        return prev.map((it, i) => i === idx ? { ...it, productId: val } : it);
                                      }
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-9 border-gray-200 focus:ring-primary/20">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="sticky top-0 bg-white p-2 border-b">
                                      <div className="relative">
                                        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                        <Input 
                                          placeholder="Search product..." 
                                          value={productSearch} 
                                          onChange={(e) => setProductSearch(e.target.value)}
                                          className="pl-7 h-7 text-xs"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {productOptions
                                        .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                        .length === 0 ? (
                                        <div className="px-2 py-3 text-center text-xs text-gray-400">
                                          No products found
                                        </div>
                                      ) : (
                                        productOptions
                                          .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                          .map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                              <div className="flex items-center justify-between w-full">
                                                <span className="truncate">{p.name}</span>
                                                {selectedProduct?.id === p.id && (
                                                  <CheckCircle2 className="h-3 w-3 text-primary ml-2 shrink-0" />
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))
                                      )}
                                    </div>
                                  </SelectContent>
                                </Select>
                                {selectedProduct && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    Product ID: {selectedProduct.id}
                                  </p>
                                )}
                              </div>
                              <Input
                                type="number" 
                                placeholder="Qty" 
                                min="0.01" 
                                step="0.01"
                                className="h-9 text-sm text-center border-gray-200 focus:ring-primary/20"
                                value={item.qty}
                                onChange={(e) => setSvcItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it))}
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setSvcItems((prev) => prev.filter((_, i) => i !== idx))} 
                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSvcItems((prev) => [...prev, { productId: "", qty: "1" }])}
                    className="w-full h-11 border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Product</span>
                  </Button>

                  {optionsLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 justify-center py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading products...
                    </div>
                  )}
                  
                  {svcItems.length > 0 && (
                    <div className="text-xs text-muted-foreground text-center">
                      Total products: {svcItems.length}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="h-px bg-gray-100 w-full mb-4" />
                  <FormField
                    control={svcForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Service Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter optional service details, preparation steps, or post-care instructions..." 
                            {...field} 
                            className="min-h-[100px] border-gray-200 focus:ring-primary/20" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
          </Form>

          <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => { setServiceFormOpen(false); setSvcStep(1); }} disabled={svcSaving}>Cancel</Button>
            {svcStep > 1 && (
              <Button variant="outline" onClick={() => setSvcStep((s) => (s - 1) as 1 | 2)} disabled={svcSaving}>Previous</Button>
            )}
            {svcStep < 2 ? (
              <Button onClick={handleNextStep}>Next</Button>
            ) : (
              <Button onClick={svcForm.handleSubmit(handleSaveService)} disabled={svcSaving}>
                {svcSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editService ? "Update" : "Save Service"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>


      {/* ── Add / Edit Category Sheet ── */}
      <Sheet open={catFormOpen} onOpenChange={setCatFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editCategory ? "Edit Category" : "Add Category"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Category Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Skin Care" {...catForm.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Category Code</Label>
              <Input placeholder="e.g. SC" {...catForm.register("code")} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Optional description..." {...catForm.register("description")} className="min-h-[100px]" />
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setCatFormOpen(false)} disabled={catSaving}>Cancel</Button>
            <Button onClick={catForm.handleSubmit(handleSaveCategory)} disabled={catSaving}>
              {catSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editCategory ? "Update" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Service Confirmation ── */}
      <AlertDialog open={!!deleteService} onOpenChange={(open) => !open && setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteService?.serviceName}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={serviceDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} disabled={serviceDeleting} className="bg-red-600 hover:bg-red-700">
              {serviceDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Category Confirmation ── */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteCategory?.name}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={catDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} disabled={catDeleting} className="bg-red-600 hover:bg-red-700">
              {catDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── View Package Details Sheet ── */}
      <Sheet open={!!viewPackage} onOpenChange={(open) => !open && setViewPackage(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-5 w-5 text-primary" />
              Package Details
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{viewPackage?.packageName}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${viewPackage?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {viewPackage?.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">SKU / Code</p>
                  <p className="text-sm font-medium">{viewPackage?.packageCode || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Selling Price</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(viewPackage?.price)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duration</p>
                  <p className="text-sm font-medium">{viewPackage?.duration ? `${viewPackage.duration} mins` : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Discount</p>
                  <p className="text-sm font-medium">
                    {viewPackage?.discount && viewPackage.discount > 0
                      ? `${viewPackage.discount} ${viewPackage.discountType === 'percentage' ? '%' : 'Rs.'}`
                      : "No Discount"}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Constituent Services Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-tight">
                <Scissors className="w-4 h-4 text-primary" />
                Constituent Services
              </div>
              <div className="rounded-lg border overflow-hidden">
                {viewPackage?.services && viewPackage.services.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Service Name</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Standard Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewPackage.services.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-700">{item.serviceName}</td>
                          <td className="px-3 py-2 text-center font-medium text-gray-900">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {viewPackage.totalServicesPrice != null && (
                      <tfoot className="bg-gray-50/50 font-bold border-t">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-right text-gray-600">Services Price Sum</td>
                          <td className="px-3 py-2 text-right text-amber-600">{formatCurrency(viewPackage.totalServicesPrice)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-400">No constituent services defined for this package</div>
                )}
              </div>
            </div>

            {viewPackage?.description && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="space-y-2">
                  <div className="text-sm font-bold text-gray-900 uppercase tracking-tight">Description</div>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border">
                    {viewPackage.description}
                  </p>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button variant="outline" className="w-full" onClick={() => setViewPackage(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Add / Edit Package Sheet ── */}
      <Sheet open={pkgFormOpen} onOpenChange={setPkgFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              {editPackage ? "Edit Package" : "Add Package"}
            </SheetTitle>
          </SheetHeader>
          <Form {...pkgForm}>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={pkgForm.control}
                name="packageName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Bridal Glow Package" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pkgForm.control}
                name="packageCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package SKU / Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. PKG-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-base font-semibold">Constituent Services</Label>
              
              <div className="rounded-lg border bg-gray-50/50 overflow-hidden">
                {pkgServices.length > 0 && (
                  <div className="grid grid-cols-[1fr_100px_40px] gap-2 px-3 py-2 bg-gray-100/50 border-b text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <span>Service Name</span>
                    <span className="text-center">Quantity</span>
                    <span></span>
                  </div>
                )}

                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {pkgServices.length === 0 ? (
                    <div className="p-8 text-center bg-white">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Scissors className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No services added to this package yet.</p>
                        <p className="text-xs">Click "Add Service" below to build the package.</p>
                      </div>
                    </div>
                  ) : (
                    pkgServices.map((item, idx) => {
                      return (
                        <div key={idx} className="grid grid-cols-[1fr_100px_40px] gap-2 items-center p-3 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <Select
                              value={item.serviceId}
                              onValueChange={(val) => {
                                setPkgServices((prev) => {
                                  const existingIndex = prev.findIndex((it, i) => i !== idx && String(it.serviceId) === String(val));
                                  if (existingIndex > -1) {
                                    return prev
                                      .map((it, i) => {
                                        if (i === existingIndex) {
                                          const currentQty = parseInt(it.qty, 10) || 0;
                                          const addedQty = parseInt(prev[idx].qty, 10) || 1;
                                          return { ...it, qty: String(currentQty + addedQty) };
                                        }
                                        return it;
                                      })
                                      .filter((_, i) => i !== idx);
                                  } else {
                                    return prev.map((it, i) => i === idx ? { ...it, serviceId: val } : it);
                                  }
                                });
                              }}
                            >
                              <SelectTrigger className="h-9 border-gray-200 focus:ring-primary/20">
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="sticky top-0 bg-white p-2 border-b">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                    <Input
                                      placeholder="Search service..."
                                      value={serviceSearchQuery}
                                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                                      className="pl-7 h-7 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {serviceOptions
                                    .filter((s) => s.serviceName.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                                    .length === 0 ? (
                                    <div className="px-2 py-3 text-center text-xs text-gray-400">
                                      No services found
                                    </div>
                                  ) : (
                                    serviceOptions
                                      .filter((s) => s.serviceName.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                                      .map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                          <div className="flex items-center justify-between w-full">
                                            <span className="truncate">{s.serviceName} ({formatCurrency(s.price)})</span>
                                          </div>
                                        </SelectItem>
                                      ))
                                  )}
                                </div>
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            className="h-9 text-sm text-center border-gray-200 focus:ring-primary/20"
                            value={item.qty}
                            onChange={(e) => setPkgServices((prev) => prev.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it))}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPkgServices((prev) => prev.filter((_, i) => i !== idx))}
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setPkgServices((prev) => [...prev, { serviceId: "", qty: "1" }])}
                className="w-full h-11 border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label>Original Price (Sum of Services)</Label>
                <Input type="number" placeholder="0.00" value={pkgBasePrice} onChange={(e) => setPkgBasePrice(e.target.value)} />
              </div>
              <FormField
                control={pkgForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (Rs.) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={pkgForm.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Leave blank to auto-calculate sum of service durations"
                      {...field}
                      onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[10px] text-muted-foreground">
                    Khali chorne par constituent services ki durations ka sum automatically calculate ho kar save ho jayega.
                  </p>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={pkgForm.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Discount</SelectItem>
                        <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pkgForm.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={pkgForm.watch("discountType") === undefined || pkgForm.watch("discountType") === "none"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={pkgForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <div className="h-px bg-gray-100 w-full mb-4" />
              <FormField
                control={pkgForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Package Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter package description, client notes, or promotion terms..."
                        {...field}
                        className="min-h-[100px] border-gray-200 focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          </Form>

          <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setPkgFormOpen(false)} disabled={pkgSaving}>Cancel</Button>
            <Button onClick={pkgForm.handleSubmit(handleSavePackage)} disabled={pkgSaving}>
              {pkgSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editPackage ? "Update" : "Save Package"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Package Confirmation ── */}
      <AlertDialog open={!!deletePackage} onOpenChange={(open) => !open && setDeletePackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletePackage?.packageName}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pkgDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePackage} disabled={pkgDeleting} className="bg-red-600 hover:bg-red-700">
              {pkgDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}