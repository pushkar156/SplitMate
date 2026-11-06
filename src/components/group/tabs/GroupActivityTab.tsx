import React from 'react';
import { Group, ActivityLog, UserProfile } from '../../../types';
import { formatCurrency } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Avatar } from '../../ui/Avatar';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface GroupActivityTabProps {
  group: Group;
  activities: ActivityLog[];
}

export const GroupActivityTab: React.FC<GroupActivityTabProps> = ({ group, activities }) => {
  const members = group.members || [];

  const getMemberProfile = (userId: string): UserProfile | undefined => {
    return members.find((m) => m.userId === userId)?.profile;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Activity Timeline</h3>
        <p className="text-xs text-foreground-muted">
          Audit trail of all expenses, modifications and settlement events
        </p>
      </div>

      <Card className="p-4 divide-y divide-border/60">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-foreground-muted">
            No activity logged for this group yet.
          </div>
        ) : (
          activities.map((act) => {
            const actor = act.actorProfile || getMemberProfile(act.actorId);
            const title = act.metadata?.title as string | undefined;
            const amountMinor = act.metadata?.amountMinor as number | undefined;

            return (
              <div key={act.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start space-x-3.5">
                <Avatar name={actor?.fullName || 'User'} size="sm" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    <strong className="font-semibold text-foreground">{actor?.fullName || 'User'}</strong>{' '}
                    {act.action === 'created_group' && `created the group "${group.name}"`}
                    {act.action === 'added_expense' && (
                      <>
                        added expense <strong className="text-foreground">"{title}"</strong>
                      </>
                    )}
                    {act.action === 'updated_expense' && (
                      <>
                        edited expense <strong className="text-foreground">"{title}"</strong>
                      </>
                    )}
                    {act.action === 'deleted_expense' && (
                      <>
                        deleted expense <strong className="text-foreground">"{title}"</strong>
                      </>
                    )}
                    {act.action === 'recorded_settlement' && 'recorded a payment'}
                    {act.action === 'confirmed_settlement' && 'confirmed a payment'}
                    {act.action === 'rejected_settlement' && 'disputed a settlement'}
                    {act.action === 'member_joined' && 'joined the group'}
                  </p>

                  <div className="flex items-center space-x-2 text-[11px] text-foreground-muted mt-1">
                    {amountMinor !== undefined && (
                      <span className="font-semibold text-foreground">
                        {formatCurrency(amountMinor, group.currency)}
                      </span>
                    )}
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
  );
};
