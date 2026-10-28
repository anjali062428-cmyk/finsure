import React from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input, InputProps } from './Input';

export interface SearchProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void;
}

export const Search: React.FC<SearchProps> = ({ value, onClear, onChange, placeholder = 'Search...', ...props }) => {
  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      leftIcon={<SearchIcon className="w-4 h-4" />}
      rightIcon={
        value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 hover:text-text-primary rounded"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : undefined
      }
      {...props}
    />
  );
};
