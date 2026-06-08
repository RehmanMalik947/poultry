import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { COLORS } from '../../constants/colors';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '../../components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  UserCheck,
  CircleCheck,
  Ban,
  Scissors,
  AlertCircle,
  MoreHorizontal,
  ChevronDown,
  Timer,
  Pencil,
  Eye,
  Hourglass,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranch } from '../../contexts/BranchContext';
import { TablePagination } from '../../components/shared/TablePagination';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ApiService } from '../../../api/ApiService';
import React from 'react';
import { useNavigate } from 'react-router';
import { useCurrency } from '../../contexts/CurrencyContext';
import { format } from 'date-fns';
import { DollarSign, ShoppingBag } from 'lucide-react';

/** Salon day: 12:00 AM (midnight) through 11:00 PM, current to onward when picking time for today. */
const timeSlots = [
  '12:00 AM',
  '01:00 AM',
  '02:00 AM',
  '03:00 AM',
  '04:00 AM',
  '05:00 AM',
  '06:00 AM',
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
  '10:00 PM',
  '11:00 PM',
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', icon: Hourglass },
  booked: { label: 'Booked', color: 'bg-blue-100 text-blue-700', icon: Clock },
  arrived: {
    label: 'Arrived',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-700',
    icon: CheckCircle,
  },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-500', icon: Clock },
};

const getStatus = (status: string) => statusConfig[status] ?? statusConfig['unknown'];

type CustomerOption = { id: number; name: string; mobile: string | null; email?: string | null };
type ServiceOption = { id: number; serviceName: string; price: number | null; duration?: number | null };
type StaffOption = {
  id: number; firstName: string; lastName: string | null; email: string; name?: string; role?: string;
  Services?: Array<{ id: number; serviceName: string; StaffService?: { commissionType: string | null; commissionValue: number | null } }>;
};

type AppointmentRecord = {
  id: number;
  date: string;
  timeSlot: string;
  status: 'pending' | 'booked' | 'arrived' | 'completed' | 'cancelled';
  customerId: number;
  serviceId: number | null;
  packageId: number | null; 
  staffId: number | null;
  bookingTime?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  serviceDuration?: number | null;
  notes?: string | null;
  customer: { id: number; name: string; mobile: string | null } | null;
  service: { id: number; serviceName: string; price: number | null } | null;
  package: { id: number; packageName: string; price: number | null } | null; 
  staff: { id: number; firstName: string; lastName: string | null; email: string; name?: string } | null;
};

function formatDisplayDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Format API datetime string for check-in/check-out display. */
function formatCheckInOutTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { timeStyle: 'short', dateStyle: 'short' });
  } catch {
    return '—';
  }
}

/** Elapsed seconds from start to end (or to now if end not given). */
function getElapsedSeconds(fromIso: string | null | undefined, toIso?: string | null): number {
  if (!fromIso) return 0;
  try {
    const from = new Date(fromIso).getTime();
    const to = toIso ? new Date(toIso).getTime() : Date.now();
    if (isNaN(from) || isNaN(to)) return 0;
    return Math.max(0, Math.floor((to - from) / 1000));
  } catch {
    return 0;
  }
}

/** Format seconds as M:SS or H:MM:SS for live elapsed counter. */
function formatElapsed(seconds: number): string {
  if (seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format seconds as total duration: "14 sec", "2 min 30 sec", "1 hr 5 min". */
function formatTotalDuration(seconds: number): string {
  if (seconds < 0) return '0 sec';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} hr`);
  if (m > 0) parts.push(`${m} min`);
  if (s > 0 || parts.length === 0) parts.push(`${s} sec`);
  return parts.join(' ');
}


function getStaffDisplayName(s: StaffOption | null): string {
  if (!s) return '—';
  if (s.name) return s.name;
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.email;
}

function getTrend(current: number, prev: number): { text: string; up: boolean } {
  if (prev === 0) {
    if (current > 0) return { text: '+100%', up: true };
    return { text: '—', up: false };
  }
  const pct = Math.round(((current - prev) / prev) * 1000) / 10;
  if (pct > 0) return { text: `+${pct}%`, up: true };
  if (pct < 0) return { text: `${pct}%`, up: false };
  return { text: '0%', up: false };
}

/** Parse "01:00 PM", "12:00 AM", or 24h "13:30" to minutes since midnight. Returns null if invalid. */
function parseTimeSlotToMinutes(slot: string): number | null {
  const trimmed = slot.trim();
  const amPm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPm) {
    let hours = parseInt(amPm[1], 10);
    const minutes = parseInt(amPm[2], 10);
    const ap = (amPm[3] || '').toUpperCase();
    if (ap === 'PM' && hours !== 12) hours += 12;
    if (ap === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const twenty4 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twenty4) {
    const hours = parseInt(twenty4[1], 10);
    const minutes = parseInt(twenty4[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  return null;
}

/** @deprecated Use parseTimeSlotToMinutes; returns 0 when unparseable (legacy callers). */
function timeSlotToMinutes(slot: string): number {
  return parseTimeSlotToMinutes(slot) ?? 0;
}

/** Show stored time in 12-hour form when parseable (e.g. 13:30 → 1:30 PM). */
function formatTimeSlotDisplay(slot: string): string {
  const min = parseTimeSlotToMinutes(slot);
  if (min == null) return slot;
  return minutesToTimeSlot(min);
}

/** Convert minutes since midnight to "11:30 AM" format. */
function minutesToTimeSlot(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 < 12 ? "AM" : "PM";
  return `${hours12}:${String(mins).padStart(2, "0")} ${ampm}`;
}

/** Valid time range: 12:00 AM (0) through 11:59 PM (1439). */
const TIME_RANGE_START_MIN = 0;
const TIME_RANGE_END_MIN = 23 * 60 + 59;

/** Check if a time slot string is valid and within range. */
function isValidTimeSlotInRange(slot: string): boolean {
  const min = timeSlotToMinutes(slot);
  return min >= TIME_RANGE_START_MIN && min <= TIME_RANGE_END_MIN;
}

/** Convert "11:30 AM" to 24h "11:30", "01:30 PM" to "13:30" for input type="time". */
function timeSlotToTimeInputValue(slot: string): string {
  const m = timeSlotToMinutes(slot);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Convert 24h "HH:MM" from input to "11:30 AM" format. */
function timeInputValueToTimeSlot(value: string): string {
  const [hStr, mStr] = value.split(':');
  const hours24 = parseInt(hStr ?? '0', 10);
  const minutes = parseInt(mStr ?? '0', 10);
  const total = hours24 * 60 + minutes;
  return minutesToTimeSlot(total);
}

function getCurrentMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Format a Date as local YYYY-MM-DD (never use toISOString for calendar dates). */
function formatLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Normalize API/DB date values to YYYY-MM-DD for grouping and lookup. */
function normalizeDateKey(date: string | Date | null | undefined): string {
  if (date == null) return '';
  if (date instanceof Date) return formatLocalDateStr(date);
  const s = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? s.slice(0, 10) : formatLocalDateStr(parsed);
}

/** Today in local date (YYYY-MM-DD) so "today" matches the user's calendar. */
function getTodayLocalStr(): string {
  return formatLocalDateStr(new Date());
}

function isDateToday(dateStr: string): boolean {
  return dateStr === getTodayLocalStr();
}

/** Time slots available for the given date: today = present time onward, other dates = all. */
function getAvailableTimeSlots(dateStr: string): string[] {
  if (!isDateToday(dateStr)) return timeSlots;
  const now = getCurrentMinutes();
  return timeSlots.filter((t) => timeSlotToMinutes(t) >= now);
}

/** Calendar view: full salon day timeline (12:00 AM through 11:00 PM). */
const CALENDAR_HOUR_LABELS = timeSlots;

/** Group appointments by hour (12 PM = 720 min, 1 PM = 780, ...) for calendar timeline. */
function groupAppointmentsByDayAndHour(appointments: AppointmentRecord[]): Map<string, Map<number, AppointmentRecord[]>> {
  const dayMap = new Map<string, Map<number, AppointmentRecord[]>>();
  for (const appt of appointments) {
    const day = normalizeDateKey(appt.date);
    if (!dayMap.has(day)) dayMap.set(day, new Map<number, AppointmentRecord[]>());
    const hourMap = dayMap.get(day)!;
    const min = parseTimeSlotToMinutes(appt.timeSlot);
    if (min == null) continue;
    const hourMin = Math.floor(min / 60) * 60;
    if (!hourMap.has(hourMin)) hourMap.set(hourMin, []);
    hourMap.get(hourMin)!.push(appt);
  }
  return dayMap;
}

function getWeekRange(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: formatLocalDateStr(monday),
    end: formatLocalDateStr(sunday),
  };
}

function getWeekDates(startDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    dates.push(formatLocalDateStr(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export function Appointments() {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apptPage, setApptPage] = useState(1);
  const [apptTotal, setApptTotal] = useState(0);
  const [apptLimit, setApptLimit] = useState(10);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalStr);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [calendarRange, setCalendarRange] = useState<'day' | 'week'>('day');

  const [issueAppointment, setIssueAppointment] = useState<AppointmentRecord | null>(null);
  const [issueNotes, setIssueNotes] = useState('');
  const [issueSaving, setIssueSaving] = useState(false);

  const [actionApptId, setActionApptId] = useState<number | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  /** Ticks every second when any appointment is 'arrived' so the elapsed counter updates. */
  const [elapsedTick, setElapsedTick] = useState(0);

  type Stats = { pending: number; booked: number; arrived: number; completed: number; cancelled: number };
  const [stats, setStats] = useState<Stats>({ pending: 0, booked: 0, arrived: 0, completed: 0, cancelled: 0 });
  const [statsPrev, setStatsPrev] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  /** Status card clicked to show logs (appointments for that status). */
  const [statusLogStatus, setStatusLogStatus] = useState<'pending' | 'booked' | 'arrived' | 'completed' | 'cancelled' | null>(null);
  const [viewAppointment, setViewAppointment] = useState<AppointmentRecord | null>(null);

  const { format: formatCurrency } = useCurrency();

  const billSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive"),
    date: z.date({ required_error: "Date is required" }),
    account: z.string().optional(),
    method: z.enum(["cash", "cheque", "bank_transfer"]),
    chequeNo: z.string().optional(),
    externalAccountNo: z.string().optional(),
    note: z.string().optional().default(""),
  });
  type BillFormValues = z.infer<typeof billSchema>;

  const billForm = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      method: "cash",
      note: "",
    },
  });

  const paymentAmount = billForm.watch('amount') !== undefined ? String(billForm.watch('amount')) : '';
  const paymentDate = billForm.watch('date');
  const paymentAccount = billForm.watch('account') || '';
  const paymentMethod = billForm.watch('method');
  const chequeNo = billForm.watch('chequeNo') || '';
  const externalAccountNo = billForm.watch('externalAccountNo') || '';
  const paymentNote = billForm.watch('note') || '';

  const [checkoutAppt, setCheckoutAppt] = useState<AppointmentRecord | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  useEffect(() => {
    ApiService.accounts.getAll()
      .then(res => setAccounts(res.data || []))
      .catch(() => { });
  }, []);



  const fetchAppointments = useCallback(async () => {
    if (selectedBranchId == null) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    try {
      const isCalendar = viewMode === 'calendar';
      const params: any = {
        page: isCalendar ? 1 : apptPage,
        limit: isCalendar ? 500 : apptLimit,
      };

      if (isCalendar && calendarRange === 'week') {
        const { start, end } = getWeekRange(selectedDate);
        params.startDate = start;
        params.endDate = end;
      } else {
        params.date = selectedDate;
      }

      const data = await ApiService.appointments.getAll(params);
      setAppointments(Array.isArray(data.data) ? data.data : []);
      setApptTotal(data.total ?? 0);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load appointments');
      setAppointments([]);
      setApptTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranchId, apptPage, viewMode, calendarRange]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    setApptPage(1);
  }, [selectedDate, viewMode, calendarRange]);

  useEffect(() => {
    const hasArrived = appointments.some((a) => a.status === 'arrived');
    if (!hasArrived) return;
    const interval = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [appointments]);

  const fetchStats = useCallback(async () => {
    if (selectedBranchId == null) {
      setStats({ booked: 0, arrived: 0, completed: 0, cancelled: 0 });
      setStatsPrev(null);
      return;
    }
    setStatsLoading(true);
    try {
      const prevDate = (() => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        return formatLocalDateStr(d);
      })();
      const [data, dataPrev] = await Promise.all([
        ApiService.appointments.getStats({ date: selectedDate }),
        ApiService.appointments.getStats({ date: prevDate }),
      ]);
      if (data?.success && data?.data) {
        setStats({
          pending: data.data.pending ?? 0,
          booked: data.data.booked ?? 0,
          arrived: data.data.arrived ?? 0,
          completed: data.data.completed ?? 0,
          cancelled: data.data.cancelled ?? 0,
        });
      } else {
        setStats({ pending: 0, booked: 0, arrived: 0, completed: 0, cancelled: 0 });
      }
      if (dataPrev?.success && dataPrev?.data) {
        setStatsPrev({
          pending: dataPrev.data.pending ?? 0,
          booked: dataPrev.data.booked ?? 0,
          arrived: dataPrev.data.arrived ?? 0,
          completed: dataPrev.data.completed ?? 0,
          cancelled: dataPrev.data.cancelled ?? 0,
        });
      } else {
        setStatsPrev(null);
      }
    } catch {
      setStats({ booked: 0, arrived: 0, completed: 0, cancelled: 0 });
      setStatsPrev(null);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedDate, selectedBranchId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);



  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    const days = viewMode === 'calendar' && calendarRange === 'week' ? 7 : 1;
    d.setDate(d.getDate() - days);
    setSelectedDate(formatLocalDateStr(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    const days = viewMode === 'calendar' && calendarRange === 'week' ? 7 : 1;
    d.setDate(d.getDate() + days);
    setSelectedDate(formatLocalDateStr(d));
  };

  const handleToday = () => {
    setSelectedDate(getTodayLocalStr());
  };

  const handleCheckIn = async (id: number) => {
    if (selectedBranchId == null) return;
    setActionApptId(id);
    try {
      const data = await ApiService.appointments.checkIn(id);
      toast.success(data.message || 'Checked in successfully');
      fetchAppointments();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionApptId(null);
    }
  };

  const handleCheckOut = async (id: number) => {
    if (selectedBranchId == null) return;
    setActionApptId(id);
    try {
      const data = await ApiService.appointments.checkOut(id);
      toast.success(data.message || 'Checked out successfully');
      fetchAppointments();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionApptId(null);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (selectedBranchId == null) return;
    if (!window.confirm('Cancel this appointment? This cannot be undone.')) return;
    setActionApptId(id);
    try {
      await ApiService.appointments.updateStatus(id, 'cancelled');
      toast.success('Appointment cancelled');
      fetchAppointments();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setActionApptId(null);
    }
  };

  const handleApprove = async (id: number) => {
    if (selectedBranchId == null) return;
    setActionApptId(id);
    try {
      await ApiService.appointments.updateStatus(id, 'booked');
      toast.success('Appointment approved and confirmed!');
      fetchAppointments();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve appointment');
    } finally {
      setActionApptId(null);
    }
  };

  const openIssue = (appt: AppointmentRecord) => {
    setIssueAppointment(appt);
    setIssueNotes('');
  };

  const closeIssue = () => {
    setIssueAppointment(null);
    setIssueNotes('');
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueAppointment || selectedBranchId == null) return;
    setIssueSaving(true);
    try {
      await ApiService.appointments.reportIssue(issueAppointment.id, { notes: issueNotes.trim() || undefined });
      toast.success('Issue reported');
      closeIssue();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to report issue');
    } finally {
      setIssueSaving(false);
    }
  };

  const handleOpenCheckout = async (appt: AppointmentRecord) => {
    // 1. Modal ko foran open karein taake UI responsive rahe
    setCheckoutAppt(appt);
    setCheckoutModalOpen(true);

    // 2. Agar status 'arrived' hai, to clock ko isi second freeze (completed) kar dein
    if (appt.status === 'arrived') {
      try {
        await ApiService.appointments.checkOut(appt.id);
        
        // Background mein state refresh karein taake list aur stats update ho jayein
        fetchAppointments();
        fetchStats();
        console.log(`Appointment #${appt.id} clock frozen successfully.`);
      } catch (err) {
        console.error("Failed to auto-freeze appointment duration:", err);
      }
    }
  };

  const handleAddAnotherService = () => {
    if (!checkoutAppt) return;
    
    const serviceId = checkoutAppt.serviceId || '';
    const packageId = checkoutAppt.packageId || '';
    const itemId = serviceId || packageId || '';
    const itemType = serviceId ? 'service' : 'package';

    // Build URLSearchParams dynamically to pass both old and new param names
    const queryParams = new URLSearchParams({
      customerId: String(checkoutAppt.customerId),
      staffId: String(checkoutAppt.staffId || ''),
      apptId: String(checkoutAppt.id),
      itemId: String(itemId),
      itemType: itemType,
    });

    // Backwards compatibility for POS pages looking for direct IDs
    if (serviceId) {
      queryParams.set('serviceId', String(serviceId));
    }
    if (packageId) {
      queryParams.set('packageId', String(packageId));
    }

    navigate(`/pos?${queryParams.toString()}`);
    setCheckoutModalOpen(false);
  };

  const handleConvertToBillOption = () => {
    if (!checkoutAppt) return;
    setCheckoutModalOpen(false);
    const price = checkoutAppt.service?.price ?? checkoutAppt.package?.price ?? 0;
    const name = checkoutAppt.service?.serviceName || checkoutAppt.package?.packageName || 'Treatment';
    billForm.reset({
      amount: price > 0 ? price : 0,
      date: new Date(),
      account: accounts.length > 0 ? String(accounts[0].id) : '',
      method: 'cash',
      chequeNo: '',
      externalAccountNo: '',
      note: `Bill payment for appointment #${checkoutAppt.id} - ${name}`,
    });
    setBillModalOpen(true);
  };

  const handleConvertToBillSubmit = billForm.handleSubmit(async (data) => {
    if (!checkoutAppt) return;
    if (data.method === 'bank_transfer' && !data.account) {
      toast.error('Please select a bank account');
      return;
    }

    setIsSubmittingBill(true);
    try {
      const isPackage = !!checkoutAppt.packageId;
      const itemId = checkoutAppt.serviceId || checkoutAppt.packageId;
      const itemName = checkoutAppt.service?.serviceName || checkoutAppt.package?.packageName || 'Treatment';
      const itemPrice = checkoutAppt.service?.price || checkoutAppt.package?.price || data.amount;

      const payload = {
        status: 'paid',
        customerId: checkoutAppt.customerId,
        staffId: checkoutAppt.staffId,
        taxPercent: 0,
        discountType: 'fixed',
        discountAmount: 0,
        discountRate: 0,
        total: data.amount,
        totalItems: 1,
        amountPaid: data.amount,
        paymentMethod: data.method,
        paymentStatus: 'paid',
        accountId: data.method === 'bank_transfer' ? data.account : undefined,
        paymentDetails: data.method === 'bank_transfer' ? {
          bankAccountId: data.account,
          transferReferenceNo: data.externalAccountNo,
          transferDate: format(data.date, 'yyyy-MM-dd')
        } : data.method === 'cheque' ? {
          chequeNo: data.chequeNo
        } : undefined,
        chequeNo: data.method === 'cheque' ? data.chequeNo : undefined,
        externalAccountNo: data.method === 'bank_transfer' ? data.externalAccountNo : undefined,
        paymentDate: format(data.date, 'yyyy-MM-dd'),
        paymentNote: data.note,
        items: [
          {
            itemId: itemId,
            itemName: itemName,
            itemType: isPackage ? 'package' : 'service',
            price: itemPrice,
            quantity: 1,
            staffId: checkoutAppt.staffId || undefined,
            itemDiscountType: null,
            itemDiscountAmount: 0,
            itemTaxPercent: 0,
          }
        ]
      };

      await ApiService.post('/pos/sale/submit', payload);
      await ApiService.appointments.updateStatus(checkoutAppt.id, 'completed');

      toast.success('Bill created and paid successfully!');
      setBillModalOpen(false);
      setCheckoutAppt(null);
      fetchAppointments();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to convert appointment to bill');
    } finally {
      setIsSubmittingBill(false);
    }
  })

  const renderActionButtons = (appt: AppointmentRecord) => {
  const isBusy = actionApptId === appt.id;
  const canCancel = appt.status === 'booked' || appt.status === 'arrived' || appt.status === 'pending';

  if (appt.status === 'completed' || appt.status === 'cancelled') {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/60"
        onClick={() => setViewAppointment(appt)}
      >
        <Eye className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">View</span>
      </Button>
    );
  }

  // For arrived status - show only Checkout/Bill button
  if (appt.status === 'arrived') {
    return (
      <Button
        type="button"
        size="sm"
        disabled={isBusy}
        onClick={() => handleOpenCheckout(appt)}
        className="shrink-0 gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-8 px-3 text-xs font-semibold"
      >
        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
        <span className="whitespace-nowrap">Checkout / Bill</span>
      </Button>
    );
  }

  // Pending appointments: show Approve + Edit + Cancel
  if (appt.status === 'pending') {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          disabled={isBusy}
          onClick={() => handleApprove(appt.id)}
          className="shrink-0 gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm h-8 px-3 text-xs font-semibold"
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
          <span className="whitespace-nowrap">Approve</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              disabled={isBusy}
              className="h-8 w-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onSelect={() => navigate(`/appointments/edit/${appt.id}`)} disabled={isBusy} className="gap-2">
              <Pencil className="w-4 h-4" />
              Edit & Assign Staff
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleCancelAppointment(appt.id)}
              disabled={isBusy}
              className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Ban className="w-4 h-4" />
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // For booked status - show dropdown with Check In and other options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          disabled={isBusy}
          className="h-8 w-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 shadow-sm hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60 dark:hover:border-blue-600"
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {appt.status === 'booked' && (
          <DropdownMenuItem
            onSelect={() => handleCheckIn(appt.id)}
            disabled={isBusy}
            className="gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Check In
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate(`/appointments/edit/${appt.id}`)} disabled={isBusy} className="gap-2">
          <Pencil className="w-4 h-4" />
          Edit
        </DropdownMenuItem>
        {appt.status !== 'arrived' && (
          <DropdownMenuItem onSelect={() => navigate(`/appointments/edit/${appt.id}`)} disabled={isBusy} className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Reschedule
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem
            onSelect={() => handleCancelAppointment(appt.id)}
            disabled={isBusy}
            className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
          >
            <Ban className="w-4 h-4" />
            Cancel appointment
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

  return (
    <div className="p-3 md:p-3 lg:p-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage bookings and schedules</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/appointments/add')} disabled={selectedBranchId == null}>
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      {selectedBranchId == null && (
        <p className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
          Select a branch from the header to view and manage appointments.
        </p>
      )}

      {selectedBranchId != null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              key: 'pending',
              label: 'Pending Approval',
              value: stats.pending,
              prev: statsPrev?.pending ?? 0,
              icon: Hourglass,
              iconBg: 'bg-amber-100 dark:bg-amber-950/50',
              iconColor: 'text-amber-600 dark:text-amber-400',
            },
            {
              key: 'booked',
              label: 'Booked',
              value: stats.booked,
              prev: statsPrev?.booked ?? 0,
              icon: Clock,
              iconBg: 'bg-blue-100 dark:bg-blue-950/50',
              iconColor: 'text-blue-600 dark:text-blue-400',
            },
            {
              key: 'arrived',
              label: 'Arrived',
              value: stats.arrived,
              prev: statsPrev?.arrived ?? 0,
              icon: UserCheck,
              iconBg: 'bg-green-100 dark:bg-green-950/50',
              iconColor: 'text-green-600 dark:text-green-400',
            },
            {
              key: 'completed',
              label: 'Completed',
              value: stats.completed,
              prev: statsPrev?.completed ?? 0,
              icon: CircleCheck,
              iconBg: 'bg-purple-100 dark:bg-purple-950/50',
              iconColor: 'text-purple-600 dark:text-purple-400',
            },
            {
              key: 'cancelled',
              label: 'Cancelled',
              value: stats.cancelled,
              prev: statsPrev?.cancelled ?? 0,
              icon: Ban,
              iconBg: 'bg-red-100 dark:bg-red-950/50',
              iconColor: 'text-red-600 dark:text-red-400',
            },
          ].map(({ key, label, value, prev, icon: Icon, iconBg, iconColor }) => {
            const trend = getTrend(value, prev);
            const statusKey = key as 'booked' | 'arrived' | 'completed' | 'cancelled';
            return (
              <Card
                key={key}
                className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                tabIndex={0}
                role="button"
                onClick={() => setStatusLogStatus(statusKey)}
                onKeyDown={(e) => e.key === 'Enter' && setStatusLogStatus(statusKey)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-lg ${iconBg}`}>
                      <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                    {!statsLoading && statsPrev != null && trend.text !== '—' && (
                      <span
                        className={`text-xs font-medium shrink-0 flex items-center gap-0.5 ${trend.up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}
                      >
                        {trend.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {trend.text}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{label}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {statsLoading ? '—' : value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap items-center gap-2">
                {viewMode === 'calendar' && (
                  <div className="bg-muted rounded-lg p-1 flex items-center mr-2">
                    <Button
                      variant={calendarRange === 'day' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`h-7 px-3 rounded-md text-[11px] font-bold ${calendarRange === 'day' ? 'bg-white shadow-sm' : ''}`}
                      onClick={() => setCalendarRange('day')}
                    >
                      DAY
                    </Button>
                    <Button
                      variant={calendarRange === 'week' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`h-7 px-3 rounded-md text-[11px] font-bold ${calendarRange === 'week' ? 'bg-white shadow-sm' : ''}`}
                      onClick={() => setCalendarRange('week')}
                    >
                      WEEK
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleToday} className="hidden sm:flex font-bold text-[11px] h-9 px-4">
                  TODAY
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrevDay} aria-label={calendarRange === 'week' ? "Previous week" : "Previous day"}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 font-medium min-w-[200px] justify-start text-left">
                      <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                      {viewMode === 'calendar' && calendarRange === 'week' ? (
                        (() => {
                          const { start, end } = getWeekRange(selectedDate);
                          return `${formatDisplayDate(start)} — ${formatDisplayDate(end)}`;
                        })()
                      ) : (
                        formatDisplayDate(selectedDate)
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedDate + 'T12:00:00')}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setSelectedDate(`${y}-${m}-${d}`);
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={handleNextDay} aria-label="Next day">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="calendar" className="mt-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : calendarRange === 'week' ? (
            <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Header Row */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50/50">
                  <div className="py-3 px-2 border-r border-gray-200" />
                  {getWeekDates(getWeekRange(selectedDate).start).map((dateStr, idx) => {
                    const date = new Date(dateStr + 'T12:00:00');
                    const isToday = dateStr === getTodayLocalStr();
                    return (
                      <div key={idx} className={`py-3 px-2 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50/50' : ''}`}>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                        <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                          {date.getDate().toString().padStart(2, '0')}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                  {CALENDAR_HOUR_LABELS.map((hourLabel) => {
                    const hourMin = timeSlotToMinutes(hourLabel);
                    const weekDates = getWeekDates(getWeekRange(selectedDate).start);
                    const dayAndHourMap = groupAppointmentsByDayAndHour(appointments);

                    return (
                      <React.Fragment key={hourMin}>
                        {/* Time Label */}
                        <div className="py-4 px-2 text-right border-b border-r border-gray-100 bg-gray-50/30">
                          <span className="text-[11px] font-bold text-gray-500">{hourLabel}</span>
                        </div>

                        {/* Day Cells */}
                        {weekDates.map((dateStr, dayIdx) => {
                          const hourApps = dayAndHourMap.get(dateStr)?.get(hourMin) ?? [];
                          const isToday = dateStr === getTodayLocalStr();

                          return (
                            <div key={dayIdx} className={`border-b border-r border-gray-100 p-1 min-h-[100px] last:border-r-0 ${isToday ? 'bg-blue-50/20' : ''}`}>
                              <div className="flex flex-col gap-1">
                                {hourApps.map((appt) => (
                                  <div
                                    key={appt.id}
                                    className="p-2 rounded-md border border-purple-100 bg-purple-50 text-purple-700 cursor-pointer hover:bg-purple-100 transition-colors"
                                    onClick={() => setViewAppointment(appt)}
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-[10px] font-bold opacity-70">{formatTimeSlotDisplay(appt.timeSlot)}</span>
                                      <Badge className={`${getStatus(appt.status).color} h-4 text-[9px] px-1`}>
                                        {getStatus(appt.status).label}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] font-bold truncate leading-tight">{appt.customer?.name}</p>
                                    <p className="text-[9px] truncate opacity-80 mt-0.5">
                                      {appt.service?.serviceName || appt.package?.packageName || '—'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[auto_1fr] gap-0">
                {(() => {
                  const dayMap = groupAppointmentsByDayAndHour(appointments);
                  const hourMap = dayMap.get(selectedDate) ?? new Map<number, AppointmentRecord[]>();

                  return CALENDAR_HOUR_LABELS.map((hourLabel) => {
                    const hourMin = timeSlotToMinutes(hourLabel);
                    const hourAppointments = hourMap.get(hourMin) ?? [];
                    return (
                      <React.Fragment key={hourMin}>
                        <div className="flex items-start gap-2 border-b border-gray-100 py-2 pr-3 min-h-[52px]">
                          <span className="w-16 shrink-0 text-right text-sm font-medium text-gray-600">{hourLabel}</span>
                        </div>
                        <div className="border-b border-gray-100 py-1 pl-2 min-h-[52px] flex flex-col gap-2">
                          {hourAppointments.length === 0 ? (
                            <div className="h-6" aria-hidden />
                          ) : (
                            hourAppointments.map((appt) => {
                              const status = getStatus(appt.status);
                              const StatusIcon = status.icon;
                              return (
                                <Card key={appt.id} className="border-l-4 border-l-purple-500 shadow-sm">
                                  <CardContent className="pl-3 pr-5 py-3 overflow-x-auto">
                                    <div
                                      className="grid grid-cols-6 gap-x-2 items-start min-w-[600px]"
                                    >
                                      <div className="min-w-0">
                                        {appt.status === 'completed' ? (
                                          <div className="flex flex-col items-center text-center">
                                            <p className="text-xs text-gray-500 text-center">Total duration</p>
                                            <div className="flex flex-col items-center gap-0.5 mt-0.5 text-center">
                                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                                <Timer className="h-4 w-4" />
                                              </div>
                                              <p className="font-medium text-sm">
                                                {appt.checkInTime && appt.checkOutTime
                                                  ? formatTotalDuration(getElapsedSeconds(appt.checkInTime, appt.checkOutTime))
                                                  : appt.timeSlot}
                                              </p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center text-center">
                                            <p className="text-xs text-gray-500 text-center">Time</p>
                                            <div className="flex flex-col items-center gap-0.5 mt-0.5 text-center">
                                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                                <Clock className="h-4 w-4" />
                                              </div>
                                              {appt.status === 'booked' && <p className="font-medium text-sm">{appt.timeSlot}</p>}
                                              {appt.status === 'arrived' && appt.checkInTime && (
                                                <p className="font-mono font-semibold text-sm tabular-nums text-primary" aria-live="polite">
                                                  {formatElapsed(getElapsedSeconds(appt.checkInTime))}
                                                </p>
                                              )}
                                              {(appt.status === 'cancelled' || (appt.status === 'arrived' && !appt.checkInTime)) && <p className="font-medium text-sm">{appt.timeSlot}</p>}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs text-gray-500 text-center">Customer</p>
                                        <div className="flex flex-col items-center gap-0.5 mt-0.5 text-center">
                                          <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                                              {appt.customer?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '—'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <p className="font-medium text-sm truncate max-w-full">{appt.customer?.name ?? '—'}</p>
                                          <p className="text-xs text-gray-500 truncate max-w-full">{appt.customer?.mobile ?? '—'}</p>
                                        </div>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs text-gray-500 text-center">Service</p>
                                        <div className="flex flex-col items-center gap-0.5 mt-0.5 text-center">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                            <Scissors className="h-4 w-4" />
                                          </div>
                                          <p className="font-medium text-sm truncate">
                                            {appt.service?.serviceName || appt.package?.packageName || '—'}
                                          </p>
                                          <p className="text-xs text-gray-600 truncate">{getStaffDisplayName(appt.staff)}</p>
                                        </div>
                                      </div>
                                      <div className="min-w-0 flex flex-col items-center">
                                        <p className="text-xs text-gray-500 text-center">Status</p>
                                        <div className="flex items-center justify-center gap-2 mt-0.5">
                                          <Badge className={`${status.color} shrink-0`}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {status.label}
                                          </Badge>
                                        </div>
                                      </div>
                                      {appt.status === 'completed' ? (
                                        <div className="min-w-0 flex flex-col text-left">
                                          <p className="text-xs text-gray-500">Check-in</p>
                                          <p className="font-medium text-xs whitespace-nowrap">{formatCheckInOutTime(appt.checkInTime)}</p>
                                          <p className="text-xs text-gray-500 mt-1.5">Check-out</p>
                                          <p className="font-medium text-xs whitespace-nowrap">{formatCheckInOutTime(appt.checkOutTime)}</p>
                                        </div>
                                      ) : (
                                        <div aria-hidden />
                                      )}
                                      <div className="min-w-[40px] flex items-center justify-end py-1">
                                        {renderActionButtons(appt)}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })
                          )}
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No appointments for this date.</p>
          ) : (
            appointments.map((appt) => {
              const status = getStatus(appt.status);
              const StatusIcon = status.icon;
              return (
                <Card key={appt.id} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                  <CardContent className="pl-3 pr-5 py-4 overflow-x-auto">
                    <div
                      className={`grid gap-x-3 items-start min-w-[700px] ${appt.status === 'completed' ? 'grid-cols-6' : 'grid-cols-5'
                        }`}
                    >
                      <div className="min-w-0">
                        {appt.status === 'completed' ? (
                          <div className="flex flex-col items-center text-center">
                            <p className="text-sm text-gray-500 text-center">Total duration</p>
                            <div className="flex flex-col items-center gap-1 mt-1 text-center">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 shrink-0">
                                <Timer className="h-4 w-4" />
                              </div>
                              <p className="font-medium text-sm">
                                {appt.checkInTime && appt.checkOutTime
                                  ? formatTotalDuration(getElapsedSeconds(appt.checkInTime, appt.checkOutTime))
                                  : appt.timeSlot}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 text-center">Time</p>
                            <div className="flex flex-col items-center gap-1 mt-1 text-center">
                              <Clock className="h-5 w-5 text-gray-400 shrink-0" />
                              {appt.status === 'booked' && <p className="font-medium text-sm">{appt.timeSlot}</p>}
                              {appt.status === 'arrived' && appt.checkInTime && (
                                <>
                                  <p className="text-xs text-gray-500">Elapsed</p>
                                  <p className="font-mono font-semibold text-sm tabular-nums text-primary" aria-live="polite">
                                    {formatElapsed(getElapsedSeconds(appt.checkInTime))}
                                  </p>
                                </>
                              )}
                              {(appt.status === 'cancelled' || (appt.status === 'arrived' && !appt.checkInTime)) && <p className="font-medium text-sm">{appt.timeSlot}</p>}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 text-center">Customer</p>
                        <div className="flex flex-col items-center gap-1 mt-1 text-center">
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                              {appt.customer?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '—'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{appt.customer?.name ?? '—'}</p>
                            <p className="text-xs text-gray-500 truncate">{appt.customer?.mobile ?? '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 text-center">Service</p>
                        <div className="flex flex-col items-center gap-1 mt-1 text-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 shrink-0">
                            <Scissors className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {appt.service?.serviceName || appt.package?.packageName || '—'}
                            </p>
                            <p className="text-xs text-gray-600 truncate">{getStaffDisplayName(appt.staff)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0 flex flex-col items-center">
                        <p className="text-sm text-gray-500 text-center">Status</p>
                        <div className="flex justify-center mt-1">
                          <Badge className={`${status.color} shrink-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      {appt.status === 'completed' && (
                        <div className="min-w-0 flex flex-col text-left">
                          <p className="text-sm text-gray-500">Check-in</p>
                          <p className="font-medium text-sm whitespace-nowrap">{formatCheckInOutTime(appt.checkInTime)}</p>
                          <p className="text-sm text-gray-500 mt-1.5">Check-out</p>
                          <p className="font-medium text-sm whitespace-nowrap">{formatCheckInOutTime(appt.checkOutTime)}</p>
                        </div>
                      )}
                      <div className="min-w-[140px] w-full min-h-[36px] flex items-center justify-end py-1 pr-0 pl-2">
                        {renderActionButtons(appt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          {!loading && appointments.length > 0 && viewMode === 'list' && (
            <TablePagination
              total={apptTotal}
              page={apptPage}
              limit={apptLimit}
              onPageChange={setApptPage}
              onLimitChange={setApptLimit}
              itemLabel="appointments"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Report Issue Dialog — only for completed appointments */}
      <Dialog open={!!issueAppointment} onOpenChange={(open) => !open && closeIssue()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Report issue
            </DialogTitle>
          </DialogHeader>
          {issueAppointment && (
            <form onSubmit={handleReportIssue} className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {issueAppointment.customer?.name ?? 'Customer'} · {issueAppointment.service?.serviceName || issueAppointment.package?.packageName || 'Treatment'} · {issueAppointment.date} {issueAppointment.timeSlot}
              </p>
              <div className="space-y-2">
                <Label>Issue / notes</Label>
                <Textarea
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Describe the issue with this completed appointment..."
                  className="min-h-[100px] resize-y"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeIssue} disabled={issueSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={issueSaving}>
                  {issueSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Submit issue
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Appointment Details Dialog ── */}
      <Dialog open={!!viewAppointment} onOpenChange={(open) => !open && setViewAppointment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-lg font-bold">
              <Eye className="w-5 h-5 text-purple-600" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {viewAppointment && (
            <div className="py-2 space-y-4 text-sm">
              {/* ID & Status */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase block">Appointment ID</span>
                  <p className="text-base font-bold text-gray-900">#{viewAppointment.id}</p>
                </div>
                <Badge className={getStatus(viewAppointment.status).color}>
                  {getStatus(viewAppointment.status).label}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border">
                <span className="text-xs text-gray-400 font-semibold uppercase block">Customer Info</span>
                <p className="font-bold text-gray-900">{viewAppointment.customer?.name ?? '—'}</p>
                <p className="text-xs text-gray-500">Phone: {viewAppointment.customer?.mobile ?? '—'}</p>
                {viewAppointment.customer?.email && (
                  <p className="text-xs text-gray-500">Email: {viewAppointment.customer.email}</p>
                )}
              </div>

              {/* Treatment Details */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border">
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase block">Treatment</span>
                  <p className="font-bold text-gray-900 truncate">
                    {viewAppointment.service?.serviceName || viewAppointment.package?.packageName || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 font-semibold uppercase block">Amount</span>
                  <p className="font-bold text-purple-700">
                    {formatCurrency(viewAppointment.service?.price ?? viewAppointment.package?.price ?? 0)}
                  </p>
                </div>
              </div>

              {/* Stylist & Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase block">Stylist</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{getStaffDisplayName(viewAppointment.staff)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase block">Date & Time</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{viewAppointment.date}</p>
                  <p className="text-xs text-purple-700 font-bold mt-0.5">{viewAppointment.timeSlot}</p>
                </div>
              </div>

              {/* Check-In / Check-Out (for Completed appointments) */}
              {viewAppointment.status === 'completed' && (
                <div className="grid grid-cols-2 gap-4 border-t pt-3">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase block">Check-In</span>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">
                      {formatCheckInOutTime(viewAppointment.checkInTime)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase block">Check-Out</span>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">
                      {formatCheckInOutTime(viewAppointment.checkOutTime)}
                    </p>
                  </div>
                </div>
              )}

              {/* Special Notes */}
              {viewAppointment.notes && (
                <div className="border-t pt-3 space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase block">Special Notes</span>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border">{viewAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full font-semibold" onClick={() => setViewAppointment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status logs: appointments for selected date by status */}
      <Dialog open={statusLogStatus != null} onOpenChange={(open) => !open && setStatusLogStatus(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {statusLogStatus != null && statusConfig[statusLogStatus].label} — {formatDisplayDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pr-2">
            {statusLogStatus != null && (() => {
              const list = appointments.filter((a) => a.status === statusLogStatus);
              if (list.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No {statusConfig[statusLogStatus]?.label.toLowerCase()} appointments for this date.
                  </p>
                );
              }
              return list.map((appt) => {
                const status = getStatus(appt.status);
                const StatusIcon = status.icon;
                return (
                  <Card key={appt.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{appt.customer?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {appt.service?.serviceName || appt.package?.packageName || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{appt.timeSlot}</p>
                        </div>
                        <Badge className={`${status.color} shrink-0`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              Appointment Checkout
            </DialogTitle>
          </DialogHeader>
          {checkoutAppt && (
            <div className="py-4 space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/30 p-3.5 rounded-lg border border-purple-100 dark:border-purple-900 space-y-1.5">
                <p className="font-semibold text-sm text-purple-950 dark:text-purple-200">
                  {checkoutAppt.customer?.name ?? 'Customer'}
                </p>
                <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300">
                  <span>{checkoutAppt.service?.serviceName || checkoutAppt.package?.packageName || 'Treatment'}</span>
                  <span className="font-bold">
                    {formatCurrency(checkoutAppt.service?.price ?? checkoutAppt.package?.price ?? 0)}
                  </span>
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  Staff: {getStaffDisplayName(checkoutAppt.staff)}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                How would you like to proceed with this appointment checkout?
              </p>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleAddAnotherService}
                  className="w-full justify-start gap-3 h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Add Another Service</p>
                    <p className="text-xs text-gray-500 font-normal">Redirect to POS with this service in cart</p>
                  </div>
                </Button>

                <Button
                  type="button"
                  onClick={handleConvertToBillOption}
                  className="w-full justify-start gap-3 h-12 bg-purple-600 hover:bg-purple-700 text-white shadow-sm dark:bg-purple-600 dark:hover:bg-purple-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Convert to Bill</p>
                    <p className="text-xs text-purple-100 font-normal">Create bill and process payment directly</p>
                  </div>
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Bill / Payment Modal */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Bill Payment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvertToBillSubmit} className="space-y-3 py-3">
            {checkoutAppt && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{checkoutAppt.customer?.name ?? 'Customer'}</p>
                  <p className="text-xs text-gray-500">
                    {checkoutAppt.service?.serviceName || checkoutAppt.package?.packageName || 'Treatment'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Due</p>
                  <p className="font-bold text-base text-red-600">
                    {formatCurrency(checkoutAppt.service?.price ?? checkoutAppt.package?.price ?? 0)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 items-center gap-4">
              <Label htmlFor="billAmount" className="text-right col-span-4 font-medium">
                Amount
              </Label>
              <Input
                id="billAmount"
                type="number"
                step="0.01"
                value={billForm.watch('amount') ?? ''}
                onChange={(e) => billForm.setValue('amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="col-span-8"
                required
              />
            </div>

            <div className="grid grid-cols-12 items-center gap-4">
              <Label className="text-right col-span-4 font-medium">Date</Label>
              <div className="col-span-8">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {billForm.watch('date') ? format(billForm.watch('date'), 'MM/dd/yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={billForm.watch('date')}
                      onSelect={(d) => d && billForm.setValue('date', d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-12 items-center gap-4">
              <Label className="text-right col-span-4 font-medium whitespace-nowrap">Payment Method</Label>
              <Select value={billForm.watch('method')} onValueChange={(v) => billForm.setValue('method', v as 'cash' | 'cheque' | 'bank_transfer')}>
                <SelectTrigger className="col-span-8">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {billForm.watch('method') === 'bank_transfer' && (
              <>
                <div className="grid grid-cols-12 items-center gap-4">
                  <Label className="text-right col-span-4 font-medium">Bank Account</Label>
                  <Select value={billForm.watch('account') || ''} onValueChange={(v) => billForm.setValue('account', v)}>
                    <SelectTrigger className="col-span-8">
                      <SelectValue placeholder="Select Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.bankName} ({acc.accountNumber || 'Cash'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-12 items-center gap-4">
                  <Label htmlFor="externalAccountNo" className="text-right col-span-4 font-medium whitespace-nowrap">
                    Transaction ID
                  </Label>
                  <Input
                    id="externalAccountNo"
                    value={billForm.watch('externalAccountNo') || ''}
                    onChange={(e) => billForm.setValue('externalAccountNo', e.target.value)}
                    className="col-span-8"
                    placeholder="Enter Transaction ID"
                    required
                  />
                </div>
              </>
            )}

            {billForm.watch('method') === 'cheque' && (
              <div className="grid grid-cols-12 items-center gap-4">
                <Label htmlFor="chequeNo" className="text-right col-span-4 font-medium whitespace-nowrap">
                  Cheque No
                </Label>
                <Input
                  id="chequeNo"
                  value={billForm.watch('chequeNo') || ''}
                  onChange={(e) => billForm.setValue('chequeNo', e.target.value)}
                  className="col-span-8"
                  placeholder="Enter Cheque No"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-12 items-start gap-4">
              <Label htmlFor="paymentNote" className="text-right col-span-4 font-medium pt-2.5">
                Note
              </Label>
              <Textarea
                id="paymentNote"
                value={billForm.watch('note') || ''}
                onChange={(e) => billForm.setValue('note', e.target.value)}
                className="col-span-8"
                placeholder="Payment notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBillModalOpen(false)} disabled={isSubmittingBill}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingBill}>
                {isSubmittingBill && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Payment & Bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
