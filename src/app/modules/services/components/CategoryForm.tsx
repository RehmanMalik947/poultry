import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryFormValues } from "../../../utils/validation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../../components/ui/sheet";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { ApiService } from "../../../../api/ApiService";
import { toast } from "sonner";
import { Loader2, Tag } from "lucide-react";

export function CategoryForm({ open, onOpenChange, editTarget, type = "service" }: { open: boolean, onOpenChange: (open: boolean) => void, editTarget: any, type?: string }) {
  const [saving, setSaving] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", code: "", description: "", categoryType: type },
  });

  useEffect(() => {
    if (open) {
      if (editTarget) {
        form.reset({
          name: editTarget.name || "",
          code: editTarget.code || "",
          description: editTarget.description || "",
          categoryType: type,
        });
      } else {
        form.reset({ name: "", code: "", description: "", categoryType: type });
      }
    }
  }, [open, editTarget, form, type]);

  const handleSave = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim() || null,
        description: values.description.trim() || null,
        categoryType: type,
      };

      if (editTarget) {
        await ApiService.categories.update(editTarget.id, payload);
        toast.success("Category updated successfully");
      } else {
        await ApiService.categories.create(payload);
        toast.success("Category created successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                    <Input placeholder="e.g. Skin Care" {...field} />
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
                    <Input placeholder="e.g. SC" {...field} />
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
          </div>
        </Form>

        <SheetFooter className="border-t px-6 py-4 flex flex-row gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(handleSave)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editTarget ? "Update" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
