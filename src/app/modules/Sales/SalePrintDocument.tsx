import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import React from "react";
import { Receipt, Printer } from "lucide-react";
import { useCurrency } from "../../contexts/CurrencyContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type SaleRecord = {
  id: number;
  Customer?: { name: string; phone: string | null } | null;
  Staff?: { firstName: string; lastName: string } | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  status: string;
  paymentMethod?: string | null;
  items: { serviceName: string; price: number; quantity: number }[];
  Payments?: {
    id: number;
    amount: number;
    paymentMethod: string;
    cardHolder?: string;
    cardType?: string;
    cardNumberLast4?: string;
    chequeNo?: string;
    chequeBank?: string;
    chequeDate?: string;
    accountHolder?: string;
    createdAt: string;
  }[];
  createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────



// ─── Styles ──────────────────────────────────────────────────────────────────
// Consolidated with ProductPrintDocument styles for UI consistency

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

  // Info Section (Three cols like Product Top Row)
  topRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  infoCol: { flex: 1 },
  
  // Table-like Info
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

  // Items Table
  itemsTable: { width: "100%", marginTop: 10, borderTopWidth: 1, borderTopColor: "#ccc" },
  itemsHeaderRow: { flexDirection: "row", backgroundColor: "#337ab7" },
  itemsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee" },
  itemsCell: { padding: "4 6", fontSize: 7, borderRightWidth: 1, borderRightColor: "#eee" },
  itemsHeaderCell: { 
    padding: "4 6", 
    fontSize: 7, 
    fontFamily: "Helvetica-Bold", 
    color: "#fff", 
    borderRightWidth: 1, 
    borderRightColor: "rgba(255,255,255,0.2)" 
  },

  // Summary
  summarySection: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBlock: {
    width: "40%",
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 2,
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  summaryRowLast: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
  },
  summaryLabel: {
    width: "50%",
    padding: "4 6",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f4f6",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  summaryValue: {
    width: "50%",
    padding: "4 6",
    fontSize: 8,
    textAlign: "right",
  },

  // Status Badges
  badgePaid: { backgroundColor: "#dcfce7", color: "#15803d", padding: "2 6", borderRadius: 3, fontSize: 7, fontFamily: "Helvetica-Bold" },
  badgeDue: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: "2 6", borderRadius: 3, fontSize: 7, fontFamily: "Helvetica-Bold" },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 6,
    marginTop: 20,
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 1 },
});

// ─── PDF Document ─────────────────────────────────────────────────────────────

function SalePDF({ sale }: { sale: SaleRecord }) {
  const { format: formatCurrency } = useCurrency();
  const items = sale.items || (sale as any).SaleItems || [];
  const status = sale.status ? sale.status.toLowerCase() : 'unpaid';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Invoice Record</Text>
            <Text style={s.headerDate}>Sales Date: {new Date(sale.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerCompany}>SALON PRO MANAGEMENT</Text>
            <Text style={s.headerSub}>Official Invoice Details</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={s.topRow}>
          <View style={s.infoCol}>
            <Text style={s.sectionHeader}>Bill Information</Text>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Invoice #</Text>
                <Text style={s.tableValueCell}>{sale.id}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Customer</Text>
                <Text style={s.tableValueCell}>{sale.Customer?.name || "Walk-in Customer"}</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={s.tableLabelCell}>Staff</Text>
                <Text style={s.tableValueCell}>{sale.Staff ? `${sale.Staff.firstName} ${sale.Staff.lastName}` : "—"}</Text>
              </View>
            </View>
          </View>

          <View style={s.infoCol}>
            <Text style={s.sectionHeader}>Payment Status</Text>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Status</Text>
                <View style={[s.tableValueCell, { justifyContent: "center" }]}>
                   <Text style={status === 'paid' ? s.badgePaid : s.badgeDue}>
                    {status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={s.tableRow}>
                <Text style={s.tableLabelCell}>Method</Text>
                <Text style={s.tableValueCell}>{sale.paymentMethod || "N/A"}</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={s.tableLabelCell}>Amount Paid</Text>
                <Text style={[s.tableValueCell, { fontFamily: "Helvetica-Bold", color: "#15803d" }]}>
                  {formatCurrency(sale.amountPaid)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <Text style={s.sectionHeader}>Services & Products</Text>
        <View style={s.itemsTable}>
          <View style={s.itemsHeaderRow}>
            <Text style={[s.itemsHeaderCell, { width: "10%" }]}>#</Text>
            <Text style={[s.itemsHeaderCell, { width: "45%" }]}>Description</Text>
            <Text style={[s.itemsHeaderCell, { width: "15%", textAlign: "center" }]}>Qty</Text>
            <Text style={[s.itemsHeaderCell, { width: "15%", textAlign: "right" }]}>Price</Text>
            <Text style={[s.itemsHeaderCell, { width: "15%", textAlign: "right" }]}>Total</Text>
          </View>
          {items.map((it: any, i: number) => (
            <View key={i} style={s.itemsRow}>
              <Text style={[s.itemsCell, { width: "10%" }]}>{i + 1}</Text>
              <Text style={[s.itemsCell, { width: "45%" }]}>{it.serviceName || it.itemName || "—"}</Text>
              <Text style={[s.itemsCell, { width: "15%", textAlign: "center" }]}>{it.quantity}</Text>
              <Text style={[s.itemsCell, { width: "15%", textAlign: "right" }]}>{formatCurrency(it.price)}</Text>
              <Text style={[s.itemsCell, { width: "15%", textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                {formatCurrency(it.price * it.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Summary */}
        <View style={s.summarySection}>
          <View style={s.summaryBlock}>
            <View style={s.summaryTable}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Subtotal</Text>
                <Text style={s.summaryValue}>{formatCurrency(sale.subtotal)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Tax ({sale.taxPercent}%)</Text>
                <Text style={s.summaryValue}>{formatCurrency(sale.taxAmount)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Discount</Text>
                <Text style={s.summaryValue}>-{formatCurrency(sale.discountAmount)}</Text>
              </View>
              <View style={s.summaryRowLast}>
                <Text style={[s.summaryLabel, { backgroundColor: "#111", color: "#fff" }]}>Grand Total</Text>
                <Text style={[s.summaryValue, { fontFamily: "Helvetica-Bold", fontSize: 10 }]}>{formatCurrency(sale.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment History Section */}
        {sale.Payments && sale.Payments.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={s.sectionHeader}>Payment History</Text>
            <View style={s.itemsTable}>
              <View style={s.itemsHeaderRow}>
                <Text style={[s.itemsHeaderCell, { width: "20%" }]}>Date</Text>
                <Text style={[s.itemsHeaderCell, { width: "15%" }]}>Method</Text>
                <Text style={[s.itemsHeaderCell, { width: "45%" }]}>Details</Text>
                <Text style={[s.itemsHeaderCell, { width: "20%", textAlign: "right" }]}>Amount</Text>
              </View>
              {sale.Payments.map((p, i) => (
                <View key={i} style={s.itemsRow}>
                  <Text style={[s.itemsCell, { width: "20%" }]}>{new Date(p.createdAt).toLocaleDateString()}</Text>
                  <Text style={[s.itemsCell, { width: "15%", textTransform: 'capitalize' }]}>{p.paymentMethod}</Text>
                  <Text style={[s.itemsCell, { width: "45%", fontSize: 6 }]}>
                    {p.paymentMethod === 'card' && (
                      `Holder: ${p.cardHolder || 'N/A'} | ${p.cardType || ''} ****${p.cardNumberLast4 || ''}`
                    )}
                    {p.paymentMethod === 'cheque' && (
                      `No: ${p.chequeNo || 'N/A'} | Bank: ${p.chequeBank || 'N/A'} | Date: ${p.chequeDate ? new Date(p.chequeDate).toLocaleDateString() : 'N/A'}`
                    )}
                    {p.paymentMethod === 'cash' && 'Cash Transaction'}
                    {p.paymentMethod === 'bank_transfer' && 'Bank Transfer'}
                    {p.paymentMethod === 'other' && 'Other Payment'}
                  </Text>
                  <Text style={[s.itemsCell, { width: "20%", textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                    {formatCurrency(p.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>End of Sale Report — Generated by Salon Pro</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Modal Content ─────────────────────────────────────────────────────────────

export function SalePrintModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {/* PDF Preview */}
      <div className="border-4 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xl">
        <PDFViewer width="100%" height={600} showToolbar={false} className="border-0">
          <SalePDF sale={sale} />
        </PDFViewer>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 border-t pt-5">
        <PDFDownloadLink
          document={<SalePDF sale={sale} />}
          fileName={`invoice-${sale.id}.pdf`}
        >
          {({ loading }) => (
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-black hover:bg-slate-800 text-white text-sm font-bold transition-all shadow-xl hover:scale-105"
              disabled={loading}
            >
              <Printer className="w-5 h-5 text-white" />
              {loading ? "PREPARING PDF..." : "DOWNLOAD PDF"}
            </button>
          )}
        </PDFDownloadLink>

        <button
          onClick={onClose}
          className="px-8 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold border-2 border-slate-200 transition-all"
        >
          DONE
        </button>
      </div>
    </div>
  );
}
