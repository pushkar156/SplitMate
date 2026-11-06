import React, { useState, useEffect } from 'react';
import { OotyMember, OOTY_MEMBERS, PairwiseBalanceItem } from '../../types/ooty';
import { addOotySettlement } from '../../services/ootyDataService';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, ArrowRight, MoreVertical, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface GPaySettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: number;
  members?: OotyMember[];
  owedByYouList?: PairwiseBalanceItem[];
}

type SettleStep = 'choose' | 'confirm';

export const GPaySettleUpModal: React.FC<GPaySettleUpModalProps> = ({
  isOpen,
  onClose,
  currentUserId = 'pushkar',
  defaultFromId,
  defaultToId,
  defaultAmount,
  members = OOTY_MEMBERS,
  owedByYouList = [],
}) => {
  const { isDark } = useTheme();
  const activeMembers = members.length > 0 ? members : OOTY_MEMBERS;

  const [step, setStep] = useState<SettleStep>('choose');
  const [toId, setToId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('Settlement');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state whenever modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      if (defaultToId) {
        setToId(defaultToId);
        setAmountStr(defaultAmount ? defaultAmount.toString() : '');
        setStep('confirm');
      } else {
        setToId('');
        setAmountStr('');
        setStep('choose');
      }
      setNote('Settlement');
      setIsSubmitting(false);
    }
  }, [isOpen, defaultToId, defaultAmount]);

  if (!isOpen) return null;

  // Filter list of members the current user actually owes money to
  const settlingList = owedByYouList.filter((item) => item.amount > 0);

  const handleSelectMember = (memberId: string, amount: number) => {
    setToId(memberId);
    setAmountStr(amount.toFixed(2));
    setStep('confirm');
  };

  const numAmount = parseFloat(amountStr) || 0;
  const toMember = activeMembers.find((m) => m.id === toId);
  const fromMember = activeMembers.find((m) => m.id === (defaultFromId || currentUserId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toId) {
      toast.error('Please select who you are paying');
      return;
    }

    if (numAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOotySettlement({
        fromMemberId: defaultFromId || currentUserId,
        toMemberId: toId,
        amount: numAmount,
        date: new Date().toISOString().split('T')[0],
        note: note.trim() || 'Settlement',
      });

      const toName = toMember?.name || toId;
      toast.success(`Settled: You paid ₹${numAmount.toLocaleString('en-IN')} to ${toName}! 🤝`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to record settlement: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200 transition-colors select-none ${
        isDark ? 'bg-[#000000] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#202124]'
      }`}
    >
      {/* ========================================================================= */}
      {/* STEP 1: CHOOSE WHO YOU'RE SETTLING WITH (Exact Match to Image 2)          */}
      {/* ========================================================================= */}
      {step === 'choose' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`p-2 -ml-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-[#1f1f1f] text-[#c4c7c5]' : 'hover:bg-[#f1f3f4] text-[#5f6368]'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className={`p-2 -mr-2 rounded-full ${isDark ? 'text-[#c4c7c5]' : 'text-[#5f6368]'}`}>
              <MoreVertical className="w-5 h-5" />
            </div>
          </div>

          {/* Heading */}
          <div className="px-6 pt-2 pb-4 shrink-0">
            <h1 className="text-2xl font-normal tracking-tight font-sans">
              Choose who you're settling with
            </h1>
          </div>

          {/* List or Empty State */}
          <div className="flex-1 overflow-y-auto divide-y divide-current/5">
            {settlingList.length === 0 ? (
              // Empty Celebration State: "you are settled"
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16 my-auto">
                <div className="w-20 h-20 rounded-full bg-[#34a853]/15 text-[#34a853] flex items-center justify-center mb-5 shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-normal tracking-tight mb-2">
                  You are settled
                </h2>
                <p className={`text-sm max-w-xs mb-8 leading-relaxed ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                  You don't owe money to anyone in Ooty Trip 🎉 Everyone is all squared up!
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-8 py-3 rounded-full text-sm font-medium transition-transform active:scale-95 shadow-sm ${
                    isDark
                      ? 'bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49]'
                      : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
                  }`}
                >
                  Back to Group
                </button>
              </div>
            ) : (
              // List of Members you owe money to (Matches Image 2 exactly)
              settlingList.map((item) => (
                <div
                  key={item.member.id}
                  onClick={() => handleSelectMember(item.member.id, item.amount)}
                  className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors active:scale-[0.99] ${
                    isDark ? 'hover:bg-[#1f1f1f] active:bg-[#282a2d]' : 'hover:bg-[#f1f3f4] active:bg-[#e8eaed]'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                      style={{ backgroundColor: item.member.avatarColor || '#802C62' }}
                    >
                      {item.member.name.charAt(0)}
                    </div>
                    <span className="text-base font-normal text-current truncate">
                      {item.member.name}
                    </span>
                  </div>

                  <span className="font-mono text-base font-medium text-current shrink-0">
                    ₹{item.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CONFIRM PAYMENT & RECORD SETTLEMENT                               */}
      {/* ========================================================================= */}
      {step === 'confirm' && (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (defaultToId) {
                  onClose();
                } else {
                  setStep('choose');
                }
              }}
              className={`p-2 -ml-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-[#1f1f1f] text-[#c4c7c5]' : 'hover:bg-[#f1f3f4] text-[#5f6368]'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className={`text-xs font-medium tracking-wide ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
              Record payment
            </span>
            <div className="w-6" />
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col justify-center px-6 py-4">
            {/* Transfer Visual */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {/* From User */}
              <div className="flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md mb-2"
                  style={{ backgroundColor: fromMember?.avatarColor || '#FF5B42' }}
                >
                  {fromMember?.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-current">{fromMember?.name}</span>
                <span className={`text-[11px] ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>Paying</span>
              </div>

              {/* Arrow */}
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-sm ${
                  isDark ? 'bg-[#1e1f20] border-[#333538] text-[#a8c7fa]' : 'bg-[#f1f3f4] border-[#dadce0] text-[#1a73e8]'
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </div>

              {/* To User */}
              <div className="flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md mb-2"
                  style={{ backgroundColor: toMember?.avatarColor || '#802C62' }}
                >
                  {toMember?.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-current">{toMember?.name}</span>
                <span className={`text-[11px] font-medium ${isDark ? 'text-[#34a853]' : 'text-[#137333]'}`}>
                  Receiving
                </span>
              </div>
            </div>

            {/* Giant Centered Amount */}
            <div className="flex items-center justify-center font-display tracking-tight font-normal mb-6 w-full">
              <span className={`text-4xl sm:text-5xl font-light mr-1.5 select-none ${isDark ? 'text-[#c4c7c5]' : 'text-[#5f6368]'}`}>
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={amountStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  if (parts.length > 2) return;
                  if (val === '' || Number(val) <= 10000000) {
                    setAmountStr(val);
                  }
                }}
                placeholder="0"
                style={{
                  width: `${Math.max(1, amountStr.length || 1) * 38 + 10}px`,
                  minWidth: '55px',
                  maxWidth: '75vw',
                }}
                className="bg-transparent text-5xl sm:text-6xl font-normal text-current focus:outline-none text-left tracking-tight border-none appearance-none p-0 m-0"
              />
            </div>

            {/* Note Input */}
            <div
              className={`border rounded-2xl p-3.5 max-w-sm mx-auto w-full shadow-sm flex items-center justify-between text-xs ${
                isDark ? 'bg-[#1e1f20] border-[#282a2d]' : 'bg-[#f8f9fa] border-[#dadce0]'
              }`}
            >
              <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>Payment note:</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Settlement"
                className={`bg-transparent font-medium focus:outline-none text-right flex-1 ml-2 ${
                  isDark ? 'text-white' : 'text-[#202124]'
                }`}
              />
            </div>
          </div>

          {/* Bottom Button */}
          <div className={`p-4 border-t shrink-0 ${isDark ? 'bg-[#000000] border-[#1e1f20]' : 'bg-[#ffffff] border-[#e8eaed]'}`}>
            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0}
              className={`w-full py-4 rounded-full font-medium text-sm tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49]'
                  : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
              }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Record payment (₹{numAmount.toLocaleString('en-IN')})</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
