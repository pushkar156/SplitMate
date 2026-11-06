import React, { useState } from 'react';
import {
  OotyMember,
  OotyExpense,
  OotySettlement,
  getGPayPairwiseDetails,
} from '../../types/ooty';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowLeft,
  MoreVertical,
  Check,
  CheckCircle2,
  Receipt,
  Trash2,
} from 'lucide-react';

interface GPayMemberExpensesViewProps {
  currentUserId: string;
  member: OotyMember;
  expenses: OotyExpense[];
  settlements: OotySettlement[];
  onBack: () => void;
  onSettleUp: (toId: string, amount: number) => void;
  onSplitExpense: () => void;
  onDeleteExpense?: (exp: OotyExpense) => void;
}

// Helper to format date matching Google Pay (e.g. "2 Nov", "18 Oct")
function formatGPayItemDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return isoString;
  }
}

export const GPayMemberExpensesView: React.FC<GPayMemberExpensesViewProps> = ({
  currentUserId,
  member,
  expenses,
  settlements,
  onBack,
  onSettleUp,
  onSplitExpense,
  onDeleteExpense,
}) => {
  const { isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<'unpaid' | 'paid'>('unpaid');
  const [showMenu, setShowMenu] = useState(false);

  // Compute pairwise details between current user and this member
  const details = getGPayPairwiseDetails(currentUserId, member, expenses, settlements);

  const youOwe = details.roundedNet < -0.5;
  const theyOwe = details.roundedNet > 0.5;
  const netAmount = Math.abs(details.roundedNet);

  return (
    <div
      className={`min-h-[85vh] flex flex-col animate-in fade-in duration-200 ${
        isDark ? 'bg-black text-[#e3e3e3]' : 'bg-[#ffffff] text-[#1f1f1f]'
      }`}
    >
      {/* 1. TOP APP BAR (Back Arrow + Menu) */}
      <div className="flex items-center justify-between py-2 px-1 -mx-2">
        <button
          type="button"
          onClick={onBack}
          className={`p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-[#1e1f20] text-white' : 'hover:bg-[#f1f3f4] text-[#1f1f1f]'
          }`}
          title="Back to Expenses"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-[#1e1f20] text-white' : 'hover:bg-[#f1f3f4] text-[#1f1f1f]'
            }`}
            title="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              className={`absolute right-0 mt-1 w-48 rounded-2xl shadow-xl border py-1.5 z-30 animate-in fade-in duration-100 ${
                isDark ? 'bg-[#282a2d] border-[#383a3d] text-white' : 'bg-white border-[#e0e0e0] text-[#1f1f1f]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onSettleUp(member.id, netAmount);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  isDark ? 'hover:bg-[#383a3d]' : 'hover:bg-[#f8f9fa]'
                }`}
              >
                Record payment / Settle
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onSplitExpense();
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  isDark ? 'hover:bg-[#383a3d]' : 'hover:bg-[#f8f9fa]'
                }`}
              >
                Split an expense
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTERED MEMBER SUMMARY & NET AMOUNT */}
      <div className="flex flex-col items-center justify-center pt-2 pb-6 text-center">
        {/* Large Avatar */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-md"
          style={{ backgroundColor: member.avatarColor }}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Status Text (You owe X / X owes you / Settled up with X) */}
        <div
          className={`text-sm font-medium mt-3.5 tracking-normal ${
            isDark ? 'text-[#c4c7c5]' : 'text-[#444746]'
          }`}
        >
          {details.statusText}
        </div>

        {/* Big Amount */}
        <div
          className={`text-4xl font-normal tracking-tight font-sans mt-1.5 ${
            theyOwe
              ? isDark
                ? 'text-[#81c995]'
                : 'text-[#188038]'
              : isDark
              ? 'text-white'
              : 'text-[#1f1f1f]'
          }`}
        >
          ₹{netAmount.toFixed(2)}
        </div>
      </div>

      {/* 3. FILTER PILLS (Unpaid | Paid) */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveFilter('unpaid')}
          className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'unpaid'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : isDark
              ? 'bg-[#282a2d] text-[#c4c7c5] hover:text-white'
              : 'bg-[#f1f3f4] text-[#3c4043] hover:text-black border border-[#dadce0]'
          }`}
        >
          Unpaid
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('paid')}
          className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'paid'
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : isDark
              ? 'bg-[#282a2d] text-[#c4c7c5] hover:text-white'
              : 'bg-[#f1f3f4] text-[#3c4043] hover:text-black border border-[#dadce0]'
          }`}
        >
          Paid
        </button>
      </div>

      {/* 4. EXPENSE & SETTLEMENT ITEMS LIST */}
      <div className="flex-1 pb-24 space-y-1">
        {activeFilter === 'unpaid' && (
          <>
            {details.unpaidExpenses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                    isDark ? 'bg-[#137333]/20 text-[#81c995]' : 'bg-[#e6f4ea] text-[#137333]'
                  }`}
                >
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="text-base font-semibold">You're all settled up!</div>
                <div
                  className={`text-xs mt-1 max-w-xs ${
                    isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                  }`}
                >
                  No unpaid expenses between you and {member.name}.
                </div>
              </div>
            ) : (
              details.unpaidExpenses.map((item) => (
                <div
                  key={item.id}
                  className={`py-3 px-2 flex items-center justify-between gap-3 rounded-2xl transition-colors ${
                    isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-[#f8f9fa]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Google Pay Blue checkmark split icon */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-[#1b3d68] text-[#8ab4f8]' : 'bg-[#d3e3fd] text-[#0b57d0]'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.title}
                      </div>
                      <div
                        className={`text-xs mt-0.5 truncate ${
                          isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                        }`}
                      >
                        {formatGPayItemDate(item.createdAt || item.date)} •{' '}
                        {item.isRequestedByYou ? 'Requested by you' : `Requested by ${member.name}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`font-sans font-medium text-sm sm:text-base ${
                        item.isRequestedByYou
                          ? isDark
                            ? 'text-[#81c995]'
                            : 'text-[#188038]'
                          : isDark
                          ? 'text-[#e3e3e3]'
                          : 'text-[#1f1f1f]'
                      }`}
                    >
                      ₹{item.share.toFixed(2)}
                    </div>

                    {onDeleteExpense &&
                      (currentUserId === 'pushkar' ||
                        item.originalExpense.paidBy === currentUserId ||
                        item.originalExpense.createdBy === currentUserId) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteExpense(item.originalExpense);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-70 hover:opacity-100"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeFilter === 'paid' && (
          <>
            {details.paidExpenses.length === 0 && details.settlements.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                    isDark ? 'bg-[#282a2d] text-[#8e918f]' : 'bg-[#f1f3f4] text-[#5f6368]'
                  }`}
                >
                  <Receipt className="w-8 h-8" />
                </div>
                <div className="text-base font-semibold">No settled expenses yet</div>
                <div
                  className={`text-xs mt-1 max-w-xs ${
                    isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                  }`}
                >
                  Paid expenses and settlements with {member.name} will appear here.
                </div>
              </div>
            ) : (
              <>
                {/* 1. Paid / Settled Expenses */}
                {details.paidExpenses.map((item) => (
                  <div
                    key={item.id}
                    className={`py-3 px-2 flex items-center justify-between gap-3 rounded-2xl transition-colors ${
                      isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-[#137333]/25 text-[#81c995]' : 'bg-[#e6f4ea] text-[#137333]'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.title}
                        </div>
                        <div
                          className={`text-xs mt-0.5 truncate ${
                            isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                          }`}
                        >
                          {formatGPayItemDate(item.createdAt || item.date)} •{' '}
                          {item.isRequestedByYou ? 'Paid by you' : `Paid to ${member.name}`} • Settled
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-sans font-medium text-sm sm:text-base shrink-0 ${
                        isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                      }`}
                    >
                      ₹{item.share.toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* 2. Direct Settlement Payments */}
                {details.settlements.map((s) => (
                  <div
                    key={s.id}
                    className={`py-3 px-2 flex items-center justify-between gap-3 rounded-2xl transition-colors ${
                      isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-[#1a73e8]/25 text-[#8ab4f8]' : 'bg-[#d3e3fd] text-[#0b57d0]'
                        }`}
                      >
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {s.isPaidByYou ? `Payment to ${member.name}` : `Payment from ${member.name}`}
                        </div>
                        <div
                          className={`text-xs mt-0.5 truncate ${
                            isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                          }`}
                        >
                          {formatGPayItemDate(s.createdAt || s.date)} • Settled via SplitMate
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-sans font-medium text-sm sm:text-base shrink-0 ${
                        isDark ? 'text-[#81c995]' : 'text-[#188038]'
                      }`}
                    >
                      ₹{s.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* 5. STICKY BOTTOM ACTION BUTTON (Exact Google Pay pill: "Pay ₹47.50") */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-xl mx-auto z-20 pointer-events-none">
        <div className="pointer-events-auto">
          {youOwe ? (
            <button
              type="button"
              onClick={() => onSettleUp(member.id, netAmount)}
              className={`w-full py-3.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] shadow-lg ${
                isDark
                  ? 'bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49]'
                  : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
              }`}
            >
              Pay ₹{netAmount.toFixed(2)}
            </button>
          ) : theyOwe ? (
            <button
              type="button"
              onClick={() => onSettleUp(member.id, netAmount)}
              className={`w-full py-3.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] shadow-lg ${
                isDark
                  ? 'bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49]'
                  : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
              }`}
            >
              Settle up (₹{netAmount.toFixed(2)})
            </button>
          ) : (
            <button
              type="button"
              onClick={onSplitExpense}
              className={`w-full py-3.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] border shadow-sm ${
                isDark
                  ? 'bg-[#282a2d] hover:bg-[#333538] text-[#e3e3e3] border-[#3c4043]'
                  : 'bg-white hover:bg-gray-50 text-[#1f1f1f] border-[#dadce0]'
              }`}
            >
              Split an expense with {member.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
