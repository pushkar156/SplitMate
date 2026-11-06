import React, { useState } from 'react';
import { OotyExpense, OotyMember, OotySettlement, roundToTwoDecimals, formatCurrency } from '../../types/ooty';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';

interface GPayExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: OotyExpense | null;
  currentUserId: string;
  isAdmin?: boolean;
  members: OotyMember[];
  settlements: OotySettlement[];
  onPay: (toId: string, amount: number) => void;
  onDelete?: (exp: OotyExpense) => void;
}

export const GPayExpenseDetailsModal: React.FC<GPayExpenseDetailsModalProps> = ({
  isOpen,
  onClose,
  expense,
  currentUserId,
  isAdmin = false,
  members,
  settlements,
  onPay,
  onDelete,
}) => {
  const { isDark } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  if (!isOpen || !expense) return null;

  const payer = members.find((m) => m.id === expense.paidBy);
  const payerName = payer?.name || expense.paidBy;
  const isPayer = expense.paidBy === currentUserId;

  const totalInvolved = expense.splitWith.length || 1;
  const defaultShare = roundToTwoDecimals(expense.amount / totalInvolved);

  const userInvolved = expense.splitWith.includes(currentUserId);
  const userShare = userInvolved
    ? roundToTwoDecimals(expense.splitDetails?.[currentUserId] ?? defaultShare)
    : 0;

  // Track participants and paid status
  let paidCount = 0;
  const rawList = expense.splitWith.map((mId) => {
    const member = members.find((m) => m.id === mId) || {
      id: mId,
      name: mId,
      avatarColor: '#FF5B42',
    };
    const share = roundToTwoDecimals(expense.splitDetails?.[mId] ?? defaultShare);
    const isThisPayer = mId === expense.paidBy;

    // A participant is settled if they are the payer or have a recorded settlement
    const hasSettled =
      isThisPayer ||
      settlements.some(
        (s) =>
          s.fromMemberId === mId &&
          s.toMemberId === expense.paidBy &&
          s.amount >= share * 0.95
      );

    if (hasSettled) paidCount++;

    return {
      member,
      share,
      isThisPayer,
      hasSettled,
      isYou: mId === currentUserId,
    };
  });

  // Sort list: "You" first, then other members, payer with "Sent this request"
  const sortedParticipants = [...rawList].sort((a, b) => {
    if (a.isYou) return -1;
    if (b.isYou) return 1;
    if (a.isThisPayer) return 1;
    if (b.isThisPayer) return -1;
    return a.member.name.localeCompare(b.member.name);
  });

  const isUserPaid =
    isPayer ||
    !userInvolved ||
    settlements.some(
      (s) =>
        s.fromMemberId === currentUserId &&
        s.toMemberId === expense.paidBy &&
        s.amount >= userShare * 0.95
    );

  const canDelete =
    (isAdmin && currentUserId === 'pushkar') ||
    expense.paidBy === currentUserId ||
    expense.createdBy === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`flex-1 max-w-xl w-full mx-auto flex flex-col h-full overflow-hidden shadow-2xl ${
          isDark ? 'bg-black text-white' : 'bg-white text-[#1f1f1f]'
        }`}
      >
        {/* 1. TOP APP BAR (Back button + Title + Options Menu) */}
        <div className="flex items-center justify-between px-3 py-3 border-b shrink-0 border-transparent">
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-[#1e1f20] text-white' : 'hover:bg-[#f1f3f4] text-[#1f1f1f]'
            }`}
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center font-normal text-sm sm:text-base truncate max-w-[200px]">
            {expense.title}
          </div>

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
                className={`absolute right-0 mt-1 w-44 rounded-2xl shadow-xl border py-1.5 z-30 animate-in fade-in duration-100 ${
                  isDark ? 'bg-[#282a2d] border-[#383a3d] text-white' : 'bg-white border-[#e0e0e0] text-[#1f1f1f]'
                }`}
              >
                {canDelete && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(expense);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#ea4335] hover:bg-[#ea4335]/10 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Split</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowMenu(false)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    isDark ? 'hover:bg-[#383a3d]' : 'hover:bg-[#f8f9fa]'
                  }`}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. CENTERED REQUESTER SECTION (Exact Screenshot 2) */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6 px-4 shrink-0 text-center">
          {/* Avatar of Requester */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-md"
            style={{ backgroundColor: payer?.avatarColor || '#802C62' }}
          >
            {payerName.charAt(0).toUpperCase()}
          </div>

          {/* Subtitle: {Payer} requested ₹{userShare} */}
          <div className="text-xl sm:text-2xl font-normal tracking-tight font-sans mt-3.5">
            {isPayer
              ? `You requested ₹${formatCurrency(expense.amount)}`
              : `${payerName} requested ₹${formatCurrency(userShare > 0 ? userShare : defaultShare)}`}
          </div>
        </div>

        {/* Thin Divider */}
        <div className={`border-b shrink-0 ${isDark ? 'border-[#282a2d]' : 'border-[#e8eaed]'}`} />

        {/* 3. BREAKDOWN STATS BAR (Left: X of Y paid | Right: Total: ₹Z) */}
        <div
          className={`flex items-center justify-between px-5 py-3 text-sm shrink-0 font-sans ${
            isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
          }`}
        >
          <div className="font-medium">
            {paidCount} of {totalInvolved} paid
          </div>
          <div className="font-medium">
            Total: ₹{formatCurrency(expense.amount)}
          </div>
        </div>

        {/* 4. LIST OF PARTICIPANTS (Exact Screenshot 2) */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 divide-y divide-transparent space-y-1">
          {sortedParticipants.map((p) => (
            <div
              key={p.member.id}
              className={`py-3 px-2 flex items-center justify-between gap-3 rounded-2xl transition-colors ${
                isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-[#f8f9fa]'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: p.member.avatarColor }}
                >
                  {p.member.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.isYou ? 'You' : p.member.name}
                  </div>
                  {p.isThisPayer ? (
                    <div
                      className={`text-xs mt-0.5 ${
                        isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                      }`}
                    >
                      Sent this request
                    </div>
                  ) : (
                    <div
                      className={`text-xs mt-0.5 ${
                        p.hasSettled
                          ? isDark
                            ? 'text-[#81c995]'
                            : 'text-[#188038]'
                          : isDark
                          ? 'text-[#8e918f]'
                          : 'text-[#5f6368]'
                      }`}
                    >
                      {p.hasSettled ? 'Paid' : 'Unpaid'}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`text-right font-medium text-sm sm:text-base shrink-0 font-sans ${
                  isDark ? 'text-white' : 'text-[#1f1f1f]'
                }`}
              >
                ₹{formatCurrency(p.share)}
              </div>
            </div>
          ))}
        </div>

        {/* 5. STICKY BOTTOM ACTION BUTTON (Exact Screenshot 2: "Pay ₹114.20") */}
        <div className="fixed bottom-0 left-0 right-0 p-4 max-w-xl mx-auto z-20 pointer-events-none">
          <div className="pointer-events-auto">
            {userInvolved && !isUserPaid && userShare > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onPay(expense.paidBy, roundToTwoDecimals(userShare));
                  onClose();
                }}
                className={`w-full py-3.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] shadow-lg ${
                  isDark
                    ? 'bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49]'
                    : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
                }`}
              >
                Pay ₹{formatCurrency(userShare)}
              </button>
            ) : userInvolved && isUserPaid && !isPayer ? (
              <div
                className={`w-full py-3 rounded-full text-center text-sm font-medium border ${
                  isDark
                    ? 'bg-[#1e1f20] border-[#2e3033] text-[#81c995]'
                    : 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                }`}
              >
                You've paid your share ✓
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-3.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] border shadow-sm ${
                  isDark
                    ? 'bg-[#282a2d] hover:bg-[#333538] text-[#e3e3e3] border-[#3c4043]'
                    : 'bg-white hover:bg-gray-50 text-[#1f1f1f] border-[#dadce0]'
                }`}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

