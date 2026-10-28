import React from 'react';

export interface StatusIndicatorProps {
  status: 'operational' | 'degraded' | 'critical' | 'investigating' | 'offline';
  label?: string;
  subtext?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  subtext,
  pulse = true,
  className = '',
}) => {
  const config = {
    operational: {
      color: 'bg-[#38D6A3]',
      glow: 'shadow-[0_0_10px_#38D6A3]',
      text: 'text-[#38D6A3]',
      defaultLabel: 'Operational',
    },
    degraded: {
      color: 'bg-[#FFB84D]',
      glow: 'shadow-[0_0_10px_#FFB84D]',
      text: 'text-[#FFB84D]',
      defaultLabel: 'Degraded',
    },
    critical: {
      color: 'bg-[#FF4D5F]',
      glow: 'shadow-[0_0_10px_#FF4D5F]',
      text: 'text-[#FF4D5F]',
      defaultLabel: 'Critical Alert',
    },
    investigating: {
      color: 'bg-[#19D3C5]',
      glow: 'shadow-[0_0_10px_#19D3C5]',
      text: 'text-[#19D3C5]',
      defaultLabel: 'Investigating',
    },
    offline: {
      color: 'bg-[#576574]',
      glow: '',
      text: 'text-[#8B9AAA]',
      defaultLabel: 'Offline',
    },
  }[status];

  return (
    <div className={`inline-flex items-center space-x-2 text-xs font-mono ${className}`}>
      <span className="relative flex h-2 w-2">
        {pulse && status !== 'offline' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color} ${config.glow}`} />
      </span>
      {label !== undefined ? (
        <span className={`font-medium ${config.text}`}>{label}</span>
      ) : (
        <span className={`font-medium ${config.text}`}>{config.defaultLabel}</span>
      )}
      {subtext && <span className="text-[#8B9AAA] text-[11px]">({subtext})</span>}
    </div>
  );
};
