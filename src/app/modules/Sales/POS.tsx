import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, type SaleFormValues } from '../../utils/validation';
import {
  Search, Plus, Minus, X, User, Loader2, FileEdit,
  Calculator, Package, Truck, Hash, Receipt, ShoppingCart,
  CreditCard, Banknote, CheckCircle2, Users,
  ChevronDown, Percent, BarChart2, RotateCcw, Pause, Maximize, ArrowLeft, FileText, DollarSign, Clipboard,
  Building2, Monitor, Scissors,AlertCircle 
} from 'lucide-react';

import { toast } from 'sonner';
import React from 'react';
import { useBranch } from '../../contexts/BranchContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { ApiService } from '../../../api/ApiService';
import { COLORS } from '../../constants/colors';
import CalculatorUi from '../../components/pos/Calculator';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { useCurrency } from '../../contexts/CurrencyContext';
import RegisterDetailsModal from './components/RegisterDetailsModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryRecord = { id: number; name: string; slug: string | null };
type POSItem = {
  id: number; name: string; price: number;
  categoryId: number | null; categoryName: string; brandId?: number | null;
  image?: string | null; stock?: number | null; sku?: string | null;
  manageStock?: boolean;
  productType?: 'single' | 'variable';
  variations?: any;
  variationId?: number | null;
  itemType?: 'product' | 'service' | 'package';
};
type SaleItemRecord = {
  id: number;
  saleId: number;
  itemId: number;
  itemType: 'product' | 'service' | 'package';
  itemName: string;
  price: number;
  quantity: number;
  staffId?: number | null;
};
type SaleRecord = {
  id: number;
  organizationId: number;
  branchId: number | null;
  customerId?: number | null;
  customer?: { id: number; name: string; mobile: string | null } | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  discountRate: number;
  total: number;
  status: 'paid' | 'unpaid' | 'partial' | 'draft';
  amountPaid: number;
  remainingBalance?: number;
  SaleItems: SaleItemRecord[];
  createdAt: string;
};
interface CartItem { 
  item: POSItem; 
  staffId: number | null; 
  quantity: number;
  itemDiscount?: { type: 'fixed' | 'percentage'; amount: number } | null;
  itemTaxPercent?: number | null;
}

// ─── Design Tokens (Darker & Higher Contrast) ──────────────────────────────────
const C = {
  bg: '#f1f5f9', // Slate 100
  surface: '#FFFFFF',
  border: '#e2e8f0', // Slate 200
  borderMid: '#cbd5e1', // Slate 300
  text: '#1e1b4b', // Very Dark Indigo 950
  textSub: '#334155', // Slate 700
  textMuted: '#64748b', // Slate 500
  primary: '#6d28d9', // Deep Purple 700
  primaryLight: '#ede9fe', // Purple 100
  primaryBorder: '#ddd6fe', // Purple 200
  green: '#059669', // Emerald 600
  greenLight: '#d1fae5',
  red: '#dc2626', // Red 600
  redLight: '#fee2e2',
  amber: '#d97706', // Amber 600
  amberLight: '#fef3c7',
  blue: '#2563eb', // Blue 600
  blueLight: '#dbeafe',
};

const EMPTY_CUST_FORM = {
  name: '', businessName: '', email: '', mobile: '',
  address: '', taxNumber: '', creditLimit: '', payTerm: '',
  openingBalance: '', customerGroup: '',
  platinum: false,
  customField1: '', customField2: '', customField3: '',
  customField4: '', customField5: '', customField6: '',
  customField7: '', customField8: '', customField9: '',
};

const itemStyle: React.CSSProperties = {
  padding: "10px 12px",
  cursor: "pointer",
  borderTop: "1px solid #f1f5f9",
};

function CustomerDropdown({
  customers,
  selectedCustomerId,
  onSelect,
}: {
  customers: any[];
  selectedCustomerId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = customers.find(c => c.id === selectedCustomerId);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || "").includes(search)
  );


  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          height: 38,
          borderRadius: 10,
          border: `1.5px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          cursor: "pointer",
          background: "#fff",
        }}
      >
        <User size={14} style={{ marginRight: 8 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
          {selected ? selected.name : "Walk-in Customer"}
        </span>
        <ChevronDown size={12} />

      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            width: "100%",
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div style={{ padding: 10 }}>
            <input
              autoFocus
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                padding: "0 10px",
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 250, overflowY: "auto" }}>
            {/* Walk-in */}
            <div
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={itemStyle}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={12} color={C.textMuted} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Walk-in Customer</span>
              </div>
            </div>

            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelect(c.id);
                  setOpen(false);
                }}
                style={itemStyle}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[9px] bg-purple-100 text-purple-700">
                      {c.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {c.mobile}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: C.textMuted }}>
                No customers found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StaffDropdown({
  staff,
  selectedStaffId,
  onSelect,
}: {
  staff: any[];
  selectedStaffId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = staff.find(s => s.id === selectedStaffId);

  const filtered = staff.filter(s => {
    const fullName = `${s.firstName} ${s.lastName || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      {/* <div
        onClick={() => setOpen(!open)}
        style={{
          height: 38,
          borderRadius: 10,
          border: `1.5px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          cursor: "pointer",
          background: "#fff",
        }}
      >
        <Users size={14} style={{ marginRight: 8 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
          {selected ? `${selected.firstName} ${selected.lastName || ""}` : "Service Staff"}
        </span>
        <ChevronDown size={12} />
      </div> */}

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            width: "100%",
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div style={{ padding: 10 }}>
            <input
              autoFocus
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                padding: "0 10px",
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 250, overflowY: "auto" }}>
            {/* None */}
            <div
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={itemStyle}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>No Staff Assigned</span>
            </div>

            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
                style={itemStyle}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[9px] bg-secondary text-primary">
                      {s.firstName[0]}{s.lastName ? s.lastName[0] : ""}
                    </AvatarFallback>
                  </Avatar>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.firstName} {s.lastName || ""}
                  </span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: C.textMuted }}>
                No staff found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceDropdown({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: any[];
  selectedServiceId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = services.find(s => s.id === selectedServiceId);

  const filtered = services.filter(s =>
    s.serviceName.toLowerCase().includes(search.toLowerCase()) ||
    (s.serviceCode || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          height: 38,
          borderRadius: 10,
          border: `1.5px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          cursor: "pointer",
          background: "#fff",
        }}
      >
        <Scissors size={14} style={{ marginRight: 8 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
          {selected ? selected.serviceName : "Select Service"}
        </span>
        <ChevronDown size={12} />
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            width: "100%",
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 10 }}>
            <input
              autoFocus
              placeholder="Search service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                padding: "0 10px",
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ maxHeight: 250, overflowY: "auto" }}>
            <div
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={itemStyle}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#f1f5f9', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <Scissors size={12} color={C.textMuted} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>No Service Selected</span>
              </div>
            </div>

            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
                style={itemStyle}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: s.isPackage ? C.amberLight : C.primaryLight, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    {s.isPackage ? (
                      <Package size={12} color={C.amber} />
                    ) : (
                      <Scissors size={12} color={C.primary} />
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.serviceName}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {s.serviceCode || `Price: ${s.price}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: C.textMuted }}>
                No services found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function POS() {
  const { selectedBranchId, branches } = useBranch();
  const { currency, symbol, format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editSaleId = searchParams.get('editSaleId');
  const [items, setItems] = useState<POSItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentSale, setCurrentSale] = useState<SaleRecord | null>(null);
  const [staffByServiceId] = useState<Record<number, number>>({});
  const [itemSearch, setItemSearch] = useState('');
  const debouncedItemSearch = useDebounce(itemSearch, 300);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  // const [isKitchenOrder, setIsKitchenOrder] = useState(false);
  const [activePayMode, setActivePayMode] = useState<'cash' | 'card' | 'cheque' | 'multiple'>('cash');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [filterType, setFilterType] = useState<'category' | 'brand' | 'customers'>('category');
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [activeBrand, setActiveBrand] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [addCustStep, setAddCustStep] = useState<1 | 2 | 3>(1);
  const [addCustSubmitting, setAddCustSubmitting] = useState(false);
  const [addCustForm, setAddCustForm] = useState({ ...EMPTY_CUST_FORM });
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = React.useRef(null);
  const catalogFetchId = React.useRef(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountAmount, setDiscountAmount] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'fixed' | 'percentage'; amount: number } | null>(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxInput, setTaxInput] = useState('');
  const [appliedTaxPercent, setAppliedTaxPercent] = useState<number | null>(null);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [savedSales, setSavedSales] = useState<any[]>([]);
  const [loadingSavedSales, setLoadingSavedSales] = useState(false);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [selectedVariableProduct, setSelectedVariableProduct] = useState<POSItem | null>(null);

  const [showItemEditModal, setShowItemEditModal] = useState(false);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [itemDiscountType, setItemDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [itemDiscountAmount, setItemDiscountAmount] = useState('');
  const [itemTaxInput, setItemTaxInput] = useState('');

  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [redirectApptId, setRedirectApptId] = useState<number | null>(null);

  // Add these with other state declarations
const [showReturnModal, setShowReturnModal] = useState(false);
const [returnInvoiceNumber, setReturnInvoiceNumber] = useState('');
const [loadingReturn, setLoadingReturn] = useState(false);
const [showRegisterModal, setShowRegisterModal] = useState(false);

const form = useForm<SaleFormValues>({
  resolver: zodResolver(saleSchema),
  defaultValues: {
    customerId: undefined,
    staffId: undefined,
    status: 'paid',
    paymentMethod: 'cash',
    amountPaid: 0,
    taxPercent: 0,
    discountType: 'fixed',
    discountAmount: 0,
    discountRate: 0,
    note: '',
    dueDate: '',
    items: [],
    payments: [],
  },
  mode: 'onSubmit',
  reValidateMode: 'onChange',
});

  // ─── URL Parameters Mounting Effect (Dynamic Cart Loader) ───
  // ─── URL Parameters Mounting Effect (Dynamic Cart Loader) ───
  useEffect(() => {
    if (services.length > 0) {
      const urlServiceId = searchParams.get('serviceId');
      const urlPackageId = searchParams.get('packageId');
      const urlCustomerId = searchParams.get('customerId');
      const urlStaffId = searchParams.get('staffId');
      const urlApptId = searchParams.get('apptId'); // <-- YEH LINE ADD KAREIN

      let shouldClearParams = false;

      // Load Appointment Context
      if (urlApptId) {
        setRedirectApptId(Number(urlApptId)); // <-- State mein save karein
        shouldClearParams = true;
      }

      if (urlCustomerId) {
        setSelectedCustomerId(Number(urlCustomerId));
        shouldClearParams = true;
      }

      if (urlStaffId) {
        setSelectedStaffId(Number(urlStaffId));
        shouldClearParams = true;
      }

      // Handle Service Redirection
      if (urlServiceId) {
        const service = services.find(s => Number(s.id) === Number(urlServiceId) && !s.isPackage);
        if (service) {
          const serviceAsItem = {
            id: service.id,
            name: service.serviceName,
            price: service.price,
            categoryId: service.categoryId,
            categoryName: service.categoryName || 'Service',
            productType: 'single',
            sku: service.serviceCode || `SRV-${service.id}`,
            itemType: 'service' as const,
          };

          setCart((prev: any) => {
            const exists = prev.find((i: any) => i.item.id === service.id && i.item.itemType === 'service');
            if (!exists) {
              return [...prev, { item: serviceAsItem, staffId: urlStaffId ? Number(urlStaffId) : null, quantity: 1 }];
            }
            return prev;
          });
          shouldClearParams = true;
        }
      }

      // Handle Package Redirection
      if (urlPackageId) {
        const pkg = services.find(s => Number(s.id) === Number(urlPackageId) && s.isPackage);
        if (pkg) {
          const packageAsItem = {
            id: pkg.id,
            name: pkg.serviceName,
            price: pkg.price,
            categoryId: null,
            categoryName: 'Package',
            productType: 'single',
            sku: pkg.serviceCode || `PKG-${pkg.id}`,
            itemType: 'package' as const,
          };

          setCart((prev: any) => {
            const exists = prev.find((i: any) => i.item.id === pkg.id && i.item.itemType === 'package');
            if (!exists) {
              return [...prev, { item: packageAsItem, staffId: urlStaffId ? Number(urlStaffId) : null, quantity: 1 }];
            }
            return prev;
          });
          shouldClearParams = true;
        }
      }

      if (shouldClearParams) {
        setSearchParams({}, { replace: true });
      }
    }
  }, [services, searchParams, setSearchParams]);[services, searchParams, setSearchParams];



  // ── Card Payment Modal State ─────────────────────────────────────────────
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardTransactionNo, setCardTransactionNo] = useState('');
  const [cardType, setCardType] = useState('VISA');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardSubmitting, setCardSubmitting] = useState(false);

  const resetCardModal = () => {
    setCardNumber(''); setCardHolder(''); setCardTransactionNo('');
    setCardType('VISA'); setCardMonth(''); setCardYear(''); setCardCVV('');
  };

  // ── Cheque Payment Modal State ────────────────────────────────────────────
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeAccountName, setChequeAccountName] = useState('');
  const [chequeSubmitting, setChequeSubmitting] = useState(false);
  // Bank Transfer states for Multi Payment
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const resetChequeModal = () => {
    setChequeNo(''); setChequeBankName(''); setChequeDate(''); setChequeAccountName('');
  };

  // ── Multi Payment Modal State ─────────────────────────────────────────────
  type MultiPayRow = {
    id: number;
    method: 'cash' | 'card' | 'cheque' | 'bank_transfer' | 'other';
    amount: string;
    // Card fields
    cardNumber?: string;
    cardHolder?: string;
    cardTransactionNo?: string;
    cardType?: string;
    cardMonth?: string;
    cardYear?: string;
    cardCVV?: string;
    // Cheque fields
    chequeNo?: string;
    chequeBankName?: string;
    chequeDate?: string;
    chequeAccountName?: string;

    //banks fields
    bankAccountId?: string;
    bankAccountNumber?: string;
    transferReferenceNo?: string;
    transferDate?: string;

    // Other field
    note?: string;
  };

  const [showMultiPayModal, setShowMultiPayModal] = useState(false);
  const [multiPayRows, setMultiPayRows] = useState<MultiPayRow[]>([
    { id: 1, method: 'cash', amount: '' }
  ]);
  const [multiPaySubmitting, setMultiPaySubmitting] = useState(false);
  let multiPayIdCounter = React.useRef(2);

  const addMultiPayRow = () => {
    setMultiPayRows(prev => [...prev, { id: multiPayIdCounter.current++, method: 'cash', amount: '' }]);
  };

  const removeMultiPayRow = (id: number) => {
    setMultiPayRows(prev => prev.filter(r => r.id !== id));
  };

  const updateMultiPayRow = (id: number, updates: Partial<MultiPayRow>) => {
    setMultiPayRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };


  const resetMultiPayModal = () => {
    setMultiPayRows([{ id: 1, method: 'cash', amount: '' }]);
    multiPayIdCounter.current = 2;
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const [cart, setCart] = useState<CartItem[]>([]);

  const openCustomerDisplay = () => {
    window.open('/customer-display', 'CustomerDisplay', 'width=1200,height=800');
  };


  useEffect(() => {
    if (currentSale) {
      if (currentSale.SaleItems) {
        setCart(currentSale.SaleItems.map((saleItem: any) => {
          const product = items.find((i) => i.id === saleItem.itemId);
          return {
            item: {
              ...(product ?? {}),
              id: saleItem.itemId,
              name: saleItem.itemName, // Use the specific name from DB (includes variation)
              price: typeof saleItem.price === 'number' ? saleItem.price : parseFloat(String(saleItem.price)),
              categoryId: product?.categoryId ?? null,
              categoryName: product?.categoryName ?? '',
            },
            staffId: saleItem.staffId ?? null,
            quantity: saleItem.quantity,
          };
        }));
      }
      setSelectedCustomerId(currentSale.customerId || null);
      setSelectedStaffId(currentSale.staffId || null);
      setAppliedTaxPercent(currentSale.taxPercent ? parseFloat(currentSale.taxPercent.toString()) : null);
      if (currentSale.discountAmount > 0) {
        setAppliedDiscount({
          type: currentSale.discountType as 'percentage' | 'fixed',
          amount: parseFloat(currentSale.discountAmount.toString())
        });
      } else {
        setAppliedDiscount(null);
        setDiscountAmount("");
      }

      if ((currentSale as any).paymentMethod) {
        setActivePayMode((currentSale as any).paymentMethod);
      }
      // if ((currentSale as any).paymentStatus) {
      //   setActivePaymentStatus((currentSale as any).paymentStatus);
      // }
    }
  }, [currentSale, items]);


  const fetchCustomers = useCallback(async () => {
    try {
      const res = await ApiService.customers.getAll({ limit: 1000 });
      setCustomers(Array.isArray(res) ? res : res.data ?? []);
    } catch { setCustomers([]); }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await ApiService.categories.getAll();
      setCategories(Array.isArray(res) ? res : res.data ?? []);
    } catch { setCategories([]); }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await ApiService.brands.getAll();
      setBrands(Array.isArray(res) ? res : res.data ?? []);
    } catch {
      setBrands([]);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await ApiService.staff.getAll({ limit: 1000 });
      setStaff(Array.isArray(res) ? res : res.data ?? []);
    } catch { setStaff([]); }
  }, []);

  const fetchSavedSales = async () => {
    setLoadingSavedSales(true);
    try {
      const res = await ApiService.get('/pos/sales', { params: { status: 'draft' } });
      const data = res.data;
      if (Array.isArray(res)) {
        setSavedSales(res);
      } else if (data && data.sales && Array.isArray(data.sales)) {
        setSavedSales(data.sales);
      } else if (data && Array.isArray(data)) {
        setSavedSales(data);
      } else {
        setSavedSales([]);
      }
    } catch (e: any) {
      toast.error('Failed to load saved sales');
    } finally {
      setLoadingSavedSales(false);
    }
  };

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await ApiService.get('/banks'); // Adjust endpoint as needed
      const data = Array.isArray(res) ? res : res.data ?? [];
      setBankAccounts(data);
    } catch {
      setBankAccounts([]);
    }
  }, []);

  const loadSavedSale = async (saleId: number) => {
    try {
      const res = await ApiService.get(`/pos/sale/${saleId}`);
      if (res.data) {
        setCurrentSale(res.data);
        setShowDraftsModal(false);
        toast.success(`Resumed sale #${saleId}`);
      }
    } catch {
      toast.error('Failed to load sale');
    }
  };

  // Auto-load sale from ?editSaleId= URL param (from Sales List Edit button)
  useEffect(() => {
    if (editSaleId) {
      loadSavedSale(parseInt(editSaleId));
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSaleId]);

  const fetchCatalogItems = useCallback(async () => {
    if (selectedBranchId == null) {
      setItems([]);
      setLoadingItems(false);
      return;
    }

    const fetchId = ++catalogFetchId.current;
    if (page === 1) setLoadingItems(true);
    else setLoadingMore(true);

    try {
      const trimmedSearch = debouncedItemSearch.trim();
      let data: any[] = [];
      let meta: { totalPages?: number } = { totalPages: 1 };

      if (trimmedSearch) {
        const res = await ApiService.products.search(trimmedSearch);
        if (fetchId !== catalogFetchId.current) return;
        data = res.data || [];
      } else {
        const res = await ApiService.products.getAll({ page, limit });
        if (fetchId !== catalogFetchId.current) return;
        data = res.data || [];
        meta = res;
      }

      const mapped: any[] = [];
      data.forEach((p: any) => {
        if (p.productType === 'variable' && Array.isArray(p.variations) && p.variations.length > 0) {
          p.variations.forEach((v: any) => {
            mapped.push({
              id: p.id,
              name: `${p.name} - ${v.name}`,
              price: parseFloat(v.sellingPriceInc || v.sellingPriceExc || p.sellingPriceInc || p.sellingInc) || 0,
              categoryId: p.categoryId ? parseInt(p.categoryId) : null,
              categoryName: p.category || '',
              brandId: p.brandId ? parseInt(p.brandId) : null,
              brandName: p.brandName || '',
              stock: parseFloat(v.currentStock) || 0,
              manageStock: p.manageStock === true || p.manageStock === 1,
              sku: v.sku || `${p.sku}-${v.id}`,
              image: v.variationImage || p.productImage,
              productType: 'single', // Change to single to add to cart directly without variation modal trigger
              variations: [],
              variationId: v.id,
              itemType: 'product',
            });
          });
        } else {
          // Single products, OR variable products with no variations defined yet (show as plain tile)
          mapped.push({
            id: p.id,
            name: p.name,
            price: parseFloat(p.sellingPriceInc || p.sellingInc) || 0,
            categoryId: p.categoryId ? parseInt(p.categoryId) : null,
            categoryName: p.category || '',
            brandId: p.brandId ? parseInt(p.brandId) : null,
            brandName: p.brandName || '',
            stock: p.currentStock ?? 0,
            manageStock: p.manageStock === true || p.manageStock === 1,
            sku: p.sku || `SKU-${p.id}`,
            image: p.productImage,
            // If variable with no variations, mark as single so no modal opens
            productType: (p.productType === 'variable' && (!p.variations || p.variations.length === 0))
              ? 'single'
              : p.productType,
            variations: p.variations || [],
            itemType: 'product',
          });
        }
      });

      setItems(prev =>
        trimmedSearch || page === 1 ? mapped : [...prev, ...mapped]
      );
      setTotalPages(trimmedSearch ? 1 : meta.totalPages || 1);

    } catch {
      if (fetchId === catalogFetchId.current && page === 1) setItems([]);
    } finally {
      if (fetchId === catalogFetchId.current) {
        setLoadingItems(false);
        setLoadingMore(false);
      }
    }
  }, [selectedBranchId, page, limit, debouncedItemSearch]);
  const fetchServices = useCallback(async () => {
    try {
      const [servicesRes, packagesRes] = await Promise.all([
        ApiService.services.getAll({
          page: 1,
          limit: 1000,
          status: 'active'
        }),
        ApiService.packages.getAll({
          status: 'active'
        })
      ]);
      const activeServices = servicesRes.data || [];
      const activePackages = (packagesRes.data || packagesRes || []).map((pkg: any) => ({
        ...pkg,
        id: pkg.id,
        serviceName: `[Package] ${pkg.packageName}`,
        serviceCode: pkg.packageCode || `PKG-${pkg.id}`,
        price: pkg.price,
        isPackage: true,
        categoryName: 'Package'
      }));
      setServices([...activeServices, ...activePackages]);
    } catch {
      setServices([]);
    }
  }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          !loadingItems &&
          !loadingMore &&
          !debouncedItemSearch.trim() &&
          page < totalPages
        ) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadingItems, loadingMore, page, totalPages, debouncedItemSearch]);

  // Reset page on search or filter change (clear items to avoid stale append while page resets)
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [selectedBranchId, activeCategory, activeBrand, filterType, debouncedItemSearch]);
  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchCustomers();
    fetchStaff();
    fetchBankAccounts();
    fetchServices(); // Add this line

  }, [fetchCategories, fetchBrands, fetchCustomers, fetchStaff, fetchBankAccounts, fetchServices]);
  useEffect(() => {
    fetchCatalogItems();
  }, [fetchCatalogItems]);

  // ── Sync state → react-hook-form for validation ──
  useEffect(() => {
    form.setValue('customerId', selectedCustomerId ?? (undefined as unknown as number));
    form.setValue('staffId', selectedStaffId ?? (undefined as unknown as number));
    form.setValue('paymentMethod', activePayMode);
    form.setValue('taxPercent', appliedTaxPercent ?? 0);
    form.setValue('discountType', appliedDiscount?.type ?? 'fixed');
    form.setValue('discountAmount', appliedDiscount?.amount ?? 0);
    form.setValue('discountRate', appliedDiscount?.type === 'percentage' ? appliedDiscount.amount : 0);
    form.setValue('dueDate', dueDate);
    form.setValue('items', cart.map(c => ({
      itemId: c.item.id,
      itemType: (c.item.itemType || 'product') as 'product' | 'service' | 'package',
      itemName: c.item.name,
      price: c.item.price,
      quantity: c.quantity,
      staffId: c.staffId ?? undefined,
    })));
  }, [selectedCustomerId, selectedStaffId, activePayMode, appliedTaxPercent, appliedDiscount, dueDate, cart, form]);

  const handleAddCustChange = (key: string, value: string | boolean) =>
    setAddCustForm(prev => ({ ...prev, [key]: value }));

  const openAddCustomerModal = () => {
    setAddCustForm({ ...EMPTY_CUST_FORM });
    setAddCustStep(1);
    setShowAddCustomerModal(true);
  };

  const closeAddCustomerModal = () => {
    setShowAddCustomerModal(false);
    setAddCustStep(1);
    setAddCustSubmitting(false);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addCustStep < 3) {
      if (addCustStep === 1 && !addCustForm.name.trim()) {
        toast.error('Name is required');
        return;
      }
      setAddCustStep(s => (s + 1) as 1 | 2 | 3);
      return;
    }
    if (!addCustForm.name.trim()) { toast.error('Name is required'); return; }
    setAddCustSubmitting(true);
    try {
      const res = await ApiService.customers.create({
        name: addCustForm.name.trim(),
        businessName: addCustForm.businessName.trim() || undefined,
        email: addCustForm.email.trim() || undefined,
        mobile: addCustForm.mobile.trim() || undefined,
        address: addCustForm.address.trim() || undefined,
        taxNumber: addCustForm.taxNumber.trim() || undefined,
        creditLimit: addCustForm.creditLimit ? parseFloat(addCustForm.creditLimit) : undefined,
        payTerm: addCustForm.payTerm.trim() || undefined,
        openingBalance: addCustForm.openingBalance ? parseFloat(addCustForm.openingBalance) : undefined,
        customerGroup: addCustForm.customerGroup.trim() || undefined,
        platinum: addCustForm.platinum,
        customField1: addCustForm.customField1.trim() || undefined,
        customField2: addCustForm.customField2.trim() || undefined,
        customField3: addCustForm.customField3.trim() || undefined,
        customField4: addCustForm.customField4.trim() || undefined,
        customField5: addCustForm.customField5.trim() || undefined,
        customField6: addCustForm.customField6.trim() || undefined,
        customField7: addCustForm.customField7.trim() || undefined,
        customField8: addCustForm.customField8.trim() || undefined,
        customField9: addCustForm.customField9.trim() || undefined,
      });
      toast.success('Customer added!');
      closeAddCustomerModal();
      await fetchCustomers();
      const newId = res?.data?.id ?? res?.id;
      if (newId) setSelectedCustomerId(newId);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to create customer');
    } finally {
      setAddCustSubmitting(false);
    }
  };
  const handleSellReturn = async () => {
  if (!returnInvoiceNumber.trim()) {
    toast.error('Please enter invoice number');
    return;
  }

  setLoadingReturn(true);
  try {
    // First, try to find the sale by invoice number or ID
    const res = await ApiService.sales.getAll({ 
      page: 1, 
      limit: 100,
      // You might need to add an endpoint to search by invoice number
      // For now, we'll search and filter client-side
    });
    
    const sales = res.data?.sales || [];
    // Try to find by invoice number or ID
    const sale = sales.find((s: any) => 
      s.invoiceNumber === returnInvoiceNumber || 
      s.id.toString() === returnInvoiceNumber
    );
    
    if (!sale) {
      toast.error('Sale not found. Please check the invoice number.');
      return;
    }
    
    // Redirect to ListSales page with the sale ID or navigate to POS with return context
    // Option 1: Navigate to ListSales page (which already has return functionality)
    navigate(`/sales?returnSaleId=${sale.id}`);
    
    // Close the modal
    setShowReturnModal(false);
    setReturnInvoiceNumber('');
    
  } catch (error) {
    toast.error('Failed to fetch sale details');
  } finally {
    setLoadingReturn(false);
  }
};

  const handleSelectVariation = (variationSubItem: any) => {
    if (!selectedVariableProduct) return;

    const virtualItem: POSItem = {
      ...selectedVariableProduct,
      // We append the variation name for display and receipt purposes
      name: `${selectedVariableProduct.name} - ${variationSubItem.name}`,
      price: parseFloat(variationSubItem.sellingPriceInc || variationSubItem.sellingPriceExc || selectedVariableProduct.price),
      sku: variationSubItem.sku || selectedVariableProduct.sku,
      variationId: variationSubItem.id, // helpful for backend tracking
    };

    setCart(prev => {
      // Check if this specific variation is already in cart
      const existing = prev.find(i => i.item.id === virtualItem.id && i.item.name === virtualItem.name);
      if (existing) {
        return prev.map(i => (i.item.id === virtualItem.id && i.item.name === virtualItem.name) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item: virtualItem, staffId: null, quantity: 1 }];
    });

    setShowVariationModal(false);
    setSelectedVariableProduct(null);
  };


  const addToCart = (item: POSItem) => {
    if (selectedBranchId == null) { toast.error('Select a branch'); return; }
    const isService = item.itemType === 'service' || (item.sku && !item.sku.startsWith('SKU-'));

    if (isService) {
      // Services have no stock limit
      setCart(prev => {
        const existing = prev.find(i => i.item.id === item.id && i.item.name === item.name);
        if (existing) {
          return prev.map(i => (i.item.id === item.id && i.item.name === item.name)
            ? { ...i, quantity: i.quantity + 1 }
            : i);
        }
        return [...prev, { item, staffId: selectedStaffId, quantity: 1 }];
      });
      return;
    }
    const isOutOfStock = (item.stock ?? 0) <= 0 && item.manageStock === true;
    if (isOutOfStock) {
      toast.error(`"${item.name}" is out of stock`);
      return;
    }

    // If it's a variable product, open the modal instead of adding immediately
    if (item.productType === 'variable' && item.variations) {
      setSelectedVariableProduct(item);
      setShowVariationModal(true);
      return;
    }

    // Standard "Single" product logic
    setCart(prev => {
      // Use name matching to distinguish between variations of same ID
      const existing = prev.find(i => i.item.id === item.id && i.item.name === item.name);
      if (existing) {
        return prev.map(i => (i.item.id === item.id && i.item.name === item.name) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, staffId: null, quantity: 1 }];
    });
  };


  const updateQuantity = (itemId: number, itemName: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId && i.item.name === itemName) {
        return { ...i, quantity: Math.max(0, i.quantity + delta) };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (itemId: number, itemName: string) => {
    setCart(prev => prev.filter(i => !(i.item.id === itemId && i.item.name === itemName)));
    toast.info('Item removed');
  };

  const submitSaleData = async (status: 'draft' | 'credit' | 'paid' | null, pStatOverride?: string, paymentInfo?: any) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      const errors = form.formState.errors;
      const firstKey = Object.keys(errors)[0];
      const firstErr = errors[firstKey as keyof typeof errors];
      const msg = (firstErr as any)?.message || 'Validation failed';
      toast.error(String(msg));
      return;
    }

    const fv = form.getValues();

    const finalSubtotal = cart.reduce((s, i) => s + i.item.price * i.quantity, 0);
    const finalDiscount = fv.discountType === 'fixed'
      ? fv.discountAmount
      : (finalSubtotal * fv.discountAmount) / 100;
    const finalTaxBase = finalSubtotal - finalDiscount;
    const finalTax = fv.taxPercent != null ? (finalTaxBase * fv.taxPercent) / 100 : 0;
    const finalTotal = Math.max(0, finalTaxBase + finalTax);

    const fPStat = pStatOverride || 'paid';

    try {
      const payload = {
        saleId: currentSale?.id,
        status,
        customerId: fv.customerId,
        staffId: fv.staffId,
        appointmentId: redirectApptId || undefined, // Association for backend
        taxPercent: fv.taxPercent || 0,
        discountType: fv.discountType || 'fixed',
        discountAmount: finalDiscount,
        discountRate: fv.discountType === 'percentage' ? fv.discountAmount : 0,
        total: finalTotal,
        totalItems: itemCount,
        amountPaid: (status === 'draft' || status === 'credit') ? 0 : (paymentInfo?.amountPaid ?? finalTotal),
        paymentMethod: (status === 'draft') ? 'cash' : (status === 'credit' ? 'credit' : (fv.paymentMethod || 'cash')),
        paymentStatus: fPStat,
        dueDate: (fPStat === 'due' || fPStat === 'partial') ? (fv.dueDate || null) : null,
        ...paymentInfo,
        items: cart.map(c => ({
          itemId: c.item.id,
          itemName: c.item.name,
          itemType: c.item.itemType || 'product',
          price: c.item.price,
          quantity: c.quantity,
          variationId: c.item.variationId || null,
          staffId: c.staffId || selectedStaffId,
          itemDiscountType: c.itemDiscount?.type ?? null,
          itemDiscountAmount: c.itemDiscount ? (
            c.itemDiscount.type === 'fixed' ? c.itemDiscount.amount
              : (c.item.price * c.quantity * c.itemDiscount.amount) / 100
          ) : 0,
          itemTaxPercent: c.itemTaxPercent ?? 0,
        }))
      };

      const res = await ApiService.post('/pos/sale/submit', payload);
      if (res.success) {

        // === APPOINTMENT AUTO-COMPLETION TRIGGER ===
        if (redirectApptId) {
          try {
            await ApiService.appointments.updateStatus(redirectApptId, 'completed');
            console.log(`Appointment #${redirectApptId} marked as completed.`);
          } catch (err) {
            console.error("Auto-completing appointment failed:", err);
          }
        }

        const message = status === 'draft' ? 'Draft order saved!' :
          status === 'credit' ? 'Credit sale completed!' :
            'Transaction completed successfully!';
        toast.success(message);

        // Reset States
        setCurrentSale(null);
        setCart([]);
        setAppliedDiscount(null);
        setAppliedTaxPercent(null);
        setDiscountAmount('');
        setTaxInput('');
        setSelectedCustomerId(null);
        setSelectedStaffId(null);
        setRedirectApptId(null); // <-- Reset appointment state
        setActivePayMode('cash');
        setDueDate('');
      }
    } catch (e: any) { toast.error(e.message); }
  };
  const completeTransaction = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (activePayMode === 'card') {
      setShowCardModal(true);
    } else if (activePayMode === 'cheque') {
      setShowChequeModal(true);
    } else if (activePayMode === 'multiple') {
      setShowMultiPayModal(true);
    } else {
      submitSaleData('paid');
    }
  };

  const completeCardTransaction = async () => {
    if (!cardHolder.trim()) { toast.error('Card holder name is required'); return; }
    if (!cardTransactionNo.trim()) { toast.error('Card transaction number is required'); return; }
    setCardSubmitting(true);
    try {
      await submitSaleData('paid', 'paid', {
        transactionId: cardTransactionNo,
        paymentDetails: { cardHolder, cardType, cardMonth, cardYear, cardNumber: cardNumber.slice(-4) }
      });
      resetCardModal();
      setShowCardModal(false);
    } finally {
      setCardSubmitting(false);
    }
  };

  const completeChequeTransaction = async () => {
    if (!chequeNo.trim()) { toast.error('Cheque number is required'); return; }
    if (!chequeBankName.trim()) { toast.error('Bank name is required'); return; }
    if (!chequeDate) { toast.error('Cheque date is required'); return; }
    setChequeSubmitting(true);
    try {
      await submitSaleData('paid', 'paid', {
        paymentDetails: { chequeNo, chequeBankName, chequeDate, chequeAccountName }
      });
      resetChequeModal();
      setShowChequeModal(false);
    } finally {
      setChequeSubmitting(false);
    }
  };

  const completeMultiPayTransaction = async () => {
    if (multiPayRows.length === 0) { toast.error('Add at least one payment'); return; }

    // Rows validation
    for (const row of multiPayRows) {
      const amt = parseFloat(row.amount);
      if (!amt || amt <= 0) { toast.error('All payment amounts must be greater than 0'); return; }
      if (row.method === 'card') {
        if (!row.cardHolder?.trim()) { toast.error('Card holder name is required for card payments'); return; }
        if (!row.cardTransactionNo?.trim()) { toast.error('Card transaction number is required'); return; }
      }
      if (row.method === 'cheque') {
        if (!row.chequeNo?.trim()) { toast.error('Cheque number is required'); return; }
        if (!row.chequeBankName?.trim()) { toast.error('Bank name is required for cheque'); return; }
        if (!row.chequeDate) { toast.error('Cheque date is required'); return; }
      }
      if (row.method === 'bank_transfer') {
        if (!row.bankAccountId?.trim()) { toast.error('Please select a bank account for bank transfer'); return; }
        if (!row.transferReferenceNo?.trim()) { toast.error('Transfer reference number is required'); return; }
      }
    }

    const isFullPaid = Math.abs(multiPayTotal - total) < 0.01;
    const isPartial = multiPayTotal > 0 && !isFullPaid;
    const isCredit = multiPayTotal === 0;

    if (isCredit || isPartial) {
      // Both credit and partial sales require a registered customer
      if (!selectedCustomerId) {
        toast.error('Please select a REGISTERED customer for credit/partial sales');
        return;
      }
      // Verify it's not walk-in
      const isWalkIn = selectedCustomerId === null;
      if (isWalkIn) {
        toast.error('Credit/partial sales require a registered customer, not walk-in');
        return;
      }
    }

    const finalStatus = isCredit ? 'credit' : (isPartial ? 'partial' : 'paid');
    const finalPStat = isCredit ? 'due' : (isPartial ? 'due' : 'paid');

    setMultiPaySubmitting(true);
    try {
      const payments = multiPayRows.map(r => ({
        amount: parseFloat(r.amount),
        paymentMethod: r.method,
        transactionId: r.method === 'card' ? r.cardTransactionNo : null,
        paymentDetails: r.method === 'card' ? {
          cardHolder: r.cardHolder,
          cardNumber: r.cardNumber?.slice(-4),
          cardType: r.cardType,
          cardMonth: r.cardMonth,
          cardYear: r.cardYear
        } : r.method === 'cheque' ? {
          chequeNo: r.chequeNo,
          chequeDate: r.chequeDate,
          chequeBankName: r.chequeBankName,
          chequeAccountName: r.chequeAccountName
        }
          : r.method === 'bank_transfer' ? {
            bankAccountId: r.bankAccountId,
            transferReferenceNo: r.transferReferenceNo
          } : (r.method === 'other') ? {
            note: r.note
          } : null
      }));

      await submitSaleData(finalStatus as any, finalPStat, {
        payments,
        amountPaid: multiPayTotal,
        dueDate: (isCredit || isPartial) ? dueDate : null
      });
      resetMultiPayModal();
      setShowMultiPayModal(false);
    } finally {
      setMultiPaySubmitting(false);
    }
  };
  const subtotal = cart.reduce((s, ci) => {
    const base = ci.item.price * ci.quantity;
    const disc = ci.itemDiscount
      ? ci.itemDiscount.type === 'fixed'
        ? ci.itemDiscount.amount
        : (base * ci.itemDiscount.amount) / 100
      : 0;
    const taxBase = base - disc;
    const tax = ci.itemTaxPercent != null ? (taxBase * ci.itemTaxPercent) / 100 : 0;
    return s + taxBase + tax;
  }, 0);
  const discount = appliedDiscount
    ? appliedDiscount.type === 'fixed'
      ? appliedDiscount.amount
      : (subtotal * appliedDiscount.amount) / 100
    : 0;
  const taxBase = subtotal - discount;
  const tax = appliedTaxPercent != null
    ? (taxBase * appliedTaxPercent) / 100
    : 0;
  const total = Math.max(0, taxBase + tax);
  const multiPayTotal = multiPayRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const multiPayRemaining = total - multiPayTotal;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  // Inside your POS() function, right after the hook declarations:
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  // Initialize the channel ONCE on mount
  useEffect(() => {
    if (!broadcastChannelRef.current) {
      broadcastChannelRef.current = new BroadcastChannel('pos_sync');
      console.log('✅ POS: BroadcastChannel initialized');
    }

    return () => {
      // Don't close - keep channel alive for entire session
    };
  }, []); // EMPTY dependency array - runs ONCE


  // ── Customer Display Sync ──────────────────────────────────────────────────
  useEffect(() => {
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'Select Branch';

    const cartData = {
      cart, subtotal, discount, tax, total, itemCount,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerCode: selectedCustomer ? `C${String(selectedCustomer.id).padStart(5, '0')}` : 'CO0005',
      branchName,
      staffName: staff.find(s => s.id === selectedStaffId)
        ? `${staff.find(s => s.id === selectedStaffId).firstName} ${staff.find(s => s.id === selectedStaffId).lastName || ""}`
        : null,
      currencySymbol: symbol,
      activePayMode,
      multiPayTotal,
      timestamp: new Date().getTime()
    };

    try {
      // Save to localStorage FIRST
      localStorage.setItem('pos_cart_data', JSON.stringify(cartData));

      // Then broadcast
      if (broadcastChannelRef.current) {
        const timeoutId = setTimeout(() => {
          broadcastChannelRef.current?.postMessage({
            type: 'UPDATE_CART',
            payload: cartData
          });
        }, 10);
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error syncing cart:', error);
    }

  }, [cart, subtotal, discount, tax, total, itemCount, selectedCustomerId, customers, symbol, activePayMode, multiPayTotal, staff, selectedStaffId, branches, selectedBranchId]);
  const filteredItems = items.filter(item => {
    const q = debouncedItemSearch.trim().toLowerCase();

    // Server already filtered by search; do not hide matches behind category/brand tabs
    if (q) return true;

    if (filterType === 'category') {
      return (
        activeCategory === 'all' ||
        item.categoryId?.toString() === activeCategory
      );
    }

    if (filterType === 'brand') {
      return (
        activeBrand === 'all' ||
        item.brandId?.toString() === activeBrand
      );
    }

    return true;
  });

  const isSearchPending =
    itemSearch.trim() !== debouncedItemSearch.trim();

  const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'Select Branch';
  const deleteDraftOrder = async (saleId: number) => {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete draft order #${saleId}? This action cannot be undone.`)) {
      return;
    }

    try {

      await ApiService.delete(`/pos/sale/${saleId}`);

      toast.success(`Draft order #${saleId} deleted successfully`);

      // Refresh the drafts list
      await fetchSavedSales();

      // If the deleted order was currently loaded, clear it
      if (currentSale?.id === saleId) {
        setCurrentSale(null);
        setCart([]);
        setAppliedDiscount(null);
        setAppliedTaxPercent(null);
        setDiscountAmount('');
        setTaxInput('');
        setSelectedCustomerId(null);
        setSelectedStaffId(null);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to delete draft order');
    }
  };
  const openItemEditModal = (index: number) => {
    const ci = cart[index];
    setEditingCartIndex(index);
    setItemDiscountType(ci.itemDiscount?.type ?? 'percentage');
    setItemDiscountAmount(ci.itemDiscount ? String(ci.itemDiscount.amount) : '');
    setItemTaxInput(ci.itemTaxPercent != null ? String(ci.itemTaxPercent) : '');
    setShowItemEditModal(true);
  };

  const applyItemEdits = () => {
    if (editingCartIndex === null) return;
    const discAmt = parseFloat(itemDiscountAmount);
    const taxPct = parseFloat(itemTaxInput);
    setCart(prev => prev.map((ci, i) => i === editingCartIndex ? {
      ...ci,
      itemDiscount: (!isNaN(discAmt) && discAmt > 0) ? { type: itemDiscountType, amount: discAmt } : null,
      itemTaxPercent: (!isNaN(taxPct) && taxPct > 0) ? taxPct : null,
    } : ci));
    setShowItemEditModal(false);
  };

  return (
    <FormProvider {...form}>
    <TooltipProvider>
      <>
        <div style={{
          display: 'flex', height: '100vh', width: '100vw',
          background: C.bg, fontFamily: "'Inter', system-ui, sans-serif",
          overflow: 'hidden',
        }}>

          {/* 📋 LEFT — Cart Panel */}
          <div style={{
            width: '45%', background: C.surface, borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', flexShrink: 0,
            boxShadow: '4px 0 16px rgba(0,0,0,0.03)',
          }}>

            <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border}`, background: '#fcfcfd' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, background: C.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 3px 6px ${C.primary}40`,
                  }}>
                    <ShoppingCart size={16} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, color: C.text, letterSpacing: '-0.2px' }}>Current Order</span>
                  {itemCount > 0 && (
                    <span style={{
                      background: C.amber, color: '#fff', borderRadius: 20,
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    }}>{itemCount}</span>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px',
                  height: 34, borderRadius: 10, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, boxShadow: `0 0 8px ${C.primary}` }} />
                  <span style={{ fontSize: 11, color: C.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{branchName}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {/* Customer Dropdown - takes 60% width */}
                <div style={{ flex: 1.5 }}>
                  <CustomerDropdown
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelect={(id) => {
                      setSelectedCustomerId(id);
                      if (currentSale?.id) {
                        ApiService.patch(`/pos/sale/${currentSale.id}`, { customerId: id }).then((res: any) => {
                          if (res.data) setCurrentSale(res.data);
                        });
                      }
                    }}
                  />
                </div>

                {/* New Customer Button */}
                <LightIconBtn icon={<Plus size={14} />} accent title="New Customer" onClick={openAddCustomerModal} />

                {/* Service Dropdown - takes 40% width */}
                <div style={{ flex: 2 }}>
                  <ServiceDropdown
                    services={services}
                    selectedServiceId={selectedServiceId}
                    onSelect={(id) => {
                      setSelectedServiceId(id);
                      if (id != null) {
                        const service = services.find(s => Number(s.id) === Number(id));
                        if (service) {
                          const serviceAsItem: POSItem = {
                            id: service.id,
                            name: service.serviceName,
                            price: service.price,
                            categoryId: service.categoryId,
                            categoryName: service.categoryName || (service.isPackage ? 'Package' : 'Service'),
                            productType: 'single',
                            sku: service.serviceCode || (service.isPackage ? `PKG-${service.id}` : `SRV-${service.id}`),
                            itemType: service.isPackage ? 'package' : 'service',
                          };
                          addToCart(serviceAsItem);
                          toast.success(`Added ${service.serviceName} to cart`);
                        }
                      }
                    }}
                  />
                </div>

                {/* <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <StaffDropdown
                    staff={staff}
                    selectedStaffId={selectedStaffId}
                    onSelect={(id) => {
                      setSelectedStaffId(id);
                      if (currentSale?.id) {
                        ApiService.patch(`/pos/sale/${currentSale.id}`, { staffId: id }).then((res: any) => {
                          if (res.data) setCurrentSale(res.data);
                        });
                      }
                    }}
                  />
                </div>
              </div> */}


              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
              {cart.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 12, opacity: 0.8,
                }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 18, background: '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px dashed ${C.borderMid}`,
                  }}>
                    <ShoppingCart size={24} color={C.textMuted} />
                  </div>
                  <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 600, margin: 0 }}>Basket is empty</p>
                </div>
              ) : (
                cart.map((ci, i) => (
                  <CartRow
                    key={`${ci.item.id}-${ci.item.name}`}
                    cartItem={ci}
                    onRemove={() => removeFromCart(ci.item.id, ci.item.name)}
                    onUpdateQty={(delta) => updateQuantity(ci.item.id, ci.item.name, delta)}
                    onEdit={() => openItemEditModal(i)}
                  />
                ))
              )}
            </div>

            <div style={{ padding: '4px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6, overflowX: 'auto', background: '#fcfcfd' }}>
              <button onClick={() => setShowDiscountModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${C.border}`, background: C.surface, color: C.textSub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <span style={{ color: C.green }}><Percent size={11} /></span>Discount
              </button>
              <button onClick={() => setShowTaxModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${C.border}`, background: C.surface, color: C.textSub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <span style={{ color: C.amber }}><Hash size={11} /></span>Tax
              </button>
            </div>

            <div style={{ padding: '4px 16px 0px 16px', borderTop: `2px solid ${C.border}`, background: '#fcfcfd' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TotalRow label="SUBTOTAL" value={subtotal} />
                {discount > 0 && (
                  <TotalRow
                    label={`DISCOUNT (${appliedDiscount?.type === 'percentage' ? `${appliedDiscount.amount}%` : 'Fixed'})`}
                    value={-discount}
                    accent={C.green}
                  />
                )}
                {tax > 0 && <TotalRow label={appliedTaxPercent != null ? `TAX (${appliedTaxPercent}%)` : 'TAX (GST)'} value={tax} accent={C.amber} />}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 0, paddingTop: 2, borderTop: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textSub, textTransform: 'uppercase' }}>
                    Total Due
                  </span>
                  <span style={{ fontSize: 32, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '2px 16px 4px' }}>
              <div style={{
                display: 'flex', gap: 5, background: '#f1f5f9',
                borderRadius: 12, padding: 5, border: `1px solid ${C.border}`,
              }}>
                {([
                  { key: 'cash', label: 'CASH', icon: <Banknote size={14} /> },
                  { key: 'card', label: 'CARD', icon: <CreditCard size={14} /> },
                  { key: 'cheque', label: 'CHEQUE', icon: <Clipboard size={14} /> },
                  { key: 'multiple', label: 'MULTI PAY', icon: <Receipt size={14} /> },
                ] as const).map(({ key, label, icon }) => (
                  <button key={key}
                    onClick={() => setActivePayMode(key)}
                    style={{
                      flex: 1, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 10, fontWeight: 700,
                      background: activePayMode === key ? C.surface : 'transparent',
                      color: activePayMode === key ? C.primary : C.textMuted,
                      boxShadow: activePayMode === key ? '0 3px 8px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0 16px 8px', display: 'flex', gap: 10 }}>
              <button onClick={() => submitSaleData('draft')} style={ghostBtnStyle}>Draft Order</button>
              <button
                onClick={() => {
                  if (selectedCustomerId == null) {
                    toast.error('Please select a customer for credit sales');
                    return;
                  }
                  setShowCreditModal(true);
                }}
                style={{ ...ghostBtnStyle, borderColor: C.amber, color: C.amber }}
              >
                Credit
              </button>
              <button
                onClick={completeTransaction}
                style={{
                  flex: 1, height: 44, borderRadius: 12, border: 'none',
                  background: C.primary, color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 4px 14px ${C.primary}50`,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                <CheckCircle2 size={18} /> COMPLETE TRANSACTION
              </button>
            </div>
          </div>

          {/* 📦 RIGHT — Product Navigator */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '55%' }}>

            <div style={{
              height: 64,
              background: C.surface,
              borderBottom: `2px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              gap: 14,
              flexShrink: 0,
              justifyContent: 'space-between' // 🔥 IMPORTANT
            }}>
              {/* <div style={{
            flex: 1, maxWidth: 400, height: 42, borderRadius: 12,
            background: '#f1f5f9', border: `1.5px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
          }}>
            <Search size={16} color={C.textMuted} />
            <input
              value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              placeholder="Search catalog or scan barcode…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 14, color: C.text, fontWeight: 600, fontFamily: 'inherit',
              }}
            />

          </div> */}
              <div style={{
                position: 'relative', // 🔥 IMPORTANT
                flex: 1,
                maxWidth: 400,
                height: 42,
                borderRadius: 12,
                background: '#f1f5f9',
                border: `1.5px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 14px',
              }}>

                {/* 🔍 Search */}
                <Search size={16} color={C.textMuted} />

                <input
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="Search by name or sku..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                  }}
                />

              </div>




              <div style={{ display: 'flex', gap: 6 }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<ArrowLeft size={16} />} onClick={() => window.location.href = '/'} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Back to Dashboard</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div style={{ position: 'relative' }}>
                      <span><LightIconBtn icon={<RotateCcw size={16} color={C.red} />} onClick={() => setShowReturnModal(!showReturnModal)} /></span>
                      {showReturnModal && (
                        <>
                          <div 
                            style={{
                              position: 'absolute', top: '135%', right: -80, width: 260,
                              background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`,
                              boxShadow: '0 16px 40px -12px rgba(0,0,0,0.2)', zIndex: 100,
                              display: 'flex', flexDirection: 'column',
                              overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
                            }}
                          >
                            {/* Little triangle arrow pointing up */}
                            <div style={{
                              position: 'absolute', top: -7, left: '50%', marginLeft: -7,
                              width: 14, height: 14, background: '#fff',
                              borderLeft: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`,
                              transform: 'rotate(45deg)', zIndex: 1
                            }} />
                            
                            <div style={{ 
                              padding: '12px 16px', borderBottom: `1px solid ${C.border}`, 
                              zIndex: 2, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 
                            }}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RotateCcw size={12} color={C.primary} />
                              </div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Sell Return</p>
                            </div>
                            
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, zIndex: 2, background: '#fff' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Invoice Number
                                </label>
                                <input 
                                  autoFocus
                                  placeholder="e.g. INV-0012" 
                                  value={returnInvoiceNumber}
                                  onChange={e => setReturnInvoiceNumber(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleSellReturn()}
                                  style={{
                                    width: '100%', height: 42, border: `1.5px solid ${C.border}`,
                                    borderRadius: 8, padding: '0 12px', fontSize: 14, outline: 'none', 
                                    color: C.text, fontWeight: 600, background: '#f8fafc',
                                    transition: 'border-color 0.2s'
                                  }} 
                                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                                />
                              </div>
                              
                              <button 
                                onClick={handleSellReturn}
                                disabled={loadingReturn}
                                style={{
                                  width: '100%', height: 42, borderRadius: 8, border: 'none',
                                  background: loadingReturn ? C.primaryLight : 'linear-gradient(135deg, #6d28d9, #4c1d95)', 
                                  color: '#fff', fontSize: 14, fontWeight: 700,
                                  cursor: loadingReturn ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: '0 4px 12px rgba(109,40,217,0.25)', gap: 8,
                                  transition: 'transform 0.1s'
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                {loadingReturn ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  {!showReturnModal && <TooltipContent>Sell Return</TooltipContent>}
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<Pause size={16} />} onClick={() => { setShowDraftsModal(true); fetchSavedSales(); }} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Draft Orders</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<Calculator size={16} />} onClick={() => setShowCalculator(true)} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Calculator</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<Maximize size={16} />} onClick={toggleFullscreen} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Fullscreen</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<Monitor size={16} />} onClick={openCustomerDisplay} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Customer Display</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<FileText size={16} />} onClick={() => setShowRegisterModal(true)} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Register Details</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><LightIconBtn icon={<X size={16} />} danger /></span>
                  </TooltipTrigger>
                  <TooltipContent>Close Register</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderBottom: `1px solid ${C.border}`,
              padding: '12px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flexShrink: 0,
            }}>
              {/* 🔘 Filter Type Toggles */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    setFilterType('category');
                    setActiveCategory('all');
                    setActiveBrand('all');
                  }}
                  style={{
                    flex: 1, justifyContent: 'center',
                    height: 38, padding: '0 20px', borderRadius: 10,
                    border: filterType === 'category' ? `2px solid ${C.primary}` : `1.5px solid ${C.border}`,
                    background: filterType === 'category' ? C.primaryLight : '#fff',
                    color: filterType === 'category' ? C.primary : C.textSub,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: filterType === 'category' ? '0 4px 12px rgba(109, 40, 217, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <Package size={16} /> CATEGORY
                </button>
                <button
                  onClick={() => {
                    setFilterType('brand');
                    setActiveCategory('all');
                    setActiveBrand('all');
                  }}
                  style={{
                    flex: 1, justifyContent: 'center',
                    height: 38, padding: '0 20px', borderRadius: 10,
                    border: filterType === 'brand' ? `2px solid ${C.primary}` : `1.5px solid ${C.border}`,
                    background: filterType === 'brand' ? C.primaryLight : '#fff',
                    color: filterType === 'brand' ? C.primary : C.textSub,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: filterType === 'brand' ? '0 4px 12px rgba(109, 40, 217, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <Hash size={16} /> BRAND
                </button>
                {/* <button
              onClick={() => {
                setFilterType('customers');
                setActiveCategory('all');
                setActiveBrand('all');
              }}
              style={{
                flex: 1, justifyContent: 'center',
                height: 38, padding: '0 20px', borderRadius: 10,
                border: filterType === 'customers' ? `2px solid ${C.primary}` : `1.5px solid ${C.border}`,
                background: filterType === 'customers' ? C.primaryLight : '#fff',
                color: filterType === 'customers' ? C.primary : C.textSub,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
                boxShadow: filterType === 'customers' ? '0 4px 12px rgba(109, 40, 217, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <Users size={16} /> CUSTOMERS
            </button> */}
              </div>

              {/* 🏷️ Sub-items List */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center', paddingBottom: 4 }}>
                {filterType === 'category' ? (
                  [{ id: 'all', name: 'ALL PRODUCTS' }, ...categories.map(c => ({ id: c.id.toString(), name: c.name.toUpperCase() }))].map(c => (
                    <button key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      style={{
                        height: 32, padding: '0 18px', borderRadius: 10,
                        border: activeCategory === c.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                        background: C.surface,
                        color: activeCategory === c.id ? C.primary : C.textMuted,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        boxShadow: activeCategory === c.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {c.name}
                    </button>
                  ))
                ) : (
                  [{ id: 'all', name: 'ALL BRANDS' }, ...brands.map(b => ({ id: b.id.toString(), name: b.name.toUpperCase() }))].map(b => (
                    <button key={b.id}
                      onClick={() => setActiveBrand(b.id)}
                      style={{
                        height: 32, padding: '0 18px', borderRadius: 10,
                        border: activeBrand === b.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                        background: C.surface,
                        color: activeBrand === b.id ? C.primary : C.textMuted,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        boxShadow: activeBrand === b.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {b.name}
                    </button>
                  ))
                )}
              </div>
            </div>


            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {loadingItems || isSearchPending ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                  <Loader2 size={32} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: C.textSub, fontWeight: 700 }}>SYNCING CATALOG…</span>
                </div>
              ) : filterType === 'customers' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                  <div
                    onClick={() => { setSelectedCustomerId(null); setFilterType('category'); }}
                    style={{
                      background: !selectedCustomerId ? C.primaryLight : C.surface,
                      borderRadius: 14, border: `2px solid ${!selectedCustomerId ? C.primary : C.border}`,
                      padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} color={C.textMuted} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Walk-in Customer</span>
                  </div>
                  {customers.filter(c => c.name.toLowerCase().includes(itemSearch.toLowerCase())).map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => { setSelectedCustomerId(customer.id); setFilterType('category'); }}
                      style={{
                        background: selectedCustomerId === customer.id ? C.primaryLight : C.surface,
                        borderRadius: 14, border: `2px solid ${selectedCustomerId === customer.id ? C.primary : C.border}`,
                        padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} color={C.blue} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{customer.name}</span>
                            {customer.platinum && (
                              <span style={{
                                background: 'linear-gradient(45deg, #ffd700, #ff8c00)',
                                color: '#fff', fontSize: 8, fontWeight: 800,
                                padding: '1px 5px', borderRadius: 4,
                              }}>PLATINUM</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {customer.mobile && <span style={{ fontSize: 11, color: C.textMuted }}>{customer.mobile}</span>}
                            {customer.customerGroup && (
                              <span style={{ fontSize: 10, color: C.primary, fontWeight: 600 }}>{customer.customerGroup}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.5 }}>
                  <Package size={40} color={C.textMuted} />
                  <p style={{ color: C.textMuted, fontSize: 14, fontWeight: 600 }}>No results found</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                  {filteredItems.map(item => (
                    <ProductCard key={item.variationId ? `v-${item.variationId}` : `p-${item.id}`} item={item} onAdd={() => addToCart(item)} />
                  ))}
                </div>
              )}

              <div ref={observerTarget} style={{ height: 20, width: '100%' }} />

              {loadingMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <Loader2 size={24} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
          </div>

          <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

          {/* ── Card Payment Modal ──────────────────────────────────────── */}
          {showCardModal && (
            <div style={overlayStyle} onClick={() => { setShowCardModal(false); resetCardModal(); }}>
              <div onClick={e => e.stopPropagation()} style={{
                width: 480, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 18,
                boxShadow: '0 24px 64px rgba(0,0,0,0.24)', display: 'flex', flexDirection: 'column',
              }}>
                {/* Header */}
                <div style={{
                  padding: '16px 24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={18} color="#fff" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Card Payment</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Total: {formatCurrency(total)}</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowCardModal(false); resetCardModal(); }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Card Visual Preview */}
                <div style={{ padding: '14px 24px 0' }}>
                  <div style={{
                    height: 100, borderRadius: 14,
                    background: 'linear-gradient(135deg, #312e81 0%, #6d28d9 60%, #a78bfa 100%)',
                    padding: '14px 18px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: '0 6px 18px rgba(109,40,217,0.3)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', right: -15, top: -15, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>{cardType}</span>
                      <div style={{ width: 32, height: 20, borderRadius: 3, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', opacity: 0.85 }} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '2.5px', fontFamily: 'monospace' }}>
                        {cardNumber ? cardNumber.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase' }}>{cardHolder || 'CARD HOLDER'}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{cardMonth && cardYear ? `${cardMonth}/${cardYear}` : 'MM/YY'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div style={{ padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Row 1: Card Number + Holder */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Card Number</label>
                      <input maxLength={19} placeholder="•••• •••• •••• ••••" value={cardNumber} autoComplete="off" name="pos-card-number"
                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, fontFamily: 'monospace', letterSpacing: '1px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Card Holder <span style={{ color: '#ef4444' }}>*</span></label>
                      <input placeholder="Name on card" value={cardHolder} autoComplete="cc-name" name="mp_full_owner_pos"
                        onChange={e => setCardHolder(e.target.value.toUpperCase())}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {/* Row 2: Transaction No */}
                  {/* Row 2: Transaction No */}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Transaction Number <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      placeholder="e.g. TXN-123456"
                      value={cardTransactionNo}
                      autoComplete="one-time-code"
                      name="mp_tx_ref_val"
                      type="text"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      onChange={e => setCardTransactionNo(e.target.value)}
                      style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Row 3: Type + Month + Year + CVV */}
                  {/* <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.7fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Card Type</label>
                      <select value={cardType} onChange={e => setCardType(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 8px', fontSize: 12, fontWeight: 600, outline: 'none', background: '#f8fafc', cursor: 'pointer' }}>
                        {['VISA', 'Mastercard', 'AMEX', 'UnionPay', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Month</label>
                      <select value={cardMonth} onChange={e => setCardMonth(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 6px', fontSize: 12, fontWeight: 600, outline: 'none', background: '#f8fafc', cursor: 'pointer' }}>
                        <option value="">MM</option>
                        {Array.from({ length: 12 }, (_, i) => { const m = String(i + 1).padStart(2, '0'); return <option key={m} value={m}>{m}</option>; })}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Year</label>
                      <select value={cardYear} onChange={e => setCardYear(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 6px', fontSize: 12, fontWeight: 600, outline: 'none', background: '#f8fafc', cursor: 'pointer' }}>
                        <option value="">YY</option>
                        {Array.from({ length: 10 }, (_, i) => { const y = String(new Date().getFullYear() + i).slice(-2); return <option key={y} value={y}>{y}</option>; })}
                      </select>
                    </div>
                    <div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>CVV</label>
                        <input type="password" maxLength={4} value={cardCVV}
                          onChange={e => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 8px', fontSize: 14, textAlign: 'center', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  </div> */}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 24px 18px', display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowCardModal(false); resetCardModal(); }}
                    style={{ height: 42, padding: '0 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={completeCardTransaction} disabled={cardSubmitting}
                    style={{
                      flex: 1, height: 42, borderRadius: 10, border: 'none',
                      background: cardSubmitting ? '#a78bfa' : 'linear-gradient(135deg, #6d28d9, #4c1d95)',
                      color: '#fff', fontSize: 13, fontWeight: 700, cursor: cardSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 3px 12px rgba(109,40,217,0.3)',
                    }}>
                    <CheckCircle2 size={15} />
                    {cardSubmitting ? 'Processing...' : `Charge ${formatCurrency(total)}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Cheque Payment Modal ─────────────────────────────────────── */}
          {showChequeModal && (
            <div style={overlayStyle} onClick={() => { setShowChequeModal(false); resetChequeModal(); }}>
              <div onClick={e => e.stopPropagation()} style={{
                width: 460, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 18,
                boxShadow: '0 24px 64px rgba(0,0,0,0.24)', display: 'flex', flexDirection: 'column',
              }}>
                {/* Header */}
                <div style={{
                  padding: '16px 24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clipboard size={18} color="#fff" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Cheque Payment</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Total: {formatCurrency(total)}</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowChequeModal(false); resetChequeModal(); }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Form */}
                <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Row 1: Cheque No + Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Cheque No. <span style={{ color: '#ef4444' }}>*</span></label>
                      <input placeholder="000123456" value={chequeNo} autoComplete="off" name="pos-cheque-no"
                        onChange={e => setChequeNo(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, fontFamily: 'monospace', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Cheque Date <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', cursor: 'pointer' }} />
                    </div>
                  </div>

                  {/* Row 2: Bank Name + Account */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Bank Name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input placeholder="e.g. HBL" value={chequeBankName} autoComplete="off" name="pos-cheque-bank"
                        onChange={e => setChequeBankName(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Account Holder</label>
                      <input placeholder="Name on cheque" value={chequeAccountName} autoComplete="cc-name" name="mp_bank_owner_pos"
                        onChange={e => setChequeAccountName(e.target.value)}
                        style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {/* Pending notice */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef3c7', borderRadius: 6, padding: '6px 10px', border: '1px solid #fde68a' }}>
                    <span style={{ fontSize: 11 }}>⚠️</span>
                    <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>Cheque marked as <strong>Pending</strong> until cleared.</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 24px 18px', display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowChequeModal(false); resetChequeModal(); }}
                    style={{ height: 42, padding: '0 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={completeChequeTransaction} disabled={chequeSubmitting}
                    style={{
                      flex: 1, height: 42, borderRadius: 10, border: 'none',
                      background: chequeSubmitting ? '#a78bfa' : 'linear-gradient(135deg, #6d28d9, #4c1d95)',
                      color: '#fff', fontSize: 13, fontWeight: 700, cursor: chequeSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 3px 12px rgba(109,40,217,0.3)',
                    }}>
                    <CheckCircle2 size={15} />
                    {chequeSubmitting ? 'Saving...' : `Record Cheque — ${formatCurrency(total)}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Multi Payment Modal ──────────────────────────────────────── */}
          {showMultiPayModal && (
            <div style={overlayStyle} onClick={() => { setShowMultiPayModal(false); resetMultiPayModal(); }}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 520, maxWidth: '96vw', maxHeight: '90vh',
                  background: '#fff', borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '18px 20px 14px',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Receipt size={18} color="#fff" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Split Payment</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Bill Total: {formatCurrency(total)}</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowMultiPayModal(false); resetMultiPayModal(); }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Summary Bar */}
                <div style={{
                  padding: '10px 20px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: multiPayRemaining <= 0.01 ? '#f0fdf4' : '#fffbeb', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                    Paid: <strong style={{ color: '#059669' }}>{formatCurrency(multiPayTotal)}</strong>
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: multiPayRemaining <= 0.01 ? '#dcfce7' : '#fef3c7',
                    color: multiPayRemaining <= 0.01 ? '#166534' : '#92400e',
                  }}>
                    {multiPayRemaining <= 0.01
                      ? (multiPayRemaining < -0.01 ? `Change: ${formatCurrency(Math.abs(multiPayRemaining))}` : '✓ Covered')
                      : `Remaining: ${formatCurrency(multiPayRemaining)}`}
                  </span>
                </div>

                {/* Payment Rows */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {multiPayRows.map((row, idx) => (
                    <div key={row.id} style={{
                      border: `1px solid ${C.border}`, borderRadius: 10,
                      overflow: 'hidden', background: '#fff',
                    }}>
                      {/* Main Row: # | Method | Amount | Remove */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 800,
                          background: '#e0e7ff', color: '#4338ca',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{idx + 1}</span>

                        <select value={row.method}
                          onChange={e => updateMultiPayRow(row.id, { method: e.target.value as any })}
                          style={{
                            width: 130, height: 34, borderRadius: 8, border: `1px solid ${C.border}`,
                            padding: '0 8px', fontSize: 12, fontWeight: 600, outline: 'none', background: '#f8fafc', cursor: 'pointer',
                          }}>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="cheque">Cheque</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="other">Other</option>
                        </select>

                        <div style={{ flex: 1, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{symbol}</span>
                          <input type="number" placeholder="0.00" value={row.amount} autoComplete="off" name={`mp-amount-${row.id}`}
                            onChange={e => updateMultiPayRow(row.id, { amount: e.target.value })}
                            style={{
                              width: '100%', height: 34, borderRadius: 8, border: `1px solid ${C.border}`,
                              padding: '0 8px 0 28px', fontSize: 13, fontWeight: 700, outline: 'none', background: '#f8fafc', boxSizing: 'border-box',
                            }} />
                        </div>

                        {multiPayRows.length > 1 && (
                          <button onClick={() => removeMultiPayRow(row.id)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Card Sub-Fields */}
                      {row.method === 'card' && (
                        <div style={{ padding: '8px 12px 10px', borderTop: `1px solid #ede9fe`, background: '#faf5ff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed' }}>Card Holder *</label>
                            <input placeholder="Name" value={row.cardHolder || ''} autoComplete="cc-name" name={`mp_split_own_${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { cardHolder: e.target.value.toUpperCase() })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #ddd6fe', padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed' }}>Transaction No. *</label>
                            <input placeholder="TXN-123" value={row.cardTransactionNo || ''} autoComplete="one-time-code" name={`mp_split_ref_${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { cardTransactionNo: e.target.value })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #ddd6fe', padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed' }}>Card Number</label>
                            <input placeholder="•••• •••• •••• ••••" maxLength={16} value={row.cardNumber || ''} autoComplete="off" name={`mp-cn-${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #ddd6fe', padding: '0 8px', fontSize: 11, fontFamily: 'monospace', outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed' }}>Card Type</label>
                            <select value={row.cardType || 'VISA'} onChange={e => updateMultiPayRow(row.id, { cardType: e.target.value })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #ddd6fe', padding: '0 6px', fontSize: 11, fontWeight: 600, outline: 'none', background: '#fff', cursor: 'pointer', marginTop: 3 }}>
                              {['VISA', 'Mastercard', 'AMEX', 'UnionPay', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Cheque Sub-Fields */}
                      {row.method === 'cheque' && (
                        <div style={{ padding: '8px 12px 10px', borderTop: `1px solid #ccfbf1`, background: '#f0fdfa', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#0d9488' }}>Cheque No. *</label>
                            <input placeholder="000123" value={row.chequeNo || ''} autoComplete="off" name={`mp-cq-${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { chequeNo: e.target.value })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #99f6e4', padding: '0 8px', fontSize: 11, fontFamily: 'monospace', outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#0d9488' }}>Cheque Date *</label>
                            <input type="date" value={row.chequeDate || ''}
                              onChange={e => updateMultiPayRow(row.id, { chequeDate: e.target.value })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #99f6e4', padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer', marginTop: 3 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#0d9488' }}>Bank Name *</label>
                            <input placeholder="Bank name" value={row.chequeBankName || ''} autoComplete="off" name={`mp-cb-${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { chequeBankName: e.target.value })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #99f6e4', padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#0d9488' }}>Account Name</label>
                            <input placeholder="Name on cheque" value={row.chequeAccountName || ''} autoComplete="off" name={`mp-ca-${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { chequeAccountName: e.target.value })}
                              style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid #99f6e4', padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                        </div>
                      )}

                      {/* Bank Transfer Sub-Fields */}
                      {row.method === 'bank_transfer' && (
                        <div style={{ padding: '8px 12px 10px', borderTop: `1px solid #dbeafe`, background: '#eff6ff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Select Bank Account */}
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#2563eb' }}>Select Bank Account *</label>
                            <select
                              value={row.bankAccountId || ''}
                              onChange={e => {
                                updateMultiPayRow(row.id, { bankAccountId: e.target.value });
                              }}
                              style={{
                                width: '100%', height: 34, borderRadius: 6, border: '1px solid #bfdbfe',
                                padding: '0 8px', fontSize: 11, fontWeight: 600, outline: 'none',
                                background: '#fff', cursor: 'pointer', marginTop: 3,
                              }}
                            >
                              <option value="">Select Account</option>
                              {bankAccounts.map((acc: any) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.bankName} - {acc.accountNumber}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Reference/Transaction No. */}
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#2563eb' }}>Reference/Transaction No. *</label>
                            <input
                              placeholder="e.g. TRF-123456"
                              value={row.transferReferenceNo || ''}
                              autoComplete="off"
                              name={`mp-tr-${row.id}`}
                              onChange={e => updateMultiPayRow(row.id, { transferReferenceNo: e.target.value })}
                              style={{
                                width: '100%', height: 30, borderRadius: 6, border: '1px solid #bfdbfe',
                                padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff',
                                boxSizing: 'border-box', marginTop: 3
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Other - Note */}
                      {row.method === 'other' && (
                        <div style={{ padding: '8px 12px 10px', borderTop: `1px solid ${C.border}`, background: '#f8fafc' }}>
                          <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>Note</label>
                          <input placeholder="Reference or note..." value={row.note || ''} autoComplete="off" name={`mp-note-${row.id}`}
                            onChange={e => updateMultiPayRow(row.id, { note: e.target.value })}
                            style={{ width: '100%', height: 30, borderRadius: 6, border: `1px solid ${C.border}`, padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff', boxSizing: 'border-box', marginTop: 3 }} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Row */}
                  {/* Add Row Button */}
                  <button onClick={addMultiPayRow}
                    style={{
                      height: 36, borderRadius: 8, border: `1.5px dashed ${C.border}`, background: '#f8fafc',
                      color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Plus size={14} /> Add Payment
                  </button>



                  {/* 📅 Due Date Input for Partial Payments (Ab ye HAMESHA dikhega jab udhaar bacha ho) */}
                  {multiPayRemaining > 0.01 && (
                    <div style={{
                      border: `1px solid #fde68a`, borderRadius: 10,
                      padding: '12px 14px', background: '#fffbeb',
                      display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4,
                    }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                        Repayment Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{
                          width: '100%', height: 34, borderRadius: 8, border: '1px solid #fcd34d',
                          padding: '0 10px', fontSize: 12, fontWeight: 600, outline: 'none', background: '#fff',
                          cursor: 'pointer',
                        }}
                      />

                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: '12px 20px', borderTop: `1px solid ${C.border}`,
                  display: 'flex', gap: 10, flexShrink: 0, background: '#fcfcfd',
                }}>
                  <button onClick={() => { setShowMultiPayModal(false); resetMultiPayModal(); }}
                    style={{
                      height: 40, padding: '0 20px', borderRadius: 10,
                      border: `1px solid ${C.border}`, background: '#fff',
                      color: C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>Cancel</button>
                  <button
                    onClick={completeMultiPayTransaction}
                    disabled={multiPaySubmitting || (multiPayRemaining > 0.01 && !selectedCustomerId)}
                    style={{
                      flex: 1, height: 40, borderRadius: 10, border: 'none',
                      cursor: (multiPaySubmitting || (multiPayRemaining > 0.01 && !selectedCustomerId)) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: (multiPayRemaining <= 0.01 || selectedCustomerId) ? '0 4px 14px rgba(109,40,217,0.35)' : 'none',
                    }}>
                    <CheckCircle2 size={16} />
                    {multiPaySubmitting ? 'Processing...' : (multiPayRemaining > 0.01 && !selectedCustomerId) ? `Remaining ${formatCurrency(multiPayRemaining)}` : (multiPayRemaining > 0.01 ? 'Complete Partial Sale' : 'Complete Sale')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Add Customer Modal ─────────────────────────────────────── */}
          {showAddCustomerModal && (
            <div style={overlayStyle} onClick={closeAddCustomerModal}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 560, maxWidth: '95vw', maxHeight: '92vh',
                  background: '#fff', borderRadius: 18,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '20px 24px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  background: '#fcfcfd',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Add Customer</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>Step {addCustStep} of 3</p>
                    </div>
                    <button
                      onClick={closeAddCustomerModal}
                      style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Step Indicators */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { step: 1, label: 'Contact', icon: <User size={16} /> },
                      { step: 2, label: 'Financial', icon: <DollarSign size={16} /> },
                      { step: 3, label: 'Custom Fields', icon: <Package size={16} /> },
                    ].map(({ step, label, icon }) => (
                      <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: addCustStep === step ? C.primary : addCustStep > step ? C.green : '#f1f5f9',
                          color: addCustStep >= step ? '#fff' : C.textMuted,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: addCustStep === step ? `2px solid ${C.primary}` : `1.5px solid ${addCustStep > step ? C.green : C.border}`,
                          transition: 'all 0.25s',
                        }}>{icon}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: addCustStep >= step ? C.text : C.textMuted, letterSpacing: '0.2px' }}>{label.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  <form id="pos-add-cust-form" onSubmit={handleAddCustomerSubmit}>

                    {/* ── Step 1: Contact ── */}
                    {addCustStep === 1 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {([
                          { key: 'name', label: 'Name *', placeholder: 'Customer name', type: 'text', colSpan: 1 },
                          { key: 'businessName', label: 'Business Name', placeholder: 'Business name', type: 'text', colSpan: 1 },
                          { key: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email', colSpan: 1 },
                          { key: 'mobile', label: 'Mobile', placeholder: '+1 234 567 8900', type: 'text', colSpan: 1 },
                          { key: 'address', label: 'Address', placeholder: 'Street address', type: 'text', colSpan: 2 },
                          { key: 'taxNumber', label: 'Tax Number', placeholder: 'Tax / VAT number', type: 'text', colSpan: 1 },
                          { key: 'customerGroup', label: 'Customer Group', placeholder: 'e.g. VIP, Regular', type: 'text', colSpan: 1 },
                        ] as { key: keyof typeof addCustForm; label: string; placeholder: string; type: string; colSpan: 1 | 2 }[]).map(f => (
                          <div key={f.key} style={{ gridColumn: f.colSpan === 2 ? 'span 2' : 'span 1', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</label>
                            <input
                              type={f.type}
                              value={addCustForm[f.key] as string}
                              onChange={e => handleAddCustChange(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              style={{
                                height: 38, borderRadius: 10,
                                border: `1.5px solid ${C.border}`, padding: '0 12px',
                                fontSize: 13, color: C.text, outline: 'none',
                                background: '#fafafa', fontFamily: 'inherit',
                                transition: 'border-color 0.2s',
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = C.primary}
                              onBlur={e => e.currentTarget.style.borderColor = C.border}
                            />
                          </div>
                        ))}
                        {/* Platinum checkbox */}
                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                          <input
                            type="checkbox"
                            id="pos-cust-platinum"
                            checked={addCustForm.platinum}
                            onChange={e => handleAddCustChange('platinum', e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.primary }}
                          />
                          <label htmlFor="pos-cust-platinum" style={{ fontSize: 13, fontWeight: 600, color: C.textSub, cursor: 'pointer' }}>Platinum Customer</label>
                        </div>
                      </div>
                    )}

                    {/* ── Step 2: Financial ── */}
                    {addCustStep === 2 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {([
                          { key: 'creditLimit', label: 'Credit Limit', placeholder: '0.00', type: 'number' },
                          { key: 'payTerm', label: 'Pay Term', placeholder: 'e.g. Net 30', type: 'text' },
                          { key: 'openingBalance', label: 'Opening Balance', placeholder: '0.00', type: 'number' },
                        ] as { key: keyof typeof addCustForm; label: string; placeholder: string; type: string }[]).map(f => (
                          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</label>
                            <input
                              type={f.type}
                              min={f.type === 'number' ? 0 : undefined}
                              step={f.type === 'number' ? '0.01' : undefined}
                              value={addCustForm[f.key] as string}
                              onChange={e => handleAddCustChange(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              style={{
                                height: 38, borderRadius: 10,
                                border: `1.5px solid ${C.border}`, padding: '0 12px',
                                fontSize: 13, color: C.text, outline: 'none',
                                background: '#fafafa', fontFamily: 'inherit',
                                transition: 'border-color 0.2s',
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = C.primary}
                              onBlur={e => e.currentTarget.style.borderColor = C.border}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Step 3: Custom Fields ── */}
                    {addCustStep === 3 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {Array.from({ length: 9 }, (_, i) => i + 1).map(n => {
                          const key = `customField${n}` as keyof typeof addCustForm;
                          return (
                            <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Custom Field {n}</label>
                              <input
                                type="text"
                                value={addCustForm[key] as string}
                                onChange={e => handleAddCustChange(key, e.target.value)}
                                placeholder={`Custom field ${n}`}
                                style={{
                                  height: 38, borderRadius: 10,
                                  border: `1.5px solid ${C.border}`, padding: '0 12px',
                                  fontSize: 13, color: C.text, outline: 'none',
                                  background: '#fafafa', fontFamily: 'inherit',
                                  transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = C.primary}
                                onBlur={e => e.currentTarget.style.borderColor = C.border}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </form>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '14px 24px',
                  borderTop: `1px solid ${C.border}`,
                  background: '#fcfcfd',
                  display: 'flex', justifyContent: 'flex-end', gap: 10,
                  flexShrink: 0,
                }}>
                  <button
                    type="button"
                    onClick={closeAddCustomerModal}
                    disabled={addCustSubmitting}
                    style={ghostBtnStyle}
                  >
                    Cancel
                  </button>
                  {addCustStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setAddCustStep(s => (s - 1) as 1 | 2 | 3)}
                      disabled={addCustSubmitting}
                      style={ghostBtnStyle}
                    >
                      Previous
                    </button>
                  )}
                  <button
                    type="submit"
                    form="pos-add-cust-form"
                    disabled={addCustSubmitting}
                    style={{
                      height: 44, padding: '0 24px', borderRadius: 12,
                      background: C.primary, color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: addCustSubmitting ? 'not-allowed' : 'pointer',
                      border: 'none', display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: `0 4px 14px ${C.primary}40`,
                      opacity: addCustSubmitting ? 0.7 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {addCustSubmitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    {addCustStep < 3 ? 'Next →' : 'Add Customer'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {showItemEditModal && editingCartIndex !== null && (() => {
            const ci = cart[editingCartIndex];
            const base = ci.item.price * ci.quantity;
            const disc = (() => {
              const a = parseFloat(itemDiscountAmount);
              if (!a || a <= 0) return 0;
              return itemDiscountType === 'fixed' ? a : (base * a) / 100;
            })();
            const taxPct = parseFloat(itemTaxInput);
            const tax = (!isNaN(taxPct) && taxPct > 0) ? ((base - disc) * taxPct) / 100 : 0;
            const itemTotal = base - disc + tax;
            return (
              <div style={overlayStyle} onClick={() => setShowItemEditModal(false)}>
                <div onClick={e => e.stopPropagation()} style={{
                  width: 420, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 18,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.24)', display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileEdit size={18} color="#fff" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{ci.item.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Unit: {formatCurrency(ci.item.price)} × {ci.quantity}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowItemEditModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Qty × Price</p>
                        <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: C.text }}>{formatCurrency(base)}</p>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Item Total</p>
                        <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: C.primary }}>{formatCurrency(itemTotal)}</p>
                      </div>
                    </div>

                    {/* Item Discount */}
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Percent size={14} color={C.green} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Item Discount</span>
                        {disc > 0 && <span style={{ marginLeft: 'auto', fontSize: 12, color: C.green, fontWeight: 700 }}>- {formatCurrency(disc)}</span>}
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['fixed', 'percentage'] as const).map(t => (
                            <button key={t} onClick={() => setItemDiscountType(t)} style={{
                              flex: 1, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              border: itemDiscountType === t ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                              background: itemDiscountType === t ? C.primaryLight : '#fff',
                              color: itemDiscountType === t ? C.primary : C.textSub,
                            }}>{t === 'fixed' ? `Fixed (${symbol})` : 'Percentage (%)'}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: '#f8fafc' }}>
                          <span style={{ padding: '0 12px', fontSize: 13, color: C.textSub, borderRight: `1px solid ${C.border}`, height: 38, display: 'flex', alignItems: 'center' }}>{itemDiscountType === 'fixed' ? symbol : '%'}</span>
                          <input type="number" min={0} step="0.01" value={itemDiscountAmount} onChange={e => setItemDiscountAmount(e.target.value)} placeholder="0.00"
                            style={{ flex: 1, height: 38, border: 'none', padding: '0 10px', fontSize: 14, fontWeight: 700, outline: 'none', background: 'transparent' }} />
                        </div>
                      </div>
                    </div>

                    {/* Item Tax */}
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Hash size={14} color={C.amber} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Item Tax (%)</span>
                        {tax > 0 && <span style={{ marginLeft: 'auto', fontSize: 12, color: C.amber, fontWeight: 700 }}>+ {formatCurrency(tax)}</span>}
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: '#f8fafc' }}>
                          <span style={{ padding: '0 12px', fontSize: 14, fontWeight: 700, color: C.amber, borderRight: `1px solid ${C.border}`, height: 38, display: 'flex', alignItems: 'center' }}>%</span>
                          <input type="number" min={0} max={100} step="0.01" value={itemTaxInput} onChange={e => setItemTaxInput(e.target.value)} placeholder="0.00"
                            style={{ flex: 1, height: 38, border: 'none', padding: '0 10px', fontSize: 14, fontWeight: 700, outline: 'none', background: 'transparent' }} />
                        </div>
                      </div>
                    </div>

                    {/* Live Summary */}
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <TotalRow label="Base" value={base} />
                      {disc > 0 && <TotalRow label={`Discount (${itemDiscountType === 'percentage' ? itemDiscountAmount + '%' : 'Fixed'})`} value={-disc} accent={C.green} />}
                      {tax > 0 && <TotalRow label={`Tax (${itemTaxInput}%)`} value={tax} accent={C.amber} />}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Item Total</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{formatCurrency(itemTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 10, borderTop: `1px solid ${C.border}` }}>
                    <button onClick={() => setShowItemEditModal(false)} style={ghostBtnStyle}>Cancel</button>
                    <button onClick={applyItemEdits} style={{
                      flex: 1, height: 44, borderRadius: 12, border: 'none', background: C.primary,
                      color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <CheckCircle2 size={16} /> Apply Changes
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          {showDiscountModal && (
            <div style={overlayStyle} onClick={() => setShowDiscountModal(false)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 380, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
                  margin: '0 16px',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '18px 20px 14px',
                  borderBottom: `1px solid ${C.border}`,
                  background: '#fcfcfd',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, background: C.greenLight,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Percent size={16} color={C.green} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>Apply Discount</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Subtotal: {formatCurrency(subtotal)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDiscountModal(false)}
                    style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} color={C.textMuted} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                  {/* Discount Type Toggle */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 8 }}>
                      Discount Type
                    </label>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                      background: '#f1f5f9', borderRadius: 12, padding: 5,
                      border: `1px solid ${C.border}`,
                    }}>
                      {([
                        { key: 'fixed', label: 'Fixed Amount', },
                        { key: 'percentage', label: 'Percentage', icon: <Percent size={14} /> },
                      ] as const).map(({ key, label, icon }) => (
                        <button
                          key={key}
                          onClick={() => setDiscountType(key)}
                          style={{
                            height: 38, borderRadius: 9, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            fontSize: 12, fontWeight: 700,
                            background: discountType === key ? '#fff' : 'transparent',
                            color: discountType === key ? C.primary : C.textMuted,
                            boxShadow: discountType === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 8 }}>
                      {discountType === 'fixed' ? `Discount Amount (${symbol})` : 'Discount Percentage (%)'}
                    </label>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      border: `2px solid ${C.border}`, borderRadius: 12,
                      background: '#fafafa',
                      transition: 'border-color 0.2s',
                    }}
                      onFocusCapture={e => (e.currentTarget.style.borderColor = C.primary)}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
                    >
                      <span style={{
                        padding: '0 12px',
                        background: '#f1f5f9',
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: `1px solid ${C.border}`,
                        borderRadius: '10px 0 0 10px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.textSub,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        minWidth: 48,
                      }}>
                        {discountType === 'fixed' ? symbol : '%'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={discountType === 'percentage' ? 100 : undefined}
                        step="0.01"
                        value={discountAmount}
                        onChange={e => setDiscountAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                          width: 300, height: 48, border: 'none', outline: 'none',
                          padding: '0 14px', fontSize: 20, fontWeight: 700,
                          color: C.text, background: 'transparent', fontFamily: 'inherit',
                          borderRadius: '0 10px 10px 0',
                        }}
                      />
                    </div>

                    {/* Live preview */}
                    {discountAmount && parseFloat(discountAmount) > 0 && (
                      <div style={{
                        marginTop: 10, padding: '10px 14px', borderRadius: 10,
                        background: C.greenLight, border: `1px solid #a7f3d0`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Discount applied</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
                          - {symbol}{(
                            discountType === 'fixed'
                              ? parseFloat(discountAmount)
                              : (subtotal * parseFloat(discountAmount)) / 100
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '14px 20px',
                  borderTop: `1px solid ${C.border}`,
                  background: '#fcfcfd',
                  display: 'flex', gap: 10,
                }}>
                  {appliedDiscount && (
                    <button
                      onClick={() => {
                        setAppliedDiscount(null);
                        setDiscountAmount('');
                        if (currentSale?.id) {
                          ApiService.patch(`/pos/sale/${currentSale.id}`, { discountType: 'fixed', discountAmount: 0 }).then((res: any) => {
                            if (res.data) setCurrentSale(res.data);
                          });
                        }
                        setShowDiscountModal(false);
                      }}
                      style={{ ...ghostBtnStyle, color: C.red, borderColor: '#fecaca' }}
                    >
                      Remove
                    </button>
                  )}
                  <button onClick={() => setShowDiscountModal(false)} style={ghostBtnStyle}>Cancel</button>
                  <button
                    onClick={() => {
                      const amt = parseFloat(discountAmount);
                      if (!amt || amt <= 0) { toast.error('Enter a valid discount amount'); return; }
                      if (discountType === 'percentage' && amt > 100) { toast.error('Percentage cannot exceed 100%'); return; }
                      if (discountType === 'fixed' && amt > subtotal) { toast.error('Discount cannot exceed subtotal'); return; }
                      setAppliedDiscount({ type: discountType, amount: amt });
                      if (currentSale?.id) {
                        ApiService.patch(`/pos/sale/${currentSale.id}`, { discountType, discountAmount: amt }).then((res: any) => {
                          if (res.data) setCurrentSale(res.data);
                        });
                      }
                      toast.success(`Discount applied: ${discountType === 'fixed' ? `${formatCurrency(Number(amt))}` : `${amt}%`}`);
                      setShowDiscountModal(false);
                    }}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, border: 'none',
                      background: C.primary, color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      boxShadow: `0 4px 14px ${C.green}40`,
                    }}
                  >
                    Apply Discount
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Tax Modal ─────────────────────────────────────────────── */}
          {showTaxModal && (
            <div style={overlayStyle} onClick={() => setShowTaxModal(false)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 380, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
                  margin: '0 16px',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '18px 20px 14px',
                  borderBottom: `1px solid ${C.border}`,
                  background: '#fcfcfd',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, background: C.amberLight,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Hash size={16} color={C.amber} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>Apply Tax</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>
                        After discount: {formatCurrency(subtotal - discount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTaxModal(false)}
                    style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} color={C.textMuted} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                  {/* Info badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 10,
                    background: C.amberLight, border: `1px solid #fcd34d`,
                    marginBottom: 18,
                  }}>
                    <Hash size={14} color={C.amber} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>
                      Tax is calculated as a percentage of the post-discount subtotal
                    </span>
                  </div>

                  {/* Percentage Input */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{
                      fontSize: 11, fontWeight: 600, color: C.textSub,
                      textTransform: 'uppercase', letterSpacing: '0.4px',
                      display: 'block', marginBottom: 8,
                    }}>
                      Tax Percentage (%)
                    </label>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      border: `2px solid ${C.border}`, borderRadius: 12,
                      background: '#fafafa',
                      transition: 'border-color 0.2s',
                    }}
                      onFocusCapture={e => (e.currentTarget.style.borderColor = C.amber)}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
                    >
                      <span style={{
                        padding: '0 14px',
                        background: '#f1f5f9',
                        height: 48,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRight: `1px solid ${C.border}`,
                        borderRadius: '10px 0 0 10px',
                        fontSize: 16, fontWeight: 800, color: C.amber,
                        flexShrink: 0, minWidth: 48,
                      }}>
                        %
                      </span>
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={taxInput}
                        onChange={e => setTaxInput(e.target.value)}
                        placeholder="0.00"
                        style={{
                          flex: 1, height: 48, border: 'none', outline: 'none',
                          padding: '0 14px', fontSize: 20, fontWeight: 700,
                          color: C.text, background: 'transparent', fontFamily: 'inherit',
                          borderRadius: '0 10px 10px 0',
                        }}
                      />
                    </div>

                    {/* Live preview */}
                    {taxInput && parseFloat(taxInput) > 0 && (
                      <div style={{
                        marginTop: 10, padding: '10px 14px', borderRadius: 10,
                        background: C.amberLight, border: `1px solid #fcd34d`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>
                          Tax on {formatCurrency(subtotal - discount)}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>
                          + {formatCurrency((subtotal - discount) * parseFloat(taxInput) / 100)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '14px 20px',
                  borderTop: `1px solid ${C.border}`,
                  background: '#fcfcfd',
                  display: 'flex', gap: 10,
                }}>
                  {appliedTaxPercent != null && (
                    <button
                      onClick={() => {
                        setAppliedTaxPercent(null);
                        setTaxInput('');
                        if (currentSale?.id) {
                          ApiService.patch(`/pos/sale/${currentSale.id}`, { taxPercent: 0 }).then((res: any) => {
                            if (res.data) setCurrentSale(res.data);
                          });
                        }
                        setShowTaxModal(false);
                      }}
                      style={{ ...ghostBtnStyle, color: C.red, borderColor: '#fecaca' }}
                    >
                      Remove
                    </button>
                  )}
                  <button onClick={() => setShowTaxModal(false)} style={ghostBtnStyle}>Cancel</button>
                  <button
                    onClick={() => {
                      const pct = parseFloat(taxInput);
                      if (!pct || pct <= 0) { toast.error('Enter a valid tax percentage'); return; }
                      if (pct > 100) { toast.error('Tax cannot exceed 100%'); return; }
                      setAppliedTaxPercent(pct);
                      if (currentSale?.id) {
                        ApiService.patch(`/pos/sale/${currentSale.id}`, { taxPercent: pct }).then((res: any) => {
                          if (res.data) setCurrentSale(res.data);
                        });
                      }
                      toast.success(`Tax applied: ${pct}%`);
                      setShowTaxModal(false);
                    }}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, border: 'none',
                      background: C.amber, color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      boxShadow: `0 4px 14px ${C.amber}40`,
                    }}
                  >
                    Apply Tax
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCalculator && (
            <div style={overlayStyle}>
              <div style={modalStyle}>
                {/* Close Button */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: 'center' }}>
                  <strong style={{ fontSize: 14, color: C.text }}>Calculator</strong>
                  <button
                    onClick={() => setShowCalculator(false)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: C.textMuted, padding: 4, display: 'flex'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Calculator Component */}
                <div style={{ overflow: 'hidden', borderRadius: 8, background: '#fff' }}>
                  <CalculatorUi />
                </div>
              </div>
            </div>
          )}

          {/* ── Saved Orders Modal ─────────────────────────────────────── */}
          {/* ── Saved Orders Modal ─────────────────────────────────────── */}
          {showDraftsModal && (
            <div style={overlayStyle} onClick={() => setShowDraftsModal(false)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 600, maxWidth: '95vw', maxHeight: '85vh',
                  background: '#fff', borderRadius: 18,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`,
                  background: '#fcfcfd', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexShrink: 0
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Draft Orders</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>Review and resume your drafted transactions</p>
                  </div>
                  <button
                    onClick={() => setShowDraftsModal(false)}
                    style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                  {loadingSavedSales ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                      <Loader2 size={24} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : savedSales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted, fontWeight: 600 }}>
                      No saved orders found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {savedSales.map(sale => (
                        <div key={sale.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 18px', border: `1px solid ${C.border}`, borderRadius: 12,
                          background: '#fafafa'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Order #{sale.id}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase',
                                background: C.blueLight,
                                color: C.blue
                              }}>
                                {sale.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: C.textSub, display: 'flex', gap: 12 }}>
                              <span>Customer: {sale.Customer?.name || 'Walk-in'}</span>
                              <span>Staff: {sale.Staff?.name || 'None'}</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                              Created: {new Date(sale.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => navigate(`/pos?editSaleId=${sale.id}`)}
                              style={{
                                height: 36, padding: '0 16px', borderRadius: 8, border: 'none',
                                background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                boxShadow: `0 2px 8px ${C.primary}40`
                              }}
                            >
                              <RotateCcw size={14} /> Resume
                            </button>
                            <button
                              onClick={() => deleteDraftOrder(sale.id)}
                              style={{
                                height: 36, padding: '0 16px', borderRadius: 8, border: `1.5px solid ${C.red}`,
                                background: '#fff', color: C.red, fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.redLight; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                            >
                              <X size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showVariationModal && selectedVariableProduct && (
            <div style={overlayStyle} onClick={() => setShowVariationModal(false)}>
              <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 500 }}>
                <h3>Select Variation for {selectedVariableProduct.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
                  {Array.isArray(selectedVariableProduct.variations) && selectedVariableProduct.variations.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVariation(v)}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.surface,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{v.name}</div>
                      <div style={{ color: COLORS.primary }}>
                        {symbol}{v.sellingPriceInc || v.sellingPriceExc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}


          <RegisterDetailsModal 
            isOpen={showRegisterModal} 
            onClose={() => setShowRegisterModal(false)} 
            branchId={selectedBranchId} 
          />

          {/* 💳 CREDIT MODAL (Due Date) */}
          {showCreditModal && (
            <div style={overlayStyle} onClick={() => setShowCreditModal(false)}>
              <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 400, padding: 25 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Credit Sale Details</h3>
                  <X size={20} color={C.textMuted} style={{ cursor: 'pointer' }} onClick={() => setShowCreditModal(false)} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    fontSize: 11, fontWeight: 700, color: C.textSub,
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    display: 'block', marginBottom: 10,
                  }}>
                    Repayment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%', height: 48, borderRadius: 12,
                      border: `2px solid ${C.border}`, padding: '0 15px',
                      fontSize: 15, fontWeight: 600, outline: 'none'
                    }}
                  />
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8, fontStyle: 'italic' }}>
                    Specify when the customer is expected to settle this balance.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowCreditModal(false)}
                    style={{ ...ghostBtnStyle, flex: 1, height: 44 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (dueDate) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (dueDate < todayStr) {
                          toast.error('Due date must be today or a future date');
                          return;
                        }
                      }
                      setShowCreditModal(false);
                      setTimeout(() => submitSaleData('credit', 'due'), 100);

                    }}
                    style={{
                      flex: 2, height: 44, borderRadius: 12, border: 'none',
                      background: C.amber, color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', boxShadow: `0 4px 12px ${C.amber}40`,
                    }}
                  >
                    CONFIRM CREDIT
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </>
    </TooltipProvider>
    </FormProvider>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductCard({ item, onAdd }: { item: POSItem; onAdd: () => void }) {
  const { format: formatCurrency } = useCurrency();
  const [hovered, setHovered] = useState(false);
  const isActuallyEmpty = (item.stock ?? 0) <= 0 && item.manageStock === true;

  return (
    <div
      onClick={() => !isActuallyEmpty && onAdd()}   // ← guard the click
      onMouseEnter={() => !isActuallyEmpty && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.surface, borderRadius: 14,
        border: `2px solid ${hovered ? C.primary : C.border}`,
        padding: 8, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: hovered ? '0 8px 20px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '1.1', borderRadius: 10,
        background: '#f8fafc', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${C.border}`,
      }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Package size={30} color={C.borderMid} />
        }
      </div>

      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: C.text, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textTransform: 'uppercase', letterSpacing: '0.2px',
        }}>{item.name}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 }}>
          <span style={{
            fontSize: 9,
            color: C.textMuted,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {item.sku}
          </span>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.primary,
            flexShrink: 0
          }}>
            {item.productType === 'variable' ? 'Variable' : formatCurrency(item.price)}
          </span>
        </div>
      </div>

      <div style={{
        padding: '2px 8px', borderRadius: 6,
        background: !isActuallyEmpty ? '#f0fdf4' : '#fef2f2',
        display: 'flex', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: !isActuallyEmpty ? '#166534' : '#991b1b' }}>
          {!isActuallyEmpty ? `${item.stock} IN STOCK` : 'OUT OF STOCK'}
        </span>
      </div>

    </div>
  );
}

function CartRow({ cartItem, onRemove, onUpdateQty, onEdit }: {
  cartItem: CartItem;
  onRemove: () => void;
  onEdit: () => void;
  onUpdateQty: (delta: number) => void;
}) {
  const { format: formatCurrency } = useCurrency();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
      background: '#fff',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: '#f8fafc',
        border: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {cartItem.item.image
          ? <img src={cartItem.item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Package size={16} color={C.borderMid} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: C.text, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}>{cartItem.item.name}</p>
        <p style={{ fontSize: 11, color: C.textMuted, margin: '2px 0 0', fontWeight: 500 }}>
          UNIT: {formatCurrency(cartItem.item.price)}
        </p>
        {(cartItem.itemDiscount || cartItem.itemTaxPercent != null) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
            {cartItem.itemDiscount && (
              <span style={{ fontSize: 9, background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                DISC
              </span>
            )}
            {cartItem.itemTaxPercent != null && (
              <span style={{ fontSize: 9, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                TAX
              </span>
            )}
          </div>
        )}
      </div>


      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={() => onUpdateQty(-1)} style={qtyBtn}><Minus size={11} /></button>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 20, textAlign: 'center' }}>
          {cartItem.quantity}
        </span>
        <button onClick={() => onUpdateQty(1)} style={{ ...qtyBtn, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary }}>
          <Plus size={11} />
        </button>
      </div>

      <div style={{ minWidth: 65, textAlign: 'right' }}>
        {(() => {
          const base = cartItem.item.price * cartItem.quantity;
          const disc = cartItem.itemDiscount
            ? cartItem.itemDiscount.type === 'fixed'
              ? cartItem.itemDiscount.amount
              : (base * cartItem.itemDiscount.amount) / 100
            : 0;
          const taxBase = base - disc;
          const tax = cartItem.itemTaxPercent != null ? (taxBase * cartItem.itemTaxPercent) / 100 : 0;
          const lineTotal = taxBase + tax;
          return (
            <React.Fragment>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                {formatCurrency(lineTotal)}
              </p>
              {disc > 0 && (
                <p style={{ fontSize: 9, color: C.textMuted, margin: 0, textDecoration: 'line-through' }}>
                  {formatCurrency(base)}
                </p>
              )}
            </React.Fragment>
          );
        })()}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        style={{
          background: '#ede9fe', border: 'none', width: 26, height: 26,
          borderRadius: 8, cursor: 'pointer', color: '#6d28d9',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <FileEdit size={13} />
      </button>

      <button
        onClick={onRemove}
        style={{ background: '#f1f5f9', border: 'none', width: 26, height: 26, borderRadius: 8, cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function TotalRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const { format: formatCurrency } = useCurrency();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: C.textSub, fontWeight: 600, letterSpacing: '0.4px' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: accent ?? C.textSub }}>
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function FieldBox({ icon, label, flex }: { icon: React.ReactNode; label: string; flex?: boolean }) {
  return (
    <div style={{
      flex: flex ? 1 : undefined, height: 38, borderRadius: 10,
      border: `1.5px solid ${C.border}`, background: C.surface,
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    }}>
      {icon}
      <span style={{ fontSize: 12, color: C.textSub, flex: 1, fontWeight: 600 }}>{label}</span>
      <ChevronDown size={12} color={C.textMuted} />
    </div>
  );
}

function LightIconBtn({ icon, accent, danger, title, onClick }: { icon: React.ReactNode; accent?: boolean; danger?: boolean, title?: string; onClick?: () => void; }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 10,
      border: `1.5px solid ${danger ? '#fecaca' : accent ? C.primaryBorder : C.border}`,

      background: danger ? '#fef2f2' : accent ? C.primaryLight : '#fff',
      color: danger ? C.red : accent ? C.primary : C.textSub,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s',
    }}>
      {icon}
    </button>
  );


}

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  border: `1.5px solid ${C.border}`, background: '#fff',
  color: C.textSub, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s',
};

const ghostBtnStyle: React.CSSProperties = {
  height: 44, padding: '0 20px', borderRadius: 12,
  border: `1.5px solid ${C.border}`, background: '#fff',
  color: C.textSub, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'all 0.2s',
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999
};

const modalStyle: React.CSSProperties = {
  width: 300,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 12,
  padding: 15,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
};

const paginationBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};