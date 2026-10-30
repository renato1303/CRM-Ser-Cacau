import React from 'react';
import { cn } from '../../utils/cn';

interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className
}) => {
  return (
    <div className={cn('flex shrink-0 border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto', className)}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2',
              isActive
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
