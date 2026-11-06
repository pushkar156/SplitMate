import React, { useState } from 'react';
import { Group, Settlement, UserProfile } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import {
  CheckCircle2,
  Clock,
  XCircle,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface GroupSettlementsTabProps {
  group: Group;
  settlements: Settlement[];
  onOpenRecordModal: () => void;
  onConfirmSettlement: (settlementId: string) => Promise<void>;
  onDisputeSettlement: (settlementId: string) => Promise<void>;
}

export const GroupSettlementsTab: React.FC<GroupSettlementsTabProps> = ({
  group,
  settlements,
  onOpenRecordModal,
  onConfirmSettlement,
  onDisputeSettlement,
}) => {
  const { user } = useAuth();
  const members = group.members || [];
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const getMemberProfile = (userId: string): UserProfile | undefined => {
    return members.find((m) => m.userId === userId)?.profile;
  };

  const isUserAdmin = members.some((m) => m.userId === user?.id && m.role === 'admin');

  const filteredSettlements = settlements.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const handleConfirm = async (settlementId: string) => {
    setIsProcessing(settlementId);
    try {
      await onConfirmSettlement(settlementId);
      toast.success('Settlement confirmed and authoritative balances updated!');
    } catch {
      toast.error('Failed to confirm settlement');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDispute = async (settlementId: string) => {
    if (confirm('Dispute this settlement? It will not be counted in balances.')) {
      setIsProcessing(settlementId);
      try {
        await onDisputeSettlement(settlementId);
        toast.info('Settlement marked as disputed/rejected');
      } catch {
        toast.error('Failed to dispute settlement');
      } finally {
        setIsProcessing(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1 p-1 bg-card-elevated rounded-lg border border-border text-xs w-full sm:w-auto">
          {(['all', 'pending', 'confirmed'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                filter === mode
                  ? 'bg-card text-primary shadow-xs font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={onOpenRecordModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-1.5 h-4 w-4" />
          <span>Record Settlement</span>
        </Button>
      </div>

      {/* Settlements List */}
      <Card className="divide-y divide-border/60 overflow-hidden">
        {filteredSettlements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary-muted text-secondary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No settlements recorded</h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              When group members pay each other outside SplitMate (via UPI, cash or bank transfer), record it here to settle outstanding balances.
            </p>
          </div>
        ) : (
          filteredSettlements.map((s) => {
            const payerProfile = getMemberProfile(s.payerId);
            const receiverProfile = getMemberProfile(s.receiverId);
            const isReceiver = user?.id === s.receiverId;
            const canConfirm = (isReceiver || isUserAdmin) && s.status === 'pending';

            return (
              <div
                key={s.id}
                className="p-4 hover:bg-card-elevated/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <Avatar name={payerProfile?.fullName || 'User'} size="xs" />
                      <strong className="text-foreground">{payerProfile?.fullName}</strong>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />

                    <div className="flex items-center space-x-1.5">
                      <Avatar name={receiverProfile?.fullName || 'User'} size="xs" />
                      <strong className="text-foreground">{receiverProfile?.fullName}</strong>
                    </div>

                    <Badge
                      variant={
                        s.status === 'confirmed'
                          ? 'positive'
                          : s.status === 'pending'
                          ? 'secondary'
                          : 'negative'
                      }
                      className="capitalize ml-2 text-[10px]"
                    >
                      {s.status === 'confirmed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {s.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {s.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {s.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-foreground-muted space-y-0.5">
                    {s.note && <p>"{s.note}"</p>}
                    <p className="text-[11px]">
                      {s.paymentReference && `Ref: ${s.paymentReference} • `}
                      Recorded {formatDistanceToNow(parseISO(s.createdAt), { addSuffix: true })}
                      {s.confirmedAt && ` • Confirmed ${formatDistanceToNow(parseISO(s.confirmedAt), { addSuffix: true })}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                  <div className="text-left sm:text-right">
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(s.amountMinor, group.currency)}
                    </span>
                    <p className="text-[10px] text-foreground-muted">
                      {s.status === 'confirmed'
                        ? 'Applied to balances'
                        : s.status === 'pending'
                        ? 'Pending receiver confirmation'
                        : 'Disputed'}
                    </p>
                  </div>

                  {canConfirm && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="positive"
                        onClick={() => handleConfirm(s.id)}
                        isLoading={isProcessing === s.id}
                        className="h-8 text-xs px-2.5"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDispute(s.id)}
                        disabled={isProcessing === s.id}
                        className="h-8 text-xs px-2"
                      >
                        Dispute
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
};
