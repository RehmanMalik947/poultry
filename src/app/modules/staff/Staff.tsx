import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffSchema, type StaffFormValues } from "../../utils/validation";
import { COLORS } from '../../constants/colors';
import { useNavigate, useLocation } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '../../components/ui/sheet';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Separator } from '../../components/ui/separator';
import { Plus, Briefcase, Clock, Loader2, Pencil, Trash2, Eye, DollarSign, User, Users, Landmark, Shield, Phone, Mail, MapPin, Calendar as CalendarIcon, ArrowLeft, Paperclip, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '../../components/ui/checkbox';
import { ApiService } from '../../../api/ApiService';
import React from 'react';
import { useBranch } from '../../contexts/BranchContext';
import { canManage } from '../../utils/permissions';
import { EntityActions } from '../../components/shared/EntityActions';
import { TablePagination } from '../../components/shared/TablePagination';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { DataTable, Column } from '../../components/shared/DataTable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/** Full date for button display: "Wednesday, March 11, 2026" */
function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const str = String(dateStr).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

/** Format date for display. Date-only strings (YYYY-MM-DD) are parsed as local date to avoid timezone shift. */
function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    const str = String(iso).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type Branch = { id: number; name: string; address?: string | null; phone?: string | null };
type RoleFromApi = { id: number; name: string; permissions?: string[] };
type StaffItem = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  role: string | null;
  branchId: number;
  isActive?: boolean;
  prefix?: string | null;

  allowLogin?: boolean;
  username?: string | null;
  Branch?: { id: number; name: string };
};

const defaultStaffForm = {
  branchId: '' as string | number,
  prefix: '',
  firstName: '',
  lastName: '',
  email: '',
  isActive: true,

  allowLogin: false,
  username: '',
  password: '',
  confirmPassword: '',
  role: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  bloodGroup: '',
  mobileNumber: '',
  alternateContactNumber: '',
  familyContactNumber: '',
  facebookLink: '',
  twitterLink: '',
  socialMedia1: '',
  socialMedia2: '',
  customField: '',
  guardianName: '',
  idProofName: '',
  idProofNumber: '',
  permanentAddress: '',
  currentAddress: '',
  bankAccountHolderName: '',
  bankAccountNumber: '',
  bankName: '',
  bankIdentifierCode: '',
  bankBranch: '',
  taxPayerId: '',
  // Basic Salary (pay items / user-salary)
  salaryType: 'monthly' as 'daily' | 'weekly' | 'monthly',
  salaryAmount: '',
  salaryEffectiveFrom: new Date().toISOString().slice(0, 10),
  commissionType: 'percentage' as 'percentage' | 'fixed',
  commissionValue: '',
  workingDays: [] as string[],
  startTime: '09:00 AM',
  endTime: '08:00 PM',
  breakStartTime: '01:00 PM',
  breakEndTime: '02:00 PM',
};

type LocationStateOpenStaff = {
  openStaffId?: number;
  openStep?: 1 | 2 | 3 | 4 | 5;
  viewOnly?: boolean;
  payItem?: { id?: number; salaryType: string; amount: number; effectiveFrom: string };
  fromPayItemEdit?: boolean;
};

export function Staff() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBranchId } = useBranch();
  const fromPayItemEditRef = useRef<{ payItemId: number } | null>(null);
  const [fromPayItemEditMode, setFromPayItemEditMode] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffLimit, setStaffLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffViewOnlyMode, setStaffViewOnlyMode] = useState(false);
  const [viewedStaffRecord, setViewedStaffRecord] = useState<{ createdAt?: string; branchName?: string } | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'personal' | 'job' | 'bank' | 'commissions'>('personal');
  const [rolesFromApi, setRolesFromApi] = useState<RoleFromApi[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [addForm, setAddForm] = useState(defaultStaffForm);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      role: "",
      branchId: undefined,
      phone: "",
      isActive: true,
    },
  });
  const [addFormStep, setAddFormStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [salaryEffectiveFromPickerOpen, setSalaryEffectiveFromPickerOpen] = useState(false);
  const [dateOfBirthPickerOpen, setDateOfBirthPickerOpen] = useState(false);

  // Commission Logs States
  const [logs, setLogs] = useState<any[]>([]);
  const [logsDateFilter, setLogsDateFilter] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsStartDate, setLogsStartDate] = useState('');
  const [logsEndDate, setLogsEndDate] = useState('');
  const allRoleNames = rolesFromApi.map((r) => r.name);

  const fetchBranches = useCallback(async () => {
    try {
      const data = await ApiService.staff.getBranches();
      if (data.success && Array.isArray(data.data)) setBranches(data.data);
      else setBranches([]);
    } catch {
      setBranches([]);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    if (selectedBranchId == null) {
      setStaff([]);
      setStaffLoading(false);
      return;
    }
    setStaffLoading(true);
    try {
      const data = await ApiService.staff.getAll({
        branchId: selectedBranchId,
        page: staffPage,
        limit: staffLimit,
        search: search || undefined
      });
      const list = Array.isArray(data.data) ? data.data : [];
      setStaff(list);
      setStaffTotal(data.total ?? 0);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login', { replace: true });
        return;
      }
      setStaff([]);
      setStaffTotal(0);
    } finally {
      setStaffLoading(false);
    }
  }, [navigate, selectedBranchId, staffPage, search]);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await ApiService.roles.getAll();
      if (data.success && Array.isArray(data.data)) setRolesFromApi(data.data);
      else setRolesFromApi([]);
    } catch {
      setRolesFromApi([]);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchRoles();
  }, [fetchBranches, fetchRoles]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Commission Logs Fetcher
  const fetchStaffLogs = useCallback(async () => {
    if (!viewingProfileId) return;
    setLoadingLogs(true);
    try {
      const params: any = { dateRange: logsDateFilter };
      if (logsDateFilter === 'custom') {
        params.startDate = logsStartDate;
        params.endDate = logsEndDate;
      }
      const res = await ApiService.staff.getLogs(viewingProfileId, params);
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data);
      } else {
        setLogs([]);
      }
    } catch {
      toast.error("Failed to load history logs");
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [viewingProfileId, logsDateFilter, logsStartDate, logsEndDate]);

  useEffect(() => {
    if (profileTab === 'commissions' && viewingProfileId) {
      fetchStaffLogs();
    }
  }, [profileTab, viewingProfileId, fetchStaffLogs, logsDateFilter]);

  // Open at Basic Salary step when navigating from Payroll → Pay Items (View/Edit)
  useEffect(() => {
    const s = location.state as LocationStateOpenStaff | null | undefined;
    if (s?.openStaffId == null) return;
    const openStaffId = s.openStaffId;
    const openStep = s.openStep ?? 2;
    const viewOnly = !!s.viewOnly;
    const payItem = s.payItem;
    const fromPayItemEdit = !!s.fromPayItemEdit && !!payItem?.id;
    if (fromPayItemEdit && payItem?.id) {
      fromPayItemEditRef.current = { payItemId: payItem.id };
      setFromPayItemEditMode(true);
    } else {
      fromPayItemEditRef.current = null;
      setFromPayItemEditMode(false);
    }
    setEditingStaffId(openStaffId);
    setStaffViewOnlyMode(viewOnly);
    setFormErrors({});
    setAddFormStep(openStep);
    setAddDialogOpen(true);
    if (payItem) {
      setAddForm((prev) => ({
        ...prev,
        salaryType: payItem.salaryType as 'daily' | 'weekly' | 'monthly',
        salaryAmount: String(payItem.amount),
        salaryEffectiveFrom: payItem.effectiveFrom,
      }));
    }
    navigate(location.pathname, { replace: true, state: {} });
    ApiService.staff.getById(openStaffId)
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          if (viewOnly) {
            setViewedStaffRecord({
              createdAt: d.createdAt,
              branchName: branches.find((b) => b.id === d.branchId)?.name,
            });
          }
          setAddForm({
            ...defaultStaffForm,
            branchId: d.branchId ?? '',
            prefix: d.prefix ?? '',
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            isActive: d.isActive !== false,

            allowLogin: !!d.allowLogin,
            username: (d.username || d.email || '') as string,
            password: '',
            confirmPassword: '',
            role: d.role ?? '',
            dateOfBirth: d.dateOfBirth ?? '',
            gender: d.gender ?? '',
            maritalStatus: d.maritalStatus ?? '',
            bloodGroup: d.bloodGroup ?? '',
            mobileNumber: d.mobileNumber ?? '',
            alternateContactNumber: d.alternateContactNumber ?? '',
            familyContactNumber: d.familyContactNumber ?? '',
            facebookLink: d.facebookLink ?? '',
            twitterLink: d.twitterLink ?? '',
            socialMedia1: d.socialMedia1 ?? '',
            socialMedia2: d.socialMedia2 ?? '',
            customField: d.customField ?? '',
            guardianName: d.guardianName ?? '',
            idProofName: d.idProofName ?? '',
            idProofNumber: d.idProofNumber ?? '',
            permanentAddress: d.permanentAddress ?? '',
            currentAddress: d.currentAddress ?? '',
            bankAccountHolderName: d.bankAccountHolderName ?? '',
            bankAccountNumber: d.bankAccountNumber ?? '',
            bankName: d.bankName ?? '',
            bankIdentifierCode: d.bankIdentifierCode ?? '',
            bankBranch: d.bankBranch ?? '',
            taxPayerId: d.taxPayerId ?? '',
            ...(payItem
              ? {
                salaryType: payItem.salaryType as 'daily' | 'weekly' | 'monthly',
                salaryAmount: payItem.amount != null ? String(payItem.amount) : '',
                salaryEffectiveFrom: payItem.effectiveFrom || new Date().toISOString().slice(0, 10),
              }
              : d.userSalary
                ? {
                  salaryType: d.userSalary.salaryType as 'daily' | 'weekly' | 'monthly',
                  salaryAmount: d.userSalary.amount != null ? String(d.userSalary.amount) : '',
                  salaryEffectiveFrom: d.userSalary.effectiveFrom || new Date().toISOString().slice(0, 10),
                }
                : {}),
          });
        }
      })
      .catch(() => toast.error('Failed to load staff details'));
  }, [location.state, location.pathname, navigate, branches]);

  const openAddDialog = () => {
    fromPayItemEditRef.current = null;
    setFromPayItemEditMode(false);
    setEditingStaffId(null);
    setStaffViewOnlyMode(false);
    setViewedStaffRecord(null);
    setAddForm({ ...defaultStaffForm, salaryEffectiveFrom: new Date().toISOString().slice(0, 10) });
    setFormErrors({});
    setAddFormStep(1);
    setAddDialogOpen(true);
  };

  const openEditStaff = useCallback((member: StaffItem) => {
    fromPayItemEditRef.current = null;
    setFromPayItemEditMode(false);
    setEditingStaffId(member.id);
    setStaffViewOnlyMode(false);
    setViewedStaffRecord(null);
    setFormErrors({});
    setAddFormStep(1);
    setAddDialogOpen(true);
    ApiService.staff.getById(member.id)
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          setAddForm({
            ...defaultStaffForm,
            branchId: d.branchId ?? '',
            prefix: d.prefix ?? '',
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            isActive: d.isActive !== false,

            allowLogin: !!d.allowLogin,
            username: (d.username || d.email || '') as string,
            password: '',
            confirmPassword: '',
            role: d.role ?? '',
            dateOfBirth: d.dateOfBirth ?? '',
            gender: d.gender ?? '',
            maritalStatus: d.maritalStatus ?? '',
            bloodGroup: d.bloodGroup ?? '',
            mobileNumber: d.mobileNumber ?? '',
            alternateContactNumber: d.alternateContactNumber ?? '',
            familyContactNumber: d.familyContactNumber ?? '',
            facebookLink: d.facebookLink ?? '',
            twitterLink: d.twitterLink ?? '',
            socialMedia1: d.socialMedia1 ?? '',
            socialMedia2: d.socialMedia2 ?? '',
            customField: d.customField ?? '',
            guardianName: d.guardianName ?? '',
            idProofName: d.idProofName ?? '',
            idProofNumber: d.idProofNumber ?? '',
            permanentAddress: d.permanentAddress ?? '',
            currentAddress: d.currentAddress ?? '',
            bankAccountHolderName: d.bankAccountHolderName ?? '',
            bankAccountNumber: d.bankAccountNumber ?? '',
            bankName: d.bankName ?? '',
            bankIdentifierCode: d.bankIdentifierCode ?? '',
            bankBranch: d.bankBranch ?? '',
            taxPayerId: d.taxPayerId ?? '',
            ...(d.userSalary
              ? {
                salaryType: d.userSalary.salaryType as 'daily' | 'weekly' | 'monthly',
                salaryAmount: d.userSalary.amount != null ? String(d.userSalary.amount) : '',
                salaryEffectiveFrom: d.userSalary.effectiveFrom || new Date().toISOString().slice(0, 10),
              }
              : {}),
          });
        }
      })
      .catch(() => toast.error('Failed to load staff details'));
  }, []);

  const openViewStaff = useCallback((member: StaffItem) => {
    setViewingProfileId(member.id);
    setStaffViewOnlyMode(true);
  }, []);

  // Load staff data when viewing full-page profile
  useEffect(() => {
    if (viewingProfileId == null) return;
    setProfileLoading(true);
    ApiService.staff.getById(viewingProfileId)
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          setViewedStaffRecord({
            createdAt: d.createdAt,
            branchName: branches.find((b) => b.id === d.branchId)?.name,
          });
          setAddForm({
            ...defaultStaffForm,
            branchId: d.branchId ?? '',
            prefix: d.prefix ?? '',
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            isActive: d.isActive !== false,

            allowLogin: !!d.allowLogin,
            username: (d.username || d.email || '') as string,
            password: '',
            confirmPassword: '',
            role: d.role ?? '',
            dateOfBirth: d.dateOfBirth ?? '',
            gender: d.gender ?? '',
            maritalStatus: d.maritalStatus ?? '',
            bloodGroup: d.bloodGroup ?? '',
            mobileNumber: d.mobileNumber ?? '',
            alternateContactNumber: d.alternateContactNumber ?? '',
            familyContactNumber: d.familyContactNumber ?? '',
            facebookLink: d.facebookLink ?? '',
            twitterLink: d.twitterLink ?? '',
            socialMedia1: d.socialMedia1 ?? '',
            socialMedia2: d.socialMedia2 ?? '',
            customField: d.customField ?? '',
            guardianName: d.guardianName ?? '',
            idProofName: d.idProofName ?? '',
            idProofNumber: d.idProofNumber ?? '',
            permanentAddress: d.permanentAddress ?? '',
            currentAddress: d.currentAddress ?? '',
            bankAccountHolderName: d.bankAccountHolderName ?? '',
            bankAccountNumber: d.bankAccountNumber ?? '',
            bankName: d.bankName ?? '',
            bankIdentifierCode: d.bankIdentifierCode ?? '',
            bankBranch: d.bankBranch ?? '',
            taxPayerId: d.taxPayerId ?? '',
            commissionType: d.commissionType ?? 'percentage',
            commissionValue: d.commissionValue != null ? String(d.commissionValue) : '',
            workingDays: d.workingDays ? (typeof d.workingDays === 'string' ? (typeof JSON.parse(d.workingDays) === 'string' ? JSON.parse(JSON.parse(d.workingDays)) : JSON.parse(d.workingDays)) : d.workingDays) : [],
            startTime: d.startTime ?? '09:00 AM',
            endTime: d.endTime ?? '08:00 PM',
            breakStartTime: d.breakStartTime ?? '01:00 PM',
            breakEndTime: d.breakEndTime ?? '02:00 PM',
            ...(d.userSalary
              ? {
                salaryType: d.userSalary.salaryType as 'daily' | 'weekly' | 'monthly',
                salaryAmount: d.userSalary.amount != null ? String(d.userSalary.amount) : '',
                salaryEffectiveFrom: d.userSalary.effectiveFrom || new Date().toISOString().slice(0, 10),
              }
              : {}),
          });
        }
      })
      .catch(() => toast.error('Failed to load staff details'))
      .finally(() => setProfileLoading(false));
  }, [viewingProfileId, branches]);

  const isEditMode = editingStaffId != null;

  const TOTAL_STEPS = 3;

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!isEditMode) {
      const branchId = addForm.branchId === '' ? null : Number(addForm.branchId);
      if (branchId == null || Number.isNaN(branchId)) errors.branch = 'Branch is required';
    }
    if (!addForm.firstName.trim()) errors.firstName = 'First name is required';
    if (!addForm.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) errors.email = 'Please enter a valid email address.';
    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...errors, general: 'Please fix the form errors.' });
      toast.error('Please fix the form errors.');
      return false;
    }
    setFormErrors({});
    return true;
  };

  const validateLoginFields = (): boolean => {
    if (!addForm.allowLogin) return true;
    const errors: Record<string, string> = {};
    if (addForm.username.trim() && addForm.username.trim().length < 3) errors.username = 'Username must be at least 3 characters';
    if (!isEditMode) {
      if (!addForm.password?.trim()) errors.password = 'Password is required';
      else if (addForm.password.length < 5) errors.password = 'Password must be at least 5 characters.';
      if (!addForm.confirmPassword?.trim()) errors.confirmPassword = 'Confirm password is required';
      else if (addForm.password !== addForm.confirmPassword) errors.confirmPassword = 'Password and Confirm password do not match.';
    } else if (addForm.password?.trim() || addForm.confirmPassword?.trim()) {
      if (addForm.password && addForm.password.length < 5) errors.password = 'Password must be at least 5 characters.';
      if (addForm.password !== addForm.confirmPassword) errors.confirmPassword = 'Password and Confirm password do not match.';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors({ ...errors, general: 'Please fix the form errors.' });
      toast.error('Please fix the form errors.');
      return false;
    }
    return true;
  };

  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (staffViewOnlyMode) return;
    const payItemId = fromPayItemEditRef.current?.payItemId;
    const isUpdateFromPayItem = payItemId != null && addFormStep === 2;
    if (isUpdateFromPayItem) {
      const amt = addForm.salaryAmount.trim() ? parseFloat(addForm.salaryAmount) : NaN;
      if (!addForm.salaryAmount.trim()) {
        setFormErrors({ general: 'Salary amount is required.' });
        toast.error('Salary amount is required.');
        return;
      }
      if (Number.isNaN(amt) || amt < 0) {
        setFormErrors({ general: 'Please enter a valid salary amount.' });
        toast.error('Please enter a valid salary amount.');
        return;
      }
      try {
        await ApiService.userSalaries.update(payItemId, {
          salaryType: addForm.salaryType,
          amount: amt,
          effectiveFrom: addForm.salaryEffectiveFrom || new Date().toISOString().slice(0, 10),
        });
        toast.success('Basic salary updated');
        fromPayItemEditRef.current = null;
        setFromPayItemEditMode(false);
        setAddDialogOpen(false);
        setEditingStaffId(null);
        setAddFormStep(1);
        fetchStaff();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update pay item.');
      } finally {
        setAddSaving(false);
      }
      return;
    }
    if (addFormStep < 3) {
      if (addFormStep === 1) {
        form.setValue("firstName", addForm.firstName);
        form.setValue("lastName", addForm.lastName);
        form.setValue("email", addForm.email);
        form.setValue("username", addForm.username);
        form.setValue("password", addForm.password);
        form.setValue("role", addForm.role);
        form.setValue("branchId", addForm.branchId === '' ? undefined : Number(addForm.branchId));
        form.setValue("phone", addForm.mobileNumber);
        form.setValue("isActive", addForm.isActive);
        const valid = await form.trigger();
        if (!valid) {
          const errs = form.formState.errors;
          const msgs: Record<string, string> = {};
          if (errs.firstName) msgs.firstName = errs.firstName.message || '';
          if (errs.email) msgs.email = errs.email.message || '';
          if (errs.username) msgs.username = errs.username.message || '';
          if (errs.password) msgs.password = errs.password.message || '';
          setFormErrors({ ...msgs, general: 'Please fix the form errors.' });
          toast.error('Please fix the form errors.');
          return;
        }
        if (!validateLoginFields()) return;
      }
      if (addFormStep === 2) {
        const amt = addForm.salaryAmount.trim() ? parseFloat(addForm.salaryAmount) : NaN;
        if (!addForm.salaryAmount.trim()) {
          setFormErrors({ general: 'Salary amount is required.' });
          toast.error('Salary amount is required.');
          return;
        }
        if (Number.isNaN(amt) || amt < 0) {
          setFormErrors({ general: 'Please enter a valid salary amount.' });
          toast.error('Please enter a valid salary amount.');
          return;
        }
        if (!addForm.commissionValue.trim()) {
          setFormErrors({ general: 'Commission value is required.' });
          toast.error('Commission value is required.');
          return;
        }
      }
      setFormErrors({});
      setAddFormStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    form.setValue("firstName", addForm.firstName);
    form.setValue("lastName", addForm.lastName);
    form.setValue("email", addForm.email);
    form.setValue("username", addForm.username);
    form.setValue("password", addForm.password);
    form.setValue("role", addForm.role);
    form.setValue("branchId", addForm.branchId === '' ? undefined : Number(addForm.branchId));
    form.setValue("phone", addForm.mobileNumber);
    form.setValue("isActive", addForm.isActive);
    const valid = await form.trigger();
    if (!valid) {
      const errs = form.formState.errors;
      const msgs: Record<string, string> = {};
      if (errs.firstName) msgs.firstName = errs.firstName.message || '';
      if (errs.email) msgs.email = errs.email.message || '';
      if (errs.username) msgs.username = errs.username.message || '';
      if (errs.password) msgs.password = errs.password.message || '';
      setFormErrors({ ...msgs, general: 'Please fix the form errors.' });
      toast.error('Please fix the form errors.');
      return;
    }
    if (!validateLoginFields()) return;
    const salaryAmount = addForm.salaryAmount.trim() ? parseFloat(addForm.salaryAmount) : NaN;
    if (!addForm.salaryAmount.trim()) {
      setFormErrors({ general: 'Salary amount is required.' });
      toast.error('Salary amount is required.');
      return;
    }
    if (Number.isNaN(salaryAmount) || salaryAmount < 0) {
      setFormErrors({ general: 'Please enter a valid salary amount.' });
      toast.error('Please enter a valid salary amount.');
      return;
    }
    setFormErrors({});
    setAddSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...(isEditMode ? {} : { branchId: addForm.branchId === '' ? undefined : Number(addForm.branchId) }),
        prefix: addForm.prefix || undefined,
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim() || undefined,
        email: addForm.email.trim().toLowerCase(),
        isActive: addForm.isActive,

        allowLogin: addForm.allowLogin,
        username: addForm.allowLogin
          ? (addForm.username.trim() ? addForm.username.trim().toLowerCase() : isEditMode ? undefined : addForm.email.trim().toLowerCase())
          : undefined,
        role: addForm.role || undefined,
        dateOfBirth: addForm.dateOfBirth || undefined,
        gender: addForm.gender || undefined,
        maritalStatus: addForm.maritalStatus || undefined,
        bloodGroup: addForm.bloodGroup || undefined,
        mobileNumber: addForm.mobileNumber || undefined,
        alternateContactNumber: addForm.alternateContactNumber || undefined,
        familyContactNumber: addForm.familyContactNumber || undefined,
        facebookLink: addForm.facebookLink || undefined,
        twitterLink: addForm.twitterLink || undefined,
        socialMedia1: addForm.socialMedia1 || undefined,
        socialMedia2: addForm.socialMedia2 || undefined,
        customField: addForm.customField || undefined,
        guardianName: addForm.guardianName || undefined,
        idProofName: addForm.idProofName || undefined,
        idProofNumber: addForm.idProofNumber || undefined,
        permanentAddress: addForm.permanentAddress || undefined,
        currentAddress: addForm.currentAddress || undefined,
        bankAccountHolderName: addForm.bankAccountHolderName || undefined,
        bankAccountNumber: addForm.bankAccountNumber || undefined,
        bankName: addForm.bankName || undefined,
        bankIdentifierCode: addForm.bankIdentifierCode || undefined,
        bankBranch: addForm.bankBranch || undefined,
        taxPayerId: addForm.taxPayerId || undefined,
        commissionType: addForm.commissionType,
        commissionValue: addForm.commissionValue ? parseFloat(addForm.commissionValue) : 0,
        workingDays: JSON.stringify(addForm.workingDays),
        startTime: addForm.startTime,
        endTime: addForm.endTime,
        breakStartTime: addForm.breakStartTime,
        breakEndTime: addForm.breakEndTime,
      };
      if (addForm.allowLogin && addForm.password) body.password = addForm.password;

      const data = isEditMode
        ? await ApiService.staff.update(editingStaffId!, body)
        : await ApiService.staff.create(body);

      const staffIdForSalary = !isEditMode ? data.data?.id : editingStaffId;
      const branchIdForSalary = !isEditMode ? data.data?.branchId : selectedBranchId;
      if (staffIdForSalary != null && !Number.isNaN(salaryAmount) && salaryAmount >= 0) {
        try {
          await ApiService.userSalaries.create({
            staffId: staffIdForSalary,
            salaryType: addForm.salaryType,
            amount: salaryAmount,
            effectiveFrom: addForm.salaryEffectiveFrom || new Date().toISOString().slice(0, 10),
            ...(branchIdForSalary != null ? { branchId: branchIdForSalary } : {}),
          });
        } catch (salErr: any) {
          toast.warning(salErr.response?.data?.message || (isEditMode ? 'Staff updated but salary could not be saved.' : 'Staff added but salary could not be saved. Add it from Payroll → Pay Items.'));
        }
      }
      toast.success(isEditMode ? 'User updated' : 'User added');
      setAddDialogOpen(false);
      setEditingStaffId(null);
      setStaffViewOnlyMode(false);
      setAddFormStep(1);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isEditMode ? 'Failed to update user' : 'Failed to add user'));
    } finally {
      setAddSaving(false);
    }
  };

  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const isAdmin = role === 'Admin' || role === 'ADMIN';
  const canEditDelete = canManage();

  const handleDeleteStaff = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiService.staff.delete(deleteTarget.id);
      toast.success('Staff member removed');
      setDeleteTarget(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete staff');
    } finally {
      setDeleting(false);
    }
  };

  const staffColumns: Column<StaffItem>[] = [
    {
      header: 'Actions',
      align: 'left',
      render: (member) => (
        <EntityActions
          onView={() => openViewStaff(member)}
          onEdit={() => openEditStaff(member)}
          onDelete={() => setDeleteTarget(member)}
        />
      )
    },
    {
      header: 'Staff Member',
      render: (member) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
              {member.firstName?.[0]}{member.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">
              {[member.prefix, member.firstName, member.lastName].filter(Boolean).join(' ')}
            </span>
            <span className="text-xs text-gray-500">{member.role || 'Employee'}</span>
          </div>
        </div>
      )
    },
    { header: 'Email', accessor: 'email', className: 'text-gray-600' },
    { header: 'Branch', render: (member) => member.Branch?.name || '—', className: 'text-gray-600' },
    {
      header: 'Status',
      align: 'center',
      render: (member) => (
        <Badge variant={member.isActive !== false ? 'secondary' : 'outline'} className={member.isActive !== false ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
          {member.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
    ]
  const logColumns: Column<any>[] = [
    {
      header: 'Time & Date',
      render: (log) => (
        <span className="text-xs whitespace-nowrap">
          {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }) : '—'}
        </span>
      )
    },
    {
      header: 'Invoice No',
      render: (log) => (
        <span className="font-semibold text-xs text-primary whitespace-nowrap">
          {log.sale?.referenceNo || `INV-${String(log.saleId).padStart(4, '0')}`}
        </span>
      )
    },
    {
      header: 'Service / Product',
      accessor: 'itemName',
      className: 'text-xs font-medium'
    },
    {
      header: 'Price',
      align: 'right',
      render: (log) => (
        <span className="text-xs">
          Rs. {parseFloat(log.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </span>
      )
    },
    {
      header: 'Commission Rate',
      align: 'center',
      render: (log) => (
        <Badge variant="outline" className="text-xs font-medium">
          {log.commissionRate || '—'}
        </Badge>
      )
    },
    {
      header: 'Commission Earned',
      align: 'right',
      render: (log) => (
        <span className="text-xs font-bold text-green-600 dark:text-green-400">
          Rs. {parseFloat(log.amountEarned || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </span>
      )
    }
  ];

  return (
    <div className="p-3 space-y-3  w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage team members and performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-2"
            onClick={() => navigate('/staff-attachments')}
          >
            <Paperclip className="w-4 h-4" />
            Attachments
          </Button>
          {isAdmin && (
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus className="w-4 h-4" />
              Add Staff
            </Button>
          )}
        </div>
      </div>

      {viewingProfileId ? (
        /* Full-page staff profile view (header + tabs + section with Edit) */
        <>
          <Button
            type="button"
            variant="ghost"
            className="mb-2 -ml-2 gap-2"
            onClick={() => { setViewingProfileId(null); setViewedStaffRecord(null); setStaffViewOnlyMode(false); }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Staff
          </Button>
          {profileLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile header card */}
              <Card className="overflow-hidden bg-gradient-to-br from-secondary to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start gap-4">
                    <Avatar className="w-20 h-20 border-4 border-white dark:border-gray-800 shadow">
                      <AvatarFallback className="bg-purple-100 dark:bg-purple-900/50 text-tertiary dark:text-purple-300 text-2xl">
                        {[addForm.firstName, addForm.lastName].filter(Boolean).map((n) => (n || '').trim()[0]).join('').slice(0, 2).toUpperCase() || addForm.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold">
                          {[addForm.prefix, addForm.firstName, addForm.lastName].filter(Boolean).join(' ') || addForm.email}
                        </h2>
                        <Badge variant="secondary">{addForm.role || 'Employee'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        {addForm.salaryEffectiveFrom && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            Hiring from: {formatDate(addForm.salaryEffectiveFrom)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          Status: {addForm.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {viewedStaffRecord?.branchName && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{viewedStaffRecord.branchName}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs
                value={profileTab}
                onValueChange={(v) => setProfileTab(v as 'personal' | 'job' | 'bank' | 'commissions')}
                className="w-full"
              >
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="job">Job</TabsTrigger>
                  <TabsTrigger value="bank">Bank Details</TabsTrigger>
                  <TabsTrigger value="commissions">History & Commission</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle>Personal Information</CardTitle>
                      {canEditDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStaffId(viewingProfileId!);
                            setStaffViewOnlyMode(false);
                            setAddFormStep(1);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">First Name</p>
                          <p className="text-sm text-foreground">{addForm.firstName || '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                          <p className="text-sm text-foreground">{addForm.lastName || '—'}</p>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-sm text-foreground">{addForm.email || '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                          <p className="text-sm text-foreground">{addForm.mobileNumber || addForm.alternateContactNumber || '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                          <p className="text-sm text-foreground">{addForm.dateOfBirth ? formatDate(addForm.dateOfBirth) : '—'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="job" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle>Job Information</CardTitle>
                      {canEditDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStaffId(viewingProfileId!);
                            setStaffViewOnlyMode(false);
                            setAddFormStep(2);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Branch</p>
                          <p className="text-sm text-foreground">{viewedStaffRecord?.branchName ?? '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Role</p>
                          <p className="text-sm text-foreground">{addForm.role || '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Allow login</p>
                          <p className="text-sm text-foreground">{addForm.allowLogin ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Hiring from</p>
                          <p className="text-sm text-foreground">{addForm.salaryEffectiveFrom ? formatDate(addForm.salaryEffectiveFrom) : '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Basic salary</p>
                          <p className="text-sm text-foreground">
                            {addForm.salaryAmount
                              ? `${(addForm.salaryType || 'monthly').charAt(0).toUpperCase() + (addForm.salaryType || 'monthly').slice(1)} — ${addForm.salaryAmount}${addForm.salaryEffectiveFrom ? ` (from ${formatDate(addForm.salaryEffectiveFrom)})` : ''}`
                              : '—'}
                          </p>
                        </div>
                        <div className="space-y-1.5 border-t pt-2 sm:col-span-2">
                          <p className="text-sm font-bold text-primary">Compensation & Schedule</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Commission</p>
                          <p className="text-sm text-foreground">
                            {addForm.commissionValue ? `${addForm.commissionValue}${addForm.commissionType === 'percentage' ? '%' : ''}` : '—'}
                          </p>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Working Schedule</p>
                          <p className="text-sm text-foreground">
                            {addForm.workingDays?.length > 0 ? addForm.workingDays.join(', ') : 'No days set'}
                            {addForm.startTime && ` (${addForm.startTime} - ${addForm.endTime})`}
                          </p>
                          {addForm.breakStartTime && (
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                              Break Time: {addForm.breakStartTime} - {addForm.breakEndTime}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="bank" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle>Bank Details</CardTitle>
                      {canEditDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStaffId(viewingProfileId!);
                            setStaffViewOnlyMode(false);
                            setAddFormStep(3);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Account holder</p>
                          <p className="text-sm text-foreground">{addForm.bankAccountHolderName || '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Account number</p>
                          <p className="text-sm text-foreground">{addForm.bankAccountNumber || '—'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-muted-foreground">Bank name</p>
                          <p className="text-sm text-foreground">{addForm.bankName || '—'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="commissions" className="mt-4">
                  <div className="space-y-4">
                    {/* Controls Card */}
                    <Card>
                      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                        <CardTitle className="text-base font-semibold">Sales & Services History</CardTitle>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Select
                            value={logsDateFilter}
                            onValueChange={(v: any) => setLogsDateFilter(v)}
                          >
                            <SelectTrigger className="w-[150px] h-9">
                              <SelectValue placeholder="Select Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="yesterday">Yesterday</SelectItem>
                              <SelectItem value="this_week">This Week</SelectItem>
                              <SelectItem value="this_month">This Month</SelectItem>
                              <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                          </Select>

                          {logsDateFilter === 'custom' && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                className="h-9 w-[130px] text-xs"
                                value={logsStartDate}
                                onChange={(e) => setLogsStartDate(e.target.value)}
                              />
                              <span className="text-xs text-muted-foreground text-center">to</span>
                              <Input
                                type="date"
                                className="h-9 w-[130px] text-xs"
                                value={logsEndDate}
                                onChange={(e) => setLogsEndDate(e.target.value)}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-9 text-xs"
                                onClick={fetchStaffLogs}
                              >
                                Go
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="border shadow-sm bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Services/Sales</p>
                            <p className="text-lg font-bold">{logs.length}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border shadow-sm bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Sales Value</p>
                            <p className="text-lg font-bold">
                              Rs. {logs.reduce((sum, item) => sum + parseFloat(item.price || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border shadow-sm bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Commission Earned</p>
                            <p className="text-lg font-bold text-primary">
                              Rs. {logs.reduce((sum, item) => sum + parseFloat(item.amountEarned || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Table of logs */}
                    <DataTable
                      columns={logColumns}
                      data={logs}
                      loading={loadingLogs}
                      emptyMessage="No logs found for this period."
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">On Duty Today</p>
                  <p className="text-2xl font-bold text-gray-900">{staff.filter((s) => s.isActive !== false).length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff List */}
          <DataTable
            title="Team Members"
            icon={Users}
            columns={staffColumns}
            data={staff}
            loading={staffLoading}
            exportable
            exportFileName="staff"
            onRowClick={openViewStaff}
            pagination={{
              total: staffTotal,
              page: staffPage,
              limit: staffLimit,
              onPageChange: setStaffPage,
              onLimitChange: setStaffLimit,
              itemLabel: "staff members"
            }}
            filters={
              <div className="flex items-center gap-2">
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search staff..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setStaffPage(1); }}
                    className="pl-9 border-gray-300 border-2 bg-gray-100 focus-visible:ring-0 focus-visible:border-gray-300 h-9"
                  />
                </div>
                <Select value={String(staffLimit)} onValueChange={(v) => { setStaffLimit(Number(v)); setStaffPage(1); }}>
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
        </>
      )}

      {/* Add / Edit / View Staff — right-side sheet */}
      <Sheet
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            const wasEditing = editingStaffId;
            setAddDialogOpen(false);
            setEditingStaffId(null);
            setStaffViewOnlyMode(false);
            setFormErrors({});
            if (viewingProfileId != null && wasEditing === viewingProfileId) {
              setViewedStaffRecord(null);
              fetch(`${API_BASE}/staff/${viewingProfileId}`, { headers: getAuthHeaders() })
                .then((r) => r.json())
                .then((data) => {
                  if (data.success && data.data) {
                    const d = data.data;
                    setViewedStaffRecord({ createdAt: d.createdAt, branchName: branches.find((b) => b.id === d.branchId)?.name });
                    setAddForm({
                      ...defaultStaffForm,
                      branchId: d.branchId ?? '',
                      prefix: d.prefix ?? '',
                      firstName: d.firstName ?? '',
                      lastName: d.lastName ?? '',
                      email: d.email ?? '',
                      isActive: d.isActive !== false,

                      allowLogin: !!d.allowLogin,
                      username: (d.username || d.email || '') as string,
                      password: '',
                      confirmPassword: '',
                      role: d.role ?? '',
                      dateOfBirth: d.dateOfBirth ?? '',
                      gender: d.gender ?? '',
                      maritalStatus: d.maritalStatus ?? '',
                      bloodGroup: d.bloodGroup ?? '',
                      mobileNumber: d.mobileNumber ?? '',
                      alternateContactNumber: d.alternateContactNumber ?? '',
                      familyContactNumber: d.familyContactNumber ?? '',
                      facebookLink: d.facebookLink ?? '',
                      twitterLink: d.twitterLink ?? '',
                      socialMedia1: d.socialMedia1 ?? '',
                      socialMedia2: d.socialMedia2 ?? '',
                      customField: d.customField ?? '',
                      guardianName: d.guardianName ?? '',
                      idProofName: d.idProofName ?? '',
                      idProofNumber: d.idProofNumber ?? '',
                      permanentAddress: d.permanentAddress ?? '',
                      currentAddress: d.currentAddress ?? '',
                      bankAccountHolderName: d.bankAccountHolderName ?? '',
                      bankAccountNumber: d.bankAccountNumber ?? '',
                      bankName: d.bankName ?? '',
                      bankIdentifierCode: d.bankIdentifierCode ?? '',
                      bankBranch: d.bankBranch ?? '',
                      taxPayerId: d.taxPayerId ?? '',
                      commissionType: d.commissionType ?? 'percentage',
                      commissionValue: d.commissionValue != null ? String(d.commissionValue) : '',
                      workingDays: d.workingDays ? (typeof d.workingDays === 'string' ? (typeof JSON.parse(d.workingDays) === 'string' ? JSON.parse(JSON.parse(d.workingDays)) : JSON.parse(d.workingDays)) : d.workingDays) : [],
                      startTime: d.startTime ?? '09:00 AM',
                      endTime: d.endTime ?? '08:00 PM',
                      breakStartTime: d.breakStartTime ?? '01:00 PM',
                      breakEndTime: d.breakEndTime ?? '02:00 PM',
                      ...(d.userSalary
                        ? {
                          salaryType: d.userSalary.salaryType as 'daily' | 'weekly' | 'monthly',
                          salaryAmount: d.userSalary.amount != null ? String(d.userSalary.amount) : '',
                          salaryEffectiveFrom: d.userSalary.effectiveFrom || new Date().toISOString().slice(0, 10),
                        }
                        : {}),
                    });
                  }
                })
                .catch(() => { });
            } else {
              setViewedStaffRecord(null);
            }
          }
        }}
      >
        <SheetContent
          side="right"
          className={`w-full flex flex-col overflow-hidden p-0 gap-0 ${staffViewOnlyMode ? 'sm:max-w-md' : 'sm:max-w-2xl'}`}
          aria-describedby={undefined}
        >
          <>
            <SheetHeader className="shrink-0 border-b px-6 py-4">
              <SheetTitle>
                {staffViewOnlyMode ? 'Staff Profile' : editingStaffId ? 'Edit User' : 'Add Staff Member'}
              </SheetTitle>
              {/* Stepper: Step X of 5 with icons */}
              {!staffViewOnlyMode && (
                <div className="space-y-4 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Step {addFormStep} of {TOTAL_STEPS}
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <div className={`flex flex-col items-center gap-1 ${addFormStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${addFormStep === 1 ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/40 bg-muted/30'}`}>
                        <User className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-medium text-center leading-tight">Details & Access</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 ${addFormStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${addFormStep === 2 ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/40 bg-muted/30'}`}>
                        <DollarSign className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-medium text-center leading-tight">Financials & Schedule</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 ${addFormStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${addFormStep === 3 ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/40 bg-muted/30'}`}>
                        <Landmark className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-medium text-center leading-tight">Personal & Bank</span>
                    </div>
                  </div>
                </div>
              )}
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {staffViewOnlyMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-purple-100 dark:bg-purple-900/50 text-tertiary dark:text-purple-300 text-xl">
                        {[addForm.firstName, addForm.lastName]
                          .map((n) => (n || '').trim())
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || addForm.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">
                        {[addForm.prefix, addForm.firstName, addForm.lastName].filter(Boolean).join(' ') || addForm.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">Added {formatDate(viewedStaffRecord?.createdAt)}</p>
                      {addForm.role && (
                        <div className="flex items-center gap-1 mt-1">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{addForm.role}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(addForm.mobileNumber || addForm.alternateContactNumber) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{addForm.mobileNumber || addForm.alternateContactNumber}</span>
                      </div>
                    )}
                    {addForm.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{addForm.email}</span>
                      </div>
                    )}
                    {!addForm.mobileNumber && !addForm.alternateContactNumber && !addForm.email && (
                      <p className="text-sm text-muted-foreground">No contact info</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Branch</p>
                        <p className="text-xl font-bold text-primary">{viewedStaffRecord?.branchName ?? '—'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Role</p>
                        <p className="text-xl font-bold text-blue-600">{addForm.role || '—'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-xl font-bold">{addForm.isActive ? 'Active' : 'Inactive'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Added</p>
                        <p className="text-xl font-bold">{formatDate(viewedStaffRecord?.createdAt)}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <SheetFooter className="shrink-0 border-t pt-4 mt-4">
                    <Button type="button" variant="outline" onClick={() => { setAddDialogOpen(false); setStaffViewOnlyMode(false); setViewedStaffRecord(null); }}>
                      Close
                    </Button>
                  </SheetFooter>
                </div>
              ) : (
                <Form {...form}>
                  <form
                    noValidate
                    onSubmit={staffViewOnlyMode ? (e) => e.preventDefault() : handleStaffFormSubmit}
                    className="space-y-6"
                  >
                  <fieldset disabled={staffViewOnlyMode} className="space-y-6 border-0 p-0 m-0 min-w-0">
                    {formErrors.general && (
                      <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 p-2 rounded-md">
                        {formErrors.general}
                      </p>
                    )}

                    {/* Step 1: Add Staff Member (employee info) */}
                    {(addFormStep === 1 || staffViewOnlyMode) && (
                      <>
                        <FormField
                          control={form.control}
                          name="branchId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={formErrors.branch ? 'text-destructive' : ''}>Branch {editingStaffId ? '' : '*'}</FormLabel>
                              <Select
                                value={addForm.branchId === '' ? '' : String(addForm.branchId)}
                                onValueChange={(v) => {
                                  const val = v === '' ? '' : Number(v);
                                  setAddForm((p) => ({ ...p, branchId: val }));
                                  field.onChange(val === '' ? undefined : val);
                                  if (formErrors.branch) setFormErrors((prev) => ({ ...prev, branch: '' }));
                                }}
                                required={!editingStaffId}
                                disabled={!!editingStaffId}
                              >
                                <FormControl>
                                  <SelectTrigger className={formErrors.branch ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select branch" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {branches.map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Prefix</Label>
                            <Select
                              value={addForm.prefix || 'none'}
                              onValueChange={(v) => setAddForm((p) => ({ ...p, prefix: v === 'none' ? '' : v }))}
                            >
                              <SelectTrigger><SelectValue placeholder="Mr / Mrs / Miss" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="Mr">Mr</SelectItem>
                                <SelectItem value="Mrs">Mrs</SelectItem>
                                <SelectItem value="Miss">Miss</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={formErrors.firstName ? 'text-destructive' : ''}>First Name *</FormLabel>
                                <FormControl>
                                  <Input
                                    value={addForm.firstName}
                                    onChange={(e) => {
                                      setAddForm((p) => ({ ...p, firstName: e.target.value }));
                                      field.onChange(e.target.value);
                                      if (formErrors.firstName) setFormErrors((prev) => ({ ...prev, firstName: '' }));
                                    }}
                                    placeholder="First Name"
                                    required
                                    className={formErrors.firstName ? 'border-destructive' : ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input
                                    value={addForm.lastName}
                                    onChange={(e) => {
                                      setAddForm((p) => ({ ...p, lastName: e.target.value }));
                                      field.onChange(e.target.value);
                                    }}
                                    placeholder="Last Name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={formErrors.email ? 'text-destructive' : ''}>Email *</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  value={addForm.email}
                                  onChange={(e) => {
                                    setAddForm((p) => ({ ...p, email: e.target.value }));
                                    field.onChange(e.target.value);
                                    if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                                  }}
                                  placeholder="Email"
                                  required
                                  className={formErrors.email ? 'border-destructive' : ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={addForm.isActive}
                                    onCheckedChange={(v) => {
                                      setAddForm((p) => ({ ...p, isActive: v }));
                                      field.onChange(v);
                                    }}
                                  />
                                  <FormLabel>Is active?</FormLabel>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />
                        <h4 className="font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Roles and Permissions
                        </h4>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={addForm.allowLogin}
                            onCheckedChange={(v) => setAddForm((p) => ({ ...p, allowLogin: v }))}
                          />
                          <Label>Allow login</Label>
                        </div>
                        {addForm.allowLogin && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Login with email or username</Label>
                              <p className="text-sm text-muted-foreground">
                                User can sign in with the email entered above or the username below (if set).
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel className={formErrors.username ? 'text-destructive' : ''}>Username/User email</FormLabel>
                                  <FormControl>
                                    <Input
                                      value={addForm.username}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/\s/g, '');
                                        setAddForm((p) => ({ ...p, username: v }));
                                        field.onChange(v);
                                        if (formErrors.username) setFormErrors((prev) => ({ ...prev, username: '' }));
                                      }}
                                      placeholder="Username/Email"
                                      className={formErrors.username ? 'border-destructive' : ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={formErrors.password ? 'text-destructive' : ''}>Password *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="password"
                                      value={addForm.password}
                                      onChange={(e) => {
                                        setAddForm((p) => ({ ...p, password: e.target.value }));
                                        field.onChange(e.target.value);
                                        if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                                      }}
                                      placeholder={editingStaffId ? 'Leave blank to keep current' : 'Enter your password'}
                                      minLength={5}
                                      className={formErrors.password ? 'border-destructive' : ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="space-y-2 sm:col-span-2">
                              <Label className={`font-bold ${formErrors.confirmPassword ? 'text-destructive' : ''}`}>Confirm Password *</Label>
                              <Input
                                type="password"
                                value={addForm.confirmPassword}
                                onChange={(e) => {
                                  setAddForm((p) => ({ ...p, confirmPassword: e.target.value }));
                                  if (formErrors.confirmPassword) setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                                }}
                                placeholder={editingStaffId ? 'Leave blank to keep current' : 'Enter your password'}
                                className={formErrors.confirmPassword ? 'border-destructive' : ''}
                              />
                              {formErrors.confirmPassword && <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>}
                            </div>
                          </div>
                        )}
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select
                                value={addForm.role || 'none'}
                                onValueChange={(v) => {
                                  const val = v === 'none' ? '' : v;
                                  setAddForm((p) => ({ ...p, role: val }));
                                  field.onChange(val);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">—</SelectItem>
                                  {allRoleNames.map((r) => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Step 2: Basic Salary */}
                    {(addFormStep === 2 || staffViewOnlyMode) && (
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Basic Salary
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Set salary type and amount. This creates a pay item in Payroll → Pay Items for this staff.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Salary type</Label>
                            <Select
                              value={addForm.salaryType}
                              onValueChange={(v) => setAddForm((p) => ({ ...p, salaryType: v as 'daily' | 'weekly' | 'monthly' }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={addForm.salaryAmount}
                              onChange={(e) => setAddForm((p) => ({ ...p, salaryAmount: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Hiring from</Label>
                          <Popover open={salaryEffectiveFromPickerOpen} onOpenChange={setSalaryEffectiveFromPickerOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                              >
                                <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                {addForm.salaryEffectiveFrom ? formatDisplayDate(addForm.salaryEffectiveFrom) : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={addForm.salaryEffectiveFrom ? new Date(addForm.salaryEffectiveFrom + 'T12:00:00') : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const y = date.getFullYear();
                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                    const d = String(date.getDate()).padStart(2, '0');
                                    setAddForm((p) => ({ ...p, salaryEffectiveFrom: `${y}-${m}-${d}` }));
                                    setSalaryEffectiveFromPickerOpen(false);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <Separator className="my-4" />
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Commission Settings
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Commission Type</Label>
                              <Select
                                value={addForm.commissionType}
                                onValueChange={(v) => setAddForm((p) => ({ ...p, commissionType: v as 'percentage' | 'fixed' }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Commission Value *</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={addForm.commissionValue}
                                onChange={(e) => setAddForm((p) => ({ ...p, commissionValue: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Working Schedule
                          </h4>
                          <div className="space-y-3">
                            <Label>Working Days</Label>
                            <div className="flex flex-wrap gap-3">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`day-${day}`}
                                    checked={addForm.workingDays.includes(day)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setAddForm((p) => ({ ...p, workingDays: [...p.workingDays, day] }));
                                      } else {
                                        setAddForm((p) => ({ ...p, workingDays: p.workingDays.filter((d) => d !== day) }));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`day-${day}`} className="text-sm cursor-pointer">{day}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Shift Start Time</Label>
                              <Input
                                type="text"
                                placeholder="e.g. 10:00 AM"
                                value={addForm.startTime}
                                onChange={(e) => setAddForm((p) => ({ ...p, startTime: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Shift End Time</Label>
                              <Input
                                type="text"
                                placeholder="e.g. 08:00 PM"
                                value={addForm.endTime}
                                onChange={(e) => setAddForm((p) => ({ ...p, endTime: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Break Start Time</Label>
                              <Input
                                type="text"
                                placeholder="e.g. 01:00 PM"
                                value={addForm.breakStartTime}
                                onChange={(e) => setAddForm((p) => ({ ...p, breakStartTime: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Break End Time</Label>
                              <Input
                                type="text"
                                placeholder="e.g. 02:00 PM"
                                value={addForm.breakEndTime}
                                onChange={(e) => setAddForm((p) => ({ ...p, breakEndTime: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Personal & Bank Info */}
                    {(addFormStep === 3 || staffViewOnlyMode) && (
                      <>
                        <Separator />
                        <h4 className="font-medium flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Basic Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Date of birth</Label>
                            <Popover open={dateOfBirthPickerOpen} onOpenChange={setDateOfBirthPickerOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start gap-2 font-normal text-left border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                                >
                                  <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                  {addForm.dateOfBirth ? formatDisplayDate(addForm.dateOfBirth) : 'Select date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={addForm.dateOfBirth ? new Date(addForm.dateOfBirth + 'T12:00:00') : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const y = date.getFullYear();
                                      const m = String(date.getMonth() + 1).padStart(2, '0');
                                      const d = String(date.getDate()).padStart(2, '0');
                                      setAddForm((p) => ({ ...p, dateOfBirth: `${y}-${m}-${d}` }));
                                      setDateOfBirthPickerOpen(false);
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label>Gender</Label>
                            <Select
                              value={addForm.gender || 'none'}
                              onValueChange={(v) => setAddForm((p) => ({ ...p, gender: v === 'none' ? '' : v }))}
                            >
                              <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Marital Status</Label>
                            <Input
                              value={addForm.maritalStatus}
                              onChange={(e) => setAddForm((p) => ({ ...p, maritalStatus: e.target.value }))}
                              placeholder="Marital Status"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Blood Group</Label>
                            <Input
                              value={addForm.bloodGroup}
                              onChange={(e) => setAddForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                              placeholder="Blood Group"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Mobile Number</Label>
                            <Input
                              value={addForm.mobileNumber}
                              onChange={(e) => setAddForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                              placeholder="Mobile Number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Alternate contact number</Label>
                            <Input
                              value={addForm.alternateContactNumber}
                              onChange={(e) => setAddForm((p) => ({ ...p, alternateContactNumber: e.target.value }))}
                              placeholder="Alternate contact number"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Family contact number</Label>
                            <Input
                              value={addForm.familyContactNumber}
                              onChange={(e) => setAddForm((p) => ({ ...p, familyContactNumber: e.target.value }))}
                              placeholder="Family contact number"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Facebook Link (optional)</Label>
                            <Input
                              value={addForm.facebookLink}
                              onChange={(e) => setAddForm((p) => ({ ...p, facebookLink: e.target.value }))}
                              placeholder="Facebook Link"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Twitter Link (optional)</Label>
                            <Input
                              value={addForm.twitterLink}
                              onChange={(e) => setAddForm((p) => ({ ...p, twitterLink: e.target.value }))}
                              placeholder="Twitter Link"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Social Media 1 (optional)</Label>
                            <Input
                              value={addForm.socialMedia1}
                              onChange={(e) => setAddForm((p) => ({ ...p, socialMedia1: e.target.value }))}
                              placeholder="Social Media 1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Social Media 2 (optional)</Label>
                            <Input
                              value={addForm.socialMedia2}
                              onChange={(e) => setAddForm((p) => ({ ...p, socialMedia2: e.target.value }))}
                              placeholder="Social Media 2"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Custom field (optional)</Label>
                            <Input
                              value={addForm.customField}
                              onChange={(e) => setAddForm((p) => ({ ...p, customField: e.target.value }))}
                              placeholder="Custom field"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Guardian Name</Label>
                            <Input
                              value={addForm.guardianName}
                              onChange={(e) => setAddForm((p) => ({ ...p, guardianName: e.target.value }))}
                              placeholder="Guardian Name"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>CNIC No.</Label>
                            <Input
                              value={addForm.idProofNumber}
                              onChange={(e) => setAddForm((p) => ({ ...p, idProofNumber: e.target.value }))}
                              placeholder="CNIC No."
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Permanent Address</Label>
                            <Input
                              value={addForm.permanentAddress}
                              onChange={(e) => setAddForm((p) => ({ ...p, permanentAddress: e.target.value }))}
                              placeholder="Permanent Address"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Current Address</Label>
                            <Input
                              value={addForm.currentAddress}
                              onChange={(e) => setAddForm((p) => ({ ...p, currentAddress: e.target.value }))}
                              placeholder="Current Address"
                            />
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <h4 className="font-medium flex items-center gap-2">
                          <Landmark className="w-4 h-4" />
                          Bank Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Account Holder&apos;s Name</Label>
                            <Input
                              value={addForm.bankAccountHolderName}
                              onChange={(e) => setAddForm((p) => ({ ...p, bankAccountHolderName: e.target.value }))}
                              placeholder="Account Holder's Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input
                              value={addForm.bankAccountNumber}
                              onChange={(e) => setAddForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                              placeholder="Account Number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input
                              value={addForm.bankName}
                              onChange={(e) => setAddForm((p) => ({ ...p, bankName: e.target.value }))}
                              placeholder="Bank Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bank Identifier Code (optional)</Label>
                            <Input
                              value={addForm.bankIdentifierCode}
                              onChange={(e) => setAddForm((p) => ({ ...p, bankIdentifierCode: e.target.value }))}
                              placeholder="Bank Identifier Code"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch (optional)</Label>
                            <Input
                              value={addForm.bankBranch}
                              onChange={(e) => setAddForm((p) => ({ ...p, bankBranch: e.target.value }))}
                              placeholder="Branch"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tax Payer ID (optional)</Label>
                            <Input
                              value={addForm.taxPayerId}
                              onChange={(e) => setAddForm((p) => ({ ...p, taxPayerId: e.target.value }))}
                              placeholder="Tax Payer ID"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </fieldset>
                  <SheetFooter className="flex flex-row gap-3 justify-end shrink-0 border-t pt-4 mt-4">
                    <Button type="button" variant="outline" onClick={() => { setAddDialogOpen(false); setEditingStaffId(null); setStaffViewOnlyMode(false); setAddFormStep(1); }} disabled={addSaving}>
                      Cancel
                    </Button>
                    {!staffViewOnlyMode && addFormStep > 1 && (
                      <Button type="button" variant="outline" onClick={() => setAddFormStep((s) => (s - 1) as 1 | 2 | 3)} disabled={addSaving}>
                        Previous
                      </Button>
                    )}
                    {!staffViewOnlyMode && (
                      <Button type="submit" disabled={addSaving} className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                        {addSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {fromPayItemEditMode && addFormStep === 2
                          ? 'Update'
                          : addFormStep < 3
                            ? 'Next'
                            : (editingStaffId ? 'Save' : 'Add User')}
                      </Button>
                    )}
                  </SheetFooter>
                </form>
                </Form>
              )}
            </div>
          </>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget ? [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ') || deleteTarget.email : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDeleteStaff} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}