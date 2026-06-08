import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  PDFViewer,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import React from "react";
import { useCurrency } from "../../contexts/CurrencyContext";


// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  sku: string | null;
  productImage: string | null;
  unitId: string | null;
  unit: string | null;
  categoryId: string | null;
  category: string | null;
  brandId: string | null;
  brand: string | null;
  businessLocationId: string | null;
  businessLocation: string | null;
  purchasePriceExc: number | null;
  sellingPriceExc: number | null;
  sellingPriceInc: number | null;
  currentStock: number | null;
  manageStock: boolean;
  createdAt: string;
  productDescription?: string;
  productType?: string;
  primaryBarcode?: string | null;      // ← add this
  secondaryBarcode?: string | null;    // ← add this
  barcodeUrl?: string | null;
  hasDiscount?: boolean;               // ← add this (was missing, caused TS error)
  discountType?: string;               // ← add this
  discountAmount?: any;                // ← add this
  branch?: string | null;
  variations?: any[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────



function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: "10mm",
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111",
    backgroundColor: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 8,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: "column" },
  headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1 },
  headerDate: { fontSize: 8, color: "#555", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerCompany: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  headerSub: { fontSize: 7, color: "#666", marginTop: 2 },

  // Top section: image + details side by side
  topRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  imageBox: {
    width: "33%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  productImage: { width: "100%", objectFit: "contain", maxHeight: 100 },
  noImageBox: {
    width: "100%",
    minHeight: 110,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: { color: "#aaa", fontSize: 8 },

  detailsBox: { width: "67%", flexDirection: "column", gap: 6 },
  productName: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  skuText: { fontSize: 8, color: "#555", fontFamily: "Helvetica", marginBottom: 6 },

  // Table
  table: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  tableRowLast: { flexDirection: "row" },
  tableLabelCell: {
    width: "40%",
    backgroundColor: "#f3f4f6",
    padding: "4 6",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  tableValueCell: {
    width: "60%",
    padding: "4 6",
    fontSize: 8,
  },

  // Two column section
  twoCol: { flexDirection: "row", gap: 10, marginBottom: 14 },
  colBox: { flex: 1 },
  sectionHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#111",
    color: "#fff",
    padding: "3 6",
    marginBottom: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Stock badge
  badgeIn: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    padding: "2 6",
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  badgeOut: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "2 6",
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },

  // Description
  descSection: { marginBottom: 14 },
  descHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: "3 6",
  },
  descBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#ccc",
    padding: "6 8",
    minHeight: 50,
    fontSize: 8,
    color: "#444",
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 6,
    marginTop: 10,
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 1 },

  // Variations Table
  varSection: { marginBottom: 14 },
  varTable: { width: "100%", borderTopWidth: 1, borderTopColor: "#ccc" },
  varHeaderRow: { flexDirection: "row", backgroundColor: "#337ab7" },
  varRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee" },
  varCell: { padding: "4 6", fontSize: 7, borderRightWidth: 1, borderRightColor: "#eee" },
  varHeaderCell: { padding: "4 6", fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  varImgBox: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  varImg: { width: "100%", height: "100%", objectFit: "cover" },

  // Barcode
  barcodeBox: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 5,
    width: "100%",
  },
  barcodeImage: {
    width: 100,
    height: 35,
  },
  varBarcodeImage: {
    width: 60,
    height: 20,
  }
});

// ─── PDF Document ─────────────────────────────────────────────────────────────

function ProductPDF({ product }: { product: Product }) {
  const { format: formatCurrency } = useCurrency();
  const inStock = (product.currentStock ?? 0) > 0;

  // Defensive parsing for variations
  let variations: any[] = [];
  if (product.variations) {
    if (Array.isArray(product.variations)) {
      variations = product.variations;
    } else if (typeof product.variations === "string") {
      try {
        const parsed = JSON.parse(product.variations);
        if (Array.isArray(parsed)) variations = parsed;
      } catch (e) {
        console.error("Failed to parse variations JSON", e);
      }
    }
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Product Information Sheet</Text>
            <Text style={s.headerDate}>Date: {new Date().toLocaleDateString()}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerCompany}>Salon Management System</Text>
            <Text style={s.headerSub}>Product Audit & Inventory Sheet</Text>
          </View>
        </View>

        {/* Image + Basic Info */}
        <View style={s.topRow}>
          <View style={s.imageBox}>
            {product.productImage ? (
              <Image src={product.productImage} style={s.productImage} />
            ) : (
              <View style={s.noImageBox}>
                <Text style={s.noImageText}>No Product Image</Text>
              </View>
            )}

            {/* Barcode placed right below the image */}
            {/* Primary Barcode */}
            {product.barcodeUrl && (
              <View style={s.barcodeBox}>
                <Text style={{ fontSize: 6, color: "#888", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Primary Barcode
                </Text>
                <Image
                  src={`${window.location.origin}${product.barcodeUrl}`}
                  style={s.barcodeImage}
                />

              </View>
            )}

            {/* Secondary Barcode */}

          </View>

          <View style={s.detailsBox}>
            <Text style={s.productName}>{product.name}</Text>
            <Text style={s.skuText}>SKU: {product.sku ?? "N/A"}</Text>
            <View style={s.table}>
              {[
                ["Category", product.category],
                ["Brand", product.brand],
                ["Base Unit", product.unit],
                ["Branch", product.branch],
                ["Created Date", new Date(product.createdAt).toLocaleDateString()],
              ].map(([label, value], i, arr) => (
                <View key={label} style={i === arr.length - 1 ? s.tableRowLast : s.tableRow}>
                  <Text style={s.tableLabelCell}>{label}</Text>
                  <Text style={s.tableValueCell}>{value ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Inventory + Pricing */}
        <View style={s.twoCol}>
          {/* Inventory */}
          <View style={s.colBox}>
            <Text style={s.sectionHeader}>Inventory Details</Text>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Stock Management</Text>
                <Text style={s.tableValueCell}>{product.manageStock ? "Enabled" : "Disabled"}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Current Stock</Text>
                <Text style={[s.tableValueCell, { fontFamily: "Helvetica-Bold" }]}>
                  {product.currentStock ?? 0} {product.unit}
                </Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={s.tableLabelCell}>Availability</Text>
                <View style={[s.tableValueCell, { justifyContent: "center" }]}>
                  <Text style={inStock ? s.badgeIn : s.badgeOut}>
                    {inStock ? "IN STOCK" : "STOCK OUT"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={s.colBox}>
            <Text style={s.sectionHeader}>Pricing Details</Text>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Purchase Price</Text>
                <Text style={s.tableValueCell}>{formatCurrency(product.purchasePriceExc)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Selling Price (Exc.)</Text>
                <Text style={s.tableValueCell}>{formatCurrency(product.sellingPriceExc)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Original Selling (Inc.)</Text>
                <Text style={s.tableValueCell}>
                  {product.productType === "variable" ? "See Variations" : formatCurrency(product.sellingPriceInc)}
                </Text>
              </View>
              {product.hasDiscount && product.productType !== "variable" && (
                <View style={s.tableRow}>
                  <Text style={s.tableLabelCell}>Discount</Text>
                  <Text style={[s.tableValueCell, { color: "#d97706" }]}>
                    {product.discountType === "percentage" ? `${product.discountAmount}%` : formatCurrency(product.discountAmount)}
                  </Text>
                </View>
              )}
              <View style={s.tableRowLast}>
                <Text style={s.tableLabelCell}>Net Selling Price</Text>
                <Text style={[s.tableValueCell, { fontFamily: "Helvetica-Bold", fontSize: 10, color: product.hasDiscount ? "#059669" : "#000" }]}>
                  {product.productType === "variable"
                    ? "See Variations"
                    : formatCurrency(
                      product.hasDiscount
                        ? (product.discountType === "percentage"
                          ? (parseFloat(product.sellingPriceInc) || 0) * (1 - (parseFloat(product.discountAmount) || 0) / 100)
                          : (parseFloat(product.sellingPriceInc) || 0) - (parseFloat(product.discountAmount) || 0))
                        : (parseFloat(product.sellingPriceInc) || 0)
                    )
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Variations Section */}
        {product.productType === "variable" && variations.length > 0 && (
          <View style={s.varSection}>
            <Text style={s.sectionHeader}>Product Variations List</Text>
            <View style={s.varTable}>
              {/* Table Header */}
              <View style={s.varHeaderRow}>
                <Text style={[s.varHeaderCell, { width: "10%" }]}>Image</Text>
                <Text style={[s.varHeaderCell, { width: "20%" }]}>SKU / Barcode</Text>
                <Text style={[s.varHeaderCell, { width: "35%" }]}>Variation Name</Text>
                <Text style={[s.varHeaderCell, { width: "15%" }]}>Price (Exc)</Text>
                <Text style={[s.varHeaderCell, { width: "20%" }]}>Price (Inc)</Text>
              </View>
              {/* Table Body */}
              {variations.map((v: any, vIdx: number) => (
                <View key={vIdx} style={s.varRow}>
                  <View style={[s.varCell, { width: "10%", alignItems: "center", justifyContent: "center" }]}>
                    {v.variationImage ? (
                      <Image src={v.variationImage} style={{ width: 20, height: 20, objectFit: "cover" }} />
                    ) : (
                      <Text style={{ fontSize: 5, color: "#ccc" }}>No Img</Text>
                    )}
                  </View>
                  <View style={[s.varCell, { width: "20%", alignItems: "center" }]}>
                    <Text style={{ fontSize: 7, marginBottom: 2 }}>{v.sku || "—"}</Text>
                    {v.barcodeUrl && (
                      <Image
                        src={`${window.location.origin}${v.barcodeUrl}`}
                        style={s.varBarcodeImage}
                      />
                    )}
                  </View>
                  <Text style={[s.varCell, { width: "35%" }]}>{v.name || "—"}</Text>
                  <Text style={[s.varCell, { width: "15%" }]}>{formatCurrency(v.sellingPriceExc)}</Text>
                  <Text style={[s.varCell, { width: "20%", fontFamily: "Helvetica-Bold" }]}>{formatCurrency(v.sellingPriceInc)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={s.descSection}>
          <Text style={s.descHeader}>Product Description</Text>
          <View style={s.descBody}>
            <Text>
              {product.productDescription
                ? stripHtml(product.productDescription)
                : "No description provided."}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>End of Product Report — Confidential Information</Text>
        </View>
        <view >
          {/* Secondary Barcode - bottom right */}
          {product.secondaryBarcode && (
            <View style={{
              alignItems: "flex-end",
              marginBottom: 10,
              borderTopWidth: 1,
              borderTopColor: "#eee",
              paddingTop: 8,
            }}>
              <Text style={{ fontSize: 6, color: "#888", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Secondary Barcode
              </Text>
              <Image
                src={`${window.location.origin}/api/products/barcode/${product.secondaryBarcode}`}
                style={s.barcodeImage}
              />
            </View>
          )}

          
        </view>
      </Page>

    </Document>
  );
}

// ─── Modal Content (Preview + Download) ──────────────────────────────────────
// Drop this inside your existing <Dialog> in place of the current print layout.
// Replace the entire {viewTarget && (...)} block with this component.

export function ProductPrintModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {/* PDF Preview */}
      <PDFViewer width="100%" height={520} showToolbar={false}>
        <ProductPDF product={product} />
      </PDFViewer>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 border-t pt-3">
        <PDFDownloadLink
          document={<ProductPDF product={product} />}
          fileName={`product-${product.sku ?? product.id}.pdf`}
        >
          {({ loading }) => (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Preparing..." : "Download PDF"}
            </button>
          )}
        </PDFDownloadLink>

        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}