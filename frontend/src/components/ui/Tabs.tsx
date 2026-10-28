import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'segmented';
  className?: string;
  size?: 'sm' | 'md';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
  size = 'md',
}) => {
  const isSegmented = variant === 'segmented';
  const isPills = variant === 'pills';

  const containerClasses = {
    underline: 'flex border-b border-border space-x-6',
    pills: 'flex space-x-2',
    segmented: 'inline-flex p-1 bg-surface-muted rounded-md border border-border space-x-1',
  }[variant];

  const sizeClasses = size === 'sm' ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4';

  return (
    <nav
      className={`${containerClasses} ${className}`}
      role="tablist"
      aria-orientation="horizontal"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        let tabStyle = '';
        if (variant === 'underline') {
          tabStyle = isActive
            ? 'border-b-2 border-accent text-accent font-semibold'
            : 'border-b-2 border-transparent text-text-muted hover:text-text hover:border-border';
        } else if (isPills) {
          tabStyle = isActive
            ? 'bg-accent text-white font-medium rounded-md'
            : 'text-text-muted hover:bg-surface-elevated hover:text-text rounded-md';
        } else if (isSegmented) {
          tabStyle = isActive
            ? 'bg-surface text-text font-medium shadow-sm rounded'
            : 'text-text-muted hover:text-text rounded';
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={`flex items-center space-x-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${sizeClasses} ${tabStyle} ${
              tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-xs font-mono rounded-full ${
                  isActive
                    ? 'bg-accent-muted text-accent'
                    : 'bg-surface-muted text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
