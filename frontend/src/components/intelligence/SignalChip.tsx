import React from 'react';

export interface SignalChipProps {
  label: string;
  value?: string;
  status?: 'safe' | 'warning' | 'critical' | 'teal' | 'neutral';
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SignalChip: React.FC<SignalChipProps> = ({
  label,
  value,
  status = 'teal',
  icon,
  active = false,
  onClick,
  className = '',
  size = 'md',
}) => {
  const statusStyles = {
    teal: 'border-[rgba(25,211,197,0.25)] text-[#19D3C5] bg-[#0E1721]/80 hover:border-[#19D3C5]',
    safe: 'border-[rgba(56,214,163,0.25)] text-[#38D6A3] bg-[#0E1721]/80 hover:border-[#38D6A3]',
    warning: 'border-[rgba(255,184,77,0.25)] text-[#FFB84D] bg-[#0E1721]/80 hover:border-[#FFB84D]',
    critical: 'border-[rgba(255,77,95,0.30)] text-[#FF4D5F] bg-[#0E1721]/80 hover:border-[#FF4D5F]',
    neutral: 'border-white/10 text-[#8B9AAA] bg-[#0E1721]/80 hover:border-white/20',
  }[status];

  const dotColors = {
    teal: 'bg-[#19D3C5] shadow-[0_0_8px_#19D3C5]',
    safe: 'bg-[#38D6A3] shadow-[0_0_8px_#38D6A3]',
    warning: 'bg-[#FFB84D] shadow-[0_0_8px_#FFB84D]',
    critical: 'bg-[#FF4D5F] shadow-[0_0_8px_#FF4D5F]',
    neutral: 'bg-[#8B9AAA]',
  }[status];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1.5',
    md: 'text-xs px-2.5 py-1 space-x-2',
    lg: 'text-sm px-3.5 py-1.5 space-x-2.5',
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center rounded-full border backdrop-blur-md transition-all duration-200 font-mono tracking-wide ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      } ${statusStyles} ${sizeStyles} ${
        active ? 'ring-1 ring-[#19D3C5] shadow-[0_0_16px_rgba(25,211,197,0.35)]' : ''
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors}`} />
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="font-semibold uppercase tracking-wider">{label}</span>
      {value && <span className="text-white/90 font-medium pl-1 border-l border-white/10">{value}</span>}
    </button>
  );
};
