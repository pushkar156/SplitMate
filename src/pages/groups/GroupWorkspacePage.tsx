import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { Group, Expense, Settlement, ActivityLog, MemberBalance, SuggestedSettlement } from '../../types';
import { calculateGroupBalances, simplifyDebts } from '../../engine/balanceEngine';
import { Tabs, TabItem } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Receipt,
  Scale,
  CheckCircle2,
  Users,
  Layers,
  BarChart3,
  PlusCircle,
  Share2,
  ArrowLeft,
} from 'lucide-react';
import { GroupOverviewTab } from '../../components/group/tabs/GroupOverviewTab';
import { GroupExpensesTab } from '../../components/group/tabs/GroupExpensesTab';
import { GroupBalancesTab } from '../../components/group/tabs/GroupBalancesTab';
import { GroupSettlementsTab } from '../../components/group/tabs/GroupSettlementsTab';
import { GroupMembersTab } from '../../components/group/tabs/GroupMembersTab';
import { GroupActivityTab } from '../../components/group/tabs/GroupActivityTab';
import { GroupAnalyticsTab } from '../../components/group/tabs/GroupAnalyticsTab';
import { AddExpenseModal } from '../../components/group/AddExpenseModal';
import { RecordSettlementModal } from '../../components/group/RecordSettlementModal';
import { InviteMemberModal } from '../../components/group/InviteMemberModal';
import { toast } from 'sonner';

export const GroupWorkspacePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementDefaults, setSettlementDefaults] = useState<{
    payerId?: string;
    receiverId?: string;
    amountMinor?: number;
  }>({});

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroupWorkspace();
    }
  }, [groupId]);

  const loadGroupWorkspace = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const g = await dataService.getGroupById(groupId);
      if (!g) {
        toast.error('Group not found');
        navigate('/groups');
        return;
      }
      setGroup(g);

      const expList = await dataService.getExpenses(groupId);
      setExpenses(expList);

      const setList = await dataService.getSettlements(groupId);
      setSettlements(setList);

      const actList = await dataService.getActivityLogs(groupId);
      setActivities(actList);
    } catch (err) {
      console.error('Failed to load group workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const memberIds = group?.members?.map((m) => m.userId) || [];
  const balances: Map<string, MemberBalance> = calculateGroupBalances(
    memberIds,
    expenses,
    settlements
  );
  const suggestedSettlements: SuggestedSettlement[] = simplifyDebts(balances);

  // Pending settlements count
  const pendingCount = settlements.filter((s) => s.status === 'pending').length;

  // Handlers
  const handleSaveExpense = async (data: any) => {
    if (!group) return;
    if (expenseToEdit) {
      await dataService.updateExpense(expenseToEdit.id, data);
    } else {
      await dataService.createExpense({ ...data, groupId: group.id });
    }
    await loadGroupWorkspace();
    setExpenseToEdit(null);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await dataService.deleteExpense(expenseId);
    await loadGroupWorkspace();
  };

  const handleRecordSettlement = async (data: any) => {
    await dataService.recordSettlement(data);
    await loadGroupWorkspace();
  };

  const handleConfirmSettlement = async (settlementId: string) => {
    await dataService.confirmSettlement(settlementId);
    await loadGroupWorkspace();
  };

  const handleDisputeSettlement = async (settlementId: string) => {
    await dataService.disputeSettlement(settlementId);
    await loadGroupWorkspace();
  };

  const openSettlementWithPrefill = (fromUserId?: string, toUserId?: string, amountMinor?: number) => {
    setSettlementDefaults({
      payerId: fromUserId,
      receiverId: toUserId,
      amountMinor,
    });
    setIsSettlementModalOpen(true);
  };

  if (loading || !group) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-card rounded" />
        <div className="h-28 bg-card rounded-xl" />
        <div className="h-64 bg-card rounded-xl" />
      </div>
    );
  }

  const workspaceTabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <Receipt className="h-4 w-4" />,
      badge: expenses.length,
    },
    { id: 'balances', label: 'Balances', icon: <Scale className="h-4 w-4" /> },
    {
      id: 'settlements',
      label: 'Settlements',
      icon: <CheckCircle2 className="h-4 w-4" />,
      badge: pendingCount > 0 ? `${pendingCount} pending` : undefined,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <Users className="h-4 w-4" />,
      badge: group.members?.length,
    },
    { id: 'activity', label: 'Activity', icon: <Layers className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <Link
            to="/groups"
            className="inline-flex items-center text-xs font-medium text-foreground-muted hover:text-foreground mb-1"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to groups
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {group.name}
            </h1>
            <Badge variant="neutral" className="capitalize text-xs">
              {group.groupType}
            </Badge>
            <Badge variant="default" className="text-xs">
              {group.currency}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted">
            {group.description || 'Shared expense tab'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center space-x-1.5"
          >
            <Share2 className="h-4 w-4" />
            <span>Invite</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
            className="flex items-center space-x-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs tabs={workspaceTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <GroupOverviewTab
            group={group}
            expenses={expenses}
            settlements={settlements}
            balances={balances}
            suggestedSettlements={suggestedSettlements}
            onAddExpense={() => {
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
            onRecordSettlement={openSettlementWithPrefill}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'expenses' && (
          <GroupExpensesTab
            group={group}
            expenses={expenses}
            onAddExpense={() => {
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
            onEditExpense={(exp) => {
              setExpenseToEdit(exp);
              setIsExpenseModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'balances' && (
          <GroupBalancesTab
            group={group}
            balances={balances}
            suggestedSettlements={suggestedSettlements}
            onRecordSettlement={openSettlementWithPrefill}
          />
        )}

        {activeTab === 'settlements' && (
          <GroupSettlementsTab
            group={group}
            settlements={settlements}
            onOpenRecordModal={() => openSettlementWithPrefill()}
            onConfirmSettlement={handleConfirmSettlement}
            onDisputeSettlement={handleDisputeSettlement}
          />
        )}

        {activeTab === 'members' && (
          <GroupMembersTab
            group={group}
            balances={balances}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
          />
        )}

        {activeTab === 'activity' && (
          <GroupActivityTab group={group} activities={activities} />
        )}

        {activeTab === 'analytics' && (
          <GroupAnalyticsTab
            group={group}
            expenses={expenses}
            settlements={settlements}
            balances={balances}
          />
        )}
      </div>

      {/* Modals */}
      {isExpenseModalOpen && (
        <AddExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setExpenseToEdit(null);
          }}
          group={group}
          expenseToEdit={expenseToEdit}
          onSave={handleSaveExpense}
        />
      )}

      {isSettlementModalOpen && (
        <RecordSettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          group={group}
          defaultPayerId={settlementDefaults.payerId}
          defaultReceiverId={settlementDefaults.receiverId}
          defaultAmountMinor={settlementDefaults.amountMinor}
          onRecord={handleRecordSettlement}
        />
      )}

      {isInviteModalOpen && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          group={group}
        />
      )}
    </div>
  );
};
