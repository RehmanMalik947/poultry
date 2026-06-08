import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryFormValues } from "../../utils/validation";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "../../components/ui/sheet";
import { Search, Plus, Pencil, Trash2, Loader2, Tag, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "../../components/shared/TablePagination";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { ApiService } from "../../../api/ApiService";
import { COLORS } from '../../constants/colors'
import { useNavigate } from "react-router";;

type Category = {
  id: number;
  name: string;
  code: string | null;
  parentId: number | null;
  description: string | null;
  categoryType: 'product' | 'service' | 'both';
};



export function Categories() {
  const { selectedBranchId } = useBranch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [parentId, setParentId] = useState<string>("none");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    mode: "onChange",
    defaultValues: { name: "", code: "", description: "", categoryType: "product" },
  });

  // ── Fetch from API ───────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.categories.getAll();
      const data = Array.isArray(res) ? res : res.data ?? [];
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Client-side filter + paginate ────────────────────────────────────────
  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalItems = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // ── Open sheet ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setParentId("none");
    form.reset({ name: "", code: "", description: "", categoryType: "product" });
    setSheetOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setParentId(cat.parentId ? String(cat.parentId) : "none");
    form.reset({
      name: cat.name,
      code: cat.code ?? "",
      description: cat.description ?? "",
      categoryType: cat.categoryType || "product",
    });
    setSheetOpen(true);
  };

  const handleSave = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim() || null,
        parentId: parentId !== "none" ? parentId : null,
        description: values.description.trim() || null,
        categoryType: values.categoryType,
      };
      if (editTarget) {
        await ApiService.categories.update(editTarget.id, payload);
        toast.success("Category updated");
      } else {
        await ApiService.categories.create(payload);
        toast.success("Category added");
      }
      setSheetOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.categories.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  const categoryColumns: Column<Category>[] = [
    {
      header: '#',
      render: (_, idx) => (page - 1) * limit + idx + 1,
      width: '50px'
    } as any,
    {
      header: 'Category', accessor: 'name',
      render: (cat) => (
        <div>
          <p className="font-medium">{cat.name}</p>
          {cat.parentId ? (
            <p className="text-xs text-blue-500 font-normal">
              Subcategory of: {categories.find(c => c.id === cat.parentId)?.name ?? "Unknown"}
            </p>
          ) : null}
        </div>
      )
    },
    { header: 'Category Code', accessor: 'code', render: (cat) => cat.code ?? "—", className: 'text-gray-500' },
    { header: 'Description', accessor: 'description', render: (cat) => cat.description ?? "—", className: 'text-gray-500' },
    {
      header: 'Actions',
      align: 'center',
      render: (cat) => (
        <EntityActions
          onView={() => console.log(cat)}
          onEdit={() => openEdit(cat)}
          onDelete={() => setDeleteTarget(cat)}
        />
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Categories</h1>
        <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <DataTable
        title="All Categories"
        icon={Tag}
        columns={categoryColumns}
        data={paginated}
        loading={loading}
        exportable
        exportFileName="categories"
        pagination={{
          total: totalItems,
          page: page,
          limit: limit,
          onPageChange: setPage,
          itemLabel: "categories"
        }}
        emptyMessage={search ? "No categories match your search" : "No categories yet"}
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
                    placeholder="Search categories..."
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
              <Tag className="h-5 w-5 text-primary" />
              {editTarget ? "Edit Category" : "Add Category"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <Form {...form}>
              <form id="category-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HAIR CUT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="product">Product Only</SelectItem>
                          <SelectItem value="service">Service Only</SelectItem>
                          <SelectItem value="both">Both (Product & Service)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-gray-500">Determines where this category will be visible.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>Parent Category</FormLabel>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Parent Category (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Main Category)</SelectItem>
                      {categories
                        .filter(c => c.parentId === null && (!editTarget || c.id !== editTarget.id))
                        .map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
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
              form="category-form"
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
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
