import React, { useState } from 'react';
import { Group, Expense, UserProfile } from '../../../types';
import { formatCurrency } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { Avatar } from '../../ui/Avatar';
import {
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Receipt,
  Users,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface GroupExpensesTabProps {
  group: Group;
  expenses: Expense[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

export const GroupExpensesTab: React.FC<GroupExpensesTabProps> = ({
  group,
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const members = group.members || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getMemberProfile = (userId: string): UserProfile | undefined => {
    return members.find((m) => m.userId === userId)?.profile;
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || exp.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleDelete = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense? Group balances will be automatically recalculated.')) {
      setIsDeleting(true);
      try {
        await onDeleteExpense(expenseId);
        toast.success('Expense deleted and balances updated');
        setSelectedExpense(null);
      } catch {
        toast.error('Failed to delete expense');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="Food & Dining">Food & Dining</option>
            <option value="Transport">Transport</option>
            <option value="Accommodation">Accommodation</option>
            <option value="Shopping">Shopping</option>
            <option value="Activities">Activities</option>
            <option value="Groceries">Groceries</option>
            <option value="Fuel">Fuel</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Utilities">Utilities</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <Button size="sm" onClick={onAddExpense} className="w-full sm:w-auto">
          <PlusCircle className="mr-1.5 h-4 w-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      {/* Expenses Table / List */}
      <Card className="divide-y divide-border/60 overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-muted text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No expenses found</h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              No expenses match your search. Add an expense or clear your filters.
            </p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const payerProfile = getMemberProfile(exp.payers[0]?.userId);
            const isMultiPayer = exp.payers.length > 1;

            return (
              <div
                key={exp.id}
                className="p-4 hover:bg-card-elevated/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                onClick={() => setSelectedExpense(exp)}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="h-10 w-10 rounded-xl bg-primary-muted text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {exp.title}
                      </span>
                      <Badge variant="neutral" className="text-[10px]">
                        {exp.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground-muted flex flex-wrap items-center gap-x-2">
                      <span>
                        Paid by <strong className="text-foreground">{payerProfile?.fullName || 'User'}</strong>
                        {isMultiPayer ? ` (+${exp.payers.length - 1} more)` : ''}
                      </span>
                      <span>•</span>
                      <span>{exp.expenseDate}</span>
                      <span>•</span>
                      <span>{exp.splits.length} participants</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                  <div className="text-left sm:text-right">
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(exp.amountMinor, group.currency)}
                    </span>
                    <p className="text-[11px] text-foreground-muted capitalize">
                      {exp.splits[0]?.splitType || 'Equal'} split
                    </p>
                  </div>

                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditExpense(exp)}
                      title="Edit expense"
                      className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-card-elevated transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      title="Delete expense"
                      className="p-1.5 rounded-lg text-foreground-muted hover:text-negative hover:bg-card-elevated transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <Modal
          isOpen={Boolean(selectedExpense)}
          onClose={() => setSelectedExpense(null)}
          title={selectedExpense.title}
          description={`Expense details in ${group.name}`}
          maxWidth="md"
        >
          <div className="space-y-5">
            {/* Amount Banner */}
            <div className="p-4 rounded-xl bg-card-elevated border border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-foreground-muted">Total Amount</span>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(selectedExpense.amountMinor, group.currency)}
                </div>
              </div>
              <Badge variant="default" className="text-xs">
                {selectedExpense.category}
              </Badge>
            </div>

            {/* Metadata info */}
            <div className="grid grid-cols-2 gap-3 text-xs text-foreground-muted">
              <div className="flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Date: {selectedExpense.expenseDate}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Users className="h-4 w-4 text-secondary" />
                <span>{selectedExpense.splits.length} participants</span>
              </div>
            </div>

            {selectedExpense.description && (
              <div className="p-3 bg-card-elevated/40 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-foreground">Notes:</span>
                <p className="text-foreground-muted">{selectedExpense.description}</p>
              </div>
            )}

            {/* Payers breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Paid by
              </h4>
              <div className="space-y-1.5 border border-border rounded-lg p-2.5">
                {selectedExpense.payers.map((p, idx) => {
                  const prof = getMemberProfile(p.userId);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Avatar name={prof?.fullName || 'User'} size="xs" />
                        <span className="font-medium text-foreground">{prof?.fullName}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(p.paidAmountMinor, group.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Split Breakdown
              </h4>
              <div className="space-y-1.5 border border-border rounded-lg p-2.5 max-h-48 overflow-y-auto">
                {selectedExpense.splits.map((s, idx) => {
                  const prof = getMemberProfile(s.userId);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                      <div className="flex items-center space-x-2">
                        <Avatar name={prof?.fullName || 'User'} size="xs" />
                        <span className="text-foreground">{prof?.fullName}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(s.shareAmountMinor, group.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedExpense.id)}
                disabled={isDeleting}
              >
                Delete
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const exp = selectedExpense;
                    setSelectedExpense(null);
                    onEditExpense(exp);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" onClick={() => setSelectedExpense(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
