import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Building,
  Bell,
  CreditCard,
  Users,
  Shield,
  Database,
  UserCircle,
  Loader2,
  Pencil,
  Trash2,
  DollarSign,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, SettingsFormValues } from '../../utils/validation';
import { API_BASE } from '../../../api/ApiService';



export type RoleFromApi = { id: number; name: string; permissions: string[] };

type ActionCol = 'view' | 'create' | 'edit' | 'delete' | 'other';
type PermissionRow = { id: string; label: string; action: ActionCol };

/** One table per module; columns: View | Create | Edit | Delete | Other */
const MODULE_PERMISSION_TABLES: { moduleTitle: string; permissions: PermissionRow[] }[] = [
  {
    moduleTitle: 'POS / Services',
    permissions: [
      { id: 'pos_view', label: 'Access POS Screen', action: 'view' },
      { id: 'pos_view_services', label: 'View all services', action: 'view' },
      { id: 'pos_create_service', label: 'Create service', action: 'create' },
      { id: 'pos_edit_services', label: 'Edit services', action: 'edit' },
      { id: 'pos_delete_services', label: 'Delete services', action: 'delete' },
      { id: 'pos_apply_discount', label: 'Apply discount', action: 'other' },
      { id: 'pos_print_invoice', label: 'Print invoice', action: 'other' },
      { id: 'pos_own_sales', label: 'Access only own sales', action: 'other' },
      { id: 'pos_all_branch_sales', label: 'Access all branch sales', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Appointments',
    permissions: [
      { id: 'appt_view_all', label: 'View all appointments', action: 'view' },
      { id: 'appt_view_own', label: 'View own appointments', action: 'view' },
      { id: 'appt_create', label: 'Create appointment', action: 'create' },
      { id: 'appt_edit', label: 'Edit appointment', action: 'edit' },
      { id: 'appt_cancel', label: 'Cancel appointment', action: 'delete' },
      { id: 'appt_delete', label: 'Delete appointment', action: 'delete' },
      { id: 'appt_assign_worker', label: 'Assign worker', action: 'other' },
      { id: 'appt_change_status', label: 'Change appointment status', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Suppliers',
    permissions: [
      { id: 'supplier_view', label: 'View suppliers', action: 'view' },
      { id: 'supplier_add', label: 'Add supplier', action: 'create' },
      { id: 'supplier_edit', label: 'Edit supplier', action: 'edit' },
      { id: 'supplier_delete', label: 'Delete supplier', action: 'delete' },
      { id: 'supplier_export', label: 'Export supplier data', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Customers',
    permissions: [
      { id: 'client_view_all', label: 'View all customers', action: 'view' },
      { id: 'client_view_own', label: 'View own customers', action: 'view' },
      { id: 'client_view_inactive', label: 'View inactive customers', action: 'view' },
      { id: 'client_add', label: 'Add customer', action: 'create' },
      { id: 'client_edit', label: 'Edit customer', action: 'edit' },
      { id: 'client_delete', label: 'Delete customer', action: 'delete' },
      { id: 'client_export', label: 'Export customer data', action: 'other' },
      { id: 'client_history', label: 'Access customer history', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Sales',
    permissions: [
      { id: 'sale_view_all', label: 'View all sales', action: 'view' },
      { id: 'sale_view_own', label: 'View own sales only', action: 'view' },
      { id: 'sale_create', label: 'Create / record sale', action: 'create' },
      { id: 'sale_edit', label: 'Edit sale', action: 'edit' },
      { id: 'sale_void', label: 'Void / delete sale', action: 'delete' },
      { id: 'sale_export', label: 'Export sales data', action: 'other' },
      { id: 'sale_refund', label: 'Process refunds', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Purchases',
    permissions: [
      { id: 'purchase_view', label: 'View purchases', action: 'view' },
      { id: 'purchase_create', label: 'Add purchase', action: 'create' },
      { id: 'purchase_return_view', label: 'View purchase returns', action: 'view' },
    ],
  },
  {
    moduleTitle: 'Payroll',
    permissions: [
      { id: 'payroll_view', label: 'View payroll', action: 'view' },
      { id: 'payroll_create', label: 'Create payroll run', action: 'create' },
      { id: 'payroll_edit', label: 'Edit payroll', action: 'edit' },
      { id: 'payroll_delete', label: 'Delete payroll', action: 'delete' },
      { id: 'payroll_export', label: 'Export payroll data', action: 'other' },
      { id: 'payroll_approve', label: 'Approve payroll', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Expense',
    permissions: [
      { id: 'expense_view', label: 'View expenses', action: 'view' },
      { id: 'expense_add', label: 'Add expense', action: 'create' },
      { id: 'expense_edit', label: 'Edit expense', action: 'edit' },
      { id: 'expense_delete', label: 'Delete expense', action: 'delete' },
      { id: 'expense_categories', label: 'Manage expense categories', action: 'other' },
      { id: 'expense_export', label: 'Export expense data', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Worker (Staff)',
    permissions: [
      { id: 'worker_view', label: 'View workers', action: 'view' },
      { id: 'worker_add', label: 'Add worker', action: 'create' },
      { id: 'worker_edit', label: 'Edit worker', action: 'edit' },
      { id: 'worker_delete', label: 'Delete worker', action: 'delete' },
      { id: 'worker_assign_role', label: 'Assign role', action: 'other' },
      { id: 'worker_set_commission', label: 'Set commission', action: 'other' },
      { id: 'worker_performance', label: 'View worker performance', action: 'other' },
      { id: 'worker_own_profile', label: 'Access own profile only', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Inventory (Products)',
    permissions: [
      { id: 'product_view', label: 'View products', action: 'view' },
      { id: 'product_create', label: 'Add product', action: 'create' },
      { id: 'inv_edit', label: 'Edit product', action: 'edit' },
      { id: 'inv_delete', label: 'Delete product', action: 'delete' },
      { id: 'inv_view_purchase_price', label: 'View purchase price', action: 'view' },
      { id: 'inv_add_stock', label: 'Add stock', action: 'other' },
      { id: 'inv_adjust_stock', label: 'Adjust stock', action: 'other' },
      { id: 'inv_stock_report', label: 'View stock report', action: 'other' },
      { id: 'category_view', label: 'Manage categories', action: 'other' },
      { id: 'variation_view', label: 'Manage variations', action: 'other' },
      { id: 'unit_view', label: 'Manage units', action: 'other' },
      { id: 'brand_view', label: 'Manage brands', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Finance',
    permissions: [
      { id: 'finance_view_all', label: 'View all transactions', action: 'view' },
      { id: 'finance_view_own', label: 'View own transactions', action: 'view' },
      { id: 'finance_add_expense', label: 'Add expense', action: 'create' },
      { id: 'finance_edit_expense', label: 'Edit expense', action: 'edit' },
      { id: 'finance_delete_expense', label: 'Delete expense', action: 'delete' },
      { id: 'finance_accounts', label: 'Access accounts', action: 'other' },
      { id: 'finance_close_register', label: 'Close cash register', action: 'other' },
      { id: 'finance_profit_loss', label: 'View profit/loss', action: 'other' },
      { id: 'finance_manage_payments', label: 'Manage payments', action: 'other' },
    ],
  },
  {
    moduleTitle: 'Reports',
    permissions: [
      { id: 'report_sales', label: 'View sales report', action: 'view' },
      { id: 'report_inventory', label: 'View inventory report', action: 'view' },
      { id: 'report_financial', label: 'View financial report', action: 'view' },
      { id: 'report_worker', label: 'View worker performance report', action: 'view' },
      { id: 'report_appointment', label: 'View appointment report', action: 'view' },
      { id: 'report_export', label: 'Export reports (CSV / Excel / PDF)', action: 'other' },
    ],
  },
  {
    moduleTitle: 'WhatsApp',
    permissions: [
      { id: 'whatsapp_history', label: 'View message history', action: 'view' },
      { id: 'whatsapp_send', label: 'Send WhatsApp message', action: 'other' },
      { id: 'whatsapp_bulk', label: 'Send bulk messages', action: 'other' },
      { id: 'whatsapp_reminders', label: 'Send automated reminders', action: 'other' },
      { id: 'whatsapp_templates', label: 'Manage WhatsApp templates', action: 'other' },
    ],
  },
];

function getAllPermissionIds(): string[] {
  return MODULE_PERMISSION_TABLES.flatMap((m) => m.permissions.map((p) => p.id));
}

type OrganizationProfile = {
  id: number;
  encryptedId?: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact: string | null;
  address: string | null;
  totalEmployees: number | null;
  industryCategory: string | null;
  timezone: string;
  isSelfServiceEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
];

const INDUSTRY_OPTIONS = [
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
];

type Branch = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
};

type StaffItem = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  role: string | null;
  branchId: number;
  accessLocations?: string | null;
  Branch?: { id: number; name: string };
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function Settings() {
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      timezone: 'UTC',
      isSelfServiceEnabled: true,
    },
  });
  const [emergencyContact, setEmergencyContact] = useState('');
  const [totalEmployees, setTotalEmployees] = useState('');
  const [industryCategory, setIndustryCategory] = useState('');

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`${API_BASE}/organization/profile`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setProfileError('Please sign in with an organization account.');
          setProfile(null);
          return;
        }
        setProfileError(data.message || 'Failed to load profile');
        setProfile(null);
        return;
      }
      const org = data.data as OrganizationProfile;
      setProfile(org);
      settingsForm.reset({
        name: org.name ?? '',
        email: org.email ?? '',
        phone: org.phone ?? '',
        address: org.address ?? '',
        timezone: org.timezone ?? 'UTC',
        isSelfServiceEnabled: org.isSelfServiceEnabled !== false,
      });
      setEmergencyContact(org.emergencyContact ?? '');
      setTotalEmployees(org.totalEmployees != null ? String(org.totalEmployees) : '');
      setIndustryCategory(org.industryCategory ?? '');
    } catch {
      setProfileError('Cannot connect to server.');
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (formData: SettingsFormValues) => {
    setProfileSaving(true);
    try {
      const res = await fetch(`${API_BASE}/organization/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name?.trim(),
          email: formData.email?.trim(),
          phone: formData.phone?.trim(),
          emergencyContact: emergencyContact.trim() || undefined,
          address: formData.address?.trim() || undefined,
          totalEmployees: totalEmployees.trim() ? parseInt(totalEmployees, 10) : undefined,
          industryCategory: industryCategory.trim() || undefined,
          timezone: formData.timezone || 'UTC',
          isSelfServiceEnabled: formData.isSelfServiceEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to update profile');
        return;
      }
      toast.success('Profile updated successfully');
      setProfile(data.data);
      // Update local storage so navbar reflects the change
      try {
        localStorage.setItem('organization', JSON.stringify(data.data));
        window.dispatchEvent(new Event('orgProfileUpdated'));
      } catch {
        // ignore
      }
    } catch {
      toast.error('Request failed');
    } finally {
      setProfileSaving(false);
    }
  };

  const saveBookingStatus = async (checked: boolean) => {
    const formValues = settingsForm.getValues();
    try {
      const res = await fetch(`${API_BASE}/organization/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formValues.name?.trim(),
          email: formValues.email?.trim(),
          phone: formValues.phone?.trim(),
          emergencyContact: emergencyContact.trim() || undefined,
          address: formValues.address?.trim() || undefined,
          totalEmployees: totalEmployees.trim() ? parseInt(totalEmployees, 10) : undefined,
          industryCategory: industryCategory.trim() || undefined,
          timezone: formValues.timezone || 'UTC',
          isSelfServiceEnabled: checked,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to update booking status');
        return;
      }
      toast.success(`Booking portal is now ${checked ? 'Active' : 'Inactive'}`);
      setProfile(data.data);
    } catch {
      toast.error('Request failed');
    }
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchFormMode, setBranchFormMode] = useState<'add' | 'edit'>('add');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchDeleteTarget, setBranchDeleteTarget] = useState<Branch | null>(null);
  const [branchDeleting, setBranchDeleting] = useState(false);

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addUserStep, setAddUserStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [addUserSaving, setAddUserSaving] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffViewOnlyMode, setStaffViewOnlyMode] = useState(false);
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<StaffItem | null>(null);
  const [staffDeleting, setStaffDeleting] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [currencySaving, setCurrencySaving] = useState(false);

  const defaultAddUserForm = {
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
    accessLocations: 'all' as string | string[],
    salesCommissionPercent: '',
    maxSalesDiscountPercent: '',
    allowSelectedContacts: false,
    salaryType: 'monthly' as 'daily' | 'weekly' | 'monthly',
    salaryAmount: '',
    salaryEffectiveFrom: new Date().toISOString().slice(0, 10),
    hiringDate: new Date().toISOString().slice(0, 10),
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
  };
  const [addUserForm, setAddUserForm] = useState(defaultAddUserForm);
  const [addUserFormErrors, setAddUserFormErrors] = useState<Record<string, string>>({});
  const addUserBranchRef = useRef<HTMLDivElement>(null);
  const addUserFirstNameRef = useRef<HTMLDivElement>(null);
  const addUserEmailRef = useRef<HTMLDivElement>(null);
  const addUserUsernameRef = useRef<HTMLDivElement>(null);
  const addUserPasswordRef = useRef<HTMLDivElement>(null);
  const addUserConfirmPasswordRef = useRef<HTMLDivElement>(null);

  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [rolesListView, setRolesListView] = useState(true);
  const [rolesFromApi, setRolesFromApi] = useState<RoleFromApi[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [addRoleName, setAddRoleName] = useState('');
  const [addRolePermissions, setAddRolePermissions] = useState<Record<string, boolean>>({});
  const allRoleNames = rolesFromApi.map((r) => r.name);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordChanging, setPasswordChanging] = useState(false);


  const CURRENCY_OPTIONS = [
    { value: 'PKR', label: 'PKR — Pakistani Rupee (Rs.)', symbol: 'Rs.' },
    { value: 'USD', label: 'USD — US Dollar ($)', symbol: '$' },
    { value: 'AED', label: 'AED — UAE Dirham (د.إ)', symbol: 'د.إ' },
    { value: 'SAR', label: 'SAR — Saudi Riyal (﷼)', symbol: '﷼' },
    { value: 'GBP', label: 'GBP — British Pound (£)', symbol: '£' },
    { value: 'EUR', label: 'EUR — Euro (€)', symbol: '€' },
    { value: 'INR', label: 'INR — Indian Rupee (₹)', symbol: '₹' },
  ];
  const isRolesAdmin =
    typeof window !== 'undefined' &&
    (localStorage.getItem('role') === 'Admin' || localStorage.getItem('role') === 'ADMIN');

  const isStaffSelfOnly =
    typeof window !== 'undefined' &&
    localStorage.getItem('isStaff') === 'true' &&
    ['Manager', 'Cashier'].includes(localStorage.getItem('role') || '');

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const res = await fetch(`${API_BASE}/staff`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setStaffError('Please sign in with an organization account.');
          setStaff([]);
          return;
        }
        setStaffError(data.message || 'Failed to load staff');
        setStaff([]);
        return;
      }
      setStaff(Array.isArray(data.data) ? data.data : []);
    } catch {
      setStaffError('Cannot connect to server.');
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openAddUserDialog = () => {
    setAddUserStep(1);
    setEditingStaffId(null);
    setStaffViewOnlyMode(false);
    setAddUserForm({
      ...defaultAddUserForm,
      salaryEffectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setAddUserFormErrors({});
    setAddUserDialogOpen(true);
  };

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/roles`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) setRolesFromApi(data.data);
      else setRolesFromApi([]);
    } catch {
      setRolesFromApi([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openRolesDialog = () => {
    setRolesListView(true);
    setAddRoleName('');
    setAddRolePermissions({});
    setRolesDialogOpen(true);
    fetchRoles();
  };

  const openAddRoleForm = () => {
    setEditingRoleId(null);
    setAddRoleName('');
    setAddRolePermissions({});
    setRolesListView(false);
  };

  const openEditRoleForm = (role: RoleFromApi) => {
    setEditingRoleId(role.id);
    setAddRoleName(role.name);
    const perms: Record<string, boolean> = {};
    (role.permissions || []).forEach((id) => { perms[id] = true; });
    setAddRolePermissions(perms);
    setRolesListView(false);
  };

  const closeAddRoleForm = () => {
    setEditingRoleId(null);
    setRolesListView(true);
  };

  const toggleAddRolePermission = (id: string, checked: boolean) => {
    setAddRolePermissions((p) => ({ ...p, [id]: checked }));
  };

  const handleSaveNewRole = async () => {
    const name = addRoleName.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    const otherNames = editingRoleId
      ? rolesFromApi.filter((r) => r.id !== editingRoleId).map((r) => r.name)
      : allRoleNames;
    if (otherNames.some((r) => r.toLowerCase() === name.toLowerCase())) {
      toast.error('This role name already exists');
      return;
    }
    const permissions = getAllPermissionIds().filter((id) => addRolePermissions[id]);
    try {
      const isEdit = editingRoleId != null;
      const url = isEdit ? `${API_BASE}/roles/${editingRoleId}` : `${API_BASE}/roles`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, permissions }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || (isEdit ? 'Failed to update role' : 'Failed to add role'));
        return;
      }
      toast.success(isEdit ? `Role "${name}" updated` : `Role "${name}" added`);
      closeAddRoleForm();
      fetchRoles();
    } catch {
      toast.error(editingRoleId != null ? 'Failed to update role' : 'Failed to add role');
    }
  };

  const handleDeleteRole = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/roles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete role');
        return;
      }
      toast.success('Role deleted');
      fetchRoles();
    } catch {
      toast.error('Failed to delete role');
    }
  };
  // In your Settings component, fix this:
  const handleSaveCurrency = () => {
    setCurrencySaving(true);
    setCurrency(selectedCurrency);  // ← Use selectedCurrency, not currency
    setTimeout(() => {
      setCurrencySaving(false);
      toast.success('Currency updated successfully');
    }, 400);

  };

  const handleDeleteStaff = async () => {
    if (!staffDeleteTarget) return;
    setStaffDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/staff/${staffDeleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete user');
        return;
      }
      toast.success('User deleted');
      setStaffDeleteTarget(null);
      fetchStaff();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setStaffDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast.error("Please fill all password fields");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.new.length < 5) {
      toast.error("Password must be at least 5 characters");
      return;
    }

    setPasswordChanging(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update password");
        return;
      }
      toast.success("Password updated successfully");
      setPasswordForm({ current: '', new: '', confirm: '' }); // Form clear ho jayega
    } catch {
      toast.error("Network error");
    } finally {
      setPasswordChanging(false);
    }
  };


  const openViewStaffDialog = (id: number) => {
    setEditingStaffId(id);
    setStaffViewOnlyMode(true);
    setAddUserForm({ ...defaultAddUserForm });
    setAddUserFormErrors({});
    setAddUserStep(1);
    setAddUserDialogOpen(true);
    fetch(`${API_BASE}/staff/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          setAddUserForm({
            ...defaultAddUserForm,
            branchId: d.branchId ?? '',
            prefix: d.prefix ?? '',
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            isActive: d.isActive !== false,

            allowLogin: !!d.allowLogin,
            username: (d.username ?? d.email ?? '') as string,
            password: '',
            confirmPassword: '',
            role: d.role ?? '',
            accessLocations: d.accessLocations ?? 'all',
            salesCommissionPercent: d.salesCommissionPercent != null ? String(d.salesCommissionPercent) : '',
            maxSalesDiscountPercent: d.maxSalesDiscountPercent != null ? String(d.maxSalesDiscountPercent) : '',
            allowSelectedContacts: !!d.allowSelectedContacts,
            hiringDate: d.hiringDate ?? '',
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
                salaryType: (d.userSalary.salaryType || 'monthly') as 'daily' | 'weekly' | 'monthly',
                salaryAmount: d.userSalary.amount != null ? String(d.userSalary.amount) : '',
                salaryEffectiveFrom: d.userSalary.effectiveFrom ?? new Date().toISOString().slice(0, 10),
              }
              : {}),
          });
        }
      })
      .catch(() => toast.error('Failed to load staff details'));
  };

  const openEditStaffDialog = (id: number) => {
    setEditingStaffId(id);
    setStaffViewOnlyMode(false);
    setAddUserForm({ ...defaultAddUserForm });
    setAddUserFormErrors({});
    setAddUserStep(1);
    setAddUserDialogOpen(true);
    fetch(`${API_BASE}/staff/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          setAddUserForm({
            ...defaultAddUserForm,
            branchId: d.branchId ?? '',
            prefix: d.prefix ?? '',
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            isActive: d.isActive !== false,

            allowLogin: !!d.allowLogin,
            username: (d.username ?? d.email ?? '') as string,
            password: '',
            confirmPassword: '',
            role: d.role ?? '',
            accessLocations: d.accessLocations ?? 'all',
            salesCommissionPercent: d.salesCommissionPercent != null ? String(d.salesCommissionPercent) : '',
            maxSalesDiscountPercent: d.maxSalesDiscountPercent != null ? String(d.maxSalesDiscountPercent) : '',
            allowSelectedContacts: !!d.allowSelectedContacts,
            hiringDate: d.hiringDate ?? '',
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
                salaryType: (d.userSalary.salaryType || 'monthly') as 'daily' | 'weekly' | 'monthly',
                salaryAmount: d.userSalary.amount != null ? String(d.userSalary.amount) : '',
                salaryEffectiveFrom: d.userSalary.effectiveFrom ?? new Date().toISOString().slice(0, 10),
              }
              : {}),
          });
        }
      })
      .catch(() => toast.error('Failed to load staff details'));
  };

  const ADD_USER_STEPS = [
    { num: 1, title: 'Add Staff', icon: UserCircle },
    { num: 2, title: 'Basic Salary', icon: DollarSign },
    { num: 3, title: 'Roles & Permissions', icon: Shield },
    { num: 4, title: 'Basic Information', icon: Building },
    { num: 5, title: 'Bank Details', icon: Banknote },
  ] as const;

  const validateAddUserStep = (step: 1 | 2 | 3 | 4 | 5): boolean => {
    const isEdit = editingStaffId != null;
    const err: Record<string, string> = {};
    if (step === 1) {
      if (!isEdit && (addUserForm.branchId === '' || Number.isNaN(Number(addUserForm.branchId)))) {
        err.branch = 'Branch is required';
      }
      if (!addUserForm.firstName.trim()) err.firstName = 'First name is required';
      if (!addUserForm.email.trim()) err.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUserForm.email.trim())) err.email = 'Please enter a valid email address.';
    }
    if (step === 3 && addUserForm.allowLogin) {
      if (addUserForm.username.trim() && addUserForm.username.trim().length < 3) err.username = 'Username must be at least 3 characters';
      if (!isEdit) {
        if (!addUserForm.password?.trim()) err.password = 'Password is required';
        else if (addUserForm.password.length < 5) err.password = 'Password must be at least 5 characters.';
        if (!addUserForm.confirmPassword?.trim()) err.confirmPassword = 'Confirm password is required';
        else if (addUserForm.password !== addUserForm.confirmPassword) err.confirmPassword = 'Passwords do not match.';
      } else if (addUserForm.password?.trim() || addUserForm.confirmPassword?.trim()) {
        if (addUserForm.password && addUserForm.password.length < 5) err.password = 'Password must be at least 5 characters.';
        if (addUserForm.password !== addUserForm.confirmPassword) err.confirmPassword = 'Passwords do not match.';
      }
    }
    setAddUserFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleAddUserNext = () => {
    if (!validateAddUserStep(addUserStep)) return;
    setAddUserStep((s) => (s < 5 ? (s + 1) as 1 | 2 | 3 | 4 | 5 : s));
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = editingStaffId != null;
    const errors: Record<string, string> = {};
    const missing: string[] = [];
    if (!isEdit) {
      const branchId = addUserForm.branchId === '' ? null : Number(addUserForm.branchId);
      if (branchId == null || Number.isNaN(branchId)) {
        missing.push('Branch');
        errors.branch = 'Branch is required';
      }
    }
    if (!addUserForm.firstName.trim()) {
      missing.push('First Name');
      errors.firstName = 'First name is required';
    }
    if (!addUserForm.email.trim()) {
      missing.push('Email');
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUserForm.email.trim())) {
      errors.email = 'Please enter a valid email address.';
      missing.push('Email');
    }
    if (addUserForm.allowLogin && !isEdit) {
      if (addUserForm.username.trim() && addUserForm.username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
        missing.push('Username');
      }
      if (!addUserForm.password?.trim()) {
        missing.push('Password');
        errors.password = 'Password is required';
      } else if (addUserForm.password.length < 5) {
        errors.password = 'Password must be at least 5 characters.';
        missing.push('Password');
      }
      if (!addUserForm.confirmPassword?.trim()) {
        missing.push('Confirm Password');
        errors.confirmPassword = 'Confirm password is required';
      } else if (addUserForm.password !== addUserForm.confirmPassword) {
        errors.confirmPassword = 'Password and Confirm password do not match.';
        missing.push('Confirm Password');
      }
    }
    if (addUserForm.allowLogin && isEdit) {
      if (addUserForm.username.trim() && addUserForm.username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
        missing.push('Username');
      }
      if ((addUserForm.password?.trim() || addUserForm.confirmPassword?.trim())) {
        if (addUserForm.password && addUserForm.password.length < 5) {
          errors.password = 'Password must be at least 5 characters.';
          missing.push('Password');
        }
        if (addUserForm.password !== addUserForm.confirmPassword) {
          errors.confirmPassword = 'Password and Confirm password do not match.';
          missing.push('Confirm Password');
        }
      }
    }
    if (missing.length > 0) {
      errors.general = 'Please fill the form completely.';
      setAddUserFormErrors(errors);
      toast.error('Please fill the form completely. Required: ' + missing.join(', '));
      const scrollOrder = ['branch', 'firstName', 'email', 'username', 'password', 'confirmPassword'] as const;
      const firstKey = scrollOrder.find((k) => errors[k]);
      if (firstKey) {
        const refMap = {
          branch: addUserBranchRef,
          firstName: addUserFirstNameRef,
          email: addUserEmailRef,
          username: addUserUsernameRef,
          password: addUserPasswordRef,
          confirmPassword: addUserConfirmPasswordRef,
        };
        setTimeout(() => {
          refMap[firstKey].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return;
    }
    setAddUserFormErrors({});
    setAddUserSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...(isEdit ? {} : { branchId: addUserForm.branchId === '' ? undefined : Number(addUserForm.branchId) }),
        prefix: addUserForm.prefix || undefined,
        firstName: addUserForm.firstName.trim(),
        lastName: addUserForm.lastName.trim() || undefined,
        email: addUserForm.email.trim().toLowerCase(),
        isActive: addUserForm.isActive,

        allowLogin: addUserForm.allowLogin,
        username: addUserForm.allowLogin
          ? (addUserForm.username.trim()
            ? addUserForm.username.trim().toLowerCase()
            : isEdit
              ? undefined
              : addUserForm.email.trim().toLowerCase())
          : undefined,
        role: addUserForm.role || undefined,
        accessLocations: addUserForm.accessLocations,
        salesCommissionPercent: addUserForm.salesCommissionPercent || undefined,
        maxSalesDiscountPercent: addUserForm.maxSalesDiscountPercent || undefined,
        allowSelectedContacts: addUserForm.allowSelectedContacts,
        hiringDate: addUserForm.hiringDate || undefined,
        dateOfBirth: addUserForm.dateOfBirth || undefined,
        gender: addUserForm.gender || undefined,
        maritalStatus: addUserForm.maritalStatus || undefined,
        bloodGroup: addUserForm.bloodGroup || undefined,
        mobileNumber: addUserForm.mobileNumber || undefined,
        alternateContactNumber: addUserForm.alternateContactNumber || undefined,
        familyContactNumber: addUserForm.familyContactNumber || undefined,
        facebookLink: addUserForm.facebookLink || undefined,
        twitterLink: addUserForm.twitterLink || undefined,
        socialMedia1: addUserForm.socialMedia1 || undefined,
        socialMedia2: addUserForm.socialMedia2 || undefined,
        customField: addUserForm.customField || undefined,
        guardianName: addUserForm.guardianName || undefined,
        idProofName: addUserForm.idProofName || undefined,
        idProofNumber: addUserForm.idProofNumber || undefined,
        permanentAddress: addUserForm.permanentAddress || undefined,
        currentAddress: addUserForm.currentAddress || undefined,
        bankAccountHolderName: addUserForm.bankAccountHolderName || undefined,
        bankAccountNumber: addUserForm.bankAccountNumber || undefined,
        bankName: addUserForm.bankName || undefined,
        bankIdentifierCode: addUserForm.bankIdentifierCode || undefined,
        bankBranch: addUserForm.bankBranch || undefined,
        taxPayerId: addUserForm.taxPayerId || undefined,
      };
      if (addUserForm.allowLogin && addUserForm.password) {
        body.password = addUserForm.password;
      }
      const url = isEdit ? `${API_BASE}/staff/${editingStaffId}` : `${API_BASE}/staff`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || (isEdit ? 'Failed to update staff member' : 'Failed to add staff member'));
        return;
      }
      const createdStaffId = !isEdit && data.data?.id != null ? Number(data.data.id) : null;
      const branchIdForSalary = addUserForm.branchId === '' ? null : Number(addUserForm.branchId);
      if (!isEdit && createdStaffId != null && addUserForm.salaryAmount.trim()) {
        const salaryAmount = parseFloat(addUserForm.salaryAmount);
        if (!Number.isNaN(salaryAmount) && salaryAmount >= 0) {
          try {
            const salaryRes = await fetch(`${API_BASE}/user-salaries`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                staffId: createdStaffId,
                salaryType: addUserForm.salaryType,
                amount: salaryAmount,
                effectiveFrom: addUserForm.salaryEffectiveFrom || new Date().toISOString().slice(0, 10),
                ...(branchIdForSalary != null ? { branchId: branchIdForSalary } : {}),
              }),
            });
            const salaryData = await salaryRes.json();
            if (!salaryRes.ok) {
              toast.warning(salaryData.message || 'Staff added but basic salary could not be saved. Add it from Payroll → Pay Items.');
            }
          } catch {
            toast.warning('Staff added but basic salary could not be saved. Add it from Payroll → Pay Items.');
          }
        }
      }
      toast.success(isEdit ? 'Staff member updated' : 'Staff member added');
      setAddUserDialogOpen(false);
      setEditingStaffId(null);
      fetchStaff();
    } catch {
      toast.error('Failed to add staff member');
    } finally {
      setAddUserSaving(false);
    }
  };

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setBranchesError('Please sign in with an organization account.');
          setBranches([]);
          return;
        }
        setBranchesError(data.message || 'Failed to load branches');
        setBranches([]);
        return;
      }
      setBranches(data.data ?? []);
    } catch {
      setBranchesError('Cannot connect to server.');
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const openAddBranch = () => {
    setBranchFormMode('add');
    setEditingBranch(null);
    setBranchForm({ name: '', address: '', phone: '' });
    setBranchDialogOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setBranchFormMode('edit');
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
    });
    setBranchDialogOpen(true);
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    setBranchSaving(true);
    try {
      if (branchFormMode === 'add') {
        const res = await fetch(`${API_BASE}/branches`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: branchForm.name.trim(),
            address: branchForm.address.trim() || undefined,
            phone: branchForm.phone.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message || 'Failed to add branch');
          return;
        }
        toast.success('Branch added');
        setBranchDialogOpen(false);
        fetchBranches();
      } else if (editingBranch) {
        const res = await fetch(`${API_BASE}/branches/${editingBranch.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: branchForm.name.trim(),
            address: branchForm.address.trim() || undefined,
            phone: branchForm.phone.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message || 'Failed to update branch');
          return;
        }
        toast.success('Branch updated');
        setBranchDialogOpen(false);
        fetchBranches();
      }
    } catch {
      toast.error('Request failed');
    } finally {
      setBranchSaving(false);
    }
  };

  const handleBranchDelete = async () => {
    if (!branchDeleteTarget) return;
    setBranchDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/branches/${branchDeleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete branch');
        return;
      }
      toast.success('Branch deleted');
      setBranchDeleteTarget(null);
      fetchBranches();
    } catch {
      toast.error('Request failed');
    } finally {
      setBranchDeleting(false);
    }
  };

  return (
    <div className="p-3 md:p-3 lg:p-3 space-y-2">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your salon settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branch">Branch</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="templates">Invoice & Receipt</TabsTrigger>
          <TabsTrigger value="online-booking">Booking Page</TabsTrigger>
        </TabsList>

        {/* Profile Settings - Organization profile from API */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                <CardTitle>Organization Profile</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Your organization details. Edit and save to update.
              </p>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : profileError ? (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{profileError}</p>
              ) : (
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit(handleSaveProfile)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Acme Salon" required {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@yourcompany.com" required {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="+92 300 1234567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Emergency Contact</Label>
                        <Input
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <FormField
                        control={settingsForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Office #, Street, City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Total Employees</Label>
                        <Input
                          type="number"
                          min={0}
                          value={totalEmployees}
                          onChange={(e) => setTotalEmployees(e.target.value)}
                          placeholder="e.g. 25"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry Category</Label>
                        <Select
                          value={industryCategory || undefined}
                          onValueChange={(v) => setIndustryCategory(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormField
                        control={settingsForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIMEZONE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={profileSaving}>
                        {profileSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Save Profile
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branch Settings */}
        <TabsContent value="branch" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                <CardTitle>Branch Management</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Add and manage your organization branches.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {branchesError && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{branchesError}</p>
              )}
              {branchesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {branches.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No branches yet. Add your first branch.</p>
                    ) : (
                      branches.map((branch) => (
                        <Card key={branch.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{branch.name}</p>
                                {(branch.address || branch.phone) && (
                                  <p className="text-sm text-gray-500">
                                    {branch.address && branch.phone
                                      ? `${branch.address} • ${branch.phone}`
                                      : branch.address || branch.phone}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditBranch(branch)}>
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setBranchDeleteTarget(branch)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                  <Button variant="outline" className="w-full" onClick={openAddBranch}>
                    Add New Branch
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branch Add/Edit Dialog */}
        <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
          <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{branchFormMode === 'add' ? 'Add Branch' : 'Edit Branch'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Main Branch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={branchForm.address}
                  onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street, City"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBranchDialogOpen(false)} disabled={branchSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={branchSaving}>
                  {branchSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {branchFormMode === 'add' ? 'Add Branch' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Branch Delete Confirmation */}
        <AlertDialog open={!!branchDeleteTarget} onOpenChange={(open) => !open && setBranchDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete branch?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {branchDeleteTarget?.name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={branchDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleBranchDelete();
                }}
                disabled={branchDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {branchDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive email updates about your business
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">WhatsApp Alerts</p>
                    <p className="text-sm text-gray-500">
                      Get WhatsApp notifications for important events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-gray-500">
                      Alert when inventory falls below minimum level
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Reports</p>
                    <p className="text-sm text-gray-500">
                      Receive daily business summary reports
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Appointment Reminders</p>
                    <p className="text-sm text-gray-500">
                      Send automatic reminders to clients
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <CardTitle>Payment Methods</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Accept Cash</p>
                    <p className="text-sm text-gray-500">Enable cash payments</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Accept Card Payments</p>
                    <p className="text-sm text-gray-500">
                      Credit/Debit card payments
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bank Transfer / UPI</p>
                    <p className="text-sm text-gray-500">
                      Enable online banking options
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              {/* Currency Section */}
              <div className="space-y-3 pb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-base">Currency Settings</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Select the default currency used across POS, invoices, and reports.
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger className="w-full sm:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary w-8">{opt.symbol}</span>
                            <span>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleSaveCurrency}
                    disabled={currencySaving}
                    size="sm"
                    className="h-10"
                  >
                    {currencySaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {currencySaving ? 'Saving...' : 'Save Currency'}
                  </Button>
                </div>

                {/* Live Preview */}
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3 w-fit">
                  <span className="text-sm text-muted-foreground">Preview:</span>
                  <span className="font-bold text-primary text-base">
                    {CURRENCY_OPTIONS.find(o => o.value === selectedCurrency)?.symbol}1,500.00
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedCurrency})
                  </span>
                </div>
              </div>

              <Separator className="my-2" />
              <Separator className="my-4" />
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input type="number" defaultValue="10" />
                <p className="text-xs text-gray-500">
                  Default tax rate applied to all services
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <CardTitle>User Management</CardTitle>
                </div>
                {!isStaffSelfOnly && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={openAddUserDialog}>Add Staff Member</Button>
                    <Button variant="outline" onClick={openRolesDialog}>Add Roles</Button>
                    <Button variant="outline">Sales of Commission Agent</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isStaffSelfOnly && (
                <p className="text-sm text-muted-foreground mb-4">You can only view your own details.</p>
              )}
              {staffError && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4">{staffError}</p>
              )}
              {staffLoading ? (
                <p className="text-sm text-gray-500 py-4 text-center">Loading staff…</p>
              ) : (
                <div className="space-y-3">
                  {staff.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No users yet. Add your first user.</p>
                  ) : (
                    staff.map((s) => {
                      const accessLabel = s.accessLocations === 'all' || !s.accessLocations
                        ? 'All Locations'
                        : (() => {
                          const bid = typeof s.accessLocations === 'string' ? parseInt(s.accessLocations, 10) : NaN;
                          if (!Number.isNaN(bid)) {
                            const b = branches.find((br) => br.id === bid);
                            return b ? b.name : s.accessLocations;
                          }
                          return s.accessLocations;
                        })();
                      return (
                        <Card key={s.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.email}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {s.role || 'Staff'} • {s.email}
                                  {accessLabel ? ` • ${accessLabel}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isStaffSelfOnly ? (
                                  <Button variant="outline" size="sm" onClick={() => openViewStaffDialog(s.id)}>
                                    View
                                  </Button>
                                ) : (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openEditStaffDialog(s.id)}>
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => setStaffDeleteTarget(s)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add User Dialog */}
        <Dialog open={addUserDialogOpen} onOpenChange={(open) => { setAddUserDialogOpen(open); if (!open) { setEditingStaffId(null); setStaffViewOnlyMode(false); setAddUserFormErrors({}); setAddUserStep(1); } }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{staffViewOnlyMode ? 'View Staff Member' : editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Step {addUserStep} of 5</p>
            <div className="flex flex-wrap gap-2">
              {ADD_USER_STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = addUserStep === s.num;
                const isDone = addUserStep > s.num;
                return (
                  <div
                    key={s.num}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{s.title}</span>
                  </div>
                );
              })}
            </div>
            <form
              noValidate
              onSubmit={staffViewOnlyMode ? (e) => e.preventDefault() : (e) => { e.preventDefault(); if (addUserStep === 5) handleAddUserSubmit(e); else handleAddUserNext(); }}
              className="space-y-6"
            >
              <fieldset disabled={staffViewOnlyMode} className="space-y-6 border-0 p-0 m-0 min-w-0">
                {addUserFormErrors.general && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 p-2 rounded-md">
                    {addUserFormErrors.general}
                  </p>
                )}

                {addUserStep === 1 && (
                  <>
                    {/* Branch */}
                    <div ref={addUserBranchRef} className="space-y-2">
                      <Label className={addUserFormErrors.branch ? 'text-destructive' : ''}>Branch {editingStaffId ? '' : '*'}</Label>
                      <Select
                        value={addUserForm.branchId === '' ? '' : String(addUserForm.branchId)}
                        onValueChange={(v) => {
                          const branchId = v === '' ? '' : Number(v);
                          setAddUserForm((p) => ({
                            ...p,
                            branchId,
                            ...(!editingStaffId && branchId !== '' ? { accessLocations: String(branchId) } : {}),
                          }));
                          if (addUserFormErrors.branch) setAddUserFormErrors((prev) => ({ ...prev, branch: '' }));
                        }}
                        required={!editingStaffId}
                        disabled={!!editingStaffId}
                      >
                        <SelectTrigger className={addUserFormErrors.branch ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addUserFormErrors.branch && (
                        <p className="text-sm text-destructive">{addUserFormErrors.branch}</p>
                      )}
                    </div>
                    {/* Prefix, Name, Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Prefix</Label>
                        <Select
                          value={addUserForm.prefix || 'none'}
                          onValueChange={(v) => setAddUserForm((p) => ({ ...p, prefix: v === 'none' ? '' : v }))}
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
                      <div ref={addUserFirstNameRef} className="space-y-2">
                        <Label className={addUserFormErrors.firstName ? 'text-destructive' : ''}>First Name *</Label>
                        <Input
                          value={addUserForm.firstName}
                          onChange={(e) => {
                            setAddUserForm((p) => ({ ...p, firstName: e.target.value }));
                            if (addUserFormErrors.firstName) setAddUserFormErrors((prev) => ({ ...prev, firstName: '' }));
                          }}
                          placeholder="First Name"
                          required
                          className={addUserFormErrors.firstName ? 'border-destructive' : ''}
                        />
                        {addUserFormErrors.firstName && (
                          <p className="text-sm text-destructive">{addUserFormErrors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input
                          value={addUserForm.lastName}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, lastName: e.target.value }))}
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                    <div ref={addUserEmailRef} className="space-y-2">
                      <Label className={addUserFormErrors.email ? 'text-destructive' : ''}>Email *</Label>
                      <Input
                        type="email"
                        value={addUserForm.email}
                        onChange={(e) => {
                          setAddUserForm((p) => ({ ...p, email: e.target.value }));
                          if (addUserFormErrors.email) setAddUserFormErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder="Email"
                        required
                        className={addUserFormErrors.email ? 'border-destructive' : ''}
                      />
                      {addUserFormErrors.email && (
                        <p className="text-sm text-destructive">{addUserFormErrors.email}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={addUserForm.isActive}
                          onCheckedChange={(v) => setAddUserForm((p) => ({ ...p, isActive: v }))}
                        />
                        <Label>Is active?</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hiring date</Label>
                      <Input
                        type="date"
                        value={addUserForm.hiringDate}
                        onChange={(e) => setAddUserForm((p) => ({ ...p, hiringDate: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {addUserStep === 2 && (
                  <>
                    <Separator />
                    <h4 className="font-medium">Basic Salary</h4>
                    <p className="text-sm text-muted-foreground">Set salary type and amount. You can also add this later from Payroll → Pay Items.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Salary type</Label>
                        <Select
                          value={addUserForm.salaryType}
                          onValueChange={(v) => setAddUserForm((p) => ({ ...p, salaryType: v as 'daily' | 'weekly' | 'monthly' }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Salary amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={addUserForm.salaryAmount}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, salaryAmount: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Effective from</Label>
                        <Input
                          type="date"
                          value={addUserForm.salaryEffectiveFrom}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, salaryEffectiveFrom: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}

                {addUserStep === 3 && (
                  <>
                    <Separator />
                    <h4 className="font-medium">Roles and Permissions</h4>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={addUserForm.allowLogin}
                        onCheckedChange={(v) => setAddUserForm((p) => ({ ...p, allowLogin: v }))}
                      />
                      <Label>Allow login</Label>
                    </div>
                    {addUserForm.allowLogin && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Login with email or username</Label>
                          <p className="text-sm text-muted-foreground">
                            User can sign in with the email entered above or the username below (if set).
                          </p>
                        </div>
                        <div ref={addUserUsernameRef} className="space-y-2 sm:col-span-2">
                          <Label className={addUserFormErrors.username ? 'text-destructive' : ''}>Username/User email</Label>
                          <Input
                            value={addUserForm.username}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\s/g, '');
                              setAddUserForm((p) => ({ ...p, username: v }));
                              if (addUserFormErrors.username) setAddUserFormErrors((prev) => ({ ...prev, username: '' }));
                            }}
                            placeholder="Username/Email"
                            className={addUserFormErrors.username ? 'border-destructive' : ''}
                          />
                          {addUserFormErrors.username && (
                            <p className="text-sm text-destructive">{addUserFormErrors.username}</p>
                          )}
                        </div>
                        <div ref={addUserPasswordRef} className="space-y-2">
                          <Label className={addUserFormErrors.password ? 'text-destructive' : ''}>Password *</Label>
                          <Input
                            type="password"
                            value={addUserForm.password}
                            onChange={(e) => {
                              setAddUserForm((p) => ({ ...p, password: e.target.value }));
                              if (addUserFormErrors.password) setAddUserFormErrors((prev) => ({ ...prev, password: '' }));
                            }}
                            placeholder={editingStaffId ? 'Leave blank to keep current' : 'Enter your password'}
                            minLength={5}
                            className={addUserFormErrors.password ? 'border-destructive' : ''}
                          />
                          {addUserFormErrors.password && (
                            <p className="text-sm text-destructive">{addUserFormErrors.password}</p>
                          )}
                        </div>
                        <div ref={addUserConfirmPasswordRef} className="space-y-2 sm:col-span-2">
                          <Label className={`font-bold ${addUserFormErrors.confirmPassword ? 'text-destructive' : ''}`}>Confirm Password *</Label>
                          <Input
                            type="password"
                            value={addUserForm.confirmPassword}
                            onChange={(e) => {
                              setAddUserForm((p) => ({ ...p, confirmPassword: e.target.value }));
                              if (addUserFormErrors.confirmPassword) setAddUserFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                            }}
                            placeholder={editingStaffId ? 'Leave blank to keep current' : 'Enter your password'}
                            className={addUserFormErrors.confirmPassword ? 'border-destructive' : ''}
                          />
                          {addUserFormErrors.confirmPassword && (
                            <p className="text-sm text-destructive">{addUserFormErrors.confirmPassword}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={addUserForm.role || 'none'}
                        onValueChange={(v) => setAddUserForm((p) => ({ ...p, role: v === 'none' ? '' : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {allRoleNames.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {addUserStep === 4 && (
                  <>
                    <Separator />
                    <h4 className="font-medium">Basic Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of birth</Label>
                        <Input
                          type="date"
                          value={addUserForm.dateOfBirth}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select
                          value={addUserForm.gender || 'none'}
                          onValueChange={(v) => setAddUserForm((p) => ({ ...p, gender: v === 'none' ? '' : v }))}
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
                          value={addUserForm.maritalStatus}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, maritalStatus: e.target.value }))}
                          placeholder="Marital Status"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group</Label>
                        <Input
                          value={addUserForm.bloodGroup}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                          placeholder="Blood Group"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile Number</Label>
                        <Input
                          value={addUserForm.mobileNumber}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                          placeholder="Mobile Number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alternate contact number</Label>
                        <Input
                          value={addUserForm.alternateContactNumber}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, alternateContactNumber: e.target.value }))}
                          placeholder="Alternate contact number"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Facebook Link (optional)</Label>
                        <Input
                          value={addUserForm.facebookLink}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, facebookLink: e.target.value }))}
                          placeholder="Facebook Link"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Twitter Link (optional)</Label>
                        <Input
                          value={addUserForm.twitterLink}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, twitterLink: e.target.value }))}
                          placeholder="Twitter Link"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Social Media 1 (optional)</Label>
                        <Input
                          value={addUserForm.socialMedia1}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, socialMedia1: e.target.value }))}
                          placeholder="Social Media 1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Social Media 2 (optional)</Label>
                        <Input
                          value={addUserForm.socialMedia2}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, socialMedia2: e.target.value }))}
                          placeholder="Social Media 2"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Custom field (optional)</Label>
                        <Input
                          value={addUserForm.customField}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, customField: e.target.value }))}
                          placeholder="Custom field"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Guardian Name</Label>
                        <Input
                          value={addUserForm.guardianName}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, guardianName: e.target.value }))}
                          placeholder="Guardian Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ID proof number</Label>
                        <Input
                          value={addUserForm.idProofNumber}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, idProofNumber: e.target.value }))}
                          placeholder="ID proof number"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Permanent Address</Label>
                        <Input
                          value={addUserForm.permanentAddress}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, permanentAddress: e.target.value }))}
                          placeholder="Permanent Address"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Current Address</Label>
                        <Input
                          value={addUserForm.currentAddress}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, currentAddress: e.target.value }))}
                          placeholder="Current Address"
                        />
                      </div>
                    </div>
                  </>
                )}

                {addUserStep === 5 && (
                  <>
                    <Separator />
                    <h4 className="font-medium">Bank Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Account Holder&apos;s Name</Label>
                        <Input
                          value={addUserForm.bankAccountHolderName}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, bankAccountHolderName: e.target.value }))}
                          placeholder="Account Holder's Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={addUserForm.bankAccountNumber}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                          placeholder="Account Number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                          value={addUserForm.bankName}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, bankName: e.target.value }))}
                          placeholder="Bank Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Identifier Code</Label>
                        <Input
                          value={addUserForm.bankIdentifierCode}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, bankIdentifierCode: e.target.value }))}
                          placeholder="Bank Identifier Code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={addUserForm.bankBranch}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, bankBranch: e.target.value }))}
                          placeholder="Branch"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax Payer ID</Label>
                        <Input
                          value={addUserForm.taxPayerId}
                          onChange={(e) => setAddUserForm((p) => ({ ...p, taxPayerId: e.target.value }))}
                          placeholder="Tax Payer ID"
                        />
                      </div>
                    </div>
                  </>
                )}

              </fieldset>
              <DialogFooter className="flex flex-row gap-3 justify-end pt-4 border-t">
                {staffViewOnlyMode ? (
                  <Button type="button" variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => setAddUserDialogOpen(false)} disabled={addUserSaving}>
                      Cancel
                    </Button>
                    {addUserStep > 1 && (
                      <Button type="button" variant="outline" onClick={() => setAddUserStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)} disabled={addUserSaving}>
                        Back
                      </Button>
                    )}
                    {addUserStep < 5 ? (
                      <Button type="button" onClick={handleAddUserNext} disabled={addUserSaving} className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                        Next
                      </Button>
                    ) : (
                      <Button type="submit" disabled={addUserSaving} className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                        {addUserSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {editingStaffId ? 'Save' : 'Add Staff Member'}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Roles Dialog */}
        <Dialog open={rolesDialogOpen} onOpenChange={(open) => { setRolesDialogOpen(open); if (!open) setRolesListView(true); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{rolesListView ? 'Roles' : editingRoleId != null ? 'Edit Role' : 'Add Role'}</DialogTitle>
            </DialogHeader>
            {rolesListView ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRolesAdmin ? 'Existing roles. Only Admin can add, edit, or delete roles.' : 'Existing roles. You have view-only access.'}
                </p>
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : rolesFromApi.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No roles yet.{isRolesAdmin ? ' Add a role below.' : ''}</p>
                ) : (
                  <ul className="border rounded-md divide-y">
                    {rolesFromApi.map((r) => (
                      <li key={r.id} className="flex items-center justify-between px-3 py-2">
                        <span className="font-medium">{r.name}</span>
                        {isRolesAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditRoleForm(r)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRole(r.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {isRolesAdmin && (
                  <Button type="button" onClick={openAddRoleForm} className="w-full sm:w-auto">
                    Add new role
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Role Name: *</Label>
                  <Input
                    value={addRoleName}
                    onChange={(e) => setAddRoleName(e.target.value)}
                    placeholder="Role Name"
                  />
                </div>
                <div className="space-y-6">
                  <Label className="text-foreground font-medium">Permissions:</Label>
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                    {MODULE_PERMISSION_TABLES.map((module) => (
                      <div key={module.moduleTitle} className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">{module.moduleTitle}</h4>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-primary hover:bg-primary/90 border-none">
                              <TableRow className="hover:bg-primary/90 border-none">
                                <TableHead className="text-white font-semibold min-w-[200px]">Permission</TableHead>
                                <TableHead className="text-white font-semibold w-[90px] text-center">View</TableHead>
                                <TableHead className="text-white font-semibold w-[90px] text-center">Create</TableHead>
                                <TableHead className="text-white font-semibold w-[90px] text-center">Edit</TableHead>
                                <TableHead className="text-white font-semibold w-[90px] text-center">Delete</TableHead>
                                <TableHead className="text-white font-semibold w-[90px] text-center">Other</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {module.permissions.map((p) => (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">{p.label}</TableCell>
                                  <TableCell className="text-center">
                                    {p.action === 'view' && (
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={!!addRolePermissions[p.id]}
                                          onCheckedChange={(checked) =>
                                            toggleAddRolePermission(p.id, !!checked)
                                          }
                                        />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {p.action === 'create' && (
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={!!addRolePermissions[p.id]}
                                          onCheckedChange={(checked) =>
                                            toggleAddRolePermission(p.id, !!checked)
                                          }
                                        />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {p.action === 'edit' && (
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={!!addRolePermissions[p.id]}
                                          onCheckedChange={(checked) =>
                                            toggleAddRolePermission(p.id, !!checked)
                                          }
                                        />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {p.action === 'delete' && (
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={!!addRolePermissions[p.id]}
                                          onCheckedChange={(checked) =>
                                            toggleAddRolePermission(p.id, !!checked)
                                          }
                                        />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {p.action === 'other' && (
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={!!addRolePermissions[p.id]}
                                          onCheckedChange={(checked) =>
                                            toggleAddRolePermission(p.id, !!checked)
                                          }
                                        />
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeAddRoleForm}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveNewRole}>
                    {editingRoleId != null ? 'Update Role' : 'Save Role'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Staff Delete Confirmation */}
        <AlertDialog open={!!staffDeleteTarget} onOpenChange={(open) => !open && setStaffDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {staffDeleteTarget ? [staffDeleteTarget.firstName, staffDeleteTarget.lastName].filter(Boolean).join(' ') || staffDeleteTarget.email : ''}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={staffDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteStaff();
                }}
                disabled={staffDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {staffDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-gray-500">
                      Auto logout after 30 minutes of inactivity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-medium">Change Password</h3>
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                  />

                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordChanging}
                >
                  {passwordChanging ? "Updating..." : "Update Password"}
                </Button>              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <CardTitle>Data & Backup</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Automatic Backup</p>
                  <p className="text-sm text-gray-500">
                    Daily automatic data backup at 2:00 AM
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline">Export All Data</Button>
                <Button variant="outline">Backup Now</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Online Booking Settings */}
        <TabsContent value="online-booking" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                <CardTitle>Online Self-Service Booking</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Enable or disable your client booking portal and copy the URL.
              </p>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : profileError ? (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{profileError}</p>
              ) : (
                <Form {...settingsForm}>
                  <div className="space-y-6">
                    <FormField
                      control={settingsForm.control}
                      name="isSelfServiceEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Booking Portal Status</FormLabel>
                              <p className="text-sm text-gray-500">
                                When active, customers can book appointments online.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  saveBookingStatus(checked);
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Your Booking Link</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}/self-service?orgId=${profile?.encryptedId || ''}`}
                          className="bg-slate-100 border-slate-300 text-slate-700 font-mono text-sm select-all cursor-pointer"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/self-service?orgId=${profile?.encryptedId || ''}`);
                            toast.success("Booking link copied to clipboard!");
                          }}
                        >
                          Copy Link
                        </Button>
                      </div>
                      <p className="text-xs text-gray-450">
                        Share this URL on social media or generate a QR code for your customers to scan.
                      </p>
                    </div>
                  </div>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}