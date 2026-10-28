import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'sunken' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'rounded-card border transition-all';

  const variants = {
    default: 'bg-surface border-border shadow-subtle',
    elevated: 'bg-surface-elevated border-border-strong shadow-card',
    sunken: 'bg-surface-sunken border-border',
    bordered: 'bg-transparent border-border',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div className={twMerge(clsx(baseStyles, variants[variant], paddings[padding], className))} {...props}>
      {children}
    </div>
  );
};
