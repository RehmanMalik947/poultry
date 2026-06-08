import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, DollarSign, Banknote, Printer } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { ApiService } from '../../../../api/ApiService';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { registerSchema, type RegisterFormValues } from '../../../utils/validation';

interface PaymentBreakdown {
  [method: string]: { sell: number; dueCollected: number };
}

interface RegisterSummary {
  id: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  summary: {
    cashSales: number;
    cardSales: number;
    otherSales: number;
    cashIn: number;
    cashOut: number;
    expectedBalance: number;
    grossSales: number;
    totalRefunds: number;
    netSales: number;
    totalSales: number;
    totalCollected: number;
    pendingFromCustomers: number;
    paymentBreakdown: PaymentBreakdown;
    itemsSold: { itemName: string; itemType: string; quantity: number; total: number }[];
  };
}

interface RegisterDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number | null;
  registerId?: number | null;
}

function fmt(n: number, f: (v: number) => string) {
  return f(n ?? 0);
}

export default function RegisterDetailsModal({ isOpen, onClose, branchId, registerId }: RegisterDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RegisterSummary | null>(null);
  const { format: fc } = useCurrency();

  // Open register form
  const openForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { openingBalance: 0, note: '' },
  });

  // Close register inputs
  const [showCloseForm, setShowCloseForm] = useState(false);
  const closeRegisterSchema = z.object({
    closingBalance: z.coerce.number().min(0, 'Enter actual counted cash'),
    closingNote: z.string().optional().default(''),
  });
  type CloseRegisterFormValues = z.infer<typeof closeRegisterSchema>;
  const closeForm = useForm<CloseRegisterFormValues>({
    resolver: zodResolver(closeRegisterSchema),
    defaultValues: { closingBalance: 0, closingNote: '' },
  });

  // Cash flow inputs
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [flowType, setFlowType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const cashFlowSchema = z.object({
    flowAmount: z.coerce.number().min(0.01, 'Enter valid amount'),
    flowReason: z.string().optional().default(''),
  });
  type CashFlowFormValues = z.infer<typeof cashFlowSchema>;
  const flowForm = useForm<CashFlowFormValues>({
    resolver: zodResolver(cashFlowSchema),
    defaultValues: { flowAmount: 0, flowReason: '' },
  });

  const printRef = useRef<HTMLDivElement>(null);

  const fetchRegister = async () => {
    try {
      setLoading(true);
      let res;
      if (registerId) {
        res = await ApiService.register.getById(registerId);
      } else {
        res = await ApiService.register.getCurrent();
      }
      setData(res.success && res.data ? res.data : null);
    } catch {
      toast.error('Failed to load register details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRegister();
      setShowCloseForm(false);
      setShowFlowForm(false);
      openForm.reset();
      closeForm.reset();
      flowForm.reset();
    }
  }, [isOpen, registerId]);

  if (!isOpen) return null;

  const handleOpen = openForm.handleSubmit(async (data) => {
    try {
      setLoading(true);
      const res = await ApiService.register.open({ openingBalance: data.openingBalance || 0, note: data.note });
      if (res.success) { toast.success('Register opened'); await fetchRegister(); }
    } catch { toast.error('Failed to open register'); }
    finally { setLoading(false); }
  });

  const handleClose = closeForm.handleSubmit(async (formData) => {
    try {
      setLoading(true);
      const res = await ApiService.register.close({
        closingBalance: formData.closingBalance,
        expectedBalance: data?.summary.expectedBalance || 0,
        note: formData.closingNote,
      });
      if (res.success) { toast.success('Register closed'); onClose(); }
    } catch { toast.error('Failed to close register'); }
    finally { setLoading(false); }
  });

  const handleFlow = flowForm.handleSubmit(async (formData) => {
    try {
      setLoading(true);
      const res = await ApiService.register.addTransaction({ type: flowType, amount: formData.flowAmount, reason: formData.flowReason });
      if (res.success) {
        toast.success('Transaction added');
        flowForm.reset();
        setShowFlowForm(false);
        await fetchRegister();
      }
    } catch { toast.error('Failed to add transaction'); }
    finally { setLoading(false); }
  });

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Register Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 20px; }
        h2 { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 16px 0 8px; }
        .row { display: flex; justify-content: space-between; padding: 3px 0; }
        .total { font-weight: bold; border-top: 1px solid #999; padding-top: 4px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f0f0f0; text-align: left; padding: 4px 8px; font-size: 11px; }
        td { padding: 4px 8px; border-bottom: 1px solid #eee; }
      </style>
    </head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const s = data?.summary;
  const openedDate = data ? new Date(data.openedAt).toLocaleString() : '';
  const closedDate = data?.closedAt ? new Date(data.closedAt).toLocaleString() : 'Active';
  const payMethods = s ? Object.entries(s.paymentBreakdown) : [];
  const grandTotal = s ? Object.values(s.paymentBreakdown).reduce((a, v) => a + v.sell, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-800">Register Details</h2>
            {data && (
              <p className="text-xs text-gray-500 mt-0.5">
                {openedDate} – {closedDate}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                <Printer size={13} /> Print
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" ref={printRef}>
          {loading && !data ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin text-indigo-500" size={28} />
            </div>

          ) : !data ? (
            registerId ? (
              <div className="flex flex-col justify-center items-center h-40 text-gray-500">
                <X size={32} className="text-gray-300 mb-2" />
                <p>Register data not found or failed to load.</p>
              </div>
            ) : (
              /* ─── REGISTER CLOSED / OPEN FORM ─── */
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Banknote size={28} className="text-slate-400" />
                  </div>
                  <h3 className="font-bold text-gray-800">Register is Closed</h3>
                  <p className="text-sm text-gray-500 mt-1">Open the register to start tracking sales for this shift.</p>
                </div>

                <Form {...openForm}>
                  <form className="max-w-sm mx-auto bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
                    <FormField
                      control={openForm.control}
                      name="openingBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-gray-600">Opening Balance (Cash in drawer)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <Input type="number" min="0" placeholder="0.00" className="w-full h-10 pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={openForm.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-gray-600">Note (optional)</FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="e.g. Morning shift..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <button disabled={loading} onClick={handleOpen}
                      className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Open Register'}
                    </button>
                  </form>
                </Form>
              </div>
            )
          ) : (
            /* ─── REGISTER REPORT ─── */
            <div className="p-5 space-y-5 text-sm text-gray-700">

              {/* Cash Drawer Summary */}
              <section>
                <h2 className="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Cash Drawer Summary</h2>
                <div className="space-y-1.5">
                  <ReportRow label="Opening Balance" value={fc(parseFloat(String(data.openingBalance)))} />
                  <ReportRow label="(+) Cash Received (Sales)" value={fc(s!.cashSales)} positive />
                  <ReportRow label="(+) Cash In" value={fc(s!.cashIn)} positive />
                  <ReportRow label="(-) Cash Expenses / Out" value={fc(s!.cashOut)} negative />
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <ReportRow label="Expected Cash in Drawer" value={fc(s!.expectedBalance)} bold accent />
                  </div>
                </div>
              </section>

              {/* Sales Summary */}
              <section>
                <h2 className="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Sales Summary</h2>
                <div className="space-y-1.5">
                  <ReportRow label="Gross Sales (Total Invoices)" value={fc(s!.grossSales)} />
                  <ReportRow label="(-) Total Refund" value={fc(s!.totalRefunds)} negative={s!.totalRefunds > 0} />
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <ReportRow label="Net Sales" value={fc(s!.netSales)} bold accent />
                  </div>
                </div>
              </section>

              {/* Payments Collected */}
              <section>
                <h2 className="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Payments Collected</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left py-2 px-3 font-semibold">Payment Method</th>
                      <th className="text-right py-2 px-3 font-semibold">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payMethods.length === 0 ? (
                      <tr><td colSpan={2} className="text-center py-3 text-gray-400 italic">No payments yet</td></tr>
                    ) : payMethods.map(([method, val]) => (
                      <tr key={method} className="border-b border-gray-100">
                        <td className="py-2 px-3 capitalize">{method.replace('_', ' ')}</td>
                        <td className="py-2 px-3 text-right font-medium">{fc(val.sell)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-2 px-3">Grand Total Collected</td>
                      <td className="py-2 px-3 text-right text-indigo-700">{fc(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              {/* Outstanding Receivables */}
              <section>
                <h2 className="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Outstanding Receivables</h2>
                <div className="space-y-1.5">
                  <ReportRow label="Gross Sales (Total Invoices)" value={fc(s!.grossSales)} />
                  <ReportRow label="(-) Total Collected" value={fc(s!.totalCollected)} />
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <ReportRow
                      label="Pending from Customers"
                      value={fc(Math.abs(s!.pendingFromCustomers))}
                      bold
                      accent={s!.pendingFromCustomers > 0}
                      negative={s!.pendingFromCustomers < 0}
                    />
                  </div>
                </div>
              </section>

              {/* Details of Products Sold */}
              {s!.itemsSold && s!.itemsSold.length > 0 && (
                <section>
                  <h2 className="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Details of Products / Services Sold</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <th className="text-left py-2 px-3 font-semibold w-8">#</th>
                        <th className="text-left py-2 px-3 font-semibold">Item</th>
                        <th className="text-center py-2 px-3 font-semibold">Type</th>
                        <th className="text-center py-2 px-3 font-semibold">Qty</th>
                        <th className="text-right py-2 px-3 font-semibold">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s!.itemsSold.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium">{item.itemName}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              item.itemType === 'service' ? 'bg-blue-100 text-blue-700' :
                              item.itemType === 'package' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{item.itemType}</span>
                          </td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-medium">{fc(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="py-2 px-3">Grand Total</td>
                        <td className="py-2 px-3 text-center">
                          {s!.itemsSold.reduce((a, i) => a + i.quantity, 0)}
                        </td>
                        <td className="py-2 px-3 text-right text-indigo-700">
                          {fc(s!.itemsSold.reduce((a, i) => a + i.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </section>
              )}

              {/* Cash In / Out quick form */}
              {showFlowForm && (
                <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <h2 className="font-bold text-gray-800">Add Cash Transaction</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setFlowType('cash_in')}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium ${flowType === 'cash_in' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                      Cash In
                    </button>
                    <button onClick={() => setFlowType('cash_out')}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium ${flowType === 'cash_out' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                      Cash Out
                    </button>
                  </div>
                  <input type="number" min="0" placeholder="Amount"
                    {...flowForm.register('flowAmount', { valueAsNumber: true })}
                    className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm outline-none" />
                  <input type="text" placeholder="Reason (optional)"
                    {...flowForm.register('flowReason')}
                    className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowFlowForm(false)} className="flex-1 h-9 border border-gray-300 rounded-lg text-sm">Cancel</button>
                    <button onClick={handleFlow} disabled={loading}
                      className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center">
                      {loading ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
                    </button>
                  </div>
                </section>
              )}

              {/* Close Register form */}
              {showCloseForm && (
                <section className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <h2 className="font-bold text-red-800">Close Register</h2>
                  <div className="flex justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                    <span className="text-gray-600 text-sm">Expected Cash</span>
                    <span className="font-bold text-gray-800">{fc(s!.expectedBalance)}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Actual Cash Counted</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" min="0" placeholder="0.00"
                        {...closeForm.register('closingBalance', { valueAsNumber: true })}
                        className="w-full h-10 pl-8 border-2 border-gray-300 rounded-lg text-sm font-bold focus:border-red-400 outline-none" />
                    </div>
                    {closeForm.watch('closingBalance') > 0 && (
                      <p className={`text-xs mt-1 font-medium ${closeForm.watch('closingBalance') >= s!.expectedBalance ? 'text-green-600' : 'text-red-600'}`}>
                        Difference: {fc(closeForm.watch('closingBalance') - s!.expectedBalance)}
                      </p>
                    )}
                  </div>
                  <textarea rows={2} placeholder="Closing note..."
                    {...closeForm.register('closingNote')}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCloseForm(false)} className="flex-1 h-9 border border-gray-300 rounded-lg text-sm bg-white">Cancel</button>
                    <button onClick={handleClose} disabled={loading}
                      className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center justify-center">
                      {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Close'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {data && !showCloseForm && !showFlowForm && (
          <div className="flex gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
            {data.status === 'open' && (
              <button onClick={() => setShowFlowForm(true)}
                className="flex-1 h-9 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                + Cash In / Out
              </button>
            )}
            <button onClick={handlePrint}
              className="flex-1 h-9 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5">
              <Printer size={13} /> Print Detailed
            </button>
            {data.status === 'open' && (
              <button onClick={() => setShowCloseForm(true)}
                className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">
                Close Register
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable row component ─── */
function ReportRow({ label, value, bold, accent, positive, negative }: {
  label: string; value: string; bold?: boolean; accent?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center ${bold ? 'font-bold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={`${accent ? 'text-indigo-700' : negative ? 'text-red-600' : positive ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
