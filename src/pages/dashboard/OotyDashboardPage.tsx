import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  OotyExpense,
  OotySettlement,
  OotyMember,
  OOTY_MEMBERS,
  OotyChatMessage,
  calculateGPayBalancesForUser,
  calculateOotyBalances,
  simplifyOotyDebts,
} from '../../types/ooty';
import {
  subscribeToOotyData,
  deleteOotyExpense,
  sendOotyChatMessage,
  SyncStatus,
} from '../../services/ootyDataService';
import { GPaySplitExpenseModal } from '../../components/ooty/GPaySplitExpenseModal';
import { GPaySettleUpModal } from '../../components/ooty/GPaySettleUpModal';
import {
  MoreVertical,
  Share2,
  Download,
  LogOut,
  Trash2,
  Receipt,
  Smartphone,
  Clock,
  ChevronRight,
  Send,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to format dates like Google Pay (e.g. "28 Oct")
function formatGPayDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return isoString;
  }
}

// Helper to format message time (e.g. "11:45 PM")
function formatGPayTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

export const OotyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [expenses, setExpenses] = useState<OotyExpense[]>([]);
  const [settlements, setSettlements] = useState<OotySettlement[]>([]);
  const [members, setMembers] = useState<OotyMember[]>(OOTY_MEMBERS);
  const [messages, setMessages] = useState<OotyChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isConnected: true, isSyncing: false });

  // Top Tabs: 'chat' (Google Pay Conversation Stream) | 'expenses' (Balances overview) | 'all_members'
  const [topTab, setTopTab] = useState<'chat' | 'expenses' | 'all_members'>('chat');

  // Modals state
  const [isSplitExpenseOpen, setIsSplitExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState<{
    fromId?: string;
    toId?: string;
    amount?: number;
  }>({});

  // Menu Dropdown & PWA Install
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        toast.success('App installed to your phone! 📱');
      }
      setDeferredPrompt(null);
    } else {
      toast.info('To install: On Android tap browser menu (⋮) > "Install App" or "Add to Home Screen". On iPhone tap Share > "Add to Home Screen" 📲');
    }
    setIsMenuOpen(false);
  };

  // Subscribe to real-time Ooty data (Live Firestore)
  useEffect(() => {
    const unsubscribe = subscribeToOotyData((newExpenses, newSettlements, newMembers, newSyncStatus, newMessages) => {
      setExpenses(newExpenses);
      setSettlements(newSettlements);
      if (newMembers && newMembers.length > 0) {
        setMembers(newMembers);
      }
      setSyncStatus(newSyncStatus);
      if (newMessages) {
        setMessages(newMessages);
      }
    });

    return () => unsubscribe();
  }, []);

  const currentUserId = user?.id || 'pushkar';

  // Calculate Exact Google Pay Balances for the logged-in user
  const gpayBalances = useMemo(() => {
    return calculateGPayBalancesForUser(currentUserId, expenses, settlements, members);
  }, [currentUserId, expenses, settlements, members]);

  // Overall Group Balances & Simplified debts
  const groupBalances = useMemo(() => {
    return calculateOotyBalances(expenses, settlements, members);
  }, [expenses, settlements, members]);

  const simplifiedDebts = useMemo(() => {
    return simplifyOotyDebts(groupBalances);
  }, [groupBalances]);

  // Trip Total Spending
  const totalTripSpending = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // Unified Google Pay Chat Stream Timeline (Expenses, Settlements, and Messages)
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'expense' | 'settlement' | 'message';
      time: number;
      expense?: OotyExpense;
      settlement?: OotySettlement;
      message?: OotyChatMessage;
    }> = [];

    expenses.forEach((e) => {
      const ts = new Date(e.createdAt || e.date).getTime() || 0;
      items.push({ id: 'exp_' + e.id, type: 'expense', time: ts, expense: e });
    });

    settlements.forEach((s) => {
      const ts = new Date(s.createdAt || s.date).getTime() || 0;
      items.push({ id: 'set_' + s.id, type: 'settlement', time: ts, settlement: s });
    });

    messages.forEach((m) => {
      const ts = new Date(m.createdAt).getTime() || 0;
      items.push({ id: 'msg_' + m.id, type: 'message', time: ts, message: m });
    });

    items.sort((a, b) => a.time - b.time);
    return items;
  }, [expenses, settlements, messages]);

  // Auto-scroll chat to bottom on updates
  useEffect(() => {
    if (topTab === 'chat') {
      chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timelineItems, topTab]);

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
        toast.success('Expense deleted from live database 🗑️');
      } catch (err: any) {
        toast.error('Could not delete expense: ' + (err.message || 'Error'));
      }
    }
  };

  // Send message in Chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    try {
      await sendOotyChatMessage(currentUserId, text);
    } catch (err: any) {
      toast.error('Failed to send message: ' + (err?.message || 'Error'));
    }
  };

  // WhatsApp Summary Generator
  const copyWhatsAppSummary = () => {
    let text = `🌲 *OOTY TRIP 2024 - GOOGLE PAY EXPENSE SUMMARY* 🏔️\n\n`;
    text += `💰 *Total Trip Spend:* ₹${totalTripSpending.toLocaleString('en-IN')}\n`;
    text += `👥 *Total Travelers:* ${members.length} Members\n\n`;
    text += `⚖️ *WHO OWES WHOM:*\n`;

    if (simplifiedDebts.length === 0) {
      text += `✨ Everyone is all settled up! No pending debts.\n`;
    } else {
      simplifiedDebts.forEach((debt, index) => {
        text += `${index + 1}. *${debt.fromName}* owes *${debt.toName}*: ₹${debt.amount.toLocaleString('en-IN')}\n`;
      });
    }

    text += `\n_Generated via SplitMate Ooty Google Pay Edition_ ⚡`;
    navigator.clipboard.writeText(text);
    toast.success('WhatsApp summary copied to clipboard! 📲');
    setIsMenuOpen(false);
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Paid By', 'Amount (INR)', 'Split Count', 'Split With', 'Notes'];
    const rows = expenses.map((e) => {
      const payerName = members.find((m) => m.id === e.paidBy)?.name || e.paidBy;
      const splitNames = e.splitWith.map((id) => members.find((m) => m.id === id)?.name || id).join('; ');
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
    link.setAttribute('download', `ooty_trip_gpay_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded CSV! 📄');
    setIsMenuOpen(false);
  };

  // Helper to calculate payment progress for an expense card
  const getExpenseProgress = (exp: OotyExpense) => {
    const totalInvolved = exp.splitWith.length || 1;
    const sharePerPerson = exp.amount / totalInvolved;
    const isPayer = exp.paidBy === currentUserId;
    const userInvolved = exp.splitWith.includes(currentUserId);
    const userShare = userInvolved ? sharePerPerson : 0;

    let paidCount = 1;
    exp.splitWith.forEach((mId) => {
      if (mId === exp.paidBy) return;
      const hasSettled = settlements.some(
        (s) => s.fromMemberId === mId && s.toMemberId === exp.paidBy && s.amount >= sharePerPerson * 0.95
      );
      if (hasSettled) paidCount++;
    });

    const isUserPaid = isPayer || !userInvolved || settlements.some(
      (s) => s.fromMemberId === currentUserId && s.toMemberId === exp.paidBy && s.amount >= userShare * 0.95
    );

    const remainingAmount = Math.max(0, exp.amount - sharePerPerson * paidCount);
    const progressPercent = Math.min(100, Math.round((paidCount / totalInvolved) * 100));

    return {
      totalInvolved,
      sharePerPerson,
      isPayer,
      userInvolved,
      userShare,
      paidCount,
      isUserPaid,
      remainingAmount,
      progressPercent,
    };
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none transition-colors duration-150 ${
        isDark ? 'bg-[#000000] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#202124]'
      }`}
    >
      {/* 1. TOP APP BAR (Exact Google Pay Group Header) */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md px-4 pt-3 pb-0 border-b transition-colors ${
          isDark ? 'bg-[#000000]/95 border-[#1e1f20]' : 'bg-[#ffffff]/95 border-[#dadce0]'
        }`}
      >
        <div className="flex items-center justify-between pb-2">
          {/* Left: Group Title with Avatar cluster */}
          <div className="flex items-center gap-3">
            {/* Google Pay Style 4-avatar cluster */}
            <div
              className={`w-10 h-10 rounded-full border grid grid-cols-2 gap-0.5 p-0.5 overflow-hidden shrink-0 shadow-sm ${
                isDark ? 'bg-[#1e1f20] border-[#333538]' : 'bg-[#ffffff] border-[#dadce0]'
              }`}
            >
              {members.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none shadow-sm"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-medium text-base tracking-tight leading-tight">
                  Ooty Trip
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    if (syncStatus.isConnected) {
                      toast.success('Live Cloud Firestore Sync Active ⚡ All 13 members sync in real-time');
                    } else {
                      toast.error(`Database Status: ${syncStatus.error || 'Connecting to Firebase...'}`);
                    }
                  }}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-transform hover:scale-125 ${
                    syncStatus.isConnected ? 'bg-[#34a853] animate-pulse' : 'bg-[#fbbc04]'
                  }`}
                  title={syncStatus.isConnected ? 'Live Database Sync Active (Tap for status)' : (syncStatus.error || 'Connecting to database...')}
                />
              </div>
              <div className={`text-xs leading-none mt-0.5 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                {members.length} members •{' '}
                <span className={`font-medium ${isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'}`}>
                  {user?.name} (You)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Theme Toggle & Three Dots Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-[#1e1f20] text-[#c4c7c5]' : 'hover:bg-[#f1f3f4] text-[#5f6368]'
              }`}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-5 h-5 text-[#fbbc04]" /> : <Moon className="w-5 h-5 text-[#1a73e8]" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-full transition-colors ${
                  isDark ? 'hover:bg-[#1e1f20] text-[#c4c7c5]' : 'hover:bg-[#f1f3f4] text-[#5f6368]'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Menu Popover */}
              {isMenuOpen && (
                <div
                  className={`absolute right-0 top-10 w-52 border rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in-50 ${
                    isDark ? 'bg-[#1e1f20] border-[#333538] text-[#e3e3e3]' : 'bg-[#ffffff] border-[#dadce0] text-[#202124]'
                  }`}
                >
                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 ${
                      isDark ? 'hover:bg-[#282a2d]' : 'hover:bg-[#f1f3f4]'
                    }`}
                  >
                    {isDark ? <Sun className="w-4 h-4 text-[#fbbc04]" /> : <Moon className="w-4 h-4 text-[#1a73e8]" />}
                    <span>{isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                  </button>

                  <button
                    onClick={handleInstallApp}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-[#34a853] ${
                      isDark ? 'hover:bg-[#282a2d]' : 'hover:bg-[#f1f3f4]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Install App to Phone</span>
                  </button>

                  <button
                    onClick={copyWhatsAppSummary}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 ${
                      isDark ? 'hover:bg-[#282a2d]' : 'hover:bg-[#f1f3f4]'
                    }`}
                  >
                    <Share2 className={`w-4 h-4 ${isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'}`} />
                    <span>WhatsApp Summary</span>
                  </button>

                  <button
                    onClick={downloadCSV}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 ${
                      isDark ? 'hover:bg-[#282a2d]' : 'hover:bg-[#f1f3f4]'
                    }`}
                  >
                    <Download className="w-4 h-4 text-[#8e918f]" />
                    <span>Export to CSV</span>
                  </button>

                  <div className={`border-t my-1 ${isDark ? 'border-[#282a2d]' : 'border-[#e8eaed]'}`} />

                  <button
                    onClick={handleLogout}
                    className={`w-full px-4 py-2.5 text-left text-[#ea4335] flex items-center gap-2.5 ${
                      isDark ? 'hover:bg-[#282a2d]' : 'hover:bg-[#f1f3f4]'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout Device</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TOP TABS: "Chat" (Default like Google Pay) | "Expenses" | "All 13" */}
        <div className={`flex items-center justify-around border-t ${isDark ? 'border-[#1e1f20]' : 'border-[#e8eaed]'}`}>
          <button
            onClick={() => setTopTab('chat')}
            className={`py-2.5 px-6 text-sm font-medium transition-colors relative ${
              topTab === 'chat'
                ? isDark
                  ? 'text-white'
                  : 'text-[#202124] font-semibold'
                : isDark
                ? 'text-[#8e918f] hover:text-[#c4c7c5]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            Chat
            {topTab === 'chat' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${
                  isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setTopTab('expenses')}
            className={`py-2.5 px-6 text-sm font-medium transition-colors relative ${
              topTab === 'expenses'
                ? isDark
                  ? 'text-white'
                  : 'text-[#202124] font-semibold'
                : isDark
                ? 'text-[#8e918f] hover:text-[#c4c7c5]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            Expenses
            {topTab === 'expenses' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${
                  isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setTopTab('all_members')}
            className={`py-2.5 px-6 text-sm font-medium transition-colors relative ${
              topTab === 'all_members'
                ? isDark
                  ? 'text-white'
                  : 'text-[#202124] font-semibold'
                : isDark
                ? 'text-[#8e918f] hover:text-[#c4c7c5]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            All 13 ({simplifiedDebts.length})
            {topTab === 'all_members' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${
                  isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
                }`}
              />
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className={`flex-1 max-w-xl mx-auto w-full px-4 pt-3 ${topTab === 'chat' ? 'pb-24' : 'pb-28'}`}>
        {/* ========================================================================= */}
        {/* TAB 1: GOOGLE PAY GROUP CHAT STREAM (Exact Screenshot: Requested for...) */}
        {/* ========================================================================= */}
        {topTab === 'chat' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {timelineItems.length === 0 ? (
              <div className={`p-12 text-center ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No expenses or chat messages yet.</p>
                <p className="text-xs opacity-75 mt-1">Tap "Split expense" below to start the Ooty group trip!</p>
              </div>
            ) : (
              timelineItems.map((item) => {
                // A. SPLIT EXPENSE CARD
                if (item.type === 'expense' && item.expense) {
                  const exp = item.expense;
                  const prog = getExpenseProgress(exp);
                  const isSentByYou = exp.paidBy === currentUserId;
                  const payerMember = members.find((m) => m.id === exp.paidBy);

                  // CASE 1: Sent by You (Pushkar) -> Right aligned card
                  if (isSentByYou) {
                    return (
                      <div key={item.id} className="flex flex-col items-end my-2.5">
                        <div
                          className={`rounded-2xl p-4 w-72 sm:w-80 shadow-md border ${
                            isDark
                              ? 'bg-[#282a2d] text-[#e3e3e3] border-[#333538]/40'
                              : 'bg-[#e8f0fe] text-[#202124] border-[#d2e3fc]'
                          }`}
                        >
                          <div className={`text-xs font-normal ${isDark ? 'text-[#c4c7c5]' : 'text-[#3c4043]'}`}>
                            Requested for '{exp.title}'
                          </div>
                          <div className="text-3xl font-medium tracking-tight my-1 font-sans">
                            ₹{Math.round(exp.amount).toLocaleString('en-IN')}
                          </div>

                          {/* Member Avatars */}
                          <div className="flex items-center -space-x-1.5 my-2">
                            {exp.splitWith.slice(0, 5).map((mId) => {
                              const m = members.find((x) => x.id === mId);
                              return (
                                <div
                                  key={mId}
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${
                                    isDark ? 'border-[#282a2d]' : 'border-[#e8f0fe]'
                                  }`}
                                  style={{ backgroundColor: m?.avatarColor || '#FF5B42' }}
                                  title={m?.name || mId}
                                >
                                  {m?.name?.charAt(0) || mId.charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                            {exp.splitWith.length > 5 && (
                              <span className={`text-[10px] pl-2 font-mono ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                                +{exp.splitWith.length - 5}
                              </span>
                            )}
                          </div>

                          {/* Blue Progress Bar */}
                          <div className="flex items-center gap-2 my-1.5">
                            <div className={`h-1 rounded-full flex-1 overflow-hidden ${isDark ? 'bg-[#1e1f20]' : 'bg-[#d2e3fc]'}`}>
                              <div
                                className="h-full bg-[#1a73e8] rounded-full transition-all"
                                style={{ width: `${Math.max(8, prog.progressPercent)}%` }}
                              />
                            </div>
                            <span className={`text-xs shrink-0 font-medium ${isDark ? 'text-[#c4c7c5]' : 'text-[#1a73e8]'}`}>
                              {prog.remainingAmount > 0
                                ? `₹${Math.round(prog.remainingAmount).toLocaleString('en-IN')} left`
                                : 'All paid'}
                            </span>
                          </div>

                          {/* Bottom Row: Clock + Status + Chevron + Delete */}
                          <div
                            className={`flex items-center justify-between text-xs pt-1.5 border-t mt-2 ${
                              isDark ? 'border-[#383a3d]/60 text-[#8e918f]' : 'border-[#d2e3fc] text-[#5f6368]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {prog.paidCount} of {prog.totalInvolved} paid • {formatGPayDate(exp.createdAt || exp.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteExpense(exp.id, exp.title)}
                                className="p-1 hover:text-[#ea4335] text-current transition-colors opacity-75 hover:opacity-100"
                                title="Delete split"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className="w-4 h-4 opacity-75" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // CASE 2: Sent by Someone Else -> Left aligned card with sender name & avatar & Pay button
                  return (
                    <div key={item.id} className="flex flex-col items-start my-2.5">
                      {/* Sender Avatar & Name */}
                      <div className="flex items-center gap-2 mb-1.5 pl-1">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: payerMember?.avatarColor || '#802C62' }}
                        >
                          {payerMember?.name.charAt(0)}
                        </div>
                        <span className={`text-xs font-medium ${isDark ? 'text-[#c4c7c5]' : 'text-[#3c4043]'}`}>
                          {payerMember?.name}
                        </span>
                      </div>

                      {/* Card */}
                      <div
                        className={`rounded-2xl p-4 w-72 sm:w-80 shadow-md border ${
                          isDark
                            ? 'bg-[#282a2d] text-[#e3e3e3] border-[#333538]/40'
                            : 'bg-[#ffffff] text-[#202124] border-[#dadce0]'
                        }`}
                      >
                        <div className={`text-xs font-normal ${isDark ? 'text-[#c4c7c5]' : 'text-[#5f6368]'}`}>
                          Split request • {exp.title}
                        </div>
                        <div className="text-3xl font-medium tracking-tight my-1 font-sans">
                          ₹{Math.round(prog.userShare > 0 ? prog.userShare : exp.amount).toLocaleString('en-IN')}
                        </div>

                        {/* Avatars */}
                        <div className="flex items-center -space-x-1.5 my-2">
                          {exp.splitWith.slice(0, 5).map((mId) => {
                            const m = members.find((x) => x.id === mId);
                            return (
                              <div
                                key={mId}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${
                                  isDark ? 'border-[#282a2d]' : 'border-[#ffffff]'
                                }`}
                                style={{ backgroundColor: m?.avatarColor || '#FF5B42' }}
                                title={m?.name || mId}
                              >
                                {m?.name?.charAt(0) || mId.charAt(0).toUpperCase()}
                              </div>
                            );
                          })}
                        </div>

                        {/* Blue Progress Bar */}
                        <div className="flex items-center gap-2 my-1.5">
                          <div className={`h-1 rounded-full flex-1 overflow-hidden ${isDark ? 'bg-[#1e1f20]' : 'bg-[#e8eaed]'}`}>
                            <div
                              className="h-full bg-[#1a73e8] rounded-full transition-all"
                              style={{ width: `${Math.max(8, prog.progressPercent)}%` }}
                            />
                          </div>
                          <span className={`text-xs shrink-0 font-medium ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                            {prog.paidCount}/{prog.totalInvolved} paid
                          </span>
                        </div>

                        {/* Bottom Row */}
                        <div
                          className={`flex items-center justify-between text-xs pt-1.5 border-t mt-2 ${
                            isDark ? 'border-[#383a3d]/60 text-[#8e918f]' : 'border-[#e8eaed] text-[#5f6368]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {prog.isUserPaid ? 'Paid' : 'Unpaid'} • {formatGPayDate(exp.createdAt || exp.date)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-75" />
                        </div>

                        {/* BIG GOOGLE PAY BLUE PAY BUTTON */}
                        {prog.userShare > 0 && !prog.isUserPaid && (
                          <button
                            onClick={() => {
                              setSettlePrefill({
                                fromId: currentUserId,
                                toId: exp.paidBy,
                                amount: Math.round(prog.userShare),
                              });
                              setIsSettleUpOpen(true);
                            }}
                            className="w-full mt-3.5 py-2.5 rounded-full bg-[#0b57d0] hover:bg-[#1a73e8] text-white font-medium text-sm transition-colors text-center active:scale-[0.98] shadow-sm"
                          >
                            Pay ₹{Math.round(prog.userShare).toLocaleString('en-IN')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // B. SETTLEMENT PAYMENT PILL IN CHAT
                if (item.type === 'settlement' && item.settlement) {
                  const set = item.settlement;
                  const fromName = members.find((m) => m.id === set.fromMemberId)?.name || set.fromMemberId;
                  const toName = members.find((m) => m.id === set.toMemberId)?.name || set.toMemberId;

                  return (
                    <div key={item.id} className="flex justify-center my-3">
                      <div
                        className={`px-4 py-2 border rounded-full flex items-center gap-2 text-xs shadow-sm ${
                          isDark
                            ? 'bg-[#1e1f20] border-[#282a2d] text-[#c4c7c5]'
                            : 'bg-[#ffffff] border-[#dadce0] text-[#3c4043]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#34a853] shrink-0" />
                        <span>
                          <strong className="font-semibold text-current">{fromName}</strong> paid ₹{Math.round(set.amount).toLocaleString('en-IN')} to{' '}
                          <strong className="font-semibold text-current">{toName}</strong>
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                          • {formatGPayDate(set.createdAt || set.date)}
                        </span>
                      </div>
                    </div>
                  );
                }

                // C. TEXT MESSAGE IN CHAT
                if (item.type === 'message' && item.message) {
                  const msg = item.message;
                  const isYou = msg.senderId === currentUserId;
                  const sender = members.find((m) => m.id === msg.senderId);

                  if (isYou) {
                    return (
                      <div key={item.id} className="flex flex-col items-end my-1.5">
                        <div
                          className={`text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm shadow-sm break-words ${
                            isDark ? 'bg-[#004a77]' : 'bg-[#0b57d0]'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className={`text-[10px] mt-0.5 pr-1 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                          {formatGPayTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="flex items-start gap-2 my-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 shadow-sm"
                        style={{ backgroundColor: sender?.avatarColor || '#802C62' }}
                      >
                        {sender?.name.charAt(0)}
                      </div>
                      <div className="flex flex-col items-start max-w-[80%]">
                        <span className={`text-[11px] ml-1 mb-0.5 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                          {sender?.name}
                        </span>
                        <div
                          className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm break-words border ${
                            isDark
                              ? 'bg-[#282a2d] text-[#e3e3e3] border-[#333538]/40'
                              : 'bg-[#ffffff] text-[#202124] border-[#dadce0]'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className={`text-[10px] mt-0.5 pl-1 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                          {formatGPayTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
            <div ref={chatScrollRef} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GOOGLE PAY EXPENSES BALANCES OVERVIEW (Matches First Screenshot)   */}
        {/* ========================================================================= */}
        {topTab === 'expenses' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* DUAL BALANCE CARD (Exact Image 1) */}
            <div
              className={`rounded-3xl p-5 border shadow-sm ${
                isDark ? 'bg-[#1e1f20] border-[#2a2b2e]' : 'bg-[#ffffff] border-[#dadce0]'
              }`}
            >
              <div className={`grid grid-cols-2 divide-x ${isDark ? 'divide-[#2e3033]' : 'divide-[#e8eaed]'}`}>
                {/* Left: Owed by you */}
                <div className="pr-4">
                  <div className="text-2xl sm:text-3xl font-medium tracking-tight font-sans">
                    ₹{gpayBalances.owedByYouTotal.toFixed(2)}
                  </div>
                  <div className={`text-xs mt-1 font-normal ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                    Owed by you
                  </div>
                </div>

                {/* Right: Owed to you (Green text) */}
                <div className="pl-5">
                  <div
                    className={`text-2xl sm:text-3xl font-medium tracking-tight font-sans ${
                      isDark ? 'text-[#34a853]' : 'text-[#137333]'
                    }`}
                  >
                    ₹{gpayBalances.owedToYouTotal.toFixed(2)}
                  </div>
                  <div className={`text-xs mt-1 font-normal ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                    Owed to you
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: "Owed by you" */}
            {gpayBalances.owedByYouList.length > 0 && (
              <div>
                <h2 className={`text-xs font-semibold px-1 mb-2 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                  Owed by you
                </h2>
                <div className={`divide-y ${isDark ? 'divide-[#1e1f20]' : 'divide-[#e8eaed]'}`}>
                  {gpayBalances.owedByYouList.map((item) => (
                    <div
                      key={item.member.id}
                      onClick={() => {
                        setSettlePrefill({
                          fromId: currentUserId,
                          toId: item.member.id,
                          amount: Math.round(item.amount),
                        });
                        setIsSettleUpOpen(true);
                      }}
                      className={`py-3.5 px-1 flex items-center justify-between gap-3 cursor-pointer rounded-xl transition-colors ${
                        isDark ? 'hover:bg-[#1e1f20]/60' : 'hover:bg-[#f1f3f4]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                          style={{ backgroundColor: item.member.avatarColor }}
                        >
                          {item.member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.member.name}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                            {item.unpaidExpenseCount} unpaid expense{item.unpaidExpenseCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-medium text-sm shrink-0 font-sans">
                        ₹{item.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: "1 person owes you" */}
            {gpayBalances.owedToYouList.length > 0 && (
              <div>
                <h2 className={`text-xs font-semibold px-1 mb-2 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                  {gpayBalances.owedToYouList.length} {gpayBalances.owedToYouList.length === 1 ? 'person owes' : 'people owe'} you
                </h2>
                <div className={`divide-y ${isDark ? 'divide-[#1e1f20]' : 'divide-[#e8eaed]'}`}>
                  {gpayBalances.owedToYouList.map((item) => (
                    <div
                      key={item.member.id}
                      onClick={() => {
                        setSettlePrefill({
                          fromId: item.member.id,
                          toId: currentUserId,
                          amount: Math.round(item.amount),
                        });
                        setIsSettleUpOpen(true);
                      }}
                      className={`py-3.5 px-1 flex items-center justify-between gap-3 cursor-pointer rounded-xl transition-colors ${
                        isDark ? 'hover:bg-[#1e1f20]/60' : 'hover:bg-[#f1f3f4]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                          style={{ backgroundColor: item.member.avatarColor }}
                        >
                          {item.member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.member.name}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                            {item.unpaidExpenseCount} unpaid expense{item.unpaidExpenseCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-right font-medium text-sm shrink-0 font-sans ${
                          isDark ? 'text-[#34a853]' : 'text-[#137333]'
                        }`}
                      >
                        ₹{item.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: "Settled" */}
            <div>
              <h2 className={`text-xs font-semibold px-1 mb-2 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                Settled
              </h2>
              <div className={`divide-y ${isDark ? 'divide-[#1e1f20]' : 'divide-[#e8eaed]'}`}>
                {gpayBalances.settledList.map((item) => (
                  <div
                    key={item.member.id}
                    className="py-3.5 px-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 opacity-80 shadow-sm"
                        style={{ backgroundColor: item.member.avatarColor }}
                      >
                        {item.member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.member.name}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                          {item.totalExpenseCount > 0 ? `${item.totalExpenseCount} expenses` : 'All settled'}
                        </div>
                      </div>
                    </div>

                    <div className={`text-right font-medium text-sm shrink-0 font-sans ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                      ₹0.00
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ALL 13 MEMBERS BREAKDOWN & TRIP TOTALS                              */}
        {/* ========================================================================= */}
        {topTab === 'all_members' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Trip Spend Summary Card */}
            <div
              className={`p-5 rounded-3xl border shadow-sm ${
                isDark ? 'bg-[#1e1f20] border-[#282a2d]' : 'bg-[#ffffff] border-[#dadce0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>Total Ooty Trip Cost</div>
                  <div className="text-3xl font-medium tracking-tight mt-1 font-sans">
                    ₹{totalTripSpending.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>Per Person (13)</div>
                  <div
                    className={`text-lg font-medium mt-1 font-sans ${
                      isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'
                    }`}
                  >
                    ₹{(totalTripSpending / 13).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Simplified Settlements */}
            <div>
              <h2 className={`text-xs font-semibold px-1 mb-2 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                Direct Settlements Plan ({simplifiedDebts.length})
              </h2>
              {simplifiedDebts.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center text-sm font-medium ${
                    isDark
                      ? 'bg-[#1e1f20] border-[#282a2d] text-[#34a853]'
                      : 'bg-[#ffffff] border-[#dadce0] text-[#137333]'
                  }`}
                >
                  ✨ Everyone is all settled up! Zero debts remaining.
                </div>
              ) : (
                <div className="space-y-2">
                  {simplifiedDebts.map((debt, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                        isDark ? 'bg-[#1e1f20] border-[#282a2d]' : 'bg-[#ffffff] border-[#dadce0]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{debt.fromName}</span>
                        <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>owes</span>
                        <span className={`font-medium ${isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'}`}>
                          {debt.toName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          ₹{debt.amount.toLocaleString('en-IN')}
                        </span>
                        {(debt.from === currentUserId || debt.to === currentUserId) && (
                          <button
                            onClick={() => {
                              setSettlePrefill({
                                fromId: debt.from,
                                toId: debt.to,
                                amount: debt.amount,
                              });
                              setIsSettleUpOpen(true);
                            }}
                            className={`px-3 py-1 rounded-full font-medium text-[11px] ${
                              isDark
                                ? 'bg-[#a8c7fa] text-[#041e49]'
                                : 'bg-[#0b57d0] text-white'
                            }`}
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All 13 Individual Net Positions */}
            <div>
              <h2 className={`text-xs font-semibold px-1 mb-2 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                All 13 Travelers Net Position
              </h2>
              <div
                className={`divide-y border rounded-2xl overflow-hidden px-3 ${
                  isDark ? 'bg-[#1e1f20] border-[#282a2d] divide-[#282a2d]' : 'bg-[#ffffff] border-[#dadce0] divide-[#e8eaed]'
                }`}
              >
                {members.map((m) => {
                  const net = groupBalances[m.id]?.netBalance || 0;
                  return (
                    <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {m.name.charAt(0)}
                        </div>
                        <span className="font-medium">
                          {m.name} {m.id === currentUserId ? '(You)' : ''}
                        </span>
                      </div>
                      <div
                        className={`font-mono font-medium ${
                          net > 0.5
                            ? isDark
                              ? 'text-[#34a853]'
                              : 'text-[#137333]'
                            : net < -0.5
                            ? 'text-[#ea4335]'
                            : isDark
                            ? 'text-[#8e918f]'
                            : 'text-[#5f6368]'
                        }`}
                      >
                        {net > 0.5 ? `+₹${net.toFixed(2)}` : net < -0.5 ? `-₹${Math.abs(net).toFixed(2)}` : '₹0.00'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM BAR (Exact Google Pay UI for Chat vs Expenses)                  */}
      {/* ========================================================================= */}
      {topTab === 'chat' ? (
        // EXACT CHAT BOTTOM BAR (Image 5: Split expense pill + Message... capsule)
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t px-3 py-2.5 max-w-xl mx-auto flex items-center gap-2 transition-colors ${
            isDark ? 'bg-[#000000]/95 border-[#1e1f20]' : 'bg-[#ffffff]/95 border-[#dadce0]'
          }`}
        >
          {/* Split expense pill */}
          <button
            onClick={() => setIsSplitExpenseOpen(true)}
            className={`px-4 py-2.5 rounded-full border font-medium text-xs sm:text-sm shrink-0 active:scale-95 transition-colors ${
              isDark
                ? 'border-[#5e6368] hover:border-white text-white'
                : 'border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124]'
            }`}
          >
            Split expense
          </button>

          {/* Message... input capsule */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`flex-1 flex items-center border rounded-full px-4 py-1.5 transition-colors ${
              isDark
                ? 'bg-[#1e1f20] border-[#333538] focus-within:border-[#a8c7fa]'
                : 'bg-[#f1f3f4] border-[#dadce0] focus-within:border-[#1a73e8]'
            }`}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message..."
              className={`bg-transparent text-sm focus:outline-none flex-1 py-1 ${
                isDark ? 'text-white placeholder-[#8e918f]' : 'text-[#202124] placeholder-[#5f6368]'
              }`}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className={`p-1.5 transition-colors ${
                isDark
                  ? 'text-[#a8c7fa] disabled:text-[#5e6368] hover:text-white'
                  : 'text-[#1a73e8] disabled:text-[#dadce0] hover:text-[#0b57d0]'
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        // EXPENSES FLOATING PILLS (Image 1: Split expense + Settle up)
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <div
            className={`flex items-center gap-3 backdrop-blur-lg p-1.5 rounded-full border shadow-2xl pointer-events-auto transition-colors ${
              isDark ? 'bg-[#000000]/90 border-[#282a2d]' : 'bg-[#ffffff]/90 border-[#dadce0]'
            }`}
          >
            <button
              onClick={() => setIsSplitExpenseOpen(true)}
              className={`px-6 py-2.5 rounded-full border font-medium text-sm transition-colors active:scale-95 ${
                isDark
                  ? 'border-[#5e6368] hover:border-[#8e918f] text-white'
                  : 'border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] bg-white'
              }`}
            >
              Split expense
            </button>

            <button
              onClick={() => {
                setSettlePrefill({});
                setIsSettleUpOpen(true);
              }}
              className={`px-6 py-2.5 rounded-full font-medium text-sm transition-colors active:scale-95 shadow-sm ${
                isDark
                  ? 'bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49]'
                  : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
              }`}
            >
              Settle up
            </button>
          </div>
        </div>
      )}

      {/* 4. GOOGLE PAY SPLIT EXPENSE SCREEN MODAL (Exact Images 2, 3, 4) */}
      <GPaySplitExpenseModal
        isOpen={isSplitExpenseOpen}
        onClose={() => setIsSplitExpenseOpen(false)}
        currentUserId={currentUserId}
        members={members}
      />

      {/* 5. GOOGLE PAY SETTLE UP MODAL */}
      <GPaySettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        defaultFromId={settlePrefill.fromId}
        defaultToId={settlePrefill.toId}
        defaultAmount={settlePrefill.amount}
        members={members}
      />
    </div>
  );
};
