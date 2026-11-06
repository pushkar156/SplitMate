import React from 'react';
import { Group, MemberBalance } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import { UserPlus, Crown, Mail } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface GroupMembersTabProps {
  group: Group;
  balances: Map<string, MemberBalance>;
  onOpenInviteModal: () => void;
}

export const GroupMembersTab: React.FC<GroupMembersTabProps> = ({
  group,
  balances,
  onOpenInviteModal,
}) => {
  const { user } = useAuth();
  const members = group.members || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Group Members ({members.length})
          </h3>
          <p className="text-xs text-foreground-muted">
            All participants eligible to add, split and settle expenses in this group
          </p>
        </div>

        <Button size="sm" onClick={onOpenInviteModal} className="w-full sm:w-auto">
          <UserPlus className="mr-1.5 h-4 w-4" />
          <span>Invite Friends</span>
        </Button>
      </div>

      <Card className="divide-y divide-border/60 overflow-hidden">
        {members.map((m) => {
          const b = balances.get(m.userId);
          const net = b?.netBalanceMinor ?? 0;
          const isUser = user?.id === m.userId;
          const isAdmin = m.role === 'admin';

          return (
            <div
              key={m.id}
              className={cn(
                'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                isUser && 'bg-card-elevated/30'
              )}
            >
              <div className="flex items-center space-x-3.5">
                <Avatar name={m.profile.fullName} src={m.profile.avatarUrl} size="md" />
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-foreground">
                      {m.profile.fullName}
                    </span>
                    {isUser && (
                      <Badge variant="default" className="text-[10px]">
                        You
                      </Badge>
                    )}
                    {isAdmin && (
                      <Badge variant="secondary" className="text-[10px] flex items-center space-x-1">
                        <Crown className="h-3 w-3 text-secondary" />
                        <span>Admin</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{m.profile.email || 'No email attached'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end sm:space-x-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 text-xs">
                <div>
                  <span className="text-foreground-muted block text-[11px]">Total Paid</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(b?.totalPaidMinor ?? 0, group.currency)}
                  </span>
                </div>

                <div>
                  <span className="text-foreground-muted block text-[11px]">Total Share</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(b?.totalShareMinor ?? 0, group.currency)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-foreground-muted block text-[11px]">Net Balance</span>
                  <span
                    className={cn(
                      'font-bold',
                      net > 0 && 'text-positive',
                      net < 0 && 'text-negative',
                      net === 0 && 'text-foreground'
                    )}
                  >
                    {formatCurrency(net, group.currency, true)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};
