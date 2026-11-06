import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Group, SplitMethod, ExpenseCategory, Expense } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateShareSplit,
} from '../../engine/splitCalculator';
import { formatCurrency } from '../../engine/balanceEngine';
import { AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  expenseToEdit?: Expense | null;
  onSave: (expenseData: {
    title: string;
    description?: string;
    amountMinor: number;
    currency: string;
    category: ExpenseCategory;
    expenseDate: string;
    payers: { userId: string; paidAmountMinor: number }[];
    splits: { userId: string; shareAmountMinor: number; splitType: SplitMethod }[];
  }) => Promise<void>;
}

const CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Transport',
  'Accommodation',
  'Shopping',
  'Activities',
  'Groceries',
  'Fuel',
  'Entertainment',
  'Utilities',
  'Other',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  expenseToEdit,
  onSave,
}) => {
  const { user } = useAuth();
  const members = group.members || [];

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Payers state
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState(user?.id || members[0]?.userId || '');
  const [multiPayers, setMultiPayers] = useState<Record<string, string>>({}); // userId -> amountStr

  // Split state
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [exactShares, setExactShares] = useState<Record<string, string>>({}); // userId -> amountStr
  const [percentages, setPercentages] = useState<Record<string, string>>({}); // userId -> percentStr
  const [shareRatios, setShareRatios] = useState<Record<string, string>>({}); // userId -> countStr

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset when modal opens / expenseToEdit changes
  useEffect(() => {
    if (expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmountStr((expenseToEdit.amountMinor / 100).toFixed(2));
      setCategory(expenseToEdit.category);
      setExpenseDate(expenseToEdit.expenseDate);
      setDescription(expenseToEdit.description || '');

      // Payers
      if (expenseToEdit.payers.length > 1) {
        setIsMultiPayer(true);
        const map: Record<string, string> = {};
        for (const p of expenseToEdit.payers) {
          map[p.userId] = (p.paidAmountMinor / 100).toFixed(2);
        }
        setMultiPayers(map);
      } else if (expenseToEdit.payers.length === 1) {
        setIsMultiPayer(false);
        setSinglePayerId(expenseToEdit.payers[0].userId);
      }

      // Splits
      const participantIds = expenseToEdit.splits.map((s) => s.userId);
      setSelectedParticipants(participantIds);
      const method = expenseToEdit.splits[0]?.splitType || 'equal';
      setSplitMethod(method);

      if (method === 'exact') {
        const exactMap: Record<string, string> = {};
        for (const s of expenseToEdit.splits) {
          exactMap[s.userId] = (s.shareAmountMinor / 100).toFixed(2);
        }
        setExactShares(exactMap);
      } else if (method === 'percentage') {
        const pMap: Record<string, string> = {};
        for (const s of expenseToEdit.splits) {
          const pct = ((s.shareAmountMinor / expenseToEdit.amountMinor) * 100).toFixed(1);
          pMap[s.userId] = pct;
        }
        setPercentages(pMap);
      }
    } else {
      // New expense defaults
      setTitle('');
      setAmountStr('');
      setCategory('Food & Dining');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setIsMultiPayer(false);
      setSinglePayerId(user?.id || members[0]?.userId || '');
      setMultiPayers({});
      setSplitMethod('equal');
      // Default to all group members selected
      const allIds = members.map((m) => m.userId);
      setSelectedParticipants(allIds);

      // Default share ratios = 1
      const defaultRatios: Record<string, string> = {};
      for (const id of allIds) {
        defaultRatios[id] = '1';
      }
      setShareRatios(defaultRatios);
    }
  }, [isOpen, expenseToEdit, members, user]);

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      if (selectedParticipants.length === 1) {
        toast.error('At least one participant must be included in the split');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const selectAllParticipants = () => {
    setSelectedParticipants(members.map((m) => m.userId));
  };

  const totalAmountMinor = Math.round((parseFloat(amountStr) || 0) * 100);

  // Calculations for split preview
  let calculatedSplits: { userId: string; shareAmountMinor: number; splitType: SplitMethod }[] = [];
  let splitError: string | null = null;

  try {
    if (totalAmountMinor > 0 && selectedParticipants.length > 0) {
      if (splitMethod === 'equal') {
        calculatedSplits = calculateEqualSplit(totalAmountMinor, selectedParticipants);
      } else if (splitMethod === 'exact') {
        const shares = selectedParticipants.map((id) => ({
          userId: id,
          amountMinor: Math.round((parseFloat(exactShares[id] || '0') || 0) * 100),
        }));
        calculatedSplits = calculateExactSplit(totalAmountMinor, shares);
      } else if (splitMethod === 'percentage') {
        const pcts = selectedParticipants.map((id) => ({
          userId: id,
          percentage: parseFloat(percentages[id] || '0') || 0,
        }));
        calculatedSplits = calculatePercentageSplit(totalAmountMinor, pcts);
      } else if (splitMethod === 'shares') {
        const counts = selectedParticipants.map((id) => ({
          userId: id,
          sharesCount: Math.max(1, parseInt(shareRatios[id] || '1', 10)),
        }));
        calculatedSplits = calculateShareSplit(totalAmountMinor, counts);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      splitError = err.message;
    } else {
      splitError = String(err);
    }
  }

  // Payers validation
  let finalPayers: { userId: string; paidAmountMinor: number }[] = [];
  let payerError: string | null = null;

  if (!isMultiPayer) {
    finalPayers = [{ userId: singlePayerId, paidAmountMinor: totalAmountMinor }];
  } else {
    let runningPaid = 0;
    for (const m of members) {
      const pAmt = Math.round((parseFloat(multiPayers[m.userId] || '0') || 0) * 100);
      if (pAmt > 0) {
        finalPayers.push({ userId: m.userId, paidAmountMinor: pAmt });
        runningPaid += pAmt;
      }
    }
    if (runningPaid !== totalAmountMinor) {
      payerError = `Sum of payers (${formatCurrency(runningPaid, group.currency)}) does not equal total amount (${formatCurrency(totalAmountMinor, group.currency)})`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter an expense title');
      return;
    }
    if (totalAmountMinor <= 0) {
      toast.error('Please enter a valid amount greater than zero');
      return;
    }
    if (payerError) {
      toast.error(payerError);
      return;
    }
    if (splitError) {
      toast.error(splitError);
      return;
    }
    if (calculatedSplits.length === 0) {
      toast.error('Please configure participants for this split');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        amountMinor: totalAmountMinor,
        currency: group.currency,
        category,
        expenseDate,
        payers: finalPayers,
        splits: calculatedSplits,
      });

      toast.success(expenseToEdit ? 'Expense updated!' : 'Expense added successfully!');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
      description={`Record an expense for ${group.name}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Title & Amount Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Expense Title"
              placeholder="e.g. Villa Booking, Dinner at Cafe, Fuel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              label={`Amount (${group.currency})`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground-muted">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* --- WHO PAID SECTION --- */}
        <div className="p-3.5 rounded-xl border border-border bg-card-elevated/40 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
              <span>Paid by</span>
            </label>
            <button
              type="button"
              onClick={() => setIsMultiPayer(!isMultiPayer)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {isMultiPayer ? 'Switch to Single Payer' : 'Multiple people paid?'}
            </button>
          </div>

          {!isMultiPayer ? (
            <select
              value={singlePayerId}
              onChange={(e) => setSinglePayerId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.profile.fullName} {m.userId === user?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-foreground-muted">
                Enter how much each person contributed (must sum to{' '}
                {formatCurrency(totalAmountMinor, group.currency)}):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center space-x-2">
                    <span className="text-xs text-foreground truncate w-28">
                      {m.profile.fullName}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={multiPayers[m.userId] || ''}
                      onChange={(e) =>
                        setMultiPayers({ ...multiPayers, [m.userId]: e.target.value })
                      }
                      className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              {payerError && (
                <div className="flex items-center space-x-1.5 text-xs text-negative">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{payerError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- SPLIT METHODS TAB SELECTOR --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Split Method</label>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-foreground-muted">
                {selectedParticipants.length} of {members.length} participants
              </span>
              <button
                type="button"
                onClick={selectAllParticipants}
                className="text-xs text-primary hover:underline font-medium"
              >
                Select All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 bg-card-elevated rounded-lg border border-border text-center text-xs">
            {(['equal', 'exact', 'percentage', 'shares'] as SplitMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setSplitMethod(method)}
                className={`py-1.5 rounded-md font-medium capitalize transition-all ${
                  splitMethod === method
                    ? 'bg-card text-primary shadow-xs font-semibold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Participants Selection & Custom Inputs */}
          <div className="border border-border rounded-xl divide-y divide-border/60 max-h-56 overflow-y-auto">
            {members.map((m) => {
              const isSelected = selectedParticipants.includes(m.userId);
              const previewShare = calculatedSplits.find((s) => s.userId === m.userId);

              return (
                <div
                  key={m.userId}
                  className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-card' : 'bg-card-elevated/30 opacity-60'
                  }`}
                >
                  <div
                    className="flex items-center space-x-2.5 cursor-pointer flex-1"
                    onClick={() => toggleParticipant(m.userId)}
                  >
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-white'
                          : 'border-border bg-card'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium text-foreground">
                      {m.profile.fullName} {m.userId === user?.id ? '(You)' : ''}
                    </span>
                  </div>

                  {/* Mode-specific share input / preview */}
                  <div className="flex items-center space-x-2">
                    {splitMethod === 'exact' && isSelected && (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={exactShares[m.userId] || ''}
                        onChange={(e) =>
                          setExactShares({ ...exactShares, [m.userId]: e.target.value })
                        }
                        className="h-7 w-20 rounded border border-border bg-card-elevated px-2 text-right text-xs"
                      />
                    )}

                    {splitMethod === 'percentage' && isSelected && (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="%"
                          value={percentages[m.userId] || ''}
                          onChange={(e) =>
                            setPercentages({ ...percentages, [m.userId]: e.target.value })
                          }
                          className="h-7 w-16 rounded border border-border bg-card-elevated px-2 text-right text-xs"
                        />
                        <span className="text-foreground-muted">%</span>
                      </div>
                    )}

                    {splitMethod === 'shares' && isSelected && (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="Shares"
                          value={shareRatios[m.userId] || '1'}
                          onChange={(e) =>
                            setShareRatios({ ...shareRatios, [m.userId]: e.target.value })
                          }
                          className="h-7 w-14 rounded border border-border bg-card-elevated px-2 text-center text-xs"
                        />
                        <span className="text-foreground-muted">shares</span>
                      </div>
                    )}

                    {isSelected && previewShare && (
                      <span className="font-semibold text-foreground min-w-[70px] text-right">
                        {formatCurrency(previewShare.shareAmountMinor, group.currency)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {splitError && (
            <div className="flex items-center space-x-1.5 text-xs text-negative p-2 bg-negative-bg rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{splitError}</span>
            </div>
          )}
        </div>

        {/* Optional notes */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-foreground-muted">
            Notes / Reference (Optional)
          </label>
          <input
            type="text"
            placeholder="Add bill invoice number or payment note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-card-elevated/40 px-3 text-xs text-foreground placeholder:text-foreground-muted focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={Boolean(payerError || splitError || totalAmountMinor <= 0)}
          >
            {expenseToEdit ? 'Save Changes' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
