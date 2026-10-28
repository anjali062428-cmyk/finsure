import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface MetricBlockProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtext?: string;
  highlight?: boolean;
  color?: 'teal' | 'blue' | 'critical' | 'warning' | 'safe';
  className?: string;
}

export const MetricBlock: React.FC<MetricBlockProps> = ({
  label,
  value,
  change,
  trend = 'neutral',
  subtext,
  highlight = false,
  color = 'teal',
  className = '',
}) => {
  const colorMap = {
    teal: 'text-[#19D3C5]',
    blue: 'text-[#6C9CFF]',
    critical: 'text-[#FF4D5F]',
    warning: 'text-[#FFB84D]',
    safe: 'text-[#38D6A3]',
  }[color];

  return (
    <div
      className={`p-4 rounded-lg bg-[#0E1721] border border-white/10 transition-all hover:border-[rgba(25,211,197,0.3)] ${
        highlight ? 'ring-1 ring-[#19D3C5]/30 shadow-[0_0_24px_rgba(25,211,197,0.12)]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-mono text-[#8B9AAA] uppercase tracking-wider mb-1.5">
        <span>{label}</span>
        {change && (
          <span
            className={`inline-flex items-center space-x-0.5 text-[11px] font-semibold ${
              trend === 'up'
                ? 'text-[#FF4D5F]'
                : trend === 'down'
                ? 'text-[#38D6A3]'
                : 'text-[#8B9AAA]'
            }`}
          >
            {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
            <span>{change}</span>
          </span>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${colorMap}`}>
          {value}
        </span>
      </div>

      {subtext && (
        <p className="mt-1 text-[11px] text-[#8B9AAA] font-mono leading-tight">{subtext}</p>
      )}
    </div>
  );
};
