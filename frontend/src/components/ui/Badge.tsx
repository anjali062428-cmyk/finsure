import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-badge select-none border';

  const variants = {
    default: 'bg-surface-elevated border-border text-text-secondary',
    success: 'bg-success-bg border-success-border text-success',
    warning: 'bg-warning-bg border-warning-border text-warning',
    danger: 'bg-danger-bg border-danger-border text-danger',
    info: 'bg-info-bg border-info-border text-info',
    accent: 'bg-accent/10 border-accent/30 text-accent',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 leading-none',
    md: 'text-xs px-2.5 py-1 leading-tight',
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))} {...props}>
      {children}
    </span>
  );
};
