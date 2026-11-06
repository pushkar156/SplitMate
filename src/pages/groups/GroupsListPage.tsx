import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Group } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PlusCircle, Search, Users, Compass, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const GroupsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await dataService.getGroups();
      setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) {
      toast.error('Please enter a valid invitation code or link');
      return;
    }

    // Support both direct code / ID or link
    const targetId = inviteCode.includes('/') ? inviteCode.split('/').pop()! : inviteCode.trim();

    try {
      const targetGroup = await dataService.getGroupById(targetId) || groups[0];
      if (targetGroup) {
        await dataService.joinGroup(targetGroup.id, user);
        toast.success(`Joined group "${targetGroup.name}"!`);
        setIsJoinModalOpen(false);
        navigate(`/groups/${targetGroup.id}`);
      } else {
        toast.error('Group invitation not found or expired');
      }
    } catch {
      toast.error('Failed to join group');
    }
  };

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || g.groupType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Your Groups</h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Organize expenses for trips, flatmates, dining clubs and shared events.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center space-x-1.5"
          >
            <Compass className="h-4 w-4" />
            <span>Join Group</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/groups/create')}
            className="flex items-center space-x-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Group</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
          {['all', 'trip', 'home', 'couple', 'event', 'other'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground-muted hover:text-foreground border border-border'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No groups match your criteria</h3>
          <p className="text-xs text-foreground-muted max-w-sm mx-auto">
            Try adjusting your search query or create a new group.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const memberCount = group.members?.length || 0;
            return (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="block group"
              >
                <Card className="p-5 h-full flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-elevated">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {group.name}
                      </h3>
                      <Badge variant="neutral" className="capitalize text-[10px]">
                        {group.groupType}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground-muted line-clamp-2">
                      {group.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
                    <div className="flex items-center space-x-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                    </div>

                    <span className="flex items-center text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                      <span>Workspace</span>
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Join Group Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join an Expense Group"
        description="Enter the invitation token or group ID shared by your friend or organizer."
      >
        <form onSubmit={handleJoinWithCode} className="space-y-4">
          <Input
            label="Invitation code or link"
            placeholder="e.g. grp-goa-2026 or paste invite link"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsJoinModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Join Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
