import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  Plus,
  Minus,
  ArrowRight,
  ClipboardCheck,
  Search,
  ShoppingCart,
  Users,
  Download,
  Filter,
  BarChart3,
  Edit3,
  Trash2,
  CheckCircle2,
  MessageCircle,
  History,
  X,
  ShieldCheck,
  UserCheck,
  LogOut,
  Printer,
  Copy,
  FileText,
  Sparkles,
  Upload,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Lock,
  RotateCcw,
  UserPlus,
  Clock,
  MapPin,
  Scale,
} from 'lucide-react';
import { WorkspaceMore, WorkspaceNavigation } from './components/workspace/WorkspaceNavigation';
import { TraderHome, WorkspaceLedger, WorkspaceMetric } from './components/workspace/TraderHome';
import './components/workspace/workspace.css';
import './components/workspace/trader-tools.css';
import { HistoryEntries } from './components/workspace/HistoryEntries';
import './components/workspace/history.css';
import { useDebounce } from './hooks/useDebounce';
import { Modal } from './components/ui/Modal';
import { ListPagination, useListPage } from './components/ui/ListPagination';
import { StatCard } from './components/ui/StatCard';
import { Badge } from './components/ui/Badge';
import { EmptyState } from './components/ui/EmptyState';
import { ToastProvider, useToast } from './components/ui/Toast';
import { ReceiptModal } from './components/receipt/ReceiptModal';
import { CheckoutConfirmModal } from './components/counter/CheckoutConfirmModal';
import { MobileCartSheet } from './components/counter/MobileCartSheet';
import { BulkImportModal } from './components/inventory/BulkImportModal';
import { PhysicalStockAuditModal } from './components/inventory/PhysicalStockAuditModal';
import { BatchAdjustModal } from './components/inventory/BatchAdjustModal';
import { CashbookSessionModal } from './components/cashbook/CashbookSessionModal';
import { TransactionCorrectionModal } from './components/cashbook/TransactionCorrectionModal';
import { WhatsAppReminderModal } from './components/debtors/WhatsAppReminderModal';
import { CustomerStatementModal } from './components/debtors/CustomerStatementModal';
import { CustomerRepaymentModal } from './components/debtors/CustomerRepaymentModal';
import { DebtBook } from './components/debtors/DebtBook';
import { CustomerCreditModal } from './components/debtors/CustomerCreditModal';
import { FinancialMetricsOverview } from './components/analytics/FinancialMetricsOverview';
import { DailyChannelReconciliationModal } from './components/analytics/DailyChannelReconciliationModal';
import { OperatingExpenseBreakdown } from './components/analytics/OperatingExpenseBreakdown';
import { OnboardingJourneyCard } from './components/onboarding/OnboardingJourneyCard';
import { QuickStockModal } from './components/onboarding/QuickStockModal';
import { BusinessSetupModal } from './components/onboarding/BusinessSetupModal';
import { AccountStatusScreen } from './components/auth/AccountStatusScreen';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { RouterProvider, useRouter } from './router/RouterContext';
import { apiFetch } from './services/api';
import { formatCurrency, getCurrencySymbol } from './utils/currency';
import { getBusinessProfile, getAllCommonUnits } from './utils/businessCategories';

const PAYMENT_CHANNEL_LABELS = {
  CASH: 'Cash (Notes)',
  POS: 'POS Terminal',
  BANK_TRANSFER: 'Bank Transfer',
  MOBILE_MONEY: 'Mobile Wallet',
};

const LAGOS_EXPENSE_PRESETS = [
  'Inventory Restock',
  'Generator & Power',
  'Electricity & Utilities',
  'Logistics & Transport',
  'Store Rent & Lease',
  'Staff Wages & Allowance',
  'POS & Bank Charges',
  'Security & Maintenance',
  'Packaging & Supplies',
  'Taxes & Market Levies',
  'Miscellaneous Expense',
];

const INITIAL_PRODUCT_FORM = {
  sku: '',
  name: '',
  category: 'Beverages & Dairy',
  unit: 'Pack',
  cost_price: '',
  selling_price: '',
  stock_quantity: '0',
  reorder_level: '5',
  supplier_name: '',
};

const INITIAL_CASH_FORM = {
  type: 'OUTFLOW',
  category: 'Inventory Restock',
  amount: '',
  payment_method: 'CASH',
  counterparty_name: '',
  expense_reason: '',
  description: '',
};

const ROUTE_TO_TAB = {
  '/store': 'home',
  '/store/home': 'home',
  '/store/more': 'more',
  '/store/sell': 'counter',
  '/store/stock': 'inventory',
  '/store/cash': 'cashbook',
  '/store/history': 'history',
  '/store/debtors': 'debtors',
  '/store/summary': 'analytics',
};

const TAB_TO_ROUTE = {
  home: '/store/home',
  more: '/store/more',
  counter: '/store/sell',
  inventory: '/store/stock',
  cashbook: '/store/cash',
  history: '/store/history',
  debtors: '/store/debtors',
  analytics: '/store/summary',
};

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('marketos_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem('marketos_theme', darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage quota errors
    }
  }, [darkMode]);

  const themeTransition = useRef(null);
  const requestedTheme = useRef(darkMode);
  const setDarkModeSmooth = useCallback((value) => {
    const next = typeof value === 'function' ? value(requestedTheme.current) : value;
    if (next === requestedTheme.current) return;
    requestedTheme.current = next;

    const root = document.documentElement;
    const applyTheme = () => {
      if (next !== requestedTheme.current) return;
      root.classList.toggle('dark', next);
      root.dataset.theme = next ? 'dark' : 'light';
      setDarkMode(next);
    };

    themeTransition.current?.skipTransition();
    if (typeof document.startViewTransition !== 'function' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyTheme();
      return;
    }

    root.classList.add('theme-turn');
    const transition = document.startViewTransition(() => flushSync(applyTheme));
    themeTransition.current = transition;
    const finish = () => {
      if (themeTransition.current !== transition) return;
      themeTransition.current = null;
      root.classList.remove('theme-turn');
    };
    transition.finished.then(finish, finish);
  }, []);

  return (
    <RouterProvider>
      <ToastProvider>
        <div className="relative z-10 min-h-screen">
          <AppShell darkMode={darkMode} setDarkMode={setDarkModeSmooth} />
        </div>
      </ToastProvider>
    </RouterProvider>
  );
}

function AppShell({ darkMode, setDarkMode }) {
  const { path, navigate } = useRouter();

  const basketRef = useRef(null);
  const checkoutAttempt = useRef(null);
  const checkoutInProgress = useRef(false);

  // Authenticated SaaS User State
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const currencyCode = currentUser?.currency || 'NGN';
  const currencySymbol = getCurrencySymbol(currencyCode);
  const businessProfile = getBusinessProfile(currentUser?.business_type);
  const formatNaira = useCallback(
    (val) => formatCurrency(val, currencyCode),
    [currencyCode]
  );

  const activeTab = ROUTE_TO_TAB[path] || 'counter';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Server Data
  const [dashboard, setDashboard] = useState({});
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cashbookSession, setCashbookSession] = useState(null);
  const [movements, setMovements] = useState([]);
  const [credits, setCredits] = useState([]);
  const [customerLedgers, setCustomerLedgers] = useState([]);

  // Debtor Views & Filter States
  const [debtorViewMode, setDebtorViewMode] = useState('ACCOUNTS'); // 'ACCOUNTS' | 'SLIPS'
  const [debtorFilter, setDebtorFilter] = useState('ALL'); // 'ALL' | 'OWING' | 'OVERDUE' | 'SETTLED'
  const [debtorSearch, setDebtorSearch] = useState('');
  const debouncedDebtorSearch = useDebounce(debtorSearch, 150);

  // Debtor Modals
  const [whatsAppModalTarget, setWhatsAppModalTarget] = useState(null);
  const [statementModalCustomer, setStatementModalCustomer] = useState(null);
  const [repaymentModalTarget, setRepaymentModalTarget] = useState(null);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);

  // Quick Counter Sale Basket State
  const [cart, setCart] = useState({});
  const [checkoutMethod, setCheckoutMethod] = useState('CASH');
  const [isPartPayment, setIsPartPayment] = useState(false);
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 150);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [cashFilter, setCashFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [cashDateRange, setCashDateRange] = useState('ALL'); // 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  const [cashStartDate, setCashStartDate] = useState('');
  const [cashEndDate, setCashEndDate] = useState('');
  const [cashCategoryFilter, setCashCategoryFilter] = useState('ALL');
  const [cashSearch, setCashSearch] = useState('');
  const debouncedCashSearch = useDebounce(cashSearch, 150);
  const [showAuditTrail, setShowAuditTrail] = useState(true);
  const hasCashFilters = cashFilter !== 'ALL' || channelFilter !== 'ALL' ||
    cashDateRange !== 'ALL' || cashCategoryFilter !== 'ALL' || Boolean(cashSearch.trim()) || !showAuditTrail;
  const clearCashFilters = () => {
    setCashFilter('ALL');
    setChannelFilter('ALL');
    setCashDateRange('ALL');
    setCashStartDate('');
    setCashEndDate('');
    setCashCategoryFilter('ALL');
    setCashSearch('');
    setShowAuditTrail(true);
  };


  // Check History Filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historyProductFilter, setHistoryProductFilter] = useState('ALL');
  const [historyDateRange, setHistoryDateRange] = useState('ALL');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const debouncedHistorySearch = useDebounce(historySearch, 150);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState('OPEN');
  const [correctingTx, setCorrectingTx] = useState(null);
  const [repayingCredit, setRepayingCredit] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('CASH');

  // Analytics & Daily Channel Reconciliation State
  const [analyticsDateRange, setAnalyticsDateRange] = useState('TODAY'); // 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Discretionary MVP Feature Modals
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showBatchAdjustModal, setShowBatchAdjustModal] = useState(false);
  const [showBusinessSetupModal, setShowBusinessSetupModal] = useState(false);
  const [showQuickStockModal, setShowQuickStockModal] = useState(false);
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(() => {
    try {
      return localStorage.getItem('marketos_hide_onboarding') === 'true';
    } catch {
      return false;
    }
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    location: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
  });

  // Forms
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [movementForm, setMovementForm] = useState({
    movement_type: 'RESTOCK',
    quantity: '',
    record_cash: true,
    amount_paid: '',
    payment_method: 'CASH',
    counterparty_name: '',
    note: '',
  });
  const [cashForm, setCashForm] = useState(INITIAL_CASH_FORM);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const showSuccessToast = useCallback((msg) => {
    setToast(msg);
    toastSuccess?.(msg);
    setTimeout(() => setToast(''), 4200);
  }, [toastSuccess]);

  const handleSelectTab = (tabId) => {
    navigate(TAB_TO_ROUTE[tabId] || '/store/sell');
  };

  const checkAuthSession = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const oauthToken = params.get('oauth_token');
        if (oauthToken) {
          params.delete('oauth_token');
          params.delete('oauth_provider');
          const cleanQuery = params.toString();
          const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash || ''}`;
          window.history.replaceState({}, '', cleanUrl);
        }
      }

      const data = await apiFetch('/api/v1/auth/me');
      if (data?.user) {
        setCurrentUser(data.user);
        setProfileForm({
          full_name: data.user.full_name || '',
          business_name: data.user.business_name || '',
          phone: data.user.phone || '',
          location: data.user.location || 'Lagos, Nigeria',
        });
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      if (err.status !== 401) {
        showSuccessToast('Sign-out could not be confirmed. Please try again.');
        return;
      }
    }
    setCurrentUser(null);
    checkoutAttempt.current = null;
    setCart({});
    setShowProfileModal(false);
    navigate('/login');
  };

  const isApprovedStoreAccess = Boolean(
    currentUser && (currentUser.status === 'APPROVED' || currentUser.role === 'ADMIN')
  );

  const fetchAllData = useCallback(
    async (signal) => {
      if (!isApprovedStoreAccess) return;
      try {
        setError('');
        const [dashData, prodData, txData, sessData, movData, credData, custData] = await Promise.all([
          apiFetch('/api/v1/dashboard', { signal }),
          apiFetch('/api/v1/products', { signal }),
          apiFetch('/api/v1/transactions?limit=500', { signal }),
          apiFetch('/api/v1/cashbook/sessions', { signal }).catch(() => null),
          apiFetch('/api/v1/inventory/movements?limit=1000', { signal }),
          apiFetch('/api/v1/credits', { signal }),
          apiFetch('/api/v1/credits/customers', { signal }).catch(() => []),
        ]);

        setDashboard(dashData || {});
        setProducts(Array.isArray(prodData) ? prodData : []);
        setTransactions(Array.isArray(txData) ? txData : []);
        if (sessData) setCashbookSession(sessData);
        setMovements(Array.isArray(movData) ? movData : []);
        setCredits(Array.isArray(credData) ? credData : []);
        setCustomerLedgers(Array.isArray(custData) ? custData : []);
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          checkAuthSession();
          return;
        }
        if (err.name !== 'AbortError') {
          setError('Cannot connect to server. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [isApprovedStoreAccess, checkAuthSession]
  );

  const refreshDebtors = useCallback(async () => {
    try {
      const [credData, custData, dashData, txData] = await Promise.all([
        apiFetch('/api/v1/credits'),
        apiFetch('/api/v1/credits/customers').catch(() => []),
        apiFetch('/api/v1/dashboard').catch(() => null),
        apiFetch('/api/v1/transactions?limit=500').catch(() => null),
      ]);
      setCredits(Array.isArray(credData) ? credData : []);
      setCustomerLedgers(Array.isArray(custData) ? custData : []);
      if (dashData) setDashboard(dashData);
      if (Array.isArray(txData)) setTransactions(txData);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!isApprovedStoreAccess) return;
    const controller = new AbortController();
    fetchAllData(controller.signal);
    return () => controller.abort();
  }, [fetchAllData, isApprovedStoreAccess]);

  // Categories & Filtered Products
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return products.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (activeTab === 'inventory') {
        const count = Number(p.stock_quantity);
        const status = count <= 0 ? 'OUT' : count <= Number(p.reorder_level) ? 'LOW' : 'HEALTHY';
        if (stockStatus !== 'ALL' && status !== stockStatus) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
      );
    });
  }, [products, debouncedSearch, categoryFilter, stockStatus, activeTab]);

  // Low-Stock Restock Generator Items (Discretionary MVP Feature)
  const lowStockRestockPlan = useMemo(() => {
    return products
      .filter((p) => Number(p.stock_quantity) <= Number(p.reorder_level))
      .map((p) => {
        const current = Number(p.stock_quantity || 0);
        const reorder = Number(p.reorder_level || 5);
        const recommendedQty = Math.max(reorder * 2 - current, reorder, 5);
        const unitCost = Number(p.cost_price || 0);
        return {
          ...p,
          recommendedQty,
          estimatedCost: recommendedQty * unitCost,
        };
      });
  }, [products]);

  const totalRestockBudget = useMemo(
    () => lowStockRestockPlan.reduce((sum, item) => sum + item.estimatedCost, 0),
    [lowStockRestockPlan]
  );

  // Filtered History Movements + Period Summary
  const filteredMovements = useMemo(() => {
    const q = debouncedHistorySearch.toLowerCase().trim();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return movements.filter((m) => {
      // Type Filter
      if (historyTypeFilter !== 'ALL') {
        const mType = String(m.movement_type || '').toUpperCase();
        if (historyTypeFilter === 'DAMAGED') {
          if (mType !== 'DAMAGED' && mType !== 'DAMAGE') return false;
        } else if (mType !== historyTypeFilter) {
          return false;
        }
      }

      // Product Filter
      if (historyProductFilter !== 'ALL') {
        if (String(m.product_id) !== String(historyProductFilter)) {
          return false;
        }
      }

      // Date Range Filter
      const itemTime = new Date(m.created_at).getTime();
      if (historyDateRange === 'TODAY' && itemTime < startOfToday) {
        return false;
      }
      if (historyDateRange === '7DAYS' && itemTime < now.getTime() - 7 * 86400000) {
        return false;
      }
      if (historyDateRange === '30DAYS' && itemTime < now.getTime() - 30 * 86400000) {
        return false;
      }
      if (historyDateRange === 'CUSTOM') {
        if (historyStartDate) {
          const startTime = new Date(historyStartDate + 'T00:00:00').getTime();
          if (itemTime < startTime) return false;
        }
        if (historyEndDate) {
          const endTime = new Date(historyEndDate + 'T23:59:59.999').getTime();
          if (itemTime > endTime) return false;
        }
      }

      if (!q) return true;
      return (
        (m.product_name && m.product_name.toLowerCase().includes(q)) ||
        (m.sku && m.sku.toLowerCase().includes(q)) ||
        (m.counterparty_name && m.counterparty_name.toLowerCase().includes(q)) ||
        (m.note && m.note.toLowerCase().includes(q))
      );
    });
  }, [
    movements,
    historyTypeFilter,
    historyProductFilter,
    historyDateRange,
    historyStartDate,
    historyEndDate,
    debouncedHistorySearch,
  ]);

  const historySummary = useMemo(() => {
    return filteredMovements.reduce(
      (acc, m) => {
        const val = Number(m.total_value || 0);
        const t = String(m.movement_type || '').toUpperCase();
        if (t === 'SALE') {
          acc.salesCount += 1;
          acc.salesValue += val;
        } else if (t === 'RESTOCK') {
          acc.restockCount += 1;
          acc.restockValue += val;
        } else if (['DAMAGED', 'DAMAGE', 'EXPIRED', 'MISSING'].includes(t)) {
          acc.lossCount += 1;
          acc.lossValue += val;
        }
        return acc;
      },
      { salesCount: 0, salesValue: 0, restockCount: 0, restockValue: 0, lossCount: 0, lossValue: 0 }
    );
  }, [filteredMovements]);

  const historyFiltered = historyTypeFilter !== 'ALL' || historyProductFilter !== 'ALL' ||
    historyDateRange !== 'ALL' || Boolean(historySearch.trim());

  function resetHistoryFilters(productId = 'ALL') {
    setHistoryTypeFilter('ALL');
    setHistoryProductFilter(productId);
    setHistoryDateRange('ALL');
    setHistoryStartDate('');
    setHistoryEndDate('');
    setHistorySearch('');
  }

  const getMovementBadgeInfo = (movementType) => {
    const norm = String(movementType || '').toUpperCase();
    switch (norm) {
      case 'SALE':
        return { variant: 'info', label: 'SALE OUT' };
      case 'RESTOCK':
        return { variant: 'success', label: 'RESTOCK' };
      case 'DAMAGE':
      case 'DAMAGED':
        return { variant: 'danger', label: 'DAMAGED' };
      case 'EXPIRED':
        return { variant: 'warning', label: 'EXPIRED' };
      case 'MISSING':
        return { variant: 'danger', label: 'MISSING' };
      case 'SURPLUS':
        return { variant: 'info', label: 'SURPLUS' };
      case 'ADJUSTMENT':
        return { variant: 'neutral', label: 'SHELF COUNT' };
      default:
        return { variant: 'neutral', label: norm };
    }
  };

  // Distinct Payment Channel Visual Metadata (Cash vs POS vs Bank Transfer vs Mobile Wallet)
  const getChannelBadgeMeta = (paymentMethod) => {
    const ch = String(paymentMethod || 'CASH').toUpperCase();
    switch (ch) {
      case 'CASH':
        return {
          label: 'Cash (Notes)',
          shortLabel: 'CASH',
          icon: Banknote,
          variant: 'success',
          pillClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35',
        };
      case 'POS':
        return {
          label: 'POS Terminal',
          shortLabel: 'POS',
          icon: CreditCard,
          variant: 'info',
          pillClass: 'bg-sky-500/15 text-sky-400 border-sky-500/35',
        };
      case 'BANK_TRANSFER':
        return {
          label: 'Bank Transfer',
          shortLabel: 'TRANSFER',
          icon: Landmark,
          variant: 'info',
          pillClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/35',
        };
      case 'MOBILE_MONEY':
        return {
          label: 'Mobile Wallet',
          shortLabel: 'WALLET',
          icon: Smartphone,
          variant: 'warning',
          pillClass: 'bg-amber-500/15 text-amber-400 border-amber-500/35',
        };
      default:
        return {
          label: ch,
          shortLabel: ch,
          icon: Wallet,
          variant: 'neutral',
          pillClass: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  // Cashbook Period Boundaries (Daily, Weekly, Monthly, Custom, All)
  const cashPeriodBounds = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (cashDateRange === 'DAILY') {
      return { startMs: startOfToday, endMs: Infinity, label: 'Daily Report (Today)' };
    }
    if (cashDateRange === 'WEEKLY') {
      return {
        startMs: startOfToday - 6 * 86400000,
        endMs: Infinity,
        label: 'Weekly Report (Last 7 Days)',
      };
    }
    if (cashDateRange === 'MONTHLY') {
      return {
        startMs: startOfToday - 29 * 86400000,
        endMs: Infinity,
        label: 'Monthly Report (Last 30 Days)',
      };
    }
    if (cashDateRange === 'CUSTOM') {
      const sMs = cashStartDate ? new Date(cashStartDate).setHours(0, 0, 0, 0) : -Infinity;
      const eMs = cashEndDate ? new Date(cashEndDate).setHours(23, 59, 59, 999) : Infinity;
      return {
        startMs: sMs,
        endMs: eMs,
        label: `Custom Range (${cashStartDate || 'Start'} to ${cashEndDate || 'Now'})`,
      };
    }
    return { startMs: -Infinity, endMs: Infinity, label: 'All-Time Cashbook Report' };
  }, [cashDateRange, cashStartDate, cashEndDate]);

  // Distinct Cashbook Categories for Filter Dropdown
  const cashbookCategories = useMemo(() => {
    const set = new Set(LAGOS_EXPENSE_PRESETS);
    set.add('Counter Sales');
    set.add('Credit Repayment');
    transactions.forEach((tx) => {
      if (tx.category) set.add(tx.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [transactions]);

  // Filtered Cashbook Transactions (supports Type, Channel, Category, Date Range, Search & Audit Trail)
  const filteredTransactions = useMemo(() => {
    const q = debouncedCashSearch.toLowerCase().trim();
    const { startMs, endMs } = cashPeriodBounds;

    return transactions.filter((tx) => {
      const txStatus = tx.status || 'ACTIVE';
      if (!showAuditTrail && txStatus !== 'ACTIVE') return false;

      if (cashFilter !== 'ALL' && tx.type !== cashFilter) return false;
      if (channelFilter !== 'ALL' && tx.payment_method !== channelFilter) return false;
      if (cashCategoryFilter !== 'ALL' && tx.category !== cashCategoryFilter) return false;

      const txTime = new Date(tx.transaction_date).getTime();
      if (txTime < startMs || txTime > endMs) return false;

      if (!q) return true;
      return (
        (tx.category && tx.category.toLowerCase().includes(q)) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.expense_reason && tx.expense_reason.toLowerCase().includes(q)) ||
        (tx.counterparty_name && tx.counterparty_name.toLowerCase().includes(q)) ||
        (tx.correction_reason && tx.correction_reason.toLowerCase().includes(q)) ||
        String(tx.id).includes(q)
      );
    });
  }, [
    transactions,
    showAuditTrail,
    cashFilter,
    channelFilter,
    cashCategoryFilter,
    cashPeriodBounds,
    debouncedCashSearch,
  ]);

  // Comprehensive Period Cashbook Report (Opening Balance, Inflow, Outflow, Closing Balance, Channels & Expense Breakdown)
  const cashbookReportSummary = useMemo(() => {
    const { startMs, endMs } = cashPeriodBounds;
    let priorNet = 0;
    let periodInflow = 0;
    let periodOutflow = 0;
    let activeCount = 0;
    let auditCount = 0;

    const byChannel = {
      CASH: { inflow: 0, outflow: 0, net: 0, count: 0 },
      POS: { inflow: 0, outflow: 0, net: 0, count: 0 },
      BANK_TRANSFER: { inflow: 0, outflow: 0, net: 0, count: 0 },
      MOBILE_MONEY: { inflow: 0, outflow: 0, net: 0, count: 0 },
    };

    const expenseCatMap = {};

    for (const tx of transactions) {
      const txStatus = tx.status || 'ACTIVE';
      const txTime = new Date(tx.transaction_date).getTime();
      const amt = Number(tx.amount || 0);

      if (txStatus !== 'ACTIVE') {
        if (txTime >= startMs && txTime <= endMs) {
          auditCount++;
        }
        continue;
      }

      if (txTime < startMs) {
        priorNet += tx.type === 'INFLOW' ? amt : -amt;
        continue;
      }

      if (txTime >= startMs && txTime <= endMs) {
        activeCount++;
        const ch = byChannel[tx.payment_method] ? tx.payment_method : 'CASH';
        byChannel[ch].count += 1;

        if (tx.type === 'INFLOW') {
          periodInflow += amt;
          byChannel[ch].inflow += amt;
          byChannel[ch].net += amt;
        } else {
          periodOutflow += amt;
          byChannel[ch].outflow += amt;
          byChannel[ch].net -= amt;

          const cat = tx.category || 'Miscellaneous Expense';
          if (!expenseCatMap[cat]) {
            expenseCatMap[cat] = { category: cat, amount: 0, count: 0 };
          }
          expenseCatMap[cat].amount += amt;
          expenseCatMap[cat].count += 1;
        }
      }
    }

    // Determine effective Opening Balance for the selected period
    let openingBalance = priorNet;
    if (
      cashDateRange === 'DAILY' &&
      cashbookSession?.todaySession?.opening_balance !== undefined &&
      cashbookSession?.todaySession?.opening_balance !== null
    ) {
      openingBalance = Number(cashbookSession.todaySession.opening_balance);
    } else if (cashDateRange === 'ALL' && cashbookSession?.todaySession?.opening_balance) {
      // Include any initial float difference if explicitly set
      openingBalance = 0;
    }

    const closingBalance = openingBalance + periodInflow - periodOutflow;
    const expensesByCategory = Object.values(expenseCatMap).sort((a, b) => b.amount - a.amount);

    return {
      openingBalance,
      periodInflow,
      periodOutflow,
      closingBalance,
      activeCount,
      auditCount,
      byChannel,
      expensesByCategory,
    };
  }, [transactions, cashPeriodBounds, cashDateRange, cashbookSession]);

  // Debtor Book & Customer Ledgers Calculations
  const debtorMetrics = useMemo(() => {
    const owing = credits.filter((slip) => slip.status === 'OWING' && Number(slip.balance_due) > 0);
    const overdue = owing.filter((slip) => slip.is_overdue);
    const balance = (rows) => rows.reduce((sum, slip) => sum + Number(slip.balance_due), 0);
    return {
      outstanding: balance(owing),
      overdue: balance(overdue),
      overdueSlips: overdue.length,
      collected: credits.reduce((sum, slip) => sum + Number(slip.amount_paid || 0), 0),
    };
  }, [credits]);

  const filteredLedgers = useMemo(() => {
    const q = debouncedDebtorSearch.trim().toLowerCase();
    return customerLedgers.filter((l) => {
      if (q) {
        const matchName = (l.customer_name || '').toLowerCase().includes(q);
        const matchPhone = (l.phone || '').toLowerCase().includes(q);
        const matchAddress = (l.customer_address || '').toLowerCase().includes(q);
        const matchNotes = (l.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAddress && !matchNotes) return false;
      }
      if (debtorFilter === 'OWING') return Number(l.total_balance_due) > 0;
      if (debtorFilter === 'OVERDUE') return l.is_overdue && Number(l.total_balance_due) > 0;
      if (debtorFilter === 'SETTLED') return Number(l.total_balance_due) <= 0;
      return true;
    });
  }, [customerLedgers, debouncedDebtorSearch, debtorFilter]);

  const filteredCredits = useMemo(() => {
    const q = debouncedDebtorSearch.trim().toLowerCase();
    return credits.filter((c) => {
      if (q) {
        const matchName = (c.customer_name || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchItems = (c.items_summary || '').toLowerCase().includes(q);
        const matchAddress = (c.customer_address || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchItems && !matchAddress) return false;
      }
      const isOwing = c.status === 'OWING' && Number(c.balance_due) > 0;
      if (debtorFilter === 'OWING') return isOwing;
      if (debtorFilter === 'OVERDUE') return c.is_overdue && isOwing;
      if (debtorFilter === 'SETTLED') return !isOwing;
      return true;
    });
  }, [credits, debouncedDebtorSearch, debtorFilter]);

  const productPage = useListPage(filteredProducts, JSON.stringify([activeTab, debouncedSearch, categoryFilter, stockStatus]));
  const transactionPage = useListPage(filteredTransactions, filteredTransactions);
  const movementPage = useListPage(filteredMovements, filteredMovements);
  const ledgerPage = useListPage(filteredLedgers, filteredLedgers);
  const creditPage = useListPage(filteredCredits, filteredCredits);

  // Analytics & Profit & Loss Period Calculations
  const [financialReport, setFinancialReport] = useState(null);
  const [homePeriod, setHomePeriod] = useState('TODAY');
  const selectedReportPeriod = activeTab === 'home' ? homePeriod : analyticsDateRange;
  const analyticsPeriodBounds = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfTradingDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

    if (selectedReportPeriod === 'TODAY') {
      return {
        startMs: startOfToday,
        endMs: endOfTradingDay,
        label: "Today's Trading",
      };
    }
    if (selectedReportPeriod === 'WEEK') {
      return {
        startMs: now.getTime() - 7 * 86400000,
        endMs: endOfTradingDay,
        label: 'Last 7 Days (This Week)',
      };
    }
    if (selectedReportPeriod === 'MONTH') {
      return {
        startMs: now.getTime() - 30 * 86400000,
        endMs: endOfTradingDay,
        label: 'Last 30 Days (This Month)',
      };
    }
    if (selectedReportPeriod === 'CUSTOM') {
      const s = analyticsStartDate ? new Date(`${analyticsStartDate}T00:00:00.000`).getTime() : 0;
      const endDate = analyticsEndDate ? new Date(`${analyticsEndDate}T00:00:00`) : null;
      const e = endDate ? endDate.setDate(endDate.getDate() + 1) : endOfTradingDay;
      return {
        startMs: s,
        endMs: e,
        label: analyticsStartDate && analyticsEndDate ? `${analyticsStartDate} to ${analyticsEndDate}` : 'Custom Date Range',
      };
    }
    return {
      startMs: startOfToday,
      endMs: endOfTradingDay,
      label: "Today's Trading",
    };
  }, [selectedReportPeriod, analyticsStartDate, analyticsEndDate]);

  const { startMs, endMs, label: analyticsLabel } = analyticsPeriodBounds;
  const activeTransactions = useMemo(
    () => transactions.filter((entry) => !entry.status || entry.status === 'ACTIVE'),
    [transactions],
  );
  const recentSales = useMemo(
    () => activeTransactions.filter((entry) => entry.type === 'INFLOW' && entry.category === 'Counter Sales'),
    [activeTransactions],
  );
  const periodEntries = useMemo(() => activeTransactions.filter((entry) => {
    const time = Date.parse(entry.transaction_date || entry.created_at);
    return time >= startMs && time < endMs;
  }), [activeTransactions, startMs, endMs]);
  const validReportPeriod = Number.isFinite(startMs) && Number.isFinite(endMs) && startMs < endMs;
  const reportKey = `${currentUser?.id}:${startMs}:${endMs}`;

  useEffect(() => {
    if (!isApprovedStoreAccess || !['analytics', 'home'].includes(activeTab) || !validReportPeriod) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    });

    apiFetch(`/api/v1/cashbook/report?${params}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setFinancialReport({ key: reportKey, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFinancialReport({ key: reportKey, error: 'Could not load the financial report.' });
        }
      });
    return () => controller.abort();
  }, [activeTab, isApprovedStoreAccess, validReportPeriod, reportKey, startMs, endMs, transactions]);

  const periodReport = financialReport?.key === reportKey ? financialReport : null;
  const analyticsFinancials = useMemo(() => {
    if (!periodReport?.data) return null;

    // Liquid Cash Available Position (current physical drawer + bank/pos from cashbook dashboard)
    const netCashBal = Number(dashboard.net_cash_balance || 0);
    const channels = dashboard.channels || [];
    const cashDrawerCh = channels.find((c) => c.payment_method === 'CASH');
    const posCh = channels.find((c) => c.payment_method === 'POS');
    const bankCh = channels.find((c) => c.payment_method === 'BANK_TRANSFER');

    const cashInDrawer = cashDrawerCh ? Number(cashDrawerCh.net || 0) : Number(cashbookSession?.effectiveOpeningCash || 0);
    const posBalance = posCh ? Number(posCh.net || 0) : 0;
    const bankBalance = bankCh ? Number(bankCh.net || 0) : Number(cashbookSession?.effectiveOpeningBankPos || 0);
    const cashAvailable = netCashBal > 0 ? netCashBal : Number((cashInDrawer + posBalance + bankBalance).toFixed(2));

    // Inventory Valuation
    const inventoryCostValue = Number(dashboard.inventory_cost_value || 0);
    const inventoryRetailValue = Number(dashboard.inventory_retail_value || 0);
    const unrealizedMargin = Number(dashboard.projected_gross_margin || 0);

    return {
      ...periodReport.data,
      dateRangeLabel: analyticsLabel,
      metrics: {
        ...periodReport.data.metrics,
        cashAvailable,
        cashInDrawer,
        posBalance,
        bankBalance,
        inventoryCostValue,
        inventoryRetailValue,
        unrealizedMargin,
      },
    };
  }, [periodReport, dashboard, cashbookSession, analyticsLabel]);

  // Cart Calculations
  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === Number(id));
        if (!product || qty <= 0) return null;
        return {
          product,
          quantity: Number(qty),
          lineTotal: Number((Number(product.selling_price) * Number(qty)).toFixed(2)),
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartTotal = useMemo(
    () => Number(cartItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)),
    [cartItems]
  );

  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const addToCart = (product) => {
    const currentInCart = Number(cart[product.id] || 0);
    const available = Number(product.stock_quantity);
    if (available <= 0) {
      toastWarning?.(`"${product.name}" is currently out of stock.`);
      return;
    }
    if (currentInCart + 1 > available) {
      toastWarning?.(`Only ${available} ${product.unit} of "${product.name}" available in stock!`);
      return;
    }
    setCart((prev) => ({ ...prev, [product.id]: currentInCart + 1 }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const clearCart = () => {
    checkoutAttempt.current = null;
    setCart({});
    setIsPartPayment(false);
    setAmountPaidNow('');
  };

  const updateCartQty = (productId, delta, maxStock) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      if (next > maxStock) {
        toastWarning?.(`Cannot exceed available shelf stock of ${maxStock}!`);
        return prev;
      }
      return { ...prev, [productId]: next };
    });
  };

  const checkoutBody = () => JSON.stringify({
    items: cartItems.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
    payment_method: checkoutMethod,
    amount_paid: isPartPayment ? Number(amountPaidNow || 0) : cartTotal,
    customer_name: customerName,
    customer_phone: customerPhone,
  });

  // Step 1: Validate and open the confirmation step
  const handleInitiateCheckout = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (cartItems.length === 0) {
      toastWarning?.('Your customer basket is empty. Tap products to add them.');
      return;
    }

    const paid = isPartPayment ? Number(amountPaidNow || 0) : cartTotal;
    const balance = cartTotal - paid;

    if (balance > 0 && !customerName.trim()) {
      toastError?.('Please enter Customer Name to record the unpaid balance in the Credit Book.');
      return;
    }

    // A confirmed sale may already have changed stock when its response was lost.
    if (checkoutAttempt.current?.userId === currentUser?.id &&
        checkoutAttempt.current?.body === checkoutBody()) {
      setIsConfirmModalOpen(true);
      return;
    }

    // Verify available stock for all items
    for (const item of cartItems) {
      const available = Number(item.product.stock_quantity);
      if (item.quantity > available) {
        toastError?.(`Insufficient stock for "${item.product.name}"! Only ${available} available on shelf.`);
        return;
      }
    }

    setIsConfirmModalOpen(true);
  };

  // Step 2: Atomic Checkout execution (with rollback on error & state preservation)
  const handleConfirmCheckout = async () => {
    if (cartItems.length === 0 || checkoutInProgress.current) return;

    const body = checkoutBody();
    const userId = currentUser?.id;
    if (checkoutAttempt.current?.body !== body || checkoutAttempt.current?.userId !== userId) {
      const key = Array.from(crypto.getRandomValues(new Uint8Array(16)),
        (byte) => byte.toString(16).padStart(2, '0')).join('');
      checkoutAttempt.current = { body, userId, key };
    }

    checkoutInProgress.current = true;
    setSubmitting(true);
    try {
      const {
        basketTotal, actualPaid, balanceDue, movementsCreated, cashTransaction,
      } = await apiFetch('/api/v1/sales/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': checkoutAttempt.current.key },
        body,
      });
      const firstMovement = movementsCreated[0];
      checkoutAttempt.current = null;

      setLastReceipt({
        receiptNo: `MOS-${String(firstMovement.id).padStart(6, '0')}`,
        timestamp: new Date(firstMovement.created_at).toLocaleString(),
        businessName: currentUser?.business_name || 'MarketOS Store',
        location: currentUser?.location || 'Lagos, Nigeria',
        cashierName: currentUser?.full_name || 'Store Owner',
        customerName: firstMovement.counterparty_name,
        customerPhone: customerPhone.trim() || '',
        paymentMethod: cashTransaction?.payment_method || checkoutMethod,
        items: movementsCreated.map((movement) => ({
          name: movement.product_name,
          unit: movement.unit,
          quantity: Math.abs(Number(movement.quantity_change)),
          unitPrice: Number(movement.unit_price),
          lineTotal: Number(movement.total_value),
        })),
        totalBill: basketTotal,
        amountPaid: actualPaid,
        balanceDue,
      });

      // Transaction successfully committed: reset cart and close modals
      setCart({});
      setIsPartPayment(false);
      setAmountPaidNow('');
      setCustomerName('');
      setCustomerPhone('');
      setIsConfirmModalOpen(false);
      setIsMobileCartOpen(false);

      showSuccessToast(
        balanceDue > 0
          ? `Sale saved! ${formatNaira(actualPaid)} received, ${formatNaira(balanceDue)} added to Credit Book.`
          : `Sale completed! ${formatNaira(basketTotal)} recorded in ${PAYMENT_CHANNEL_LABELS[checkoutMethod] || checkoutMethod}.`
      );
      fetchAllData();
    } catch (err) {
      // NOTE: Cart and form inputs are intentionally NOT wiped on failure,
      // allowing the cashier to adjust quantities and retry!
      setIsConfirmModalOpen(false);
      toastError?.(err.message || 'Checkout failed. Your cart was preserved.');
    } finally {
      checkoutInProgress.current = false;
      setSubmitting(false);
    }
  };

  const openReceiptForMovement = (m) => {
    setLastReceipt({
      receiptNo: `MOS-${String(m.id).padStart(6, '0')}`,
      timestamp: new Date(m.created_at).toLocaleString(),
      businessName: currentUser?.business_name || 'MarketOS Store',
      location: currentUser?.location || 'Lagos, Nigeria',
      cashierName: currentUser?.full_name || 'Store Owner',
      customerName: m.counterparty_name || 'Walk-in Customer',
      customerPhone: '',
      paymentMethod: 'CASH',
      items: [
        {
          name: m.product_name,
          unit: m.unit,
          quantity: Math.abs(Number(m.quantity_change)),
          unitPrice: Number(m.unit_price || 0),
          lineTotal: Number(m.total_value || 0),
        },
      ],
      totalBill: Number(m.total_value || 0),
      amountPaid: Number(m.total_value || 0),
      balanceDue: 0,
    });
  };

  const openReceiptForTransaction = (tx) => {
    setLastReceipt({
      receiptNo: `MOS-${String(tx.id).padStart(6, '0')}`,
      timestamp: new Date(tx.transaction_date).toLocaleString(),
      businessName: currentUser?.business_name || 'MarketOS Store',
      location: currentUser?.address || currentUser?.city || 'Lagos, Nigeria',
      cashierName: currentUser?.full_name || 'Store Owner',
      customerName: tx.counterparty_name || 'Customer',
      customerPhone: '',
      paymentMethod: tx.payment_method || 'CASH',
      items: [
        {
          name: tx.description || tx.category || 'Retail Sale Order',
          unit: 'Order',
          quantity: 1,
          unitPrice: Number(tx.amount || 0),
          lineTotal: Number(tx.amount || 0),
        },
      ],
      totalBill: Number(tx.amount || 0),
      amountPaid: Number(tx.amount || 0),
      balanceDue: 0,
    });
  };

  // Expected value inside Stock Movement modal
  const expectedMovementValue = useMemo(() => {
    if (!selectedProduct || !movementForm.quantity) return 0;
    const qty = Number(movementForm.quantity);
    if (Number.isNaN(qty) || qty <= 0) return 0;
    const price =
      movementForm.movement_type === 'SALE'
        ? Number(selectedProduct.selling_price)
        : Number(selectedProduct.cost_price);
    return qty * price;
  }, [selectedProduct, movementForm.quantity, movementForm.movement_type]);

  const [productError, setProductError] = useState('');
  useEffect(() => {
    if (!showProductModal) setProductError('');
  }, [showProductModal]);

  // Save Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setProductError('');
    const name = productForm.name.trim();
    if (!name) {
      setProductError('Enter a product name.');
      return;
    }
    if (Number(productForm.selling_price) < Number(productForm.cost_price)) {
      setProductError('Selling price must be at least the unit cost.');
      return;
    }
    setSubmitting(true);
    try {
      const url = editingProduct
        ? `/api/v1/products/${editingProduct.id}`
        : '/api/v1/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const autoSku =
        productForm.sku.trim() || `${businessProfile.skuPrefix}-${Math.floor(100 + Math.random() * 900)}`;

      await apiFetch(url, {
        method,
        body: JSON.stringify({ ...productForm, name, sku: autoSku }),
      });

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        ...INITIAL_PRODUCT_FORM,
        category: businessProfile.categories[0],
        unit: businessProfile.units[0],
      });
      showSuccessToast(editingProduct ? 'Item updated!' : 'New item added to inventory!');
      fetchAllData();
    } catch (err) {
      setProductError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (product) => {
    if (
      !window.confirm(
        `Remove "${product.name}" and its movement history from your store shelf?`
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/products/${product.id}`, {
        method: 'DELETE',
      });
      setShowProductModal(false);
      setEditingProduct(null);
      showSuccessToast(`"${product.name}" removed from shelf.`);
      fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Seed Starter Catalog
  const handleSeedStarterCatalog = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/products/seed-starter', {
        method: 'POST',
      });
      showSuccessToast(`${currentUser?.business_type || 'Business'} Starter Catalog loaded (0 stock)!`);
      fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Record Stock Movement (Sale / Restock / Shelf Count / Damaged / Expired / Missing)
  const handleRecordMovement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/v1/inventory/movements', {
        method: 'POST',
        headers: {
          'Idempotency-Key': `${selectedProduct.id}-${Date.now()}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          ...movementForm,
        }),
      });

      const isSale = movementForm.movement_type === 'SALE';
      const qtyNum = Math.abs(Number(movementForm.quantity || 0));
      const unitSelling = Number(selectedProduct.selling_price || 0);
      const totalSaleVal = qtyNum * unitSelling;

      if (isSale && res?.movement) {
        setLastReceipt({
          receiptNo: `MOS-${String(res.movement.id).padStart(6, '0')}`,
          timestamp: new Date().toLocaleString(),
          businessName: currentUser?.business_name || 'MarketOS Store',
          location: currentUser?.location || 'Lagos, Nigeria',
          cashierName: currentUser?.full_name || 'Store Owner',
          customerName: movementForm.counterparty_name?.trim() || 'Walk-in Customer',
          customerPhone: '',
          paymentMethod: movementForm.payment_method || 'CASH',
          items: [
            {
              name: selectedProduct.name,
              unit: selectedProduct.unit,
              quantity: qtyNum,
              unitPrice: unitSelling,
              lineTotal: totalSaleVal,
            },
          ],
          totalBill: totalSaleVal,
          amountPaid:
            movementForm.amount_paid !== '' && movementForm.amount_paid !== undefined
              ? Number(movementForm.amount_paid)
              : totalSaleVal,
          balanceDue: 0,
        });
      }

      const prodName = selectedProduct.name;
      const prodUnit = selectedProduct.unit;
      setSelectedProduct(null);
      showSuccessToast(
        isSale
          ? `Sold ${qtyNum} ${prodUnit} of "${prodName}" (${formatNaira(totalSaleVal)}) — logged in Activity History!`
          : 'Stock level updated and logged in History!'
      );
      fetchAllData();
    } catch (err) {
      toastError?.(err.message) || alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Record Direct Cash Entry
  const [cashEntryError, setCashEntryError] = useState('');
  useEffect(() => {
    if (!showCashModal) setCashEntryError('');
  }, [showCashModal]);

  const handleCreateCashTx = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setCashEntryError('');
    if (!Number.isFinite(Number(cashForm.amount)) || Number(cashForm.amount) <= 0) {
      setCashEntryError('Enter an amount greater than zero.');
      return;
    }
    const reasonText = (cashForm.expense_reason || cashForm.description || '').trim();
    if (cashForm.type === 'OUTFLOW' && !reasonText) {
      setCashEntryError('Enter a reason for this expense.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...cashForm,
          expense_reason: reasonText || cashForm.category,
          description: reasonText || cashForm.category,
          idempotency_key: `cash-${Date.now()}`,
        }),
      });

      setShowCashModal(false);
      setCashForm(INITIAL_CASH_FORM);
      showSuccessToast('Cashbook entry saved!');
      fetchAllData();
    } catch (err) {
      setCashEntryError(err.message || 'Could not save the entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Collect Customer Debt Repayment
  const handleRepayDebt = async (e) => {
    e.preventDefault();
    if (!repayingCredit) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/credits/${repayingCredit.id}/repay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: repayAmount,
          payment_method: repayMethod,
        }),
      });

      setRepayingCredit(null);
      setRepayAmount('');
      showSuccessToast(`Collected ${formatNaira(repayAmount)} and added to Cashbook!`);
      fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Opens Audit-Safe Correction / Void Modal instead of permanently deleting financial records
  const handleOpenCorrectTx = (tx) => {
    setCorrectingTx(tx);
  };

  // Update Store Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/v1/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      setCurrentUser(data.user);
      showSuccessToast('Store profile updated!');
      setShowProfileModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Change Account Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({ current_password: '', new_password: '' });
      showSuccessToast('Account password updated!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV (Cross-OS compatible with UTF-8 BOM)
  const exportToCSV = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(',');
    const csv = [
      headers,
      ...rows.map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAuthenticatedUser = useCallback(
    (user) => {
      setCurrentUser(user);
      setProfileForm({
        full_name: user.full_name || '',
        business_name: user.business_name || '',
        phone: user.phone || '',
        location: user.location || '',
      });
      if (user.role === 'ADMIN') {
        showSuccessToast(`Welcome back, ${user.full_name}`);
        navigate('/admin');
      } else if (user.status !== 'APPROVED') {
        navigate('/pending');
      } else {
        showSuccessToast(`Signed in to ${user.business_name || 'Workspace'}`);
        navigate('/store/home');
      }
    },
    [navigate, showSuccessToast]
  );

  // 1. Loading Session State
  if (authChecking) {
    return (
      <div className="market-launch" role="status" aria-label="Loading MarketOS">
        <img src="/favicon.svg" width="80" height="80" alt="" />
      </div>
    );
  }

  // 2. Unauthenticated -> Render Dedicated Standalone /signup Page OR Dedicated Standalone /login Page
  if (!currentUser) {
    if (path === '/signup') {
      return (
        <SignupPage
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onAuthenticated={handleAuthenticatedUser}
          onNavigate={navigate}
        />
      );
    }
    return (
      <LoginPage
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onAuthenticated={handleAuthenticatedUser}
        onNavigate={navigate}
      />
    );
  }

  // 3. Dedicated Standalone Settings Page (/settings) for both Admin and User accounts
  if (currentUser.must_change_password || path === '/settings' || path === '/store/settings' || path === '/admin/settings') {
    return (
      <SettingsPage
        currentUser={currentUser}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        onNavigate={navigate}
        onLogout={handleLogout}
        onToast={showSuccessToast}
      />
    );
  }

  // 4. Pending Approval / Suspended / Rejected -> Render Dedicated Standalone Account Governance Page (/pending)
  if (currentUser.status !== 'APPROVED' && currentUser.role !== 'ADMIN') {
    return (
      <AccountStatusScreen
        user={currentUser}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          if (updated.status === 'APPROVED') {
            navigate('/store/sell');
          }
        }}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Dedicated Standalone Executive Admin Governance Page (/admin)
  //    Restricted to the single platform owner. The server independently enforces this on every admin API.
  const isPlatformOwner = currentUser.role === 'ADMIN' && currentUser.status === 'APPROVED';
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isPlatformOwner) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="liquid-glass-elevated rounded-3xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-extrabold font-luxury text-theme-primary">Access Restricted</h1>
            <p className="text-xs text-theme-secondary">
              This area is reserved for the platform owner. You do not have permission to view it.
            </p>
            <button
              type="button"
              onClick={() => navigate('/store/sell')}
              className="liquid-btn-primary px-5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer"
            >
              Return to My Store
            </button>
          </div>
        </div>
      );
    }
    return (
      <AdminPage
        currentUser={currentUser}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onNavigate={navigate}
        onLogout={handleLogout}
        toast={toast}
        onToast={showSuccessToast}
      />
    );
  }

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      ...INITIAL_PRODUCT_FORM,
      category: businessProfile.categories[0],
      unit: businessProfile.units[0],
    });
    setShowProductModal(true);
  };
  const openCashEntry = () => {
    setCashForm(INITIAL_CASH_FORM);
    setShowCashModal(true);
  };
  const openClosing = () => {
    handleSelectTab('cashbook');
    setSessionModalMode('CLOSE');
    setShowSessionModal(true);
  };
  const openRestock = (product) => {
    if (!product) {
      setShowRestockModal(true);
      return;
    }
    setSelectedProduct(product);
    setMovementForm({
      movement_type: 'RESTOCK', quantity: '', record_cash: true, amount_paid: '',
      payment_method: 'CASH', counterparty_name: product.supplier_name || '', note: '',
    });
  };
  const navigation = {
    user: currentUser,
    onSelect: handleSelectTab,
    onSettings: () => navigate('/settings'),
    onAdmin: isPlatformOwner ? () => navigate('/admin') : undefined,
    onLogout: handleLogout,
    onClosing: openClosing,
  };
  const stockCounts = products.reduce((counts, product) => {
    const amount = Number(product.stock_quantity);
    const status = amount <= 0 ? 'OUT' : amount <= Number(product.reorder_level) ? 'LOW' : 'HEALTHY';
    counts[status] += 1;
    return counts;
  }, { HEALTHY: 0, LOW: 0, OUT: 0 });

  return (
    <div className="market-workspace">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <WorkspaceNavigation {...navigation} active={activeTab} darkMode={darkMode} onTheme={() => setDarkMode((current) => !current)} />
      <main key={activeTab} id="main-content" className="workspace-main workspace-enter space-y-5">
        {/* Toast Alert */}
        {toast && (
          <div className="liquid-btn-primary px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {error && (
          <div className="liquid-glass px-4 py-3 rounded-2xl text-sm flex items-center justify-between gap-2 text-theme-outflow">
            <span>{error}</span>
            <button
              onClick={() => fetchAllData()}
              className="text-xs font-bold underline cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'home' && (
          <TraderHome
            user={currentUser} dashboard={dashboard} products={products} session={cashbookSession}
            report={periodReport} loading={loading} period={homePeriod} entries={periodEntries}
            onPeriod={setHomePeriod} formatMoney={formatNaira} onSelect={handleSelectTab}
            onRestock={openRestock} onAddProduct={openAddProduct} onMoney={openCashEntry}
            onCredit={() => setShowAddCreditModal(true)} onClosing={openClosing}
            onExport={() => exportToCSV(periodEntries, 'marketos-cash-ledger.csv')}
          />
        )}

        {activeTab === 'more' && <WorkspaceMore {...navigation} />}

        {activeTab === 'cashbook' && (
          <>
            <div className="workspace-page-heading money-heading"><h1 className="workspace-title">Shop money</h1><button type="button" className="workspace-primary" onClick={openCashEntry}><Plus size={16} aria-hidden="true" />Record money</button></div>
        <details className="workspace-panel inventory-totals"><summary>Shop balances</summary>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard
            title="Net Balance"
            value={formatNaira(dashboard.net_cash_balance)}
            icon={Wallet}
            loading={loading}
            subtitle={
              <span>
                Today In:{' '}
                <strong className="text-theme-inflow tabular-nums">
                  +{formatNaira(dashboard.today_inflow)}
                </strong>{' '}
                | Out:{' '}
                <strong className="text-theme-outflow tabular-nums">
                  -{formatNaira(dashboard.today_outflow)}
                </strong>
              </span>
            }
          />
          <StatCard
            title="Inventory Value"
            value={formatNaira(dashboard.inventory_retail_value)}
            icon={Package}
            loading={loading}
            subtitle={
              <span>
                Cost:{' '}
                <strong className="text-theme-primary tabular-nums">
                  {formatNaira(dashboard.inventory_cost_value)}
                </strong>{' '}
                | Margin:{' '}
                <strong className="text-theme-inflow tabular-nums">
                  +{formatNaira(dashboard.projected_gross_margin)}
                </strong>
              </span>
            }
          />
          <StatCard
            title="Receivables"
            value={formatNaira(dashboard.total_credit_owed)}
            valueColor={
              Number(dashboard.total_credit_owed) > 0
                ? 'text-theme-outflow'
                : 'text-theme-primary'
            }
            icon={Users}
            loading={loading}
            subtitle={
              <span>
                <strong className="text-theme-primary">
                  {dashboard.active_debtors_count || 0} account(s)
                </strong>{' '}
                outstanding
              </span>
            }
          />
          <StatCard
            title="Restock Alerts"
            value={`${dashboard.low_stock_count || 0} Low Stock`}
            valueColor={
              Number(dashboard.low_stock_count) > 0
                ? 'text-theme-warning'
                : 'text-theme-inflow'
            }
            icon={AlertTriangle}
            loading={loading}
            subtitle={
              <button
                type="button"
                onClick={() => setShowRestockModal(true)}
                className="text-theme-brand font-extrabold underline cursor-pointer"
              >
                View Restock Plan →
              </button>
            }
          />
        </section>
        </details>

          </>
        )}

        {/* Onboarding Launch Journey Card */}
        {activeTab === 'home' && <OnboardingJourneyCard
          currentUser={currentUser}
          products={products}
          transactions={transactions}
          movements={movements}
          cashbookSession={cashbookSession}
          onOpenBusinessSetup={() => setShowBusinessSetupModal(true)}
          onSeedStarter={handleSeedStarterCatalog}
          onAddProduct={() => {
            setEditingProduct(null);
            setProductForm(INITIAL_PRODUCT_FORM);
            setShowProductModal(true);
          }}
          onOpenQuickStock={() => setShowQuickStockModal(true)}
          onGoToCounter={() => handleSelectTab('counter', false)}
          isDismissed={isOnboardingDismissed}
          onToggleDismiss={() => {
            setIsOnboardingDismissed((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('marketos_hide_onboarding', String(next));
              } catch {
                // ignore
              }
              return next;
            });
          }}
          formatCurrency={formatNaira}
        />}

        {/* TAB 1: QUICK SELL (SHOP COUNTER) */}
        {activeTab === 'counter' && (
          <section className="shop-tool sell-screen">
            <div className="workspace-page-heading sell-heading">
              <h1 className="workspace-title">Make a sale</h1>
              <div className="shop-drawer-total"><span>Drawer cash</span><b>{cashbookSession ? formatNaira(cashbookSession.expectedClosingCash) : '—'}</b></div>
            </div>
            <div className="workspace-columns workspace-sale">
            <div id="counter-results" className="workspace-panel sell-catalog">
              <div className="sell-catalog-header">
                <h2>Products</h2>
                <span>{filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="sell-filters">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input
                    type="text"
                    aria-label="Search products to sell" placeholder="Search by name or code"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="liquid-input w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl"
                  />
                </div>
                <select
                  aria-label="Product category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="liquid-input text-xs rounded-2xl px-3.5 py-2.5 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ALL' ? 'All categories' : c}
                    </option>
                  ))}
                </select>
              </div>

              {products.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Your store shelf is empty"
                  description="Add an item and how many you have. Then you can sell it here."
                  actionLabel="Add your first product"
                  onAction={openAddProduct}
                />
              ) : filteredProducts.length === 0 ? (
                <p role="status" className="workspace-muted p-4 text-sm">No items match this search.</p>
              ) : (
                <div className="shop-sale-items">
                  {productPage.rows.map((p) => {
                    const inBasket = cart[p.id] || 0;
                    const stock = Number(p.stock_quantity);
                    const isLow = stock <= Number(p.reorder_level);
                    return (
                      <div
                        key={p.id}
                        onClick={stock > 0 ? () => addToCart(p) : undefined}
                        className={stock > 0 ? "shop-sale-item cursor-pointer" : "shop-sale-item shop-sale-item-empty"}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-sm leading-snug break-words text-theme-primary">
                            {p.name}
                          </div>
                          <div className="sell-item-meta">
                            <span className="font-bold tabular-nums text-theme-primary">
                              {formatNaira(p.selling_price)} <span className="shop-unit">/ {p.unit}</span>
                            </span>
                            <span className={stock <= 0 ? 'text-theme-outflow' : isLow ? 'sell-low-stock' : 'workspace-muted'}>
                              {stock <= 0 ? 'Out of stock' : isLow ? `Low stock · ${stock} left` : `${stock} in stock`}
                            </span>
                          </div>
                        </div>

                        {stock <= 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(p);
                              setMovementForm({
                                movement_type: 'RESTOCK',
                                quantity: '',
                                record_cash: true,
                                amount_paid: '',
                                payment_method: 'CASH',
                                counterparty_name: p.supplier_name || '',
                                note: '',
                              });
                            }}
                            className="sell-row-action"
                          >
                            Restock
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              addToCart(p);
                            }}
                            aria-label={`Add ${p.name} to basket${inBasket ? ` (${inBasket} in basket)` : ''}`}
                            className="sell-row-action sell-row-add"
                          >
                            <Plus size={15} aria-hidden="true" />
                            {inBasket > 0 ? `Add (${inBasket})` : 'Add'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <ListPagination list={productPage} label="Products to sell" targetId="counter-results" />
            </div>

            {cartItemCount > 0 && (
              <a className="sell-basket-jump" href="#sell-basket">
                <span>Basket · {cartItemCount}</span>
                <strong>{formatNaira(cartTotal)} →</strong>
              </a>
            )}

            {/* Keep checkout beside the items on wide screens. */}
            <div
              ref={basketRef}
              className="workspace-panel shop-basket space-y-4"
              id="sell-basket"
              tabIndex={-1}
            >
              <div
                style={{ borderColor: 'var(--border-outer)' }}
                className="sell-basket-header"
              >
                <div className="sell-catalog-header">
                  <h2>Basket</h2>
                  <span>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {lastReceipt && (
                    <button
                      type="button"
                      onClick={() => setLastReceipt({ ...lastReceipt })}
                      className="text-[11px] font-bold text-theme-brand hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Last Receipt
                    </button>
                  )}
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart({})}
                      className="text-xs font-bold text-theme-outflow hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div className="sell-basket-empty">
                  <ShoppingCart size={24} aria-hidden="true" />
                  <p>Your basket is empty</p>
                  <span>Add a product to start the sale.</span>
                </div>
              ) : (
                <form onSubmit={handleInitiateCheckout} className="space-y-4">
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {cartItems.map(({ product, quantity, lineTotal }) => {
                      const stock = Number(product.stock_quantity);
                      const remaining = stock - quantity;
                      const isAtMax = quantity >= stock;

                      return (
                        <div
                          key={product.id}
                          className="liquid-glass-subtle p-3 rounded-2xl space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate text-theme-primary">
                                {product.name}
                              </div>
                              <div className="text-[11px] tabular-nums text-theme-secondary">
                                {formatNaira(product.selling_price)} × {quantity} {product.unit} ={' '}
                                <strong className="text-theme-primary">
                                  {formatNaira(lineTotal)}
                                </strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
                              title="Remove item from basket"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Live Available Stock Indicator */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-theme-secondary">
                              Available Stock: <strong className="text-theme-primary">{stock} {product.unit}</strong>
                            </span>
                            <span
                              className={
                                remaining <= Number(product.reorder_level)
                                  ? 'text-amber-500 font-bold'
                                  : 'text-emerald-500 font-bold'
                              }
                            >
                              {remaining} left after sale
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t theme-divider">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                aria-label={`Remove one ${product.name}`}
                                onClick={() =>
                                  updateCartQty(product.id, -1, stock)
                                }
                                className="liquid-input p-1.5 rounded-xl hover:opacity-80 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-extrabold tabular-nums w-6 text-center text-theme-primary">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                disabled={isAtMax}
                                aria-label={`Add one ${product.name}`}
                                onClick={() =>
                                  updateCartQty(product.id, 1, stock)
                                }
                                className="liquid-input p-1.5 rounded-xl hover:opacity-80 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isAtMax ? 'Maximum available shelf stock in basket' : 'Add another unit'}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <span className="text-xs font-black font-luxury text-theme-primary tabular-nums">
                              {formatNaira(lineTotal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Bill Banner */}
                  <div className="liquid-glass-header text-white p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Total Customer Bill
                    </span>
                    <span className="text-xl font-extrabold font-luxury tabular-nums text-white">
                      {formatNaira(cartTotal)}
                    </span>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-theme-primary">
                      How is the customer paying?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'CASH', label: 'Cash (Naira)' },
                        { id: 'POS', label: 'POS (Moniepoint/OPay)' },
                        { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
                        { id: 'MOBILE_MONEY', label: 'USSD / Wallet' },
                      ].map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          aria-pressed={checkoutMethod === m.id}
                          onClick={() => setCheckoutMethod(m.id)}
                          className={`py-2.5 px-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                            checkoutMethod === m.id
                              ? 'liquid-btn-primary'
                              : 'liquid-glass-subtle hover:opacity-90'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Credit / Part Payment Toggle */}
                  <div className="liquid-glass-subtle p-3.5 rounded-2xl space-y-2.5">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-theme-primary">
                      <input
                        type="checkbox"
                        checked={isPartPayment}
                        onChange={(e) => {
                          setIsPartPayment(e.target.checked);
                          if (!e.target.checked) setAmountPaidNow('');
                        }}
                      />
                      Customer is buying on Credit or Part-Payment
                    </label>

                    {isPartPayment && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold mb-1 text-theme-secondary">
                            How much did they pay right now? (Enter 0 if full credit)
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            max={cartTotal}
                            value={amountPaidNow}
                            onChange={(e) => setAmountPaidNow(e.target.value)}
                            placeholder="e.g. 2000"
                            className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Customer Name"
                            className="liquid-input rounded-xl px-2.5 py-2 text-xs"
                          />
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Phone (0803...)"
                            className="liquid-input rounded-xl px-2.5 py-2 text-xs"
                          />
                        </div>
                        <p className="text-[11px] font-bold tabular-nums text-theme-outflow">
                          Balance Owing:{' '}
                          {formatNaira(Math.max(0, cartTotal - Number(amountPaidNow || 0)))}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="liquid-btn-primary w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? 'Processing Sale...'
                      : `Review sale (${formatNaira(cartTotal)})`}
                  </button>
                </form>
              )}
            </div>
            <aside className="shop-tool-notes">
              <WorkspaceLedger title="Recent sales" entries={recentSales} formatMoney={formatNaira} onViewAll={() => handleSelectTab('history')} />
              <section className="workspace-panel space-y-2">
                <h2 className="font-bold">End of day</h2>
                <p className="workspace-muted text-sm">Count your cash and check it against your sales.</p>
                <button className="workspace-chip" onClick={openClosing}>Check today’s cash</button>
              </section>
            </aside>
            </div>
          </section>
        )}

        {/* TAB 2: MY SHELF STOCK & STOCK-TAKING */}
        {activeTab === 'inventory' && (
          <section className="shop-tool inventory-screen space-y-4">
            <div className="workspace-page-heading sell-heading">
              <h1 className="workspace-title">Your stock</h1>
              <div className="flex flex-wrap gap-2">
                <button className="workspace-chip" onClick={() => setShowAuditModal(true)}><ClipboardCheck size={16} />Count stock</button>
                <button className="workspace-primary" onClick={openAddProduct}><Plus size={16} />Add product</button>
              </div>
            </div>
            <details className="workspace-panel inventory-totals"><summary>Stock totals</summary>
            <div className="workspace-metrics">
              <WorkspaceMetric label="Total products" value={products.length} detail="Active catalog" icon={Package} />
              <WorkspaceMetric label="Total cost value" value={formatNaira(dashboard.inventory_cost_value)} detail="Acquisition cost" icon={Wallet} />
              <WorkspaceMetric label="Total retail value" value={formatNaira(dashboard.inventory_retail_value)} detail="At current selling prices" icon={BarChart3} />
              <WorkspaceMetric label="Stock health" value={stockCounts.HEALTHY} detail={`${stockCounts.LOW} low · ${stockCounts.OUT} out of stock`} icon={ClipboardCheck} />
            </div>
            </details>
            <div className="workspace-columns workspace-stock">
            <div id="inventory-results" className="workspace-panel workspace-catalog overflow-hidden !p-0">
            <div
              style={{ borderColor: 'var(--border-outer)' }}
              className="inventory-toolbar"
            >
              <div className="relative min-w-0">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                <input
                  type="text"
                  aria-label="Search catalog" placeholder="Search products, suppliers, or SKU…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="liquid-input w-full pl-10 pr-4 py-2 text-sm rounded-2xl"
                />
              </div>

              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Product category" className="workspace-chip">
                {categories.map((category) => <option key={category} value={category}>{category === 'ALL' ? 'All categories' : category}</option>)}
              </select>
              <div className="inventory-tools">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  className="inventory-tool"
                  title="Import goods in bulk via CSV or Excel paste"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBatchAdjustModal(true)}
                  className="inventory-tool"
                  title="Fast multi-product stock adjust (restock, damage, expired, missing)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Batch adjust</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(true)}
                  className="inventory-tool"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Restock plan ({lowStockRestockPlan.length})
                </button>
                <button
                  onClick={() =>
                    exportToCSV(
                      filteredProducts,
                      `shop-stock-${new Date().toISOString().slice(0, 10)}.csv`
                    )
                  }
                  className="inventory-tool"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            <div className="workspace-stock-filters inventory-status" role="group" aria-label="Stock status">

              {[['ALL', 'All'], ['HEALTHY', 'In stock'], ['LOW', 'Low stock'], ['OUT', 'Out of stock']].map(([id, label]) => (
                <button key={id} className="workspace-chip" aria-pressed={stockStatus === id} onClick={() => setStockStatus(id)}>
                  {label} ({id === 'ALL' ? products.length : stockCounts[id]})
                </button>
              ))}
            </div>

            {/* Mobile Card View (< 768px) */}
            {filteredProducts.length === 0 && (
              <p className="workspace-muted p-4 text-sm">
                {products.length ? 'No products match your filters.' : 'Add your first product to start tracking stock.'}
              </p>
            )}
            <div className="workspace-stock-cards md:hidden">
              {productPage.rows.map((p) => {
                const quantity = Number(p.stock_quantity);
                const stockStatusLabel = quantity <= 0 ? 'Out of stock' : quantity <= Number(p.reorder_level) ? 'Low stock' : 'In stock';
                const gain = Number(p.selling_price) - Number(p.cost_price);
                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="stock-item-name">
                          {p.name}
                        </div>
                        <div className="text-xs mt-0.5 text-theme-secondary">
                          {p.category}{p.supplier_name && ` · ${p.supplier_name}`}
                          {p.sku && <span className="stock-row-meta">{p.sku}</span>}
                        </div>
                      </div>
                      <span className={quantity <= 0 ? 'stock-status-out' : 'stock-row-meta'}>{stockStatusLabel}</span>
                    </div>

                    <div className="stock-mobile-facts">
                      <div><span className="block text-theme-secondary">Remaining count</span><strong>{Number(p.stock_quantity)} {p.unit}</strong></div>
                      <div>
                        <span className="block text-theme-secondary">Cost</span>
                        <strong className="text-theme-primary">
                          {formatNaira(p.cost_price)}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-theme-secondary">Selling</span>
                        <strong className="text-theme-primary">
                          {formatNaira(p.selling_price)}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-theme-secondary">Gain/{p.unit}</span>
                        <strong className={gain < 0 ? "workspace-negative" : gain > 0 ? "workspace-positive" : undefined}>
                          {gain > 0 ? "+" : ""}{formatNaira(gain)}
                        </strong>
                      </div>
                    </div>

                    <div className="stock-row-actions">
                      <button
                        onClick={() => {
                          resetHistoryFilters(String(p.id));
                          handleSelectTab('history');
                        }}
                        className="stock-row-action"
                      >
                        <History className="w-3.5 h-3.5" /> History
                      </button>
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setProductForm({
                            sku: p.sku,
                            name: p.name,
                            category: p.category,
                            unit: p.unit,
                            cost_price: p.cost_price,
                            selling_price: p.selling_price,
                            stock_quantity: p.stock_quantity,
                            reorder_level: p.reorder_level,
                            supplier_name: p.supplier_name || '',
                          });
                          setShowProductModal(true);
                        }}
                        className="stock-row-action"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setMovementForm({
                            movement_type: 'SALE',
                            quantity: '1',
                            record_cash: true,
                            amount_paid: '',
                            payment_method: 'CASH',
                            counterparty_name: '',
                            note: '',
                          });
                        }}
                        disabled={Number(p.stock_quantity) <= 0}
                        title={
                          Number(p.stock_quantity) <= 0
                            ? 'Out of stock — Restock first to sell'
                            : `Sell ${p.name} and record in History`
                        }
                        className="stock-row-action"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Sell
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setMovementForm({
                            movement_type: 'RESTOCK',
                            quantity: '',
                            record_cash: true,
                            amount_paid: '',
                            payment_method: 'CASH',
                            counterparty_name: p.supplier_name || '',
                            note: '',
                          });
                        }}
                        className="stock-row-action stock-row-adjust"
                      >
                        Adjust stock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="stock-catalog-table w-full text-left text-sm">
                <thead
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-outer)',
                  }}
                  className="border-b text-[11px] font-bold uppercase tracking-wider text-theme-secondary"
                >
                  <tr>
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Cost</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-right">Gain / Unit</th>
                    <th className="py-3.5 px-4 text-center">Stock on hand</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-divider">
                  {productPage.rows.map((p) => {
                    const quantity = Number(p.stock_quantity);
                    const stockStatusLabel = quantity <= 0 ? 'Out of stock' : quantity <= Number(p.reorder_level) ? 'Low stock' : 'In stock';
                    const gain = Number(p.selling_price) - Number(p.cost_price);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-white/30 dark:hover:bg-white/5"
                      >
                        <th scope="row" className="stock-item">
                          <span className="stock-item-name">{p.name}</span>
                          <span className="stock-row-meta">{[p.sku, p.unit].filter(Boolean).join(' · ')}</span>
                        </th>
                        <td>
                          <span className="stock-category">{p.category}</span>
                          {p.supplier_name && <span className="stock-row-meta">{p.supplier_name}</span>}
                        </td>
                        <td className="stock-money stock-cost">{formatNaira(p.cost_price)}</td>
                        <td className="stock-money stock-selling">{formatNaira(p.selling_price)}</td>
                        <td className={`stock-money ${gain < 0 ? 'workspace-negative' : gain > 0 ? 'workspace-positive' : ''}`}>
                          {gain > 0 ? '+' : ''}{formatNaira(gain)}
                        </td>
                        <td className="stock-on-hand">
                          <strong>{quantity} {p.unit}</strong>
                          <span className={`stock-row-meta ${quantity <= 0 ? 'stock-status-out' : ''}`}>{stockStatusLabel}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="stock-row-actions">
                            <button
                              onClick={() => {
                                resetHistoryFilters(String(p.id));
                                handleSelectTab('history');
                              }}
                              className="stock-row-action"
                              aria-label={`View history for ${p.name}`}
                              title={`Check history for ${p.name}`}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setProductForm({
                                  sku: p.sku,
                                  name: p.name,
                                  category: p.category,
                                  unit: p.unit,
                                  cost_price: p.cost_price,
                                  selling_price: p.selling_price,
                                  stock_quantity: p.stock_quantity,
                                  reorder_level: p.reorder_level,
                                  supplier_name: p.supplier_name || '',
                                });
                                setShowProductModal(true);
                              }}
                              className="stock-row-action"
                              aria-label={`Edit ${p.name}`}
                              title="Edit price or details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setMovementForm({
                                  movement_type: 'SALE',
                                  quantity: '1',
                                  record_cash: true,
                                  amount_paid: '',
                                  payment_method: 'CASH',
                                  counterparty_name: '',
                                  note: '',
                                });
                              }}
                              disabled={Number(p.stock_quantity) <= 0}
                              title={
                                Number(p.stock_quantity) <= 0
                                  ? 'Out of stock — Restock first to sell'
                                  : `Sell ${p.name} and record in History`
                              }
                              className="stock-row-action"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Sell
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setMovementForm({
                                  movement_type: 'RESTOCK',
                                  quantity: '',
                                  record_cash: true,
                                  amount_paid: '',
                                  payment_method: 'CASH',
                                  counterparty_name: p.supplier_name || '',
                                  note: '',
                                });
                              }}
                              className="stock-row-action stock-row-adjust"
                            >
                              Adjust stock
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              <ListPagination list={productPage} label="Stock catalog" targetId="inventory-results" />
            </div>
            <aside className="shop-tool-notes inventory-followup">
              <section className="workspace-panel inventory-followup-panel">
                <h2>Stock history</h2>
                <button type="button" className="inventory-followup-link" onClick={() => handleSelectTab('history')}>
                  <History size={18} aria-hidden="true" />
                  <span><strong>View movement log</strong><small>Review sales, restocks and adjustments.</small></span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="inventory-followup-link" onClick={() => setShowAuditModal(true)}>
                  <ClipboardCheck size={18} aria-hidden="true" />
                  <span><strong>Count stock</strong><small>Compare what’s on the shelf with your catalog.</small></span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </section>
              <section className="workspace-panel inventory-followup-panel">
                <div className="inventory-followup-header">
                  <h2>Needs restocking</h2>
                  {lowStockRestockPlan.length > 0 && <span>{lowStockRestockPlan.length} products</span>}
                </div>
                {lowStockRestockPlan.length === 0 ? (
                  <p className="workspace-muted text-sm py-3">No products need reordering.</p>
                ) : (
                  <ul>
                    {lowStockRestockPlan.slice(0, 3).map((product) => {
                      const quantity = Number(product.stock_quantity);
                      return (
                        <li key={product.id} className="inventory-restock-row">
                          <span className="min-w-0">
                            <strong>{product.name}</strong>
                            <small className={quantity <= 0 ? 'workspace-negative' : undefined}>
                              {quantity <= 0 ? 'Out of stock' : `${quantity} ${product.unit} left`}
                            </small>
                          </span>
                          <button type="button" className="stock-row-action stock-row-adjust"
                            aria-label={`Restock ${product.name}`} onClick={() => openRestock(product)}>Restock</button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button type="button" className="inventory-restock-plan" onClick={() => openRestock()}>
                  View restock plan <ArrowRight size={15} aria-hidden="true" />
                </button>
              </section>
            </aside>
            </div>
          </section>
        )}


        {/* TAB 3: MONEY IN & MONEY OUT (CASHBOOK) */}
        {activeTab === 'cashbook' && (
          <div className="money-workspace">
            <section className="workspace-panel money-register">
              <header className="money-section-header">
                <div>
                  <h2>Daily cash register</h2>
                  <p>{cashbookSession?.targetDate || 'Today'}{cashbookSession ? (cashbookSession.todaySession?.status === 'CLOSED' ? ' · Closed' : ' · Open') : ''}</p>
                </div>
                <button
                  type="button"
                  className="workspace-chip"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setSessionModalMode('OPEN');
                    setShowSessionModal(true);
                  }}
                >
                  Manage register
                </button>
              </header>
              <dl className="money-totals">
                <div className="money-key-total"><dt>Expected closing cash</dt><dd>{cashbookSession ? formatNaira(cashbookSession.expectedClosingBalance ?? 0) : '—'}</dd></div>
                <div><dt>Opening float</dt><dd>{cashbookSession ? formatNaira(cashbookSession.effectiveOpeningBalance ?? 0) : '—'}</dd></div>
                <div><dt>Cash in</dt><dd className="workspace-positive">{cashbookSession ? formatNaira(cashbookSession.dayInflow ?? 0) : '—'}</dd></div>
                <div><dt>Cash out</dt><dd className="workspace-negative">{cashbookSession ? formatNaira(cashbookSession.dayOutflow ?? 0) : '—'}</dd></div>
                {cashbookSession?.todaySession?.status === 'CLOSED' && (
                  <div><dt>Counted closing cash</dt><dd>{formatNaira(cashbookSession.todaySession.actual_closing_balance ?? 0)}</dd></div>
                )}
              </dl>
            </section>

            <section className="workspace-panel money-report">
              <header className="money-section-header">
                <div><h2>Cashbook summary</h2><p>{cashPeriodBounds.label}</p></div>
              </header>
              <dl className="money-totals">
                <div><dt>Opening balance</dt><dd>{formatNaira(cashbookReportSummary.openingBalance)}</dd></div>
                <div><dt>Money in</dt><dd className="workspace-positive">{formatNaira(cashbookReportSummary.periodInflow)}</dd></div>
                <div><dt>Money out</dt><dd className="workspace-negative">{formatNaira(cashbookReportSummary.periodOutflow)}</dd></div>
                <div className="money-key-total"><dt>Closing balance</dt><dd>{formatNaira(cashbookReportSummary.closingBalance)}</dd></div>
              </dl>

              <div className="money-channels">
                <h3>Payment channels</h3>
                <div className="money-channel-grid" role="group" aria-label="Filter ledger by payment channel">
                  {['CASH', 'POS', 'BANK_TRANSFER', 'MOBILE_MONEY'].map((channel) => {
                    const { icon: Icon, label } = getChannelBadgeMeta(channel);
                    const stats = cashbookReportSummary.byChannel[channel] || { net: 0, inflow: 0, outflow: 0, count: 0 };
                    const selected = channelFilter === channel;
                    return (
                      <button type="button" key={channel} aria-pressed={selected}
                        onClick={() => setChannelFilter(selected ? 'ALL' : channel)}>
                        <span className="money-channel-label"><Icon size={16} aria-hidden="true" />{label}</span>
                        <span className="money-channel-detail">In <b>{formatNaira(stats.inflow)}</b></span>
                        <span className="money-channel-detail">Out <b>{formatNaira(stats.outflow)}</b></span>
                        <span className="money-channel-detail">Net <b>{formatNaira(stats.net)}</b></span>
                        <span className="money-channel-detail money-channel-count">{stats.count} {stats.count === 1 ? 'entry' : 'entries'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 4. EXPENSE BREAKDOWN BY CATEGORY STRIP (WHEN EXPENSES EXIST IN PERIOD) */}
            {cashbookReportSummary.expensesByCategory.length > 0 && (
              <div className="liquid-glass px-4 py-3 rounded-2xl flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-theme-secondary mr-1">
                  Expenses by Category:
                </span>
                {cashbookReportSummary.expensesByCategory.map((exp) => (
                  <button
                    type="button"
                    key={exp.category}
                    onClick={() =>
                      setCashCategoryFilter(
                        cashCategoryFilter === exp.category ? 'ALL' : exp.category
                      )
                    }
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      cashCategoryFilter === exp.category
                        ? 'liquid-btn-primary'
                        : 'liquid-glass-subtle hover:opacity-90'
                    }`}
                  >
                    <span>{exp.category}:</span>
                    <span className="text-theme-outflow tabular-nums">
                      {formatNaira(exp.amount)}
                    </span>
                    <span className="text-[10px] opacity-70">({exp.count})</span>
                  </button>
                ))}
                {cashCategoryFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setCashCategoryFilter('ALL')}
                    className="text-xs font-bold text-emerald-400 hover:underline ml-1 cursor-pointer"
                  >
                    Reset Category
                  </button>
                )}
              </div>
            )}

            <section className="workspace-panel money-ledger" aria-labelledby="cash-entries-title">
              <header className="money-section-header">
                <h2 id="cash-entries-title">Cashbook entries</h2>
                <div className="money-ledger-actions">
                  <button type="button" className="workspace-chip" aria-pressed={showAuditTrail}
                    onClick={() => setShowAuditTrail(!showAuditTrail)}
                    title="Show corrected and voided entries">
                    <History size={15} aria-hidden="true" /> Audit trail
                  </button>
                  <button type="button" className="workspace-chip" onClick={() =>
                    exportToCSV(filteredTransactions, `cashbook-${cashDateRange.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`)
                  }>
                    <Download size={15} aria-hidden="true" /> Export CSV
                  </button>
                </div>
              </header>

              <div className="money-ledger-filters">
                <label>Report period
                  <select value={cashDateRange} onChange={(e) => {
                    setCashDateRange(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setCashStartDate('');
                      setCashEndDate('');
                    }
                  }}>
                    <option value="ALL">All time</option>
                    <option value="DAILY">Today</option>
                    <option value="WEEKLY">Last 7 days</option>
                    <option value="MONTHLY">Last 30 days</option>
                    <option value="CUSTOM">Custom range</option>
                  </select>
                </label>
                <label>Entry type
                  <select value={cashFilter} onChange={(e) => setCashFilter(e.target.value)}>
                    <option value="ALL">All entries</option>
                    <option value="INFLOW">Money in</option>
                    <option value="OUTFLOW">Money out</option>
                  </select>
                </label>
                <label>Payment channel
                  <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
                    <option value="ALL">All channels</option>
                    {['CASH', 'POS', 'BANK_TRANSFER', 'MOBILE_MONEY'].map((channel) => (
                      <option key={channel} value={channel}>{getChannelBadgeMeta(channel).label}</option>
                    ))}
                  </select>
                </label>
                <label>Category
                  <select value={cashCategoryFilter} onChange={(e) => setCashCategoryFilter(e.target.value)}>
                    {cashbookCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat === 'ALL' ? 'All categories' : cat}</option>
                    ))}
                  </select>
                </label>
                {cashDateRange === 'CUSTOM' && (
                  <>
                    <label>From<input type="date" value={cashStartDate} onChange={(e) => setCashStartDate(e.target.value)} /></label>
                    <label>To<input type="date" value={cashEndDate} onChange={(e) => setCashEndDate(e.target.value)} /></label>
                  </>
                )}
                <label className="money-ledger-search">Search entries
                  <input type="search" placeholder="Reason, category or payer" value={cashSearch}
                    onChange={(e) => setCashSearch(e.target.value)} />
                </label>
              </div>

              <div id="cash-results" />
              {filteredTransactions.length === 0 ? (
                <div className="money-ledger-empty">
                  <div role="status">
                    <h3>{hasCashFilters ? 'No matching entries' : 'No cashbook entries yet'}</h3>
                    <p>{hasCashFilters
                      ? 'Clear the filters to see all entries.'
                      : 'Record money received or spent to start your cashbook.'}</p>
                  </div>
                  <button type="button" className={hasCashFilters ? 'workspace-chip' : 'workspace-primary'}
                    onClick={hasCashFilters ? clearCashFilters : openCashEntry}>
                    {hasCashFilters ? 'Clear filters' : 'Record money'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile Card View (< 768px) */}
                  <div className="md:hidden divide-y theme-divider">
                    {transactionPage.rows.map((tx) => {
                      const txStatus = tx.status || 'ACTIVE';
                      const isInactive = txStatus !== 'ACTIVE';
                      const chMeta = getChannelBadgeMeta(tx.payment_method);
                      const ChIcon = chMeta.icon;
                      const reasonText = tx.expense_reason || tx.description;

                      return (
                        <div
                          key={tx.id}
                          className={`p-4 space-y-2 ${isInactive ? 'opacity-60 bg-slate-950/30' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant={tx.type === 'INFLOW' ? 'success' : 'danger'}
                                icon={tx.type === 'INFLOW' ? ArrowUpRight : ArrowDownRight}
                              >
                                {tx.type === 'INFLOW' ? 'MONEY IN' : 'EXPENSE'}
                              </Badge>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${chMeta.pillClass}`}
                              >
                                <ChIcon className="w-3 h-3" />
                                {chMeta.label}
                              </span>
                              {tx.parent_transaction_id && (
                                <Badge variant="info">
                                  AMENDED (Replaces #{tx.parent_transaction_id})
                                </Badge>
                              )}
                              {txStatus === 'CORRECTED' && (
                                <Badge variant="warning">
                                  SUPERSEDED {tx.replaced_by_id ? `→ #${tx.replaced_by_id}` : ''}
                                </Badge>
                              )}
                              {txStatus === 'VOIDED' && (
                                <Badge variant="danger">VOIDED</Badge>
                              )}
                            </div>

                            <span
                              className={`text-base font-extrabold font-luxury tabular-nums ${
                                isInactive
                                  ? 'line-through text-slate-500'
                                  : tx.type === 'INFLOW'
                                  ? 'text-theme-inflow'
                                  : 'text-theme-outflow'
                              }`}
                            >
                              {tx.type === 'INFLOW' ? '+' : '-'}
                              {formatNaira(tx.amount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-sm text-theme-primary">
                              {tx.category}
                            </span>
                            <span className="text-[11px] font-mono text-theme-secondary">
                              #{tx.id}
                            </span>
                          </div>

                          <div className="text-xs text-theme-secondary">
                            {tx.counterparty_name ? (
                              <strong className="text-theme-primary">
                                {tx.counterparty_name}:{' '}
                              </strong>
                            ) : null}
                            {reasonText}
                          </div>

                          {tx.correction_reason && (
                            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1">
                              <strong>Audit Note:</strong> {tx.correction_reason}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-theme-secondary">
                              {new Date(tx.transaction_date).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {tx.type === 'INFLOW' && (
                                <button
                                  type="button"
                                  onClick={() => openReceiptForTransaction(tx)}
                                  className="liquid-glass-subtle px-2 py-1 rounded-lg text-xs font-bold text-theme-brand flex items-center gap-1 cursor-pointer"
                                  title="View Customer Receipt"
                                >
                                  <FileText className="w-3 h-3" /> Receipt
                                </button>
                              )}
                              {!isInactive && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCorrectTx(tx)}
                                  className="liquid-glass-subtle px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" /> Correct / Void
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View (>= 768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-outer)',
                        }}
                        className="border-b text-[11px] font-bold uppercase tracking-wider text-theme-secondary"
                      >
                        <tr>
                          <th className="py-3.5 px-4">Date & Time</th>
                          <th className="py-3.5 px-4">Type & Audit Status</th>
                          <th className="py-3.5 px-4">Category</th>
                          <th className="py-3.5 px-4">Expense Reason / Details</th>
                          <th className="py-3.5 px-4">Payment Channel</th>
                          <th className="py-3.5 px-4 text-right">Amount ({currencySymbol})</th>
                          <th className="py-3.5 px-4 text-right">Audit Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y theme-divider">
                        {transactionPage.rows.map((tx) => {
                          const txStatus = tx.status || 'ACTIVE';
                          const isInactive = txStatus !== 'ACTIVE';
                          const chMeta = getChannelBadgeMeta(tx.payment_method);
                          const ChIcon = chMeta.icon;
                          const reasonText = tx.expense_reason || tx.description;

                          return (
                            <tr
                              key={tx.id}
                              className={`hover:bg-white/30 dark:hover:bg-white/5 ${
                                isInactive ? 'opacity-60 bg-slate-950/30' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4 text-xs tabular-nums text-theme-secondary whitespace-nowrap">
                                <div>{new Date(tx.transaction_date).toLocaleString()}</div>
                                <div className="text-[10px] font-mono opacity-75">Entry #{tx.id}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant={tx.type === 'INFLOW' ? 'success' : 'danger'}
                                    icon={tx.type === 'INFLOW' ? ArrowUpRight : ArrowDownRight}
                                  >
                                    {tx.type === 'INFLOW' ? 'MONEY IN' : 'EXPENSE'}
                                  </Badge>
                                  {tx.parent_transaction_id && (
                                    <Badge variant="info">
                                      AMENDED (#{tx.parent_transaction_id})
                                    </Badge>
                                  )}
                                  {txStatus === 'CORRECTED' && (
                                    <Badge variant="warning">
                                      CORRECTED {tx.replaced_by_id ? `→ #${tx.replaced_by_id}` : ''}
                                    </Badge>
                                  )}
                                  {txStatus === 'VOIDED' && (
                                    <Badge variant="danger">VOIDED</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-extrabold font-luxury text-theme-primary">
                                {tx.category}
                              </td>
                              <td className="py-3.5 px-4 text-theme-secondary max-w-md">
                                <div>
                                  {tx.counterparty_name ? (
                                    <strong className="text-theme-primary">
                                      {tx.counterparty_name}:{' '}
                                    </strong>
                                  ) : null}
                                  {reasonText}
                                </div>
                                {tx.correction_reason && (
                                  <div className="text-[11px] text-amber-300 mt-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-0.5 inline-block">
                                    <strong>Audit Reason:</strong> {tx.correction_reason}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${chMeta.pillClass}`}
                                >
                                  <ChIcon className="w-3.5 h-3.5" />
                                  {chMeta.label}
                                </span>
                              </td>
                              <td
                                className={`py-3.5 px-4 text-right font-extrabold font-luxury tabular-nums whitespace-nowrap ${
                                  isInactive
                                    ? 'line-through text-slate-500'
                                    : tx.type === 'INFLOW'
                                    ? 'text-theme-inflow'
                                    : 'text-theme-outflow'
                                }`}
                              >
                                {tx.type === 'INFLOW' ? '+' : '-'}
                                {formatNaira(tx.amount)}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {tx.type === 'INFLOW' && (
                                    <button
                                      type="button"
                                      onClick={() => openReceiptForTransaction(tx)}
                                      title="View, print, or share customer receipt"
                                      className="liquid-glass-subtle px-2.5 py-1.5 rounded-xl text-xs font-bold text-theme-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Receipt</span>
                                    </button>
                                  )}
                                  {!isInactive ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCorrectTx(tx)}
                                      title="Correct or void this entry while preserving audit history"
                                      className="liquid-glass-subtle px-2.5 py-1.5 rounded-xl text-xs font-bold text-theme-primary hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Correct</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-500 italic">
                                      Audit Locked
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ListPagination list={transactionPage} label="Cash entries" targetId="cash-results" />
                </>
              )}
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <section className="history-screen" aria-labelledby="history-title">
            <header className="history-heading">
              <h1 id="history-title" className="workspace-title">Sales &amp; stock history</h1>
              <button type="button" className="history-export" disabled={!filteredMovements.length}
                onClick={() => exportToCSV(filteredMovements, `shop-history-${new Date().toISOString().slice(0, 10)}.csv`)}>
                <Download size={16} aria-hidden="true" /> Export CSV
              </button>
            </header>

            <dl className="history-summary" aria-label="Value of movements in this view">
              {[
                ['Sales', historySummary.salesValue, historySummary.salesCount],
                ['Restocks', historySummary.restockValue, historySummary.restockCount],
                ['Stock losses', historySummary.lossValue, historySummary.lossCount],
              ].map(([label, amount, count]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{loading || (error && !movements.length) ? '—' : formatNaira(amount)}</dd>
                  <dd className="history-summary-count">{count} {count === 1 ? 'movement' : 'movements'}</dd>
                </div>
              ))}
            </dl>

            <section className="history-log" aria-labelledby="history-log-title">
              <header className="history-log-heading">
                <h2 id="history-log-title">Movement log</h2>
                {!loading && !error && (
                  <span role="status">{historyFiltered ? `${filteredMovements.length} of ` : ''}{movements.length} {movements.length === 1 ? 'movement' : 'movements'}</span>
                )}
              </header>
              <div className="history-filters">
                <label className="history-search">Search movements
                  <span>
                    <Search size={16} aria-hidden="true" />
                    <input type="search" value={historySearch} placeholder="Item, SKU, supplier or note"
                      onChange={(e) => setHistorySearch(e.target.value)} />
                  </span>
                </label>
                <label>Movement type
                  <select value={historyTypeFilter} onChange={(e) => setHistoryTypeFilter(e.target.value)}>
                    <option value="ALL">All activity</option>
                    <option value="SALE">Sales</option>
                    <option value="RESTOCK">Restocks</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="MISSING">Missing</option>
                    <option value="ADJUSTMENT">Shelf counts</option>
                    <option value="SURPLUS">Surplus</option>
                  </select>
                </label>
                <label>Product
                  <select value={historyProductFilter} onChange={(e) => setHistoryProductFilter(e.target.value)}>
                    <option value="ALL">All products</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
                <label>Period
                  <select value={historyDateRange} onChange={(e) => {
                    setHistoryDateRange(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }
                  }}>
                    <option value="ALL">All dates</option>
                    <option value="TODAY">Today</option>
                    <option value="7DAYS">Last 7 days</option>
                    <option value="30DAYS">Last 30 days</option>
                    <option value="CUSTOM">Custom range</option>
                  </select>
                </label>
                {historyDateRange === 'CUSTOM' && (
                  <div className="history-range">
                    <label>From<input type="date" value={historyStartDate} max={historyEndDate || undefined}
                      onChange={(e) => setHistoryStartDate(e.target.value)} /></label>
                    <label>To<input type="date" value={historyEndDate} min={historyStartDate || undefined}
                      onChange={(e) => setHistoryEndDate(e.target.value)} /></label>
                  </div>
                )}
                {historyFiltered && filteredMovements.length > 0 && (
                  <button type="button" className="history-clear" onClick={() => resetHistoryFilters()}>Clear filters</button>
                )}
              </div>

              <div id="history-results">
                {filteredMovements.length > 0 ? (
                  <>
                    <HistoryEntries rows={movementPage.rows} formatCurrency={formatNaira}
                      onReceipt={openReceiptForMovement} getMovementBadgeInfo={getMovementBadgeInfo} />
                    <ListPagination list={movementPage} label="Movements" targetId="history-results" />
                  </>
                ) : loading || error ? (
                  <p className="history-message" role="status">{loading ? 'Loading movements…' : 'Movement history is unavailable.'}</p>
                ) : (
                  <div className="history-empty">
                    <div>
                      <h3>{historyFiltered ? 'No matching movements' : 'No stock movements yet'}</h3>
                      <p>{historyFiltered ? 'Choose a different filter or clear them to see the full log.'
                        : 'Sales, restocks and shelf adjustments appear here when you record them.'}</p>
                    </div>
                    {historyFiltered ? (
                      <button type="button" className="history-export" onClick={() => resetHistoryFilters()}>Clear filters</button>
                    ) : (
                      <button type="button" className="workspace-chip" onClick={() => handleSelectTab('inventory')}>
                        View stock <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </section>
        )}

        {activeTab === 'debtors' && (
          <DebtBook metrics={debtorMetrics} accountCount={customerLedgers.length} slipCount={credits.length}
            view={debtorViewMode} onView={setDebtorViewMode} status={debtorFilter} onStatus={setDebtorFilter}
            search={debtorSearch} onSearch={setDebtorSearch} page={debtorViewMode === 'ACCOUNTS' ? ledgerPage : creditPage}
            loading={loading} error={error} formatMoney={formatNaira} onAdd={() => setShowAddCreditModal(true)}
            onReminder={setWhatsAppModalTarget} onStatement={setStatementModalCustomer} onPayment={setRepaymentModalTarget} />
        )}

        {/* TAB 6: POS VS CASH RECONCILIATION & PROFIT (P&L) */}
        {activeTab === 'analytics' && (
          <div className="report-screen">
            <header className="workspace-page-heading report-heading">
              <h1 className="workspace-title">Shop reports</h1>
              <button type="button" className="workspace-primary" onClick={() => setShowReconcileModal(true)}>
                <Scale size={16} aria-hidden="true" /> Reconcile cash &amp; POS
              </button>
            </header>
            <div className="report-controls">
              <label>Reporting period
                <select value={analyticsDateRange} onChange={(e) => setAnalyticsDateRange(e.target.value)}>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">Last 7 days</option>
                  <option value="MONTH">Last 30 days</option>
                  <option value="CUSTOM">Custom range</option>
                </select>
              </label>
              {analyticsDateRange === 'CUSTOM' && (
                <>
                  <label>From<input type="date" value={analyticsStartDate}
                    onChange={(e) => setAnalyticsStartDate(e.target.value)} /></label>
                  <label>To<input type="date" value={analyticsEndDate}
                    onChange={(e) => setAnalyticsEndDate(e.target.value)} /></label>
                </>
              )}
            </div>

            {!analyticsFinancials ? (
              <p className="text-sm text-theme-secondary" role="status">
                {!validReportPeriod
                  ? 'Select an end date on or after the start date.'
                  : periodReport?.error || 'Loading financial report…'}
              </p>
            ) : (
              <>
                {/* Core 6 Financial Metrics with Educational Explainer */}
                <FinancialMetricsOverview
                  metrics={analyticsFinancials.metrics}
                  formatNaira={formatNaira}
                  dateRangeLabel={analyticsFinancials.dateRangeLabel}
                />

                <OperatingExpenseBreakdown expenseBreakdown={analyticsFinancials.expenseBreakdown} formatNaira={formatNaira} />

                {/* Payment Channels Inflow vs Outflow & Category Shelf Inventory */}
                <div className="report-breakdowns">
                  {/* Cash vs POS vs Bank Transfers in Period */}
                  <div className="report-panel report-breakdown">
                    <div>
                      <h3 className="text-base font-extrabold font-luxury text-theme-primary flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-theme-primary" />
                        Payment channel activity
                      </h3>
                      <p className="text-xs text-theme-secondary mt-0.5">
                        How money moved through each channel during {analyticsFinancials.dateRangeLabel.toLowerCase()}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead
                          style={{
                            backgroundColor: 'var(--bg-subtle)',
                            borderColor: 'var(--border-outer)',
                          }}
                          className="text-[11px] font-bold uppercase tracking-wider border-b text-theme-secondary"
                        >
                          <tr>
                            <th className="py-2.5 px-3">Payment Channel</th>
                            <th className="py-2.5 px-3 text-right">Money In</th>
                            <th className="py-2.5 px-3 text-right">Money Out</th>
                            <th className="py-2.5 px-3 text-right">Period Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y theme-divider">
                          {analyticsFinancials.channelBreakdown.length > 0 ? (
                            analyticsFinancials.channelBreakdown.map((ch) => (
                              <tr key={ch.payment_method}>
                                <td className="py-3 px-3 font-bold text-xs text-theme-primary">
                                  {ch.label || PAYMENT_CHANNEL_LABELS[ch.payment_method] || ch.payment_method}
                                </td>
                                <td className="py-3 px-3 text-right font-bold tabular-nums text-theme-inflow">
                                  +{formatNaira(ch.inflow)}
                                </td>
                                <td className="py-3 px-3 text-right font-bold tabular-nums text-theme-outflow">
                                  -{formatNaira(ch.outflow)}
                                </td>
                                <td className="py-3 px-3 text-right font-extrabold font-luxury tabular-nums text-theme-primary">
                                  {formatNaira(ch.inflow - ch.outflow)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-xs text-theme-secondary">
                                No channel transactions recorded in this period.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Shelf Goods Value by Category */}
                  <div className="report-panel report-breakdown">
                    <div>
                      <h3 className="text-base font-extrabold font-luxury text-theme-primary flex items-center gap-2">
                        <Package className="w-4 h-4 text-theme-primary" />
                        Inventory by category
                      </h3>
                      <p className="text-xs text-theme-secondary mt-0.5">
                        Current stock at cost and at selling price
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead
                          style={{
                            backgroundColor: 'var(--bg-subtle)',
                            borderColor: 'var(--border-outer)',
                          }}
                          className="text-[11px] font-bold uppercase tracking-wider border-b text-theme-secondary"
                        >
                          <tr>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-center">SKUs</th>
                            <th className="py-2.5 px-3 text-right">At cost</th>
                            <th className="py-2.5 px-3 text-right">At selling price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y theme-divider">
                          {(dashboard.categories || []).map((cat) => (
                            <tr key={cat.category}>
                              <td className="py-3 px-3 font-extrabold font-luxury text-theme-primary">
                                {cat.category}
                              </td>
                              <td className="py-3 px-3 text-center tabular-nums text-theme-secondary">
                                {cat.sku_count}
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums text-theme-secondary font-mono">
                                {formatNaira(cat.cost_value)}
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold font-luxury tabular-nums text-theme-inflow">
                                {formatNaira(cat.retail_value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* FLOATING MOBILE BASKET REVIEW & CHECKOUT BAR */}
      {activeTab === 'counter' && cartItems.length > 0 && (
        <div className="workspace-cart-shortcut lg:hidden fixed left-3 right-3 z-30">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="liquid-glass-header w-full text-white px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-2 active:scale-[0.99] transition cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <ShoppingCart className="w-5 h-5 text-emerald-300" />
                <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white rounded-full text-[10px] font-black w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              </div>
              <span className="text-xs font-bold pl-1 truncate">
                Basket ({cartItemCount})
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm font-black font-luxury tabular-nums text-emerald-300">
                {formatNaira(cartTotal)}
              </span>
              <span className="text-[11px] sm:text-xs bg-emerald-500/25 text-emerald-100 border border-emerald-400/30 px-2.5 py-1 rounded-xl font-bold whitespace-nowrap">
                Pay →
              </span>
            </div>
          </button>
        </div>
      )}

      {/* MODAL 1: SELL / RESTOCK / PHYSICAL SHELF COUNT / DAMAGED */}
      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name}
        subtitle={`Currently on Shelf: ${Number(selectedProduct?.stock_quantity || 0)} ${
          selectedProduct?.unit || ''
        } | Market Cost: ${formatNaira(selectedProduct?.cost_price)} | Selling: ${formatNaira(
          selectedProduct?.selling_price
        )}`}
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {[
              { id: 'SALE', label: 'Sell Item (-)' },
              { id: 'RESTOCK', label: 'Restock (+)' },
              { id: 'ADJUSTMENT', label: 'Shelf Count' },
              { id: 'DAMAGED', label: 'Damaged (-)' },
              { id: 'EXPIRED', label: 'Expired (-)' },
              { id: 'MISSING', label: 'Missing (-)' },
            ].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() =>
                  setMovementForm({
                    ...movementForm,
                    movement_type: t.id,
                    counterparty_name:
                      t.id === 'RESTOCK'
                        ? selectedProduct?.supplier_name || ''
                        : t.id === 'SALE'
                        ? ''
                        : movementForm.counterparty_name,
                  })
                }
                className={`py-2 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  movementForm.movement_type === t.id
                    ? 'liquid-btn-primary'
                    : 'liquid-glass-subtle'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-theme-primary">
                {movementForm.movement_type === 'SALE'
                  ? `How many ${selectedProduct?.unit} sold? (Max: ${Number(
                      selectedProduct?.stock_quantity || 0
                    )})`
                  : movementForm.movement_type === 'ADJUSTMENT'
                  ? `How many ${selectedProduct?.unit} on the shelf?`
                  : ['DAMAGED', 'EXPIRED', 'MISSING'].includes(movementForm.movement_type)
                  ? `How many ${selectedProduct?.unit} written off?`
                  : `How many ${selectedProduct?.unit} added?`}
              </label>
              <input
                type="number"
                step="any"
                min={movementForm.movement_type === 'ADJUSTMENT' ? '0' : '1'}
                max={
                  ['SALE', 'DAMAGED', 'EXPIRED', 'MISSING'].includes(movementForm.movement_type)
                    ? Number(selectedProduct?.stock_quantity || 0)
                    : undefined
                }
                required
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder="Enter number..."
                className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-theme-primary">
                {movementForm.movement_type === 'SALE'
                  ? 'Customer Name (Optional)'
                  : 'Supplier / Market Name'}
              </label>
              <input
                type="text"
                value={movementForm.counterparty_name}
                onChange={(e) =>
                  setMovementForm({ ...movementForm, counterparty_name: e.target.value })
                }
                placeholder={
                  movementForm.movement_type === 'SALE'
                    ? 'e.g. Walk-in Customer / Mama Tobi'
                    : 'e.g. Oke-Arin / Mushin'
                }
                className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          {(movementForm.movement_type === 'SALE' || movementForm.movement_type === 'RESTOCK') && (
            <div className="liquid-glass-subtle p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-theme-primary">
                  <input
                    type="checkbox"
                    checked={movementForm.record_cash}
                    onChange={(e) =>
                      setMovementForm({ ...movementForm, record_cash: e.target.checked })
                    }
                  />
                  {movementForm.movement_type === 'SALE'
                    ? 'Add this sale money to my Cashbook'
                    : 'Deduct this market purchase from my Cashbook'}
                </label>
                <span className="text-xs font-extrabold tabular-nums shrink-0 text-theme-primary">
                  {movementForm.movement_type === 'SALE' ? 'Sale Total' : 'Cost'}:{' '}
                  {formatNaira(expectedMovementValue)}
                </span>
              </div>

              {movementForm.record_cash && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1 text-theme-secondary">
                      {movementForm.movement_type === 'SALE' ? 'Amount Received' : 'Amount Paid'}{' '}
                      (Blank = {formatNaira(expectedMovementValue)})
                    </label>
                    <input
                      type="number"
                      placeholder={String(expectedMovementValue)}
                      value={movementForm.amount_paid}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, amount_paid: e.target.value })
                      }
                      className="liquid-input w-full rounded-xl px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-theme-secondary">
                      {movementForm.movement_type === 'SALE'
                        ? 'How did customer pay?'
                        : 'How did you pay?'}
                    </label>
                    <select
                      value={movementForm.payment_method}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, payment_method: e.target.value })
                      }
                      className="liquid-input w-full rounded-xl px-2.5 py-1.5 text-xs"
                    >
                      <option value="CASH">Cash (Naira)</option>
                      <option value="POS">POS Terminal</option>
                      <option value="BANK_TRANSFER">Bank Transfer (OPay / Bank)</option>
                      <option value="MOBILE_MONEY">Mobile Wallet / USSD</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1 text-theme-primary">
              Short Note (Optional)
            </label>
            <input
              type="text"
              value={movementForm.note}
              onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })}
              placeholder={
                movementForm.movement_type === 'SALE'
                  ? 'e.g. Sold at shop counter'
                  : 'e.g. Bought from Mushin depot or weekly shelf count'
              }
              className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="px-4 py-2 text-xs font-semibold cursor-pointer text-theme-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="liquid-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : movementForm.movement_type === 'SALE'
                ? 'Complete Sale & Deduct Stock'
                : 'Update Shelf Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD OR EDIT GOODS */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        title={
          editingProduct
            ? `Update ${businessProfile.itemLabel}: ${editingProduct.name}`
            : `Add ${businessProfile.itemLabel}`
        }
        maxWidth="max-w-xl"
        panelClassName="stock-product-panel"
      >
        <form onSubmit={handleSaveProduct} className="stock-product-form">
          <div className="stock-product-fields">
            <div>
              <label htmlFor="product-name" className="stock-product-label">Product name</label>
              <input id="product-name"
                required
                placeholder={businessProfile.namePlaceholder}
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="product-category" className="stock-product-label">Category</label>
                <select id="product-category"
                  value={
                    businessProfile.categories.includes(productForm.category)
                      ? productForm.category
                      : productForm.category || businessProfile.categories[0]
                  }
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                >
                  {Array.from(
                    new Set([
                      ...businessProfile.categories,
                      ...(productForm.category ? [productForm.category] : []),
                    ])
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="product-unit" className="stock-product-label">Selling unit</label>
                <select id="product-unit"
                  value={
                    productForm.unit || businessProfile.units[0]
                  }
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                >
                  {Array.from(
                    new Set([
                      ...businessProfile.units,
                      ...getAllCommonUnits(),
                      ...(productForm.unit ? [productForm.unit] : []),
                    ])
                  ).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="stock-product-group"><legend>Pricing</legend>
              <div>
                <label htmlFor="product-cost_price" className="stock-product-label">Unit cost ({currencySymbol})</label>
                <input id="product-cost_price"
                  type="number" min="0" step="0.01"
                  required
                  placeholder="e.g. 2600"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="product-selling_price" className="stock-product-label">Selling price ({currencySymbol})</label>
                <input id="product-selling_price"
                  type="number" min="0" step="0.01"
                  required
                  placeholder="e.g. 3000"
                  value={productForm.selling_price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, selling_price: e.target.value })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </fieldset>

            <fieldset className="stock-product-group"><legend>Stock levels</legend>
              {!editingProduct && (
                <div>
                  <label htmlFor="product-stock_quantity" className="stock-product-label">Opening stock</label>
                  <input id="product-stock_quantity"
                    type="number" min="0" step="0.01"
                    required
                    value={productForm.stock_quantity}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock_quantity: e.target.value })
                    }
                    className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label htmlFor="product-reorder_level" className="stock-product-label">Low-stock threshold</label>
                <input id="product-reorder_level"
                  type="number" min="0" step="0.01"
                  required
                  value={productForm.reorder_level}
                  onChange={(e) =>
                    setProductForm({ ...productForm, reorder_level: e.target.value })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </fieldset>

            <div>
              <label htmlFor="product-supplier_name" className="stock-product-label">Supplier (optional)</label>
              <input id="product-supplier_name"
                placeholder="e.g. Oke-Arin, Mushin, Trade Fair, Distributor"
                value={productForm.supplier_name}
                onChange={(e) =>
                  setProductForm({ ...productForm, supplier_name: e.target.value })
                }
                className="liquid-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>

          </div>
          {productError && <p className="stock-product-error workspace-negative" role="alert">{productError}</p>}
          <div className="stock-product-footer">
            {editingProduct ? (
              <button
                type="button"
                onClick={() => handleDeleteProduct(editingProduct)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete product
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-xs font-semibold cursor-pointer text-theme-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="workspace-primary"
              >
                {submitting ? 'Saving...' : editingProduct ? 'Save changes' : 'Add product'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: RECORD SHOP EXPENSE OR CASH INFLOW */}
      <Modal
        isOpen={showCashModal}
        onClose={() => { if (!submitting) setShowCashModal(false); }}
        title="Record money"
        maxWidth="max-w-lg"
        panelClassName="cash-entry-panel"
      >
        <form onSubmit={handleCreateCashTx} className="cash-entry-form">
          <div className="cash-entry-fields">
            <div className="cash-entry-direction" role="group" aria-label="Money direction">
              {[
                ['OUTFLOW', 'Money out', 'Generator & Power'],
                ['INFLOW', 'Money in', 'Counter Sales'],
              ].map(([type, label, category]) => (
                <button type="button" key={type} aria-pressed={cashForm.type === type}
                  onClick={() => {
                    if (cashForm.type !== type) setCashForm({ ...cashForm, type, category });
                  }}>{label}</button>
              ))}
            </div>

            <label className="cash-entry-label" htmlFor="cash-amount">Amount</label>
            <div className="cash-entry-amount">
              <span aria-hidden="true">{currencySymbol}</span>
              <input id="cash-amount" type="number" step="any" inputMode="decimal" required
                aria-label={`Amount (${currencySymbol})`} placeholder="0.00" value={cashForm.amount}
                onChange={(event) => setCashForm({ ...cashForm, amount: event.target.value })} />
            </div>

            <div className="cash-entry-pair">
              <label className="cash-entry-label">
                {cashForm.type === 'OUTFLOW' ? 'Expense category' : 'Income category'}
                <select className="liquid-input" value={cashForm.category}
                  onChange={(event) => setCashForm({ ...cashForm, category: event.target.value })}>
                  {(cashForm.type === 'OUTFLOW' ? LAGOS_EXPENSE_PRESETS : ['Counter Sales', 'Credit Repayment', 'Wholesale Order', 'Capital / Float In', 'Other Income']).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="cash-entry-label">
                Payment method
                <select className="liquid-input" value={cashForm.payment_method}
                  onChange={(event) => setCashForm({ ...cashForm, payment_method: event.target.value })}>
                  {['CASH', 'POS', 'BANK_TRANSFER', 'MOBILE_MONEY'].map((method) => (
                    <option key={method} value={method}>{getChannelBadgeMeta(method).label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="cash-entry-label">
              {cashForm.type === 'OUTFLOW' ? 'Expense reason' : 'Note (optional)'}
              <input className="liquid-input" required={cashForm.type === 'OUTFLOW'}
                value={cashForm.expense_reason || cashForm.description}
                placeholder={cashForm.type === 'OUTFLOW' ? 'e.g. Generator fuel' : 'e.g. Wholesale order'}
                onChange={(event) => setCashForm({ ...cashForm, expense_reason: event.target.value, description: event.target.value })} />
            </label>
            <label className="cash-entry-label">
              {cashForm.type === 'OUTFLOW' ? 'Paid to (optional)' : 'Received from (optional)'}
              <input className="liquid-input" value={cashForm.counterparty_name}
                onChange={(event) => setCashForm({ ...cashForm, counterparty_name: event.target.value })} />
            </label>
          </div>
          {cashEntryError && <p className="cash-entry-error workspace-negative" role="alert">{cashEntryError}</p>}

          <div className="cash-entry-actions">
            <button
              type="button"
              onClick={() => setShowCashModal(false)}
              className="workspace-chip"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="workspace-primary"
            >
              {submitting ? 'Saving…' : cashForm.type === 'OUTFLOW' ? 'Save expense' : 'Save income'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DEBTOR BOOK MODALS */}
      <WhatsAppReminderModal
        isOpen={Boolean(whatsAppModalTarget)}
        onClose={() => setWhatsAppModalTarget(null)}
        debtor={whatsAppModalTarget}
        storeName={currentUser?.business_name || 'Our Provision Store'}
        storePhone={currentUser?.phone || ''}
        formatNaira={formatNaira}
      />

      <CustomerStatementModal
        isOpen={Boolean(statementModalCustomer)}
        onClose={() => setStatementModalCustomer(null)}
        customerName={statementModalCustomer}
        storeName={currentUser?.business_name || 'MarketOS Store'}
        storePhone={currentUser?.phone || ''}
        storeAddress={currentUser?.address || ''}
        apiFetch={apiFetch}
        formatNaira={formatNaira}
      />

      <CustomerRepaymentModal
        isOpen={Boolean(repaymentModalTarget || repayingCredit)}
        onClose={() => {
          setRepaymentModalTarget(null);
          setRepayingCredit(null);
        }}
        target={repaymentModalTarget || repayingCredit}
        onSuccess={() => {
          showSuccessToast('Debt payment recorded and added to Cashbook!');
          refreshDebtors();
        }}
        apiFetch={apiFetch}
        formatNaira={formatNaira}
      />

      <CustomerCreditModal
        isOpen={showAddCreditModal}
        onClose={() => setShowAddCreditModal(false)}
        onSuccess={() => {
          showSuccessToast('Credit sale recorded successfully!');
          refreshDebtors();
        }}
        apiFetch={apiFetch}
        existingCustomers={customerLedgers}
        formatNaira={formatNaira}
      />

      {/* DAILY POS, CASH & BANK RECONCILIATION MODAL */}
      {showReconcileModal && <DailyChannelReconciliationModal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        sessionState={cashbookSession}
        apiFetch={apiFetch}
        formatNaira={formatNaira}
        storeName={currentUser?.business_name || 'MarketOS Store'}
        onSuccess={() => {
          showSuccessToast('Daily channel reconciliation recorded!');
          fetchAllData();
        }}
      />}

      {/* INSTANT DIGITAL SALE RECEIPT (PRINTABLE THERMAL SLIP & WHATSAPP / SHARE) */}
      <ReceiptModal
        isOpen={Boolean(lastReceipt)}
        onClose={() => setLastReceipt(null)}
        receipt={lastReceipt}
        formatNaira={formatNaira}
      />

      {/* CHECKOUT CONFIRMATION STEP (PREVENTS ACCIDENTAL CHECKOUT & VERIFIES STOCK) */}
      <CheckoutConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmCheckout}
        isSubmitting={submitting}
        cartItems={cartItems}
        cartTotal={cartTotal}
        paymentMethod={checkoutMethod}
        isPartPayment={isPartPayment}
        amountPaidNow={amountPaidNow}
        customerName={customerName}
        customerPhone={customerPhone}
        formatNaira={formatNaira}
      />

      {/* MOBILE CART REVIEW & CHECKOUT SHEET (< 1024px) */}
      <MobileCartSheet
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        cartItems={cartItems}
        cartTotal={cartTotal}
        cartItemCount={cartItemCount}
        updateCartQty={updateCartQty}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        checkoutMethod={checkoutMethod}
        setCheckoutMethod={setCheckoutMethod}
        isPartPayment={isPartPayment}
        setIsPartPayment={setIsPartPayment}
        amountPaidNow={amountPaidNow}
        setAmountPaidNow={setAmountPaidNow}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        onProceedCheckout={() => {
          setIsMobileCartOpen(false);
          handleInitiateCheckout();
        }}
        formatNaira={formatNaira}
      />

      {/* BULK PRODUCT IMPORT MODAL (CSV & EXCEL) */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        apiFetch={apiFetch}
        formatCurrency={formatNaira}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onImportSuccess={() => fetchAllData()}
      />

      {/* PHYSICAL STOCK COUNT & SHELF AUDIT MODAL */}
      <PhysicalStockAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        products={products}
        apiFetch={apiFetch}
        formatCurrency={formatNaira}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onReconcileSuccess={() => fetchAllData()}
      />

      {/* QUICK MULTI-PRODUCT BATCH ADJUSTMENT MODAL */}
      <BatchAdjustModal
        isOpen={showBatchAdjustModal}
        onClose={() => setShowBatchAdjustModal(false)}
        products={products}
        apiFetch={apiFetch}
        formatCurrency={formatNaira}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onSuccess={() => fetchAllData()}
      />

      {/* ONBOARDING: QUICK OPENING STOCK COUNT MODAL */}
      <QuickStockModal
        isOpen={showQuickStockModal}
        onClose={() => setShowQuickStockModal(false)}
        products={products}
        apiFetch={apiFetch}
        formatCurrency={formatNaira}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onSuccess={() => fetchAllData()}
      />

      {/* ONBOARDING: STORE PROFILE & CASH FLOAT SETUP MODAL */}
      <BusinessSetupModal
        isOpen={showBusinessSetupModal}
        onClose={() => setShowBusinessSetupModal(false)}
        currentUser={currentUser}
        cashbookSession={cashbookSession}
        apiFetch={apiFetch}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onSuccess={(updatedUser) => {
          if (updatedUser) setCurrentUser(updatedUser);
          fetchAllData();
        }}
      />

      {/* DAILY CASHBOOK OPENING & CLOSING BALANCE REGISTER MODAL */}
      <CashbookSessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        initialMode={sessionModalMode}
        sessionState={cashbookSession}
        apiFetch={apiFetch}
        formatCurrency={formatNaira}
        currencySymbol={currencySymbol}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onSuccess={() => fetchAllData()}
      />

      {/* AUDIT-SAFE TRANSACTION CORRECTION & VOID MODAL */}
      <TransactionCorrectionModal
        isOpen={Boolean(correctingTx)}
        onClose={() => setCorrectingTx(null)}
        transaction={correctingTx}
        apiFetch={apiFetch}
        formatCurrency={formatNaira}
        currencySymbol={currencySymbol}
        toastSuccess={(msg) => showSuccessToast(msg)}
        toastError={(msg) => toastError?.(msg) || alert(msg)}
        onSuccess={() => fetchAllData()}
      />

      {/* DISCRETIONARY MVP MODAL 6: SMART MARKET RESTOCK BUYING LIST GENERATOR */}
      <Modal
        isOpen={showRestockModal}
        onClose={() => setShowRestockModal(false)}
        title="Smart Lagos Market Restock List"
        subtitle={`Auto-calculated market shopping list for ${lowStockRestockPlan.length} low-stock goods`}
      >
        <div className="space-y-4">
          <div className="liquid-glass-header text-white p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                Estimated Market Capital Needed
              </span>
              <span className="text-xs text-slate-300">
                Across {lowStockRestockPlan.length} provision item(s) at reorder threshold
              </span>
            </div>
            <span className="text-xl font-extrabold font-luxury tabular-nums text-white">
              {formatNaira(totalRestockBudget)}
            </span>
          </div>

          {lowStockRestockPlan.length === 0 ? (
            <p className="text-xs text-center py-6 text-theme-secondary">
              All shelf items are currently above their low-stock warning level!
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y theme-divider liquid-glass-subtle rounded-2xl p-3">
              {lowStockRestockPlan.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-extrabold text-theme-primary">{item.name}</div>
                    <div className="text-[11px] text-theme-secondary">
                      Shelf: {Number(item.stock_quantity)} {item.unit} • Market:{' '}
                      {item.supplier_name || 'Oke-Arin / Mushin'}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-extrabold text-theme-brand">
                      Buy {item.recommendedQty} {item.unit}
                    </div>
                    <div className="text-[11px] text-theme-secondary">
                      ≈ {formatNaira(item.estimatedCost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {lowStockRestockPlan.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      `*MARKET RESTOCK LIST — ${currentUser.business_name}*`,
                      `Date: ${new Date().toLocaleDateString()}`,
                      `---------------------------`,
                      ...lowStockRestockPlan.map(
                        (i) =>
                          `• ${i.name}: Buy ${i.recommendedQty} ${i.unit} (~${formatNaira(
                            i.estimatedCost
                          )}) [${i.supplier_name || 'Market'}]`
                      ),
                      `---------------------------`,
                      `*Estimated Market Budget:* ${formatNaira(totalRestockBudget)}`,
                    ].join('\n');
                    navigator.clipboard?.writeText(text);
                    showSuccessToast('Market buying list copied to clipboard!');
                  }}
                  className="liquid-glass-subtle px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      `*MARKET RESTOCK LIST — ${currentUser.business_name}*`,
                      `Date: ${new Date().toLocaleDateString()}`,
                      `---------------------------`,
                      ...lowStockRestockPlan.map(
                        (i) =>
                          `• ${i.name}: Buy ${i.recommendedQty} ${i.unit} (~${formatNaira(
                            i.estimatedCost
                          )})`
                      ),
                      `---------------------------`,
                      `*Estimated Market Budget:* ${formatNaira(totalRestockBudget)}`,
                    ].join('\n');
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(text)}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                  className="liquid-btn-primary px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Send to WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* DISCRETIONARY MVP MODAL 7: STORE PROFILE & SECURITY SETTINGS */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Store Profile & Account Security"
        subtitle={`${currentUser.email} • ${currentUser.role} • ${currentUser.auth_provider}`}
      >
        <div className="space-y-5">
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-theme-secondary">
              Store Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-theme-primary">
                  Shop / Business Name
                </label>
                <input
                  required
                  value={profileForm.business_name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, business_name: e.target.value })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-theme-primary">
                  Owner Full Name
                </label>
                <input
                  required
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, full_name: e.target.value })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-theme-primary">
                  WhatsApp / Phone Number
                </label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-theme-primary">
                  Market / Area Location
                </label>
                <input
                  value={profileForm.location}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, location: e.target.value })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="liquid-btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Store Profile
              </button>
            </div>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="space-y-3 border-t pt-4 theme-divider"
          >
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-theme-secondary">
              Update Account Password
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-theme-primary">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  placeholder="Current password"
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-theme-primary">
                  New Password (Min 12 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new_password: e.target.value })
                  }
                  placeholder="New password"
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out of Device
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="liquid-glass-subtle px-4 py-2 rounded-xl text-xs font-extrabold text-theme-primary cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
