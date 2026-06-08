import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormValues } from "../../utils/validation";
import { Card, CardContent } from "../../components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Save, X, Receipt, CreditCard, Info } from "lucide-react";
import { ApiService } from "../../../api/ApiService";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router";
import { useCurrency } from "../../contexts/CurrencyContext";

export default function AddExpense() {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Data Lists
  const [locations, setLocations] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Form State (non-schema fields)
  const [locationId, setLocationId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [expenseFor, setExpenseFor] = useState("");
  const [usedById, setUsedById] = useState("");

  // Tax state
const [applicableTax, setApplicableTax] = useState("none");
const [taxAmount, setTaxAmount] = useState("0.00");
const [totalAmount, setTotalAmount] = useState("0.00");

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: "onChange",
    defaultValues: {
      categoryId: undefined,
      amount: undefined,
      date: "",
      description: "",
      referenceNo: "",
      paymentMethod: "cash",
    },
  });

  // Payment State
  const [paidOn, setPaidOn] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAccountId, setPaymentAccountId] = useState("none");
  const [chequeNo, setChequeNo] = useState("");
  const [externalAccountNo, setExternalAccountNo] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, catRes, staffRes, accountRes] = await Promise.all([
          ApiService.branches.getAll(),
          ApiService.expenseCategories.getAll(),
          ApiService.staff.getAll({ limit: 100 }),
          ApiService.accounts.getAll()
        ]);
        setLocations(locRes.data || []);
        setCategories(catRes.data || []);
        setStaff(staffRes.data || []);
        setAccounts(accountRes.data || []);
      } catch (err) {
        toast.error("Failed to fetch initial data");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const fetchExpense = async () => {
        setFetching(true);
        try {
          const res = await ApiService.expenses.getById(Number(id));
          if (res.success && res.data) {
            const exp = res.data;
            setLocationId(String(exp.branchId));
            setSubCategoryId(exp.subCategoryId ? String(exp.subCategoryId) : "none");
            setExpenseFor(exp.expenseFor || "");
            setUsedById(exp.usedById ? String(exp.usedById) : "none");
            form.reset({
              categoryId: exp.categoryId,
              amount: Number(exp.amount),
              date: exp.date ? String(exp.date).slice(0, 10) : "",
              description: exp.description || "",
              referenceNo: exp.referenceNo || "",
              paymentMethod: exp.paymentMethod || "cash",
            });
            setApplicableTax(exp.applicableTax || "none");
setTaxAmount(exp.taxAmount ? Number(exp.taxAmount).toFixed(2) : "0.00");
            
            setPaymentMethod(exp.paymentMethod || "cash");
            setPaymentAccountId(exp.paymentAccountId ? String(exp.paymentAccountId) : "none");
            setChequeNo(exp.chequeNo || "");
            setExternalAccountNo(exp.externalAccountNo || "");
            setPaymentNote(exp.paymentNote || "");
            setPaidOn(exp.paidOn ? new Date(exp.paidOn) : new Date(exp.date));
          }
        } catch (err) {
          toast.error("Failed to fetch expense details");
        } finally {
          setFetching(false);
        }
      };
      fetchExpense();
    }
  }, [isEdit, id]);

  useEffect(() => {
  const baseAmount = parseFloat(form.watch("amount")?.toString() || "0");
  let taxRate = 0;
  switch (applicableTax) {
    case "vat10":  taxRate = 0.10; break;
    case "cgst10": taxRate = 0.10; break;
    case "sgst8":  taxRate = 0.08; break;
    case "gst18":  taxRate = 0.18; break;
    default:       taxRate = 0;    break;
  }
  const tax = baseAmount * taxRate;
  setTaxAmount(tax.toFixed(2));
  setTotalAmount((baseAmount + tax).toFixed(2));
}, [applicableTax, form.watch("amount")]);

  const handleSave = async (values: ExpenseFormValues) => {
    if (!locationId) {
      toast.error("Please select a business location");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        branchId: locationId,
        categoryId: values.categoryId,
        subCategoryId: (subCategoryId && subCategoryId !== "none") ? subCategoryId : null,
        referenceNo: values.referenceNo,
        date: values.date,
        expenseFor,
        usedById: usedById !== "none" ? usedById : null,
        amount: values.amount,
         applicableTax,
  taxAmount: parseFloat(taxAmount) || 0,
        paymentMethod: values.paymentMethod,
        paymentAccountId: paymentAccountId !== "none" ? Number(paymentAccountId) : null,
        chequeNo: paymentMethod === "cheque" ? chequeNo : null,
        externalAccountNo: paymentMethod === "bank_transfer" ? externalAccountNo : null,
        paymentNote,
        paidOn: format(paidOn, "yyyy-MM-dd"),
      };

      if (isEdit) {
        await ApiService.expenses.update(Number(id), payload);
        toast.success("Expense updated successfully");
      } else {
        await ApiService.expenses.create(payload);
        toast.success("Expense recorded successfully");
      }
      navigate("/expense");
    } catch (err) {
      toast.error("Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => String(c.id) === form.watch('categoryId'));
  const subCategories = selectedCategory?.subCategories || [];

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full mx-auto pb-10 mt-2 px-3">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Receipt className="h-7 w-7 text-primary" />
          {isEdit ? "Edit Expense" : "Add Expense"}
        </h1>
        <Button variant="outline" onClick={() => navigate("/expense")} className="hover:bg-gray-100 border-gray-300">
          <X className="h-4 w-4 mr-2" /> Cancel
        </Button>
      </div>

      <Form {...form}>
        <form id="expense-form" onSubmit={form.handleSubmit(handleSave)} className="grid grid-cols-1 gap-4">
          {/* Main Form Card */}
          <Card className="shadow-sm border-gray-200">
            <div className="bg-primary px-5 py-2 rounded-t-md">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4" /> Basic Information
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Business Location:*</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Category:*</FormLabel>
                      <Select
                        onValueChange={(v) => { field.onChange(Number(v)); setSubCategoryId("none"); }}
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.filter(c => !c.parentId).map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Sub Category:</Label>
                  <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                    <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
                      <SelectValue placeholder="Select Sub Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subCategories.map((sub: any) => (
                        <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="referenceNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference No:</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated if empty" className="h-10 border-gray-300 focus:ring-primary/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date:*</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-10 border-gray-300 focus:ring-primary/20 w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Expense for:</Label>
                  <Input value={expenseFor} onChange={(e) => setExpenseFor(e.target.value)} placeholder="e.g. Electricity Bill" className="h-10 border-gray-300 focus:ring-primary/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Staff (Used By):</Label>
                  <Select value={usedById} onValueChange={setUsedById}>
                    <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
                      <SelectValue placeholder="Select Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount:*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-400 font-medium">{symbol}</span>
                          <Input type="number" placeholder="0.00" className="h-10 pl-10 text-lg font-bold text-primary border-gray-300 bg-gray-50/50" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tax Section */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-gray-700">Applicable Tax:</Label>
    <Select value={applicableTax} onValueChange={setApplicableTax}>
      <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        <SelectItem value="vat10">VAT @10%</SelectItem>
        <SelectItem value="cgst10">CGST @10%</SelectItem>
        <SelectItem value="sgst8">SGST @8%</SelectItem>
        <SelectItem value="gst18">GST @18%</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-gray-700">Tax Amount:</Label>
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-gray-400 font-medium">{symbol}</span>
      <Input
        value={taxAmount}
        readOnly
        className="h-10 pl-10 bg-gray-50 text-gray-600 font-medium"
      />
    </div>
  </div>
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-gray-700">Total Amount (Inc. Tax):</Label>
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-gray-400 font-medium">{symbol}</span>
      <Input
        value={totalAmount}
        readOnly
        className="h-10 pl-10 bg-gray-50 text-gray-800 font-bold text-lg"
      />
    </div>
  </div>
</div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description..." className="min-h-[80px] border-gray-300 focus:ring-primary/20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Payment Section Card */}
          <Card className="shadow-sm border-gray-200">
            <div className="bg-primary px-5 py-2 rounded-t-md">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Details
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Payment Account (Bank/Cash):</Label>
                  <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                    <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
                      <SelectValue placeholder="Select Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Cash (None)</SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>{acc.bankName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-gray-400 italic mt-1 px-1">If not selected, payment will be from Cash.</p>
                </div>

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method:</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v); setPaymentMethod(v); }} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 border-gray-300 focus:ring-primary/20">
                            <SelectValue placeholder="Select Method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {paymentMethod === "cheque" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-sm font-medium text-gray-700">Cheque Number:</Label>
                    <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} placeholder="Enter cheque number" className="h-10 border-gray-300 focus:ring-primary/20" />
                  </div>
                )}

                {paymentMethod === "bank_transfer" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-sm font-medium text-gray-700">Recipient Account No:</Label>
                    <Input value={externalAccountNo} onChange={(e) => setExternalAccountNo(e.target.value)} placeholder="Enter recipient account number" className="h-10 border-gray-300 focus:ring-primary/20" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Expense Note / Payment Note:</Label>
                <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Add any extra details, reference or notes here..." className="min-h-[100px] border-gray-300 focus:ring-primary/20" />
              </div>

              <div className="flex justify-end pt-4 gap-3 border-t border-gray-100">
                <Button variant="outline" onClick={() => navigate("/expense")} className="h-11 px-8 border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="h-11 px-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-md transition-all active:scale-95">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                  {isEdit ? "Update Expense" : "Save Expense"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
