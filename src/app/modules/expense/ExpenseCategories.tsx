import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseCategorySchema, type ExpenseCategoryFormValues } from "../../utils/validation";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Textarea } from "../../components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "../../components/ui/sheet";
import { Search, Plus, Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";

import {ApiService} from "../../../api/ApiService"
import { useBranch } from "../../contexts/BranchContext";

type ExpenseCategory = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  parentId: number | null;
};

const mockCategories: ExpenseCategory[] = [
  { id: 1, name: "Rent", code: "RENT", description: "Office or branch rent", parentId: null },
  { id: 2, name: "Salaries", code: "SAL", description: "Staff monthly salaries", parentId: null },
  { id: 3, name: "Utilities", code: "UTIL", description: "Electricity, water, internet", parentId: null },
  { id: 4, name: "Electricity", code: "ELEC", description: "Electric bill", parentId: 3 },
  { id: 5, name: "Internet", code: "NET", description: "Broadband connection", parentId: 3 },
];

export default function ExpenseCategories() {
  const { selectedBranchId } = useBranch();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const form = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: { name: "", code: "", description: "" },
  });
  const [formParentId, setFormParentId] = useState<string>("none");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter
  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ name: "", code: "", description: "" });
    setFormParentId("none");
    setSheetOpen(true);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditTarget(cat);
    form.reset({ name: cat.name, code: cat.code ?? "", description: cat.description ?? "" });
    setFormParentId(cat.parentId ? String(cat.parentId) : "none");
    setSheetOpen(true);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.expenseCategories.getAll({
        branchId: selectedBranchId || undefined
      });
      const data = Array.isArray(res?.data) ? res.data : res.data ?? [];
      setCategories(data);
    } catch (err) {
      toast.error("Failed to load expense categories");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

useEffect(() => {
  fetchCategories();
}, [fetchCategories]);

  const handleSave = async (values: ExpenseCategoryFormValues) => {
  setSaving(true);
  try {
    const payload = {
      name: values.name.trim(),
      code: values.code.trim() || null,
      description: values.description.trim() || null,
      parentId: formParentId !== "none" ? Number(formParentId) : null,
    };

    if (editTarget) {
      await ApiService.expenseCategories.update(editTarget.id, payload);
      toast.success("Category updated");
    } else {
      await ApiService.expenseCategories.create(payload);
      toast.success("Category added");
    }

    fetchCategories();
    setSheetOpen(false);
  } catch (err) {
    toast.error("Failed to save category");
  } finally {
    setSaving(false);
  }
};

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.expenseCategories.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      fetchCategories();
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ExpenseCategory>[] = [
    {
      header: '#',
      render: (_, idx) => (page - 1) * limit + idx + 1,
      width: '50px'
    } as any,
    {
      header: 'Category Name',
      render: (cat) => (
        <div>
          <p className="font-medium text-gray-900">{cat.name}</p>
          {cat.parentId ? (
            <p className="text-xs text-blue-500 font-normal">
              Subcategory of: {categories.find(c => c.id === cat.parentId)?.name ?? "Unknown"}
            </p>
          ) : null}
        </div>
      )
    },
    { header: 'Code', render: (cat) => cat.code ?? "—", className: 'text-gray-500' },
    { header: 'Description', render: (cat) => cat.description ?? "—", className: 'text-gray-500' },
    {
      header: 'Actions',
      align: 'center',
      render: (cat) => (
        <EntityActions
          onEdit={() => openEdit(cat)}
          onDelete={() => setDeleteTarget(cat)}
        />
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Tag className="h-6 w-6" /> Expense Categories
        </h1>
        <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <DataTable
        title="All Expense Categories"
        icon={Tag}
        columns={columns}
        data={paginated}
        loading={loading}
        exportable
        exportFileName="expense-categories"
        pagination={{
          total: filtered.length,
          page: page,
          limit: limit,
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
              />
            </div>
          </div>
        }
      />

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editTarget ? "Edit Category" : "Add Category"}
            </SheetTitle>
          </SheetHeader>

          <Form {...form}>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <Label>Category Code</Label>
              <Input
                placeholder="e.g. RNT"
                {...form.register("code")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
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
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                {...form.register("description")}
                className="min-h-[100px]"
              />
            </div>
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

      {/* Delete Confirmation */}
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