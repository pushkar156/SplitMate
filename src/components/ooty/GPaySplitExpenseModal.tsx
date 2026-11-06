import React, { useState, useEffect } from 'react';
import {
  OotyMember,
  OOTY_MEMBERS,
  OotyCategory,
  OOTY_CATEGORIES,
} from '../../types/ooty';
import { addOotyExpense } from '../../services/ootyDataService';

import {
  ArrowLeft,
  Users,
  PieChart as PieIcon,
  Check,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface GPaySplitExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  members?: OotyMember[];
}

type SplitMode = 'evenly' | 'amounts' | 'shares' | 'percentage';

export const GPaySplitExpenseModal: React.FC<GPaySplitExpenseModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  members = OOTY_MEMBERS,
}) => {
  const activeMembers = members.length > 0 ? members : OOTY_MEMBERS;

  // Amount & Description
  const [amountStr, setAmountStr] = useState<string>('500');
  const [description, setDescription] = useState<string>('');
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [category, setCategory] = useState<OotyCategory>('Food & Drinks');
  const [paidById, setPaidById] = useState<string>(currentUserId);

  // Active Split Mode: 'evenly' | 'amounts' | 'shares' | 'percentage'
  const [splitMode, setSplitMode] = useState<SplitMode>('evenly');

  // Selected Members (for Evenly mode)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    activeMembers.map((m) => m.id)
  );

  // Custom Amounts map (for Amounts mode)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Custom Shares map (for Shares mode)
  const [customShares, setCustomShares] = useState<Record<string, number>>({});

  // Custom Percentages map (for Percentage mode)
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setPaidById(currentUserId);
      const allIds = activeMembers.map((m) => m.id);
      setSelectedIds(allIds);

      // Default shares = 1 for everyone
      const initialShares: Record<string, number> = {};
      allIds.forEach((id) => {
        initialShares[id] = 1;
      });
      setCustomShares(initialShares);

      setCustomAmounts({});
      setCustomPercentages({});
      setIsEditingDescription(false);
    }
  }, [isOpen, currentUserId, activeMembers]);

  if (!isOpen) return null;

  const totalAmount = parseFloat(amountStr) || 0;

  // Calculations per mode:
  // 1. Evenly
  const evenCount = selectedIds.length;
  const evenPerPerson = evenCount > 0 ? totalAmount / evenCount : 0;

  // 2. Shares
  const totalSharesCount = Object.entries(customShares)
    .filter(([id]) => selectedIds.includes(id))
    .reduce((sum, [, shares]) => sum + (shares || 0), 0);

  // Toggle member participation
  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        toast.error('At least one person must be included in the split');
        return;
      }
      setSelectedIds(selectedIds.filter((mId) => mId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Adjust share
  const updateShare = (id: string, delta: number) => {
    const current = customShares[id] ?? 1;
    const next = Math.max(0, current + delta);
    setCustomShares({ ...customShares, [id]: next });
    if (next === 0 && selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((mId) => mId !== id));
    } else if (next > 0 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Handle final submission
  const handleSendRequest = async () => {
    if (totalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Please select at least one person to split with');
      return;
    }

    const title = description.trim() || `${category} (Ooty)`;
    setIsSubmitting(true);

    try {
      await addOotyExpense({
        title,
        amount: totalAmount,
        category,
        date: new Date().toISOString().split('T')[0],
        paidBy: paidById,
        splitWith: selectedIds,
        notes: description.trim() ? `Split ${splitMode}: ${description.trim()}` : '',
        createdBy: currentUserId,
      });

      toast.success(`Split of ₹${totalAmount.toLocaleString('en-IN')} created! 🌲`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to create split: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-[#e3e3e3] flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* 1. TOP APP BAR */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-[#1f1f1f] text-[#c4c7c5] transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <span className="text-xs text-[#8e918f] font-medium tracking-wide">
          Enter amount to split
        </span>

        <button
          onClick={() => {
            const sampleTitles = ['Dinner at Earl\'s Secret', 'Jeep Safari Ticket', 'Cottage Stay Advance', 'Tempo Fuel', 'Nilgiri Tea & Chocolates'];
            const rand = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
            setDescription(rand);
            toast.success(`Suggested: ${rand}`);
          }}
          className="p-2 -mr-2 rounded-full hover:bg-[#1f1f1f] text-[#c4c7c5] transition-colors"
          title="Suggest note"
        >
          <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
        </button>
      </div>

      {/* 2. GIANT AMOUNT & DESCRIPTION SECTION */}
      <div className="px-6 pt-2 pb-4 flex flex-col items-center text-center shrink-0">
        {/* Giant Amount Input */}
        <div className="flex items-center justify-center font-display tracking-tight text-white font-normal mb-3">
          <span className="text-4xl sm:text-5xl font-light text-[#c4c7c5] mr-2">₹</span>
          <input
            type="number"
            autoFocus
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            className="w-48 sm:w-64 bg-transparent text-5xl sm:text-6xl font-normal text-white focus:outline-none text-left tracking-tight border-none appearance-none"
          />
        </div>

        {/* Chips Row: "What's this for?" & "Paid by You" */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Note Chip */}
          {!isEditingDescription ? (
            <button
              onClick={() => setIsEditingDescription(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1e1f20] hover:bg-[#2a2b2d] text-xs font-medium text-[#c4c7c5] border border-[#333538] transition-colors"
            >
              <span>{description ? description : "What's this for?"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-[#1e1f20] px-3 py-1 rounded-full border border-[#a8c7fa]">
              <input
                type="text"
                autoFocus
                placeholder="What's this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setIsEditingDescription(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingDescription(false)}
                className="bg-transparent text-xs text-white focus:outline-none w-36"
              />
              <button
                type="button"
                onClick={() => setIsEditingDescription(false)}
                className="text-xs text-[#a8c7fa] font-bold"
              >
                ✓
              </button>
            </div>
          )}

          {/* Category Chip */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as OotyCategory)}
            className="px-3 py-1.5 rounded-full bg-[#1e1f20] hover:bg-[#2a2b2d] text-xs font-medium text-[#c4c7c5] border border-[#333538] focus:outline-none cursor-pointer"
          >
            {OOTY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#1e1f20]">
                {cat}
              </option>
            ))}
          </select>

          {/* Paid By Chip */}
          <select
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="px-3 py-1.5 rounded-full bg-[#1e1f20] hover:bg-[#2a2b2d] text-xs font-medium text-[#a8c7fa] border border-[#333538] focus:outline-none cursor-pointer"
          >
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1e1f20]">
                Paid by {m.name} {m.id === currentUserId ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. FOUR SPLIT TABS BAR (Exact Google Pay Icons) */}
      <div className="border-b border-[#282a2d] px-4 flex items-center justify-around shrink-0">
        {/* Tab 1: Split Evenly (👥 icon) */}
        <button
          onClick={() => setSplitMode('evenly')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative transition-colors ${
            splitMode === 'evenly' ? 'text-[#a8c7fa]' : 'text-[#8e918f] hover:text-[#c4c7c5]'
          }`}
          title="Split evenly"
        >
          <Users className="w-5 h-5" />
          {splitMode === 'evenly' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#a8c7fa] rounded-full" />
          )}
        </button>

        {/* Tab 2: Split by Amounts (123 text) */}
        <button
          onClick={() => setSplitMode('amounts')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative font-mono text-base font-bold transition-colors ${
            splitMode === 'amounts' ? 'text-[#a8c7fa]' : 'text-[#8e918f] hover:text-[#c4c7c5]'
          }`}
          title="Split by amounts"
        >
          <span>123</span>
          {splitMode === 'amounts' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#a8c7fa] rounded-full" />
          )}
        </button>

        {/* Tab 3: Split by Shares (Pie icon) */}
        <button
          onClick={() => setSplitMode('shares')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative transition-colors ${
            splitMode === 'shares' ? 'text-[#a8c7fa]' : 'text-[#8e918f] hover:text-[#c4c7c5]'
          }`}
          title="Split by shares"
        >
          <PieIcon className="w-5 h-5" />
          {splitMode === 'shares' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#a8c7fa] rounded-full" />
          )}
        </button>

        {/* Tab 4: Split by Percentage (% text) */}
        <button
          onClick={() => setSplitMode('percentage')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative font-bold text-base transition-colors ${
            splitMode === 'percentage' ? 'text-[#a8c7fa]' : 'text-[#8e918f] hover:text-[#c4c7c5]'
          }`}
          title="Split by percentage"
        >
          <span>%</span>
          {splitMode === 'percentage' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#a8c7fa] rounded-full" />
          )}
        </button>
      </div>

      {/* 4. MODE HEADER LABEL */}
      <div className="px-6 py-2.5 text-xs font-semibold text-[#c4c7c5] tracking-wide shrink-0">
        {splitMode === 'evenly' && `Split evenly (${selectedIds.length} of ${activeMembers.length} selected)`}
        {splitMode === 'amounts' && 'Split by amounts'}
        {splitMode === 'shares' && 'Split by shares'}
        {splitMode === 'percentage' && 'Split by percentage'}
      </div>

      {/* 5. MEMBERS LIST (Scrollable, exact Google Pay row design) */}
      <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#1e1f20]">
        {activeMembers.map((member) => {
          const isSelected = selectedIds.includes(member.id);
          const isYou = member.id === currentUserId;

          // Share calculation for shares mode
          const memberShares = customShares[member.id] ?? 1;
          const shareAmount =
            totalSharesCount > 0 && isSelected
              ? (totalAmount * memberShares) / totalSharesCount
              : 0;

          return (
            <div
              key={member.id}
              className="py-3.5 flex items-center justify-between gap-3 group"
            >
              {/* Left: Circle Checkbox, Avatar, Name */}
              <div
                className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none"
                onClick={() => toggleMember(member.id)}
              >
                {/* Google Pay Blue Check Circle */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#a8c7fa] text-[#041e49]'
                      : 'border-2 border-[#5e6368] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: member.avatarColor || '#802C62' }}
                >
                  {member.name.charAt(0)}
                </div>

                {/* Name & subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {isYou ? 'You' : member.name}
                  </div>
                  {splitMode === 'shares' && isSelected && (
                    <div className="text-xs text-[#8e918f] font-mono">
                      ₹{shareAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Depending on Split Mode */}

              {/* 1. Evenly Mode: Live calculated amount */}
              {splitMode === 'evenly' && (
                <div className="text-right font-mono text-sm font-medium text-white shrink-0">
                  {isSelected ? `₹${evenPerPerson.toFixed(2)}` : '₹0.00'}
                </div>
              )}

              {/* 2. Amounts Mode: Input line */}
              {splitMode === 'amounts' && (
                <div className="flex items-center gap-1 font-mono text-sm shrink-0">
                  <span className="text-[#8e918f]">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={customAmounts[member.id] || ''}
                    onChange={(e) => {
                      setCustomAmounts({
                        ...customAmounts,
                        [member.id]: e.target.value,
                      });
                      if (!selectedIds.includes(member.id)) {
                        setSelectedIds([...selectedIds, member.id]);
                      }
                    }}
                    className="w-20 bg-transparent border-b border-[#5e6368] focus:border-[#a8c7fa] text-white text-right focus:outline-none pb-0.5"
                  />
                </div>
              )}

              {/* 3. Shares Mode: Stepper controls [ - ]  1  [ + ] */}
              {splitMode === 'shares' && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateShare(member.id, -1)}
                    className="w-8 h-8 rounded-full bg-[#1e1f20] hover:bg-[#2e3033] flex items-center justify-center text-[#c4c7c5] transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-5 text-center font-bold text-sm text-white">
                    {isSelected ? memberShares : 0}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateShare(member.id, 1)}
                    className="w-8 h-8 rounded-full bg-[#1e1f20] hover:bg-[#2e3033] flex items-center justify-center text-[#c4c7c5] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 4. Percentage Mode */}
              {splitMode === 'percentage' && (
                <div className="flex items-center gap-1 font-mono text-sm shrink-0">
                  <input
                    type="number"
                    placeholder="0"
                    value={customPercentages[member.id] || ''}
                    onChange={(e) => {
                      setCustomPercentages({
                        ...customPercentages,
                        [member.id]: e.target.value,
                      });
                    }}
                    className="w-16 bg-transparent border-b border-[#5e6368] focus:border-[#a8c7fa] text-white text-right focus:outline-none pb-0.5"
                  />
                  <span className="text-[#8e918f]">%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 6. BOTTOM STICKY ACTION BUTTON (Google Pay Pill Style) */}
      <div className="p-4 bg-[#000000] border-t border-[#1e1f20] shrink-0">
        <button
          onClick={handleSendRequest}
          disabled={isSubmitting || totalAmount <= 0}
          className="w-full py-3.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49] font-bold text-sm tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-[#041e49] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>
              Send request (₹{totalAmount.toLocaleString('en-IN')})
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
