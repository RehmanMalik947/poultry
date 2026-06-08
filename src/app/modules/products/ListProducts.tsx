import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  Search, Plus, Pencil, Trash2, Loader2, Box, Eye, Printer, 
  MoreVertical, History, TrendingUp, TrendingDown, ArrowLeftRight, 
  Package, ArrowLeft, Tag, FolderOpen, DollarSign, AlertCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { ApiService } from "../../../api/ApiService";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { TablePagination } from "../../components/shared/TablePagination";
import { useCurrency } from "../../contexts/CurrencyContext";
import { canManage } from "../../utils/permissions";

type Product = {
  id: number;
  name: string;
  sku: string | null;
  productImage: string | null;
  unitId: string | null;
  unit: string | null;
  categoryId: string | null;
  category: string | null;
  randId: string | null;
  brand: string | null;
  businessLocationId: string | null;
  businessLocation: string | null;
  purchasePriceExc: number | null;
  sellingPriceExc: number | null;
  sellingPriceInc: number | null;
  currentStock: number | null;
  manageStock: boolean;
  barcodeUrl: string | null;
  createdAt: string;
  alertQuantity: number | null;
  productType?: string;
  variations?: any[];
};

type StockLog = {
  id: number;
  movementType: string;
  qtyChange: number;
  previousQty: number;
  newQty: number;
  notes: string | null;
  createdAt: string;
  user?: { id: number; name: string; email?: string } | null;
  branch?: { id: number; name: string } | null;
};

const MOVEMENT_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ReactNode }> = {
  Added: {
    label: "Added",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  Deducted: {
    label: "Deducted",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    icon: <TrendingDown className="h-3 w-3" />,
  },
  TRANSFER_IN: {
    label: "Transfer In",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    icon: <ArrowLeftRight className="h-3 w-3" />,
  },
  TRANSFER_OUT: {
    label: "Transfer Out",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    icon: <ArrowLeftRight className="h-3 w-3" />,
  },
  SALE: {
    label: "Sale",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    icon: <TrendingDown className="h-3 w-3" />,
  },
  PURCHASE: {
    label: "Purchase",
    bgClass: "bg-teal-50",
    textClass: "text-teal-700",
    borderClass: "border-teal-200",
    icon: <TrendingUp className="h-3 w-3" />,
  },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ListProducts() {
  const { selectedBranchId } = useBranch();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState<number>(0);
  const [varStockQty, setVarStockQty] = useState<Record<number, number>>({});
  const [stockLoading, setStockLoading] = useState(false);

  // ✅ Product Detail View States
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productTab, setProductTab] = useState<"details" | "stock" | "pricing">("details");
  const [productStockHistory, setProductStockHistory] = useState<StockLog[]>([]);
  const [stockHistoryLoading, setStockHistoryLoading] = useState(false);

  // Stock history pagination state
  const [stockHistoryPage, setStockHistoryPage] = useState(1);
  const stockHistoryLimit = 10;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.products.getAll({ page, limit, search: search || undefined });
      const data = Array.isArray(res) ? res : res.data ?? [];
      setProducts(data);
      setTotalItems(res.total ?? data.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedBranchId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.products.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  // ✅ Fetch product details for view page
  const fetchProductDetails = useCallback(async (productId: number) => {
    try {
      const res = await ApiService.products.getById(productId);
      if (res.data) {
        setSelectedProduct(res.data);
      }
    } catch (err) {
      toast.error("Failed to load product details");
    }
  }, []);

  // ✅ Fetch product stock history for view page
  const fetchProductStockHistory = useCallback(async (productId: number) => {
    setStockHistoryLoading(true);
    try {
      const res = await ApiService.stock.getLogs({
        productId: productId,
        branchId: selectedBranchId || undefined
      });
      setProductStockHistory(res.data ?? []);
    } catch {
      toast.error("Failed to load stock history");
    } finally {
      setStockHistoryLoading(false);
    }
  }, [selectedBranchId]);

  // ✅ Open product view (redirects to stock history tab)
  const openProductView = (product: Product) => {
    setSelectedProduct(product);
    setViewingProductId(product.id);
    fetchProductStockHistory(product.id);
    setProductTab("stock"); // ✅ Directly open stock tab
  };

  // ✅ Open stock history from action button - redirect to view page with stock tab
  const openStockHistory = async (product: Product) => {
    setSelectedProduct(product);
    setViewingProductId(product.id);
    await fetchProductStockHistory(product.id);
    setProductTab("stock"); // ✅ Set to stock tab
  };

  // ✅ Load product details when viewingProductId changes
  useEffect(() => {
    if (viewingProductId) {
      fetchProductDetails(viewingProductId);
    }
  }, [viewingProductId, fetchProductDetails]);

  // Reset stock history page when product changes or tab changes
  useEffect(() => {
    setStockHistoryPage(1);
  }, [viewingProductId, productTab]);

  const productColumns: Column<Product>[] = [
    {
      header: 'Actions',
      align: 'center',
      render: (product) => (
        <EntityActions
          onView={() => openProductView(product)}
          onEdit={() => navigate(`/products/edit/${product.id}`)}
          onDelete={() => setDeleteTarget(product)}
          extraActions={[
            {
              label: (product.currentStock ?? 0) > 0 ? "Update Stock" : "Add Opening Stock",
              icon: Plus,
              onClick: () => {
                setStockTarget(product);
                setStockQty(product.currentStock ?? 0);
                if (product.productType === 'variable' && product.variations) {
                  const initialVars: Record<number, number> = {};
                  product.variations.forEach((v: any) => {
                    initialVars[v.id] = v.currentStock ?? 0;
                  });
                  setVarStockQty(initialVars);
                } else {
                  setVarStockQty({});
                }
              }
            },
            {
              label: 'Stock History',
              icon: History,
              onClick: () => openStockHistory(product) // ✅ Redirect to view page stock tab
            }
          ]}
        />
      )
    },
    {
      header: 'Image',
      render: (product) => product.productImage ? (
        <img src={product.productImage} alt={product.name} className="h-10 w-10 object-cover rounded border" />
      ) : (
        <div className="h-10 w-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">No img</div>
      )
    },
    { header: 'Product Name', accessor: 'name', className: 'font-medium' },
    { header: 'SKU', accessor: 'sku', render: (p) => p.sku ?? "—", className: 'text-gray-500' },
    { header: 'Category', accessor: 'category', render: (p) => p.category ?? "—" },
    { header: 'Brand', accessor: 'brand', render: (p) => p.brand ?? "—" },
    { header: 'Unit', accessor: 'unit', render: (p) => p.unit ?? "—" },
    { header: 'Purchase Price', accessor: 'purchasePriceExc', render: (p) => formatCurrency(p.purchasePriceExc) },
    { header: 'Selling Price (Exc.)', accessor: 'sellingPriceExc', render: (p) => formatCurrency(p.sellingPriceExc) },
    { header: 'Selling Price (Inc.)', accessor: 'sellingPriceInc', render: (p) => formatCurrency(p.sellingPriceInc), className: 'font-semibold text-purple-700' },
    {
      header: 'Stock', accessor: 'currentStock',
      render: (p) => p.manageStock ? (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(p.currentStock ?? 0) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {p.currentStock ?? 0}
        </span>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      )
    },
  ];

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Products</h1>
        <Link to="/products/add">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </Link>
      </div>

      {/* ✅ PRODUCT DETAIL VIEW - Like Customer Profile */}
      {viewingProductId && selectedProduct && selectedProduct.id === viewingProductId ? (
        <>
          {/* Back Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 gap-2"
              onClick={() => {
                setViewingProductId(null);
                setSelectedProduct(null);
                setProductStockHistory([]);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Button>
          </div>

          <div className="space-y-3">
            {/* Product Header Card */}
            <Card className="overflow-hidden bg-gradient-to-br from-secondary to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg border-4 border-white dark:border-gray-800 shadow bg-white flex items-center justify-center overflow-hidden">
                    {selectedProduct.productImage ? (
                      <img 
                        src={selectedProduct.productImage} 
                        alt={selectedProduct.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                      <Badge variant="secondary">Product</Badge>
                      {selectedProduct.manageStock && (selectedProduct.currentStock ?? 0) <= (selectedProduct.alertQuantity ?? 0) && (selectedProduct.alertQuantity ?? 0) > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">Low Stock Alert</Badge>
                      )}
                    </div>
                    {selectedProduct.sku && (
                      <p className="text-sm text-muted-foreground mt-0.5">SKU: {selectedProduct.sku}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Added {formatDate(selectedProduct.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      {selectedProduct.category && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-4 h-4" />
                          {selectedProduct.category}
                        </span>
                      )}
                      {selectedProduct.brand && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          {selectedProduct.brand}
                        </span>
                      )}
                      {selectedProduct.unit && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          Unit: {selectedProduct.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Stock Value */}
                  <div className={`px-4 py-2 rounded-lg text-center ${(selectedProduct.currentStock ?? 0) > 0 ? "bg-green-100" : "bg-red-100"}`}>
                    <p className="text-xs text-muted-foreground">Current Stock</p>
                    <p className={`text-2xl font-bold ${(selectedProduct.currentStock ?? 0) > 0 ? "text-green-700" : "text-red-700"}`}>
                      {selectedProduct.currentStock ?? 0}
                    </p>
                    {selectedProduct.manageStock && selectedProduct.alertQuantity && (
                      <p className="text-xs text-muted-foreground">
                        Alert at: {selectedProduct.alertQuantity}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={productTab} onValueChange={(v) => setProductTab(v as "details" | "stock" | "pricing")} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="details">Product Details</TabsTrigger>
                <TabsTrigger value="stock">Stock Information</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
              </TabsList>

              {/* Tab 1: Product Details */}
              <TabsContent value="details" className="mt-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Product Information</CardTitle>
                    {canManage() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={() => navigate(`/products/edit/${selectedProduct.id}`)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Product Name</p>
                        <p className="text-sm text-foreground">{selectedProduct.name || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">SKU</p>
                        <p className="text-sm text-foreground">{selectedProduct.sku || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Category</p>
                        <p className="text-sm text-foreground">{selectedProduct.category || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Brand</p>
                        <p className="text-sm text-foreground">{selectedProduct.brand || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Unit</p>
                        <p className="text-sm text-foreground">{selectedProduct.unit || "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Manage Stock</p>
                        <p className="text-sm text-foreground">{selectedProduct.manageStock ? "Yes" : "No"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Alert Quantity</p>
                        <p className="text-sm text-foreground">{selectedProduct.alertQuantity ?? "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                        {selectedProduct.barcodeUrl ? (
                          <img src={selectedProduct.barcodeUrl} alt="Barcode" className="h-12" />
                        ) : (
                          <p className="text-sm text-foreground">—</p>
                        )}
                      </div>
                    </div>

                    {selectedProduct.productType === 'variable' && selectedProduct.variations && selectedProduct.variations.length > 0 && (
                      <div className="mt-8 border-t pt-6">
                        <h4 className="text-md font-semibold mb-4 text-primary">Variations</h4>
                        <div className="overflow-x-auto">
                          <Table className="w-full border rounded-lg">
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="w-16">Image</TableHead>
                                <TableHead>Variation Name</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Barcode</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedProduct.variations.map((v: any) => (
                                <TableRow key={v.id}>
                                  <TableCell>
                                    {v.variationImage ? (
                                      <img src={v.variationImage} alt={v.name} className="w-10 h-10 object-cover rounded border" />
                                    ) : (
                                      <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-400" />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{v.name}</TableCell>
                                  <TableCell className="text-gray-500">{v.sku || "—"}</TableCell>
                                  <TableCell>
                                    {selectedProduct.manageStock ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(v.currentStock ?? 0) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {v.currentStock ?? 0}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">N/A</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {v.barcodeUrl ? (
                                      <img src={v.barcodeUrl} alt="Barcode" className="h-8" />
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Stock Information with Pagination */}
              <TabsContent value="stock" className="mt-3">
                <div className="space-y-4">
                  {/* Stock Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-lg">
                          <Package className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Current Stock</p>
                          <p className="text-xl font-bold text-emerald-600">{selectedProduct.currentStock ?? 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Inflow</p>
                          <p className="text-xl font-bold text-blue-600">
                            {productStockHistory.filter(l => l.qtyChange > 0).reduce((sum, l) => sum + l.qtyChange, 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 rounded-lg">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Outflow</p>
                          <p className="text-xl font-bold text-red-600">
                            {Math.abs(productStockHistory.filter(l => l.qtyChange < 0).reduce((sum, l) => sum + l.qtyChange, 0))}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stock History Table with Pagination */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Stock Movement History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {stockHistoryLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : productStockHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No stock movements recorded
                        </div>
                      ) : (
                        <>
                          <div className="w-full overflow-x-auto">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-primary hover:bg-primary/95">
                                  <TableHead className="text-white whitespace-nowrap">#</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">Date</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">Movement Type</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">Quantity Change</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">Before</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">After</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">Notes</TableHead>
                                  <TableHead className="text-white whitespace-nowrap">Updated By</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {productStockHistory
                                  .slice(
                                    (stockHistoryPage - 1) * stockHistoryLimit, 
                                    stockHistoryPage * stockHistoryLimit
                                  )
                                  .map((log, idx) => {
                                    const isPositive = log.qtyChange > 0;
                                    const config = MOVEMENT_CONFIG[log.movementType] ?? {
                                      label: log.movementType.replace(/_/g, " "),
                                      bgClass: "bg-gray-50",
                                      textClass: "text-gray-700",
                                      borderClass: "border-gray-200",
                                      icon: null,
                                    };
                                    // Calculate the actual row number based on current page
                                    const globalIndex = ((stockHistoryPage - 1) * stockHistoryLimit) + idx + 1;
                                    
                                    return (
                                      <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <TableCell className="text-gray-400 text-xs py-3">{globalIndex}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                          {formatDate(log.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
                                            {config.icon}
                                            {config.label}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <span className={`font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                            {isPositive ? "+" : ""}{log.qtyChange}
                                          </span>
                                        </TableCell>
                                        <TableCell>{log.previousQty}</TableCell>
                                        <TableCell className="font-semibold">{log.newQty}</TableCell>
                                        <TableCell className="max-w-xs truncate">
                                          {log.notes || "—"}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1.5">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                                              {(log.user?.name ?? "S")[0]}
                                            </div>
                                            <span className="text-xs">{log.user?.name ?? "System"}</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                          
                          {/* Pagination Controls */}
                          <div className="border-t px-4 py-3">
                            <TablePagination
                              total={productStockHistory.length}
                              page={stockHistoryPage}
                              limit={stockHistoryLimit}
                              onPageChange={setStockHistoryPage}
                              itemLabel="stock movements"
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 3: Pricing */}
              <TabsContent value="pricing" className="mt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedProduct.productType === 'variable' && selectedProduct.variations && selectedProduct.variations.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Variation</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Purchase Price</TableHead>
                              <TableHead>Selling Price (Exc)</TableHead>
                              <TableHead className="text-purple-700">Selling Price (Inc)</TableHead>
                              <TableHead>Margin</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProduct.variations.map((v: any) => (
                              <TableRow key={v.id}>
                                <TableCell className="font-medium">{v.name}</TableCell>
                                <TableCell className="text-gray-500">{v.sku || "—"}</TableCell>
                                <TableCell>{formatCurrency(v.purchasePriceExc)}</TableCell>
                                <TableCell>{formatCurrency(v.sellingPriceExc)}</TableCell>
                                <TableCell className="font-semibold text-purple-700">{formatCurrency(v.sellingPriceInc)}</TableCell>
                                <TableCell className="text-emerald-600 font-semibold">
                                  {v.sellingPriceInc && v.purchasePriceExc
                                    ? `${(((v.sellingPriceInc - v.purchasePriceExc) / v.purchasePriceExc) * 100).toFixed(2)}%`
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="border-b pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Purchase Price (Excluding Tax)</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(selectedProduct.purchasePriceExc)}
                            </p>
                          </div>
                          <div className="border-b pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Selling Price (Excluding Tax)</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {formatCurrency(selectedProduct.sellingPriceExc)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="border-b pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Selling Price (Including Tax)</p>
                            <p className="text-2xl font-bold text-purple-700">
                              {formatCurrency(selectedProduct.sellingPriceInc)}
                            </p>
                          </div>
                          <div className="border-b pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                            <p className="text-2xl font-bold text-emerald-600">
                              {selectedProduct.sellingPriceInc && selectedProduct.purchasePriceExc
                                ? `${(((selectedProduct.sellingPriceInc - selectedProduct.purchasePriceExc) / selectedProduct.purchasePriceExc) * 100).toFixed(2)}%`
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <DataTable
          title="All Products"
          icon={Box}
          columns={productColumns}
          data={products}
          loading={loading}
          exportable
          exportFileName="products"
          pagination={{
            total: totalItems,
            page: page,
            limit: limit,
            onPageChange: setPage,
            itemLabel: "products"
          }}
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
                  placeholder="Search products..."
                  value={search}
                  onChange={handleSearch}
                   className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300"
                />
              </div>
            </>
          }
        />
      )}

      {/* Add/Update Stock Dialog */}
      <Dialog open={!!stockTarget} onOpenChange={(open) => !open && setStockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Opening Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm">Product: <strong>{stockTarget?.name}</strong></p>
            
            {stockTarget?.productType === 'variable' && stockTarget.variations && stockTarget.variations.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">Set stock for each variation:</p>
                {stockTarget.variations.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-gray-50">
                    <span className="text-sm font-medium">{v.name}</span>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={varStockQty[v.id] ?? v.currentStock ?? 0}
                        onChange={(e) => setVarStockQty(prev => ({ ...prev, [v.id]: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Input
                type="number"
                placeholder="Enter stock quantity"
                value={stockQty}
                onChange={(e) => setStockQty(Number(e.target.value))}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockTarget(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                setStockLoading(true);
                try {
                  const payload: any = {
                    productId: stockTarget?.id,
                    type: "add",
                    reason: "Opening Stock",
                    alertQuantity: stockTarget?.alertQuantity,
                  };

                  if (stockTarget?.productType === 'variable' && stockTarget.variations && stockTarget.variations.length > 0) {
                    payload.variations = stockTarget.variations.map((v: any) => ({
                      variationId: v.id,
                      qty: varStockQty[v.id] ?? v.currentStock ?? 0,
                      type: "add", // Using add to add opening stock based on user's input qty
                    }));
                  } else {
                    payload.qty = stockQty;
                  }

                  await ApiService.stock.manage(payload);
                  toast.success("Stock added successfully");
                  setStockTarget(null);
                  setStockQty(0);
                  setVarStockQty({});
                  fetchProducts();
                  // Refresh stock history if product is being viewed
                  if (viewingProductId && stockTarget?.id === viewingProductId) {
                    await fetchProductStockHistory(viewingProductId);
                    await fetchProductDetails(viewingProductId);
                  }
                } catch (err) {
                  toast.error("Failed to add stock");
                } finally {
                  setStockLoading(false);
                }
              }}
              disabled={stockLoading}
            >
              {stockLoading ? "Saving..." : "Save Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
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
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}