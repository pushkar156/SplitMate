import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { DemoNoticeBanner } from './DemoNoticeBanner';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Moon,
  Sun,
  Laptop,
  LogOut,
  Receipt,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Groups', path: '/groups', icon: Users },
    { label: 'New Group', path: '/groups/create', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DemoNoticeBanner />

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex items-center space-x-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-foreground font-heading">SplitMate</span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-muted text-primary border border-primary/20">
                  Retro
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-card-elevated text-primary font-semibold'
                        : 'text-foreground-muted hover:text-foreground hover:bg-card-elevated/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Selector */}
            <div className="flex items-center bg-card-elevated rounded-lg p-0.5 border border-border">
              <button
                onClick={() => setTheme('dark')}
                title="Dark theme"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors',
                  theme === 'dark'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme('light')}
                title="Light theme"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors',
                  theme === 'light'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                title="System theme"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors',
                  theme === 'system'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* User Profile & Sign Out */}
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-border">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold leading-tight text-foreground">{user.fullName}</p>
                  <p className="text-[11px] text-foreground-muted truncate max-w-[140px]">
                    {user.email || 'Group Member'}
                  </p>
                </div>
                <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="p-1.5 text-foreground-muted hover:text-negative hover:bg-card-elevated rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-medium text-primary hover:underline px-2 py-1"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border py-2 px-4 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary font-semibold' : 'text-foreground-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

