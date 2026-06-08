import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "../../components/ui/form";
import { useBranch } from "../../contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
import { Search, Plus, Pencil, Trash2, Loader2, Layers, X, MoreVertical , Eye} from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "../../components/shared/TablePagination";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { ApiService } from "../../../api/ApiService";

type Variation = {
  id: number;
  name: string;
  values: string[];
};

const variationFormSchema = z.object({
  name: z.string().trim().min(1, "Variation name is required"),
});
type VariationFormValues = z.infer<typeof variationFormSchema>;

export function Variations() {
  const { selectedBranchId } = useBranch();
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Variation | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formValueInput, setFormValueInput] = useState("");
  const [formValues, setFormValues] = useState<string[]>([]);
  const form = useForm<VariationFormValues>({
    resolver: zodResolver(variationFormSchema),
    mode: "onChange",
    defaultValues: { name: "" },
  });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Variation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVariations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.variations.getAll();
      setVariations(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load variations");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => { fetchVariations(); }, [fetchVariations]);

  // ── Filter / paginate ────────────────────────────────────────────────────
  const filtered = variations.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.values.some(val => val.toLowerCase().includes(search.toLowerCase()))
  );
  const totalItems = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // ── Sheet helpers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    form.reset({ name: "" });
    setFormValues([]);
    setFormValueInput("");
    setSheetOpen(true);
  };

  const openEdit = (v: Variation) => {
    setEditTarget(v);
    form.reset({ name: v.name });
    setFormValues([...v.values]);
    setFormValueInput("");
    setSheetOpen(true);
  };

  const addValueChip = () => {
    const val = formValueInput.trim();
    if (!val) return;
    if (formValues.includes(val)) { toast.error("Value already added"); return; }
    setFormValues(prev => [...prev, val]);
    setFormValueInput("");
  };

  const removeValueChip = (val: string) => {
    setFormValues(prev => prev.filter(v => v !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValueChip();
    }
  };

  const handleSave = async (values: VariationFormValues) => {
    if (formValues.length === 0) { toast.error("Add at least one value"); return; }
    setSaving(true);
    try {
      const payload = { name: values.name.trim(), values: formValues };
      if (editTarget) {
        await ApiService.variations.update(editTarget.id, payload);
        toast.success("Variation updated");
      } else {
        await ApiService.variations.create(payload);
        toast.success("Variation added");
      }
      setSheetOpen(false);
      fetchVariations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save variation");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.variations.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchVariations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete variation");
    } finally {
      setDeleting(false);
    }
  };

  const variationColumns: Column<Variation>[] = [
    {
      header: '#',
      render: (_, idx) => (page - 1) * limit + idx + 1,
      width: '50px'
    } as any,
    { header: 'Variation', accessor: 'name', className: 'font-medium' },
    {
      header: 'Values', accessor: 'values',
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(v.values) && v.values.map(val => (
            <span
              key={val}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
            >
              {val}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'center',
      render: (v) => (
        <EntityActions
          onView={() => console.log(v)}
          onEdit={() => openEdit(v)}
          onDelete={() => setDeleteTarget(v)}
        />
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Variations</h1>
        <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Variation
        </Button>
      </div>

      <DataTable
        title="All Variations"
        icon={Layers}
        columns={variationColumns}
        data={paginated}
        loading={loading}
        exportable
        exportFileName="variations"
        pagination={{
          total: totalItems,
          page: page,
          limit: limit,
          onPageChange: setPage,
          itemLabel: "variations"
        }}
        emptyMessage="No variations found"
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
                    placeholder="Search variations..."
                    value={search}
                    onChange={handleSearch}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                />
            </div>
        </>
    }
      />

      <Sheet open={sheetOpen} onOpenChange={open => !open && setSheetOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {editTarget ? "Edit Variation" : "Add Variation"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <Form {...form}>
              <form id="variation-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variation Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. color, SIZE, Material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <FormLabel>Values <span className="text-red-500">*</span></FormLabel>
                  <p className="text-xs text-gray-400">Type a value and press Enter or comma to add</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. black, XL, Cotton..."
                      value={formValueInput}
                      onChange={e => setFormValueInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addValueChip}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>

                  {formValues.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 p-3 border rounded-md bg-gray-50 min-h-[50px]">
                      {formValues.map(val => (
                        <span
                          key={val}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => removeValueChip(val)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </Form>
          </div>

          <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="variation-form"
              className="bg-primary hover:bg-primary/90"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editTarget ? "Update" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variation</AlertDialogTitle>
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
