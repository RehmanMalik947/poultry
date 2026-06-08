import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unitSchema, type UnitFormValues } from "../../utils/validation";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"; import { Search, Plus, Loader2, Ruler, Info } from "lucide-react";

import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { toast } from "sonner";
import { ApiService } from "../../../api/ApiService";

type Unit = {
  id: number;
  name: string;
  shortName: string;
  allowDecimal: boolean;
};



export function Units() {
  const { selectedBranchId } = useBranch();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    mode: "onChange",
    defaultValues: { name: "", shortName: "", allowDecimal: false },
  });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, [selectedBranchId]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await ApiService.units.getAll();
      if (res.success) setUnits(res.data);
    } catch (err) {
      console.error("Failed to fetch units", err);
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  // Filter + paginate
  const filtered = units.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.shortName.toLowerCase().includes(search.toLowerCase())
  );
  const totalItems = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ name: "", shortName: "", allowDecimal: false });
    setSheetOpen(true);
  };

  const openEdit = (u: Unit) => {
    setEditTarget(u);
    form.reset({ name: u.name, shortName: u.shortName, allowDecimal: u.allowDecimal });
    setSheetOpen(true);
  };

  const handleSave = async (values: UnitFormValues) => {
    setSaving(true);
    try {
      const payload = { name: values.name.trim(), shortName: values.shortName.trim(), allowDecimal: values.allowDecimal };
      if (editTarget) {
        const res = await ApiService.units.update(editTarget.id, payload);
        if (res.success) {
          setUnits(prev => prev.map(u => u.id === editTarget.id ? res.data : u));
          toast.success("Unit updated");
        }
      } else {
        const res = await ApiService.units.create(payload);
        if (res.success) {
          setUnits(prev => [...prev, res.data]);
          toast.success("Unit added");
        }
      }
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.units.delete(deleteTarget.id);
      setUnits(prev => prev.filter(u => u.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete unit");
    } finally {
      setDeleting(false);
    }
  };

  const unitColumns: Column<Unit>[] = [
    {
      header: '#',
      render: (_, idx) => (page - 1) * limit + idx + 1,
      width: '50px'
    },
    { header: 'Name', accessor: 'name', className: 'font-medium' },
    { header: 'Short Name', accessor: 'shortName', className: 'text-gray-500' },
    {
      header: 'Allow Decimal', accessor: 'allowDecimal',
      render: (u) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.allowDecimal ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {u.allowDecimal ? "Yes" : "No"}
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'center',
      render: (u) => (
        <EntityActions
          onEdit={() => openEdit(u)}
          onDelete={() => setDeleteTarget(u)}
        />
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Units</h1>
        <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Unit
        </Button>
      </div>

      <DataTable
        title="All Units"
        icon={Ruler}
        columns={unitColumns}
        data={paginated}
        loading={loading}
        exportable
        exportFileName="units"
        pagination={{
          total: totalItems,
          page: page,
          limit: limit,
          onPageChange: setPage,
          itemLabel: "units"
        }}
        emptyMessage="No units found"
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
                    placeholder="Search units..."
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
              <Ruler className="h-5 w-5 text-primary" />
              {editTarget ? "Edit Unit" : "Add Unit"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <Form {...form}>
              <form id="unit-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kilogram, Liter, Pieces" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. KG, ltr, Pc(s)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allowDecimal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Allow Decimal
                        <Info className="h-3.5 w-3.5 text-gray-400" />
                      </FormLabel>
                      <p className="text-xs text-gray-400">
                        If enabled, quantities for this unit can have decimal values (e.g. 1.5 KG).
                      </p>
                      <Select onValueChange={(v) => field.onChange(v === "yes")} value={field.value ? "yes" : "no"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
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
              form="unit-form"
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
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
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
