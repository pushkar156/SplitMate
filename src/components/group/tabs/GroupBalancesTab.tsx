import React from 'react';
import { Group, MemberBalance, SuggestedSettlement, UserProfile } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency, verifyBalanceConservation } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { Badge } from '../../ui/Badge';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface GroupBalancesTabProps {
  group: Group;
  balances: Map<string, MemberBalance>;
  suggestedSettlements: SuggestedSettlement[];
  onRecordSettlement: (fromUserId?: string, toUserId?: string, amountMinor?: number) => void;
}

export const GroupBalancesTab: React.FC<GroupBalancesTabProps> = ({
  group,
  balances,
  suggestedSettlements,
  onRecordSettlement,
}) => {
  const { user } = useAuth();
  const members = group.members || [];
  const isConserved = verifyBalanceConservation(balances);

  const getMemberProfile = (userId: string): UserProfile | undefined => {
    return members.find((m) => m.userId === userId)?.profile;
  };

  // Convert balances map to sorted array (creditors first, then settled, then debtors)
  const balanceList = Array.from(balances.values()).sort(
    (a, b) => b.netBalanceMinor - a.netBalanceMinor
  );

  return (
    <div className="space-y-6">
      {/* Mathematical Conservation Banner */}
      <div
        className={cn(
          'p-3.5 rounded-xl border flex items-center justify-between text-xs',
          isConserved
            ? 'bg-positive-bg border-positive/30 text-positive'
            : 'bg-negative-bg border-negative/30 text-negative'
        )}
      >
        <div className="flex items-center space-x-2">
          {isConserved ? (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-medium">
            {isConserved
              ? 'Zero-Sum Mathematical Conservation Verified — Total group credits strictly equal total debts to the exact paise.'
              : 'Balance discrepancy detected. Please audit recorded expenses.'}
          </span>
        </div>

        <Badge variant={isConserved ? 'positive' : 'negative'} className="text-[10px]">
          Σ Net = {formatCurrency(0, group.currency)}
        </Badge>
      </div>

      {/* Suggested Settlements (Smart Debt Simplification) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Simplified Debt Settlements
          </h3>
          <p className="text-xs text-foreground-muted">
            Instead of complicated circular payments, settling these {suggestedSettlements.length}{' '}
            transfers completely settles the entire group.
          </p>
        </div>

        {suggestedSettlements.length === 0 ? (
          <Card className="p-8 text-center text-xs text-foreground-muted flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="h-6 w-6 text-positive" />
            <p className="font-semibold text-foreground">Zero Outstanding Debt</p>
            <p>All members are settled up or all expenses have been paid off.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestedSettlements.map((s, idx) => {
              const fromProfile = getMemberProfile(s.fromUserId);
              const toProfile = getMemberProfile(s.toUserId);
              const isUserPayer = user?.id === s.fromUserId;
              const isUserReceiver = user?.id === s.toUserId;

              return (
                <Card
                  key={idx}
                  className={cn(
                    'p-4 flex flex-col justify-between space-y-3 transition-colors',
                    (isUserPayer || isUserReceiver) && 'border-primary/50 bg-primary-muted/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar name={fromProfile?.fullName || 'User'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {fromProfile?.fullName}
                        </p>
                        <span className="text-[10px] text-negative font-medium">Owes</span>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-foreground-muted shrink-0 mx-2" />

                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar name={toProfile?.fullName || 'User'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {toProfile?.fullName}
                        </p>
                        <span className="text-[10px] text-positive font-medium">Receives</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div>
                      <span className="text-xs text-foreground-muted block">Amount</span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(s.amountMinor, group.currency)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant={isUserPayer ? 'primary' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() =>
                        onRecordSettlement(s.fromUserId, s.toUserId, s.amountMinor)
                      }
                    >
                      Record Payment
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Member Balances Table */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">
          Individual Member Balance Breakdown
        </h3>

        <Card className="divide-y divide-border/60 overflow-hidden">
          {balanceList.map((b) => {
            const profile = getMemberProfile(b.userId);
            const isUser = user?.id === b.userId;

            return (
              <div
                key={b.userId}
                className={cn(
                  'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  isUser && 'bg-card-elevated/40'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Avatar name={profile?.fullName || 'User'} size="md" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {profile?.fullName || 'Member'}
                      </h4>
                      {isUser && (
                        <Badge variant="default" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted">
                      Paid {formatCurrency(b.totalPaidMinor, group.currency)} • Share{' '}
                      {formatCurrency(b.totalShareMinor, group.currency)}
                      {b.netSettlementPaidMinor > 0 &&
                        ` • Settled ${formatCurrency(b.netSettlementPaidMinor, group.currency)}`}
                      {b.netSettlementReceivedMinor > 0 &&
                        ` • Received ${formatCurrency(b.netSettlementReceivedMinor, group.currency)}`}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div
                    className={cn(
                      'text-base font-bold',
                      b.netBalanceMinor > 0 && 'text-positive',
                      b.netBalanceMinor < 0 && 'text-negative',
                      b.netBalanceMinor === 0 && 'text-foreground'
                    )}
                  >
                    {formatCurrency(b.netBalanceMinor, group.currency, true)}
                  </div>
                  <span className="text-[11px] text-foreground-muted">
                    {b.netBalanceMinor > 0 && 'gets back'}
                    {b.netBalanceMinor < 0 && 'owes'}
                    {b.netBalanceMinor === 0 && 'settled up'}
                  </span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
};
