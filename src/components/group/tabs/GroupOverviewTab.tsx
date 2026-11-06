import React from 'react';
import { Group, Expense, MemberBalance, SuggestedSettlement } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import {
  Scale,
  Receipt,
  Users,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface GroupOverviewTabProps {
  group: Group;
  expenses: Expense[];
  settlements?: unknown;
  balances: Map<string, MemberBalance>;
  suggestedSettlements: SuggestedSettlement[];
  onAddExpense: () => void;
  onRecordSettlement: (fromUserId?: string, toUserId?: string, amountMinor?: number) => void;
  onNavigateTab: (tabId: string) => void;
}

export const GroupOverviewTab: React.FC<GroupOverviewTabProps> = ({
  group,
  expenses,
  balances,
  suggestedSettlements,
  onAddExpense,
  onRecordSettlement,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const members = group.members || [];

  const userBalance = (user && balances.get(user.id)?.netBalanceMinor) ?? 0;
  const totalGroupSpendingMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

  // Spending by category
  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amountMinor;
  }

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const recentExpenses = [...expenses].slice(0, 5);

  const getMemberProfile = (userId: string) => {
    return members.find((m) => m.userId === userId)?.profile;
  };

  return (
    <div className="space-y-6">
      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spending */}
        <Card className="p-5 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Total Group Spend
            </span>
            <div className="p-2 rounded-lg bg-primary-muted text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalGroupSpendingMinor, group.currency)}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Across {expenses.length} recorded {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
        </Card>

        {/* Your Personal Net Balance in this group */}
        <Card
          className={cn(
            'p-5 border-l-4',
            userBalance > 0 && 'border-l-positive',
            userBalance < 0 && 'border-l-negative',
            userBalance === 0 && 'border-l-border'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Your Net Balance
            </span>
            <div
              className={cn(
                'p-2 rounded-lg',
                userBalance > 0 && 'bg-positive-bg text-positive',
                userBalance < 0 && 'bg-negative-bg text-negative',
                userBalance === 0 && 'bg-card-elevated text-foreground-muted'
              )}
            >
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={cn(
                'text-2xl font-bold tracking-tight',
                userBalance > 0 && 'text-positive',
                userBalance < 0 && 'text-negative',
                userBalance === 0 && 'text-foreground'
              )}
            >
              {formatCurrency(userBalance, group.currency, true)}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              {userBalance > 0
                ? 'You are owed money by other group members'
                : userBalance < 0
                ? 'You owe money to group members'
                : 'You are completely settled in this group'}
            </p>
          </div>
        </Card>

        {/* Group Members Count & Quick Action */}
        <Card className="p-5 border-l-4 border-l-secondary flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Group Members
              </span>
              <div className="p-2 rounded-lg bg-secondary-muted text-secondary">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {members.length} People
              </div>
            </div>
          </div>
          <div className="pt-3">
            <Button size="sm" className="w-full" onClick={onAddExpense}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              <span>Add Expense</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Suggested Settlements Section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Smart Debt Simplification</h3>
            <p className="text-xs text-foreground-muted">
              Greedy algorithm resolves all outstanding group debts into minimal transfers
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('balances')}
            className="text-xs"
          >
            Full Balances
          </Button>
        </div>

        {suggestedSettlements.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-card-elevated/40 text-xs text-foreground-muted flex items-center justify-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-positive" />
            <span>Everyone is fully settled up! No outstanding transfers needed.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestedSettlements.map((s, idx) => {
              const fromProfile = getMemberProfile(s.fromUserId);
              const toProfile = getMemberProfile(s.toUserId);
              const isUserPayer = user?.id === s.fromUserId;
              const isUserReceiver = user?.id === s.toUserId;

              return (
                <div
                  key={idx}
                  className={cn(
                    'p-3.5 rounded-xl border border-border bg-card-elevated/40 flex flex-col justify-between space-y-3 transition-colors',
                    (isUserPayer || isUserReceiver) && 'border-primary/50 bg-primary-muted/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar name={fromProfile?.fullName || 'User'} size="xs" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {fromProfile?.fullName} {isUserPayer ? '(You)' : ''}
                      </span>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0 mx-2" />

                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar name={toProfile?.fullName || 'User'} size="xs" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {toProfile?.fullName} {isUserReceiver ? '(You)' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(s.amountMinor, group.currency)}
                    </span>
                    <Button
                      size="sm"
                      variant={isUserPayer ? 'primary' : 'outline'}
                      className="h-7 text-xs px-2.5"
                      onClick={() => onRecordSettlement(s.fromUserId, s.toUserId, s.amountMinor)}
                    >
                      Record Settlement
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Two Columns: Recent Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Expenses List (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Recent Expenses</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('expenses')}
              className="text-xs"
            >
              <span>View all ({expenses.length})</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <Card className="divide-y divide-border/60">
            {recentExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-foreground-muted">
                No expenses added to this group yet. Click "Add Expense" to get started!
              </div>
            ) : (
              recentExpenses.map((exp) => {
                const payerName = getMemberProfile(exp.payers[0]?.userId)?.fullName || 'Member';
                const isMulti = exp.payers.length > 1;

                return (
                  <div key={exp.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-foreground">{exp.title}</span>
                        <Badge variant="neutral" className="text-[10px]">
                          {exp.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-muted">
                        Paid by <strong className="text-foreground">{payerName}</strong>
                        {isMulti ? ` +${exp.payers.length - 1} more` : ''} • {exp.expenseDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        {formatCurrency(exp.amountMinor, group.currency)}
                      </div>
                      <span className="text-[11px] text-foreground-muted">
                        {exp.splits.length} participants
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Category Breakdown (1 Col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Spending by Category</h3>
            <PieChart className="h-4 w-4 text-foreground-muted" />
          </div>

          <Card className="p-4 space-y-3">
            {sortedCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground-muted">
                No category data available
              </div>
            ) : (
              sortedCategories.map(([cat, amt]) => {
                const percentage = totalGroupSpendingMinor > 0
                  ? Math.round((amt / totalGroupSpendingMinor) * 100)
                  : 0;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{cat}</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(amt, group.currency)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-card-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
