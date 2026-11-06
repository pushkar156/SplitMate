import React, { useState, useEffect } from 'react';
import { Group } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  defaultPayerId?: string;
  defaultReceiverId?: string;
  defaultAmountMinor?: number;
  onRecord: (settlementData: {
    groupId: string;
    payerId: string;
    receiverId: string;
    amountMinor: number;
    note?: string;
    paymentReference?: string;
  }) => Promise<void>;
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  isOpen,
  onClose,
  group,
  defaultPayerId,
  defaultReceiverId,
  defaultAmountMinor,
  onRecord,
}) => {
  const members = group.members || [];

  const [payerId, setPayerId] = useState(defaultPayerId || members[0]?.userId || '');
  const [receiverId, setReceiverId] = useState(defaultReceiverId || members[1]?.userId || '');
  const [amountStr, setAmountStr] = useState(
    defaultAmountMinor ? (defaultAmountMinor / 100).toFixed(2) : ''
  );
  const [note, setNote] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultPayerId) setPayerId(defaultPayerId);
    if (defaultReceiverId) setReceiverId(defaultReceiverId);
    if (defaultAmountMinor) setAmountStr((defaultAmountMinor / 100).toFixed(2));
  }, [defaultPayerId, defaultReceiverId, defaultAmountMinor, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (payerId === receiverId) {
      toast.error('Payer and receiver cannot be the same person');
      return;
    }

    const amountMinor = Math.round((parseFloat(amountStr) || 0) * 100);
    if (amountMinor <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRecord({
        groupId: group.id,
        payerId,
        receiverId,
        amountMinor,
        note: note.trim() || undefined,
        paymentReference: paymentRef.trim() || undefined,
      });

      toast.success('Settlement recorded! Awaiting confirmation from receiver.');
      onClose();
    } catch {
      toast.error('Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record External Payment"
      description="Record an off-platform payment (UPI, cash, bank transfer) made between members"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payer and Receiver selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground-muted">Payer (Who paid)</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId} disabled={m.userId === receiverId}>
                  {m.profile.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground-muted">Receiver (Who got paid)</label>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId} disabled={m.userId === payerId}>
                  {m.profile.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <Input
          label={`Settlement Amount (${group.currency})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          required
        />

        {/* Note / Mode */}
        <Input
          label="Payment Note / Method (Optional)"
          placeholder="e.g. Paid via Google Pay, PhonePe, Cash at villa"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Payment reference */}
        <Input
          label="Transaction ID / UPI Reference (Optional)"
          placeholder="e.g. UPI-19827392819"
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
        />

        <div className="p-3 rounded-lg bg-card-elevated text-xs text-foreground-muted flex items-start space-x-2">
          <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
          <span>
            Settlements are recorded in <strong>Pending</strong> status until confirmed by the receiver or group admin to avoid double-counting.
          </span>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
