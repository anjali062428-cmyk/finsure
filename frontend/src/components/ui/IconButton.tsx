import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-button transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white shadow-subtle',
    secondary: 'bg-surface-elevated hover:bg-border text-text-primary border border-border',
    outline: 'border border-border-strong hover:bg-surface-elevated text-text-primary bg-transparent',
    danger: 'bg-danger hover:bg-red-600 text-white shadow-subtle',
    ghost: 'hover:bg-surface-elevated text-text-secondary hover:text-text-primary bg-transparent',
  };

  const sizes = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-9 h-9 p-1.5 text-sm',
    lg: 'w-11 h-11 p-2 text-base',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {icon}
    </button>
  );
};
