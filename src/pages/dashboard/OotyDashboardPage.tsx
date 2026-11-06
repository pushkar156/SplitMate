import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  OotyExpense,
  OotySettlement,
  OotyMember,
  OOTY_MEMBERS,
  calculateGPayBalancesForUser,
  calculateOotyBalances,
  simplifyOotyDebts,
} from '../../types/ooty';
import {
  subscribeToOotyData,
  deleteOotyExpense,
  SyncStatus,
} from '../../services/ootyDataService';
import { GPaySplitExpenseModal } from '../../components/ooty/GPaySplitExpenseModal';
import { GPaySettleUpModal } from '../../components/ooty/GPaySettleUpModal';
import {
  ArrowLeft,
  MoreVertical,
  Share2,
  Download,
  LogOut,
  Trash2,
  Receipt,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';

export const OotyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [expenses, setExpenses] = useState<OotyExpense[]>([]);
  const [settlements, setSettlements] = useState<OotySettlement[]>([]);
  const [members, setMembers] = useState<OotyMember[]>(OOTY_MEMBERS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isConnected: true, isSyncing: false });

  // Top Tabs: 'expenses' (Balances overview like GPay) | 'activity' (Expenses feed) | 'all_members'
  const [topTab, setTopTab] = useState<'expenses' | 'activity' | 'all_members'>('expenses');

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

  // Subscribe to real-time Ooty data
  useEffect(() => {
    const unsubscribe = subscribeToOotyData((newExpenses, newSettlements, newMembers, newSyncStatus) => {
      setExpenses(newExpenses);
      setSettlements(newSettlements);
      if (newMembers && newMembers.length > 0) {
        setMembers(newMembers);
      }
      setSyncStatus(newSyncStatus);
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

  return (
    <div className="min-h-screen bg-[#000000] text-[#e3e3e3] flex flex-col font-sans select-none pb-28">
      {/* 1. TOP APP BAR (Exact Google Pay Group Header) */}
      <header className="sticky top-0 z-40 bg-[#000000]/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-[#1e1f20]">
        <div className="flex items-center justify-between">
          {/* Left: Back & Group Title with Avatar cluster */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="p-1 -ml-1 text-[#c4c7c5] hover:text-white"
              title="Logout and switch user"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* Google Pay Style 4-avatar cluster */}
            <div className="w-10 h-10 rounded-full bg-[#1e1f20] border border-[#333538] grid grid-cols-2 gap-0.5 p-0.5 overflow-hidden shrink-0">
              {members.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-medium text-base text-white tracking-tight leading-tight">
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
              <div className="text-xs text-[#8e918f] leading-none mt-0.5">
                {members.length} members • <span className="text-[#a8c7fa] font-medium">{user?.name} (You)</span>
              </div>
            </div>
          </div>

          {/* Right: Three Dots Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-[#1e1f20] text-[#c4c7c5] transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Menu Popover */}
            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-[#1e1f20] border border-[#333538] rounded-2xl shadow-2xl py-2 z-50 text-xs text-[#e3e3e3] animate-in fade-in-50">
                <button
                  onClick={handleInstallApp}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#282a2d] flex items-center gap-2.5 text-[#34a853]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install App to Phone</span>
                </button>

                <button
                  onClick={copyWhatsAppSummary}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#282a2d] flex items-center gap-2.5"
                >
                  <Share2 className="w-4 h-4 text-[#a8c7fa]" />
                  <span>WhatsApp Summary</span>
                </button>

                <button
                  onClick={downloadCSV}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#282a2d] flex items-center gap-2.5"
                >
                  <Download className="w-4 h-4 text-[#8e918f]" />
                  <span>Export to CSV</span>
                </button>

                <div className="border-t border-[#282a2d] my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#282a2d] text-[#ff727a] flex items-center gap-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout Device</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TOP TABS: "Expenses" (Active) | "Activity" | "All 13" */}
        <div className="flex items-center justify-around mt-3 border-t border-[#1e1f20] pt-1">
          <button
            onClick={() => setTopTab('expenses')}
            className={`py-2 px-6 text-sm font-medium transition-colors relative ${
              topTab === 'expenses' ? 'text-white' : 'text-[#8e918f] hover:text-[#c4c7c5]'
            }`}
          >
            Expenses
            {topTab === 'expenses' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a8c7fa] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setTopTab('activity')}
            className={`py-2 px-6 text-sm font-medium transition-colors relative ${
              topTab === 'activity' ? 'text-white' : 'text-[#8e918f] hover:text-[#c4c7c5]'
            }`}
          >
            All Activity ({expenses.length})
            {topTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a8c7fa] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setTopTab('all_members')}
            className={`py-2 px-6 text-sm font-medium transition-colors relative ${
              topTab === 'all_members' ? 'text-white' : 'text-[#8e918f] hover:text-[#c4c7c5]'
            }`}
          >
            All 13 ({simplifiedDebts.length})
            {topTab === 'all_members' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a8c7fa] rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 pt-4">
        {/* TAB 1: GOOGLE PAY EXPENSES DASHBOARD (Matches Screenshot 1) */}
        {topTab === 'expenses' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* DUAL BALANCE CARD (Exact Image 1) */}
            <div className="bg-[#1e1f20] border border-[#2a2b2e] rounded-3xl p-5 shadow-sm">
              <div className="grid grid-cols-2 divide-x divide-[#2e3033]">
                {/* Left: Owed by you */}
                <div className="pr-4">
                  <div className="text-2xl sm:text-3xl font-medium tracking-tight text-white font-sans">
                    ₹{gpayBalances.owedByYouTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#8e918f] mt-1 font-normal">
                    Owed by you
                  </div>
                </div>

                {/* Right: Owed to you (Green text #34a853) */}
                <div className="pl-5">
                  <div className="text-2xl sm:text-3xl font-medium tracking-tight text-[#34a853] font-sans">
                    ₹{gpayBalances.owedToYouTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#8e918f] mt-1 font-normal">
                    Owed to you
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: "Owed by you" (Image 1) */}
            {gpayBalances.owedByYouList.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#8e918f] px-1 mb-2">
                  Owed by you
                </h2>
                <div className="divide-y divide-[#1e1f20]">
                  {gpayBalances.owedByYouList.map((item) => (
                    <div
                      key={item.member.id}
                      onClick={() => {
                        setSettlePrefill({
                          fromId: currentUserId,
                          toId: item.member.id,
                          amount: item.amount,
                        });
                        setIsSettleUpOpen(true);
                      }}
                      className="py-3.5 px-1 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#121316] rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: item.member.avatarColor }}
                        >
                          {item.member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.member.name}
                          </div>
                          <div className="text-xs text-[#8e918f]">
                            {item.unpaidExpenseCount} unpaid {item.unpaidExpenseCount === 1 ? 'expense' : 'expenses'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-medium text-sm text-white shrink-0">
                        ₹{item.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: "X person(s) owes you" (Image 1) */}
            {gpayBalances.owedToYouList.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#8e918f] px-1 mb-2">
                  {gpayBalances.owedToYouList.length}{' '}
                  {gpayBalances.owedToYouList.length === 1 ? 'person owes you' : 'people owe you'}
                </h2>
                <div className="divide-y divide-[#1e1f20]">
                  {gpayBalances.owedToYouList.map((item) => (
                    <div
                      key={item.member.id}
                      onClick={() => {
                        setSettlePrefill({
                          fromId: item.member.id,
                          toId: currentUserId,
                          amount: item.amount,
                        });
                        setIsSettleUpOpen(true);
                      }}
                      className="py-3.5 px-1 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#121316] rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: item.member.avatarColor }}
                        >
                          {item.member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.member.name}
                          </div>
                          <div className="text-xs text-[#8e918f]">
                            {item.unpaidExpenseCount} unpaid {item.unpaidExpenseCount === 1 ? 'expense' : 'expenses'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-medium text-sm text-[#34a853] shrink-0">
                        ₹{item.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: "Settled" (Image 1) */}
            <div>
              <h2 className="text-xs font-semibold text-[#8e918f] px-1 mb-2">
                Settled
              </h2>
              <div className="divide-y divide-[#1e1f20]">
                {gpayBalances.settledList.map((item) => (
                  <div
                    key={item.member.id}
                    className="py-3.5 px-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 opacity-80"
                        style={{ backgroundColor: item.member.avatarColor }}
                      >
                        {item.member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {item.member.name}
                        </div>
                        <div className="text-xs text-[#8e918f]">
                          {item.totalExpenseCount > 0 ? `${item.totalExpenseCount} expenses` : 'All settled'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-medium text-sm text-[#8e918f] shrink-0">
                      ₹0.00
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALL ACTIVITY (Expenses Stream) */}
        {topTab === 'activity' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-[#8e918f]">
                <Receipt className="w-12 h-12 mx-auto text-[#333538] mb-3" />
                <p className="text-sm">No expenses recorded yet.</p>
                <button
                  onClick={() => setIsSplitExpenseOpen(true)}
                  className="mt-4 px-5 py-2.5 rounded-full bg-[#1e1f20] hover:bg-[#282a2d] text-white text-xs font-medium"
                >
                  + Split first expense
                </button>
              </div>
            ) : (
              expenses.map((exp) => {
                const payer = members.find((m) => m.id === exp.paidBy);
                const isYou = exp.paidBy === currentUserId;
                const userInvolved = exp.splitWith.includes(currentUserId);
                const userShare = userInvolved ? exp.amount / exp.splitWith.length : 0;

                return (
                  <div
                    key={exp.id}
                    className="p-4 rounded-2xl bg-[#1e1f20] border border-[#2a2b2e] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#2a2b2e] flex items-center justify-center text-[#a8c7fa] shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {exp.title}
                        </div>
                        <div className="text-xs text-[#8e918f] mt-0.5">
                          {isYou ? 'You paid' : `${payer?.name} paid`} • {exp.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          ₹{exp.amount.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[#8e918f]">
                          {isYou ? (
                            <span className="text-[#34a853]">You lent ₹{(exp.amount - userShare).toFixed(2)}</span>
                          ) : userInvolved ? (
                            <span className="text-[#ea4335]">Your share ₹{userShare.toFixed(2)}</span>
                          ) : (
                            'Not involved'
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="p-1.5 text-[#8e918f] hover:text-[#ea4335] transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: ALL 13 MEMBERS & SIMPLIFIED DEBTS */}
        {topTab === 'all_members' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Total trip spend banner */}
            <div className="p-4 rounded-2xl bg-[#1e1f20] border border-[#2a2b2e] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#8e918f]">Total Ooty Trip Spend</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  ₹{totalTripSpending.toLocaleString('en-IN')}
                </div>
              </div>
              <button
                onClick={copyWhatsAppSummary}
                className="px-3.5 py-1.5 rounded-full bg-[#2a2b2e] hover:bg-[#333538] text-xs text-[#a8c7fa] font-medium flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Summary</span>
              </button>
            </div>

            {/* Simplified settlements */}
            <div>
              <h3 className="text-xs font-semibold text-[#8e918f] px-1 mb-2">
                Simplified Settlements ({simplifiedDebts.length})
              </h3>
              {simplifiedDebts.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#1e1f20] text-center text-xs text-[#8e918f]">
                  Everyone in Ooty is settled up!
                </div>
              ) : (
                <div className="space-y-2">
                  {simplifiedDebts.map((debt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#1e1f20] border border-[#2a2b2e] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{debt.fromName}</span>
                        <span className="text-[#8e918f]">pays</span>
                        <span className="font-semibold text-white">{debt.toName}</span>
                      </div>
                      <div className="font-mono font-bold text-[#a8c7fa]">
                        ₹{debt.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 13 Members Table */}
            <div>
              <h3 className="text-xs font-semibold text-[#8e918f] px-1 mb-2">
                13 Travelers Balances
              </h3>
              <div className="rounded-2xl bg-[#1e1f20] border border-[#2a2b2e] overflow-hidden">
                <div className="divide-y divide-[#282a2d]">
                  {members.map((m) => {
                    const b = groupBalances[m.id];
                    const net = b ? b.netBalance : 0;
                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                            style={{ backgroundColor: m.avatarColor }}
                          >
                            {m.name.charAt(0)}
                          </div>
                          <span className="font-medium text-white">
                            {m.name} {m.id === currentUserId ? '(You)' : ''}
                          </span>
                        </div>
                        <div
                          className={`font-mono font-medium ${
                            net > 0.5
                              ? 'text-[#34a853]'
                              : net < -0.5
                              ? 'text-[#ea4335]'
                              : 'text-[#8e918f]'
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
          </div>
        )}
      </main>

      {/* 3. FLOATING BOTTOM ACTION BAR (Exact Google Pay Pill Buttons from Image 1) */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-3 bg-[#000000]/90 backdrop-blur-lg p-1.5 rounded-full border border-[#282a2d] shadow-2xl pointer-events-auto">
          {/* Split expense pill */}
          <button
            onClick={() => setIsSplitExpenseOpen(true)}
            className="px-6 py-2.5 rounded-full border border-[#5e6368] hover:border-[#8e918f] text-white font-medium text-sm transition-colors active:scale-95"
          >
            Split expense
          </button>

          {/* Settle up pill */}
          <button
            onClick={() => {
              setSettlePrefill({});
              setIsSettleUpOpen(true);
            }}
            className="px-6 py-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49] font-medium text-sm transition-colors active:scale-95 shadow-sm"
          >
            Settle up
          </button>
        </div>
      </div>

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
