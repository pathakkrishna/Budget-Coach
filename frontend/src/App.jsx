import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Cpu, 
  Search, 
  Bell, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  X,
  SlidersHorizontal,
  Wallet,
  Calendar,
  BarChart3,
  Terminal,
  Activity,
  ChevronDown,
  LogIn,
  LogOut,
  User as UserIcon,
  UserCheck
} from 'lucide-react';
import LandingPage from './LandingPage';
import AuthModal from './AuthModal';
import { auth, onAuthStateChanged, logOutUser, getStoredLocalUser } from './firebase';

const API_BASE_URL = 'http://127.0.0.1:8000';

// ──────────────────────────────────────────────────────────
//  CUSTOM FINTECH DROPDOWN COMPONENT
//  Matches fintech dashboard UI with white cards, rounded
//  borders, soft shadows, and coral highlights.
// ──────────────────────────────────────────────────────────
function CustomDropdown({ value, options, onChange, placeholder = 'Select...', minWidth = '180px' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || { label: value, value };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#FFFFFF',
          border: isOpen ? '1px solid var(--coral)' : '1px solid var(--border-color)',
          boxShadow: isOpen ? '0 0 0 3px rgba(242, 100, 61, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
          borderRadius: 'var(--radius-full)',
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          minWidth: minWidth,
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          transition: 'all 0.15s ease'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption.label || placeholder}
        </span>
        <ChevronDown 
          size={14} 
          color={isOpen ? 'var(--coral)' : 'var(--text-secondary)'} 
          style={{ transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} 
        />
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: minWidth,
          background: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color)',
          padding: '6px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? 'var(--coral)' : 'var(--text-primary)',
                  background: isSelected ? 'var(--coral-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                  userSelect: 'none',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} color="var(--coral)" strokeWidth={2.5} style={{ marginLeft: '12px' }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // ──────────────────────────────────────────────────────────
  //  STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────

  // Navigation: 'progress' | 'transactions' | 'report' | 'agents'
  const [activeTab, setActiveTab] = useState('progress');

  // Active month being viewed / edited
  const [month, setMonth] = useState('November 2026');
  const [income, setIncome] = useState(100000);
  const [expenses, setExpenses] = useState([
    { id: 'T001', description: 'Food & Groceries', amount: 10000, category: 'Needs' },
    { id: 'T002', description: 'House Rent', amount: 25000, category: 'Needs' },
    { id: 'T003', description: 'Netflix Subscription', amount: 650, category: 'Wants' },
  ]);
  const [actualSavings, setActualSavings] = useState(15000);

  // Per-month persistent data store — preserves independent month records
  const [monthsStore, setMonthsStore] = useState({
    'November 2026': {
      income: 100000,
      expenses: [
        { id: 'T001', description: 'Food & Groceries', amount: 10000, category: 'Needs' },
        { id: 'T002', description: 'House Rent', amount: 25000, category: 'Needs' },
        { id: 'T003', description: 'Netflix Subscription', amount: 650, category: 'Wants' },
      ],
      actualSavings: 15000,
      result: null
    }
  });

  // Analysis result for the currently active month
  const [result, setResult] = useState(null);

  // Persistent SQLite savings goal state from backend
  const [persistentGoal, setPersistentGoal] = useState(null);

  // Goal configuration for active month
  const [trackGoal, setTrackGoal] = useState(true);
  const [goalTargetStr, setGoalTargetStr] = useState('50000');
  const [goalInitialStr, setGoalInitialStr] = useState('10000');

  // Transactions filters (Tab 2)
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [txnScope, setTxnScope] = useState('current'); // 'current' | 'all'

  // Chart view filter (Tab 1): 'all' | '<monthName>'
  const [chartViewFilter, setChartViewFilter] = useState('all');

  // Controlled text inputs for new expense
  const [newDesc, setNewDesc] = useState('');
  const [newAmountStr, setNewAmountStr] = useState('');

  // Modal: controlled text states to prevent leading zeroes and number spinner glitches
  const [showInputModal, setShowInputModal] = useState(false);
  const [modalMonth, setModalMonth] = useState('');
  const [modalIncomeStr, setModalIncomeStr] = useState('100000');
  const [modalSavingsStr, setModalSavingsStr] = useState('15000');
  const [modalTrackGoal, setModalTrackGoal] = useState(true);
  const [modalGoalTargetStr, setModalGoalTargetStr] = useState('50000');
  const [modalGoalInitialStr, setModalGoalInitialStr] = useState('10000');

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Firebase Authentication State
  const [user, setUser] = useState(() => getStoredLocalUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ──────────────────────────────────────────────────────────
  //  LIFECYCLE & DATA FETCHING
  // ──────────────────────────────────────────────────────────

  // Listen to Firebase Auth state changes
  useEffect(() => {
    let unsubscribe = () => {};
    if (auth) {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Fintech User'),
            photoURL: firebaseUser.photoURL,
            isFirebase: true
          });
        } else {
          setUser(getStoredLocalUser());
        }
      });
    }
    return () => unsubscribe();
  }, []);

  // Fetch API health
  useEffect(() => {
    fetchHealthAndGoal();
  }, []);

  // Load account-specific memory whenever user logs in or switches account
  useEffect(() => {
    if (user?.uid) {
      loadUserDataForAccount(user.uid);
    } else {
      // Clear state when signed out
      setMonthsStore({});
      setMonth('');
      setIncome(0);
      setExpenses([]);
      setActualSavings(0);
      setResult(null);
      setPersistentGoal(null);
    }
  }, [user?.uid]);

  const loadUserDataForAccount = async (uid) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-data?user_id=${encodeURIComponent(uid)}`, {
        headers: { 'X-User-ID': uid }
      });
      if (res.ok) {
        const data = await res.json();
        const savedMonths = data.months || {};
        setMonthsStore(savedMonths);
        setPersistentGoal(data.goal || null);

        const keys = Object.keys(savedMonths);
        if (keys.length > 0) {
          const latestKey = keys[keys.length - 1];
          const mData = savedMonths[latestKey];
          setMonth(latestKey);
          setIncome(mData.income || 0);
          setExpenses(mData.expenses || []);
          setActualSavings(mData.actualSavings || 0);
          setResult(mData.result || null);
        } else {
          // Fresh user account starts 100% blank
          setMonth('');
          setIncome(0);
          setExpenses([]);
          setActualSavings(0);
          setResult(null);
        }
      }
    } catch (err) {
      console.warn("Could not load backend user data:", err);
    }
  };

  const fetchHealthAndGoal = async () => {
    try {
      const healthRes = await fetch(`${API_BASE_URL}/api/health`);
      if (healthRes.ok) {
        setApiOnline(true);
      }
    } catch {
      setApiOnline(false);
    }

    if (user?.uid) {
      try {
        const goalRes = await fetch(`${API_BASE_URL}/api/savings-goal?user_id=${encodeURIComponent(user.uid)}`, {
          headers: { 'X-User-ID': user.uid }
        });
        if (goalRes.ok) {
          const data = await goalRes.json();
          setPersistentGoal(data.goal);
        }
      } catch {
        // Offline fallback
      }
    }
  };

  // ──────────────────────────────────────────────────────────
  //  HELPERS & FORMATTERS
  // ──────────────────────────────────────────────────────────

  const getUserInitials = (currentUser) => {
    if (!currentUser) return 'JD';
    if (currentUser.displayName) {
      const parts = currentUser.displayName.trim().split(' ');
      if (parts.length >= 2 && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email.substring(0, 2).toUpperCase();
    }
    return 'JD';
  };

  const handleSignOut = async () => {
    await logOutUser();
    setUser(null);
    setShowUserMenu(false);
    setMonthsStore({});
    setMonth('');
    setIncome(0);
    setExpenses([]);
    setActualSavings(0);
    setResult(null);
    setPersistentGoal(null);
  };

  const formatINR = (val) => {
    const num = Number(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  // Clean numeric string input (removes non-digits and leading zeros)
  const sanitizeNumericInput = (raw) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    return digitsOnly.replace(/^0+(?=\d)/, '');
  };

  // Save current active month into monthsStore
  const persistCurrentMonth = () => {
    if (!month) return;
    setMonthsStore((prev) => ({
      ...prev,
      [month]: {
        income,
        expenses: [...expenses],
        actualSavings,
        result
      }
    }));
  };

  // Switch to a chosen month
  const loadMonth = (targetMonthName) => {
    const stored = monthsStore[targetMonthName];
    setMonth(targetMonthName);

    if (stored) {
      setIncome(stored.income);
      setExpenses([...stored.expenses]);
      setActualSavings(stored.actualSavings);
      setResult(stored.result);
    } else {
      setIncome(0);
      setExpenses([]);
      setActualSavings(0);
      setResult(null);
    }
  };

  // ──────────────────────────────────────────────────────────
  //  DUAL-SYNC HANDLERS (GRAPH + DASHBOARD OVERVIEW)
  // ──────────────────────────────────────────────────────────

  // When user selects a month from the graph dropdown:
  // 1. Updates graph filter
  // 2. ALSO updates the active dashboard data to that month (satisfying both features!)
  const handleChartViewFilterChange = (selectedVal) => {
    setChartViewFilter(selectedVal);
    if (selectedVal !== 'all') {
      persistCurrentMonth();
      loadMonth(selectedVal);
    }
  };

  // When user switches active month from the top header selector:
  const handleActiveMonthChange = (newMonth) => {
    persistCurrentMonth();
    loadMonth(newMonth);
    // If graph is in single-month view, keep graph view in sync with the active month
    if (chartViewFilter !== 'all') {
      setChartViewFilter(newMonth);
    }
  };

  // ──────────────────────────────────────────────────────────
  //  COMPUTED VALUES
  // ──────────────────────────────────────────────────────────

  const targetNeeds = income * 0.50;
  const targetWants = income * 0.30;
  const targetSavings = income * 0.20;
  const spendingLimit = income * 0.80;
  const currentTotalExpenses = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remainingSpendingBudget = Math.max(spendingLimit - currentTotalExpenses, 0);

  // List of all recorded month names
  const recordedMonthNames = useMemo(() => {
    return Object.keys(monthsStore);
  }, [monthsStore]);

  // Options for active month dropdown
  const activeMonthOptions = useMemo(() => {
    return recordedMonthNames.map((m) => ({ label: m, value: m }));
  }, [recordedMonthNames]);

  // Options for chart view dropdown
  const chartViewOptions = useMemo(() => {
    return [
      { label: 'All Months (Comparison)', value: 'all' },
      ...recordedMonthNames.map((m) => ({ label: m, value: m }))
    ];
  }, [recordedMonthNames]);

  // Aggregate data for the Monthly Financial Comparison Chart
  const chartMonthlyRecords = useMemo(() => {
    return Object.entries(monthsStore).map(([mName, mData]) => {
      const mExpenses = mData.expenses || [];
      const totalExp = mData.result?.budget_calculation?.total_expenses ?? 
                       mExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        month: mName,
        monthly_income: mData.income || 0,
        total_expenses: totalExp,
        actual_savings: mData.actualSavings || 0
      };
    });
  }, [monthsStore]);

  // Filtered records for the chart based on user selection
  const displayedChartRecords = useMemo(() => {
    if (chartViewFilter === 'all') {
      return chartMonthlyRecords;
    }
    const single = chartMonthlyRecords.filter((m) => m.month === chartViewFilter);
    return single.length > 0 ? single : chartMonthlyRecords;
  }, [chartMonthlyRecords, chartViewFilter]);

  // Max value for chart Y-axis scaling
  const chartMaxVal = useMemo(() => {
    const vals = displayedChartRecords.map((m) => 
      Math.max(m.monthly_income, m.total_expenses, m.actual_savings)
    );
    return Math.max(...vals, 100000);
  }, [displayedChartRecords]);

  // Y-axis tick intervals (6 clean ticks)
  const yAxisTicks = useMemo(() => {
    const step = Math.ceil(chartMaxVal / 5 / 10000) * 10000;
    const ticks = [];
    for (let v = 0; v <= chartMaxVal + step; v += step) {
      ticks.push(v);
    }
    return ticks.reverse();
  }, [chartMaxVal]);

  const chartCeiling = yAxisTicks[0] || chartMaxVal;

  // Filtered transactions for Tab 2
  const filteredTransactions = useMemo(() => {
    let txns = [];

    if (txnScope === 'all') {
      // Combine all recorded months
      Object.entries(monthsStore).forEach(([mName, mData]) => {
        const mTxns = mData.result?.categorised_transactions || mData.expenses || [];
        mTxns.forEach((t) => txns.push({ ...t, _month: mName }));
      });
    } else {
      // Current active month only
      const base = result?.categorised_transactions || expenses;
      txns = base.map((t) => ({ ...t, _month: month }));
    }

    return txns.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [txnScope, month, expenses, result, monthsStore, searchTerm, categoryFilter]);

  // ──────────────────────────────────────────────────────────
  //  USER ACTIONS & HANDLERS
  // ──────────────────────────────────────────────────────────

  // Add individual transaction to current month
  const handleAddExpense = (e) => {
    e?.preventDefault();
    const cleanAmt = Number(newAmountStr);
    if (!newDesc.trim() || !cleanAmt || cleanAmt <= 0) return;

    const nextId = `T${String(expenses.length + 1).padStart(3, '0')}`;
    const updated = [...expenses, { id: nextId, description: newDesc.trim(), amount: cleanAmt, category: 'Unclassified' }];
    setExpenses(updated);

    const updatedMonthData = {
      income,
      expenses: updated,
      actualSavings,
      result
    };

    // Sync to monthsStore
    setMonthsStore((prev) => ({
      ...prev,
      [month]: updatedMonthData
    }));

    // Persist to user's SQLite database
    if (user?.uid && month) {
      fetch(`${API_BASE_URL}/api/save-month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': user.uid },
        body: JSON.stringify({
          month,
          month_data: updatedMonthData,
          user_id: user.uid
        })
      }).catch(() => {});
    }

    setNewDesc('');
    setNewAmountStr('');
  };

  // Delete transaction from current month
  const handleDeleteExpense = (id) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);

    const updatedMonthData = {
      income,
      expenses: updated,
      actualSavings,
      result
    };

    setMonthsStore((prev) => ({
      ...prev,
      [month]: updatedMonthData
    }));

    if (user?.uid && month) {
      fetch(`${API_BASE_URL}/api/save-month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': user.uid },
        body: JSON.stringify({
          month,
          month_data: updatedMonthData,
          user_id: user.uid
        })
      }).catch(() => {});
    }
  };

  // Reset Session: clears temporary session data, keeps SQLite persistent storage
  const handleResetSession = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/reset-session`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': user?.uid || 'default' },
        body: JSON.stringify({ user_id: user?.uid || 'default' })
      });
    } catch {
      // Ignore network errors on reset
    }

    // Reset temporary state
    setResult(null);
    setError(null);
    setMonthsStore({});
    setMonth('');
    setIncome(0);
    setExpenses([]);
    setActualSavings(0);
    setTxnScope('current');
    setChartViewFilter('all');
    setSearchTerm('');
    setCategoryFilter('All');

    // Refresh actual SQLite savings goal
    try {
      const goalRes = await fetch(`${API_BASE_URL}/api/savings-goal?user_id=${encodeURIComponent(user?.uid || 'default')}`, {
        headers: { 'X-User-ID': user?.uid || 'default' }
      });
      if (goalRes.ok) {
        const data = await goalRes.json();
        setPersistentGoal(data.goal);
      }
    } catch {
      setPersistentGoal(null);
    }
  };

  // Run Coach Analysis on current month
  const handleRunAnalysis = async () => {
    setError(null);
    setIsAnalyzing(true);

    const validExpenses = expenses.filter((e) => e.description.trim() && Number(e.amount) > 0);
    if (validExpenses.length === 0) {
      setError('Please add at least one valid expense name and amount.');
      setIsAnalyzing(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': user?.uid || 'default'
        },
        body: JSON.stringify({
          month,
          monthly_income: Number(income),
          expenses: validExpenses,
          actual_savings: Number(actualSavings) || 0,
          do_long_term_savings: trackGoal,
          goal_target: trackGoal ? Number(goalTargetStr) || 50000 : null,
          goal_initial: trackGoal ? Number(goalInitialStr) || 0 : 0,
          user_id: user?.uid || 'default'
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Analysis request failed.');
      }

      const data = await res.json();
      setResult(data);

      if (data.savings_summary) {
        setPersistentGoal(data.savings_summary);
      }

      // Sync categorised transactions
      let syncedExpenses = expenses;
      if (data.categorised_transactions) {
        syncedExpenses = data.categorised_transactions.filter((t) => !t.id.startsWith('SAV-'));
        setExpenses(syncedExpenses);
      }

      const completedMonthData = {
        income,
        expenses: syncedExpenses,
        actualSavings,
        result: data
      };

      // Persist the analyzed results into monthsStore
      setMonthsStore((prev) => ({
        ...prev,
        [month]: completedMonthData
      }));

      // Also persist to user's SQLite database
      if (user?.uid) {
        fetch(`${API_BASE_URL}/api/save-month`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-ID': user.uid },
          body: JSON.stringify({
            month,
            month_data: completedMonthData,
            user_id: user.uid
          })
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Could not connect to Coach Manager server.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy Executive Report
  const handleCopyReport = () => {
    if (result?.final_report) {
      navigator.clipboard.writeText(result.final_report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open modal to record a new month
  const handleStartNewMonth = () => {
    persistCurrentMonth();
    setModalMonth('');
    setModalIncomeStr('100000');
    setModalSavingsStr('15000');
    setModalTrackGoal(true);
    setModalGoalTargetStr('50000');
    setModalGoalInitialStr('10000');
    setShowInputModal(true);
  };

  // Save new month from modal and advance directly to Tab 2 (expense entry)
  const handleSaveNewMonth = () => {
    const newName = modalMonth.trim();
    if (!newName) return;

    const numIncome = Number(modalIncomeStr) || 0;
    const numSavings = Number(modalSavingsStr) || 0;

    const newMonthData = {
      income: numIncome,
      expenses: [],
      actualSavings: numSavings,
      result: null
    };

    // Save to store
    setMonthsStore((prev) => ({
      ...prev,
      [newName]: newMonthData
    }));

    // Persist to user's SQLite database
    if (user?.uid) {
      fetch(`${API_BASE_URL}/api/save-month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': user.uid },
        body: JSON.stringify({
          month: newName,
          month_data: newMonthData,
          user_id: user.uid
        })
      }).catch(() => {});
    }

    // Update active state
    setMonth(newName);
    setIncome(numIncome);
    setExpenses([]);
    setActualSavings(numSavings);
    setResult(null);

    // Goal config
    setTrackGoal(modalTrackGoal);
    setGoalTargetStr(modalGoalTargetStr);
    setGoalInitialStr(modalGoalInitialStr);

    setShowInputModal(false);

    // Navigate directly to Tab 2 for seamless expense entry workflow
    setActiveTab('transactions');
  };

  // ──────────────────────────────────────────────────────────
  //  ACTIVE SAVINGS GOAL RESOLUTION
  // ──────────────────────────────────────────────────────────
  const activeGoalSummary = result?.savings_summary || persistentGoal;

  // ──────────────────────────────────────────────────────────
  //  RENDER INTERFACE
  // ──────────────────────────────────────────────────────────

  // Gatekeeper: If not logged in, user sees the stunning Landing Page
  if (!user) {
    return (
      <>
        <LandingPage 
          onOpenAuth={(mode) => {
            setAuthInitialMode(mode || 'signin');
            setShowAuthModal(true);
          }} 
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(authenticatedUser) => {
            setUser(authenticatedUser);
            setShowAuthModal(false);
          }}
          initialMode={authInitialMode}
        />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      
      {/* ======================================================= */}
      {/* 1. SLIM VERTICAL SIDEBAR                                */}
      {/* ======================================================= */}
      <aside style={{
        width: '74px',
        background: '#FFFFFF',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 50,
        flexShrink: 0
      }}>
        {/* Brand Icon */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'var(--coral)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          marginBottom: '36px',
          boxShadow: 'var(--shadow-coral)'
        }}>
          <Wallet size={22} strokeWidth={2.2} />
        </div>

        {/* Sidebar Navigation - 4 Dedicated Tabs */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          
          {/* Tab 1: Progress & Analytics Dashboard */}
          <button
            onClick={() => setActiveTab('progress')}
            title="Tab 1: Progress & Analytics Dashboard"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: activeTab === 'progress' ? 'var(--dark-accent)' : 'transparent',
              color: activeTab === 'progress' ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutDashboard size={20} strokeWidth={activeTab === 'progress' ? 2.2 : 1.8} />
          </button>

          {/* Tab 2: Recent Activities & Transactions */}
          <button
            onClick={() => setActiveTab('transactions')}
            title="Tab 2: Recent Activities & Transactions"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: activeTab === 'transactions' ? 'var(--dark-accent)' : 'transparent',
              color: activeTab === 'transactions' ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={20} strokeWidth={activeTab === 'transactions' ? 2.2 : 1.8} />
          </button>

          {/* Tab 3: Coach Manager Final Report */}
          <button
            onClick={() => setActiveTab('report')}
            title="Tab 3: Coach Manager Final Report"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: activeTab === 'report' ? 'var(--dark-accent)' : 'transparent',
              color: activeTab === 'report' ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={20} strokeWidth={activeTab === 'report' ? 2.2 : 1.8} />
          </button>

          {/* Tab 4: Agent Call Flow & Tools Called Trace */}
          <button
            onClick={() => setActiveTab('agents')}
            title="Tab 4: Agent Call Flow & Tools Executed"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: activeTab === 'agents' ? 'var(--dark-accent)' : 'transparent',
              color: activeTab === 'agents' ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <Cpu size={20} strokeWidth={activeTab === 'agents' ? 2.2 : 1.8} />
          </button>
        </nav>

        {/* Bottom Config Icon */}
        <button
          onClick={handleStartNewMonth}
          title="Record New Month & Settings"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SlidersHorizontal size={19} />
        </button>
      </aside>

      {/* ======================================================= */}
      {/* 2. MAIN WORKSPACE CONTAINER                             */}
      {/* ======================================================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* TOP BAR: Clean Title + Search + Actions (NO NAVIGATION TABS) */}
        <header style={{
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          {/* Brand Name only */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Personal Finance <span style={{ color: 'var(--coral)' }}>Budget Coach</span>
            </span>
            <span className={`pill-badge ${apiOnline ? 'pill-success' : 'pill-danger'}`} style={{ fontSize: '0.7rem' }}>
              {apiOnline ? 'System Online' : 'API Offline'}
            </span>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', padding: '6px 14px', width: '220px' }}>
              <Search size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.82rem', width: '100%' }}
              />
            </div>

            <button 
              onClick={handleResetSession}
              className="btn-outline"
              title="Reset current session data"
              style={{ fontSize: '0.78rem', padding: '7px 14px' }}
            >
              <RefreshCw size={13} />
              Reset Session
            </button>

            {/* Notifications Toggle */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  position: 'relative'
                }}
                title="System Notifications"
              >
                <Bell size={16} />
                <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--coral)' }}></span>
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '280px',
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-hover)',
                  border: '1px solid var(--border-color)',
                  padding: '16px',
                  zIndex: 100
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>System Notifications</span>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={14} /></button>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                      🟢 <strong>Agents Active:</strong> 5-Agent coordination pipeline loaded and ready.
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                      🛡️ <strong>Safety Guardrail:</strong> Zero investment or tax advice policy strictly enforced.
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                      💾 <strong>SQLite Memory:</strong> Persistent savings memory connected.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Firebase Auth Profile Section */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '3px 10px 3px 3px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Account Settings & Profile"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--coral)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.78rem'
                    }}>
                      {getUserInitials(user)}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.1 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: 'var(--coral)', fontWeight: 600 }}>
                      Fintech Member
                    </span>
                  </div>
                  <ChevronDown size={14} color="var(--text-secondary)" style={{ marginLeft: '2px' }} />
                </button>

                {/* User Dropdown Popover */}
                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '44px',
                    right: 0,
                    width: '260px',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid var(--border-color)',
                    padding: '16px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--dark-accent)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.86rem'
                      }}>
                        {getUserInitials(user)}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.displayName || 'Fintech User'}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.email}
                        </div>
                        <span className="pill-badge pill-success" style={{ fontSize: '0.64rem', marginTop: '4px', display: 'inline-block' }}>
                          {user.isFirebase ? 'Firebase Authenticated' : 'Session Active'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--danger-light)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(228, 87, 69, 0.2)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-coral"
                style={{ fontSize: '0.8rem', padding: '7px 16px', gap: '7px', boxShadow: 'var(--shadow-coral)' }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* MAIN BODY CONTAINER */}
        <main style={{ padding: '32px 36px 60px', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          
          {/* WELCOME & UNIFIED GLOBAL MONTH SELECTOR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                Good morning{user ? `, ${user.displayName || user.email?.split('@')[0]}` : ''}! Welcome back!
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {month ? (
                  <>Viewing financial records and analytics for <strong>{month}</strong>.</>
                ) : (
                  <>No month active. Click <strong>"+ Record New Month"</strong> to begin.</>
                )}
              </p>
            </div>

            {/* Global Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              
              {/* Custom Fintech Styled Active Month Selector */}
              {recordedMonthNames.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="var(--coral)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Month:</span>
                  <CustomDropdown
                    value={month}
                    options={activeMonthOptions}
                    onChange={handleActiveMonthChange}
                    minWidth="160px"
                  />
                </div>
              )}

              <button 
                onClick={handleStartNewMonth} 
                className="btn-outline"
                style={{ fontSize: '0.84rem' }}
              >
                <Plus size={15} />
                Record New Month
              </button>

              <button 
                onClick={handleRunAnalysis} 
                disabled={isAnalyzing || !month}
                className="btn-coral"
                style={{ fontSize: '0.86rem', padding: '10px 22px' }}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Running 5 Agents...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Run Coach Analysis
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{ padding: '12px 18px', background: 'var(--danger-bg)', border: '1px solid rgba(228, 87, 69, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 1: PROGRESS & ANALYTICS DASHBOARD                   */}
          {/* ======================================================= */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* 4 Financial Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                
                {/* 1. Total Monthly Income (Coral Accent) */}
                <div className="fintech-card" style={{ padding: '22px 24px', background: 'var(--coral)', color: '#FFFFFF', border: 'none', boxShadow: 'var(--shadow-coral)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>Total Monthly Income</span>
                    <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.2)', fontSize: '0.72rem', fontWeight: 700 }}>
                      Active
                    </span>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {formatINR(income)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    Baseline for 50/30/20 budget thresholds
                  </div>
                </div>

                {/* 2. Total Expenses */}
                <div className="fintech-card" style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Expenses</span>
                    <span className="pill-badge pill-neutral">
                      {income > 0 ? ((currentTotalExpenses / income) * 100).toFixed(0) : 0}% of income
                    </span>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {formatINR(currentTotalExpenses)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} in {month || '—'}
                  </div>
                </div>

                {/* 3. Actual Savings */}
                <div className="fintech-card" style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Actual Savings</span>
                    <span className={`pill-badge ${actualSavings >= targetSavings ? 'pill-success' : 'pill-coral'}`}>
                      {actualSavings >= targetSavings ? 'Target Met' : 'Shortfall'}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {formatINR(actualSavings)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Confirmed real savings deposited
                  </div>
                </div>

                {/* 4. 20% Savings Target */}
                <div className="fintech-card" style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>20% Savings Target</span>
                    <span className="pill-badge pill-neutral">50/30/20 Target</span>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {formatINR(targetSavings)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: actualSavings < targetSavings ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {actualSavings < targetSavings ? `Shortfall: ${formatINR(targetSavings - actualSavings)}` : 'Target fully satisfied'}
                  </div>
                </div>

              </div>

              {/* Grid: 50/30/20 Distribution & Spending Limit / Savings Goal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
                
                {/* 50/30/20 Progress Bars */}
                <div className="fintech-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        50/30/20 Budget Progress
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Evaluating actual spending against 50/30/20 budget thresholds
                      </p>
                    </div>
                    <span className="pill-badge pill-neutral">Guidelines</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Needs 50% */}
                    {(() => {
                      const needsAlloc = result?.budget_calculation?.budget_allocation?.Needs;
                      const spent = needsAlloc ? needsAlloc.actual : expenses.filter(e => e.category === 'Needs').reduce((s, e) => s + Number(e.amount), 0);
                      const isOver = spent > targetNeeds;
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Needs</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                (50% Target: {formatINR(targetNeeds)})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatINR(spent)}</span>
                              <span className={`pill-badge ${isOver ? 'pill-danger' : 'pill-success'}`}>
                                {isOver ? `Overspending by ${formatINR(spent - targetNeeds)}` : spent === targetNeeds ? 'Equal to Budget' : `Within Budget (${formatINR(targetNeeds - spent)} left)`}
                              </span>
                            </div>
                          </div>
                          <div className="bar-track">
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${Math.min((spent / (targetNeeds || 1)) * 100, 100)}%`, 
                                background: isOver ? 'var(--danger)' : 'var(--success)' 
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Wants 30% */}
                    {(() => {
                      const wantsAlloc = result?.budget_calculation?.budget_allocation?.Wants;
                      const spent = wantsAlloc ? wantsAlloc.actual : expenses.filter(e => e.category === 'Wants').reduce((s, e) => s + Number(e.amount), 0);
                      const isOver = spent > targetWants;
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Wants</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                (30% Target: {formatINR(targetWants)})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatINR(spent)}</span>
                              <span className={`pill-badge ${isOver ? 'pill-danger' : 'pill-success'}`}>
                                {isOver ? `Overspending by ${formatINR(spent - targetWants)}` : spent === targetWants ? 'Equal to Budget' : `Within Budget (${formatINR(targetWants - spent)} left)`}
                              </span>
                            </div>
                          </div>
                          <div className="bar-track">
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${Math.min((spent / (targetWants || 1)) * 100, 100)}%`, 
                                background: isOver ? 'var(--danger)' : '#F59E0B' 
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Savings 20% */}
                    {(() => {
                      const hasShortfall = actualSavings < targetSavings;
                      const shortfallAmount = targetSavings - actualSavings;
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Savings</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                (20% Target: {formatINR(targetSavings)})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatINR(actualSavings)}</span>
                              {hasShortfall ? (
                                <span className="pill-badge pill-danger">
                                  Savings Shortfall of {formatINR(shortfallAmount)}
                                </span>
                              ) : (
                                <span className="pill-badge pill-success">
                                  Savings Target Met
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="bar-track">
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${Math.min((actualSavings / (targetSavings || 1)) * 100, 100)}%`, 
                                background: hasShortfall ? 'var(--coral)' : 'var(--success)' 
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Right Progress: Spending Limit & Long-Term Savings Goal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Monthly Spending Limit (Needs + Wants = 80%) */}
                  <div className="fintech-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Monthly Spending Limit
                      </span>
                      <span className="pill-badge pill-neutral">80% Cap</span>
                    </div>

                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {formatINR(currentTotalExpenses)}
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                        / {formatINR(spendingLimit)}
                      </span>
                    </div>

                    <div className="bar-track" style={{ height: '9px', marginBottom: '12px' }}>
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${Math.min((currentTotalExpenses / (spendingLimit || 1)) * 100, 100)}%`, 
                          background: currentTotalExpenses > spendingLimit ? 'var(--danger)' : 'var(--coral)' 
                        }} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>Remaining budget:</span>
                      <strong style={{ color: currentTotalExpenses > spendingLimit ? 'var(--danger)' : 'var(--success)' }}>
                        {currentTotalExpenses > spendingLimit ? `Exceeded by ${formatINR(currentTotalExpenses - spendingLimit)}` : formatINR(remainingSpendingBudget)}
                      </strong>
                    </div>
                  </div>

                  {/* Long-Term Savings Goal (Connected to True Database State) */}
                  <div className="fintech-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Long-Term Savings Goal
                      </span>
                      {activeGoalSummary ? (
                        <span className={`pill-badge ${activeGoalSummary.goal_completed ? 'pill-success' : 'pill-coral'}`}>
                          {activeGoalSummary.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="pill-badge pill-neutral">INACTIVE</span>
                      )}
                    </div>

                    {activeGoalSummary ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Goal #{activeGoalSummary.goal_id} Progress</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--coral)' }}>
                            {activeGoalSummary.progress_percentage}%
                          </span>
                        </div>

                        <div className="bar-track" style={{ height: '9px', marginBottom: '14px' }}>
                          <div 
                            className="bar-fill" 
                            style={{ 
                              width: `${Math.min(activeGoalSummary.progress_percentage, 100)}%`, 
                              background: 'var(--coral)' 
                            }} 
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>Target: <strong>{formatINR(activeGoalSummary.goal_amount)}</strong></span>
                          <span>Balance: <strong style={{ color: 'var(--text-primary)' }}>{formatINR(activeGoalSummary.current_savings)}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No active savings goal in database.
                        <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                          Enable "Track Long-Term Savings Goal" when recording a month.
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* =================================================== */}
              {/* MONTHLY FINANCIAL COMPARISON CHART                   */}
              {/* =================================================== */}
              <div className="fintech-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChart3 size={19} color="var(--coral)" />
                      Monthly Financial Comparison
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Compare income, expenses, and savings across all recorded months
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    
                    {/* View Dropdown: Custom Styled Fintech Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>View:</span>
                      <CustomDropdown
                        value={chartViewFilter}
                        options={chartViewOptions}
                        onChange={handleChartViewFilterChange}
                        minWidth="190px"
                      />
                    </div>

                    {/* Chart Legend */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: 'var(--dark-accent)' }}></span>
                        <span>Income</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: 'var(--coral)' }}></span>
                        <span>Expenses</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: 'var(--success)' }}></span>
                        <span>Savings</span>
                      </div>
                    </div>
                  </div>
                </div>

                {displayedChartRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <BarChart3 size={38} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p>No monthly records available. Click "+ Record New Month" to begin tracking.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0' }}>
                    {/* Y-Axis Scale Marks */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '14px', height: '280px', paddingBottom: '32px' }}>
                      {yAxisTicks.map((tick, i) => (
                        <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                          {tick >= 100000 ? `${(tick / 100000).toFixed(1)}L` : tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
                        </span>
                      ))}
                    </div>

                    {/* Chart Body */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      {/* Horizontal Subtle Grid Lines */}
                      <div style={{ position: 'absolute', inset: 0, bottom: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                        {yAxisTicks.map((_, i) => (
                          <div key={i} style={{ borderBottom: '1px dashed var(--border-subtle)', width: '100%' }} />
                        ))}
                      </div>

                      {/* Bar Groups */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        justifyContent: displayedChartRecords.length <= 4 ? 'center' : 'flex-start',
                        gap: displayedChartRecords.length <= 3 ? '44px' : displayedChartRecords.length <= 6 ? '26px' : '16px', 
                        height: '248px', 
                        padding: '0 16px',
                        position: 'relative',
                        zIndex: 1,
                        overflowX: 'auto'
                      }}>
                        {displayedChartRecords.map((mItem, idx) => {
                          const barMaxH = 210;
                          const incH = chartCeiling > 0 ? Math.max((mItem.monthly_income / chartCeiling) * barMaxH, 4) : 4;
                          const expH = chartCeiling > 0 ? Math.max((mItem.total_expenses / chartCeiling) * barMaxH, 4) : 4;
                          const savH = chartCeiling > 0 ? Math.max((mItem.actual_savings / chartCeiling) * barMaxH, 4) : 4;
                          const isSelected = mItem.month === month;
                          const shortName = mItem.month.length > 8 
                            ? mItem.month.substring(0, 3) + ' ' + mItem.month.split(' ').pop() 
                            : mItem.month;

                          return (
                            <div 
                              key={idx}
                              onClick={() => {
                                persistCurrentMonth();
                                loadMonth(mItem.month);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: 'var(--radius-sm)',
                                background: isSelected ? 'rgba(242, 100, 61, 0.05)' : 'transparent',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Click to select ${mItem.month}\nIncome: ${formatINR(mItem.monthly_income)}\nExpenses: ${formatINR(mItem.total_expenses)}\nSavings: ${formatINR(mItem.actual_savings)}`}
                            >
                              {/* 3 Grouped Bars per Month */}
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: `${barMaxH}px` }}>
                                {/* Income Bar */}
                                <div 
                                  style={{
                                    width: '24px',
                                    height: `${incH}px`,
                                    background: 'var(--dark-accent)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.4s ease',
                                    opacity: isSelected ? 1 : 0.8
                                  }}
                                />
                                {/* Expenses Bar */}
                                <div 
                                  style={{
                                    width: '24px',
                                    height: `${expH}px`,
                                    background: 'var(--coral)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.4s ease',
                                    opacity: isSelected ? 1 : 0.8
                                  }}
                                />
                                {/* Savings Bar */}
                                <div 
                                  style={{
                                    width: '24px',
                                    height: `${savH}px`,
                                    background: 'var(--success)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.4s ease',
                                    opacity: isSelected ? 1 : 0.8
                                  }}
                                />
                              </div>

                              {/* Month Label */}
                              <span style={{ 
                                marginTop: '10px', 
                                fontSize: '0.76rem', 
                                fontWeight: isSelected ? 800 : 600, 
                                color: isSelected ? 'var(--coral)' : 'var(--text-secondary)',
                                whiteSpace: 'nowrap'
                              }}>
                                {shortName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 2: RECENT ACTIVITIES & TRANSACTIONS (DEDICATED)      */}
          {/* ======================================================= */}
          {activeTab === 'transactions' && (
            <div className="fintech-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={22} color="var(--coral)" />
                    Recent Activities & Transactions
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Detailed transaction register categorised by Transaction Categoriser Agent
                  </p>
                </div>

                {/* Filter Controls Row: Clear Scope Toggle + Category Pills */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {/* Distinct Scope Selector: Current Month vs All Recorded Months */}
                  <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => setTxnScope('current')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background: txnScope === 'current' ? '#FFFFFF' : 'transparent',
                        color: txnScope === 'current' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: txnScope === 'current' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      {month || 'Active Month'}
                    </button>
                    <button
                      onClick={() => setTxnScope('all')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background: txnScope === 'all' ? '#FFFFFF' : 'transparent',
                        color: txnScope === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: txnScope === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      All Recorded Months
                    </button>
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['All', 'Needs', 'Wants', 'Savings', 'Unclassified'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        style={{
                          padding: '5px 14px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: categoryFilter === cat ? 'var(--dark-accent)' : 'var(--bg-surface)',
                          color: categoryFilter === cat ? '#FFFFFF' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '14px' }}>Transaction ID</th>
                      <th style={{ padding: '14px' }}>Month</th>
                      <th style={{ padding: '14px' }}>Description</th>
                      <th style={{ padding: '14px' }}>Category</th>
                      <th style={{ padding: '14px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '14px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No transactions found matching your criteria. Use the form below to add expenses.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((item, idx) => {
                        const cat = item.category || 'Needs';
                        const catClass = 
                          cat === 'Needs' ? 'pill-success' :
                          cat === 'Wants' ? 'pill-coral' :
                          cat === 'Savings' ? 'pill-neutral' : 'pill-danger';
                        return (
                          <tr 
                            key={`${item._month}-${item.id}-${idx}`}
                            style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s ease' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '16px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {item.id}
                            </td>
                            <td style={{ padding: '16px 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {item._month}
                            </td>
                            <td style={{ padding: '16px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.description}
                            </td>
                            <td style={{ padding: '16px 14px' }}>
                              <span className={`pill-badge ${catClass}`}>
                                {cat}
                              </span>
                            </td>
                            <td style={{ padding: '16px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {formatINR(item.amount)}
                            </td>
                            <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                              {item._month === month && (
                                <button 
                                  onClick={() => handleDeleteExpense(item.id)}
                                  title="Delete expense"
                                  style={{ background: 'transparent', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Expense Form (Adds to Active Month) */}
              {month ? (
                <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '12px' }}>
                    + Add Expense to {month}
                  </span>
                  <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Expense description (e.g. Electricity, Groceries, Rent)..." 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="Amount (₹)" 
                      value={newAmountStr}
                      onChange={(e) => setNewAmountStr(sanitizeNumericInput(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-dark" style={{ flexShrink: 0, padding: '10px 22px' }}>
                      <Plus size={16} /> Add Expense
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                  Please select or record a month to add expenses.
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 3: COACH MANAGER FINAL REPORT (DEDICATED)           */}
          {/* ======================================================= */}
          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="fintech-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={22} color="var(--coral)" />
                      Coach Manager Final Executive Report
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Synthesized analysis for {month || '—'} reviewed and certified by Guardrail Agent
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="pill-badge pill-success">
                      <ShieldCheck size={14} />
                      Guardrail: {result?.guardrail?.decision || 'ALLOWED'}
                    </div>

                    <button onClick={handleCopyReport} className="btn-outline" style={{ fontSize: '0.8rem', padding: '7px 16px' }}>
                      {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Report'}
                    </button>
                  </div>
                </div>

                {result?.final_report ? (
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.86rem',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.75
                  }}>
                    {result.final_report}
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      No Analysis Generated Yet{month ? ` for ${month}` : ''}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                      Click the button below to run the multi-agent pipeline and generate your report.
                    </p>
                    <button onClick={handleRunAnalysis} disabled={isAnalyzing || !month} className="btn-coral">
                      <Sparkles size={16} /> Run Coach Analysis
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 4: AGENT CALL FLOW & TOOLS CALLED (DEDICATED)        */}
          {/* ======================================================= */}
          {activeTab === 'agents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="fintech-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={22} color="var(--coral)" />
                      Agent Call Flow & Tool Execution Trace
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Shows which specialist agent is invoked by the Head Agent (Coach Manager) and which tools were called
                    </p>
                  </div>

                  <span className="pill-badge pill-neutral">
                    Orchestrated by Coach Manager
                  </span>
                </div>

                {/* Show clean empty state if no analysis has been executed */}
                {!result?.agent_trace || result.agent_trace.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <Activity size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      No Agent Activity Recorded Yet
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 18px' }}>
                      Tool calls are recorded during live agent operations. Run <strong>Coach Analysis</strong> on an active month to initiate the 5-agent coordination pipeline and inspect live tool executions.
                    </p>
                    <button onClick={handleRunAnalysis} disabled={isAnalyzing || !month} className="btn-coral">
                      <Sparkles size={16} /> Run Coach Analysis
                    </button>
                  </div>
                ) : (
                  /* Display REAL Agent Call Flow & Live Tool Trace */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {result.agent_trace.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: '20px 24px',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: item.step === 1 ? 'var(--coral)' : 'var(--dark-accent)', 
                              color: '#FFF', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 800, 
                              fontSize: '0.78rem' 
                            }}>
                              {item.step}
                            </span>
                            <div>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {item.agent}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                ({item.role})
                              </span>
                            </div>
                          </div>

                          <span className={`pill-badge ${item.status === 'COMPLETED' ? 'pill-success' : 'pill-neutral'}`}>
                            {item.status}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {item.task}
                        </p>

                        <div style={{ 
                          background: '#FFFFFF', 
                          padding: '10px 14px', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Terminal size={14} color="var(--coral)" />
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Tools Called:</span>
                            <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {item.tool_called}
                            </code>
                          </div>

                          {item.tool_output && (
                            <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.74rem' }}>
                              ✓ Result Captured
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ======================================================= */}
      {/* RECORD NEW MONTH / SETTINGS MODAL                       */}
      {/* ======================================================= */}
      {showInputModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="fintech-card" style={{ width: '100%', maxWidth: '540px', padding: '32px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Record New Monthly Data
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Each month is preserved independently in your session memory.
                </p>
              </div>
              <button 
                onClick={() => setShowInputModal(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Month Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Budget Month Name
                </label>
                <input 
                  type="text" 
                  value={modalMonth} 
                  onChange={(e) => setModalMonth(e.target.value)} 
                  placeholder="e.g. December 2026, January 2027"
                />
              </div>

              {/* Monthly Income (Controlled Text Input) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Total Monthly Income (₹)
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={modalIncomeStr} 
                  onChange={(e) => setModalIncomeStr(sanitizeNumericInput(e.target.value))} 
                  placeholder="100000"
                />
              </div>

              {/* Actual Monthly Savings (Controlled Text Input) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Actual Monthly Savings (₹)
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={modalSavingsStr} 
                  onChange={(e) => setModalSavingsStr(sanitizeNumericInput(e.target.value))} 
                  placeholder="15000"
                />
              </div>

              {/* Long-Term Savings Goal Section */}
              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={modalTrackGoal} 
                    onChange={(e) => setModalTrackGoal(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--coral)' }}
                  />
                  Track Long-Term Savings Goal
                </label>

                {modalTrackGoal && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Target Goal (₹)
                      </label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={modalGoalTargetStr} 
                        onChange={(e) => setModalGoalTargetStr(sanitizeNumericInput(e.target.value))} 
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Initial Savings (₹)
                      </label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={modalGoalInitialStr} 
                        onChange={(e) => setModalGoalInitialStr(sanitizeNumericInput(e.target.value))} 
                        placeholder="10000"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Already Recorded Months Preview */}
              {recordedMonthNames.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Already Recorded ({recordedMonthNames.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {recordedMonthNames.map((m) => (
                      <span key={m} className="pill-badge pill-neutral" style={{ fontSize: '0.74rem' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowInputModal(false)}
                  className="btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNewMonth}
                  className="btn-coral" 
                  style={{ flex: 1.5 }}
                  disabled={!modalMonth.trim()}
                >
                  <Plus size={16} />
                  Create Month & Start Adding Expenses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          setShowAuthModal(false);
        }}
        initialMode={authInitialMode}
      />

    </div>
  );
}
