import React, { useEffect, useState, useCallback } from "react";
import { useBranch } from "../../contexts/BranchContext";
import { COLORS } from '../../constants/colors';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Textarea } from "../../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../../components/ui/sheet";
import { Search, Plus, Info, CalendarIcon, ChevronDown, Trash2, Loader2, User, Banknote, CreditCard, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useCurrency } from "../../contexts/CurrencyContext";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { purchaseSchema, PurchaseFormValues } from "../../utils/validation";

import { ApiService } from "../../../api/ApiService";

interface Product {
  id: number;
  name: string;
  sku?: string;
  barcode?: string;
  purchasePriceExc?: number;
  sellingPriceInc?: number;
}


export function AddPurchase() {
  const { format: formatCurrency, symbol } = useCurrency();
  const { selectedBranchId } = useBranch();
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [suppliers, setSuppliers] = useState<Array<{ id: number, name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: number, name: string }>>([]);

  const [refNo, setRefNo] = useState("");
  const [locationId, setLocationId] = useState("");
  const [payTermAmount, setPayTermAmount] = useState("");
  const [payTermType, setPayTermType] = useState("days");
  const [purchaseStatus, setPurchaseStatus] = useState("received");

  const [discountType, setDiscountType] = useState("none");

  const [purchaseTax, setPurchaseTax] = useState("none");


  const [shippingDetails, setShippingDetails] = useState("");

  const [showAdditionalExpenses, setShowAdditionalExpenses] = useState(false);
  const [additionalExpenses, setAdditionalExpenses] = useState([
    { name: "", amount: "" },
    { name: "", amount: "" },
    { name: "", amount: "" },
    { name: "", amount: "" },
  ]);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAccount, setPaymentAccount] = useState("none");
  const [paymentNote, setPaymentNote] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);

  // Quick Add Product States
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductType, setNewProductType] = useState("single");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductAlertQty, setNewProductAlertQty] = useState("");
  const [productSubmitting, setProductSubmitting] = useState(false);

  // NEW FIELDS
  const [weight, setWeight] = useState("");
const [rate, setRate] = useState("");
const [transportName, setTransportName] = useState("");
const [lorryNo, setLorryNo] = useState("");

  const [units, setUnits] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: undefined,
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      discountAmount: 0,
      shippingCharges: 0,
      notes: "",
      items: [],
    },
  });

  const watchedDiscountAmount = purchaseForm.watch("discountAmount");
  const watchedShippingCharges = purchaseForm.watch("shippingCharges");

  const [chequeNo, setChequeNo] = useState("");
  const [externalAccountNo, setExternalAccountNo] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    ApiService.suppliers.getAll({ limit: 100 })
      .then(res => {
        const data = res.data || res;
        setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Failed to load suppliers", err));

    ApiService.staff.getBranches()
      .then(res => {
        const data = res.data || res;
        setLocations(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Failed to load locations", err));

    ApiService.products.getAll()
      .then(res => {
        const data = res.data || res;
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Failed to load Products", err))

    ApiService.accounts.getAll()
      .then(res => setAccounts(res.data || []))
      .catch(() => { });

    // Fetch dropdown values for quick-add product
    ApiService.units.getAll().then(res => setUnits(res.data || [])).catch(() => { });
    ApiService.brands.getAll().then(res => setBrands(res.data || [])).catch(() => { });
    ApiService.categories.getAll().then(res => setCategories(res.data || [])).catch(() => { });
  }, [selectedBranchId]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts([]);
      return;
    }

    const term = searchTerm.toLowerCase();


    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term)
    );

    setFilteredProducts(filtered.slice(0, 8)); // max 8 results
  }, [searchTerm, products]);
  const openCreate = () => {
    setFormMode("create");
    setFormName("");
    setFormContactPerson("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setDialogOpen(true);
  };

  const openProductCreate = () => {
    setNewProductName("");
    setNewProductUnit("");
    setNewProductBrand("");
    setNewProductCategory("");
    setNewProductSku("");
    setNewProductBarcode("");
    setNewProductAlertQty("");
    setProductDialogOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) { toast.error("Product name is required"); return; }
    if (!newProductUnit) { toast.error("Unit is required"); return; }

    setProductSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", newProductName.trim());
      formData.append("unit", newProductUnit);
      if (newProductBrand) formData.append("brand", newProductBrand);
      if (newProductCategory) formData.append("category", newProductCategory);
      if (newProductSku) formData.append("sku", newProductSku);
      if (newProductBarcode) formData.append("barcode", newProductBarcode);
      if (newProductAlertQty) formData.append("alertQuantity", newProductAlertQty);
      formData.append("productType", newProductType);

      const res = await ApiService.products.createWithFile(formData);
      toast.success("Product added successfully");
      setProductDialogOpen(false);

      // Update local product list and select it
      if (res.data) {
        setProducts(prev => [...prev, res.data]);
        handleSelectProduct(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add product");
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setFormSubmitting(true);
    try {
      const body = {
        name: formName.trim(),
        contactPerson: formContactPerson.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
      };
      if (formMode === "create") {
        const res = await ApiService.suppliers.create(body);
        toast.success("Supplier added");
        setDialogOpen(false);
        if (res.data && res.data.id) {
          purchaseForm.setValue("supplierId", res.data.id);
          setSuppliers(prev => [...prev, res.data]);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalItems = purchaseItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const handleSelectProduct = (product: Product) => {
    const alreadyExists = purchaseItems.find((item) => item.productId === product.id);

    if (alreadyExists) {
      setPurchaseItems((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
    } else {
      setPurchaseItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitCost: product.purchasePriceExc || 0,
          discountPercent: 0,
          profitMargin: 0,
          sellingPrice: product.sellingPriceInc || 0,
        },
      ]);
    }

    setSearchTerm("");
    setFilteredProducts([]);
    setShowDropdown(false);
  };


  // Dynamic calculations for summary (assuming 0 Net Total from products for now)
 const calculateTotal = () => {
  const base = (Number(weight) || 0) * (Number(rate) || 0);

  let discountedBase = base;

  if (discountType === "fixed") {
    discountedBase -= watchedDiscountAmount || 0;
  } else if (discountType === "percentage") {
    discountedBase -= (base * (watchedDiscountAmount || 0)) / 100;
  }

  let taxAmount = 0;
  if (purchaseTax !== "none") {
    taxAmount = discountedBase * 0.05;
  }

  const shipping = watchedShippingCharges || 0;

  return Math.max(0, discountedBase + taxAmount + shipping);
};

  const purchaseTotal = calculateTotal();
  const paymentDue = Math.max(0, purchaseTotal - (Number(paymentAmount) || 0));
  useEffect(() => {
    // Hamesha Grand Total ke saath sync karo
    setPaymentAmount(purchaseTotal > 0 ? purchaseTotal.toFixed(2) : "");
  }, [purchaseTotal]);

  const handleSavePurchase = async (formData: PurchaseFormValues) => {
    if (!formData.supplierId) { toast.error("Please select a supplier"); return; }
if (!weight || !rate) {
  toast.error("Weight and Rate are required");
  return;
}
    setIsSaving(true);
    try {
      const w = Number(weight) || 0;
      const r = Number(rate) || 0;
const totalAmountVal = w * r;

      // Find Hen product — try name match first, then fallback to first product
      const henProduct = products.find(prod => prod.name.toLowerCase().includes('hen'))
        ?? products[0]
        ?? null;

      if (!henProduct) {
        toast.error("No product found. Please ensure a 'Hen' product exists in the system.");
        setIsSaving(false);
        return;
      }

      const itemsToSave = [
  {
    productId: henProduct.id,
    name: henProduct.name,
    qty: w,
    unitCost: r,
    discountPercent: 0,
    profitMargin: 0,
    sellingPrice: 0,
  },
];
      const payload = {
  supplierId: String(formData.supplierId ?? ""),
  refNo,
  locationId: selectedBranchId ? String(selectedBranchId) : locationId || null,
  purchaseDate,
  payTermAmount,
  payTermType,
  purchaseStatus,
  discountType,
  discountAmount: String(formData.discountAmount ?? 0),
  purchaseTax,
  additionalNotes: formData.notes,

  shippingDetails,
  shippingCharges: String(formData.shippingCharges ?? 0),

  paymentAmount: String(totalAmountVal),
  paymentMethod,
  paymentAccount,
  paymentNote,
  paymentDate: format(paymentDate, "yyyy-MM-dd"),

  rate: String(rate),
  weight: String(weight),
  lorryNo,
  transportName,

  items: itemsToSave,
  chequeNo: chequeNo || null,
  externalAccountNo: externalAccountNo || null,
};

      await ApiService.purchases.create(payload);

      toast.success("Purchase saved successfully");
      // Reset or navigate
      setPurchaseItems([]);
      purchaseForm.reset();
      setLocationId("");
      navigate("/purchases");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save purchase");
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-3 w-full mx-auto pb-10 mt-2 px-3">
      <h1 className="text-2xl font-bold text-primary">Add Purchase</h1>

      <Form {...purchaseForm}>
        {/* SECTION 1: Details */}
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <FormField
                control={purchaseForm.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier:*</FormLabel>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Select onValueChange={(v) => field.onChange(v ? Number(v) : undefined)} value={field.value != null ? String(field.value) : ""}>
                          <FormControl>
                            <SelectTrigger className="pl-9">
                              <SelectValue placeholder="Please select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map(s => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="icon" className="shrink-0 text-primary border-purple-200 bg-purple-50 hover:bg-purple-100" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1">
                <Label>Reference No:</Label>
                <Input
                  placeholder="Enter reference no"
                  value={refNo}
                  onChange={e => setRefNo(e.target.value)}
                />
              </div>


              {/* <div className="space-y-1">
              <Label>Business Location:*</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

              <div className="space-y-1">
                <Label>Purchase Date:*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {purchaseDate ? format(purchaseDate, "MM/dd/yyyy HH:mm") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={purchaseDate}
                      onSelect={(d) => d && setPurchaseDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <FormField
                  control={purchaseForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[80px] min-w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* <div className="space-y-1">
              <Label>Pay Term:</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Pay term"
                  className="flex-1"
                  value={payTermAmount}
                  onChange={e => setPayTermAmount(e.target.value)}
                />
                <Select value={payTermType} onValueChange={setPayTermType}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div> */}

              {/* <div className="space-y-1">
              <Label>Purchase Status:</Label>
              <Select value={purchaseStatus} onValueChange={setPurchaseStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label>Attach Document:</Label>
              <Input type="file" />
              <p className="text-xs text-gray-400">
                Max 5MB (.pdf, .csv, .zip, .doc, .docx, .jpg, .png)
              </p>
            </div> */}


            </div>
          </CardContent>
        </Card>

        {/* === NEW SECTIONS === */}
        <Card className="shadow-sm mt-4">
          <CardHeader className="border-b bg-gray-50/60 pb-3">
            <CardTitle className="text-lg">2. Purchase Details (Hen)</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Total Weight *</Label>
                <Input
                  type="number"
                  placeholder="Enter weight"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
<Label>Rate *</Label>                <Input
                  type="number"
                  placeholder="Enter price"
                  value={rate}
onChange={e => setRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 font-semibold text-primary flex items-center">
                  {formatCurrency((Number(weight) || 0) * (Number(rate) || 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm mt-4">
          <CardHeader className="border-b bg-gray-50/60 pb-3">
            <CardTitle className="text-lg">3. Transport Details</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Transport Name</Label>
                <Input
                  placeholder="Enter transport name"
                  value={transportName}
                  onChange={e => setTransportName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lorry No</Label>
                <Input
                  placeholder="Enter lory no"
                  value={lorryNo}
                  onChange={e => setLorryNo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4 gap-3 border-t border-gray-100 mt-6 mb-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-8 border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold"
            onClick={() => navigate("/purchases")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 px-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-md"
            onClick={purchaseForm.handleSubmit(handleSavePurchase)}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="h-5 w-5 mr-2" /> Save Purchase</>
            )}
          </Button>
        </div>

        {/* COMMENTED OUT OLD SECTIONS */}
        {false && (
        <>
        {/* SECTION 2: Import Products / Data Table */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="secondary" className="bg-primary text-white hover:bg-primary/90">
                Import Products
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter Product name / SKU / Scan bar code"
                  className="pl-9 bg-gray-50 border-purple-200 focus-visible:ring-purple-500"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          SKU: {p.sku || "N/A"} | Barcode: {p.barcode || "N/A"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="shrink-0 text-primary border-purple-200 bg-purple-50 hover:bg-purple-100 flex items-center gap-1 px-4"
                onClick={openProductCreate}
              >
                <Plus className="h-4 w-4" /> Add new product
              </Button>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <thead className="bg-primary text-white">
                  <tr className="border-none">
                    <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c] w-10">#</th>
                    <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c]">Product Name</th>
                    <th className="px-4 py-2 text-center font-semibold border-r border-[#4cae4c] w-32">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Unit Cost</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Disc %</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Line Total</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Profit Margin %</th>
                    <th className="px-4 py-2 text-right font-semibold border-r border-[#4cae4c] w-36">Selling Price</th>
                    <th className="px-4 py-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {purchaseItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 bg-gray-50 border-t">
                        Search and add products to start building a purchase.
                      </td>
                    </tr>
                  ) : (
                    purchaseItems.map((item, index) => (
                      <tr key={item.productId} className="border-t hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400 font-medium border-r">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 border-r">{item.name}</td>

                        <td className="px-4 py-3 border-r">
                          <Input
                            type="number"
                            className="h-8 text-center"
                            value={item.qty}
                            onChange={(e) =>
                              setPurchaseItems((prev) =>
                                prev.map((p) =>
                                  p.productId === item.productId
                                    ? { ...p, qty: Number(e.target.value) || 0 }
                                    : p
                                )
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3 text-right text-gray-600 border-r">
                          <Input
                            type="number"
                            className="h-8 text-right bg-transparent border-none focus:ring-0"
                            value={item.unitCost}
                            onChange={(e) =>
                              setPurchaseItems((prev) =>
                                prev.map((p) =>
                                  p.productId === item.productId
                                    ? { ...p, unitCost: Number(e.target.value) || 0 }
                                    : p
                                )
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 border-r">
                          <Input
                            type="number"
                            className="h-8 text-right bg-transparent border-none focus:ring-0"
                            value={item.discountPercent}
                            onChange={(e) =>
                              setPurchaseItems((prev) =>
                                prev.map((p) =>
                                  p.productId === item.productId
                                    ? { ...p, discountPercent: Number(e.target.value) || 0 }
                                    : p
                                )
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary border-r">
                          {formatCurrency(item.qty * item.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 border-r">
                          <Input
                            type="number"
                            className="h-8 text-right bg-transparent border-none focus:ring-0"
                            value={item.profitMargin}
                            onChange={(e) =>
                              setPurchaseItems((prev) =>
                                prev.map((p) =>
                                  p.productId === item.productId
                                    ? { ...p, profitMargin: Number(e.target.value) || 0 }
                                    : p
                                )
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 border-r">
                          <Input
                            type="number"
                            className="h-8 text-right bg-transparent border-none focus:ring-0"
                            value={item.sellingPrice}
                            onChange={(e) =>
                              setPurchaseItems((prev) =>
                                prev.map((p) =>
                                  p.productId === item.productId
                                    ? { ...p, sellingPrice: Number(e.target.value) || 0 }
                                    : p
                                )
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setPurchaseItems((prev) =>
                                prev.filter((p) => p.productId !== item.productId)
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>

            {/* Items Summary Table */}
            {purchaseItems.length > 0 && (
              <div className="overflow-x-auto border rounded-md mt-4">
                <table className="w-full text-sm border-collapse">
                  <tbody className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-700 border-r">Total Items: {totalItems}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700 border-r w-48">Net Total Amount:</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 w-48">
                        {formatCurrency(purchaseItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: Discounts & Taxes */}
        {/* <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Discount Type:</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FormField
              control={purchaseForm.control}
              name="discountAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Discount Amount:</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={e => field.onChange(Number(e.target.value) || 0)}
                      disabled={discountType === "none"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end items-end">
              <span className="font-semibold text-gray-800">
                Discount:(-) <span className="font-normal text-gray-600">
                  {symbol} {discountType === 'none' ? '0.00' : (discountType === 'percentage' ? `${((purchaseItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0)) * (watchedDiscountAmount || 0)) / 100}` : (watchedDiscountAmount || 0))}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Purchase Tax:</Label>
              <Select value={purchaseTax} onValueChange={setPurchaseTax}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="tax1">VAT (5%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden md:block"></div>
            <div className="flex justify-end items-end">
              <span className="font-semibold text-gray-800">
                Purchase Tax:(+) <span className="font-normal text-gray-600">{purchaseTax !== "none" ? "5.00%" : "0.00"}</span>
              </span>
            </div>
          </div>

          <FormField
            control={purchaseForm.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Additional Notes</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card> */}

        {/* SECTION 4: Shipping */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="md:col-span-1 space-y-2">
                <Label className="text-sm font-semibold">Shipping Details:</Label>
                <Input
                  placeholder=""
                  value={shippingDetails}
                  onChange={e => setShippingDetails(e.target.value)}
                />
              </div>
              <div className="md:col-span-1"></div>
              <FormField
                control={purchaseForm.control}
                name="shippingCharges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">(+) Additional Shipping charges:</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={e => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col items-center mb-6">
              <Button
                variant="secondary"
                className="bg-primary text-white hover:bg-primary/90 mb-6"
                onClick={() => setShowAdditionalExpenses(!showAdditionalExpenses)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add additional expenses
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdditionalExpenses ? 'rotate-180' : ''}`} />
              </Button>

              {showAdditionalExpenses && (
                <div className="w-full max-w-3xl grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="font-bold text-sm text-gray-800 border-b pb-2">Additional expense name</div>
                  <div className="font-bold text-sm text-gray-800 border-b pb-2">Amount</div>

                  {additionalExpenses.map((exp, idx) => (
                    <React.Fragment key={idx}>
                      <Input
                        placeholder=""
                        className="bg-white border-gray-300"
                        value={exp.name}
                        onChange={e => {
                          const newExp = [...additionalExpenses];
                          newExp[idx].name = e.target.value;
                          setAdditionalExpenses(newExp);
                        }}
                      />
                      <Input
                        placeholder="0"
                        className="bg-white border-gray-300"
                        value={exp.amount}
                        onChange={e => {
                          const newExp = [...additionalExpenses];
                          newExp[idx].amount = e.target.value;
                          setAdditionalExpenses(newExp);
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Final Order Summary */}
            <div className="overflow-x-auto border rounded-md mt-4">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold" colSpan={2}>Purchase Summary</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-t">
                    <td className="px-4 py-2 text-gray-600 border-r w-48">Net Total</td>
                    <td className="px-4 py-2 font-medium">{formatCurrency(purchaseItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0))}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 text-gray-600 border-r">Discount (-)</td>
                    <td className="px-4 py-2 font-medium text-red-500">
                      -{formatCurrency(discountType === 'none' ? 0 : (discountType === 'percentage' ? ((purchaseItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0)) * (watchedDiscountAmount || 0)) / 100 : (watchedDiscountAmount || 0)))}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 text-gray-600 border-r">Purchase Tax (+)</td>
                    <td className="px-4 py-2 font-medium">
                      {formatCurrency(((purchaseItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0)) - (discountType === 'none' ? 0 : (discountType === 'percentage' ? ((purchaseItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0)) * (watchedDiscountAmount || 0)) / 100 : (watchedDiscountAmount || 0)))) * (purchaseTax !== "none" ? 0.05 : 0))}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 text-gray-600 border-r">Shipping (+)</td>
                    <td className="px-4 py-2 font-medium">{formatCurrency(watchedShippingCharges || 0)}</td>
                  </tr>
                  {additionalExpenses.some(e => e.name && e.amount) && (
                    <tr className="border-t">
                      <td className="px-4 py-2 text-gray-600 border-r">Additional Expenses (+)</td>
                      <td className="px-4 py-2 font-medium text-gray-600">
                        {formatCurrency(additionalExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0))}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 bg-purple-50">
                    <td className="px-4 py-3 font-bold text-gray-800 border-r">Grand Total</td>
                    <td className="px-4 py-3 font-bold text-xl text-primary">{formatCurrency(purchaseTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Payment */}
        {/* SECTION 5: Payment */}
        <Card className="shadow-sm border-gray-200">
          <div className="bg-primary px-5 py-2 rounded-t-md">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Details
            </h2>
          </div>
          <CardContent className="p-6 space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

              {/* Payment Account — pehle */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Payment Account (Bank/Cash):</Label>
                <div className="relative">
                  <MoneyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
                  <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                    <SelectTrigger className="pl-9 h-10 border-gray-300">
                      <SelectValue placeholder="Cash (None)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Cash</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.bankName || acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-gray-400 italic mt-1 px-1">
                  If not selected, payment will be from Cash.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Amount:*</Label>
                <div className="relative">
                  <MoneyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="pl-9 h-10 border-gray-300"
                  />
                </div>
              </div>

              {/* Paid On */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Paid on:*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-10 border-gray-300">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {paymentDate ? format(paymentDate, "MM/dd/yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(d) => d && setPaymentDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Payment Method:*</Label>
                <div className="relative">
                  <MoneyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="pl-9 h-10 border-gray-300">
                      <SelectValue placeholder="Cash" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cheque No — conditional */}
              {paymentMethod === "cheque" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-sm font-medium text-gray-700">Cheque Number:</Label>
                  <Input
                    value={chequeNo}
                    onChange={e => setChequeNo(e.target.value)}
                    placeholder="Enter cheque number"
                    className="h-10 border-gray-300"
                  />
                </div>
              )}

              {/* External Account — conditional */}
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-sm font-medium text-gray-700">Recipient Account No:</Label>
                  <Input
                    value={externalAccountNo}
                    onChange={e => setExternalAccountNo(e.target.value)}
                    placeholder="Enter recipient account number"
                    className="h-10 border-gray-300"
                  />
                </div>
              )}
            </div>

            {/* Payment Note */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Payment Note:</Label>
              <Textarea
                className="min-h-[100px] border-gray-300"
                placeholder="Add any extra details or notes here..."
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
              />
            </div>

            {/* Payment Due */}
            <div className="flex justify-end pr-1">
              <span className="font-semibold text-gray-900">
                Payment due: <span className="font-normal text-gray-600">{formatCurrency(paymentDue)}</span>
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end pt-4 gap-3 border-t border-gray-100">
              <Button
                variant="outline"
                className="h-11 px-8 border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold"
                onClick={() => navigate("/purchase")}
              >
                Cancel
              </Button>
              <Button
                className="h-11 px-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-md"
                onClick={purchaseForm.handleSubmit(handleSavePurchase)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Save className="h-5 w-5 mr-2" /> Save Purchase</>
                )}
              </Button>
            </div>

          </CardContent>
        </Card>
        </>
        )}
      </Form>

      {/* dialog for supplier creation */}
      <Sheet open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl">{formMode === "create" ? "Add Supplier" : "Edit Supplier"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmitForm} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Name *</Label>
              <Input id="supplier-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Supplier or company name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-contact">Contact person</Label>
              <Input id="supplier-contact" value={formContactPerson} onChange={(e) => setFormContactPerson(e.target.value)} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input id="supplier-phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-email">Email</Label>
              <Input id="supplier-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Input id="supplier-address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Address" />
            </div>
            <SheetFooter className="flex flex-row gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={formSubmitting}>Cancel</Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {formMode === "create" ? "Add Supplier" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* dialog for product creation */}
      <Sheet open={productDialogOpen} onOpenChange={(open) => { if (!open) setProductDialogOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl">Quick Add Product</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmitProduct} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name *</Label>
              <Input id="product-name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Product identity" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={newProductUnit} onValueChange={setNewProductUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.actual_name || u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={newProductBrand} onValueChange={setNewProductBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-sku">SKU</Label>
                <Input id="product-sku" value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} placeholder="SKU" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-barcode">Barcode</Label>
                <Input id="product-barcode" value={newProductBarcode} onChange={(e) => setNewProductBarcode(e.target.value)} placeholder="Barcode" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-alert">Alert Quantity</Label>
              <Input id="product-alert" type="number" value={newProductAlertQty} onChange={(e) => setNewProductAlertQty(e.target.value)} placeholder="Alert Qty" />
            </div>

            <SheetFooter className="flex flex-row gap-3 justify-end pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)} disabled={productSubmitting}>Cancel</Button>
              <Button type="submit" disabled={productSubmitting}>
                {productSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create & Add to Purchase
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

    </div>
  );
}

function InfoIcon({ title }: { title?: string }) {
  return (
    <span title={title} className="inline-flex items-center">
      <Info className="h-3.5 w-3.5 text-blue-400 bg-blue-100 rounded-full p-0.5 inline-block" />
    </span>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <User className={className} />
  );
}

function MoneyIcon({ className }: { className?: string }) {
  return (
    <Banknote className={className} />
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <Trash2 className={className} />
  )
}
