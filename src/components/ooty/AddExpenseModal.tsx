import React, { useState } from 'react';
import { OotyCategory, OOTY_CATEGORIES, OOTY_MEMBERS } from '../../types/ooty';
import { addOotyExpense } from '../../services/ootyDataService';
import { X, Check, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<OotyCategory>('Food & Drinks');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>(
    OOTY_MEMBERS.map((m) => m.id)
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const splitCount = selectedSplitIds.length;
  const perPersonShare = splitCount > 0 ? (numAmount / splitCount).toFixed(2) : '0.00';

  const toggleMember = (id: string) => {
    if (selectedSplitIds.includes(id)) {
      if (selectedSplitIds.length === 1) {
        toast.error('At least one person must share this expense');
        return;
      }
      setSelectedSplitIds(selectedSplitIds.filter((mId) => mId !== id));
    } else {
      setSelectedSplitIds([...selectedSplitIds, id]);
    }
  };

  const selectAll = () => setSelectedSplitIds(OOTY_MEMBERS.map((m) => m.id));
  const deselectAll = () => setSelectedSplitIds([paidBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter an expense description');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (selectedSplitIds.length === 0) {
      toast.error('Please select at least one person to split with');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOotyExpense({
        title: title.trim(),
        amount: numAmount,
        category,
        date,
        paidBy,
        splitWith: selectedSplitIds,
        notes: notes.trim() || undefined,
        createdBy: currentUserId,
      });

      toast.success('Expense added successfully! 🌲');
      // Reset form
      setTitle('');
      setAmount('');
      setNotes('');
      setSelectedSplitIds(OOTY_MEMBERS.map((m) => m.id));
      onClose();
    } catch (err) {
      toast.error('Failed to add expense');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-retro-card border-2 border-retro-border rounded-2xl shadow-retro-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-retro-border bg-retro-surface">
          <div>
            <h2 className="text-lg font-bold text-retro-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-retro-coral" />
              Add Trip Expense
            </h2>
            <p className="text-xs text-retro-text-muted mt-0.5">
              Record a new expense for the 13 travelers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-retro-text-muted hover:text-retro-text-primary hover:bg-retro-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
              Expense Description *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dinner at Earl's Secret, Jeep Safari, Cottage Stay"
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-4 py-2.5 text-retro-text-primary text-sm focus:outline-none focus:border-retro-coral transition-colors"
              />
            </div>
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Total Amount (₹) *
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OotyCategory)}
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2.5 text-retro-text-primary text-sm focus:outline-none focus:border-retro-coral transition-colors cursor-pointer"
              >
                {OOTY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-retro-surface">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid By & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Who Paid? *
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2.5 text-retro-text-primary text-sm font-medium focus:outline-none focus:border-retro-coral transition-colors cursor-pointer"
              >
                {OOTY_MEMBERS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-retro-surface">
                    {m.name} {m.id === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-3 py-2.5 text-retro-text-primary text-sm focus:outline-none focus:border-retro-coral transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Split with Section */}
          <div className="pt-2 border-t border-retro-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-retro-text-muted flex items-center gap-1.5">
                <Users className="w-4 h-4 text-retro-coral" />
                <span>Split With ({splitCount} of 13 people)</span>
              </label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-retro-coral hover:underline font-semibold"
                >
                  All 13
                </button>
                <span className="text-retro-text-muted">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-retro-text-muted hover:text-retro-text-primary font-semibold"
                >
                  Only Payer
                </button>
              </div>
            </div>

            {/* Split Calculation Preview Pill */}
            {numAmount > 0 && splitCount > 0 && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-retro-surface border border-retro-gold/30 flex items-center justify-between text-xs">
                <span className="text-retro-text-muted">Per Person Share:</span>
                <span className="font-mono font-bold text-retro-gold text-sm">
                  ₹{perPersonShare}
                </span>
              </div>
            )}

            {/* 13 Members Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OOTY_MEMBERS.map((m) => {
                const isSelected = selectedSplitIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-retro-coral/15 border-retro-coral text-retro-text-primary font-semibold'
                        : 'bg-retro-surface/50 border-retro-border text-retro-text-muted opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-retro-coral text-white' : 'border border-retro-text-muted'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs truncate">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via GPay, bill in glove compartment"
              className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-4 py-2 text-retro-text-primary text-xs focus:outline-none focus:border-retro-coral transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-3">
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-retro-coral hover:bg-retro-coral/90 text-white font-bold text-xs tracking-wide shadow-retro-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
