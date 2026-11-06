import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  OotyExpense,
  OotySettlement,
  OOTY_MEMBERS,
  OOTY_CATEGORIES,
  calculateOotyBalances,
  simplifyOotyDebts,
} from '../../types/ooty';
import {
  subscribeToOotyData,
  deleteOotyExpense,
  deleteOotySettlement,
} from '../../services/ootyDataService';
import { AddExpenseModal } from '../../components/ooty/AddExpenseModal';
import { RecordSettlementModal } from '../../components/ooty/RecordSettlementModal';
import {
  Compass,
  Plus,
  ArrowRightLeft,
  Share2,
  Download,
  LogOut,
  Moon,
  Sun,
  Search,
  Trash2,
  CheckCircle2,
  Receipt,
  Users,
  TrendingUp,
  PieChart,
  Coffee,
  Car,
  Home,
  Ticket,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';

export const OotyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const [expenses, setExpenses] = useState<OotyExpense[]>([]);
  const [settlements, setSettlements] = useState<OotySettlement[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'simplified' | 'members' | 'settlements' | 'analytics'>('expenses');

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [settlementPrefill, setSettlementPrefill] = useState<{
    fromId?: string;
    toId?: string;
    amount?: number;
  }>({});

  // Filters for expenses tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Subscribe to real-time Ooty data
  useEffect(() => {
    const unsubscribe = subscribeToOotyData((newExpenses, newSettlements) => {
      setExpenses(newExpenses);
      setSettlements(newSettlements);
    });

    return () => unsubscribe();
  }, []);

  // Compute Balances
  const balances = useMemo(() => {
    return calculateOotyBalances(expenses, settlements);
  }, [expenses, settlements]);

  // Compute Simplified Debts
  const simplifiedDebts = useMemo(() => {
    return simplifyOotyDebts(balances);
  }, [balances]);

  // Logged-in user specific stats
  const currentUserId = user?.id || 'pushkar';
  const currentUserBalance = balances[currentUserId] || {
    totalPaid: 0,
    totalShare: 0,
    netBalance: 0,
  };

  // Trip Total Spending
  const totalTripSpending = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Stay':
        return <Home className="w-4 h-4 text-retro-gold" />;
      case 'Travel & Fuel':
        return <Car className="w-4 h-4 text-retro-coral" />;
      case 'Food & Drinks':
        return <Coffee className="w-4 h-4 text-retro-berry" />;
      case 'Activities':
        return <Ticket className="w-4 h-4 text-retro-teal" />;
      case 'Shopping':
      case 'Snacks':
        return <ShoppingBag className="w-4 h-4 text-retro-gold" />;
      default:
        return <Receipt className="w-4 h-4 text-retro-text-muted" />;
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        OOTY_MEMBERS.find((m) => m.id === e.paidBy)?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, selectedCategory]);

  const handleLogout = () => {
    if (window.confirm('Do you want to log out of this device?')) {
      logout();
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (window.confirm(`Delete expense "${title}"?`)) {
      try {
        await deleteOotyExpense(id);
        toast.success('Expense deleted');
      } catch (err) {
        toast.error('Could not delete expense');
      }
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (window.confirm('Delete this settlement record?')) {
      try {
        await deleteOotySettlement(id);
        toast.success('Settlement record deleted');
      } catch (err) {
        toast.error('Could not delete settlement');
      }
    }
  };

  // WhatsApp Summary Generator
  const copyWhatsAppSummary = () => {
    let text = `🌲 *OOTY TRIP 2024 - EXPENSE SUMMARY* 🏔️\n\n`;
    text += `💰 *Total Trip Spend:* ₹${totalTripSpending.toLocaleString('en-IN')}\n`;
    text += `👥 *Total Travelers:* 13 Members\n\n`;
    text += `⚖️ *WHO OWES WHOM (Simplified Settlements):*\n`;

    if (simplifiedDebts.length === 0) {
      text += `✨ Everyone is all settled up! No pending debts.\n`;
    } else {
      simplifiedDebts.forEach((debt, index) => {
        text += `${index + 1}. *${debt.fromName}* owes *${debt.toName}*: ₹${debt.amount.toLocaleString('en-IN')}\n`;
      });
    }

    text += `\n📊 *MEMBER BALANCES SUMMARY:*\n`;
    OOTY_MEMBERS.forEach((m) => {
      const b = balances[m.id];
      const net = b ? b.netBalance : 0;
      if (net > 0) {
        text += `• ${m.name}: Gets back +₹${net.toLocaleString('en-IN')}\n`;
      } else if (net < 0) {
        text += `• ${m.name}: Owes -₹${Math.abs(net).toLocaleString('en-IN')}\n`;
      } else {
        text += `• ${m.name}: Settled (₹0)\n`;
      }
    });

    text += `\n_Generated via SplitMate Ooty Dashboard_ ⚡`;

    navigator.clipboard.writeText(text);
    toast.success('WhatsApp summary copied to clipboard! Paste it into your Ooty group 📲');
  };

  // CSV Export Generator
  const downloadCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Paid By', 'Amount (INR)', 'Split Count', 'Split With', 'Notes'];
    const rows = expenses.map((e) => {
      const payerName = OOTY_MEMBERS.find((m) => m.id === e.paidBy)?.name || e.paidBy;
      const splitNames = e.splitWith.map((id) => OOTY_MEMBERS.find((m) => m.id === id)?.name || id).join('; ');
      return [
        `"${e.date}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${payerName}"`,
        e.amount,
        e.splitWith.length,
        `"${splitNames}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ooty_trip_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded expenses CSV! 📄');
  };

  return (
    <div className="min-h-screen bg-retro-bg text-retro-text-primary pb-16">
      {/* 1. TOP RETRO NAVBAR */}
      <header className="sticky top-0 z-40 bg-retro-card/90 backdrop-blur-md border-b-2 border-retro-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Trip Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-retro-plum border-2 border-retro-coral shadow-retro-sm flex items-center justify-center">
              <Compass className="w-5 h-5 text-retro-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight font-display text-retro-text-primary">
                  SplitMate
                </span>
                <span className="px-2 py-0.5 rounded-full bg-retro-plum border border-retro-coral/40 text-[10px] font-bold text-retro-gold uppercase tracking-wider">
                  Ooty Trip 🌲
                </span>
              </div>
              <div className="text-[11px] text-retro-text-muted flex items-center gap-1.5">
                <span>13 Travelers</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-retro-teal animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-retro-surface border border-retro-border text-retro-text-muted hover:text-retro-text-primary transition-colors"
              title="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-retro-gold" /> : <Moon className="w-4 h-4 text-retro-plum" />}
            </button>

            {/* Current Member Pill */}
            <div className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-retro-surface border border-retro-border">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                style={{ backgroundColor: user?.avatarColor || '#FF5B42' }}
              >
                {user?.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[10px] text-retro-text-muted uppercase leading-none font-semibold">
                  Logged in
                </div>
                <div className="text-xs font-bold text-retro-text-primary leading-tight">
                  {user?.name}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-retro-surface hover:bg-retro-coral/20 border border-retro-border hover:border-retro-coral text-retro-text-muted hover:text-retro-coral text-xs font-semibold transition-all"
              title="Logout and return to login page"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Card 1: Your Net Balance */}
          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md">
            <div className="text-xs font-semibold text-retro-text-muted uppercase tracking-wider mb-1">
              Your Net Balance
            </div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                currentUserBalance.netBalance > 0.5
                  ? 'text-retro-teal'
                  : currentUserBalance.netBalance < -0.5
                  ? 'text-retro-coral'
                  : 'text-retro-text-primary'
              }`}
            >
              {currentUserBalance.netBalance > 0.5
                ? `+₹${currentUserBalance.netBalance.toLocaleString('en-IN')}`
                : currentUserBalance.netBalance < -0.5
                ? `-₹${Math.abs(currentUserBalance.netBalance).toLocaleString('en-IN')}`
                : '₹0'}
            </div>
            <div className="text-xs font-medium mt-1">
              {currentUserBalance.netBalance > 0.5 ? (
                <span className="text-retro-teal font-semibold">You get back this amount 💰</span>
              ) : currentUserBalance.netBalance < -0.5 ? (
                <span className="text-retro-coral font-semibold">You owe this amount ⚠️</span>
              ) : (
                <span className="text-retro-text-muted">You are all settled up! ✨</span>
              )}
            </div>
          </div>

          {/* Card 2: Total Trip Spending */}
          <div className="p-4 sm:p-5 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md">
            <div className="text-xs font-semibold text-retro-text-muted uppercase tracking-wider mb-1">
              Total Trip Spend
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-retro-gold">
              ₹{totalTripSpending.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-retro-text-muted mt-1">
              Across {expenses.length} shared expenses
            </div>
          </div>

          {/* Card 3: You Paid */}
          <div className="p-4 sm:p-5 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md">
            <div className="text-xs font-semibold text-retro-text-muted uppercase tracking-wider mb-1">
              You Paid (Total)
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-retro-text-primary">
              ₹{currentUserBalance.totalPaid.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-retro-text-muted mt-1">
              Out of your own pocket
            </div>
          </div>

          {/* Card 4: Your Share */}
          <div className="p-4 sm:p-5 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md">
            <div className="text-xs font-semibold text-retro-text-muted uppercase tracking-wider mb-1">
              Your Share of Trip
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-retro-text-primary">
              ₹{Math.round(currentUserBalance.totalShare).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-retro-text-muted mt-1">
              Your portion of group costs
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-retro-coral hover:bg-retro-coral/90 text-white font-bold text-xs sm:text-sm tracking-wide shadow-retro-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Expense</span>
            </button>

            <button
              onClick={() => {
                setSettlementPrefill({});
                setIsRecordSettlementOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-retro-teal hover:bg-retro-teal/90 text-white font-bold text-xs sm:text-sm tracking-wide shadow-retro-sm transition-all flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Settle Up</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyWhatsAppSummary}
              className="py-2 px-3 rounded-xl bg-retro-surface hover:bg-retro-surface/80 border border-retro-border text-retro-gold font-semibold text-xs transition-colors flex items-center gap-1.5"
              title="Copy formatted WhatsApp summary"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Summary</span>
            </button>

            <button
              onClick={downloadCSV}
              className="py-2 px-3 rounded-xl bg-retro-surface hover:bg-retro-surface/80 border border-retro-border text-retro-text-muted hover:text-retro-text-primary font-semibold text-xs transition-colors flex items-center gap-1.5"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1 sm:gap-2 border-b-2 border-retro-border mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'bg-retro-plum text-retro-gold border-2 border-retro-coral shadow-retro-sm'
                : 'text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-surface'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('simplified')}
            className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'simplified'
                ? 'bg-retro-plum text-retro-gold border-2 border-retro-coral shadow-retro-sm'
                : 'text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-surface'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Who Owes Whom ({simplifiedDebts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'members'
                ? 'bg-retro-plum text-retro-gold border-2 border-retro-coral shadow-retro-sm'
                : 'text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-surface'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All 13 Travelers</span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'settlements'
                ? 'bg-retro-plum text-retro-gold border-2 border-retro-coral shadow-retro-sm'
                : 'text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-surface'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Settlement Log ({settlements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-retro-plum text-retro-gold border-2 border-retro-coral shadow-retro-sm'
                : 'text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-surface'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Trip Analytics</span>
          </button>
        </div>

        {/* TAB 1: EXPENSES LIST */}
        {activeTab === 'expenses' && (
          <div>
            {/* Search & Category Pills */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-retro-text-muted" />
                <input
                  type="text"
                  placeholder="Search expenses by title, note, or payer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-retro-surface border-2 border-retro-border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-retro-text-primary focus:outline-none focus:border-retro-coral"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2 text-xs sm:text-sm text-retro-text-primary focus:outline-none focus:border-retro-coral cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {OOTY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Expenses Cards */}
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-retro-card border-2 border-retro-border">
                <Receipt className="w-12 h-12 mx-auto text-retro-text-muted/40 mb-3" />
                <h3 className="text-base font-bold text-retro-text-primary">No expenses found</h3>
                <p className="text-xs text-retro-text-muted mt-1 mb-4">
                  Add the first expense of the Ooty trip to start tracking!
                </p>
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="py-2 px-4 rounded-xl bg-retro-coral text-white font-bold text-xs"
                >
                  + Add Expense
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((exp) => {
                  const payer = OOTY_MEMBERS.find((m) => m.id === exp.paidBy);
                  const isUserPayer = exp.paidBy === currentUserId;
                  const isUserInvolved = exp.splitWith.includes(currentUserId);
                  const userShare = isUserInvolved ? exp.amount / exp.splitWith.length : 0;

                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl bg-retro-card border-2 border-retro-border hover:border-retro-coral/50 transition-all shadow-retro-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      {/* Left: Icon, Title, Date, Payer */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-retro-surface border border-retro-border flex items-center justify-center shrink-0 mt-0.5">
                          {getCategoryIcon(exp.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-retro-text-primary truncate">
                              {exp.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-retro-surface border border-retro-border text-[10px] text-retro-text-muted font-medium">
                              {exp.category}
                            </span>
                          </div>
                          <div className="text-xs text-retro-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{exp.date}</span>
                            <span>•</span>
                            <span>
                              Paid by{' '}
                              <strong className="text-retro-text-primary">
                                {payer?.name} {isUserPayer ? '(You)' : ''}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>Split with {exp.splitWith.length} people</span>
                          </div>
                          {exp.notes && (
                            <p className="text-[11px] text-retro-text-muted/80 italic mt-1 truncate">
                              "{exp.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount, Your Share, Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-retro-border">
                        <div className="text-left sm:text-right">
                          <div className="text-base font-extrabold font-mono text-retro-gold">
                            ₹{exp.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-retro-text-muted">
                            {isUserPayer ? (
                              <span className="text-retro-teal font-medium">
                                You lent ₹{(exp.amount - userShare).toFixed(0)}
                              </span>
                            ) : isUserInvolved ? (
                              <span className="text-retro-coral font-medium">
                                Your share: ₹{userShare.toFixed(0)}
                              </span>
                            ) : (
                              <span>Not involved</span>
                            )}
                          </div>
                        </div>

                        {/* Delete Expense */}
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="p-2 rounded-lg text-retro-text-muted hover:text-retro-coral hover:bg-retro-coral/10 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WHO OWES WHOM (DEBT SIMPLIFICATION) */}
        {activeTab === 'simplified' && (
          <div>
            <div className="p-4 rounded-2xl bg-retro-surface border-2 border-retro-border mb-4">
              <h3 className="text-sm font-bold text-retro-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-retro-gold" />
                Simplified Debt Settlements
              </h3>
              <p className="text-xs text-retro-text-muted mt-0.5">
                Our debt algorithm minimizes all cross-payments between the 13 travelers into the fewest possible transactions!
              </p>
            </div>

            {simplifiedDebts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-retro-card border-2 border-retro-border">
                <CheckCircle2 className="w-12 h-12 mx-auto text-retro-teal mb-3" />
                <h3 className="text-base font-bold text-retro-text-primary">Everyone is settled up!</h3>
                <p className="text-xs text-retro-text-muted mt-1">
                  There are no pending balances or debts between any of the 13 members.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {simplifiedDebts.map((debt, idx) => {
                  const isYouDebtor = debt.from === currentUserId;
                  const isYouCreditor = debt.to === currentUserId;
                  const involvesYou = isYouDebtor || isYouCreditor;

                  const fromM = OOTY_MEMBERS.find((m) => m.id === debt.from);
                  const toM = OOTY_MEMBERS.find((m) => m.id === debt.to);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        involvesYou
                          ? 'bg-retro-card border-retro-coral shadow-retro-md'
                          : 'bg-retro-card border-retro-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-retro-text-muted">
                          Settlement #{idx + 1}
                        </span>
                        {involvesYou && (
                          <span className="px-2 py-0.5 rounded-full bg-retro-coral/15 border border-retro-coral text-[10px] font-bold text-retro-coral">
                            Involves You
                          </span>
                        )}
                      </div>

                      {/* Debtor to Creditor Visual */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        {/* Debtor */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: fromM?.avatarColor }}
                          >
                            {debt.fromName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-retro-text-primary truncate">
                              {debt.fromName} {isYouDebtor ? '(You)' : ''}
                            </div>
                            <div className="text-[10px] text-retro-coral font-medium">Owes</div>
                          </div>
                        </div>

                        {/* Amount in Center */}
                        <div className="text-center px-2 shrink-0">
                          <div className="text-sm font-extrabold font-mono text-retro-gold">
                            ₹{debt.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-retro-text-muted font-bold">→ pays to →</div>
                        </div>

                        {/* Creditor */}
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-retro-text-primary truncate">
                              {debt.toName} {isYouCreditor ? '(You)' : ''}
                            </div>
                            <div className="text-[10px] text-retro-teal font-medium">Gets</div>
                          </div>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: toM?.avatarColor }}
                          >
                            {debt.toName.charAt(0)}
                          </div>
                        </div>
                      </div>

                      {/* Settle Up Action */}
                      <button
                        onClick={() => {
                          setSettlementPrefill({
                            fromId: debt.from,
                            toId: debt.to,
                            amount: debt.amount,
                          });
                          setIsRecordSettlementOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-retro-surface hover:bg-retro-coral hover:text-white border border-retro-border hover:border-retro-coral text-retro-text-primary font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Record Payment (₹{debt.amount})</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 13 TRAVELERS & BALANCES */}
        {activeTab === 'members' && (
          <div className="rounded-2xl bg-retro-card border-2 border-retro-border overflow-hidden shadow-retro-md">
            <div className="p-4 border-b border-retro-border bg-retro-surface flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-retro-text-primary">
                  The 13 Ooty Travelers Summary
                </h3>
                <p className="text-xs text-retro-text-muted mt-0.5">
                  Live balances, total spend and individual shares
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-retro-gold">
                13 Members
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-retro-border bg-retro-surface/50 text-retro-text-muted uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4 text-right">Total Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Total Share (₹)</th>
                    <th className="py-3 px-4 text-right">Settled (₹)</th>
                    <th className="py-3 px-4 text-right">Net Balance (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-retro-border font-medium">
                  {OOTY_MEMBERS.map((m) => {
                    const b = balances[m.id] || {
                      totalPaid: 0,
                      totalShare: 0,
                      settlementsPaid: 0,
                      settlementsReceived: 0,
                      netBalance: 0,
                    };
                    const isYou = m.id === currentUserId;

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-retro-surface/50 transition-colors ${
                          isYou ? 'bg-retro-plum/20 font-bold' : ''
                        }`}
                      >
                        {/* Member */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                              style={{ backgroundColor: m.avatarColor }}
                            >
                              {m.name.charAt(0)}
                            </div>
                            <span className="text-retro-text-primary font-bold">
                              {m.name} {isYou ? <span className="text-retro-coral">(You)</span> : ''}
                            </span>
                          </div>
                        </td>

                        {/* Total Paid */}
                        <td className="py-3 px-4 text-right font-mono text-retro-text-primary">
                          ₹{b.totalPaid.toLocaleString('en-IN')}
                        </td>

                        {/* Total Share */}
                        <td className="py-3 px-4 text-right font-mono text-retro-text-muted">
                          ₹{Math.round(b.totalShare).toLocaleString('en-IN')}
                        </td>

                        {/* Settled */}
                        <td className="py-3 px-4 text-right font-mono text-retro-text-muted">
                          {b.settlementsPaid > 0 && (
                            <span className="text-retro-teal mr-1">+₹{b.settlementsPaid}</span>
                          )}
                          {b.settlementsReceived > 0 && (
                            <span className="text-retro-coral">-₹{b.settlementsReceived}</span>
                          )}
                          {b.settlementsPaid === 0 && b.settlementsReceived === 0 && '—'}
                        </td>

                        {/* Net Balance */}
                        <td className="py-3 px-4 text-right font-mono font-extrabold">
                          {b.netBalance > 0.5 ? (
                            <span className="text-retro-teal">+₹{b.netBalance.toLocaleString('en-IN')}</span>
                          ) : b.netBalance < -0.5 ? (
                            <span className="text-retro-coral">-₹{Math.abs(b.netBalance).toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-retro-text-muted">₹0</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {b.netBalance > 0.5 ? (
                            <span className="px-2 py-0.5 rounded-full bg-retro-teal/15 text-retro-teal text-[10px] font-bold">
                              Gets Back
                            </span>
                          ) : b.netBalance < -0.5 ? (
                            <span className="px-2 py-0.5 rounded-full bg-retro-coral/15 text-retro-coral text-[10px] font-bold">
                              Owes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-retro-surface text-retro-text-muted text-[10px] font-bold">
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SETTLEMENT LOG */}
        {activeTab === 'settlements' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-retro-text-primary">Settlement Records</h3>
                <p className="text-xs text-retro-text-muted mt-0.5">
                  Direct payments made via UPI, cash, or bank transfers
                </p>
              </div>
              <button
                onClick={() => {
                  setSettlementPrefill({});
                  setIsRecordSettlementOpen(true);
                }}
                className="py-1.5 px-3 rounded-xl bg-retro-teal text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            </div>

            {settlements.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-retro-card border-2 border-retro-border">
                <CheckCircle2 className="w-12 h-12 mx-auto text-retro-text-muted/40 mb-3" />
                <h3 className="text-base font-bold text-retro-text-primary">No settlements recorded yet</h3>
                <p className="text-xs text-retro-text-muted mt-1 mb-4">
                  When someone pays someone back via GPay or cash, record it here to clear debts!
                </p>
                <button
                  onClick={() => setIsRecordSettlementOpen(true)}
                  className="py-2 px-4 rounded-xl bg-retro-teal text-white font-bold text-xs"
                >
                  Record First Settlement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((set) => {
                  const fromM = OOTY_MEMBERS.find((m) => m.id === set.fromMemberId);
                  const toM = OOTY_MEMBERS.find((m) => m.id === set.toMemberId);

                  return (
                    <div
                      key={set.id}
                      className="p-4 rounded-2xl bg-retro-card border-2 border-retro-border flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-retro-teal/15 border border-retro-teal/40 flex items-center justify-center text-retro-teal">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-retro-text-primary flex items-center gap-1.5 flex-wrap">
                            <strong className="text-retro-coral">{fromM?.name}</strong>
                            <span className="text-retro-text-muted">paid</span>
                            <strong className="text-retro-teal">{toM?.name}</strong>
                            <span className="font-mono text-retro-gold font-bold">
                              ₹{set.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-[11px] text-retro-text-muted mt-0.5 flex items-center gap-2">
                            <span>{set.date}</span>
                            {set.note && (
                              <>
                                <span>•</span>
                                <span className="italic">"{set.note}"</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSettlement(set.id)}
                        className="p-2 rounded-lg text-retro-text-muted hover:text-retro-coral hover:bg-retro-coral/10 transition-colors"
                        title="Delete settlement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Breakdown */}
            <div className="p-5 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md">
              <h3 className="text-sm font-bold text-retro-text-primary mb-1 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-retro-coral" />
                Spending by Category
              </h3>
              <p className="text-xs text-retro-text-muted mb-4">
                Total spent across trip categories
              </p>

              <div className="space-y-3">
                {OOTY_CATEGORIES.map((cat) => {
                  const catTotal = expenses
                    .filter((e) => e.category === cat)
                    .reduce((sum, e) => sum + e.amount, 0);
                  const percent = totalTripSpending > 0 ? (catTotal / totalTripSpending) * 100 : 0;

                  if (catTotal === 0) return null;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          {getCategoryIcon(cat)}
                          {cat}
                        </span>
                        <span className="font-mono text-retro-gold">
                          ₹{catTotal.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-retro-text-muted font-normal">
                            ({percent.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-retro-surface overflow-hidden">
                        <div
                          className="h-full bg-retro-coral rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Spenders Breakdown */}
            <div className="p-5 rounded-2xl bg-retro-card border-2 border-retro-border shadow-retro-md">
              <h3 className="text-sm font-bold text-retro-text-primary mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-retro-gold" />
                Who has paid so far?
              </h3>
              <p className="text-xs text-retro-text-muted mb-4">
                Breakdown of initial payments made by travelers
              </p>

              <div className="space-y-3">
                {OOTY_MEMBERS.map((m) => {
                  const paid = balances[m.id]?.totalPaid || 0;
                  const percent = totalTripSpending > 0 ? (paid / totalTripSpending) * 100 : 0;

                  if (paid === 0) return null;

                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: m.avatarColor }}
                          />
                          {m.name} {m.id === currentUserId ? '(You)' : ''}
                        </span>
                        <span className="font-mono text-retro-text-primary">
                          ₹{paid.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-retro-text-muted font-normal">
                            ({percent.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-retro-surface overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: m.avatarColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        currentUserId={currentUserId}
      />

      <RecordSettlementModal
        isOpen={isRecordSettlementOpen}
        onClose={() => setIsRecordSettlementOpen(false)}
        defaultFromId={settlementPrefill.fromId}
        defaultToId={settlementPrefill.toId}
        defaultAmount={settlementPrefill.amount}
      />
    </div>
  );
};
