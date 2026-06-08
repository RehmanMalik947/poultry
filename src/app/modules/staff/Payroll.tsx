
import { useState, useCallback, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import {
  Wallet,
  History,
  List,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Download,
  CheckCircle,
  Pencil,
  Trash2,
  UserCheck,
  MapPin,
  Users,
  DollarSign,
  Eye,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranch, getAuthHeadersWithBranch } from '../../contexts/BranchContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { canManage } from '../../utils/permissions';
import { EntityActions } from '../../components/shared/EntityActions';
import { TablePagination } from '../../components/shared/TablePagination';
import { EntityDetailLayout, DetailSection, DetailField } from '../../components/layout/EntityDetailLayout';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { DataTable, Column } from "../../components/shared/DataTable";
import { API_BASE } from '../../../api/ApiService';
import React from 'react';

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const str = String(dateStr).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
}
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';



const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type StaffOption = { id: number; firstName: string; lastName?: string | null; email: string };

type UserSalaryRecord = {
  id: number;
  staffId: number;
  staffName: string | null;
  salaryType: string;
  amount: number;
  effectiveFrom: string;
  status: string;
  staffRole?: string | null;
};

type AttendanceRecord = {
  id: number;
  staffId: number;
  staffName: string | null;
  date: string;
  status: string;
};

type PayrollRecord = {
  id: number;
  staffId: number;
  staffName: string | null;
  month: number;
  year: number;
  baseSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  status: string;
  paidAt: string | null;
  generatedBy: string | null;
  staffRole?: string | null;
};

type BonusDeductionLine = {
  id: number;
  payrollId: number;
  type: string;
  amount: number;
  reason: string | null;
  date?: string | null;
};

function staffDisplayName(s: StaffOption): string {
  const first = s.firstName || '';
  const last = s.lastName || '';
  return [first, last].filter(Boolean).join(' ').trim() || s.email;
}



function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

type PayrollSlipData = {
  staffId: number;
  staffName: string | null;
  month: number;
  year: number;
  baseSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  status: string;
  paidAt: string | null;
  bonusDeductionLines?: { type: string; amount: number; reason: string | null }[];
};

const slipPdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  title: { fontSize: 18, marginBottom: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 12, marginBottom: 16, color: '#374151' },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { width: 140, fontWeight: 'bold' },
  value: { flex: 1 },
  section: { marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: 'bold' },
  line: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 4 },
  footer: { marginTop: 32, fontSize: 9, color: '#6b7280' },
});

function SalarySlipPdf({ data, monthName, symbol }: { data: PayrollSlipData; monthName: string; symbol: string }) {
  const { format: formatCurrency } = useCurrency();
  const bdLines = data.bonusDeductionLines || [];
  const format = (amt: number) => formatCurrency(amt);
  return (
    <Document>
      <Page size="A4" style={slipPdfStyles.page}>
        <Text style={slipPdfStyles.title}>Salary Slip</Text>
        <Text style={slipPdfStyles.subtitle}>
          {monthName} {data.year}
        </Text>
        <View style={slipPdfStyles.line} />
        <View style={slipPdfStyles.row}>
          <Text style={slipPdfStyles.label}>Staff</Text>
          <Text style={slipPdfStyles.value}>{data.staffName ?? '—'}</Text>
        </View>
        <View style={slipPdfStyles.row}>
          <Text style={slipPdfStyles.label}>Base Salary</Text>
          <Text style={slipPdfStyles.value}>{format(data.baseSalary)}</Text>
        </View>
        {bdLines.length > 0 && (
          <>
            <Text style={slipPdfStyles.section}>Bonus / Deduction</Text>
            {bdLines.map((l, i) => (
              <View key={i} style={slipPdfStyles.row}>
                <Text style={slipPdfStyles.label}>{l.type === 'bonus' ? 'Bonus' : 'Deduction'}</Text>
                <Text style={slipPdfStyles.value}>
                  {format(l.amount)}
                  {l.reason ? ` — ${l.reason}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}
        <View style={slipPdfStyles.line} />
        <View style={slipPdfStyles.row}>
          <Text style={slipPdfStyles.label}>Total Bonus</Text>
          <Text style={slipPdfStyles.value}>{format(data.bonus)}</Text>
        </View>
        <View style={slipPdfStyles.row}>
          <Text style={slipPdfStyles.label}>Total Deduction</Text>
          <Text style={slipPdfStyles.value}>{format(data.deduction)}</Text>
        </View>
        <View style={slipPdfStyles.row}>
          <Text style={[slipPdfStyles.label, { fontWeight: 'bold', fontSize: 12 }]}>Net Salary</Text>
          <Text style={[slipPdfStyles.value, { fontWeight: 'bold', fontSize: 12 }]}>{format(data.netSalary)}</Text>
        </View>
        <View style={slipPdfStyles.line} />
        <View style={slipPdfStyles.row}>
          <Text style={slipPdfStyles.label}>Status</Text>
          <Text style={slipPdfStyles.value}>{data.status}</Text>
        </View>
        {data.paidAt && (
          <View style={slipPdfStyles.row}>
            <Text style={slipPdfStyles.label}>Paid on</Text>
            <Text style={slipPdfStyles.value}>{formatDate(data.paidAt)}</Text>
          </View>
        )}
        <Text style={slipPdfStyles.footer}>
          Generated on {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })} — Salary slip for payroll record.
        </Text>
      </Page>
    </Document>
  );
}

type GenerateForType = 'individual' | 'location';

export function Payroll() {
  const navigate = useNavigate();
  const { selectedBranchId, branches, branchesLoading } = useBranch();
  const { symbol, format: formatCurrency } = useCurrency();
  const canEdit = canManage();

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Current payroll
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [payrollTotal, setPayrollTotal] = useState(0);
  const [payrollPage, setPayrollPage] = useState(1);
  const payrollLimit = 10;
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [markPaidLoading, setMarkPaidLoading] = useState<number | null>(null);
  const [deletePayrollTarget, setDeletePayrollTarget] = useState<PayrollRecord | null>(null);
  const [deletePayrollLoading, setDeletePayrollLoading] = useState(false);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [viewingPayroll, setViewingPayroll] = useState<PayrollRecord | null>(null);
  const [bonusDeductionLines, setBonusDeductionLines] = useState<BonusDeductionLine[]>([]);
  const [bonusDeductionLoading, setBonusDeductionLoading] = useState(false);
  const [newLineType, setNewLineType] = useState<'bonus' | 'deduction'>('bonus');
  const [newLineAmount, setNewLineAmount] = useState('');
  const [newLineReason, setNewLineReason] = useState('');
  const [addLineSaving, setAddLineSaving] = useState(false);
  const [deletingLineId, setDeletingLineId] = useState<number | null>(null);
  const [editingLine, setEditingLine] = useState<BonusDeductionLine | null>(null);
  const [editLineType, setEditLineType] = useState<'bonus' | 'deduction'>('bonus');
  const [editLineAmount, setEditLineAmount] = useState('');
  const [editLineReason, setEditLineReason] = useState('');
  const [editLineSaving, setEditLineSaving] = useState(false);

  // History (same list, different default params)
  const [historyList, setHistoryList] = useState<PayrollRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");

  // Pay Items (UserSalary)
  const [payItems, setPayItems] = useState<UserSalaryRecord[]>([]);
  const [payItemsTotal, setPayItemsTotal] = useState(0);
  const [payItemsPage, setPayItemsPage] = useState(1);
  const [payItemsLimit, setPayItemsLimit] = useState(10);
  const [payItemsLoading, setPayItemsLoading] = useState(false);
  const [searchPayItems, setSearchPayItems] = useState("");

  const payItemSchema = z.object({
    staffId: z.coerce.number().min(1, "Staff is required"),
    salaryType: z.enum(["daily", "weekly", "monthly"]),
    amount: z.coerce.number().min(0, "Must be positive"),
    effectiveFrom: z.string().min(1, "Effective from date is required"),
  });
  type PayItemFormValues = z.infer<typeof payItemSchema>;

  const payItemForm = useForm<PayItemFormValues>({
    resolver: zodResolver(payItemSchema),
    defaultValues: {
      staffId: undefined as any,
      salaryType: "monthly",
      amount: undefined as any,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    },
  });

  const [payItemDialogOpen, setPayItemDialogOpen] = useState(false);
  const [viewOnlyPayItem, setViewOnlyPayItem] = useState(false);
  const [editingPayItem, setEditingPayItem] = useState<UserSalaryRecord | null>(null);
  const payItemStaffId = payItemForm.watch('staffId') !== undefined ? String(payItemForm.watch('staffId')) : '';
  const payItemSalaryType = payItemForm.watch('salaryType');
  const payItemAmount = payItemForm.watch('amount') !== undefined ? String(payItemForm.watch('amount')) : '';
  const payItemEffectiveFrom = payItemForm.watch('effectiveFrom') || new Date().toISOString().slice(0, 10);
  const [payItemSaving, setPayItemSaving] = useState(false);
  const [deletePayItemTarget, setDeletePayItemTarget] = useState<UserSalaryRecord | null>(null);
  const [payItemDeleting, setPayItemDeleting] = useState(false);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  // Generate payroll: "Generate For" (Individual | Location) + multi-select
  const [generateFor, setGenerateFor] = useState<GenerateForType>('individual');
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [lastGeneratedCount, setLastGeneratedCount] = useState<number | null>(null);
  const [lastSkippedCount, setLastSkippedCount] = useState<number | null>(null);
  const [generatePayrollDialogOpen, setGeneratePayrollDialogOpen] = useState(false);
  /** Earliest effectiveFrom (salary start) per staffId – used to filter payroll eligibility (must have completed 1 month). */
  const [staffEarliestEffectiveFrom, setStaffEarliestEffectiveFrom] = useState<Record<number, string>>({});

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendancePage, setAttendancePage] = useState(1);
  const attendanceLimit = 10;
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [bulkAttendanceOpen, setBulkAttendanceOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkEntries, setBulkEntries] = useState<{ staffId: number; staffName: string; status: string }[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [attendanceDatePickerOpen, setAttendanceDatePickerOpen] = useState(false);
  const [bulkDatePickerOpen, setBulkDatePickerOpen] = useState(false);
  const [payItemEffectiveFromPickerOpen, setPayItemEffectiveFromPickerOpen] = useState(false);
  const [generationStep, setGenerationStep] = useState(1); // 1: Select, 2: Details
  const [detailedPayrollData, setDetailedPayrollData] = useState<Record<number, any>>({});

  // Attendance History
  const [attendanceHistoryList, setAttendanceHistoryList] = useState<AttendanceRecord[]>([]);
  const [attendanceHistoryTotal, setAttendanceHistoryTotal] = useState(0);
  const [attendanceHistoryPage, setAttendanceHistoryPage] = useState(1);
  const [attendanceHistoryLimit, setAttendanceHistoryLimit] = useState(10);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [searchAttendanceHistory, setSearchAttendanceHistory] = useState("");
  const [attendanceHistoryMonth, setAttendanceHistoryMonth] = useState(now.getMonth() + 1);
  const [attendanceHistoryYear, setAttendanceHistoryYear] = useState(now.getFullYear());
  const [attendanceHistoryStaffId, setAttendanceHistoryStaffId] = useState<string>('');
  // Record<staffId, status>


  const currentPayrollColumns: Column<PayrollRecord>[] = [
    { header: 'Staff', accessor: 'staffName', className: 'font-semibold text-gray-900' },
    { header: 'Role', render: (row) => <span className="text-xs text-gray-500 capitalize">{row.staffRole || 'Staff'}</span> },
    { header: 'Base', render: (row) => formatCurrency(row.baseSalary), },
    { header: 'Bonus', render: (row) => formatCurrency(row.bonus), className: 'text-green-600' },
    { header: 'Deduction', render: (row) => formatCurrency(row.deduction), className: 'text-red-600' },
    { header: 'Net', render: (row) => formatCurrency(row.netSalary), className: 'font-bold' },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'paid' ? 'default' : 'secondary'}>
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <EntityActions
          onView={() => setViewingPayroll(row)}
          onEdit={canEdit ? () => openEditPayroll(row) : undefined}
          onDelete={canEdit ? () => setDeletePayrollTarget(row) : undefined}
          canEditDelete={canEdit}
          extraActions={[
            {
              label: 'Download Slip',
              icon: Download,
              onClick: () => handleDownloadSlip(row.id)
            },
            ...(row.status !== 'paid' ? [{
              label: markPaidLoading === row.id ? 'Processing...' : 'Mark as Paid',
              icon: markPaidLoading === row.id ? Loader2 : CheckCircle,
              onClick: () => handleMarkPaid(row.id),
              className: 'text-green-600'
            }] : [])
          ]}
        />
      )
    }
  ];

  const historyColumns: Column<PayrollRecord>[] = [
    { header: 'Staff', accessor: 'staffName', className: 'font-semibold text-gray-900' },
    { header: 'Role', accessor: 'staffRole', className: 'capitalize text-gray-500' },
    { header: 'Period', render: (row) => `${MONTHS[row.month]} ${row.year}` },
    { header: 'Net Salary', render: (row) => formatCurrency(row.netSalary), className: 'font-bold' },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'paid' ? 'default' : 'secondary'}>{row.status}</Badge>
      )
    },
    { header: 'Paid on', render: (row) => formatDate(row.paidAt) },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <EntityActions
          onView={() => setViewingPayroll(row)}
          onDelete={canEdit ? () => setDeletePayrollTarget(row) : undefined}
          canEditDelete={canEdit}
          extraActions={[
            {
              label: 'Download Slip',
              icon: Download,
              onClick: () => handleDownloadSlip(row.id)
            }
          ]}
        />
      )
    }
  ];

  const attendanceColumns: Column<AttendanceRecord>[] = [
    { header: 'Staff', accessor: 'staffName', className: 'font-semibold text-gray-900' },
    { header: 'Date', accessor: 'date' },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'present' ? 'default' : 'secondary'}>{row.status}</Badge>
      )
    }
  ];

  const payItemColumns: Column<UserSalaryRecord>[] = [
    { header: 'Staff', accessor: 'staffName', className: 'font-semibold text-gray-900' },
    {
      header: 'Role',
      render: (row) => (
        <Badge variant="outline" className="font-normal capitalize bg-gray-50">
          {row.staffRole || 'Staff'}
        </Badge>
      )
    },
    { header: 'Type', accessor: 'salaryType', className: 'capitalize' },
    { header: 'Amount', render: (row) => formatCurrency(row.amount), className: 'font-bold' },
    { header: 'Hiring from', accessor: 'effectiveFrom' },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <EntityActions
          onView={() => navigate('/staff', { state: { openStaffId: row.staffId, openStep: 2, viewOnly: true, payItem: { id: row.id, salaryType: row.salaryType, amount: row.amount, effectiveFrom: row.effectiveFrom } } })}
          onEdit={canEdit ? () => navigate('/staff', { state: { openStaffId: row.staffId, openStep: 2, viewOnly: false, payItem: { id: row.id, salaryType: row.salaryType, amount: row.amount, effectiveFrom: row.effectiveFrom }, fromPayItemEdit: true } }) : undefined}
          onDelete={canEdit ? () => setDeletePayItemTarget(row) : undefined}
          canEditDelete={canEdit}
        />
      )
    }
  ];

  const attendanceHistoryColumns: Column<AttendanceRecord>[] = [
    { header: 'Staff', accessor: 'staffName', className: 'font-semibold text-gray-900' },
    { header: 'Date', accessor: 'date' },
    {
      header: 'Status',
      render: (row) => {
        const statusColors: Record<string, string> = {
          present: 'bg-green-100 text-green-800',
          absent: 'bg-red-100 text-red-800',
          leave: 'bg-amber-100 text-amber-800',
          late: 'bg-blue-100 text-blue-800',
        };
        return (
          <Badge className={statusColors[row.status] || 'bg-gray-100 text-gray-800'}>
            {row.status}
          </Badge>
        );
      }
    }
  ];

  const [activeTab, setActiveTab] = useState('employees');
  const [attendanceEntries, setAttendanceEntries] = useState<Record<number, string>>({});

  // Sync attendance list from server to local editable state
  useEffect(() => {
    const entries: Record<number, string> = {};
    attendanceList.forEach(a => {
      entries[a.staffId] = a.status;
    });
    setAttendanceEntries(entries);
  }, [attendanceList]);



  const handleAttendanceChange = (staffId: number, status: string) => {
    setAttendanceEntries(prev => ({ ...prev, [staffId]: status }));
  };

  const handleMarkAllPresent = () => {
    const newEntries: Record<number, string> = {};
    staffList.forEach(s => {
      newEntries[s.id] = 'present';
    });
    setAttendanceEntries(newEntries);
  };

  const saveAttendance = async () => {
    if (selectedBranchId == null) return;
    setBulkSaving(true);
    try {
      const entries = staffList.map(s => ({
        staffId: s.id,
        status: attendanceEntries[s.id] || 'absent'
      }));

      const res = await fetch(`${API_BASE}/attendances/bulk`, {
        method: 'POST',
        headers: getAuthHeadersWithBranch(selectedBranchId),
        body: JSON.stringify({
          date: attendanceDate,
          entries
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Attendance saved successfully');
        fetchAttendance();
      } else {
        toast.error(data.message || 'Failed to save attendance');
      }
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setBulkSaving(false);
    }
  };

  const fetchAttendanceHistory = useCallback(async () => {
    if (selectedBranchId == null) return;
    setAttendanceHistoryLoading(true);
    try {
      const firstDay = `${attendanceHistoryYear}-${String(attendanceHistoryMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(attendanceHistoryYear, attendanceHistoryMonth, 0).toISOString().split('T')[0];

      let url = `${API_BASE}/attendances?from=${firstDay}&to=${lastDay}&page=${attendanceHistoryPage}&limit=${attendanceHistoryLimit}`;

      if (attendanceHistoryStaffId) {
        url += `&staffId=${attendanceHistoryStaffId}`;
      }

      if (searchAttendanceHistory) {
        url += `&search=${searchAttendanceHistory}`;
      }

      const res = await fetch(url, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceHistoryList(data.data || []);
        setAttendanceHistoryTotal(data.total ?? 0);
      }
    } catch (e) {
      toast.error('Failed to load attendance history');
    } finally {
      setAttendanceHistoryLoading(false);
    }
  }, [selectedBranchId, attendanceHistoryMonth, attendanceHistoryYear, attendanceHistoryStaffId, attendanceHistoryPage, searchAttendanceHistory]);

  const fetchPayroll = useCallback(async () => {
    if (selectedBranchId == null) return;
    setPayrollLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/payrolls?month=${currentMonth}&year=${currentYear}&page=${payrollPage}&limit=${payrollLimit}`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const data = await res.json();
      if (data.success) {
        setPayrollList(data.data || []);
        setPayrollTotal(data.total ?? 0);
      }
    } catch (e) {
      toast.error('Failed to load payroll');
    } finally {
      setPayrollLoading(false);
    }
  }, [selectedBranchId, currentMonth, currentYear, payrollPage]);

  const fetchHistory = useCallback(async () => {
    if (selectedBranchId == null) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/payrolls/history?page=${historyPage}&limit=${historyLimit}&search=${searchHistory || ''}`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.data || []);
        setHistoryTotal(data.total ?? 0);
      }
    } catch (e) {
      toast.error('Failed to load payroll history');
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedBranchId, historyPage, searchHistory]);

  const fetchPayItems = useCallback(async () => {
    if (selectedBranchId == null) return;
    setPayItemsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/user-salaries?page=${payItemsPage}&limit=${payItemsLimit}&search=${searchPayItems || ''}`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const data = await res.json();
      if (data.success) {
        setPayItems(data.data || []);
        setPayItemsTotal(data.total ?? 0);
      }
    } catch (e) {
      toast.error('Failed to load pay items');
    } finally {
      setPayItemsLoading(false);
    }
  }, [selectedBranchId, payItemsPage, searchPayItems]);

  const fetchAttendance = useCallback(async () => {
    if (selectedBranchId == null) return;
    setAttendanceLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/attendances?from=${attendanceDate}&to=${attendanceDate}&page=${attendancePage}&limit=${attendanceLimit}`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const data = await res.json();
      if (data.success) {
        setAttendanceList(data.data || []);
        setAttendanceTotal(data.total ?? 0);
      }
    } catch (e) {
      toast.error('Failed to load attendance');
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedBranchId, attendanceDate, attendancePage]);

  const fetchStaff = useCallback(async () => {
    if (selectedBranchId == null) return;
    try {
      const res = await fetch(
        `${API_BASE}/staff?branchId=${selectedBranchId}&limit=500&activeOnly=true`,
        { headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStaffList(data.data);
      }
    } catch {
      setStaffList([]);
    }
  }, [selectedBranchId]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { fetchPayItems(); }, [fetchPayItems]);
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => {
    if (selectedBranchId != null) {
      fetchStaff();
    }
  }, [selectedBranchId, fetchStaff]);
  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  // When Generate Payroll dialog is open (individual), fetch all pay items to know each staff's earliest salary start date (for 1‑month rule).
  useEffect(() => {
    if (!generatePayrollDialogOpen || generateFor !== 'individual' || selectedBranchId == null) {
      setStaffEarliestEffectiveFrom({});
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/user-salaries?page=1&limit=1000`, { headers: getAuthHeadersWithBranch(selectedBranchId) })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.data)) return;
        const list = data.data as UserSalaryRecord[];
        const byStaff: Record<number, string> = {};
        list.forEach((row) => {
          const d = row.effectiveFrom?.slice(0, 10);
          if (!d) return;
          if (!byStaff[row.staffId] || d < byStaff[row.staffId]) byStaff[row.staffId] = d;
        });
        setStaffEarliestEffectiveFrom(byStaff);
      })
      .catch(() => setStaffEarliestEffectiveFrom({}));
    return () => { cancelled = true; };
  }, [generatePayrollDialogOpen, generateFor, selectedBranchId]);

  /** First day of selected payroll month (YYYY-MM-01). Staff must have started on or before this to be eligible. */
  const payrollMonthStartStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

  const staffEligibleForPayroll = staffList.filter((s) => {
    const effectiveFrom = staffEarliestEffectiveFrom[s.id];
    if (!effectiveFrom) return false;

    // Check if already in current payroll list
    const alreadyHasPayroll = payrollList.some(p => p.staffId === s.id);
    if (alreadyHasPayroll) return false;
    return effectiveFrom <= payrollMonthStartStr;
  });

  const handleGenerate = async () => {
    if (!canEdit) return;
    const body: any = {
      month: currentMonth,
      year: currentYear,
    };

    if (generateFor === 'individual') {
      if (generationStep === 1) {
        if (selectedStaffIds.length === 0) {
          toast.error('Select at least one staff to generate payroll for.');
          return;
        }
        setGenerationStep(2);
        return;
      }

      // Step 2: Collect detailed data
      body.staffEntries = selectedStaffIds.map(id => ({
        staffId: id,
        baseSalary: parseFloat(detailedPayrollData[id]?.basicSalary) || (payItems.find(p => p.staffId === id)?.amount || 0),
        status: (detailedPayrollData[id]?.status || 'Paid') === 'Paid' ? 'paid' : 'unpaid',
        // In a real scenario, we'd map all fields (HRA, PF, etc.) to the backend request
        details: detailedPayrollData[id] || {}
      }));
    } else {
      if (selectedBranchIds.length === 0) {
        toast.error('Select at least one location to generate payroll for.');
        return;
      }
      body.branchIds = selectedBranchIds;
    }

    setGenerateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payrolls/generate`, {
        method: 'POST',
        headers: getAuthHeadersWithBranch(selectedBranchId),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Generated payroll for ${data.generatedCount} records.`);
        setGeneratePayrollDialogOpen(false);
        setGenerationStep(1);
        fetchPayroll();
        fetchHistory();
      } else {
        toast.error(data.message || 'Failed to generate payroll');
      }
    } catch (e) {
      toast.error('Error generating payroll');
    } finally {
      setGenerateLoading(false);
    }
  };

  const toggleStaffSelection = (id: number) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleBranchSelection = (id: number) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMarkPaid = async (id: number) => {
    setMarkPaidLoading(id);
    try {
      const res = await fetch(`${API_BASE}/payrolls/${id}/paid`, {
        method: 'PATCH',
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Marked as paid');
        fetchPayroll();
        fetchHistory();
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (e) {
      toast.error('Failed to mark as paid');
    } finally {
      setMarkPaidLoading(null);
    }
  };

  const handleDeletePayroll = async () => {
    if (deletePayrollTarget == null) return;
    setDeletePayrollLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payrolls/${deletePayrollTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payroll deleted');
        setDeletePayrollTarget(null);
        fetchPayroll();
        fetchHistory();
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setDeletePayrollLoading(false);
    }
  };

  const handleDownloadSlip = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/payrolls/${id}/slip`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data as PayrollSlipData;
        const monthName = MONTHS[d.month] || '';
        const blob = await pdf(
          <SalarySlipPdf data={d} monthName={monthName} symbol={symbol} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salary-slip-${d.staffId}-${d.year}-${d.month}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Slip downloaded');
      } else {
        toast.error(data.message || 'Failed to load slip data');
      }
    } catch (e) {
      toast.error('Failed to download slip');
    }
  };

  const fetchBonusDeductionLines = useCallback(
    async (payrollId: number) => {
      setBonusDeductionLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/payrolls/${payrollId}/bonus-deductions`,
          { headers: getAuthHeadersWithBranch(selectedBranchId) }
        );
        const data = await res.json();
        if (data.success) setBonusDeductionLines(data.data || []);
        else setBonusDeductionLines([]);
      } catch {
        setBonusDeductionLines([]);
      } finally {
        setBonusDeductionLoading(false);
      }
    },
    [selectedBranchId]
  );

  const openEditPayroll = (row: PayrollRecord) => {
    setEditingPayroll(row);
    setBonusDeductionLines([]);
    setNewLineAmount('');
    setNewLineReason('');
    setPayrollDialogOpen(true);
    fetchBonusDeductionLines(row.id);
  };

  const addBonusDeductionLine = async () => {
    if (editingPayroll == null) return;
    const amount = parseFloat(newLineAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setAddLineSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/payrolls/${editingPayroll.id}/bonus-deductions`,
        {
          method: 'POST',
          headers: getAuthHeadersWithBranch(selectedBranchId),
          body: JSON.stringify({
            type: newLineType,
            amount,
            reason: newLineReason.trim() || null,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success('Added');
        setNewLineAmount('');
        setNewLineReason('');
        fetchBonusDeductionLines(editingPayroll.id);
        fetchPayroll();
        fetchHistory();
        const byId = await fetch(
          `${API_BASE}/payrolls/${editingPayroll.id}`,
          { headers: getAuthHeadersWithBranch(selectedBranchId) }
        );
        const byIdData = await byId.json();
        if (byIdData.success && byIdData.data) setEditingPayroll(byIdData.data);
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (e) {
      toast.error('Failed to add');
    } finally {
      setAddLineSaving(false);
    }
  };

  const deleteBonusDeductionLine = async (lineId: number) => {
    if (editingPayroll == null) return;
    setDeletingLineId(lineId);
    try {
      const res = await fetch(
        `${API_BASE}/payrolls/bonus-deductions/${lineId}`,
        { method: 'DELETE', headers: getAuthHeadersWithBranch(selectedBranchId) }
      );
      const data = await res.json();
      if (data.success) {
        toast.success('Removed');
        fetchBonusDeductionLines(editingPayroll.id);
        fetchPayroll();
        fetchHistory();
        const byId = await fetch(
          `${API_BASE}/payrolls/${editingPayroll.id}`,
          { headers: getAuthHeadersWithBranch(selectedBranchId) }
        );
        const byIdData = await byId.json();
        if (byIdData.success && byIdData.data) setEditingPayroll(byIdData.data);
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (e) {
      toast.error('Failed to remove');
    } finally {
      setDeletingLineId(null);
    }
  };

  const openAddPayItem = () => {
    setEditingPayItem(null);
    setViewOnlyPayItem(false);
    payItemForm.reset({ staffId: undefined, salaryType: 'monthly', amount: undefined, effectiveFrom: new Date().toISOString().slice(0, 10) });
    setPayItemDialogOpen(true);
  };

  const openViewPayItem = (row: UserSalaryRecord) => {
    setEditingPayItem(row);
    setViewOnlyPayItem(true);
    setPayItemDialogOpen(true);
  };

  const openEditPayItem = (row: UserSalaryRecord) => {
    setEditingPayItem(row);
    setViewOnlyPayItem(false);
    payItemForm.reset({ staffId: row.staffId, salaryType: row.salaryType as 'daily' | 'weekly' | 'monthly', amount: row.amount, effectiveFrom: row.effectiveFrom });
    setPayItemDialogOpen(true);
  };

  const savePayItem = payItemForm.handleSubmit(async (data) => {
    const staffId = data.staffId;
    setPayItemSaving(true);
    try {
      const url = editingPayItem
        ? `${API_BASE}/user-salaries/${editingPayItem.id}`
        : `${API_BASE}/user-salaries`;
      const method = editingPayItem ? 'PUT' : 'POST';
      const body = editingPayItem
        ? { salaryType: data.salaryType, amount: data.amount, effectiveFrom: data.effectiveFrom }
        : { staffId, salaryType: data.salaryType, amount: data.amount, effectiveFrom: data.effectiveFrom };
      const res = await fetch(url, {
        method,
        headers: getAuthHeadersWithBranch(selectedBranchId),
        body: JSON.stringify(body),
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        toast.success(editingPayItem ? 'Pay item updated' : 'Pay item added');
        setPayItemDialogOpen(false);
        setEditingPayItem(null);
        fetchPayItems();
      } else {
        toast.error(dataRes.message || 'Failed');
      }
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setPayItemSaving(false);
    }
  });

  const confirmDeletePayItem = async () => {
    if (deletePayItemTarget == null) return;
    setPayItemDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/user-salaries/${deletePayItemTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeadersWithBranch(selectedBranchId),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pay item deleted');
        setDeletePayItemTarget(null);
        fetchPayItems();
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setPayItemDeleting(false);
    }
  };

  const openBulkAttendance = async () => {
    if (selectedBranchId == null) return;
    setBulkDate(attendanceDate);
    setBulkEntries([]);
    setBulkAttendanceOpen(true);
    setBulkLoading(true);
    try {
      const [staffRes, attRes] = await Promise.all([
        fetch(`${API_BASE}/staff?branchId=${selectedBranchId}&limit=500&activeOnly=true`, {
          headers: getAuthHeadersWithBranch(selectedBranchId),
        }),
        fetch(
          `${API_BASE}/attendances?from=${attendanceDate}&to=${attendanceDate}&limit=500`,
          { headers: getAuthHeadersWithBranch(selectedBranchId) }
        ),
      ]);
      const staffData = await staffRes.json();
      const attData = await attRes.json();
      const staff = staffData.success && Array.isArray(staffData.data) ? staffData.data : [];
      const attendanceList = attData.success && Array.isArray(attData.data) ? attData.data : [];
      const statusByStaffId: Record<number, string> = {};
      attendanceList.forEach((a: AttendanceRecord) => {
        statusByStaffId[a.staffId] = a.status;
      });
      setBulkEntries(
        staff.map((s: StaffOption) => ({
          staffId: s.id,
          staffName: staffDisplayName(s),
          status: statusByStaffId[s.id] ?? 'present',
        }))
      );
    } catch (e) {
      toast.error('Failed to load staff');
      setBulkEntries([]);
    } finally {
      setBulkLoading(false);
    }
  };

  const setBulkEntryStatus = (staffId: number, status: string) => {
    setBulkEntries((prev) =>
      prev.map((e) => (e.staffId === staffId ? { ...e, status } : e))
    );
  };

  const saveBulkAttendance = async () => {
    if (selectedBranchId == null) return;
    setBulkSaving(true);
    try {
      const res = await fetch(`${API_BASE}/attendances`, {
        method: 'POST',
        headers: getAuthHeadersWithBranch(selectedBranchId),
        body: JSON.stringify({
          date: bulkDate,
          branchId: selectedBranchId,
          entries: bulkEntries.map((e) => ({ staffId: e.staffId, status: e.status })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Attendance saved');
        setBulkAttendanceOpen(false);
        fetchAttendance();
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (e) {
      toast.error('Failed to save attendance');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="p-3 space-y-3  w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll Management</h1>
          <p className="text-gray-500 text-sm">Manage staff salaries, history, and daily attendance.</p>
        </div>
      </div>

      {selectedBranchId == null && (
        <p className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 p-3 rounded-md">
          Select a branch from the header to view and manage payroll.
        </p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-white border p-1 h-12">
            <TabsTrigger value="employees" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Users className="w-4 h-4 mr-2" /> Employees List
            </TabsTrigger>
            <TabsTrigger value="history" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <History className="w-4 h-4 mr-2" /> Payroll History
            </TabsTrigger>
            <TabsTrigger value="attendance" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <UserCheck className="w-4 h-4 mr-2" /> Attendance
            </TabsTrigger>

            <TabsTrigger value="attendanceHistory" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <History className="w-4 h-4 mr-2" /> Attendance History
            </TabsTrigger>
          </TabsList>

          {activeTab === 'employees' && (
            <Button
              onClick={() => setGeneratePayrollDialogOpen(true)}
              disabled={generateLoading}
              className="bg-primary hover:bg-primary/90 h-10"
            >
              {generateLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Generate Payroll
            </Button>
          )}
        </div>

        {/* Employees List Tab */}
        <TabsContent value="employees" className="mt-3 focus-visible:outline-none space-y-3">


          <DataTable
            title="Active Staff Salaries"
            icon={DollarSign}
            columns={payItemColumns}
            data={payItems}
            loading={payItemsLoading}
            exportable
            exportFileName="active-salaries"
            pagination={{
              total: payItemsTotal,
              page: payItemsPage,
              limit: payItemsLimit,
              onPageChange: setPayItemsPage,
              onLimitChange: setPayItemsLimit,
              itemLabel: "records"
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search staff..."
                    value={searchPayItems}
                    onChange={(e) => { setSearchPayItems(e.target.value); setPayItemsPage(1); }}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                  />
                </div>
                <Select value={String(payItemsLimit)} onValueChange={(v) => { setPayItemsLimit(Number(v)); setPayItemsPage(1); }}>
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
              </div>
            }
          />
        </TabsContent>

        {/* Payroll History Tab */}
        <TabsContent value="history" className="mt-3 focus-visible:outline-none space-y-3">
          <DataTable
            title="Full History"
            icon={History}
            columns={historyColumns}
            data={historyList}
            loading={historyLoading}
            exportable
            exportFileName="payroll-history"
            pagination={{
              total: historyTotal,
              page: historyPage,
              limit: historyLimit,
              onPageChange: setHistoryPage,
              onLimitChange: setHistoryLimit,
              itemLabel: "records"
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search staff..."
                    value={searchHistory}
                    onChange={(e) => { setSearchHistory(e.target.value); setHistoryPage(1); }}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                  />
                </div>
                <Select value={String(historyLimit)} onValueChange={(v) => { setHistoryLimit(Number(v)); setHistoryPage(1); }}>
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
              </div>
            }
          />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-3 focus-visible:outline-none space-y-3">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Daily Attendance</CardTitle>
                    <p className="text-xs text-gray-500">{formatDisplayDate(attendanceDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Popover open={attendanceDatePickerOpen} onOpenChange={setAttendanceDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <CalendarIcon className="w-4 h-4 mr-2" /> Change Date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={new Date(attendanceDate + 'T12:00:00')}
                        onSelect={(d) => {
                          if (d) setAttendanceDate(d.toISOString().slice(0, 10));
                          setAttendanceDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button variant="secondary" size="sm" onClick={handleMarkAllPresent} className="h-9">
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark All Present
                  </Button>

                  <Button onClick={saveAttendance} disabled={bulkSaving} className="h-9 bg-primary">
                    {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Save Attendance
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Staff Name</TableHead>
                    <TableHead className="w-48 text-center">Status</TableHead>
                    <TableHead className="w-32">Designation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                        {attendanceLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "No staff members found for this branch."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffList.map((s, idx) => (
                      <TableRow key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="text-center text-gray-400 text-xs font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{staffDisplayName(s)}</span>
                            <span className="text-xs text-gray-500">{s.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={attendanceEntries[s.id] || 'absent'}
                            onValueChange={(v) => handleAttendanceChange(s.id, v)}
                          >
                            <SelectTrigger className={`h-9 font-medium ${(attendanceEntries[s.id] || 'absent') === 'present' ? 'text-green-600 bg-green-50 border-green-200' :
                              (attendanceEntries[s.id] || 'absent') === 'absent' ? 'text-red-600 bg-red-50 border-red-200' :
                                'text-amber-600 bg-amber-50 border-amber-200'
                              }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="leave">Leave</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal capitalize bg-white">
                            {(s as any).role || 'Staff'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Attendance History Tab */}
        {/* Attendance History Tab */}
        <TabsContent value="attendanceHistory" className="mt-0 focus-visible:outline-none space-y-3">
          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-white border-b py-3 px-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Attendance History</CardTitle>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Month Filter */}
                  <div className="min-w-[160px]">
                    {/* <Label className="text-xs text-gray-600 mb-1 block">Month</Label> */}
                    <Select
                      value={String(attendanceHistoryMonth)}
                      onValueChange={(v) => {
                        setAttendanceHistoryMonth(parseInt(v, 10));
                        setAttendanceHistoryPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.slice(1).map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year Filter */}
                  <div className="min-w-[140px]">
                    {/* <Label className="text-xs text-gray-600 mb-1 block">Year</Label> */}
                    <Select
                      value={String(attendanceHistoryYear)}
                      onValueChange={(v) => {
                        setAttendanceHistoryYear(parseInt(v, 10));
                        setAttendanceHistoryPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[attendanceHistoryYear, attendanceHistoryYear - 1, attendanceHistoryYear - 2].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employee Filter */}
                  <div className="min-w-[200px]">
                    {/* <Label className="text-xs text-gray-600 mb-1 block">Employee</Label> */}
                    <Select
                      value={attendanceHistoryStaffId || "all"}
                      onValueChange={(v) => {
                        setAttendanceHistoryStaffId(v === "all" ? "" : v);
                        setAttendanceHistoryPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg">
                        <SelectValue placeholder="All employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All employees</SelectItem>
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {staffDisplayName(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <DataTable
            title="Attendance Records"
            icon={UserCheck}
            columns={attendanceHistoryColumns}
            data={attendanceHistoryList}
            loading={attendanceHistoryLoading}
            exportable
            exportFileName="attendance-records"
            pagination={{
              total: attendanceHistoryTotal,
              page: attendanceHistoryPage,
              limit: attendanceHistoryLimit,
              onPageChange: setAttendanceHistoryPage,
              onLimitChange: setAttendanceHistoryLimit,
              itemLabel: "records"
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search staff..."
                    value={searchAttendanceHistory}
                    onChange={(e) => { setSearchAttendanceHistory(e.target.value); setAttendanceHistoryPage(1); }}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                  />
                </div>
                <Select value={String(attendanceHistoryLimit)} onValueChange={(v) => { setAttendanceHistoryLimit(Number(v)); setAttendanceHistoryPage(1); }}>
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
              </div>
            }
          />
        </TabsContent>

      </Tabs>

      {/* Generate Payroll dialog */}
      <Sheet open={generatePayrollDialogOpen} onOpenChange={(o) => { setGeneratePayrollDialogOpen(o); if (!o) setGenerationStep(1); }}>
        <SheetContent side="right" className={`${generationStep === 2 ? 'sm:max-w-2xl' : 'sm:max-w-md'} flex flex-col h-full p-0 gap-0 overflow-hidden`}>
          <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{generationStep === 1 ? 'Generate Payroll' : 'Salary Information'}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {generationStep === 1
                ? 'Choose month, year, and who to generate payroll for.'
                : 'Enter allowances and deductions for selected staff.'}
            </p>
          </SheetHeader>

          {generationStep === 1 ? (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Select Month</Label>
                  <Select value={String(currentMonth)} onValueChange={(v) => setCurrentMonth(parseInt(v, 10))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.slice(1).map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Select Year</Label>
                  <Select value={String(currentYear)} onValueChange={(v) => setCurrentYear(parseInt(v, 10))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Generate For</Label>
                <Select value={generateFor} onValueChange={(v) => { setGenerateFor(v as GenerateForType); setSelectedStaffIds([]); setSelectedBranchIds([]); }}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual"><span className="flex items-center gap-2"><Users className="w-4 h-4" /> Individual</span></SelectItem>
                    <SelectItem value="location"><span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {generateFor === 'individual' && (
                <div className="space-y-2">
                  <Label className="block font-medium">Select staff</Label>
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border p-2 space-y-1">
                    {staffEligibleForPayroll.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md px-3 py-2 transition-colors">
                        <Checkbox checked={selectedStaffIds.includes(s.id)} onCheckedChange={() => toggleStaffSelection(s.id)} />
                        <span className="text-sm font-medium">{staffDisplayName(s)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-gray-50/20">
              {staffList.filter(s => selectedStaffIds.includes(s.id)).map(staff => (
                <div key={staff.id} className="space-y-5 border rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-lg text-gray-900">{staffDisplayName(staff)}</h3>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Basic: {formatCurrency(payItems.find(p => p.staffId === staff.id)?.amount || 0)}</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-gray-600">Basic Salary</Label>
                      <Input
                        type="number"
                        defaultValue={payItems.find(p => p.staffId === staff.id)?.amount || 0}
                        className="h-10 focus:ring-primary"
                        onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), basicSalary: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-600">Status</Label>
                      <RadioGroup
                        defaultValue="Paid"
                        onValueChange={(v) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), status: v } }))}
                        className="flex gap-6 items-center h-10"
                      >
                        <div className="flex items-center gap-2 cursor-pointer text-sm">
                          <RadioGroupItem value="Paid" id={`status-paid-${staff.id}`} />
                          <Label htmlFor={`status-paid-${staff.id}`} className="cursor-pointer">Paid</Label>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer text-sm">
                          <RadioGroupItem value="Unpaid" id={`status-unpaid-${staff.id}`} />
                          <Label htmlFor={`status-unpaid-${staff.id}`} className="cursor-pointer">Unpaid</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-green-500 rounded-full" />
                      <h4 className="font-semibold text-sm text-gray-700">Allowances</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">HRA Allowance</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), hra: e.target.value } }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Conveyance</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), conveyance: e.target.value } }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Medical Allowance</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), medical: e.target.value } }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Bonus</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), bonus: e.target.value } }))} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-red-500 rounded-full" />
                      <h4 className="font-semibold text-sm text-gray-700">Deductions</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">PF</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), pf: e.target.value } }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Professional Tax</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), profTax: e.target.value } }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">TDS</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), tds: e.target.value } }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Loans & Others</Label>
                        <Input type="number" placeholder="0" className="h-9" onChange={(e) => setDetailedPayrollData(prev => ({ ...prev, [staff.id]: { ...(prev[staff.id] || {}), loans: e.target.value } }))} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="shrink-0 border-t px-6 py-4 flex gap-3 justify-end bg-white">
            {generationStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setGeneratePayrollDialogOpen(false)} className="h-10">Cancel</Button>
                <Button onClick={handleGenerate} disabled={generateLoading} className="h-10 min-w-[140px]">
                  {generateLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Proceed to Details
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setGenerationStep(1)} className="h-10">Back</Button>
                <Button onClick={handleGenerate} disabled={generateLoading} className="bg-primary hover:bg-primary/90 h-10 min-w-[140px]">
                  {generateLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm & Generate
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bonus & Deduction — Sheet from right with Delete and Edit line */}
      <Sheet open={payrollDialogOpen} onOpenChange={(open) => { setPayrollDialogOpen(open); if (!open) setEditingPayroll(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4 space-y-1">
            <SheetTitle>Bonus & deduction</SheetTitle>
            {editingPayroll && (
              <div className="space-y-0.5 text-sm">
                <p className="font-medium text-foreground">
                  Staff: {editingPayroll.staffName ?? '—'}
                </p>
                <p className="text-muted-foreground">
                  Period: {MONTHS[editingPayroll.month]} {editingPayroll.year}
                </p>
                <p className="text-muted-foreground pt-1">
                  Add lines with reason; totals update automatically.
                </p>
              </div>
            )}
          </SheetHeader>
          {editingPayroll && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="rounded-md border p-3 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Base salary</span>
                  <span className="font-medium">{formatCurrency(editingPayroll.baseSalary)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total bonus</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(editingPayroll.bonus)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total deduction</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(editingPayroll.deduction)}</span>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t font-medium">
                  <span>Net salary</span>
                  <span>{formatCurrency(editingPayroll.netSalary)}</span>
                </div>
              </div>

              {bonusDeductionLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading lines…
                </p>
              ) : (
                <>
                  {bonusDeductionLines.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto rounded border p-2">
                      {bonusDeductionLines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-center justify-between gap-2 py-2 px-2 rounded bg-muted/50 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <span className={line.type === 'bonus' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {line.type === 'bonus' ? 'Bonus' : 'Deduction'}
                            </span>
                            <span className="font-medium ml-2">{formatCurrency(line.amount)}</span>
                            {line.reason && (
                              <p className="text-muted-foreground truncate mt-0.5">— {line.reason}</p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => { setEditingLine(line); setEditLineType(line.type as 'bonus' | 'deduction'); setEditLineAmount(String(line.amount)); setEditLineReason(line.reason ?? ''); }}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteBonusDeductionLine(line.id)}
                                disabled={deletingLineId === line.id}
                                title="Delete"
                              >
                                {deletingLineId === line.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canEdit && (
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="flex flex-wrap gap-2 items-end">
                        <Select value={newLineType} onValueChange={(v) => setNewLineType(v as 'bonus' | 'deduction')}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bonus">Bonus</SelectItem>
                            <SelectItem value="deduction">Deduction</SelectItem>
                          </SelectContent>
                        </Select>
                        <div>
                          <Label className="sr-only">Amount</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="Amount"
                            className="w-[100px]"
                            value={newLineAmount}
                            onChange={(e) => setNewLineAmount(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <Label className="sr-only">Reason</Label>
                          <Input
                            placeholder="Reason (optional)"
                            value={newLineReason}
                            onChange={(e) => setNewLineReason(e.target.value)}
                          />
                        </div>
                        <Button onClick={addBonusDeductionLine} disabled={addLineSaving}>
                          {addLineSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setPayrollDialogOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit bonus/deduction line — Sheet from right */}
      <Sheet open={editingLine != null} onOpenChange={(open) => { if (!open) setEditingLine(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden">
          <SheetHeader className="shrink-0 border-b pb-4">
            <SheetTitle>Edit bonus / deduction</SheetTitle>
          </SheetHeader>
          {editingLine && (
            <div className="flex-1 overflow-y-auto pt-4 space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={editLineType} onValueChange={(v) => setEditLineType(v as 'bonus' | 'deduction')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editLineAmount}
                  onChange={(e) => setEditLineAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Input
                  placeholder="Reason"
                  value={editLineReason}
                  onChange={(e) => setEditLineReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="shrink-0 border-t pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingLine(null)}>Cancel</Button>
            <Button
              disabled={editLineSaving || !editingLine}
              onClick={async () => {
                if (!editingLine || !editingPayroll) return;
                const amount = parseFloat(editLineAmount);
                if (Number.isNaN(amount) || amount < 0) {
                  toast.error('Enter a valid amount');
                  return;
                }
                setEditLineSaving(true);
                try {
                  const del = await fetch(
                    `${API_BASE}/payrolls/bonus-deductions/${editingLine.id}`,
                    { method: 'DELETE', headers: getAuthHeadersWithBranch(selectedBranchId) }
                  );
                  const delData = await del.json();
                  if (!delData.success) {
                    toast.error(delData.message || 'Failed to remove');
                    return;
                  }
                  const res = await fetch(
                    `${API_BASE}/payrolls/${editingPayroll.id}/bonus-deductions`,
                    {
                      method: 'POST',
                      headers: getAuthHeadersWithBranch(selectedBranchId),
                      body: JSON.stringify({
                        type: editLineType,
                        amount,
                        reason: editLineReason.trim() || null,
                      }),
                    }
                  );
                  const data = await res.json();
                  if (data.success) {
                    toast.success('Updated');
                    setEditingLine(null);
                    fetchBonusDeductionLines(editingPayroll.id);
                    fetchPayroll();
                    fetchHistory();
                    const byId = await fetch(
                      `${API_BASE}/payrolls/${editingPayroll.id}`,
                      { headers: getAuthHeadersWithBranch(selectedBranchId) }
                    );
                    const byIdData = await byId.json();
                    if (byIdData.success && byIdData.data) setEditingPayroll(byIdData.data);
                  } else {
                    toast.error(data.message || 'Failed');
                  }
                } catch (e) {
                  toast.error('Failed to update');
                } finally {
                  setEditLineSaving(false);
                }
              }}
            >
              {editLineSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay Item — Sheet from right (Add / Edit / View) */}
      <Sheet open={payItemDialogOpen} onOpenChange={setPayItemDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden p-0 gap-0">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle>
              {editingPayItem ? (viewOnlyPayItem ? 'Pay item' : 'Edit pay item') : 'Add pay item'}
            </SheetTitle>
          </SheetHeader>
          <Form {...payItemForm}>
            <form onSubmit={savePayItem} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={payItemForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff</FormLabel>
                    <Select
                      value={field.value !== undefined ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                      disabled={viewOnlyPayItem || !!editingPayItem}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{staffDisplayName(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={payItemForm.control}
                name="salaryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={viewOnlyPayItem}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={payItemForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        disabled={viewOnlyPayItem}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={payItemForm.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hiring from</FormLabel>
                    <Popover open={payItemEffectiveFromPickerOpen} onOpenChange={setPayItemEffectiveFromPickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={viewOnlyPayItem}
                            className="w-full justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                          >
                            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            {field.value ? formatDisplayDate(field.value) : 'Select date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              field.onChange(`${y}-${m}-${d}`);
                              setPayItemEffectiveFromPickerOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setPayItemDialogOpen(false)}>
                  {viewOnlyPayItem ? 'Close' : 'Cancel'}
                </Button>
                {!viewOnlyPayItem && (
                  <Button type="submit" disabled={payItemSaving}>
                    {payItemSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingPayItem ? 'Update' : 'Add'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete Pay Item confirm */}
      <AlertDialog open={!!deletePayItemTarget} onOpenChange={(open) => !open && setDeletePayItemTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pay item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete? Data of {deletePayItemTarget?.staffName ?? 'this staff'} will also be deleted from staff modules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePayItem} disabled={payItemDeleting} className="bg-destructive text-destructive-foreground">
              {payItemDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePayrollTarget} onOpenChange={(open) => !open && setDeletePayrollTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payroll record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payroll entry for {deletePayrollTarget?.staffName ?? 'this staff'} ({deletePayrollTarget ? MONTHS[deletePayrollTarget.month] : ''} {deletePayrollTarget?.year}). Bonus and deduction lines will also be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayroll} disabled={deletePayrollLoading} className="bg-destructive text-destructive-foreground">
              {deletePayrollLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk attendance dialog */}
      <Dialog open={bulkAttendanceOpen} onOpenChange={setBulkAttendanceOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark attendance</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Set status for each staff for the selected date. Saving will create or update attendance records.
            </p>
          </DialogHeader>
          <div className="space-y-2 flex-shrink-0">
            <Label>Date</Label>
            <Popover open={bulkDatePickerOpen} onOpenChange={setBulkDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                >
                  <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  {bulkDate ? formatDisplayDate(bulkDate) : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={bulkDate ? new Date(bulkDate + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setBulkDate(`${y}-${m}-${d}`);
                      setBulkDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="overflow-y-auto min-h-0 flex-1 border rounded-md p-3 space-y-2">
            {bulkLoading ? (
              <p className="text-sm text-muted-foreground py-6 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading staff…
              </p>
            ) : bulkEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No staff in this branch. Add staff first to mark attendance.
              </p>
            ) : (
              bulkEntries.map((e) => (
                <div
                  key={e.staffId}
                  className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                >
                  <span className="text-sm font-medium truncate min-w-0">{e.staffName}</span>
                  <Select value={e.status} onValueChange={(v) => setBulkEntryStatus(e.staffId, v)}>
                    <SelectTrigger className="w-[130px] flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="half-day">Half day</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setBulkAttendanceOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveBulkAttendance}
              disabled={bulkSaving || bulkLoading || bulkEntries.length === 0}
            >
              {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payroll Detail Sheet */}
      <Sheet open={!!viewingPayroll} onOpenChange={(open) => !open && setViewingPayroll(null)}>
        <SheetContent side="right" className="sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Payroll Details</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
            {/* Staff Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-gray-900 font-urbanist">Staff Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <DetailField label="Staff Name" value={viewingPayroll?.staffName} />
                <DetailField label="Role" value={viewingPayroll?.staffRole} />
              </div>
            </div>

            {/* Salary Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-bold text-gray-900 font-urbanist">Salary Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <DetailField label="Period" value={viewingPayroll ? `${MONTHS[viewingPayroll.month]} ${viewingPayroll.year}` : ''} />
                <DetailField label="Base Salary" value={formatCurrency(viewingPayroll?.baseSalary || 0)} />
                <DetailField label="Bonus" value={formatCurrency(viewingPayroll?.bonus || 0)} />
                <DetailField label="Deduction" value={formatCurrency(viewingPayroll?.deduction || 0)} />
                <div className="col-span-2 border-t pt-3 mt-1">
                  <DetailField label="Net Salary" value={formatCurrency(viewingPayroll?.netSalary || 0)} />
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-bold text-gray-900 font-urbanist">Status Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <DetailField
                  label="Status"
                  value={<Badge variant={viewingPayroll?.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{viewingPayroll?.status}</Badge>}
                />
                <DetailField label="Paid On" value={formatDate(viewingPayroll?.paidAt || null)} />
                <DetailField label="Generated By" value={viewingPayroll?.generatedBy || 'System'} fullWidth />
              </div>
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button variant="outline" onClick={() => setViewingPayroll(null)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}