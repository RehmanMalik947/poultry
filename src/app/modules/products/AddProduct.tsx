import { useState, useEffect, useRef, useCallback } from "react";
import { useBranch } from "../../contexts/BranchContext";
import { COLORS } from '../../constants/colors';
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Badge } from "../../components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../components/ui/command";
import { cn } from "../../components/ui/utils";
import { Plus, Info, Loader2, Trash2, Search, X, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router";
import { ApiService } from "../../../api/ApiService";
import  {useCurrency}  from "../../contexts/CurrencyContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormValues } from "../../utils/validation";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "../../components/ui/form";

export function AddProduct() {
  const { format: formatCurrency, symbol } = useCurrency();
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);

  // Section 1: Core fields
  const [barcodeType, setBarcodeType] = useState("c128");
  const [primaryBarcode, setPrimaryBarcode] = useState("");
  const [secondaryBarcode, setSecondaryBarcode] = useState("");

  // Generate a random 12-digit numeric barcode string
  const generateBarcode = () =>
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  const [subCategory, setSubCategory] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [manageStock, setManageStock] = useState(true);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productBrochure, setProductBrochure] = useState<File | null>(null);

  // Section 2: Additional settings
  const [enableImei, setEnableImei] = useState(false);
  const [notForSelling, setNotForSelling] = useState(false);
  const [weight, setWeight] = useState("");
  const [serviceTimer, setServiceTimer] = useState("");

  // Section 3: Tax & Pricing
  const [applicableTax, setApplicableTax] = useState("none");
  const [sellingPriceTaxType, setSellingPriceTaxType] = useState("exclusive");
  const [productType, setProductType] = useState("single");
  const [margin, setMargin] = useState("25.00");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState("fixed");
  const [discountAmount, setDiscountAmount] = useState("");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      unitId: undefined,
      brandId: undefined,
      categoryId: undefined,
      purchasePriceExc: undefined,
      sellingPriceExc: undefined,
      purchasePriceInc: undefined,
      sellingPriceInc: undefined,
      currentStock: 0,
      alertQuantity: undefined,
      productDescription: "",
    },
  });

  const productName = form.watch("name");
  const sku = form.watch("sku") ?? "";
  const unitVal = form.watch("unitId");
  const unit = unitVal != null ? String(unitVal) : undefined;
  const brandVal = form.watch("brandId");
  const brand = brandVal != null ? String(brandVal) : undefined;
  const categoryVal = form.watch("categoryId");
  const category = categoryVal != null ? String(categoryVal) : undefined;
  const purchasePriceExc = form.watch("purchasePriceExc") != null ? String(form.watch("purchasePriceExc")) : "";
  const sellingPriceExc = form.watch("sellingPriceExc") != null ? String(form.watch("sellingPriceExc")) : "";
  const purchasePriceInc = form.watch("purchasePriceInc") != null ? String(form.watch("purchasePriceInc")) : "";
  const sellingPriceInc = form.watch("sellingPriceInc") != null ? String(form.watch("sellingPriceInc")) : "";
  const alertQuantity = String(form.watch("alertQuantity") ?? "");
  const productDescription = form.watch("productDescription") ?? "";

  // Unit Dialog State
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitShortName, setNewUnitShortName] = useState("");
  const [newUnitAllowDecimal, setNewUnitAllowDecimal] = useState("yes");

  //Brand Dialog State
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDescription, setNewBrandDescription] = useState("");

  // Fetched Data
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [variationsList, setVariationsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);

  const [showSecondaryBarcode, setShowSecondaryBarcode] = useState(false);

  const [openUnitCombobox, setOpenUnitCombobox] = useState(false);
  const [openBrandCombobox, setOpenBrandCombobox] = useState(false);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  const [openSubCategoryCombobox, setOpenSubCategoryCombobox] = useState(false);


  const fetchProductDetails = useCallback(async (id: number) => {
    setFetchingProduct(true);
    try {
      const res = await ApiService.products.getById(id);
      if (res.success && res.data) {
        const p = res.data;
        form.setValue("name", p.name || "");
        form.setValue("sku", p.sku || "");
        setBarcodeType(p.barcodeType || "c128");
        setPrimaryBarcode(p.primaryBarcode || "");
        setSecondaryBarcode(p.secondaryBarcode || "");
        form.setValue("unitId", p.unitId ?? undefined);
        form.setValue("brandId", p.brandId ?? undefined);
        form.setValue("categoryId", p.categoryId ?? undefined);
        setSubCategory(p.subCategoryId?.toString() || "");
        setSelectedBranch(p.branchId?.toString() || "");
        setManageStock(p.manageStock !== false);
        form.setValue("alertQuantity", p.alertQuantity ?? 0);
        form.setValue("productDescription", p.productDescription || "");
        setEnableImei(!!p.enableImei);
        setNotForSelling(!!p.notForSelling);
        setWeight(p.weight || "");
        setServiceTimer(p.serviceTimer || "");
        setApplicableTax(p.applicableTax || "none");
        setSellingPriceTaxType(p.sellingPriceTaxType || "exclusive");
        setProductType(p.productType || "single");
        form.setValue("purchasePriceExc", p.purchasePriceExc ?? 0);
        form.setValue("purchasePriceInc", p.purchasePriceInc ?? 0);
        setMargin(p.margin?.toString() || "25.00");
        form.setValue("sellingPriceExc", p.sellingPriceExc ?? 0);
        form.setValue("sellingPriceInc", p.sellingPriceInc ?? 0);
        if (p.productImage) setProductImage(p.productImage);

        if (p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
          // Flattened backend rows need to be regrouped for the UI logic
          const groupedVariations = [
            {
              id: Date.now(),
              type: "variations",
              values: p.variations.map((v: any) => v.name).join(", "),
              subItems: p.variations.map((v: any) => ({
                id: v.id,
                sku: v.sku,
                value: v.name,
                purchaseExc: v.purchasePriceExc?.toString() || "",
                purchaseInc: v.purchasePriceInc?.toString() || "",
                margin: v.purchasePriceExc > 0 ? (((v.sellingPriceExc - v.purchasePriceExc) / v.purchasePriceExc) * 100).toFixed(2) : "25.00",
                sellingExc: v.sellingPriceExc?.toString() || "",
                sellingInc: v.sellingPriceInc?.toString() || "",
                variationImage: v.variationImage || null,
                hasDiscount: !!v.hasDiscount,
                discountType: v.discountType || "fixed",
                discountAmount: v.discountAmount?.toString() || "0",
              }))
            }
          ];
          setVariations(groupedVariations);
        } else {
          setVariations([]);
        }
        setHasDiscount(!!p.hasDiscount);
        setDiscountType(p.discountType || "fixed");
        setDiscountAmount(p.discountAmount?.toString() || "");
      }
    } catch (err) {
      console.error("Failed to fetch product details", err);
      toast.error("Failed to load product details");
    } finally {
      setFetchingProduct(false);
    }
  }, []);

  const fetchNextSku = useCallback(async (branchId: string) => {
    if (!branchId || editId) return;
    try {
      const res = await ApiService.products.getNextSku(branchId);
      if (res.success && res.data?.sku) {
        setSku(res.data.sku);
      }
    } catch (err) {
      console.error("Failed to fetch next SKU", err);
    }
  }, [editId]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [u, b, c, v, p, branches] = await Promise.all([
        ApiService.units.getAll({ limit: 1000 }),
        ApiService.brands.getAll({ limit: 1000 }),
        ApiService.categories.getAll({ limit: 1000 }),
        ApiService.variations.getAll({ limit: 1000 }),
        ApiService.products.getAll({ limit: 1000 }),
        ApiService.staff.getBranches(),
      ]);
      if (u.success) setUnitsList(u.data);
      if (b.success) setBrandsList(b.data);
      if (c.success) setCategoriesList(c.data);
      if (v.success) setVariationsList(v.data ?? []);
      if (p.success) setProductsList(p.data ?? []);
      if (branches.success) {
        setBranchesList(branches.data ?? []);
        if (!editId) {
          const defaultBranchId =
            selectedBranchId != null
              ? String(selectedBranchId)
              : branches.data?.[0]?.id != null
                ? String(branches.data[0].id)
                : "";
          if (defaultBranchId) {
            setSelectedBranch(defaultBranchId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    }
  }, [editId, selectedBranchId]);

  useEffect(() => {
    fetchInitialData();
    if (editId) {
      fetchProductDetails(parseInt(editId));
    }
  }, [editId, selectedBranchId, fetchInitialData, fetchProductDetails]);

  useEffect(() => {
    if (secondaryBarcode && secondaryBarcode.trim() !== "") {
      setShowSecondaryBarcode(true);
    }
  }, [secondaryBarcode]);

  useEffect(() => {
    if (!editId && selectedBranch) {
      fetchNextSku(selectedBranch);
    }
  }, [editId, selectedBranch, fetchNextSku]);

  useEffect(() => {
    if (!editId && selectedBranchId) {
      setSelectedBranch(String(selectedBranchId));
    }
  }, [selectedBranchId, editId]);



  // Variable Product State
  const [variationSkuFormat, setVariationSkuFormat] = useState("sku-number");
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariation, setSelectedVariation] = useState("color");
  const [variationValues, setVariationValues] = useState("");

  // Combo Product State
  const [comboSearchQuery, setComboSearchQuery] = useState("");
  const [comboItems, setComboItems] = useState<any[]>([]);
  const [showComboDropdown, setShowComboDropdown] = useState(false);

  const filteredComboProducts = productsList.filter((p) =>
    p.name.toLowerCase().includes(comboSearchQuery.toLowerCase())
  );

  const handleAddComboItem = (product: any) => {
    const existing = comboItems.find((ci) => ci.id === product.id);
    if (existing) {
      setComboItems(
        comboItems.map((ci) =>
          ci.id === product.id ? { ...ci, qty: ci.qty + 1 } : ci
        )
      );
    } else {
      setComboItems([...comboItems, { ...product, qty: 1 }]);
    }
    setComboSearchQuery("");
    setShowComboDropdown(false);
  };

  const handleUpdateComboQty = (id: number, val: string) => {
    const qty = parseFloat(val) || 0;
    setComboItems(comboItems.map((ci) => (ci.id === id ? { ...ci, qty } : ci)));
  };

  const handleRemoveComboItem = (id: number) => {
    setComboItems(comboItems.filter((ci) => ci.id !== id));
  };

  const comboTotal = comboItems.reduce((acc, curr) => acc + (Number(curr.purchasePriceExc) || 0) * curr.qty, 0);

  // Update selling price when margin or combo total changes
  const comboSellingPrice = (comboTotal * (1 + (parseFloat(margin) || 0) / 100)).toFixed(2);

  const comboDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboDropdownRef.current && !comboDropdownRef.current.contains(e.target as Node)) {
        setShowComboDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (productType === "combo") {
      form.setValue("purchasePriceExc", Number(comboTotal.toFixed(2)));
      updateSinglePricing("purchaseExc", comboTotal.toFixed(2));
    }
  }, [comboTotal, productType]);


  const handleAddVariationRow = () => {
    setVariations([
      ...variations,
      {
        id: Date.now(),
        type: selectedVariation,
        values: "",
        subItems: [
          {
            id: Date.now() + 1,
            sku: "",
            value: "",
            purchaseExc: "",
            purchaseInc: "",
            margin: "25.00",
            sellingExc: "",
            sellingInc: "",
            hasDiscount: false,
            discountType: "fixed",
            discountAmount: "0",
          },
        ],
      },
    ]);
  };

  const handleRemoveVariation = (id: number) => {
    setVariations(variations.filter((v) => v.id !== id));
  };

  const handleVariationChange = (id: number, field: string, value: string) => {
    setVariations((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };

          if (field === "type") {
            updated.values = "";
            updated.subItems = [
              {
                id: Date.now() + Math.random(),
                sku: "",
                value: "",
                purchaseExc: purchasePriceExc || "",
                purchaseInc: purchasePriceInc || "",
                margin: margin || "25.00",
                sellingExc: sellingPriceExc || "",
                sellingInc: sellingPriceInc || "",
                hasDiscount: false,
                discountType: "fixed",
                discountAmount: "0",
              },
            ];
          }

          if (field === "values") {
            const splitVals = value.split(",").map(s => s.trim()).filter((x) => x.length > 0);

            const existingSubItems = [...updated.subItems];

            // Map selected values to their existing sub-items or create new ones
            updated.subItems = splitVals.map(val => {
              // Try to find an existing sub-item that was already using this value
              const existingMatch = existingSubItems.find(s => s.value === val);
              if (existingMatch) return existingMatch;

              // If not found, try to find an empty sub-item to reuse
              const emptyIdx = existingSubItems.findIndex(s => !s.value);
              if (emptyIdx !== -1) {
                const reused = {
                  ...existingSubItems[emptyIdx],
                  value: val,
                  purchaseExc: existingSubItems[emptyIdx].purchaseExc || purchasePriceExc || "",
                  purchaseInc: existingSubItems[emptyIdx].purchaseInc || purchasePriceInc || "",
                  margin: existingSubItems[emptyIdx].margin || margin || "25.00",
                  sellingExc: existingSubItems[emptyIdx].sellingExc || sellingPriceExc || "",
                  sellingInc: existingSubItems[emptyIdx].sellingInc || sellingPriceInc || "",
                  hasDiscount: false,
                  discountType: "fixed",
                  discountAmount: "0",
                };
                existingSubItems.splice(emptyIdx, 1); // remove from pool
                return reused;
              }

              // Otherwise create new
              return {
                id: Date.now() + Math.random(),
                sku: "",
                value: val,
                purchaseExc: purchasePriceExc || "",
                purchaseInc: purchasePriceInc || "",
                margin: margin || "25.00",
                sellingExc: sellingPriceExc || "",
                sellingInc: sellingPriceInc || "",
                hasDiscount: false,
                discountType: "fixed",
                discountAmount: "0",
              };
            });

            // Handle the case where no values are selected: reset to one empty row
            if (updated.subItems.length === 0) {
              updated.subItems = [
                {
                  id: Date.now() + Math.random(),
                  sku: "",
                  value: "",
                  purchaseExc: purchasePriceExc || "",
                  purchaseInc: purchasePriceInc || "",
                  margin: margin || "25.00",
                  sellingExc: sellingPriceExc || "",
                  sellingInc: sellingPriceInc || "",
                  hasDiscount: false,
                  discountType: "fixed",
                  discountAmount: "0",
                }
              ];
            }
          }
          return updated;
        }
        return v;
      })
    );
  };

  const handleAddVariationSubItem = (variationId: number) => {
    setVariations((prev) =>
      prev.map((v) => {
        if (v.id === variationId) {
          return {
            ...v,
            subItems: [
              ...v.subItems,
              {
                id: Date.now() + Math.random(),
                sku: "",
                value: "",
                purchaseExc: purchasePriceExc || "",
                purchaseInc: purchasePriceInc || "",
                margin: margin || "25.00",
                sellingExc: sellingPriceExc || "",
                sellingInc: sellingPriceInc || "",
                hasDiscount: false,
                discountType: "fixed",
                discountAmount: "0",
              },
            ],
          };
        }
        return v;
      })
    );
  };

  const handleRemoveVariationSubItem = (variationId: number, subItemId: number) => {
    setVariations((prev) =>
      prev.map((v) => {
        if (v.id === variationId) {
          const removedItem = v.subItems.find((s: any) => s.id === subItemId);
          const nextSubItems = v.subItems.filter((s: any) => s.id !== subItemId);

          let nextValues = v.values;
          if (removedItem?.value) {
            nextValues = v.values
              .split(",")
              .map((s: string) => s.trim())
              .filter((val: string) => val !== removedItem.value)
              .join(", ");
          }

          return {
            ...v,
            values: nextValues,
            subItems: nextSubItems.length > 0 ? nextSubItems : [
              {
                id: Date.now() + Math.random(),
                sku: "",
                value: "",
                purchaseExc: "",
                purchaseInc: "",
                margin: "25.00",
                sellingExc: "",
                sellingInc: "",
              }
            ]
          };
        }
        return v;
      })
    );
  };

  const handleVariationSubItemChange = (variationId: number, subItemId: number, field: string, value: string) => {
    setVariations((prev) =>
      prev.map((v) => {
        if (v.id === variationId) {
          return {
            ...v,
            subItems: v.subItems.map((s: any) => {
              if (s.id === subItemId) {
                const updated = { ...s, [field]: value };

                let taxRate = 0;
switch (applicableTax) {
  case "vat10":  taxRate = 0.10; break;
  case "cgst10": taxRate = 0.10; break;
  case "sgst8":  taxRate = 0.08; break;
  case "gst18":  taxRate = 0.18; break;
  default:       taxRate = 0;    break;
}

                if (field === "purchaseExc") {
                  const excNum = parseFloat(value) || 0;
                  updated.purchaseInc = (excNum * (1 + taxRate)).toFixed(2);
                  const mNum = parseFloat(updated.margin) || 0;
                  const sExc = excNum * (1 + mNum / 100);
                  updated.sellingExc = sExc.toFixed(2);
                  updated.sellingInc = (sExc * (1 + taxRate)).toFixed(2);
                } else if (field === "purchaseInc") {
                  const incNum = parseFloat(value) || 0;
                  const excNum = incNum / (1 + taxRate);
                  updated.purchaseExc = excNum.toFixed(2);
                  const mNum = parseFloat(updated.margin) || 0;
                  const sExc = excNum * (1 + mNum / 100);
                  updated.sellingExc = sExc.toFixed(2);
                  updated.sellingInc = (sExc * (1 + taxRate)).toFixed(2);
                } else if (field === "margin") {
                  const mNum = parseFloat(value) || 0;
                  const excNum = parseFloat(updated.purchaseExc) || 0;
                  const sExc = excNum * (1 + mNum / 100);
                  updated.sellingExc = sExc.toFixed(2);
                  updated.sellingInc = (sExc * (1 + taxRate)).toFixed(2);
                } else if (field === "sellingExc") {
                  const sExc = parseFloat(value) || 0;
                  updated.sellingInc = (sExc * (1 + taxRate)).toFixed(2);
                  const pExc = parseFloat(updated.purchaseExc) || 0;
                  if (pExc > 0) {
                    updated.margin = (((sExc - pExc) / pExc) * 100).toFixed(2);
                  }
                } else if (field === "sellingInc") {
                  const sInc = parseFloat(value) || 0;
                  const sExc = sInc / (1 + taxRate);
                  updated.sellingExc = sExc.toFixed(2);
                  const pExc = parseFloat(updated.purchaseExc) || 0;
                  if (pExc > 0) {
                    updated.margin = (((sExc - pExc) / pExc) * 100).toFixed(2);
                  }
                }
                return updated;
              }
              return s;
            }),
          };
        }
        return v;
      })
    );
  };

  const handleVariationImageChange = (variationId: number, subItemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVariations((prev) =>
        prev.map((v) => {
          if (v.id === variationId) {
            return {
              ...v,
              subItems: v.subItems.map((s: any) => {
                if (s.id === subItemId) {
                  return {
                    ...s,
                    variationImageFile: file,
                    variationImage: URL.createObjectURL(file),
                  };
                }
                return s;
              }),
            };
          }
          return v;
        })
      );
    }
  };

  useEffect(() => {
    let taxRate = 0;
    switch (applicableTax) {
      case "vat10":  taxRate = 0.10; break;
      case "cgst10": taxRate = 0.10; break;
      case "sgst8":  taxRate = 0.08; break;
      case "gst18":  taxRate = 0.18; break;
      default:       taxRate = 0;    break;
    }

    const pExc = parseFloat(purchasePriceExc) || 0;
    form.setValue("purchasePriceInc", Number((pExc * (1 + taxRate)).toFixed(2)));

    const sExc = parseFloat(sellingPriceExc) || 0;
    form.setValue("sellingPriceInc", Number((sExc * (1 + taxRate)).toFixed(2)));
}, [applicableTax, sellingPriceTaxType]);

  const updateSinglePricing = (field: string, value: string) => {
    let taxRate = 0;
switch (applicableTax) {
  case "vat10":  taxRate = 0.10; break;
  case "cgst10": taxRate = 0.10; break;
  case "sgst8":  taxRate = 0.08; break;
  case "gst18":  taxRate = 0.18; break;
  default:       taxRate = 0;    break;
}

    if (field === "purchaseExc") {
      form.setValue("purchasePriceExc", Number(value) || 0);
      const excNum = parseFloat(value) || 0;
      form.setValue("purchasePriceInc", Number((excNum * (1 + taxRate)).toFixed(2)));

      const mNum = parseFloat(margin) || 0;
      const sExc = excNum * (1 + mNum / 100);
      form.setValue("sellingPriceExc", Number(sExc.toFixed(2)));
      form.setValue("sellingPriceInc", Number((sExc * (1 + taxRate)).toFixed(2)));

    } else if (field === "purchaseInc") {
      form.setValue("purchasePriceInc", Number(value) || 0);
      const incNum = parseFloat(value) || 0;
      const excNum = incNum / (1 + taxRate);
      form.setValue("purchasePriceExc", Number(excNum.toFixed(2)));

      const mNum = parseFloat(margin) || 0;
      const sExc = excNum * (1 + mNum / 100);
      form.setValue("sellingPriceExc", Number(sExc.toFixed(2)));
      form.setValue("sellingPriceInc", Number((sExc * (1 + taxRate)).toFixed(2)));

    } else if (field === "margin") {
      setMargin(value);
      const mNum = parseFloat(value) || 0;
      const excNum = parseFloat(purchasePriceExc) || 0;
      const sExc = excNum * (1 + mNum / 100);
      form.setValue("sellingPriceExc", Number(sExc.toFixed(2)));
      form.setValue("sellingPriceInc", Number((sExc * (1 + taxRate)).toFixed(2)));

    } else if (field === "sellingExc") {
      form.setValue("sellingPriceExc", Number(value) || 0);
      const sExc = parseFloat(value) || 0;
      form.setValue("sellingPriceInc", Number((sExc * (1 + taxRate)).toFixed(2)));

      const pExc = parseFloat(purchasePriceExc) || 0;
      if (pExc > 0) {
        const newMargin = ((sExc - pExc) / pExc) * 100;
        setMargin(newMargin.toFixed(2));
      }

    } else if (field === "sellingInc") {
      form.setValue("sellingPriceInc", Number(value) || 0);
      const sInc = parseFloat(value) || 0;
      const sExc = sInc / (1 + taxRate);
      form.setValue("sellingPriceExc", Number(sExc.toFixed(2)));

      const pExc = parseFloat(purchasePriceExc) || 0;
      if (pExc > 0) {
        const newMargin = ((sExc - pExc) / pExc) * 100;
        setMargin(newMargin.toFixed(2));
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImageFile(file);
      setProductImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async (addAnother = false) => {
    const valid = await form.trigger();
    if (!valid) { toast.error("Please fix validation errors"); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", productName);
      formData.append("sku", sku);
      formData.append("barcodeType", barcodeType);
      formData.append("primaryBarcode", primaryBarcode);
      if (secondaryBarcode) formData.append("secondaryBarcode", secondaryBarcode);

      // ✅ FIXED: Only append if values are valid
      if (unit && unit !== "undefined") formData.append("unitId", unit);
      if (brand && brand !== "none" && brand !== "undefined") formData.append("brandId", brand);
      if (category && category !== "none" && category !== "undefined") formData.append("categoryId", category);
      if (subCategory && subCategory !== "none") formData.append("subCategoryId", subCategory);  // Changed from "subCategory"
      if (selectedBranch) formData.append("branchId", selectedBranch);

      formData.append("manageStock", String(manageStock));
      formData.append("alertQuantity", alertQuantity);
      formData.append("productDescription", productDescription);
      formData.append("enableImei", String(enableImei));
      formData.append("notForSelling", String(notForSelling));
      formData.append("weight", weight);
      formData.append("serviceTimer", serviceTimer);
      formData.append("applicableTax", applicableTax);
      formData.append("sellingPriceTaxType", sellingPriceTaxType);
      formData.append("productType", productType);
      formData.append("purchasePriceExc", purchasePriceExc);
      formData.append("purchasePriceInc", purchasePriceInc);
      formData.append("margin", margin);
      formData.append("sellingPriceExc", sellingPriceExc);
      formData.append("sellingPriceInc", sellingPriceInc);
      formData.append("currentStock", "0");
      formData.append("hasDiscount", String(hasDiscount));
      formData.append("discountType", discountType);
      formData.append("discountAmount", discountAmount);

      if (productImageFile) {
        formData.append("productImage", productImageFile);
      }

      if (productType === "variable" && variations.length > 0) {
        // Prepare variations data for JSON sending (without File objects)
        const variationsData = variations.map((v, vIdx) => ({
          ...v,
          subItems: v.subItems.map((s: any, sIdx: number) => ({
            ...s,
            variationImageFile: undefined, // remove File object for JSON
            variationImage: s.variationImage // Keep existing path if any
          }))
        }));
        formData.append("variations", JSON.stringify(variationsData));

        // Append variation files
        variations.forEach((v, vIdx) => {
          v.subItems.forEach((s: any, sIdx: number) => {
            if (s.variationImageFile) {
              formData.append(`variationImage_${vIdx}_${sIdx}`, s.variationImageFile);
            }
          });
        });
      }

      if (editId) {
        await ApiService.products.updateWithFile(parseInt(editId), formData);
        toast.success("Product updated!");
      } else {
        await ApiService.products.createWithFile(formData);
        toast.success("Product saved!");
      }

      if (addAnother) {
        // Reset core fields
        setProductName("");
        setPrimaryBarcode("");
        setSecondaryBarcode("");
        setShowSecondaryBarcode(false);
        setSubCategory("");
        const defaultBranchId =
          selectedBranchId != null
            ? String(selectedBranchId)
            : branchesList[0]?.id != null
              ? String(branchesList[0].id)
              : selectedBranch;
        setSelectedBranch(defaultBranchId);
        setPurchasePriceExc("");
        setPurchasePriceInc("");
        setMargin("25.00");
        setProductImage(null);
        setProductImageFile(null);
      } else {
        navigate("/products");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitShortName.trim()) {
      toast.error("Name and Short Name are required");
      return;
    }
    try {
      const res = await ApiService.units.create({
        name: newUnitName,
        shortName: newUnitShortName,
        allowDecimal: newUnitAllowDecimal === "yes",
      });
      if (res.success) {
        toast.success(`Unit ${newUnitName} added`);
        setShowUnitDialog(false);
        setNewUnitName("");
        setNewUnitShortName("");
        setNewUnitAllowDecimal("yes");
        // Update local list
        setUnitsList([...unitsList, res.data]);
        form.setValue("unitId", res.data.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add unit");
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await ApiService.brands.create({
        name: newBrandName,
        description: newBrandDescription,
      });
      if (res.success) {
        toast.success(`Brand ${newBrandName} added`);
        setShowBrandDialog(false);
        setNewBrandName("");
        setNewBrandDescription("");
        // Update local list
        setBrandsList([...brandsList, res.data]);
        form.setValue("brandId", res.data.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add brand");
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-3 w-full mx-auto pb-10 mt-2 px-3">
      <h1 className="text-2xl font-bold text-primary">Add new product</h1>

      {/* ── SECTION 1: Product Details ─────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Product Name:*</Label>
              <Input placeholder="Product Name" value={productName} onChange={(e) => form.setValue("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                SKU: <InfoIcon title="Auto-generated from branch name (e.g. Main Branch → MB001). You can edit before saving." />
              </Label>
              <Input
                placeholder="e.g. MB001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
              {!editId && selectedBranch && (
                <p className="text-xs text-muted-foreground">
                  Based on {branchesList.find((b) => String(b.id) === selectedBranch)?.name ?? "branch"} initials
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Barcode Type:*</Label>
              <Select value={barcodeType} onValueChange={setBarcodeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="c128">Code 128 (C128)</SelectItem>
                  <SelectItem value="ean13">EAN-13</SelectItem>
                  <SelectItem value="upc">UPC-A</SelectItem>
                  <SelectItem value="qr">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Primary Barcode: <InfoIcon title="Auto-generated primary barcode" />
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter primary barcode"
                  value={primaryBarcode}
                  onChange={(e) => setPrimaryBarcode(e.target.value)}
                  className="flex-1"
                />
                {!showSecondaryBarcode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100 px-3"
                    onClick={() => setShowSecondaryBarcode(true)}
                    title="Add secondary barcode"
                  >
                    <Plus size={16} />
                  </Button>
                )}
              </div>
            </div>

            {showSecondaryBarcode && (
              <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <Label className="flex items-center gap-1">
                  Secondary Barcode: <InfoIcon title="Optional alternate barcode" />
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter secondary barcode"
                    value={secondaryBarcode}
                    onChange={(e) => setSecondaryBarcode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-red-500 border-red-100 bg-red-50 hover:bg-red-100 px-3"
                    onClick={() => {
                      setShowSecondaryBarcode(false);
                      setSecondaryBarcode("");
                    }}
                    title="Remove secondary barcode"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Unit:*</Label>
              <div className="flex gap-2">
                <Popover open={openUnitCombobox} onOpenChange={setOpenUnitCombobox}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openUnitCombobox} className="flex-1 justify-between font-normal border-gray-300">
                      {unit ? unitsList.find((u) => String(u.id) === unit)?.name || "Selected Unit" : "Search unit..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search unit..." />
                      <CommandList>
                        <CommandEmpty>No unit found.</CommandEmpty>
                        <CommandGroup>
                          {unitsList.map((u) => (
                            <CommandItem
                              key={u.id}
                              value={u.name}
                              onSelect={() => {
                                form.setValue("unitId", u.id);
                                setOpenUnitCombobox(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check className={cn("mr-2 h-4 w-4", unit === String(u.id) ? "opacity-100" : "opacity-0")} />
                              {u.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100"
                  onClick={() => setShowUnitDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Brand:</Label>
              <div className="flex gap-2">
                <Popover open={openBrandCombobox} onOpenChange={setOpenBrandCombobox}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openBrandCombobox} className="flex-1 justify-between font-normal border-gray-300">
                      {brand ? brandsList.find((b) => String(b.id) === brand)?.name || "Selected Brand" : "Search brand..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search brand..." />
                      <CommandList>
                        <CommandEmpty>No brand found.</CommandEmpty>
                        <CommandGroup>
                          {brandsList.map((b) => (
                            <CommandItem
                              key={b.id}
                              value={b.name}
                              onSelect={() => {
                                form.setValue("brandId", b.id);
                                setOpenBrandCombobox(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check className={cn("mr-2 h-4 w-4", brand === String(b.id) ? "opacity-100" : "opacity-0")} />
                              {b.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" className="shrink-0 text-primary border-purple-200 bg-secondary hover:bg-purple-100
                  "onClick={() => setShowBrandDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category:</Label>
              <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openCategoryCombobox} className="w-full justify-between font-normal border-gray-300">
                    {category ? categoriesList.find((c) => String(c.id) === category)?.name || "Selected Category" : "Search category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="none" onSelect={() => { form.setValue("categoryId", undefined); setSubCategory("none"); setOpenCategoryCombobox(false); }} className="cursor-pointer"><Check className={cn("mr-2 h-4 w-4", (!category || category === "none") ? "opacity-100" : "opacity-0")} />None</CommandItem>
                        {categoriesList.filter(c => c.parentId === null).map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              form.setValue("categoryId", c.id);
                              setSubCategory("none");
                              setOpenCategoryCombobox(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check className={cn("mr-2 h-4 w-4", category === String(c.id) ? "opacity-100" : "opacity-0")} />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Sub category:</Label>
              <Popover open={openSubCategoryCombobox} onOpenChange={setOpenSubCategoryCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openSubCategoryCombobox} disabled={!category || category === "none"} className="w-full justify-between font-normal border-gray-300">
                    {subCategory && subCategory !== "none" ? categoriesList.find((c) => String(c.id) === subCategory)?.name || "Selected Sub Category" : "Search sub category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search sub category..." />
                    <CommandList>
                      <CommandEmpty>No sub category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="none" onSelect={() => { setSubCategory("none"); setOpenSubCategoryCombobox(false); }} className="cursor-pointer"><Check className={cn("mr-2 h-4 w-4", (!subCategory || subCategory === "none") ? "opacity-100" : "opacity-0")} />None</CommandItem>
                        {categoriesList.filter(c => c.parentId === parseInt(category, 10)).map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setSubCategory(String(c.id));
                              setOpenSubCategoryCombobox(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check className={cn("mr-2 h-4 w-4", subCategory === String(c.id) ? "opacity-100" : "opacity-0")} />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">Branch: <InfoIcon title="The branch this product belongs to" /></Label>
              <Select
                value={selectedBranch || undefined}
                onValueChange={(value) => {
                  setSelectedBranch(value);
                  if (!editId) fetchNextSku(value);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {branchesList.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {manageStock && (<div className="space-y-1">
              <Label className="flex items-center gap-1">Alert quantity: <InfoIcon title="Alert when stock falls below this" /></Label>
              <Input placeholder="Alert quantity" value={alertQuantity} onChange={(e) => form.setValue("alertQuantity", Number(e.target.value) || 0)} />
            </div>)}
          </div>

          {/* Manage Stock */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="manageStock"
              checked={manageStock}
              onCheckedChange={(c) => setManageStock(!!c)}
              className="border-purple-500 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="manageStock" className="cursor-pointer flex items-center gap-1">
              Manage Stock? <InfoIcon title="Enable stock management at product level" />
            </Label>
          </div>
          {manageStock && (
            <p className="text-sm text-gray-500 -mt-2">Enable stock management at product level!</p>
          )}

          {/* Description + Image */}
          <div className="space-y-1">
            <Label>Product Description:</Label>

            <div className="border rounded-md overflow-hidden ">
              <ReactQuill
                theme="snow"
                value={productDescription}
                onChange={(val) => form.setValue("productDescription", val)}
                className="h-48"
              />
              <div className="bg-gray-50 border-t px-3 py-1 text-xs text-gray-400">
                {productDescription
                  .replace(/<[^>]*>/g, "")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length}{" "}
                WORDS
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <FormField
                control={form.control}
                name="productBrochure"
                render={({ field: { value: _, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Product brochure:</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            className="hidden"
                            accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
                            onChange={(e) => {
                              onChange(e.target.files?.[0] || null);
                              setProductBrochure(e.target.files?.[0] || null);
                            }}
                            {...field}
                          />
                          <span className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded border hover:bg-gray-300">
                            Choose File
                          </span>
                        </label>

                        <span className="text-sm text-gray-500">
                          {productBrochure ? productBrochure.name : "No file chosen"}
                        </span>
                      </div>
                    </FormControl>
                    <p className="text-xs text-gray-400">
                      Max File size: 5MB · Allowed: .pdf, .csv, .zip, .doc, .docx,
                      .jpeg, .jpg, .png
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── SECTION 3: Tax & Pricing ───────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Applicable Tax:</Label>
              <Select value={applicableTax} onValueChange={setApplicableTax}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="none">None</SelectItem>
    <SelectItem value="vat10">VAT @10%</SelectItem>
    <SelectItem value="cgst10">CGST @10%</SelectItem>
    <SelectItem value="sgst8">SGST @8%</SelectItem>
    <SelectItem value="gst18">GST @18%</SelectItem>
  </SelectContent>
</Select>
            </div>
            <div className="space-y-1">
              <Label>Selling Price Tax Type:*</Label>
              <Select value={sellingPriceTaxType} onValueChange={setSellingPriceTaxType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Exclusive</SelectItem>
                  <SelectItem value="inclusive">Inclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">Product Type:* <InfoIcon title="Single or variable product" /></Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing Table Conditional Rendering */}
          {productType === "single" && (
            <div className="overflow-x-auto border rounded-md mt-4">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-primary text-white">
                  <tr>
                    <th colSpan={2} className="px-4 pt-2 pb-0 text-left font-semibold border-r border-purple-400">Default Purchase Price</th>
                    <th className="px-4 pt-2 pb-0 text-left font-semibold border-r border-purple-400">
                      <span className="flex items-center gap-1">x Margin(%) <InfoIcon title="Profit margin %" /></span>
                    </th>
                    <th colSpan={2} className="px-4 pt-2 pb-0 text-left font-semibold border-r border-purple-400">Default Selling Price</th>
                    <th className="px-4 pt-2 pb-0 text-left font-semibold">Product image</th>
                  </tr>
                  <tr>
                    <th className="px-4 pb-2 pt-0 text-left text-xs font-medium opacity-90">Exc. tax:*</th>
                    <th className="px-4 pb-2 pt-0 text-left text-xs font-medium opacity-90 border-r border-purple-400">Inc. tax:*</th>
                    <th className="px-4 pb-2 pt-0 border-r border-purple-400"></th>
                    <th className="px-4 pb-2 pt-0 text-left text-xs font-medium opacity-90 border-r border-purple-400">Exc. Tax</th>
                    <th className="px-4 pb-2 pt-0 text-left text-xs font-medium opacity-90 border-r border-purple-400">Inc. Tax</th>
                    <th className="px-4 pb-2 pt-0 text-left text-xs font-medium opacity-90">Product image:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      <Input placeholder="Exc. tax" value={purchasePriceExc} onChange={(e) => updateSinglePricing("purchaseExc", e.target.value)} />
                    </td>
                    <td className="px-4 py-3">
                      <Input placeholder="Inc. tax" value={purchasePriceInc} onChange={(e) => updateSinglePricing("purchaseInc", e.target.value)} />
                    </td>
                    <td className="px-4 py-3">
                      <Input value={margin} onChange={(e) => updateSinglePricing("margin", e.target.value)} className="w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        placeholder="Exc. Tax"
                        value={sellingPriceExc}
                        onChange={(e) => updateSinglePricing("sellingExc", e.target.value)}
                        readOnly={sellingPriceTaxType === "inclusive"}
                        className={sellingPriceTaxType === "inclusive" ? "bg-gray-50 text-gray-400" : ""}
                      />
                    </td>
                    <td className="px-4 py-3 w-32 border-r">
                      <Input
                        placeholder="Inc. Tax"
                        value={sellingPriceInc}
                        onChange={(e) => updateSinglePricing("sellingInc", e.target.value)}
                        readOnly={sellingPriceTaxType === "exclusive"}
                        className={sellingPriceTaxType === "exclusive" ? "bg-gray-50 text-gray-400" : ""}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FormField
                        control={form.control}
                        name="productImage"
                        render={({ field: { value: _, onChange, ...field } }) => (
                          <FormItem>
                            <FormControl>
                              <div>
                                <label className="cursor-pointer">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      onChange(e.target.files?.[0]);
                                      handleImageChange(e);
                                    }}
                                    {...field}
                                  />
                                  <span className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded border hover:bg-gray-300">
                                    {productImage ? "Change File" : "Choose File"}
                                  </span>
                                </label>
                                <p className="text-xs text-gray-400 mt-1">Max File size: 5MB · Aspect ratio 1:1</p>
                                {productImage && (
                                  <div className="mt-2">
                                    <img src={productImage} alt="Preview" className="h-10 w-10 object-cover rounded shadow-sm border" />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Discount Section - Only for non-variable products */}
          {productType !== "variable" && (
            <div className="bg-secondary/30 p-5 rounded-xl border border-secondary shadow-sm mt-8 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="hasDiscount"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem className="flex flex-row items-center space-x-3 bg-white px-4 py-2.5 rounded-lg border border-purple-200 shadow-sm m-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          id="hasDiscount"
                          checked={hasDiscount}
                          onChange={(e) => {
                            onChange(e.target.checked);
                            setHasDiscount(e.target.checked);
                          }}
                          className="w-5 h-5 text-primary rounded-md border-gray-300 focus:ring-purple-500 cursor-pointer"
                          {...field}
                        />
                      </FormControl>
                      <Label htmlFor="hasDiscount" className="text-sm font-bold text-tertiary cursor-pointer select-none">Special Discount?</Label>
                    </FormItem>
                  )}
                />
                {hasDiscount && (
                  <span className="text-xs font-medium text-purple-500 bg-secondary px-3 py-1 rounded-full border border-secondary animate-pulse">
                    Active
                  </span>
                )}
              </div>

              {hasDiscount && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Discount Type</Label>
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger className="bg-white border-purple-200 rounded-lg shadow-sm hover:border-purple-300 transition-colors">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Amount / Value</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder={discountType === "fixed" ? "0.00" : "0"}
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className="bg-white border-purple-200 rounded-lg shadow-sm focus:ring-purple-400 pl-4 pr-10"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-400">
                          {discountType === "fixed" ? symbol : "%"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {discountAmount && parseFloat(discountAmount) > 0 && (
                    <div className="mt-4 p-3 bg-white/60 rounded-lg border border-purple-200/50 flex justify-between items-center group transition-all">
                      <span className="text-sm font-medium text-purple-700">Net Selling Price (After Discount):</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          discountType === "percentage"
                            ? (parseFloat(sellingPriceInc) * (1 - (parseFloat(discountAmount) || 0) / 100 || 0))
                            : (parseFloat(sellingPriceInc) - (parseFloat(discountAmount) || 0) || 0)
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {productType === "variable" && (
            <div className="space-y-6 mt-4">
              <FormField
                control={form.control}
                name="variationSkuFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 font-semibold">Variation SKU Format <InfoIcon title="Format for generating SKUs" /></FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="skuFormat"
                            value="sku-number"
                            checked={variationSkuFormat === "sku-number"}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setVariationSkuFormat(e.target.value);
                            }}
                            className="w-4 h-4 text-primary focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">SKU-Number (Example -&gt; ABC-1, ABC-2)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="skuFormat"
                            value="sku-variation"
                            checked={variationSkuFormat === "sku-variation"}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setVariationSkuFormat(e.target.value);
                            }}
                            className="w-4 h-4 text-primary focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">SKUVariation (Example -&gt; ABCS, ABCM)</span>
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2">
                <Label className="text-base text-gray-800">Add Variation:*</Label>
                <Button
                  type="button"
                  onClick={handleAddVariationRow}
                  className="bg-primary hover:bg-primary h-8 w-8 p-0 rounded-md"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm border-collapse min-w-[800px]">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="px-2 py-2 w-12 border-r border-[#4cae4c]"></th>
                      <th className="px-4 py-2 text-left font-semibold border-r border-[#4cae4c]">Variation</th>
                      <th colSpan={6} className="px-4 py-2 text-left font-semibold">Variation Values</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {variations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-gray-500 bg-gray-50 border-t">
                          Click + to add a variation
                        </td>
                      </tr>
                    ) : (
                      variations.map((v) => (
                        <tr key={v.id} className="border-t align-top">
                          <td className="px-2 py-3 text-center border-r">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => handleRemoveVariation(v.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                          <td className="px-4 py-3 border-r min-w-[200px] space-y-4">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Variation Type</Label>
                              <Select
                                value={v.type}
                                onValueChange={(val) => handleVariationChange(v.id, "type", val)}
                              >
                                <SelectTrigger className="w-full h-9 transition-colors hover:border-purple-400">
                                  <SelectValue placeholder="Select Variation" />
                                </SelectTrigger>
                                <SelectContent>
                                  {variationsList.map((vi) => (
                                    <SelectItem key={vi.id} value={vi.id.toString()}>
                                      {vi.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Variation Values</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-xs h-9 overflow-hidden border-dashed hover:border-purple-400 hover:bg-secondary/50"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Plus className="h-3.5 w-3.5 text-purple-500" />
                                      {v.values ? (
                                        <div className="flex gap-1 overflow-hidden">
                                          {v.values.split(",").slice(0, 2).map((val: string) => (
                                            <Badge key={val} variant="secondary" className="text-[10px] py-0 px-1 bg-purple-100 text-purple-700 hover:bg-purple-100">
                                              {val.trim()}
                                            </Badge>
                                          ))}
                                          {v.values.split(",").length > 2 && <span className="text-primary">+{v.values.split(",").length - 2}</span>}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">Select Values...</span>
                                      )}
                                    </div>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 shadow-xl border-secondary" align="start">
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-sm leading-none border-b pb-2">Available Values</h4>
                                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                      {(() => {
                                        const varInfo = variationsList.find(vl => vl.id.toString() === v.type);
                                        if (!varInfo || !Array.isArray(varInfo.values)) {
                                          return <p className="text-xs text-gray-500 py-4 text-center">Pick a variation type first</p>;
                                        }
                                        if (varInfo.values.length === 0) {
                                          return <p className="text-xs text-gray-500 py-4 text-center">No values found for this variation</p>;
                                        }
                                        return varInfo.values.map(val => {
                                          const currentArray = v.values.split(",").map((s: string) => s.trim()).filter(Boolean);
                                          const isChecked = currentArray.includes(val);
                                          return (
                                            <div key={val} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-secondary transition-colors group">
                                              <Checkbox
                                                id={`val-${v.id}-${val}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                  let next;
                                                  if (checked) {
                                                    next = [...currentArray, val];
                                                  } else {
                                                    next = currentArray.filter((c: string) => c !== val);
                                                  }
                                                  handleVariationChange(v.id, "values", next.join(", "));
                                                }}
                                                className="border-purple-200 data-[state=checked]:bg-primary data-[state=checked]:border-purple-500"
                                              />
                                              <Label
                                                htmlFor={`val-${v.id}-${val}`}
                                                className="text-xs cursor-pointer flex-1 py-1 font-medium text-gray-700 group-hover:text-purple-700"
                                              >
                                                {val}
                                              </Label>
                                            </div>
                                          )
                                        })
                                      })()}
                                    </div>
                                    {v.values && (
                                      <div className="pt-2 border-t mt-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="w-full text-[10px] h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                          onClick={() => handleVariationChange(v.id, "values", "")}
                                        >
                                          Clear Selection
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </td>
                          <td colSpan={6} className="p-0">
                            <table className="w-full h-full">
                              <thead className="bg-primary text-white text-xs">
                                <tr>
                                  <th className="px-2 py-2 border-b border-primary border-r text-left">SKU <InfoIcon /></th>
                                  <th className="px-2 py-2 border-b border-primary border-r text-left">Value</th>
                                  <th colSpan={2} className="px-2 py-2 border-b border-primary border-r text-left">Default Purchase Price<br /><span className="font-normal opacity-90">Exc. tax &nbsp;&nbsp;&nbsp;&nbsp; Inc. tax</span></th>
                                  <th className="px-2 py-2 border-b border-primary border-r text-left">x Margin(%)</th>
                                  <th colSpan={2} className="px-2 py-2 border-b border-primary border-r text-left">Default Selling Price<br /><span className="font-normal opacity-90">Exc. Tax &nbsp;&nbsp;&nbsp;&nbsp; Inc. Tax</span></th>
                                  <th className="px-2 py-2 border-b border-primary border-r text-left">Discount</th>
                                  <th className="px-2 py-2 border-b border-primary border-r text-left">Variation Images</th>
                                  <th className="px-2 py-2 border-b border-primary w-10 text-center">+</th>
                                </tr>
                              </thead>
                              <tbody>
                                {v.subItems?.map((sub: any, idx: number) => (
                                  <tr key={sub.id} className="border-b last:border-b-0">
                                    <td className="p-2 border-r"><Input className="h-8 text-xs" value={sub.sku} onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "sku", e.target.value)} /></td>
                                    <td className="p-2 border-r">
                                      <Input className="h-8 text-xs" placeholder="Value" value={sub.value} onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "value", e.target.value)} />
                                    </td>
                                    <td className="p-2 border-r"><Input className="h-8 text-xs" value={sub.purchaseExc} onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "purchaseExc", e.target.value)} /></td>
                                    <td className="p-2 border-r"><Input className="h-8 text-xs" value={sub.purchaseInc} onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "purchaseInc", e.target.value)} /></td>
                                    <td className="p-2 border-r"><Input className="h-8 text-xs w-16" value={sub.margin} onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "margin", e.target.value)} /></td>
                                    <td className="p-2 border-r">
                                      <Input
                                        className={`h-8 text-xs ${sellingPriceTaxType === "inclusive" ? "bg-gray-50 text-gray-400" : ""}`}
                                        value={sub.sellingExc}
                                        readOnly={sellingPriceTaxType === "inclusive"}
                                        onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "sellingExc", e.target.value)}
                                      />
                                    </td>
                                    <td className="p-2 border-r">
                                      <Input
                                        className={`h-8 text-xs ${sellingPriceTaxType === "exclusive" ? "bg-gray-50 text-gray-400" : ""}`}
                                        value={sub.sellingInc}
                                        readOnly={sellingPriceTaxType === "exclusive"}
                                        onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "sellingInc", e.target.value)}
                                      />
                                    </td>
                                    <td className="p-2 border-r min-w-[180px]">
                                      <div className="flex flex-col gap-1.5 p-1.5 bg-secondary/50 rounded-md border border-secondary/50">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            id={`sub-disc-${sub.id}`}
                                            checked={sub.hasDiscount === true || sub.hasDiscount === "true"}
                                            onCheckedChange={(checked) => handleVariationSubItemChange(v.id, sub.id, "hasDiscount", checked)}
                                            className="h-4 w-4 border-purple-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                          />
                                          <Label htmlFor={`sub-disc-${sub.id}`} className="text-[10px] font-bold text-purple-700 uppercase cursor-pointer">Has Discount?</Label>
                                        </div>
                                        {(sub.hasDiscount === true || sub.hasDiscount === "true") && (
                                          <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200">
                                            <div className="flex gap-1">
                                              <Select
                                                value={sub.discountType || "fixed"}
                                                onValueChange={(val) => handleVariationSubItemChange(v.id, sub.id, "discountType", val)}
                                              >
                                                <SelectTrigger className="h-7 text-[10px] py-0 px-2 w-20 bg-white border-purple-200 focus:ring-purple-400">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                  <SelectItem value="fixed">Fixed</SelectItem>
                                                  <SelectItem value="percentage">Perc %</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <div className="relative flex-1">
                                                <Input
                                                  className="h-7 text-[10px] bg-white border-purple-200 focus:ring-purple-400 pr-5"
                                                  placeholder="Val"
                                                  value={sub.discountAmount}
                                                  onChange={(e) => handleVariationSubItemChange(v.id, sub.id, "discountAmount", e.target.value)}
                                                />
                                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-purple-400">
                                                  {sub.discountType === "percentage" ? "%" : symbol}
                                                </span>
                                              </div>
                                            </div>
                                            {sub.discountAmount && parseFloat(sub.discountAmount) > 0 && (
                                              <div className="text-[10px] px-1 font-bold text-green-600 flex justify-between">
                                                <span>Net:</span>
                                                <span>
                                                  {formatCurrency(
                                                    sub.discountType === "percentage"
                                                      ? (parseFloat(sub.sellingInc) * (1 - (parseFloat(sub.discountAmount) || 0) / 100))
                                                      : (parseFloat(sub.sellingInc) - (parseFloat(sub.discountAmount) || 0))
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2 border-r">
                                      <FormField
                                        control={form.control}
                                        name={`variationImage_${v.id}_${sub.id}`}
                                        render={({ field: { value: _, onChange, ...field } }) => (
                                          <FormItem>
                                            <FormControl>
                                              <div className="flex flex-col items-center gap-2">
                                                {sub.variationImage ? (
                                                  <img src={sub.variationImage} alt="variation" className="h-10 w-10 object-cover rounded border" />
                                                ) : (
                                                  <div className="h-10 w-10 bg-gray-50 border rounded flex items-center justify-center text-[8px] text-gray-400">No Img</div>
                                                )}
                                                <label className="cursor-pointer">
                                                  <Input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                      onChange(e.target.files?.[0]);
                                                      handleVariationImageChange(v.id, sub.id, e);
                                                    }}
                                                    {...field}
                                                  />
                                                  <span className="text-[10px] text-primary hover:underline">
                                                    {sub.variationImage ? "Change" : "Choose"}
                                                  </span>
                                                </label>
                                              </div>
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </td>
                                    <td className="p-2 text-center flex items-center justify-center gap-1">
                                      {idx === 0 ? (
                                        <Button
                                          type="button"
                                          title="Add variation value"
                                          size="icon"
                                          variant="outline"
                                          className="h-7 w-7 text-primary bg-secondary border-purple-200"
                                          onClick={() => handleAddVariationSubItem(v.id)}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          title="Remove variation value"
                                          size="icon"
                                          variant="outline"
                                          className="h-7 w-7 text-red-600 bg-red-50 border-red-200"
                                          onClick={() => handleRemoveVariationSubItem(v.id, sub.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {productType === "combo" && (
            <div className="space-y-6 mt-4">
              <div className="space-y-1 relative">
                <Label className="flex items-center gap-1">Add products:*</Label>
                <div className="relative">
                  <div className="relative" ref={comboDropdownRef}>

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <Input
                      placeholder="Search Products..."
                      className="pl-9 bg-gray-50 border-purple-200 focus-visible:ring-purple-500"
                      value={comboSearchQuery}
                      onChange={(e) => {
                        setComboSearchQuery(e.target.value);
                        setShowComboDropdown(true);
                      }}
                      onFocus={() => setShowComboDropdown(true)}
                    />


                    {showComboDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded-md max-h-[400px] overflow-y-auto">
                        {filteredComboProducts.length > 0 ? (
                          filteredComboProducts.map((p) => (
                            <div
                              key={p.id}
                              className="px-4 py-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
                              onClick={() => handleAddComboItem(p)}
                            >
                              <span className="font-medium text-gray-800">{p.name}</span>
                              <span className="text-gray-500 text-sm font-semibold">{formatCurrency(p.purchasePriceExc || 0)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500">No products found.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="px-4 py-2 text-left font-bold border-r border-[#4cae4c]">Product Name</th>
                      <th className="px-4 py-2 text-center font-bold border-r border-[#4cae4c] w-[140px]">Quantity</th>
                      <th className="px-4 py-2 text-center font-bold border-r border-[#4cae4c] w-[180px]">Purchase Price (Excluding Tax)</th>
                      <th className="px-4 py-2 text-center font-bold border-r border-[#4cae4c] w-[180px]">Total Amount (Exc. Tax)</th>
                      <th className="px-4 py-2 w-12 text-center text-red-100">
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comboItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                          Search and add products to start building a combo.
                        </td>
                      </tr>
                    ) : (
                      comboItems.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="px-4 py-3 border-r font-medium text-gray-700">
                            {item.name} - {item.sku || 'N/A'}
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div className="space-y-1">
                              <Input
                                type="number"
                                className="w-full h-8 px-2 text-center"
                                value={item.qty.toFixed(2)}
                                onChange={(e) => handleUpdateComboQty(item.id, e.target.value)}
                              />
                              <Select defaultValue="service">
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="service">Service</SelectItem>
                                  <SelectItem value="piece">Piece</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r text-center text-gray-600">
                            {formatCurrency(item.purchasePriceExc || 0)}
                          </td>
                          <td className="px-4 py-3 border-r text-center font-semibold text-gray-800">
                            {formatCurrency(Number(item.purchasePriceExc || 0) * item.qty)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                              onClick={() => handleRemoveComboItem(item.id)}
                            >
                              <X className="h-5 w-5 stroke-[3px]" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                    {comboItems.length > 0 && (
                      <tr className="bg-white border-t-2">
                        <td className="border-r"></td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900 border-r">Net Total Amount :</td>
                        <td className="border-r"></td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900 border-r">{formatCurrency(comboTotal)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {comboItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 max-w-5xl mx-auto">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-1">x Margin(%): <InfoIcon title="Profit margin percentage" /></Label>
                    <Input
                      value={margin}
                      onChange={(e) => updateSinglePricing("margin", e.target.value)}
                      className="h-10 text-lg border-gray-300 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Selling Price (Exc. Tax):</Label>
                    <Input
                      value={sellingPriceExc}
                      onChange={(e) => updateSinglePricing("sellingExc", e.target.value)}
                      readOnly={sellingPriceTaxType === "inclusive"}
                      className={`h-10 text-lg border-gray-300 focus:ring-purple-500 font-medium ${sellingPriceTaxType === "inclusive" ? "bg-gray-50 text-gray-400" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Selling Price (Inc. Tax):</Label>
                    <Input
                      value={sellingPriceInc}
                      onChange={(e) => updateSinglePricing("sellingInc", e.target.value)}
                      readOnly={sellingPriceTaxType === "exclusive"}
                      className={`h-10 text-lg border-gray-300 focus:ring-purple-500 font-semibold text-purple-700 ${sellingPriceTaxType === "exclusive" ? "bg-gray-50 text-gray-400" : ""}`}
                    />
                  </div>
                </div>
              )}

            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Action Buttons ─────────────────────────────────────────────────── */}
      <div className="flex justify-center gap-4 pt-2 pb-6">
        {/* <Button onClick={() => handleSave(false)} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-6">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save &amp; Add Opening Stock
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading} className="bg-pink-500 hover:bg-pink-600 px-6">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save And Add Another
        </Button> */}
        <Button type="button" onClick={() => handleSave(false)} disabled={loading} className="bg-primary hover:bg-primary px-6">
          {loading ? <Loader2 className="h-4 w-8 mr-2 animate-spin" /> : null}
          Save
        </Button>
      </div>
      {/* ── Add Unit Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Unit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name:*</Label>
              <Input
                placeholder="Name"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Short name:*</Label>
              <Input
                placeholder="Short name"
                value={newUnitShortName}
                onChange={(e) => setNewUnitShortName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Allow decimal:*</Label>
              <Select value={newUnitAllowDecimal} onValueChange={setNewUnitAllowDecimal}>
                <SelectTrigger>
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowUnitDialog(false)}
            >
              Close
            </Button>
            <Button className="bg-primary hover:bg-purple-700" onClick={handleAddUnit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Brand</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Brand Name:*</Label>
              <Input
                placeholder="Brand Name"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description:</Label>
              <Textarea
                placeholder="Description"
                value={newBrandDescription}
                onChange={(e) => setNewBrandDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowBrandDialog(false)}
            >
              Close
            </Button>
            <Button className="bg-primary hover:bg-purple-700" onClick={handleAddBrand}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
    </Form>
  );
}

function InfoIcon({ title }: { title?: string }) {
  return (
    <span title={title} className="inline-flex items-center">
      <Info className="h-3.5 w-3.5 text-purple-400 bg-purple-100 rounded-full p-0.5" />
    </span>
  );
}