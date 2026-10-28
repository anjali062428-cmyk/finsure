import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, AlertOctagon } from 'lucide-react';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  label,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const configs = {
    safe: {
      color: 'text-[#38D6A3] bg-[rgba(56,214,163,0.12)] border-[rgba(56,214,163,0.3)]',
      icon: <ShieldCheck className="shrink-0" />,
      defaultText: 'SAFE',
    },
    low: {
      color: 'text-[#38D6A3] bg-[rgba(56,214,163,0.12)] border-[rgba(56,214,163,0.3)]',
      icon: <ShieldCheck className="shrink-0" />,
      defaultText: 'LOW RISK',
    },
    medium: {
      color: 'text-[#FFB84D] bg-[rgba(255,184,77,0.12)] border-[rgba(255,184,77,0.3)]',
      icon: <AlertTriangle className="shrink-0" />,
      defaultText: 'MONITOR',
    },
    high: {
      color: 'text-[#FF8533] bg-[rgba(255,133,51,0.12)] border-[rgba(255,133,51,0.35)]',
      icon: <ShieldAlert className="shrink-0" />,
      defaultText: 'REVIEW',
    },
    critical: {
      color: 'text-[#FF4D5F] bg-[rgba(255,77,95,0.14)] border-[rgba(255,77,95,0.4)] shadow-[0_0_12px_rgba(255,77,95,0.25)]',
      icon: <AlertOctagon className="shrink-0" />,
      defaultText: 'CRITICAL FRAUD',
    },
  }[level];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1 font-mono [&_svg]:w-3 [&_svg]:h-3',
    md: 'text-xs px-2.5 py-1 space-x-1.5 font-mono [&_svg]:w-3.5 [&_svg]:h-3.5',
    lg: 'text-sm px-3.5 py-1.5 space-x-2 font-mono [&_svg]:w-4 [&_svg]:h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wider rounded border uppercase ${configs.color} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Risk state: ${label || configs.defaultText}${score !== undefined ? ` score ${score}` : ''}`}
    >
      {showIcon && configs.icon}
      <span>{label || configs.defaultText}</span>
      {score !== undefined && (
        <span className="font-mono text-white/90 pl-1 border-l border-white/20">
          {score}%
        </span>
      )}
    </span>
  );
};
