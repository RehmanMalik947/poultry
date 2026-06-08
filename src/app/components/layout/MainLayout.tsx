import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { COLORS } from '../../constants/colors';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getHiddenModules, HIDDEN_MODULES_KEY } from '../../modules/settings/ModulesManager';
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  Calendar,
  Users,
  Scissors,
  UserCog,
  Package,
  FileText,
  MessageSquare,
  Settings,
  Search,
  Bell,
  Wifi,
  WifiOff,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Check,
  Loader2,
  Wallet,
  Banknote,
  Truck,
  ShoppingCart,
  Download,
  Circle,
  Box,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  BranchContextProvider,
  getAuthHeadersWithBranch,
  type Branch,
} from '../../contexts/BranchContext';
import { API_BASE } from '../../../api/ApiService';
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';


const BRANCH_STORAGE_KEY = 'salon_selected_branch_id';

const isDev =
  typeof import.meta !== 'undefined' &&
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

/** Permission ids that grant access to the menu item (any one). From Settings > Roles. Admin/ADMIN see all. */
const MENU_PATH_PERMISSIONS: Record<string, string[] | null> = {
  '/': ['dashboard_view'],
  '/pos': ['pos_view', 'pos_view_services'],

  '/sales': ['pos_view_services', 'pos_all_branch_sales', 'pos_own_sales', 'sale_view_all', 'sale_view_own'],
  '/sales/add': ['sale_create', 'pos_view_services'],
  '/sales/returns': ['sale_return_view', 'sale_view_all'],
  '/services': ['service_view'],
  '/appointments': ['appt_view_all', 'appt_view_own'],
  '/appointments/add': ['appt_view_all', 'appt_view_own'],
  '/suppliers': ['supplier_view'],
  '/suppliers/add': ['supplier_create'],
  '/customers': ['customer_view_all', 'customer_view_own'],
  '/staff': ['worker_view'],
  '/stock': ['stock_view'],
  '/stock/manage': ['stock_view'],
  '/stock/adjustment': ['stock_view'],
  '/stock/transfer': ['stock_view'],
  '/payroll': ['payroll_view'],
  '/finance': ['finance_view_all', 'finance_view_own'],
  '/reports': ['report_sales', 'report_stock', 'report_financial', 'report_worker', 'report_appointment'],
  '/reports/profit-loss': ['report_financial'],
  '/reports/purchase-sale': ['report_sales'],
  '/reports/purchase-payment': ['report_sales'],
  '/reports/tax': ['report_financial'],
  '/reports/supplier-customer': ['report_sales'],
  '/reports/customer-groups': ['report_sales'],
  '/reports/stock': ['report_stock'],
  '/reports/stock-adjustment': ['report_stock'],
  '/reports/product-purchase': ['report_sales'],
  '/reports/product-sell': ['report_sales'],
  '/whatsapp': ['whatsapp_history'],
  // '/services': ['pos_view_services'],
  '/settings': [],

  '/purchases': ['purchase_view'],
  '/purchases/add': ['purchase_create'],
  '/purchases/return': ['purchase_return_view'],
  '/products/categories': ['category_view'],
  '/products/variations': ['variation_view'],
  '/products/units': ['unit_view'],
  '/products/brands': ['brand_view'],
  '/products/add': ['product_create'],
  '/products': ['product_view'],

  '/expense': ['expense_view', 'finance_view_all', 'finance_view_own'],
  '/expense/add': ['expense_create'],
  '/expense/categories': ['expense_category_view'],

  '/accounts': ['finance_view_all', 'finance_view_own'],
};




function getStoredPermissions(): string[] {
  try {
    const raw = localStorage.getItem("permissions");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasPermission(permissionId: string | null): boolean {
  if (permissionId == null) return true;
  const role = localStorage.getItem('role');
  if (role === 'Admin' || role === 'ADMIN') return true;
  const permissions = getStoredPermissions();
  return permissions.includes(permissionId);
}

function hasAnyPermission(permissionIds: string[] | null): boolean {
  if (permissionIds == null) return true;
  if (permissionIds.length === 0) return false;
  const role = localStorage.getItem('role');
  if (role === 'Admin' || role === 'ADMIN') return true;
  const permissions = getStoredPermissions();
  return permissionIds.some((id) => permissions.includes(id));
}

type SubMenuItem = { path: string; label: string; icon: React.ComponentType<{ className?: string }> };
type MenuItem = { path: string; label: string; icon: React.ComponentType<{ className?: string }>; children?: SubMenuItem[] };
const menuItems: MenuItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pos', label: 'POS', icon: DollarSign },
  {
    path: '/appointments',
    label: 'Appointments',
    icon: Calendar,
    children: [
      { path: '/appointments', label: 'List Appointments', icon: Circle },
      { path: '/appointments/add', label: 'Add Appointment', icon: Circle },
    ],
  },
  { path: '/services', label: 'Services', icon: Scissors },
  {
    path: '/sales',
    label: 'Sales',
    icon: Receipt,
    children: [
      { path: '/sales', label: 'List Sales', icon: Circle },
      { path: '/sales/add', label: 'Add Sale', icon: Circle },
      { path: '/sales/returns', label: 'Sale Returns', icon: Circle },
    ],
  },
  {
    path: '/products',
    label: 'Products',
    icon: Box,
    children: [
      { path: '/products/add', label: 'Add Product', icon: Circle },
      { path: '/products', label: 'List Products', icon: Circle },
      { path: '/products/categories', label: 'Categories', icon: Circle },
      { path: '/products/variations', label: 'Variations', icon: Circle },
      { path: '/products/units', label: 'Units', icon: Circle },
      { path: '/products/brands', label: 'Brands', icon: Circle },
    ],



  },
  {
    path: '/accounts',
    label: 'Bank Accounts',
    icon: Banknote,  // already imported hai
    children: [
      { path: '/accounts', label: 'List Accounts', icon: Circle },
    ],
  },
  {
    path: '/purchases',
    label: 'Purchases',
    icon: Download,
    children: [
      { path: '/purchases', label: 'List Purchases', icon: Circle },
      { path: '/purchases/add', label: 'Add Purchase', icon: Circle },
      { path: '/purchases/return', label: 'List Purchase Return', icon: Circle },
    ],
  },

  {
    path: "/stock/manage",
    label: "Stock",
    icon: Package,
    children: [
      { path: "/stock/manage", label: "Manage Stock", icon: Circle },
      { path: "/stock/adjustment", label: "Stock Adjustment", icon: Circle },
      { path: "/stock/transfer", label: "Stock Transfer", icon: Circle },
    ],
  },

  {
    path: '/suppliers',
    label: 'Suppliers',
    icon: Truck,
    children: [
      { path: "/suppliers/add", label: "Add Supplier", icon: Circle },
      { path: "/suppliers", label: "List Suppliers", icon: Circle }
    ],
  },
  {
    path: '/expense',
    label: 'Expense',
    icon: Wallet,
    children: [
      { path: '/expense', label: 'List Expenses', icon: Circle },
      { path: '/expense/add', label: 'Add Expense', icon: Circle },
      { path: '/expense/categories', label: 'Expense Categories', icon: Circle },
    ],
  },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/staff', label: 'Staff', icon: UserCog },
  { path: '/payroll', label: 'Payroll', icon: Banknote },


  { path: '/finance', label: 'Finance', icon: FileText },
  {
path: '/reports/profit-loss', 
    label: 'Reports',
    icon: FileText,
    children: [
      { path: '/reports/profit-loss', label: 'Profit / Loss Report', icon: Circle },
      { path: '/reports/purchase-sale', label: 'Purchase & Sale', icon: Circle },
      { path: '/reports/tax', label: 'Tax Report', icon: Circle },
      { path: '/reports/supplier-customer', label: 'Supplier & Customer Report', icon: Circle },
      { path: '/reports/product-purchase', label: 'Product Purchase Report', icon: Circle },
      { path: '/reports/purchase-payment', label: 'Purchase Payment Report', icon: Circle },
      { path: '/reports/sell-payment', label: 'Sell Payment Report', icon: Circle },
      { path: '/reports/expense', label: 'Expense Report', icon: Circle },
      { path: '/reports/cash-register', label: 'Register Report', icon: Circle },

      // { path: '/reports/customer-groups', label: 'Customer Groups Report', icon: Circle },
      { path: '/reports/stock', label: 'Stock Report', icon: Circle },
      { path: '/reports/stock-adjustment', label: 'Stock Adjustment Report', icon: Circle },
      { path: '/reports/product-sell', label: 'Product Sell Report', icon: Circle },
      { path: '/reports/activity-log', label: 'Activity Log', icon: Circle }
    ],
  },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [onlineStatusOpen, setOnlineStatusOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<{ id: number; name: string; quantity: number; isCritical: boolean }[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<
    { id: number; name: string; phone: string | null; email: string | null }[]
  >([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const customerSearchAbortRef = useRef<AbortController | null>(null);
  const [permissionRefresh, setPermissionRefresh] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [orgName, setOrgName] = useState<string>('');
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(getHiddenModules);

  // Function to fetch organization profile from API
  const fetchOrganizationProfile = useCallback(async () => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
    if (!hasToken) return;

    try {
      const res = await fetch(`${API_BASE}/organization/profile`, {
        headers: getAuthHeadersWithBranch(null),
      });
      const data = await res.json();
      if (res.ok && data.data && data.data.name) {
        setOrgName(data.data.name);
        // Also store in localStorage for quick access
        localStorage.setItem('organizationName', data.data.name);
        // Also update the organization object in localStorage
        const orgData = { id: data.data.id, name: data.data.name };
        localStorage.setItem('organization', JSON.stringify(orgData));
      } else {
        // Fallback to stored name
        const storedName = localStorage.getItem('organizationName');
        if (storedName) setOrgName(storedName);
        else {
          // Try to get from organization object
          try {
            const orgJson = localStorage.getItem('organization');
            if (orgJson) {
              const org = JSON.parse(orgJson);
              if (org.name) setOrgName(org.name);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch organization profile:", err);
      // Use stored name if available
      const storedName = localStorage.getItem('organizationName');
      if (storedName) setOrgName(storedName);
      else {
        try {
          const orgJson = localStorage.getItem('organization');
          if (orgJson) {
            const org = JSON.parse(orgJson);
            if (org.name) setOrgName(org.name);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Effect to fetch org profile on mount and when branch changes
  useEffect(() => {
    fetchOrganizationProfile();
  }, [fetchOrganizationProfile]);

  // Effect to listen for profile updates from Settings page
  useEffect(() => {
    const handleOrgProfileUpdate = () => {
      fetchOrganizationProfile();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'organizationName' && e.newValue) {
        setOrgName(e.newValue);
      } else if (e.key === 'organization' && e.newValue) {
        try {
          const org = JSON.parse(e.newValue);
          if (org.name) setOrgName(org.name);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('orgProfileUpdated', handleOrgProfileUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('orgProfileUpdated', handleOrgProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchOrganizationProfile]);

  const toggleMenu = (path: string, isParentActive: boolean = false) => {
    setExpandedMenus((prev) => {
      const currentExpanded = prev[path] ?? isParentActive;
      return { ...prev, [path]: !currentExpanded };
    });
  };

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(BRANCH_STORAGE_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    if (isDev) {
      console.log('[MainLayout] fetchBranches: start');
    }
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: getAuthHeadersWithBranch(null),
      });
      const raw = await res.json();
      if (isDev) {
        console.log('[MainLayout] fetchBranches: res.ok=', res.ok, 'response shape=', Array.isArray(raw) ? 'array' : typeof raw?.data !== 'undefined' ? 'object with data' : 'other', raw);
      }
      let list: Branch[] = [];
      if (res.ok) {
        if (Array.isArray(raw)) {
          list = raw as Branch[];
        } else if (raw?.data != null && Array.isArray(raw.data)) {
          list = raw.data as Branch[];
        } else if (raw?.data != null && !Array.isArray(raw.data)) {
          list = [];
        }
      }
      setBranches(list);
      const storedId = (() => {
        try {
          const s = localStorage.getItem(BRANCH_STORAGE_KEY);
          return s ? parseInt(s, 10) : null;
        } catch {
          return null;
        }
      })();
      if (list.length > 0) {
        if (storedId != null && list.some((b) => b.id === storedId)) {
          setSelectedBranchId(storedId);
        } else {
          const firstId = list[0].id;
          setSelectedBranchId(firstId);
          try {
            localStorage.setItem(BRANCH_STORAGE_KEY, String(firstId));
          } catch {
            /* ignore */
          }
        }
      } else {
        setSelectedBranchId(null);
      }
      if (isDev) {
        console.log('[MainLayout] fetchBranches: list.length=', list.length, 'selectedBranchId will be', storedId != null && list.some((b) => b.id === storedId) ? storedId : list[0]?.id ?? null);
      }
    } catch (err) {
      if (isDev) {
        console.warn('[MainLayout] fetchBranches: error', err);
      }
      setBranches([]);
      setSelectedBranchId(null);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchBranches();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranchId != null) {
      localStorage.setItem(BRANCH_STORAGE_KEY, String(selectedBranchId));
    }
  }, [selectedBranchId]);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? branches[0] ?? null;

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const showBranchDropdown = hasToken && !branchesLoading && branches.length > 0;
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const isAdmin = role === 'Admin' || role === 'ADMIN';

  // Re-sync hidden modules when the Modules Manager page saves changes
  useEffect(() => {
    const onChanged = () => setHiddenModules(getHiddenModules());
    const onStorage = (e: StorageEvent) => {
      if (e.key === HIDDEN_MODULES_KEY) setHiddenModules(getHiddenModules());
    };
    window.addEventListener('modulesVisibilityChanged', onChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('modulesVisibilityChanged', onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Map menu path → module key (must match ALL_MODULES keys)
  const MENU_PATH_TO_MODULE_KEY: Record<string, string> = {
    '/': 'dashboard',
    '/pos': 'pos',
    '/finance': 'finance',
    '/sales': 'sales',
    '/appointments': 'appointments',
    '/services': 'services',
    '/products': 'products',
    '/purchases': 'purchases',
    '/stock/manage': 'stock',
    '/suppliers': 'suppliers',
    '/expense': 'expense',
    '/accounts': 'accounts',
    '/customers': 'customers',
    '/staff': 'staff',
    '/payroll': 'payroll',
    '/reports/profit-loss': 'reports',
    '/whatsapp': 'whatsapp',
    '/settings': 'settings',
  };

  const visibleMenuItems = menuItems
    .filter((item) => {
      // Admin-only items — always pinned regardless of hidden state
      if (item.path === '/settings') return isAdmin;
      // Hidden-modules filter applies to EVERYONE
      const moduleKey = MENU_PATH_TO_MODULE_KEY[item.path];
      if (moduleKey && hiddenModules.has(moduleKey)) return false;
      // Permission check
      const perms = MENU_PATH_PERMISSIONS[item.path];
      if (perms === null || perms === undefined) return true;
      if (item.children?.length) {
        const parentOk = hasAnyPermission(perms);
        const childOk = item.children.some((c) => {
          const cp = MENU_PATH_PERMISSIONS[c.path];
          return cp === null || cp === undefined ? true : hasAnyPermission(cp);
        });
        return parentOk || childOk;
      }
      return hasAnyPermission(perms);
    })
    .map((item) => {
      if (item.children?.length) {
        const visibleChildren = item.children.filter((c) => {
          const cp = MENU_PATH_PERMISSIONS[c.path];
          return hasAnyPermission(cp === undefined ? null : cp);
        });
        return { ...item, children: visibleChildren };
      }
      return item;
    });

  const branchContextValue = {
    branches,
    branchesLoading,
    selectedBranchId,
    setSelectedBranchId,
    selectedBranch,
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen || !hasToken) return;
    let cancelled = false;
    setNotificationsLoading(true);
    const headers = getAuthHeadersWithBranch(selectedBranchId);
    fetch(`${API_BASE}/stocks/low`, { headers })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setLowStockItems(res.data.map((i: any) => {
            const qty = Number(i.qty) || 0;
            const minStock = Number(i.alertQty || i.product?.alertQuantity || 0);
            return {
              id: i.id,
              name: i.product?.name || 'Unknown',
              quantity: qty,
              isCritical: qty === 0 || qty < (minStock / 2)
            };
          }));
        } else {
          setLowStockItems([]);
        }
      })
      .catch(() => {
        if (!cancelled) setLowStockItems([]);
      })
      .finally(() => {
        if (!cancelled) setNotificationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notificationsOpen, selectedBranchId, hasToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/customers?search=${encodeURIComponent(q)}`);
      setSearchQuery('');
      setCustomerSearchResults([]);
      setCustomerSearchOpen(false);
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
      localStorage.removeItem('token');
      localStorage.removeItem('permissions');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      localStorage.removeItem('organization');
    } catch {
      /* ignore */
    }
    navigate('/login');
  };

  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userJson ? (() => { try { return JSON.parse(userJson); } catch { return null; } })() : null;
  const displayName = typeof window !== 'undefined' ? (user?.username || user?.firstName || user?.name || localStorage.getItem('name') || role || 'User') : 'User';
  const userEmail = user?.email ?? '';
  const initials = (displayName.split(/\s+/).map((s: string) => s[0]).slice(0, 2).join('') || displayName.slice(0, 2) || 'U').toUpperCase();

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (customerSearchAbortRef.current) {
      customerSearchAbortRef.current.abort();
      customerSearchAbortRef.current = null;
    }

    const q = value.trim();
    if (!q || q.length < 2 || !hasToken) {
      setCustomerSearchResults([]);
      setCustomerSearchOpen(false);
      setCustomerSearchLoading(false);
      return;
    }

    if (selectedBranchId == null) {
      setCustomerSearchResults([]);
      setCustomerSearchOpen(false);
      return;
    }

    const controller = new AbortController();
    customerSearchAbortRef.current = controller;
    setCustomerSearchLoading(true);
    setCustomerSearchOpen(true);

    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '5');
      params.set('search', q);
      const res = await fetch(`${API_BASE}/customers?${params.toString()}`, {
        headers: getAuthHeadersWithBranch(selectedBranchId),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        setCustomerSearchResults([]);
        setCustomerSearchOpen(false);
        return;
      }
      setCustomerSearchResults(
        data.data.map((c: { id: number; name: string; phone?: string | null; email?: string | null }) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? null,
          email: c.email ?? null,
        })),
      );
      setCustomerSearchOpen(true);
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        setCustomerSearchResults([]);
        setCustomerSearchOpen(false);
      }
    } finally {
      if (customerSearchAbortRef.current === controller) {
        customerSearchAbortRef.current = null;
      }
      setCustomerSearchLoading(false);
    }
  };

  const handleSelectCustomerFromSearch = (customer: { id: number; name: string }) => {
    setCustomerSearchOpen(false);
    setCustomerSearchResults([]);
    setSearchQuery('');
    navigate('/customers', { state: { openCustomerId: customer.id } });
  };

  if (location.pathname === '/pos') {
    return (
      <BranchContextProvider value={branchContextValue}>
        <div className="h-screen w-screen bg-white">
          <Outlet />
        </div>
      </BranchContextProvider>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-gray-100 border-r-2 border-gray-300 flex-col shadow-sm">
        <div className="h-16 px-4 flex items-center border-b-2 border-gray-300">
  <div
    className="flex items-center gap-2 cursor-pointer"
    onClick={() => navigate('/')}
  >
    <div className="p-2 bg-primary rounded-xl">
      <Scissors className="w-7 h-7 text-white" />
    </div>
    <div>
      <h1 className="font-bold text-xl text-gray-900">{orgName || "Salon Pro"}</h1>
    </div>
  </div>
</div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isParentActive =
                location.pathname === item.path ||
                (hasChildren && item.children!.some((c) => c.path === location.pathname));
              const isExpanded = expandedMenus[item.path] ?? isParentActive;

              return (
                <li key={item.path}>
                  {item.path.startsWith('#') ? (
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all font-medium ${isParentActive || isExpanded
                        ? 'bg-primary text-white shadow-md shadow-purple-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={(e) => {
                        if (hasChildren) {
                          toggleMenu(item.path, isParentActive);
                        }
                      }}
                      target={item.path === '/pos' ? '_blank' : undefined}
                      rel={item.path === '/pos' ? 'noopener noreferrer' : undefined}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isParentActive
                        ? 'bg-primary text-white shadow-md shadow-purple-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      {hasChildren && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMenu(item.path, isParentActive);
                          }}
                          className="p-1 hover:bg-black/10 rounded-md"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                    </Link>
                  )}
                  {hasChildren && isExpanded && (
                    <ul className="mt-1 ml-0 pl-3 border-l-2 border-gray-100 space-y-1">
                      {item.children!.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <li key={sub.path}>
                            <Link
                              to={sub.path}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${isSubActive
                                ? 'bg-secondary text-tertiary font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                              <SubIcon className={`w-2 h-2 ${isSubActive ? 'text-purple-500 fill-purple-500' : 'text-gray-400 fill-gray-400'}`} />
                              <span>{sub.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sync Status */}
        {!isOnline && pendingSync > 0 && (
          <div className="p-4 border-t-2 border-gray-100">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
              <p className="text-sm font-medium text-amber-800">
                {pendingSync} items pending sync
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-gray-100 border-b-2 border-gray-300 shadow-sm h-16 flex items-center">
          <div className="flex items-center justify-between px-3 w-full">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>

              {/* {orgName && (
                <div className="hidden md:flex items-center text-gray-700 font-semibold px-2 border-r-2 border-gray-100 pr-4">
                  <MapPin className="w-5 h-5 mr-2 text-primary" />
                  {orgName}
                </div>
              )} */}

              {/* Branch Selector – native button so Radix gets ref and popover opens; list shows all branches */}
              {showBranchDropdown ? (
                <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setBranchPopoverOpen((prev) => !prev)}
                      className="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-md border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm outline-none hover:border-primary hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <MapPin className="w-4 h-4 shrink-0 text-primary" />
                        {selectedBranch ? selectedBranch.name : 'Select the branch'}
                      </span>
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="min-w-[220px] z-[100] p-1" sideOffset={8}>
                    <div className="max-h-[280px] overflow-y-auto" role="listbox">
                      {branches.map((branch) => {
                        const isSelected = selectedBranchId === branch.id;
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={async () => {
                              setSelectedBranchId(branch.id);

                              try {
                                localStorage.setItem(BRANCH_STORAGE_KEY, String(branch.id));

                                const res = await fetch(`${API_BASE}/auth/me`, {
                                  headers: getAuthHeadersWithBranch(branch.id),
                                });

                                const data = await res.json();

                                if (res.ok && data?.permissions) {
                                  localStorage.setItem("permissions", JSON.stringify(data.permissions));
                                  localStorage.setItem("role", data.role || "User");
                                }

                                // window.location.reload(); // Removed to allow smooth reactive updates
                              } catch (err) {
                                console.log("Branch switch error:", err);
                              }

                              setBranchPopoverOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${isSelected ? 'bg-secondary font-medium text-tertiary' : ''}`}
                          >
                            <span>{branch.name}</span>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : branches.length === 0 && !branchesLoading ? (
                <Button
                  variant="outline"
                  className="gap-2 h-10 border-2 font-medium min-w-[180px] justify-between"
                  asChild
                >
                  <Link to="/settings" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-primary" />
                    <span>No branches – Add in Settings</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2 h-10 border-2 font-medium min-w-[180px] justify-between"
                  disabled={branchesLoading}
                >
                  {branchesLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      <span>Loading branches…</span>
                    </>
                  ) : !hasToken ? (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-primary" />
                      <span>Sign in to select branch</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-primary" />
                      <span>Select branch</span>
                    </span>
                  )}
                </Button>
              )}

              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="hidden md:block relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none border-gray-500" />
                <Input
  type="text"
  placeholder="Search customers by name or phone..."
  value={searchQuery}
  onChange={handleSearchChange}
  className="pl-11 h-10 border-2 border-gray-300 focus:border-primary focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
  aria-label="Search"
/>
                {customerSearchOpen && (
                  <div className="absolute left-0 right-0 mt-1 rounded-md border border-gray-200 bg-white shadow-lg z-50 max-h-72 overflow-y-auto">
                    {customerSearchLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                    ) : customerSearchResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No customers found</div>
                    ) : (
                      <ul className="py-1">
                        {customerSearchResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCustomerFromSearch(c)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex flex-col"
                            >
                              <span className="font-medium text-gray-900 truncate">{c.name}</span>
                              <span className="text-xs text-gray-500 truncate">
                                {c.phone || c.email || 'No contact details'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Online/Offline Status – clickable popover */}
              <Popover open={onlineStatusOpen} onOpenChange={setOnlineStatusOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isOnline
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 animate-pulse'
                      }`}
                    aria-label={isOnline ? 'Online - click for details' : 'Offline - click for details'}
                  >
                    {isOnline ? (
                      <>
                        <Wifi className="w-4 h-4" />
                        <span className="hidden sm:inline">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4" />
                        <span className="hidden sm:inline font-semibold">Offline</span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  {isOnline ? (
                    <div className="space-y-2">
                      <p className="font-medium text-green-800">You are online</p>
                      <p className="text-sm text-muted-foreground">Connection is stable. Data will sync normally.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium text-red-800">You are offline</p>
                      <p className="text-sm text-muted-foreground">Changes will be saved locally and synced when your connection is restored.</p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Notifications – low stock only */}
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-gray-100" aria-label="Notifications">
                    <Bell className="w-5 h-5" />
                    {lowStockItems.length > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-red-600">
                        {lowStockItems.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96 p-0">
                  <div className="p-3 border-b">
                    <p className="font-semibold">Notifications</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Low stock items</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading…</span>
                      </div>
                    ) : lowStockItems.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No low stock items.
                      </div>
                    ) : (
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-amber-600" />
                            Low stock ({lowStockItems.length})
                          </span>
                          <Link to="/stock/manage" onClick={() => setNotificationsOpen(false)} className="text-xs text-primary hover:underline">
                            View all
                          </Link>
                        </div>
                        <ul className="space-y-1.5 text-sm">
                          {lowStockItems.slice(0, 8).map((item) => (
                            <li key={item.id} className="flex justify-between items-center gap-2 py-1 px-2 rounded bg-muted/50">
                              <span className="truncate">{item.name}</span>
                              <span className="shrink-0 font-medium">{item.quantity} {item.isCritical ? '(critical)' : ''}</span>
                            </li>
                          ))}
                          {lowStockItems.length > 8 && (
                            <li className="text-xs text-muted-foreground pt-1">+{lowStockItems.length - 8} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="border-t p-2">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setNotificationsOpen(false)}>
                      Close
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-3 h-10 hover:bg-gray-100">
                    <Avatar className="w-8 h-8 ring-2 ring-purple-100">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-white font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline font-medium">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-3">
                    <p className="font-semibold text-foreground">{displayName}</p>
                    {userEmail ? (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{userEmail}</p>
                    ) : null}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="font-medium">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="font-semibold text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 text-center font-medium shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <WifiOff className="w-5 h-5" />
                <span>You are offline. Changes will be synced when connection is restored.</span>
              </div>
            </div>
          )}
        </header>


        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50">
            <aside className="w-64 bg-white h-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-8 h-8 text-primary" />
                  <div>
                    <h1 className="font-bold text-xl">{orgName || "Salon Pro"}</h1>
                    <p className="text-xs text-gray-500">Management System</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="p-4">
                <ul className="space-y-1">
                  {visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = item.children && item.children.length > 0;
                    const isParentActive =
                      location.pathname === item.path ||
                      (hasChildren && item.children!.some((c) => c.path === location.pathname));
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          target={item.path === '/pos' ? '_blank' : undefined}
                          rel={item.path === '/pos' ? 'noopener noreferrer' : undefined}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isParentActive
                            ? 'bg-secondary text-purple-700'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                        {hasChildren && (
                          <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                            {item.children!.map((sub) => {
                              const isSubActive = location.pathname === sub.path;
                              const SubIcon = sub.icon;
                              return (
                                <li key={sub.path}>
                                  <Link
                                    to={sub.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isSubActive ? 'bg-secondary text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                      }`}
                                  >
                                    <SubIcon className="w-4 h-4" />
                                    <span>{sub.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>
          </div>
        )}

        {/* Page Content – only this area scrolls; header/sidebar stay fixed */}
        <main className="flex-1 min-h-0 overflow-auto">
          <BranchContextProvider value={branchContextValue}>
            <Outlet />
          </BranchContextProvider>
        </main>
      </div>
    </div>
  );
}