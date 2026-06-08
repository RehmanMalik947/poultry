import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, type BrandFormValues } from "../../utils/validation";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "../../components/ui/form";
import { useBranch } from "../../contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Plus, Pencil, Trash2, Loader2,Award,Eye, MoreVertical } from "lucide-react";

import { toast } from "sonner";
import { TablePagination } from "../../components/shared/TablePagination";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { ApiService } from "../../../api/ApiService";
import { COLORS } from '../../constants/colors';

type Brand = {
  id: number;
  name: string;
  description: string;
};

export function Brands() {
  const { selectedBranchId } = useBranch();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    mode: "onChange",
    defaultValues: { name: "", description: "" },
  });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, [selectedBranchId]);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await ApiService.brands.getAll();
      if (res.success) setBrands(res.data);
    } catch (err) {
      console.error("Failed to fetch brands", err);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  // Filter + paginate
  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(search.toLowerCase()))
  );
  const totalItems = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ name: "", description: "" });
    setSheetOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditTarget(b);
    form.reset({ name: b.name, description: b.description });
    setSheetOpen(true);
  };

  const handleSave = async (values: BrandFormValues) => {
    setSaving(true);
    try {
      const payload = { name: values.name.trim(), description: values.description.trim() };
      if (editTarget) {
        const res = await ApiService.brands.update(editTarget.id, payload);
        if (res.success) {
          setBrands(prev => prev.map(b => b.id === editTarget.id ? res.data : b));
          toast.success("Brand updated");
        }
      } else {
        const res = await ApiService.brands.create(payload);
        if (res.success) {
          setBrands(prev => [...prev, res.data]);
          toast.success("Brand added");
        }
      }
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.brands.delete(deleteTarget.id);
      setBrands(prev => prev.filter(b => b.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete brand");
    } finally {
      setDeleting(false);
    }
  };

  const brandColumns: Column<Brand>[] = [
    {
      header: '#',
      render: (_, idx) => (page - 1) * limit + idx + 1,
      width: '50px'
    } as any,
    { header: 'Brand Name', accessor: 'name', className: 'font-medium' },
    { header: 'Description', accessor: 'description', render: (b) => b.description || "—", className: 'text-gray-500' },
    {
      header: 'Actions',
      align: 'center',
      render: (b) => (
        <EntityActions
          onEdit={() => openEdit(b)}
          onDelete={() => setDeleteTarget(b)}
        />
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Brands</h1>
        <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Brand
        </Button>
      </div>

      <DataTable
        title="All Brands"
        icon={Award}
        columns={brandColumns}
        data={paginated}
        loading={loading}
        exportable
        exportFileName="brands"
        pagination={{
          total: totalItems,
          page: page,
          limit: limit,
          onPageChange: setPage,
          itemLabel: "brands"
        }}
        emptyMessage="No brands found"
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
            <div className="relative w-72 ml-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search brands..."
                    value={search}
                    onChange={handleSearch}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                />
            </div>
        </>
    }
      />

      {/* ── Add / Edit Sheet ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={open => !open && setSheetOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {editTarget ? "Edit Brand" : "Add Brand"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <Form {...form}>
              <form id="brand-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. L'Oréal, Wella, OPI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional description..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="brand-form"
              className="bg-primary hover:bg-primary/90"
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
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>?
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
