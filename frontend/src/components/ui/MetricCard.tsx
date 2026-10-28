import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface MetricCardProps {
  label?: string;
  title?: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  helperText?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  title,
  value,
  change,
  changeType = 'neutral',
  helperText,
  subtitle,
  icon,
  badge,
  variant = 'default',
  className,
}) => {
  const displayLabel = label || title || '';
  const displaySub = helperText || subtitle;

  const variantBorder = {
    default: '',
    elevated: '',
    success: 'border-risk-low/40 bg-risk-low/5',
    warning: 'border-risk-medium/40 bg-risk-medium/5',
    danger: 'border-risk-critical/40 bg-risk-critical/5',
  }[variant];

  const cardVariant = variant === 'elevated' ? 'elevated' : 'default';

  return (
    <Card variant={cardVariant} padding="md" className={clsx('flex flex-col justify-between gap-3', variantBorder, className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider select-none truncate font-mono">
          {displayLabel}
        </span>
        {badge ? (
          badge
        ) : icon ? (
          <div className="text-text-muted p-1.5 rounded bg-surface-muted flex items-center justify-center">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-text font-mono">
          {value}
        </span>

        {(change || displaySub) && (
          <div className="flex items-center gap-2 text-xs">
            {change && (
              <span
                className={clsx(
                  'inline-flex items-center gap-0.5 font-medium',
                  changeType === 'positive' && 'text-risk-low',
                  changeType === 'negative' && 'text-risk-critical',
                  changeType === 'neutral' && 'text-text-muted'
                )}
              >
                {changeType === 'positive' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {changeType === 'negative' && <ArrowDownRight className="w-3.5 h-3.5" />}
                {changeType === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                {change}
              </span>
            )}
            {displaySub && <span className="text-text-muted truncate">{displaySub}</span>}
          </div>
        )}
      </div>
    </Card>
  );
};
