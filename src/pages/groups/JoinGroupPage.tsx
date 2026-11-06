import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Group } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Users, Receipt, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const JoinGroupPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (token) {
      loadGroup();
    }
  }, [token]);

  const loadGroup = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const g = await dataService.getGroupById(token);
      setGroup(g);
    } catch {
      toast.error('Invitation link not found or expired');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!group || !user) {
      navigate('/login');
      return;
    }

    setIsJoining(true);
    try {
      await dataService.joinGroup(group.id, user);
      toast.success(`You joined ${group.name}!`);
      navigate(`/groups/${group.id}`);
    } catch {
      toast.error('Failed to join group');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Invalid Invitation</h2>
        <p className="text-xs text-foreground-muted">
          This invitation link is invalid or has expired. Please ask the group admin for a new link.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const isAlreadyMember = group.members?.some((m) => m.userId === user?.id);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-6 shadow-elevated">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-card">
          <Receipt className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <Badge variant="neutral" className="capitalize text-xs">
            {group.groupType} Group
          </Badge>
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          <p className="text-xs text-foreground-muted">
            {group.description || 'Shared expense tab on SplitMate'}
          </p>
        </div>

        {/* Member preview stack */}
        <div className="p-4 bg-card-elevated/50 rounded-xl border border-border space-y-2">
          <span className="text-xs text-foreground-muted flex items-center justify-center space-x-1">
            <Users className="h-3.5 w-3.5" />
            <span>{group.members?.length || 0} members already joined</span>
          </span>
          <div className="flex justify-center -space-x-2 pt-1">
            {group.members?.slice(0, 6).map((m) => (
              <Avatar
                key={m.id}
                name={m.profile.fullName}
                src={m.profile.avatarUrl}
                size="sm"
                className="border-2 border-card"
              />
            ))}
          </div>
        </div>

        <div>
          {isAlreadyMember ? (
            <div className="space-y-3">
              <p className="text-xs text-positive font-medium flex items-center justify-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>You are already a member of this group</span>
              </p>
              <Button className="w-full" onClick={() => navigate(`/groups/${group.id}`)}>
                <span>Open Group Workspace</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button className="w-full" isLoading={isJoining} onClick={handleJoin}>
              <span>Join {group.name}</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
