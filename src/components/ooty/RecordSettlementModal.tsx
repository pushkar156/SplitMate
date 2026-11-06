import React, { useState, useEffect } from 'react';
import { OOTY_MEMBERS, OotyMember } from '../../types/ooty';
import { addOotySettlement } from '../../services/ootyDataService';
import { X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: number;
  members?: OotyMember[];
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  isOpen,
  onClose,
  defaultFromId,
  defaultToId,
  defaultAmount,
  members = OOTY_MEMBERS,
}) => {
  const activeMembers = members.length > 0 ? members : OOTY_MEMBERS;
  const [fromId, setFromId] = useState(defaultFromId || 'pushkar');
  const [toId, setToId] = useState(defaultToId || 'jitendra');
  const [amount, setAmount] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('UPI / GPay payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultFromId) setFromId(defaultFromId);
    if (defaultToId) setToId(defaultToId);
    if (defaultAmount) setAmount(defaultAmount.toString());
  }, [defaultFromId, defaultToId, defaultAmount, isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fromId === toId) {
      toast.error('Sender and receiver cannot be the same person');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid settlement amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOotySettlement({
        fromMemberId: fromId,
        toMemberId: toId,
        amount: numAmount,
        date,
        note: note.trim() || undefined,
      });

      const fromName = OOTY_MEMBERS.find((m) => m.id === fromId)?.name;
      const toName = OOTY_MEMBERS.find((m) => m.id === toId)?.name;
      toast.success(`Recorded: ${fromName} paid ₹${numAmount} to ${toName}! 🤝`);

      onClose();
    } catch (err) {
      toast.error('Failed to record settlement');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromMember = activeMembers.find((m) => m.id === fromId);
  const toMember = activeMembers.find((m) => m.id === toId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-retro-card border-2 border-retro-border rounded-2xl shadow-retro-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-retro-border bg-retro-surface">
          <div>
            <h2 className="text-lg font-bold text-retro-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-retro-teal" />
              Record Settlement
            </h2>
            <p className="text-xs text-retro-text-muted mt-0.5">
              Track a direct payment made between members
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transfer Visualization Card */}
          <div className="p-4 rounded-xl bg-retro-surface border border-retro-border flex items-center justify-between gap-2">
            <div className="text-center flex-1">
              <div
                className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm mb-1"
                style={{ backgroundColor: fromMember?.avatarColor }}
              >
                {fromMember?.name.charAt(0)}
              </div>
              <div className="text-xs font-bold text-retro-text-primary truncate">
                {fromMember?.name}
              </div>
              <div className="text-[10px] text-retro-coral font-medium">Payer (Sent)</div>
            </div>

            <div className="flex flex-col items-center px-2">
              <div className="text-xs font-mono font-bold text-retro-gold mb-1">
                {numAmount > 0 ? `₹${numAmount}` : '₹0'}
              </div>
              <div className="w-8 h-8 rounded-full bg-retro-plum border border-retro-coral/40 flex items-center justify-center text-retro-gold">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center flex-1">
              <div
                className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm mb-1"
                style={{ backgroundColor: toMember?.avatarColor }}
              >
                {toMember?.name.charAt(0)}
              </div>
              <div className="text-xs font-bold text-retro-text-primary truncate">
                {toMember?.name}
              </div>
              <div className="text-[10px] text-retro-teal font-medium">Receiver (Got)</div>
            </div>
          </div>

          {/* From & To Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Who Paid?
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2 text-retro-text-primary text-xs font-medium focus:outline-none focus:border-retro-coral cursor-pointer"
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-retro-surface">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Paid To?
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2 text-retro-text-primary text-xs font-medium focus:outline-none focus:border-retro-coral cursor-pointer"
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-retro-surface">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
              Settlement Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-retro-gold font-bold">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl pl-8 pr-4 py-2.5 text-retro-text-primary font-mono text-sm focus:outline-none focus:border-retro-coral transition-colors"
              />
            </div>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2 text-retro-text-primary text-xs focus:outline-none focus:border-retro-coral cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Payment Mode / Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. GPay, PhonePe, Cash"
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2 text-retro-text-primary text-xs focus:outline-none focus:border-retro-coral"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-retro-surface hover:bg-retro-surface/80 text-retro-text-primary font-semibold text-xs border border-retro-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-retro-teal hover:bg-retro-teal/90 text-white font-bold text-xs tracking-wide shadow-retro-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
