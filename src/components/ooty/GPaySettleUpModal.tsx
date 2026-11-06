import React, { useState, useEffect } from 'react';
import { OotyMember, OOTY_MEMBERS } from '../../types/ooty';
import { addOotySettlement } from '../../services/ootyDataService';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface GPaySettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: number;
  members?: OotyMember[];
}

export const GPaySettleUpModal: React.FC<GPaySettleUpModalProps> = ({
  isOpen,
  onClose,
  defaultFromId,
  defaultToId,
  defaultAmount,
  members = OOTY_MEMBERS,
}) => {
  const { isDark } = useTheme();
  const activeMembers = members.length > 0 ? members : OOTY_MEMBERS;
  const [fromId, setFromId] = useState(defaultFromId || 'pushkar');
  const [toId, setToId] = useState(defaultToId || 'jitendra');
  const [amountStr, setAmountStr] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [note, setNote] = useState('UPI / GPay payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultFromId) setFromId(defaultFromId);
    if (defaultToId) setToId(defaultToId);
    if (defaultAmount) setAmountStr(defaultAmount.toString());
  }, [defaultFromId, defaultToId, defaultAmount, isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amountStr) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fromId === toId) {
      toast.error('Payer and receiver cannot be the same person');
      return;
    }

    if (numAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOotySettlement({
        fromMemberId: fromId,
        toMemberId: toId,
        amount: numAmount,
        date: new Date().toISOString().split('T')[0],
        note: note.trim() || 'Google Pay settlement',
      });

      const fromName = activeMembers.find((m) => m.id === fromId)?.name;
      const toName = activeMembers.find((m) => m.id === toId)?.name;
      toast.success(`Settled: ${fromName} paid ₹${numAmount} to ${toName}! 🤝`);

      onClose();
    } catch (err: any) {
      toast.error('Failed to record settlement: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromMember = activeMembers.find((m) => m.id === fromId);
  const toMember = activeMembers.find((m) => m.id === toId);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200 transition-colors ${
        isDark ? 'bg-[#000000] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#202124]'
      }`}
    >
      {/* 1. TOP APP BAR */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className={`p-2 -ml-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-[#1f1f1f] text-[#c4c7c5]' : 'hover:bg-[#f1f3f4] text-[#5f6368]'
          }`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className={`text-xs font-medium tracking-wide ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
          Settle up payment
        </span>
        <div className="w-6" />
      </div>

      {/* 2. BODY CONTENT */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-6">
        <div>
          {/* User Transfer Bubbles */}
          <div className="flex items-center justify-center gap-4 my-6">
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

            {/* Transfer Arrow */}
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

          {/* Amount Display / Input */}
          <div className="flex items-center justify-center my-6">
            <span className={`text-4xl sm:text-5xl font-light mr-2 ${isDark ? 'text-[#c4c7c5]' : 'text-[#5f6368]'}`}>
              ₹
            </span>
            <input
              type="number"
              autoFocus
              min="1"
              max="1000000"
              value={amountStr}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (Number(val) >= 0 && Number(val) <= 10000000)) {
                  setAmountStr(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                  e.preventDefault();
                }
              }}
              placeholder="0"
              className="w-48 sm:w-64 bg-transparent text-5xl sm:text-6xl font-normal text-current focus:outline-none text-left tracking-tight border-none appearance-none"
            />
          </div>

          {/* Switch Users Dropdown Row */}
          <div
            className={`border rounded-2xl p-4 space-y-3 max-w-md mx-auto shadow-sm ${
              isDark ? 'bg-[#1e1f20] border-[#282a2d]' : 'bg-[#f8f9fa] border-[#dadce0]'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>Who paid:</span>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className={`bg-transparent font-medium focus:outline-none cursor-pointer ${
                  isDark ? 'text-white' : 'text-[#202124]'
                }`}
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id} className={isDark ? 'bg-[#1e1f20] text-white' : 'bg-white text-black'}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`border-t ${isDark ? 'border-[#282a2d]' : 'border-[#e8eaed]'}`} />

            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>Paid to:</span>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className={`bg-transparent font-medium focus:outline-none cursor-pointer ${
                  isDark ? 'text-white' : 'text-[#202124]'
                }`}
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id} className={isDark ? 'bg-[#1e1f20] text-white' : 'bg-white text-black'}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`border-t ${isDark ? 'border-[#282a2d]' : 'border-[#e8eaed]'}`} />

            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>Payment note:</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="UPI, GPay, Cash"
                className={`bg-transparent font-medium focus:outline-none text-right ${
                  isDark ? 'text-white' : 'text-[#202124]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 3. BOTTOM STICKY BUTTON */}
        <div className="pt-6 shrink-0">
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
    </div>
  );
};
