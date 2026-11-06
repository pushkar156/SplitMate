import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Database, ShieldCheck, RefreshCw, UserCheck } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { toast } from 'sonner';

export const DemoNoticeBanner: React.FC = () => {
  const { user, isLiveSupabase, switchDemoUser, availableDemoUsers } = useAuth();

  const handleResetData = () => {
    if (confirm('Reset demo group, expenses and settlements back to original 13-person Goa trip seed?')) {
      dataService.resetDemoData();
      toast.success('Data reset to original seed scenario');
      window.location.reload();
    }
  };

  if (isLiveSupabase) {
    return (
      <div className="bg-positive-bg border-b border-positive/30 px-4 py-1.5 text-xs text-positive flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-3.5 w-3.5" />
          <span className="font-medium">Supabase Production Live</span>
          <span className="text-[11px] opacity-80">— RLS and Cloud PostgreSQL active</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Authenticated as {user?.fullName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-elevated/90 backdrop-blur-md border-b border-border/70 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary text-white">
          DEMO SANDBOX
        </span>
        <span className="text-foreground-muted hidden sm:inline">
          Supabase credentials not configured in <code className="text-primary font-mono text-[11px]">.env</code>. Running local 13-person trip engine.
        </span>
        <span className="text-foreground-muted sm:hidden">
          Running local 13-person trip engine.
        </span>
      </div>

      <div className="flex items-center space-x-3 ml-auto">
        <div className="flex items-center space-x-1.5">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-foreground-muted hidden md:inline">Viewing as:</span>
          <select
            value={user?.id}
            onChange={(e) => switchDemoUser(e.target.value)}
            className="bg-card border border-border text-foreground rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
          >
            {availableDemoUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} {u.id === 'u-1' ? '(Admin)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleResetData}
          title="Reset data to initial state"
          className="flex items-center space-x-1 text-foreground-muted hover:text-foreground text-[11px] p-1 rounded hover:bg-card transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="hidden lg:inline">Reset Seed</span>
        </button>
      </div>
    </div>
  );
};
