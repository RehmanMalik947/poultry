import { useState, useEffect, useCallback } from "react";
import { ApiService } from "../../../../api/ApiService";
import { DataTable, Column } from "../../../components/shared/DataTable";
import { EntityActions } from "../../../components/shared/EntityActions";
import { Scissors, Search, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
import { useCurrency } from "../../../contexts/CurrencyContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";

type ServiceRecord = {
  id: number;
  serviceName: string;
  categoryName: string | null;
  price: number | null;
  createdAt: string;
  items?: any[];
  staffs?: any[];
};

export function ServiceList({ onEdit, refreshTrigger }: { onEdit: (s: ServiceRecord) => void; refreshTrigger: number }) {
  const { format: formatCurrency } = useCurrency();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.services.getAll({ page, limit, search: search || undefined });
      setServices(res.data || []);
      setTotalItems(res.total ?? (res.data || []).length);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [page, search, refreshTrigger]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.services.delete(deleteTarget.id);
      toast.success("Service deleted");
      setDeleteTarget(null);
      fetchServices();
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ServiceRecord>[] = [
    {
      header: "#",
      render: (_row, idx) => (page - 1) * limit + idx + 1,
    },
    { header: "Service Name", accessor: "serviceName", className: "font-medium" },
    { header: "Category", render: (row) => row.categoryName ?? "—" },
    { header: "Price", render: (row) => formatCurrency(row.price) },
    {
      header: "Staff Assigned",
      render: (row) =>
        row.staffs && row.staffs.length > 0
          ? row.staffs.map((s: any) => s.firstName).join(", ")
          : "Any Staff",
    },
    {
      header: "Created At",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <EntityActions
          onEdit={() => onEdit(row)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="All Services"
        icon={Scissors}
        columns={columns}
        data={services}
        loading={loading}
        exportable
        exportFileName="services"
        pagination={{
          total: totalItems,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "services"
        }}
        filters={
          <div className="flex items-center gap-3">
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
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
              />
            </div>
          </div>
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.serviceName}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
