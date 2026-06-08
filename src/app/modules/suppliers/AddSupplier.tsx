import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save, Truck } from "lucide-react";
import { toast } from "sonner";

import { ApiService } from "../../../api/ApiService";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  taxNumber: z.string().optional(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  openingBalance: z.coerce.number().optional().default(0),
  active: z.boolean().default(true),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

const EMPTY_FORM: SupplierFormValues = {
  name: "",
  phone: "",
  taxNumber: "",
  businessName: "",
  address: "",
  openingBalance: 0,
  active: true,
};

export function AddSupplier() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    mode: "onChange",
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;

    async function fetchSupplier() {
      setFetching(true);
      try {
        const res = await ApiService.suppliers.getById(Number(id));
        const supplier = res?.data;

        if (!cancelled && supplier) {
          form.reset({
            name: supplier.name || "",
            phone: supplier.phone || "",
            taxNumber: supplier.taxNumber || "",
            businessName: supplier.businessName || "",
            address:
              supplier.address ||
              [
                supplier.addressLine1,
                supplier.addressLine2,
                supplier.city,
                supplier.state,
                supplier.country,
                supplier.zipCode,
              ]
                .filter(Boolean)
                .join(", ") ||
              "",
            openingBalance: Number(supplier.openingBalance) || 0,
            active: supplier.active !== false,
          });
        }
      } catch (error) {
        toast.error("Failed to fetch supplier details");
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchSupplier();

    return () => {
      cancelled = true;
    };
  }, [form, id, isEdit]);

  const handleSubmit = async (values: SupplierFormValues) => {
    setSaving(true);

    try {
      const payload = {
        name: values.name.trim(),
        phone: values.phone || null,
        taxNumber: values.taxNumber || null,
        businessName: values.businessName || null,
        address: values.address || null,
        openingBalance: values.openingBalance || 0,
        active: values.active,

        /*
          Old supplier fields are intentionally hidden for now.
          Do not remove them from backend/database yet.

          Hidden fields:
          contactId, isIndividual, prefix, firstName, lastName, alternateNumber,
          landline, email, addressLine1, addressLine2, city, state, country,
          zipCode, payTerm, payTermType, advanceBalance, customField1-customField10,
          contactPersons.
        */
      };

      if (isEdit && id) {
        await ApiService.suppliers.update(Number(id), payload);
        toast.success("Supplier updated successfully");
      } else {
        await ApiService.suppliers.create(payload);
        toast.success("Supplier added successfully");
      }

      navigate("/suppliers");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (isEdit ? "Failed to update supplier" : "Failed to add supplier")
      );
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {isEdit ? "Edit Supplier" : "Add Supplier"}
          </h1>
          <p className="text-sm text-gray-500">
            Manage farm supplier details and opening balance.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          onClick={() => navigate("/suppliers")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-gray-50/60">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-primary" />
            Supplier Information
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter supplier name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNIC</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter CNIC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Farm Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter farm name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex h-full flex-row items-end gap-3 rounded-lg  p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                      </FormControl>
                      <div className=" leading-none">
                        <FormLabel>Active</FormLabel>
                        {/* <p className="text-xs text-muted-foreground">
                          Uncheck this if supplier is inactive.
                        </p> */}
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/suppliers")}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isEdit ? "Update Supplier" : "Save Supplier"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default AddSupplier;
