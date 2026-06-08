import { useState, useEffect, useCallback } from "react";
import { ApiService } from "../../../../api/ApiService";
import { DataTable, Column } from "../../../components/shared/DataTable";
import { EntityActions } from "../../../components/shared/EntityActions";
import { Tag, Search, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
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

type CategoryRecord = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
};

export function ServiceCategoryList({ onEdit, refreshTrigger }: { onEdit: (c: CategoryRecord) => void, refreshTrigger: number }) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.categories.getAll({ type: 'service' });
      const data = Array.isArray(res) ? res : res.data ?? [];
      const filtered = data.filter((c: any) => 
        c.name.toLowerCase().includes(search.toLowerCase())
      );
      setCategories(filtered.slice((page - 1) * limit, page * limit));
      setTotalItems(filtered.length);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [page, search, refreshTrigger]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.categories.delete(deleteTarget.id);
      toast.success("Category deleted");
      setDeleteTarget(null);
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<CategoryRecord>[] = [
    {
      header: "#",
      render: (_row, idx) => (page - 1) * limit + idx + 1,
    },
    { header: "Category Name", accessor: "name", className: "font-medium" },
    { header: "Code", render: (row) => row.code ?? "—" },
    { header: "Description", render: (row) => row.description ?? "—" },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <EntityActions 
          onEdit={() => onEdit(row)}
          onDelete={() => setDeleteTarget(row)}
        />
      )
    }
  ];

  return (
    <>
      <DataTable
        title="Service Categories"
        icon={Tag}
        columns={columns}
        data={categories}
        loading={loading}
        exportable
        exportFileName="service-categories"
        pagination={{
          total: totalItems,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "categories"
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
                placeholder="Search categories..."
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
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
