import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Group, Expense, Settlement, ActivityLog } from '../../types';
import { calculateGroupBalances, formatCurrency } from '../../engine/balanceEngine';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  PlusCircle,
  Compass,
  ArrowRight,
  Receipt,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Group metrics map: groupId -> { totalSpendingMinor, userNetBalanceMinor, memberCount, currency }
  const [groupMetrics, setGroupMetrics] = useState<
    Record<
      string,
      {
        totalSpendingMinor: number;
        userNetBalanceMinor: number;
        currency: string;
      }
    >
  >({});

  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const fetchedGroups = await dataService.getGroups();
      setGroups(fetchedGroups);

      const metricsMap: Record<string, { totalSpendingMinor: number; userNetBalanceMinor: number; currency: string }> = {};
      const allActivities: ActivityLog[] = [];

      for (const grp of fetchedGroups) {
        const expenses: Expense[] = await dataService.getExpenses(grp.id);
        const settlements: Settlement[] = await dataService.getSettlements(grp.id);
        const activities: ActivityLog[] = await dataService.getActivityLogs(grp.id);

        allActivities.push(...activities);

        const memberIds = grp.members?.map((m) => m.userId) || [user.id];
        const balances = calculateGroupBalances(memberIds, expenses, settlements);

        const userBalance = balances.get(user.id)?.netBalanceMinor ?? 0;
        const totalSpending = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

        metricsMap[grp.id] = {
          totalSpendingMinor: totalSpending,
          userNetBalanceMinor: userBalance,
          currency: grp.currency,
        };
      }

      setGroupMetrics(metricsMap);

      // Sort activities newest first
      allActivities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentActivities(allActivities.slice(0, 8));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute aggregate totals across all groups
  let totalYouOweMinor = 0;
  let totalOwedToYouMinor = 0;

  for (const m of Object.values(groupMetrics)) {
    if (m.userNetBalanceMinor < 0) {
      totalYouOweMinor += Math.abs(m.userNetBalanceMinor);
    } else if (m.userNetBalanceMinor > 0) {
      totalOwedToYouMinor += m.userNetBalanceMinor;
    }
  }

  const netOverallMinor = totalOwedToYouMinor - totalYouOweMinor;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Good evening, {user?.fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Here's a breakdown of your shared balances and active trips.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/groups')}
            className="flex items-center space-x-1.5"
          >
            <Compass className="h-4 w-4" />
            <span>Join with code</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/groups/create')}
            className="flex items-center space-x-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Group</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance Card */}
        <Card className="p-5 border-l-4 border-l-primary relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Overall Balance
            </span>
            <div className="p-2 rounded-lg bg-primary-muted text-primary">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={cn(
                'text-2xl font-bold tracking-tight',
                netOverallMinor > 0 && 'text-positive',
                netOverallMinor < 0 && 'text-negative',
                netOverallMinor === 0 && 'text-foreground'
              )}
            >
              {formatCurrency(netOverallMinor, 'INR', true)}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              {netOverallMinor > 0
                ? 'You are in credit across all groups'
                : netOverallMinor < 0
                ? 'You have outstanding debts to settle'
                : 'All your group expenses are settled'}
            </p>
          </div>
        </Card>

        {/* Total Owed To You */}
        <Card className="p-5 border-l-4 border-l-positive relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              You are owed
            </span>
            <div className="p-2 rounded-lg bg-positive-bg text-positive">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-positive">
              {formatCurrency(totalOwedToYouMinor, 'INR')}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              From friends across {groups.length} groups
            </p>
          </div>
        </Card>

        {/* Total You Owe */}
        <Card className="p-5 border-l-4 border-l-negative relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              You owe
            </span>
            <div className="p-2 rounded-lg bg-negative-bg text-negative">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-negative">
              {formatCurrency(totalYouOweMinor, 'INR')}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Pending peer-to-peer settlements
            </p>
          </div>
        </Card>

        {/* Active Groups */}
        <Card className="p-5 border-l-4 border-l-secondary relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Active Groups
            </span>
            <div className="p-2 rounded-lg bg-secondary-muted text-secondary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {groups.length}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Trips, roommates & events
            </p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Groups List (2 Cols) + Activity Timeline (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Groups List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Your Expense Groups</h2>
              <p className="text-xs text-foreground-muted">
                Manage group tabs, record expenses and track settlements
              </p>
            </div>
            <Link
              to="/groups"
              className="text-xs font-medium text-primary hover:underline flex items-center"
            >
              <span>View all</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl bg-card border border-border animate-pulse p-5"
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-muted text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No groups yet</h3>
              <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                Create a trip group or join an existing group with an invite link to start splitting bills.
              </p>
              <Button size="sm" onClick={() => navigate('/groups/create')}>
                Create First Group
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((group) => {
                const metric = groupMetrics[group.id] || {
                  totalSpendingMinor: 0,
                  userNetBalanceMinor: 0,
                  currency: group.currency,
                };
                const userBalance = metric.userNetBalanceMinor;
                const membersCount = group.members?.length || 0;

                return (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className="block group"
                  >
                    <Card className="h-full p-5 hover:border-primary/50 transition-all hover:shadow-elevated flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                {group.name}
                              </h3>
                            </div>
                            <p className="text-xs text-foreground-muted line-clamp-1">
                              {group.description || 'Shared expense group'}
                            </p>
                          </div>
                          <Badge variant="neutral" className="capitalize text-[10px]">
                            {group.groupType}
                          </Badge>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-foreground-muted">
                          <div className="flex items-center space-x-1.5">
                            <Users className="h-3.5 w-3.5 text-foreground-muted" />
                            <span>{membersCount} {membersCount === 1 ? 'member' : 'members'}</span>
                          </div>
                          <div>
                            <span>Total: </span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(metric.totalSpendingMinor, group.currency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        <span className="text-xs text-foreground-muted">Your balance:</span>
                        <div
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            userBalance > 0 && 'bg-positive-bg text-positive',
                            userBalance < 0 && 'bg-negative-bg text-negative',
                            userBalance === 0 && 'bg-card-elevated text-foreground-muted'
                          )}
                        >
                          {userBalance > 0 && `You get ${formatCurrency(userBalance, group.currency)}`}
                          {userBalance < 0 && `You owe ${formatCurrency(Math.abs(userBalance), group.currency)}`}
                          {userBalance === 0 && 'Settled up'}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Recent Group Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            <Layers className="h-4 w-4 text-foreground-muted" />
          </div>

          <Card className="p-4 divide-y divide-border/60">
            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground-muted">
                No recent activity recorded yet.
              </div>
            ) : (
              recentActivities.map((act) => {
                const group = groups.find((g) => g.id === act.groupId);
                const title = act.metadata?.title as string | undefined;
                const amountMinor = act.metadata?.amountMinor as number | undefined;

                return (
                  <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start space-x-3">
                    <div className="p-1.5 rounded-lg bg-card-elevated text-primary mt-0.5 shrink-0">
                      {act.action.includes('expense') ? (
                        <Receipt className="h-3.5 w-3.5" />
                      ) : act.action.includes('settlement') ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                      ) : (
                        <Users className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <strong className="font-semibold">
                          {act.actorProfile?.fullName || 'Member'}
                        </strong>{' '}
                        {act.action === 'created_group' && 'created group'}
                        {act.action === 'added_expense' && `added "${title}"`}
                        {act.action === 'updated_expense' && `updated "${title}"`}
                        {act.action === 'deleted_expense' && `deleted "${title}"`}
                        {act.action === 'recorded_settlement' && 'recorded a payment'}
                        {act.action === 'confirmed_settlement' && 'confirmed a settlement'}
                        {act.action === 'member_joined' && 'joined group'}
                      </p>
                      <div className="flex items-center space-x-2 text-[11px] text-foreground-muted mt-1">
                        {amountMinor !== undefined && (
                          <span className="font-medium text-foreground">
                            {formatCurrency(amountMinor, group?.currency || 'INR')}
                          </span>
                        )}
                        <span>•</span>
                        <span className="truncate">{group?.name}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(parseISO(act.createdAt), { addSuffix: true })}
                        </span>
                      </div>
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
