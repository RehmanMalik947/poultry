import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { useNavigate, useParams } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { ApiService } from "../../../api/ApiService";
import { CalendarIcon, Loader2, User, Save } from "lucide-react";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useBranch } from "../../contexts/BranchContext";
import { purchaseSchema, PurchaseFormValues } from "../../utils/validation";

export function AddPurchase() {
  const { format: formatCurrency } = useCurrency();
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [suppliers, setSuppliers] = useState<Array<{ id: number, name: string }>>([]);
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [refNo, setRefNo] = useState("");
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");
  const [transportName, setTransportName] = useState("");
  const [lorryNo, setLorryNo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const purchaseForm = useForm<PurchaseFormValues>({
    defaultValues: {
      supplierId: undefined,
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      discountAmount: 0,
      shippingCharges: 0,
      notes: "",
      items: [],
    },
  });

  useEffect(() => {
    ApiService.suppliers.getAll({ limit: 100 })
      .then(res => {
        const data = res.data || res;
        setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Failed to load suppliers", err));
  }, []);

  // Load purchase data for editing
  useEffect(() => {
    if (!id) return;
    setEditLoading(true);
    ApiService.purchases.getById(Number(id))
      .then(res => {
        const p = res.data;
        if (!p) return;

        purchaseForm.setValue("supplierId", p.supplierId);
        purchaseForm.setValue("discountAmount", parseFloat(p.discountAmount || 0));
        purchaseForm.setValue("shippingCharges", parseFloat(p.shippingCharges || 0));
        purchaseForm.setValue("notes", p.additionalNotes || "");

        setRefNo(p.referenceNo || "");
        setPurchaseDate(p.purchaseDate ? new Date(p.purchaseDate) : new Date());
        setWeight(String(p.weight || 0));
        setRate(String(p.rate || 0));
        setTransportName(p.transportName || "");
        setLorryNo(p.lorryNo || "");
      })
      .catch(err => {
        console.error("Failed to load purchase for edit", err);
        toast.error("Failed to load purchase data");
      })
      .finally(() => setEditLoading(false));
  }, [id]);

  const weightValue = Number(weight) || 0;
  const rateValue = Number(rate) || 0;
  const total = Math.max(0, weightValue * rateValue);

  const handleSavePurchase = purchaseForm.handleSubmit(async (formData) => {
    if (!formData.supplierId) { toast.error("Please select a supplier"); return; }
    if (!weight || !rate) {
      toast.error("Weight and Rate are required");
      return;
    }

    setIsSaving(true);
    try {
      const w = Number(weight) || 0;
      const r = Number(rate) || 0;

      const payload = {
        supplierId: String(formData.supplierId),
        refNo,
        locationId: selectedBranchId ? String(selectedBranchId) : null,
        purchaseDate,
        purchaseStatus: "received",
        discountType: "none",
        discountAmount: "0",
        purchaseTax: "none",
        additionalNotes: formData.notes || "",
        shippingDetails: "",
        shippingCharges: "0",
        paymentAmount: "0",
        paymentMethod: "credit",
        paymentAccount: "none",
        paymentNote: "",
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        rate: String(rate),
        weight: String(weight),
        lorryNo,
        transportName,
        chequeNo: null,
        externalAccountNo: null,
        items: [{
          productId: 1,
          name: "Hen",
          qty: w,
          unitCost: r,
          discountPercent: 0,
          profitMargin: 0,
          sellingPrice: 0,
        }],
      };

      if (isEditMode && id) {
        await ApiService.purchases.update(Number(id), payload);
        toast.success("Purchase updated successfully");
      } else {
        await ApiService.purchases.create(payload);
        toast.success("Purchase saved successfully");
      }

      navigate("/purchases");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save purchase");
    } finally {
      setIsSaving(false);
    }
  });

  if (editLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg text-muted-foreground">Loading purchase data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full mx-auto pb-10 mt-1 px-3">
      <h1 className="text-2xl font-bold text-primary">
        {isEditMode ? "Edit Purchase" : "Add new purchase"}
      </h1>

      <Form {...purchaseForm}>
        {/* ── SECTION 1: Purchase Details ─────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {format(purchaseDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={purchaseDate} onSelect={(d) => d && setPurchaseDate(d)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label>Supplier *</Label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(v) => purchaseForm.setValue("supplierId", v ? Number(v) : undefined)}
                    value={purchaseForm.watch("supplierId") != null ? String(purchaseForm.watch("supplierId")) : ""}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Receipt No</Label>
                <Input
                  placeholder="Receipt No"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                />
              </div>
            </div>

            {/* Note field - full width on next line */}
            <div className="mt-4">
              <FormField
                control={purchaseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input placeholder="Note" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 2: Weight & Amount ───────────────────────────────── */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-primary">Weight & Amount</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Weight *</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Enter weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Rate *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter rate"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Total</Label>
                <div className="h-10 px-3 rounded-md border bg-gray-50 flex items-center font-bold text-primary">
                  {formatCurrency(total)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 3: Transport ─────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-primary">Transport</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Transport Name</Label>
                <Input
                  placeholder="Transport Name"
                  value={transportName}
                  onChange={(e) => setTransportName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Lorry No</Label>
                <Input
                  placeholder="Lorry No"
                  value={lorryNo}
                  onChange={(e) => setLorryNo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <div className="flex justify-center gap-4 pt-2 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate("/purchases")}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSavePurchase}
            disabled={isSaving}
            className="bg-primary hover:bg-primary px-6"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? "Saving..." : isEditMode ? "Update" : "Save"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
