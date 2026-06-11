import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { saleSchema, type SaleFormValues } from "../../utils/validation";
import type { SaleFormValues } from "../../utils/validation";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { useSearchParams, useNavigate } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { ApiService } from "../../../api/ApiService";
import { Plus, Search, CalendarIcon, Loader2, Info, X } from "lucide-react";
import { useCurrency } from "../../contexts/CurrencyContext";

// --- Types ---
interface Product {
  id: number;
  name: string;
  sku?: string;
  price?: number;
  type: "product" | "service";
}

interface SaleItem {
  itemId: number;
  itemType: "product" | "service";
  itemName: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export function AddSale() {
  const { format: formatCurrency } = useCurrency();

  // ---------------------------------------------------------------------------
  // Default poultry product
  // IMPORTANT: Product ID 1 must exist in the database.
  // Later, we can replace this hardcoded ID with organization settings.
  // ---------------------------------------------------------------------------
  const DEFAULT_PRODUCT_ID = 1;
  const DEFAULT_PRODUCT_NAME = "Poultry";

  // Main Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Active Poultry Sale Fields
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [referenceNo, setReferenceNo] = useState("");
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [lorryNo, setLorryNo] = useState("");

  // Old POS sale item state - kept for future use, currently not active in UI.
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Adjustments - kept for future use, currently not active in UI.
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [taxPercent, setTaxPercent] = useState<string>("");
  const [shippingDetails, setShippingDetails] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingStatus, setShippingStatus] = useState("pending");
  const [deliveredTo, setDeliveredTo] = useState("");
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [shippingCharges, setShippingCharges] = useState<string>("");

  // Payment - kept for future use, currently auto-paid by total.
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState("");

  // Card Payment Details - kept for future use.
  const [cardHolder, setCardHolder] = useState("");
  const [cardType, setCardType] = useState("Visa");
  const [cardTransactionNo, setCardTransactionNo] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  // Cheque Payment Details - kept for future use.
  const [chequeNo, setChequeNo] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState<Date | undefined>(undefined);
  const [accountHolder, setAccountHolder] = useState("");

  // Metadata for Quick Add Product - kept for future use.
  const [units, setUnits] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Quick Add Product States - kept for future use.
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [productSubmitting, setProductSubmitting] = useState(false);

  // Search - kept for future product search section.
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
const [searchParams] = useSearchParams();
const navigate = useNavigate();

const editSaleId = searchParams.get("editSaleId");
const isEditMode = Boolean(editSaleId);
  const form = useForm<SaleFormValues>({
    // Resolver removed because only Date, Customer, Weight and Rate are required now.
    // resolver: zodResolver(saleSchema),
    defaultValues: {
      status: "paid",
      paymentMethod: "cash",
      discountType: "fixed",
      note: "",
      customerId: undefined,
      amountPaid: 0,
      taxPercent: 0,
      discountAmount: 0,
      discountRate: 0,
      items: [],
    },
  });

  const status = form.watch("status") || "paid";
  const discountType = form.watch("discountType") || "fixed";
  const paymentMethod = form.watch("paymentMethod") || "cash";
  const notes = form.watch("note") || "";

  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Pay term states - kept for future use.
  const [payTermValue, setPayTermValue] = useState<string>("");
  const [payTermType, setPayTermType] = useState<string>("days");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [custRes, locRes, prodRes, unitRes, brandRes, catRes] = await Promise.all([
          ApiService.customers.getAll(),
          ApiService.staff.getBranches(),
          ApiService.products.getAll({ limit: 1000 }),
          ApiService.units.getAll(),
          ApiService.brands.getAll(),
          ApiService.categories.getAll(),
        ]);

        setCustomers(Array.isArray(custRes) ? custRes : custRes.data || []);
        setLocations(Array.isArray(locRes) ? locRes : locRes.data || []);
        setUnits(unitRes.data || []);
        setBrands(brandRes.data || []);
        setCategories(catRes.data || []);

        const prodData = prodRes.data || prodRes || [];
        const prods = (Array.isArray(prodData) ? prodData : []).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: parseFloat(p.sellingPriceInc || p.sellingPriceExc) || 0,
          type: "product",
        }));
        setProducts(prods);
      } catch (err) {
        console.error("Failed to load screen data", err);
        toast.error("Failed to load initial data");
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
  const loadSaleForEdit = async () => {
    if (!editSaleId) return;

    try {
      const res = await ApiService.get(`/pos/sale/${editSaleId}`);
      const sale = res?.data;

      if (!sale) {
        toast.error("Sale not found");
        return;
      }

      setCustomerId(sale.customerId ? String(sale.customerId) : "");
      setLocationId(sale.branchId ? String(sale.branchId) : "");
      setSaleDate(sale.createdAt ? new Date(sale.createdAt) : new Date());
      setReferenceNo(sale.referenceNo || "");

      setWeight(sale.weight ? String(sale.weight) : "");
      setRate(sale.rate ? String(sale.rate) : "");
      setDriverName(sale.driverName || sale.deliveryPerson || "");
      setLorryNo(sale.lorryNo || "");

      form.setValue("note", sale.additionalNotes || "");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load sale for edit");
    }
  };

  loadSaleForEdit();
}, [editSaleId]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts([]);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term))
    );
    setFilteredProducts(filtered.slice(0, 10));
  }, [searchTerm, products]);

  // ---------------------------------------------------------------------------
  // Active poultry total calculation
  // ---------------------------------------------------------------------------
  const weightValue = Number(weight) || 0;
  const rateValue = Number(rate) || 0;
  const total = Math.max(0, weightValue * rateValue);

  // ---------------------------------------------------------------------------
  // Old POS totals - commented because product table is not active now.
  // ---------------------------------------------------------------------------
  // const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
  // const discountVal =
  //   discountType === "percentage"
  //     ? (subtotal * (parseFloat(discountAmount) || 0)) / 100
  //     : parseFloat(discountAmount) || 0;
  // const taxableAmount = subtotal - discountVal;
  // const taxVal = (taxableAmount * (parseFloat(taxPercent) || 0)) / 100;
  // const shippingVal = parseFloat(shippingCharges) || 0;
  // const total = Math.max(0, taxableAmount + taxVal + shippingVal);

  const handleSelectProduct = (product: Product) => {
    const existing = saleItems.find((i) => i.itemId === product.id);
    if (existing) {
      setSaleItems((prev) =>
        prev.map((i) =>
          i.itemId === product.id
            ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.price }
            : i
        )
      );
    } else {
      setSaleItems((prev) => [
        ...prev,
        {
          itemId: product.id,
          itemType: product.type as "product" | "service",
          itemName: product.name,
          price: product.price || 0,
          quantity: 1,
          lineTotal: product.price || 0,
        },
      ]);
    }
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleRemoveItem = (id: number) => {
    setSaleItems((prev) => prev.filter((i) => i.itemId !== id));
  };

  const handleUpdateQty = (id: number, qty: string) => {
    const nQty = parseInt(qty) || 0;
    setSaleItems((prev) =>
      prev.map((i) =>
        i.itemId === id ? { ...i, quantity: nQty, lineTotal: nQty * i.price } : i
      )
    );
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) { toast.error("Product name is required"); return; }
    if (!newProductUnit) { toast.error("Unit is required"); return; }

    setProductSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", newProductName.trim());
      formData.append("unitId", newProductUnit);
      if (newProductBrand && newProductBrand !== "none") formData.append("brandId", newProductBrand);
      if (newProductCategory && newProductCategory !== "none") formData.append("categoryId", newProductCategory);
      if (newProductSku) formData.append("sku", newProductSku);
      if (newProductPrice) formData.append("sellingPriceInc", newProductPrice);
      formData.append("productType", "single");

      const res = await ApiService.products.createWithFile(formData);
      toast.success("Product added successfully");
      setProductDialogOpen(false);

      if (res.data) {
        const newProd: Product = {
          id: res.data.id,
          name: res.data.name,
          sku: res.data.sku,
          price: parseFloat(res.data.sellingPriceInc || res.data.sellingPriceExc) || 0,
          type: "product",
        };
        setProducts((prev) => [...prev, newProd]);
        handleSelectProduct(newProd);
      }

      setNewProductName("");
      setNewProductUnit("");
      setNewProductBrand("");
      setNewProductCategory("");
      setNewProductSku("");
      setNewProductPrice("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add product");
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleSubmit = form.handleSubmit(async () => {
    // New poultry validation: only Date, Customer, Weight and Rate are required.
    if (!saleDate) {
      toast.error("Date is required");
      return;
    }

    if (!customerId || customerId.trim() === "") {
      toast.error("Customer is required");
      return;
    }

    if (!weight || Number(weight) <= 0) {
      toast.error("Weight is required");
      return;
    }

    if (!rate || Number(rate) <= 0) {
      toast.error("Rate is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalWeight = Number(weight) || 0;
      const finalRate = Number(rate) || 0;
      const finalTotal = finalWeight * finalRate;

      const defaultSaleItem: SaleItem = {
        itemId: DEFAULT_PRODUCT_ID,
        itemType: "product",
        itemName: DEFAULT_PRODUCT_NAME,
        price: finalRate,
        quantity: finalWeight,
        lineTotal: finalTotal,
      };

      const transportText = `Driver Name: ${driverName || "-"} | Lorry No: ${lorryNo || "-"}`;

      const payload = {
          saleId: isEditMode ? Number(editSaleId) : undefined,

  customerId: parseInt(customerId, 10),
  branchId: locationId ? parseInt(locationId, 10) : null,
  status: "unpaid",
  saleDate,
  referenceNo: referenceNo || null,

  weight: finalWeight,
  rate: finalRate,
  driverName: driverName || null,
  lorryNo: lorryNo || null,

  items: [defaultSaleItem],

  discountType: "fixed",
  discountAmount: 0,
  discountRate: 0,
  taxPercent: 0,

  shippingDetails: transportText,
  shippingAddress: null,
  shippingStatus: "pending",
  deliveredTo: driverName || null,
  deliveryPerson: driverName || null,
  shippingCharges: 0,

  payTermNumber: 0,
  payTermType: "days",

  amountPaid: 0,
  paymentMethod: "credit",
  paymentStatus: "due",
  note: notes || null,
  total: finalTotal,
  paymentDetails: {
    note: paymentNote || null,
  },
  totalItems: 1,
  totalQuantity: finalWeight,
};

      if (locationId) {
        localStorage.setItem("salon_selected_branch_id", locationId);
      }

      await ApiService.sales.submit(payload);
toast.success(isEditMode ? "Sale updated successfully" : "Sale recorded successfully");
navigate("/sales");

      // Reset active poultry form
      setCustomerId("");
      setLocationId("");
      setSaleDate(new Date());
      setReferenceNo("");
      setWeight("");
      setRate("");
      setDriverName("");
      setLorryNo("");

      // Reset old fields kept for future use
      setSaleItems([]);
      setDiscountAmount("");
      setTaxPercent("");
      setShippingDetails("");
      setShippingAddress("");
      setShippingStatus("pending");
      setDeliveredTo("");
      setDeliveryPerson("");
      setShippingCharges("");
      setPaymentAmount("");
      setPaymentNote("");
      setCardHolder("");
      setCardType("Visa");
      setCardTransactionNo("");
      setCardNumber("");
      setChequeNo("");
      setChequeBank("");
      setChequeDate(undefined);
      setAccountHolder("");
      setSearchTerm("");
      setShowDropdown(false);
      setPayTermValue("");
      setPayTermType("days");

      form.reset({
        status: "paid",
        paymentMethod: "cash",
        discountType: "fixed",
        note: "",
        customerId: undefined,
        amountPaid: 0,
        taxPercent: 0,
        discountAmount: 0,
        discountRate: 0,
        items: [],
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit sale");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-3 w-full mx-auto pb-10 mt-1 px-3">
<h1 className="text-2xl font-bold text-primary">
  {isEditMode ? "Edit Sale" : "Add new sale"}
</h1>
      <Form {...form}>
        {/* ── SECTION 1: Sale Details ─────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="space-y-1">
    <Label>Date *</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
          {format(saleDate, "PPP")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={saleDate} onSelect={(d) => d && setSaleDate(d)} />
      </PopoverContent>
    </Popover>
  </div>

  <div className="space-y-1">
    <Label>Customer *</Label>
    <div className="flex gap-2">
      <Select value={customerId} onValueChange={setCustomerId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select Customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>

  <div className="space-y-1">
    <Label>Receipt No</Label>
    <Input
      placeholder="Receipt No"
      value={referenceNo}
      onChange={(e) => setReferenceNo(e.target.value)}
    />
  </div>
</div>

{/* Note field - full width on next line */}
<div className="mt-4">
  <FormField
    control={form.control}
    name="note"
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

            {/* Old branch/status/pay-term fields are kept here but commented for now. */}
            {/*
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Business Location:</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Sale Status:</Label>
                <Select value={status} onValueChange={(v) => form.setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Final (Paid)</SelectItem>
                    <SelectItem value="credit">Credit (Unpaid)</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Pay Term Value:</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={payTermValue}
                  onChange={(e) => setPayTermValue(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Pay Term Type:</Label>
                <Select value={payTermType} onValueChange={setPayTermType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Term Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            */}
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
                <Label>Driver Name</Label>
                <Input
                  placeholder="Driver Name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
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

        {/* ── OLD SECTION 2: Item Selection - commented, not removed ────── */}
        {/*
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Add Products: <InfoIcon title="Search by product name or SKU" />
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={searchDropdownRef}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <Input
                    placeholder="Search Products by name or SKU..."
                    className="pl-9 bg-gray-50 border-purple-200 focus-visible:ring-purple-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {showDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded-md max-h-60 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
                          onClick={() => handleSelectProduct(p)}
                        >
                          <div>
                            <span className="font-medium text-gray-800">{p.name}</span>
                            <span className="ml-2 text-xs text-gray-400">SKU: {p.sku || "N/A"}</span>
                          </div>
                          <span className="text-gray-500 text-sm font-semibold">
                            {formatCurrency(p.price || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100 flex items-center gap-1 px-4"
                  onClick={() => setProductDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" /> New Product
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-md mt-2">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c] w-10">#</th>
                    <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c]">Product / Service</th>
                    <th className="px-4 py-2 text-center font-semibold border-r border-[#4cae4c] w-32">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Unit Price</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Line Total</th>
                    <th className="px-4 py-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {saleItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 bg-gray-50 border-t">
                        Search and add products to start building a sale.
                      </td>
                    </tr>
                  ) : (
                    saleItems.map((item, idx) => (
                      <tr key={item.itemId} className="border-t hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400 font-medium border-r">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 border-r">{item.itemName}</td>
                        <td className="px-4 py-3 border-r">
                          <Input
                            type="number"
                            className="h-8 text-center"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(item.itemId, e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 border-r">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary border-r">
                          {formatCurrency(item.lineTotal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveItem(item.itemId)}
                          >
                            <X className="h-5 w-5 stroke-[3px]" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        */}

        {/* ── OLD SECTION 3: Discount, Tax & Shipping - commented, not removed ─ */}
        {/*
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Discount Type:</Label>
                <Select value={discountType} onValueChange={(v) => form.setValue("discountType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount Value:</Label>
                <Input
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  Order Tax (%): <InfoIcon title="Applied after discount" />
                </Label>
                <Input
                  placeholder="0.00"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  Shipping Description: <InfoIcon title="Recipient, courier info" />
                </Label>
                <Input
                  placeholder="Recipient, courier, etc."
                  value={shippingDetails}
                  onChange={(e) => setShippingDetails(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Shipping Status:</Label>
                <Select value={shippingStatus} onValueChange={setShippingStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Shipping Charges:</Label>
                <Input
                  placeholder="0.00"
                  value={shippingCharges}
                  onChange={(e) => setShippingCharges(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Delivered To (Name):</Label>
                <Input
                  placeholder="Recipient customer name"
                  value={deliveredTo}
                  onChange={(e) => setDeliveredTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Delivery Person:</Label>
                <Input
                  placeholder="Staff or Courier"
                  value={deliveryPerson}
                  onChange={(e) => setDeliveryPerson(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Shipping Address:</Label>
                <Input
                  placeholder="Full delivery address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        */}

        {/* ── OLD SECTION 4: Payment - commented, not removed ───────────── */}
        {/*
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Paid Amount:</Label>
                <Input
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Payment Method:</Label>
                <Select value={paymentMethod} onValueChange={(v) => form.setValue("paymentMethod", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Payment</SelectItem>
                    <SelectItem value="card">Card / Digital Payment</SelectItem>
                    <SelectItem value="cheque">Bank Cheque</SelectItem>
                    <SelectItem value="other">Other / Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Note:</Label>
                <Input
                  placeholder="Ref #, Bank info, etc."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        */}

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <div className="flex justify-center gap-4 pt-2 pb-6">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary px-6"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
{isSubmitting ? "Saving..." : isEditMode ? "Update" : "Save"}
          </Button>
        </div>

        {/* ── Quick Add Product Dialog - kept, currently not active in UI ── */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Quick Add Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitProduct}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Product Name:*</Label>
                  <Input
                    placeholder="Product Name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit:*</Label>
                    <Select value={newProductUnit} onValueChange={setNewProductUnit}>
                      <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.actual_name || u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand:</Label>
                    <Select value={newProductBrand} onValueChange={setNewProductBrand}>
                      <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category:</Label>
                  <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                    <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU:</Label>
                    <Input
                      placeholder="SKU"
                      value={newProductSku}
                      onChange={(e) => setNewProductSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selling Price (Inc. Tax):</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDialogOpen(false)}
                  disabled={productSubmitting}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-purple-700"
                  disabled={productSubmitting}
                >
                  {productSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Form>
    </div>
  );
}

function InfoIcon({ title }: { title?: string }) {
  return (
    <span title={title} className="inline-flex items-center">
      <Info className="h-3.5 w-3.5 text-purple-400 bg-purple-100 rounded-full p-0.5" />
    </span>
  );
}


// import React, { useEffect, useState, useRef } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { saleSchema, type SaleFormValues } from "../../utils/validation";
// import { Card, CardContent } from "../../components/ui/card";
// import { Input } from "../../components/ui/input";
// import { Label } from "../../components/ui/label";
// import { Button } from "../../components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../components/ui/select";
// import { Textarea } from "../../components/ui/textarea";
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "../../components/ui/dialog";
// import { Checkbox } from "../../components/ui/checkbox";
// import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
// import { Calendar } from "../../components/ui/calendar";
// import { format } from "date-fns";
// import { toast } from "sonner";
// import { ApiService } from "../../../api/ApiService";
// import { Plus, Search, Trash2, CalendarIcon, Loader2, Info, X } from "lucide-react";
// import { useCurrency } from "../../contexts/CurrencyContext";

// // --- Types ---
// interface Product {
//   id: number;
//   name: string;
//   sku?: string;
//   price?: number;
//   type: "product" | "service";
// }

// interface SaleItem {
//   itemId: number;
//   itemType: "product" | "service";
//   itemName: string;
//   price: number;
//   quantity: number;
//   lineTotal: number;
// }

// export function AddSale() {
//   const { format: formatCurrency, symbol } = useCurrency();
//   // Main Data
//   const [customers, setCustomers] = useState<any[]>([]);
//   const [locations, setLocations] = useState<any[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);

//   // Form State
//   const [customerId, setCustomerId] = useState("");
//   const [locationId, setLocationId] = useState("");
//   const [saleDate, setSaleDate] = useState<Date>(new Date());
//   const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

//   // Adjustments
//   const [discountAmount, setDiscountAmount] = useState<string>("");
//   const [taxPercent, setTaxPercent] = useState<string>("");
//   const [shippingDetails, setShippingDetails] = useState("");
//   const [shippingAddress, setShippingAddress] = useState("");
//   const [shippingStatus, setShippingStatus] = useState("pending");
//   const [deliveredTo, setDeliveredTo] = useState("");
//   const [deliveryPerson, setDeliveryPerson] = useState("");
//   const [shippingCharges, setShippingCharges] = useState<string>("");
//   // Payment
//   const [paymentAmount, setPaymentAmount] = useState<string>("");
//   const [paymentNote, setPaymentNote] = useState("");

//   // Card Payment Details
//   const [cardHolder, setCardHolder] = useState("");
//   const [cardType, setCardType] = useState("Visa");
//   const [cardTransactionNo, setCardTransactionNo] = useState("");
//   const [cardNumber, setCardNumber] = useState("");

//   // Cheque Payment Details
//   const [chequeNo, setChequeNo] = useState("");
//   const [chequeBank, setChequeBank] = useState("");
//   const [chequeDate, setChequeDate] = useState<Date | undefined>(undefined);
//   const [accountHolder, setAccountHolder] = useState("");

//   // Metadata for Quick Add
//   const [units, setUnits] = useState<any[]>([]);
//   const [brands, setBrands] = useState<any[]>([]);
//   const [categories, setCategories] = useState<any[]>([]);

//   // Quick Add Product States
//   const [productDialogOpen, setProductDialogOpen] = useState(false);
//   const [newProductName, setNewProductName] = useState("");
//   const [newProductUnit, setNewProductUnit] = useState("");
//   const [newProductBrand, setNewProductBrand] = useState("");
//   const [newProductCategory, setNewProductCategory] = useState("");
//   const [newProductSku, setNewProductSku] = useState("");
//   const [newProductPrice, setNewProductPrice] = useState("");
//   const [productSubmitting, setProductSubmitting] = useState(false);

//   // Search
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const form = useForm<SaleFormValues>({
//     resolver: zodResolver(saleSchema),
//     defaultValues: {
//       status: "paid",
//       paymentMethod: "cash",
//       discountType: "fixed",
//       note: "",
//       customerId: undefined,
//       amountPaid: 0,
//       taxPercent: 0,
//       discountAmount: 0,
//       discountRate: 0,
//       items: [],
//     },
//   });

//   const status = form.watch("status");
//   const discountType = form.watch("discountType");
//   const paymentMethod = form.watch("paymentMethod");
//   const notes = form.watch("note");

//   const searchDropdownRef = useRef<HTMLDivElement>(null);


//   //term states 
//   const [payTermValue, setPayTermValue] = useState<string>("");
//   const [payTermType, setPayTermType] = useState<string>("days");
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const [custRes, locRes, prodRes, unitRes, brandRes, catRes] = await Promise.all([
//           ApiService.customers.getAll(),
//           ApiService.staff.getBranches(),
//           ApiService.products.getAll({ limit: 1000 }),
//           ApiService.units.getAll(),
//           ApiService.brands.getAll(),
//           ApiService.categories.getAll(),
//         ]);

//         setCustomers(Array.isArray(custRes) ? custRes : custRes.data || []);
//         setLocations(Array.isArray(locRes) ? locRes : locRes.data || []);
//         setUnits(unitRes.data || []);
//         setBrands(brandRes.data || []);
//         setCategories(catRes.data || []);

//         const prodData = prodRes.data || prodRes || [];
//         const prods = (Array.isArray(prodData) ? prodData : []).map((p: any) => ({
//           id: p.id,
//           name: p.name,
//           sku: p.sku,
//           price: parseFloat(p.sellingPriceInc || p.sellingPriceExc) || 0,
//           type: "product",
//         }));
//         setProducts(prods);
//       } catch (err) {
//         console.error("Failed to load screen data", err);
//         toast.error("Failed to load initial data");
//       }
//     };
//     loadData();
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
//         setShowDropdown(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     if (!searchTerm.trim()) {
//       setFilteredProducts([]);
//       return;
//     }
//     const term = searchTerm.toLowerCase();
//     const filtered = products.filter(
//       (p) =>
//         p.name.toLowerCase().includes(term) ||
//         (p.sku && p.sku.toLowerCase().includes(term))
//     );
//     setFilteredProducts(filtered.slice(0, 10));
//   }, [searchTerm, products]);

//   // Totals Calculation
//   const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
//   const discountVal =
//     discountType === "percentage"
//       ? (subtotal * (parseFloat(discountAmount) || 0)) / 100
//       : parseFloat(discountAmount) || 0;
//   const taxableAmount = subtotal - discountVal;
//   const taxVal = (taxableAmount * (parseFloat(taxPercent) || 0)) / 100;
//   const shippingVal = parseFloat(shippingCharges) || 0;
//   const total = Math.max(0, taxableAmount + taxVal + shippingVal);

//   const handleSelectProduct = (product: Product) => {
//     const existing = saleItems.find((i) => i.itemId === product.id);
//     if (existing) {
//       setSaleItems((prev) =>
//         prev.map((i) =>
//           i.itemId === product.id
//             ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.price }
//             : i
//         )
//       );
//     } else {
//       setSaleItems((prev) => [
//         ...prev,
//         {
//           itemId: product.id,
//           itemType: product.type as "product" | "service",
//           itemName: product.name,
//           price: product.price || 0,
//           quantity: 1,
//           lineTotal: product.price || 0,
//         },
//       ]);
//     }
//     setSearchTerm("");
//     setShowDropdown(false);
//   };

//   const handleRemoveItem = (id: number) => {
//     setSaleItems((prev) => prev.filter((i) => i.itemId !== id));
//   };

//   const handleUpdateQty = (id: number, qty: string) => {
//     const nQty = parseInt(qty) || 0;
//     setSaleItems((prev) =>
//       prev.map((i) =>
//         i.itemId === id ? { ...i, quantity: nQty, lineTotal: nQty * i.price } : i
//       )
//     );
//   };

//   const handleSubmitProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newProductName.trim()) { toast.error("Product name is required"); return; }
//     if (!newProductUnit) { toast.error("Unit is required"); return; }

//     setProductSubmitting(true);
//     try {
//       const formData = new FormData();
//       formData.append("name", newProductName.trim());
//       formData.append("unitId", newProductUnit);
//       if (newProductBrand && newProductBrand !== "none") formData.append("brandId", newProductBrand);
//       if (newProductCategory && newProductCategory !== "none") formData.append("categoryId", newProductCategory);
//       if (newProductSku) formData.append("sku", newProductSku);
//       if (newProductPrice) formData.append("sellingPriceInc", newProductPrice);
//       formData.append("productType", "single");

//       const res = await ApiService.products.createWithFile(formData);
//       toast.success("Product added successfully");
//       setProductDialogOpen(false);

//       if (res.data) {
//         const newProd: Product = {
//           id: res.data.id,
//           name: res.data.name,
//           sku: res.data.sku,
//           price: parseFloat(res.data.sellingPriceInc || res.data.sellingPriceExc) || 0,
//           type: "product",
//         };
//         setProducts((prev) => [...prev, newProd]);
//         handleSelectProduct(newProd);
//       }

//       setNewProductName("");
//       setNewProductUnit("");
//       setNewProductBrand("");
//       setNewProductCategory("");
//       setNewProductSku("");
//       setNewProductPrice("");

//     } catch (err: any) {
//       toast.error(err.response?.data?.message || "Failed to add product");
//     } finally {
//       setProductSubmitting(false);
//     }
//   };

//   const handleSubmit = form.handleSubmit(async () => {
//     if (!locationId) { toast.error("Please select a branch"); return; }
//     if (saleItems.length === 0) { toast.error("Please add at least one item"); return; }

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         customerId: customerId ? parseInt(customerId) : null,
//         branchId: parseInt(locationId),
//         status,
//         saleDate: saleDate,
//         items: saleItems,
//         discountType,
//         discountAmount: discountVal,
//         discountRate: discountType === "percentage" ? parseFloat(discountAmount) : 0,
//         taxPercent: parseFloat(taxPercent) || 0,
//         shippingDetails,
//         shippingAddress,
//         shippingStatus,
//         deliveredTo,
//         deliveryPerson,
//         shippingCharges: shippingVal,
//         payTermNumber: parseInt(payTermValue) || 0,
//         payTermType: payTermType,
//         amountPaid: parseFloat(paymentAmount) || 0,
//         paymentMethod,
//         note: notes,
//         total,
//         paymentDetails: {
//           cardHolder: paymentMethod === "card" ? cardHolder : null,
//           cardType: paymentMethod === "card" ? cardType : null,
//           cardNumber: paymentMethod === "card" ? cardNumber : null,
//           transactionId: paymentMethod === "card" ? cardTransactionNo : null,
//           chequeNo: paymentMethod === "cheque" ? chequeNo : null,
//           chequeBankName: paymentMethod === "cheque" ? chequeBank : null,
//           chequeDate: paymentMethod === "cheque" ? chequeDate : null,
//           chequeAccountName: paymentMethod === "cheque" ? accountHolder : null,
//           note: paymentNote,
//         },
//         totalItems: saleItems.length,
//         totalQuantity: saleItems.reduce((sum, item) => sum + item.quantity, 0),
//       };

//       localStorage.setItem("salon_selected_branch_id", locationId);
//       await ApiService.sales.submit(payload);
//       toast.success("Sale recorded successfully");

//       toast.success("Sale recorded successfully");

//       // Reset main sale form
//       setCustomerId("");
//       setLocationId("");
//       setSaleDate(new Date());
//       setSaleItems([]);

//       // Reset adjustments
//       setDiscountAmount("");
//       setTaxPercent("");
//       setShippingDetails("");
//       setShippingAddress("");
//       setShippingStatus("pending");
//       setDeliveredTo("");
//       setDeliveryPerson("");
//       setShippingCharges("");

//       // Reset payment
//       setPaymentAmount("");
//       setPaymentNote("");
//       form.reset({
//         status: "paid",
//         paymentMethod: "cash",
//         discountType: "fixed",
//         note: "",
//         customerId: undefined,
//         amountPaid: 0,
//         taxPercent: 0,
//         discountAmount: 0,
//         discountRate: 0,
//         items: [],
//       });

//       // Reset card details
//       setCardHolder("");
//       setCardType("Visa");
//       setCardTransactionNo("");
//       setCardNumber("");

//       // Reset cheque details
//       setChequeNo("");
//       setChequeBank("");
//       setChequeDate(undefined);
//       setAccountHolder("");

//       // Reset search
//       setSearchTerm("");
//       setShowDropdown(false);

//       // Reset pay term
//       setPayTermValue("");
//       setPayTermType("days");
//     } catch (err: any) {
//       toast.error(err.response?.data?.message || "Failed to submit sale");
//     } finally {
//       setIsSubmitting(false);
//     }
//   });

//   return (
//     <div className="space-y-3 w-full mx-auto pb-10 mt-1 px-3">
//       <h1 className="text-2xl font-bold text-primary">Add new sale</h1>

//       <Form {...form}>
//       {/* ── SECTION 1: Customer & Sale Info ─────────────────────────────────── */}
//       <Card className="shadow-sm">
//         <CardContent className="p-5 space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

//             <div className="space-y-1">
//               <Label>Customer:</Label>
//               <div className="flex gap-2">
//                 <Select value={customerId} onValueChange={setCustomerId}>
//                   <SelectTrigger className="flex-1">
//                     <SelectValue placeholder="Walk-in Customer" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value=" ">Walk-in Customer</SelectItem>
//                     {customers.map((c) => (
//                       <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <Button
//                   variant="outline"
//                   size="icon"
//                   className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100"
//                 >
//                   <Plus className="h-4 w-4" />
//                 </Button>
//               </div>
//             </div>

//             <div className="space-y-1">
//               <Label>Business Location:*</Label>
//               <Select value={locationId} onValueChange={setLocationId}>
//                 <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
//                 <SelectContent>
//                   {locations.map((loc) => (
//                     <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-1">
//               <Label>Sale Date:*</Label>
//               <Popover>
//                 <PopoverTrigger asChild>
//                   <Button variant="outline" className="w-full justify-start text-left font-normal">
//                     <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
//                     {format(saleDate, "PPP")}
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-auto p-0" align="start">
//                   <Calendar mode="single" selected={saleDate} onSelect={(d) => d && setSaleDate(d)} />
//                 </PopoverContent>
//               </Popover>
//             </div>

//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="space-y-1">
//               <Label>Sale Status:*</Label>
//               <Select value={status} onValueChange={(v) => form.setValue("status", v)}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="paid">Final (Paid)</SelectItem>
//                   <SelectItem value="credit">Credit (Unpaid)</SelectItem>
//                   <SelectItem value="partial">Partial</SelectItem>
//                   <SelectItem value="draft">Draft</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-1">
//               <Label>Pay Term Value:</Label>
//               <Input
//                 type="number"
//                 placeholder="0"
//                 value={payTermValue}
//                 onChange={(e) => setPayTermValue(e.target.value)}
//               />
//             </div>

//             <div className="space-y-1">
//               <Label>Pay Term Type:</Label>
//               <Select value={payTermType} onValueChange={setPayTermType}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select Term Type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="days">Days</SelectItem>
//                   <SelectItem value="months">Months</SelectItem>
//                 </SelectContent>
//               </Select>

//             </div>
//           </div>


//         </CardContent>
//       </Card>

//       {/* ── SECTION 2: Item Selection ─────────────────────────────────────── */}
//       <Card className="shadow-sm">
//         <CardContent className="p-5 space-y-4">

//           {/* Search Bar */}
//           <div className="space-y-1">
//             <Label className="flex items-center gap-1">
//               Add Products:* <InfoIcon title="Search by product name or SKU" />
//             </Label>
//             <div className="flex gap-2">
//               <div className="relative flex-1" ref={searchDropdownRef}>
//                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
//                   <Search className="h-4 w-4" />
//                 </span>
//                 <Input
//                   placeholder="Search Products by name or SKU..."
//                   className="pl-9 bg-gray-50 border-purple-200 focus-visible:ring-purple-500"
//                   value={searchTerm}
//                   onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
//                   onFocus={() => setShowDropdown(true)}
//                 />
//                 {showDropdown && filteredProducts.length > 0 && (
//                   <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded-md max-h-60 overflow-y-auto">
//                     {filteredProducts.map((p) => (
//                       <div
//                         key={p.id}
//                         className="px-4 py-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
//                         onClick={() => handleSelectProduct(p)}
//                       >
//                         <div>
//                           <span className="font-medium text-gray-800">{p.name}</span>
//                           <span className="ml-2 text-xs text-gray-400">SKU: {p.sku || "N/A"}</span>
//                         </div>
//                         <span className="text-gray-500 text-sm font-semibold">
//                           {formatCurrency(p.price || 0)}
//                         </span>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//               <Button
//                 variant="outline"
//                 className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100 flex items-center gap-1 px-4"
//                 onClick={() => setProductDialogOpen(true)}
//               >
//                 <Plus className="h-4 w-4" /> New Product
//               </Button>
//             </div>
//           </div>

//           {/* Items Table */}
//           <div className="overflow-x-auto border rounded-md mt-2">
//             <table className="w-full text-sm border-collapse">
//               <thead className="bg-primary text-white">
//                 <tr>
//                   <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c] w-10">#</th>
//                   <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c]">Product / Service</th>
//                   <th className="px-4 py-2 text-center font-semibold border-r border-[#4cae4c] w-32">Qty</th>
//                   <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Unit Price</th>
//                   <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Line Total</th>
//                   <th className="px-4 py-2 w-12 text-center"></th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white">
//                 {saleItems.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="p-8 text-center text-gray-500 bg-gray-50 border-t">
//                       Search and add products to start building a sale.
//                     </td>
//                   </tr>
//                 ) : (
//                   saleItems.map((item, idx) => (
//                     <tr key={item.itemId} className="border-t hover:bg-gray-50/50">
//                       <td className="px-4 py-3 text-gray-400 font-medium border-r">{idx + 1}</td>
//                       <td className="px-4 py-3 font-semibold text-gray-800 border-r">{item.itemName}</td>
//                       <td className="px-4 py-3 border-r">
//                         <Input
//                           type="number"
//                           className="h-8 text-center"
//                           value={item.quantity}
//                           onChange={(e) => handleUpdateQty(item.itemId, e.target.value)}
//                         />
//                       </td>
//                       <td className="px-4 py-3 text-right text-gray-600 border-r">
//                         {formatCurrency(item.price)}
//                       </td>
//                       <td className="px-4 py-3 text-right font-bold text-primary border-r">
//                         {formatCurrency(item.lineTotal)}
//                       </td>
//                       <td className="px-4 py-3 text-center">
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
//                           onClick={() => handleRemoveItem(item.itemId)}
//                         >
//                           <X className="h-5 w-5 stroke-[3px]" />
//                         </Button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//                 {saleItems.length > 0 && (
//                   <tr className="bg-gray-50 border-t-2">
//                     <td colSpan={3} className="px-4 py-3 font-bold text-gray-700 border-r">
//                       Total Items: {saleItems.reduce((s, i) => s + i.quantity, 0)}
//                     </td>
//                     <td className="px-4 py-3 text-right font-bold text-gray-700 border-r">Sub-total:</td>
//                     <td className="px-4 py-3 text-right font-bold text-gray-900 border-r">
//                       {formatCurrency(subtotal)}
//                     </td>
//                     <td></td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//         </CardContent>
//       </Card>

//       {/* ── SECTION 3: Discount, Tax & Shipping ──────────────────────────── */}
//       <Card className="shadow-sm">
//         <CardContent className="p-5 space-y-4">

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="space-y-1">
//               <Label>Discount Type:</Label>
//               <Select value={discountType} onValueChange={(v) => form.setValue("discountType", v)}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="fixed">Fixed Amount</SelectItem>
//                   <SelectItem value="percentage">Percentage (%)</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-1">
//               <Label>Discount Value:</Label>
//               <Input
//                 placeholder="0.00"
//                 value={discountAmount}
//                 onChange={(e) => setDiscountAmount(e.target.value)}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label className="flex items-center gap-1">
//                 Order Tax (%): <InfoIcon title="Applied after discount" />
//               </Label>
//               <Input
//                 placeholder="0.00"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(e.target.value)}
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="space-y-1">
//               <Label className="flex items-center gap-1">
//                 Shipping Description: <InfoIcon title="Recipient, courier info" />
//               </Label>
//               <Input
//                 placeholder="Recipient, courier, etc."
//                 value={shippingDetails}
//                 onChange={(e) => setShippingDetails(e.target.value)}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Shipping Status:</Label>
//               <Select value={shippingStatus} onValueChange={setShippingStatus}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="pending">Pending</SelectItem>
//                   <SelectItem value="ordered">Ordered</SelectItem>
//                   <SelectItem value="shipped">Shipped</SelectItem>
//                   <SelectItem value="delivered">Delivered</SelectItem>
//                   <SelectItem value="cancelled">Cancelled</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-1">
//               <Label>Shipping Charges:</Label>
//               <Input
//                 placeholder="0.00"
//                 value={shippingCharges}
//                 onChange={(e) => setShippingCharges(e.target.value)}
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="space-y-1">
//               <Label>Delivered To (Name):</Label>
//               <Input
//                 placeholder="Recipient customer name"
//                 value={deliveredTo}
//                 onChange={(e) => setDeliveredTo(e.target.value)}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Delivery Person:</Label>
//               <Input
//                 placeholder="Staff or Courier"
//                 value={deliveryPerson}
//                 onChange={(e) => setDeliveryPerson(e.target.value)}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Shipping Address:</Label>
//               <Input
//                 placeholder="Full delivery address"
//                 value={shippingAddress}
//                 onChange={(e) => setShippingAddress(e.target.value)}
//               />
//             </div>
//           </div>

//           <FormField
//             control={form.control}
//             name="note"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Additional Notes:</FormLabel>
//                 <FormControl>
//                   <textarea
//                     className="w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 min-h-[80px] border rounded-md"
//                     placeholder="Notes for the invoice..."
//                     {...field}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Order Summary */}
//           <div className="overflow-x-auto border rounded-md mt-4">
//             <table className="w-full text-sm border-collapse">
//               <thead className="bg-primary text-white">
//                 <tr>
//                   <th className="px-4 py-2 text-left font-semibold" colSpan={2}>Order Summary</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white">
//                 <tr className="border-t">
//                   <td className="px-4 py-2 text-gray-600 border-r w-48">Subtotal</td>
//                   <td className="px-4 py-2 font-medium">{formatCurrency(subtotal)}</td>
//                 </tr>
//                 <tr className="border-t">
//                   <td className="px-4 py-2 text-gray-600 border-r">Discount (-)</td>
//                   <td className="px-4 py-2 font-medium text-red-500">-{formatCurrency(discountVal)}</td>
//                 </tr>
//                 <tr className="border-t">
//                   <td className="px-4 py-2 text-gray-600 border-r">Tax (+)</td>
//                   <td className="px-4 py-2 font-medium">{formatCurrency(taxVal)}</td>
//                 </tr>
//                 <tr className="border-t">
//                   <td className="px-4 py-2 text-gray-600 border-r">Shipping (+)</td>
//                   <td className="px-4 py-2 font-medium">{formatCurrency(shippingVal)}</td>
//                 </tr>
//                 <tr className="border-t-2 bg-secondary/30">
//                   <td className="px-4 py-3 font-bold text-gray-800 border-r">Total Payable</td>
//                   <td className="px-4 py-3 font-bold text-xl text-primary">{formatCurrency(total)}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//         </CardContent>
//       </Card>

//       {/* ── SECTION 4: Payment ────────────────────────────────────────────── */}
//       <Card className="shadow-sm">
//         <CardContent className="p-5 space-y-4">

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="space-y-1">
//               <Label>Paid Amount:*</Label>
//               <Input
//                 placeholder="0.00"
//                 value={paymentAmount}
//                 onChange={(e) => setPaymentAmount(e.target.value)}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Payment Method:*</Label>
//               <Select value={paymentMethod} onValueChange={(v) => form.setValue("paymentMethod", v)}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="cash">Cash Payment</SelectItem>
//                   <SelectItem value="card">Card / Digital Payment</SelectItem>
//                   <SelectItem value="cheque">Bank Cheque</SelectItem>
//                   <SelectItem value="other">Other / Bank Transfer</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-1">
//               <Label>Payment Note:</Label>
//               <Input
//                 placeholder="Ref #, Bank info, etc."
//                 value={paymentNote}
//                 onChange={(e) => setPaymentNote(e.target.value)}
//               />
//             </div>
//           </div>

//           {/* Card Payment Fields */}
//           {paymentMethod === "card" && (
//             <div className="overflow-x-auto border rounded-md mt-2">
//               <table className="w-full text-sm border-collapse">
//                 <thead className="bg-primary text-white">
//                   <tr>
//                     <th className="px-4 py-2 text-left font-semibold border-r border-purple-400">Card Holder</th>
//                     <th className="px-4 py-2 text-left font-semibold border-r border-purple-400">Card Type</th>
//                     <th className="px-4 py-2 text-left font-semibold border-r border-purple-400">Card No. (Last 4)</th>
//                     <th className="px-4 py-2 text-left font-semibold">Transaction ID</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   <tr className="border-t">
//                     <td className="px-4 py-3 border-r">
//                       <Input placeholder="As on card" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
//                     </td>
//                     <td className="px-4 py-3 border-r">
//                       <Select value={cardType} onValueChange={setCardType}>
//                         <SelectTrigger><SelectValue /></SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="Visa">Visa</SelectItem>
//                           <SelectItem value="Mastercard">Mastercard</SelectItem>
//                           <SelectItem value="Amex">Amex</SelectItem>
//                           <SelectItem value="Other">Other</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </td>
//                     <td className="px-4 py-3 border-r">
//                       <Input placeholder="1234" maxLength={4} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
//                     </td>
//                     <td className="px-4 py-3">
//                       <Input placeholder="TXN-XXXX" value={cardTransactionNo} onChange={(e) => setCardTransactionNo(e.target.value)} />
//                     </td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* Cheque Payment Fields */}
//           {paymentMethod === "cheque" && (
//             <div className="overflow-x-auto border rounded-md mt-2">
//               <table className="w-full text-sm border-collapse">
//                 <thead className="bg-primary text-white">
//                   <tr>
//                     <th className="px-4 py-2 text-left font-semibold border-r border-purple-400">Cheque Number</th>
//                     <th className="px-4 py-2 text-left font-semibold border-r border-purple-400">Bank Name</th>
//                     <th className="px-4 py-2 text-left font-semibold border-r border-purple-400">Cheque Date</th>
//                     <th className="px-4 py-2 text-left font-semibold">Account Holder</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   <tr className="border-t">
//                     <td className="px-4 py-3 border-r">
//                       <Input placeholder="Number" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
//                     </td>
//                     <td className="px-4 py-3 border-r">
//                       <Input placeholder="Bank Name" value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} />
//                     </td>
//                     <td className="px-4 py-3 border-r">
//                       <Popover>
//                         <PopoverTrigger asChild>
//                           <Button variant="outline" className="w-full justify-start text-left font-normal">
//                             <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
//                             {chequeDate ? format(chequeDate, "PPP") : "Select Date"}
//                           </Button>
//                         </PopoverTrigger>
//                         <PopoverContent className="w-auto p-0" align="start">
//                           <Calendar mode="single" selected={chequeDate} onSelect={setChequeDate} />
//                         </PopoverContent>
//                       </Popover>
//                     </td>
//                     <td className="px-4 py-3">
//                       <Input placeholder="Name" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
//                     </td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           )}

//         </CardContent>
//       </Card>

//       {/* ── Action Buttons ────────────────────────────────────────────────── */}
//       <div className="flex justify-center gap-4 pt-2 pb-6">
//         <Button variant="outline" onClick={() => window.history.back()}>
//           Cancel
//         </Button>
//         <Button
//           onClick={handleSubmit}
//           disabled={isSubmitting}
//           className="bg-primary hover:bg-primary px-6"
//         >
//           {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
//           {isSubmitting ? "Saving..." : "Save"}
//         </Button>
//       </div>

//       {/* ── Quick Add Product Dialog ──────────────────────────────────────── */}
//       <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader>
//             <DialogTitle>Quick Add Product</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={handleSubmitProduct}>
//             <div className="grid gap-4 py-4">
//               <div className="space-y-2">
//                 <Label>Product Name:*</Label>
//                 <Input
//                   placeholder="Product Name"
//                   value={newProductName}
//                   onChange={(e) => setNewProductName(e.target.value)}
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <Label>Unit:*</Label>
//                   <Select value={newProductUnit} onValueChange={setNewProductUnit}>
//                     <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
//                     <SelectContent>
//                       {units.map((u) => (
//                         <SelectItem key={u.id} value={String(u.id)}>{u.actual_name || u.name}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Brand:</Label>
//                   <Select value={newProductBrand} onValueChange={setNewProductBrand}>
//                     <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="none">None</SelectItem>
//                       {brands.map((b) => (
//                         <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label>Category:</Label>
//                 <Select value={newProductCategory} onValueChange={setNewProductCategory}>
//                   <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="none">None</SelectItem>
//                     {categories.map((c) => (
//                       <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <Label>SKU:</Label>
//                   <Input
//                     placeholder="SKU"
//                     value={newProductSku}
//                     onChange={(e) => setNewProductSku(e.target.value)}
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Selling Price (Inc. Tax):</Label>
//                   <Input
//                     type="number"
//                     placeholder="0.00"
//                     value={newProductPrice}
//                     onChange={(e) => setNewProductPrice(e.target.value)}
//                   />
//                 </div>
//               </div>
//             </div>

//             <DialogFooter className="flex gap-2 justify-end">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => setProductDialogOpen(false)}
//                 disabled={productSubmitting}
//               >
//                 Close
//               </Button>
//               <Button
//                 type="submit"
//                 className="bg-primary hover:bg-purple-700"
//                 disabled={productSubmitting}
//               >
//                 {productSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
//                 Save
//               </Button>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
//       </Form>
//     </div>
//   );
// }

// function InfoIcon({ title }: { title?: string }) {
//   return (
//     <span title={title} className="inline-flex items-center">
//       <Info className="h-3.5 w-3.5 text-purple-400 bg-purple-100 rounded-full p-0.5" />
//     </span>
//   );
// }