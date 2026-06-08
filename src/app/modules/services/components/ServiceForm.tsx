import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormValues } from "../../../utils/validation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../../components/ui/sheet";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Textarea } from "../../../components/ui/textarea";
import { ApiService } from "../../../../api/ApiService";
import { toast } from "sonner";
import { Loader2, Scissors } from "lucide-react";

type StaffOption = { id: number; firstName: string; lastName?: string | null };
type CategoryOption = { id: number; name: string };

export function ServiceForm({ open, onOpenChange, editTarget }: { open: boolean, onOpenChange: (open: boolean) => void, editTarget: any }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    mode: "onChange",
    defaultValues: {
      serviceName: "",
      price: 0,
      duration: 0,
      categoryId: undefined,
      description: "",
      status: "active",
      branchId: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      fetchOptions();
      if (editTarget) {
        form.reset({
          serviceName: editTarget.serviceName || "",
          price: editTarget.price || 0,
          duration: editTarget.duration || 0,
          categoryId: editTarget.categoryId || undefined,
          description: editTarget.description || "",
          status: editTarget.status || "active",
          branchId: editTarget.branchId || undefined,
        });
        setSelectedStaffIds(editTarget.staffs?.map((s: any) => s.id) || []);
      } else {
        form.reset({
          serviceName: "",
          price: 0,
          duration: 0,
          categoryId: undefined,
          description: "",
          status: "active",
          branchId: undefined,
        });
        setSelectedStaffIds([]);
      }
    }
  }, [open, editTarget]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const [staffRes, catRes] = await Promise.all([
        ApiService.staff.getAll({ limit: 100 }),
        ApiService.categories.getAll({ type: 'service' })
      ]);
      setStaffOptions(staffRes.data || []);
      setCategoryOptions(catRes.data || []);
    } catch {
      toast.error("Failed to load form options");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: ServiceFormValues) => {
    setSaving(true);
    try {
      const payload = {
        serviceName: values.serviceName.trim(),
        price: values.price || null,
        duration: values.duration || 0,
        categoryId: values.categoryId || null,
        description: values.description || "",
        status: values.status || "active",
        branchId: values.branchId || null,
        staffIds: selectedStaffIds,
        date: new Date().toISOString().slice(0, 10), // Required by backend
      };

      if (editTarget) {
        await ApiService.services.update(editTarget.id, payload);
        toast.success("Service updated successfully");
      } else {
        await ApiService.services.create(payload);
        toast.success("Service created successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            {editTarget ? "Edit Service" : "Add Service"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Form {...form}>
            <form id="service-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
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

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}
                      value={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Textarea placeholder="Optional description..." className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
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

              <div className="space-y-2 border-t pt-4">
                <FormLabel className="text-sm font-semibold">Assign Staff</FormLabel>
                <p className="text-xs text-gray-500 mb-2">Select staff members who can provide this service.</p>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading staff...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 border rounded-md p-3 bg-gray-50 max-h-48 overflow-y-auto">
                    {staffOptions.map(staff => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`staff-${staff.id}`} 
                          checked={selectedStaffIds.includes(staff.id)}
                          onCheckedChange={(checked) => {
                            setSelectedStaffIds(prev => 
                              checked ? [...prev, staff.id] : prev.filter(id => id !== staff.id)
                            );
                          }}
                        />
                        <label 
                          htmlFor={`staff-${staff.id}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {staff.firstName} {staff.lastName || ""}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </div>

        <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="service-form" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editTarget ? "Update" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
