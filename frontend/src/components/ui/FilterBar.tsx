import React from 'react';
import { Filter, X } from 'lucide-react';
import { Search } from './Search';
import { Button } from './Button';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterField {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterField[];
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
  hasActiveFilters = false,
  className = '',
  children,
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border rounded-lg ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
        {onSearchChange && (
          <div className="w-full sm:w-64">
            <Search
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.id} className="min-w-[140px]">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              aria-label={filter.label}
              className="w-full h-9 px-3 py-1.5 text-xs bg-surface-muted border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{filter.label} (All)</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {children}

        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-text-muted hover:text-text h-9 flex items-center space-x-1"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            <span>Reset Filters</span>
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2 shrink-0 text-text-muted text-xs">
        <Filter className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Filters</span>
      </div>
    </div>
  );
};
