import React, { useState, useEffect } from 'react';
import {
  OotyMember,
  OOTY_MEMBERS,
  roundToTwoDecimals,
  formatCurrency,
} from '../../types/ooty';
import { addOotyExpense } from '../../services/ootyDataService';
import { useTheme } from '../../context/ThemeContext';
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
  isAdmin?: boolean;
  members?: OotyMember[];
}

type SplitMode = 'evenly' | 'amounts' | 'shares' | 'percentage';

export const GPaySplitExpenseModal: React.FC<GPaySplitExpenseModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  isAdmin = false,
  members = OOTY_MEMBERS,
}) => {
  const { isDark } = useTheme();
  const activeMembers = members.length > 0 ? members : OOTY_MEMBERS;

  // Amount & Description
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
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
      setAmountStr('');
      setDescription('');
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
  const evenCount = selectedIds.length;
  const evenPerPerson = evenCount > 0 ? roundToTwoDecimals(totalAmount / evenCount) : 0;

  const totalSharesCount = Object.entries(customShares)
    .filter(([id]) => selectedIds.includes(id))
    .reduce((sum, [, shares]) => sum + (shares || 0), 0);

  // Amounts mode allocation:
  const allocatedAmountsSum = selectedIds.reduce((sum, id) => {
    const val = parseFloat(customAmounts[id] || '0') || 0;
    return sum + val;
  }, 0);
  const amountsDiff = Math.round((totalAmount - allocatedAmountsSum) * 100) / 100;

  // Percentage mode allocation:
  const allocatedPctSum = selectedIds.reduce((sum, id) => {
    const val = parseFloat(customPercentages[id] || '0') || 0;
    return sum + val;
  }, 0);
  const pctDiff = Math.round((100 - allocatedPctSum) * 10) / 10;

  const isFormValid =
    totalAmount > 0 &&
    totalAmount <= 1000000 &&
    selectedIds.length > 0 &&
    (splitMode === 'evenly' ||
      (splitMode === 'amounts' && Math.abs(amountsDiff) < 1) ||
      (splitMode === 'shares' && totalSharesCount > 0) ||
      (splitMode === 'percentage' && Math.abs(pctDiff) < 1));

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

  // Auto distribute remaining amounts evenly
  const autoDistributeAmounts = () => {
    if (selectedIds.length === 0 || totalAmount <= 0) return;
    const perPerson = Math.floor((totalAmount / selectedIds.length) * 100) / 100;
    const remainder = Math.round((totalAmount - perPerson * selectedIds.length) * 100) / 100;
    const newAmounts: Record<string, string> = {};
    selectedIds.forEach((id, idx) => {
      const amt = idx === 0 ? perPerson + remainder : perPerson;
      newAmounts[id] = amt.toString();
    });
    setCustomAmounts(newAmounts);
    toast.success('Distributed amounts evenly as starting point ⚡');
  };

  // Auto distribute percentages evenly
  const autoDistributePercentages = () => {
    if (selectedIds.length === 0) return;
    const perPerson = Math.floor((100 / selectedIds.length) * 10) / 10;
    const remainder = Math.round((100 - perPerson * selectedIds.length) * 10) / 10;
    const newPcts: Record<string, string> = {};
    selectedIds.forEach((id, idx) => {
      const pct = idx === 0 ? perPerson + remainder : perPerson;
      newPcts[id] = pct.toString();
    });
    setCustomPercentages(newPcts);
    toast.success('Distributed percentages evenly ⚡');
  };

  // Handle final submission
  const handleSendRequest = async () => {
    if (totalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (totalAmount > 1000000) {
      toast.error('Maximum allowed expense is ₹10,00,000');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Please select at least one person to split with');
      return;
    }

    let splitDetails: Record<string, number> | undefined = undefined;

    if (splitMode === 'amounts') {
      if (Math.abs(amountsDiff) >= 1) {
        if (amountsDiff > 0) {
          toast.error(`Please allocate the remaining ₹${amountsDiff.toFixed(2)}`);
        } else {
          toast.error(`Amounts exceed total by ₹${Math.abs(amountsDiff).toFixed(2)}`);
        }
        return;
      }
      splitDetails = {};
      selectedIds.forEach((id) => {
        splitDetails![id] = parseFloat(customAmounts[id] || '0') || 0;
      });
    } else if (splitMode === 'shares') {
      if (totalSharesCount <= 0) {
        toast.error('Total shares must be at least 1');
        return;
      }
      splitDetails = {};
      selectedIds.forEach((id) => {
        const sh = customShares[id] ?? 1;
        splitDetails![id] = roundToTwoDecimals((totalAmount * sh) / totalSharesCount);
      });
    } else if (splitMode === 'percentage') {
      if (Math.abs(pctDiff) >= 1) {
        toast.error(`Percentages must equal 100% (currently ${allocatedPctSum}%)`);
        return;
      }
      splitDetails = {};
      selectedIds.forEach((id) => {
        const pct = parseFloat(customPercentages[id] || '0') || 0;
        splitDetails![id] = roundToTwoDecimals((totalAmount * pct) / 100);
      });
    }

    const title = description.trim() || 'Ooty Trip Expense';
    const finalPaidBy = isAdmin ? paidById : currentUserId;
    setIsSubmitting(true);

    try {
      await addOotyExpense({
        title,
        amount: totalAmount,
        category: 'Food & Drinks', // Default category internally
        date: new Date().toISOString().split('T')[0],
        paidBy: finalPaidBy,
        splitWith: selectedIds,
        ...(splitDetails ? { splitDetails } : {}),
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
          Enter amount to split
        </span>

        <button
          onClick={() => {
            const sampleTitles = [
              "Dinner at Earl's Secret",
              'Jeep Safari Ticket',
              'Cottage Stay Advance',
              'Tempo Fuel',
              'Nilgiri Tea & Chocolates',
            ];
            const rand = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
            setDescription(rand);
            toast.success(`Suggested: ${rand}`);
          }}
          className={`p-2 -mr-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-[#1f1f1f] text-[#c4c7c5]' : 'hover:bg-[#f1f3f4] text-[#5f6368]'
          }`}
          title="Suggest note"
        >
          <Sparkles className={`w-5 h-5 ${isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'}`} />
        </button>
      </div>

      {/* 2. GIANT AMOUNT & DESCRIPTION SECTION */}
      <div className="px-6 pt-3 pb-4 flex flex-col items-center text-center shrink-0 w-full">
        {/* Giant Amount Input - Perfectly Centered, NO Spin Buttons, NO Scroll Behavior */}
        <div className="flex items-center justify-center font-display tracking-tight font-normal mb-3 w-full">
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

        {/* "What's this for?" - Centered and Larger */}
        <div className="flex flex-col items-center justify-center w-full my-1">
          {!isEditingDescription ? (
            <button
              type="button"
              onClick={() => setIsEditingDescription(true)}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                isDark
                  ? 'bg-[#1e1f20] hover:bg-[#2a2b2d] text-[#e3e3e3] border-[#333538]'
                  : 'bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] border-[#dadce0]'
              }`}
            >
              <span>{description ? description : "What's this for?"}</span>
            </button>
          ) : (
            <div
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border shadow-sm ${
                isDark ? 'bg-[#1e1f20] border-[#a8c7fa]' : 'bg-[#ffffff] border-[#1a73e8]'
              }`}
            >
              <input
                type="text"
                autoFocus
                placeholder="What's this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setIsEditingDescription(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingDescription(false)}
                className="bg-transparent text-sm text-center text-current focus:outline-none w-52 sm:w-64 font-medium"
              />
              <button
                type="button"
                onClick={() => setIsEditingDescription(false)}
                className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  isDark ? 'text-[#a8c7fa] hover:bg-[#a8c7fa]/20' : 'text-[#1a73e8] hover:bg-[#1a73e8]/10'
                }`}
              >
                ✓
              </button>
            </div>
          )}
        </div>

        {/* "Paid by..." - ONLY visible for Admin (Pushkar). Others can only record their own payments! */}
        {isAdmin && (
          <div className="flex items-center justify-center mt-2.5">
            <select
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border focus:outline-none cursor-pointer transition-colors shadow-sm ${
                isDark
                  ? 'bg-[#1e1f20] hover:bg-[#2a2b2d] text-[#a8c7fa] border-[#333538]'
                  : 'bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] border-[#dadce0]'
              }`}
            >
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id} className={isDark ? 'bg-[#1e1f20] text-white' : 'bg-white text-black'}>
                  Paid by {m.name} {m.id === currentUserId ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. FOUR SPLIT TABS BAR */}
      <div className={`border-b px-4 flex items-center justify-around shrink-0 ${isDark ? 'border-[#282a2d]' : 'border-[#e8eaed]'}`}>
        {/* Tab 1: Split Evenly (👥 icon) */}
        <button
          onClick={() => setSplitMode('evenly')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative transition-colors ${
            splitMode === 'evenly'
              ? isDark
                ? 'text-[#a8c7fa]'
                : 'text-[#1a73e8]'
              : isDark
              ? 'text-[#8e918f] hover:text-[#c4c7c5]'
              : 'text-[#5f6368] hover:text-[#202124]'
          }`}
          title="Split evenly"
        >
          <Users className="w-5 h-5" />
          {splitMode === 'evenly' && (
            <div
              className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
              }`}
            />
          )}
        </button>

        {/* Tab 2: Split by Amounts (123 text) */}
        <button
          onClick={() => setSplitMode('amounts')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative font-mono text-base font-bold transition-colors ${
            splitMode === 'amounts'
              ? isDark
                ? 'text-[#a8c7fa]'
                : 'text-[#1a73e8]'
              : isDark
              ? 'text-[#8e918f] hover:text-[#c4c7c5]'
              : 'text-[#5f6368] hover:text-[#202124]'
          }`}
          title="Split by amounts"
        >
          <span>123</span>
          {splitMode === 'amounts' && (
            <div
              className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
              }`}
            />
          )}
        </button>

        {/* Tab 3: Split by Shares (Pie icon) */}
        <button
          onClick={() => setSplitMode('shares')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative transition-colors ${
            splitMode === 'shares'
              ? isDark
                ? 'text-[#a8c7fa]'
                : 'text-[#1a73e8]'
              : isDark
              ? 'text-[#8e918f] hover:text-[#c4c7c5]'
              : 'text-[#5f6368] hover:text-[#202124]'
          }`}
          title="Split by shares"
        >
          <PieIcon className="w-5 h-5" />
          {splitMode === 'shares' && (
            <div
              className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
              }`}
            />
          )}
        </button>

        {/* Tab 4: Split by Percentage (% text) */}
        <button
          onClick={() => setSplitMode('percentage')}
          className={`py-3 px-4 flex flex-col items-center justify-center relative font-bold text-base transition-colors ${
            splitMode === 'percentage'
              ? isDark
                ? 'text-[#a8c7fa]'
                : 'text-[#1a73e8]'
              : isDark
              ? 'text-[#8e918f] hover:text-[#c4c7c5]'
              : 'text-[#5f6368] hover:text-[#202124]'
          }`}
          title="Split by percentage"
        >
          <span>%</span>
          {splitMode === 'percentage' && (
            <div
              className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                isDark ? 'bg-[#a8c7fa]' : 'bg-[#1a73e8]'
              }`}
            />
          )}
        </button>
      </div>

      {/* 4. MODE HEADER LABEL & VALIDATION STATUS */}
      <div className={`px-4 sm:px-6 py-2 text-xs font-semibold tracking-wide shrink-0 border-b flex items-center justify-between ${
        isDark ? 'border-[#1e1f20] text-[#c4c7c5]' : 'border-[#f1f3f4] text-[#5f6368]'
      }`}>
        {splitMode === 'evenly' && (
          <div>
            Split evenly • <span className={isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'}>{selectedIds.length}</span> of {activeMembers.length} selected
          </div>
        )}

        {splitMode === 'amounts' && (
          <div className="flex items-center justify-between w-full">
            <span>Split by amounts</span>
            <div className="flex items-center gap-2">
              {Math.abs(amountsDiff) < 1 ? (
                <span className="text-[#34a853] font-mono text-[11px] font-bold">✓ Matches ₹{totalAmount}</span>
              ) : amountsDiff > 0 ? (
                <span className="text-[#fbbc04] font-mono text-[11px] font-bold">₹{amountsDiff.toFixed(2)} left</span>
              ) : (
                <span className="text-[#ea4335] font-mono text-[11px] font-bold">₹{Math.abs(amountsDiff).toFixed(2)} over</span>
              )}
              {Math.abs(amountsDiff) >= 1 && (
                <button
                  type="button"
                  onClick={autoDistributeAmounts}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    isDark ? 'border-[#333538] hover:bg-[#282a2d] text-[#a8c7fa]' : 'border-[#dadce0] hover:bg-[#e8eaed] text-[#1a73e8]'
                  }`}
                >
                  Auto-fill
                </button>
              )}
            </div>
          </div>
        )}

        {splitMode === 'shares' && (
          <div className="flex items-center justify-between w-full">
            <span>Split by shares</span>
            <span className={`font-mono text-[11px] font-bold ${totalSharesCount > 0 ? 'text-[#34a853]' : 'text-[#ea4335]'}`}>
              {totalSharesCount} total {totalSharesCount === 1 ? 'share' : 'shares'}
            </span>
          </div>
        )}

        {splitMode === 'percentage' && (
          <div className="flex items-center justify-between w-full">
            <span>Split by percentage</span>
            <div className="flex items-center gap-2">
              {Math.abs(pctDiff) < 1 ? (
                <span className="text-[#34a853] font-mono text-[11px] font-bold">✓ 100% total</span>
              ) : (
                <span className="text-[#fbbc04] font-mono text-[11px] font-bold">{allocatedPctSum}% / 100%</span>
              )}
              {Math.abs(pctDiff) >= 1 && (
                <button
                  type="button"
                  onClick={autoDistributePercentages}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    isDark ? 'border-[#333538] hover:bg-[#282a2d] text-[#a8c7fa]' : 'border-[#dadce0] hover:bg-[#e8eaed] text-[#1a73e8]'
                  }`}
                >
                  Auto-fill
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. MEMBERS LIST */}
      <div className={`flex-1 overflow-y-auto px-4 divide-y ${isDark ? 'divide-[#1e1f20]' : 'divide-[#e8eaed]'}`}>
        {activeMembers.map((member) => {
          const isSelected = selectedIds.includes(member.id);
          const isYou = member.id === currentUserId;

          const memberShares = customShares[member.id] ?? 1;
          const shareAmount =
            totalSharesCount > 0 && isSelected ? (totalAmount * memberShares) / totalSharesCount : 0;

          return (
            <div key={member.id} className="py-3.5 flex items-center justify-between gap-3 group">
              {/* Left: Circle Checkbox, Avatar, Name */}
              <div
                className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none"
                onClick={() => toggleMember(member.id)}
              >
                {/* Blue Check Circle */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-[#a8c7fa] text-[#041e49]'
                        : 'bg-[#0b57d0] text-white'
                      : isDark
                      ? 'border-2 border-[#5e6368] text-transparent'
                      : 'border-2 border-[#dadce0] text-transparent'
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
                  <div className="text-sm font-medium text-current truncate">{isYou ? 'You' : member.name}</div>
                  {splitMode === 'shares' && isSelected && (
                    <div className={`text-xs font-mono ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                      ₹{shareAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Depending on Split Mode */}
              {splitMode === 'evenly' && (
                <div className="text-right font-mono text-sm font-medium text-current shrink-0">
                  {isSelected ? `₹${formatCurrency(evenPerPerson)}` : '₹0.00'}
                </div>
              )}

              {splitMode === 'amounts' && (
                <div className="flex items-center gap-1 font-mono text-sm shrink-0">
                  <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>₹</span>
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
                    className={`w-20 bg-transparent border-b text-right focus:outline-none pb-0.5 ${
                      isDark
                        ? 'border-[#5e6368] focus:border-[#a8c7fa] text-white'
                        : 'border-[#dadce0] focus:border-[#1a73e8] text-[#202124]'
                    }`}
                  />
                </div>
              )}

              {splitMode === 'shares' && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateShare(member.id, -1)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isDark ? 'bg-[#1e1f20] hover:bg-[#2e3033] text-[#c4c7c5]' : 'bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043]'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-5 text-center font-bold text-sm text-current">
                    {isSelected ? memberShares : 0}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateShare(member.id, 1)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isDark ? 'bg-[#1e1f20] hover:bg-[#2e3033] text-[#c4c7c5]' : 'bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                    className={`w-16 bg-transparent border-b text-right focus:outline-none pb-0.5 ${
                      isDark
                        ? 'border-[#5e6368] focus:border-[#a8c7fa] text-white'
                        : 'border-[#dadce0] focus:border-[#1a73e8] text-[#202124]'
                    }`}
                  />
                  <span className={isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}>%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 6. BOTTOM ACTION BUTTON */}
      <div className={`p-4 border-t shrink-0 ${isDark ? 'bg-[#000000] border-[#1e1f20]' : 'bg-[#ffffff] border-[#e8eaed]'}`}>
        <button
          onClick={handleSendRequest}
          disabled={isSubmitting || !isFormValid}
          className={`w-full py-3.5 rounded-full font-medium text-sm tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${
            isDark
              ? 'bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49]'
              : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
          }`}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : !isFormValid ? (
            <span>
              {totalAmount <= 0
                ? 'Enter an amount'
                : selectedIds.length === 0
                ? 'Select members'
                : splitMode === 'amounts' && amountsDiff > 0
                ? `Allocate remaining ₹${amountsDiff.toFixed(2)}`
                : splitMode === 'amounts' && amountsDiff < 0
                ? `Exceeds total by ₹${Math.abs(amountsDiff).toFixed(2)}`
                : splitMode === 'percentage' && Math.abs(pctDiff) >= 1
                ? `Percentages must total 100% (${allocatedPctSum}%)`
                : splitMode === 'shares' && totalSharesCount <= 0
                ? 'Assign at least 1 share'
                : 'Complete details to send'}
            </span>
          ) : (
            <span>Send request (₹{formatCurrency(totalAmount)})</span>
          )}
        </button>
      </div>
    </div>
  );
};
