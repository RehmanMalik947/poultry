import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, Plus, Receipt, Loader2, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useNavigate, Link } from "react-router";
import { DataTable, Column } from "../../components/shared/DataTable";
import { EntityActions } from "../../components/shared/EntityActions";
import { ApiService } from "../../../api/ApiService";
import { toast } from "sonner";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useBranch } from "../../contexts/BranchContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

// --------------------
// Types
// --------------------
type ExpenseRecord = {
  id: number;
  categoryName: string;
  referenceNo: string;
  date: string;
  expenseFor: string;
  amount: number;
  paymentMethod: string;
  createdBy?: { name: string } | null;
  usedBy?: { name: string } | null;
   applicableTax?: string;   // new
  taxAmount?: number;        // new
};

export function Expense() {
  const navigate = useNavigate();
  const { format: formatCurrency } = useCurrency();
  const { selectedBranchId } = useBranch();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.expenses.getAll({
        page,
        limit,
        q: search,
        branchId: selectedBranchId || undefined
      });
      if (res.success) {
        setExpenses(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedBranchId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await ApiService.expenses.delete(deleteId);
      toast.success("Expense deleted successfully");
      fetchExpenses();
      setDeleteId(null);
    } catch (err) {
      toast.error("Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ExpenseRecord>[] = [
    {
      header: "Actions",
      align: "left",
      render: (e) => (
        <EntityActions
          onEdit={() => navigate(`/expense/edit/${e.id}`)}
          onDelete={() => setDeleteId(e.id)}
        />
      ),
    },
    {
      header: "Date",
      render: (e) => new Date(e.date).toLocaleDateString("en-PK", { day: '2-digit', month: 'short', year: 'numeric' }),
      className: "text-gray-600 font-medium"
    },
    { header: "Category", accessor: "categoryName", className: "font-medium" },
    { header: "Reference", accessor: "referenceNo", className: "text-gray-500" },
    { header: "Expense for", accessor: "expenseFor" },
    { header: "Contact", render: (e) => e.usedBy?.name || "—", className: "text-gray-500" },
    { header: "Created By", render: (e) => e.createdBy?.name || "—", className: "text-gray-500 font-medium" },
    // ... after the Amount column block,
// add these two new column definitions:

{
  header: "Tax Type",
  align: "left",
  render: (e) => {
    const taxLabels: Record<string, string> = {
      none: "None",
      vat10: "VAT @10%",
      cgst10: "CGST @10%",
      sgst8: "SGST @8%",
      gst18: "GST @18%",
    };
    const tax = e.applicableTax || "none";
    return (
      <span className="text-gray-600 text-sm">
        {taxLabels[tax] || tax}
      </span>
    );
  },
},
{
  header: "Tax Amount",
  align: "right",
  render: (e) => (
    <span className="text-gray-700 font-medium">
      {formatCurrency(e.taxAmount || 0)}
    </span>
  ),
},

    {
      header: "Amount",
      align: "right",
      render: (e) => (
        <span className="text-primary font-bold">
          {formatCurrency(e.amount)}
        </span>
      ),
    },

  ];

  return (
    <div className="p-3 space-y-3  w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Receipt className="h-6 w-6" /> Expenses
        </h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExpenses}
            disabled={loading}
            className="h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Link to="/expense/add">
            <Button className="bg-primary hover:bg-primary/90 h-9">
              <Plus className="h-4 w-4 mr-2" /> Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <DataTable
        title="All Expenses"
        icon={Receipt}
        columns={columns}
        data={expenses}
        loading={loading}
        exportable
        exportFileName="expenses"
        pagination={{
          total,
          page,
          limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
          itemLabel: "expenses",
        }}
        filters={
          <div className="flex items-center gap-3">
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
                placeholder="Search by reference or reason..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
              />
            </div>
          </div>
        }
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
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