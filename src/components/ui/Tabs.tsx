import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={cn(
        'flex space-x-1 border-b border-border overflow-x-auto no-scrollbar scroll-smooth',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'group flex items-center space-x-2 whitespace-nowrap border-b-2 py-3 px-4 text-xs font-medium transition-all select-none',
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
            )}
          >
            {tab.icon && (
              <span
                className={cn(
                  'transition-colors',
                  isActive ? 'text-primary' : 'text-foreground-muted group-hover:text-foreground'
                )}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-card-elevated text-foreground-muted'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
