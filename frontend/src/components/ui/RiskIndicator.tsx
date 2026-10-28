import React from 'react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskIndicatorProps {
  score?: number;
  level?: RiskLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  score,
  level: explicitLevel,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const level = explicitLevel || (score !== undefined ? getRiskLevelFromScore(score) : 'low');

  const configs = {
    low: {
      color: 'bg-risk-low text-white',
      border: 'border-risk-low/40',
      bgLight: 'bg-risk-low/10 text-risk-low',
      dot: 'bg-risk-low',
      label: 'Low Risk',
    },
    medium: {
      color: 'bg-risk-medium text-black',
      border: 'border-risk-medium/40',
      bgLight: 'bg-risk-medium/10 text-risk-medium',
      dot: 'bg-risk-medium',
      label: 'Medium Risk',
    },
    high: {
      color: 'bg-risk-high text-white',
      border: 'border-risk-high/40',
      bgLight: 'bg-risk-high/10 text-risk-high',
      dot: 'bg-risk-high',
      label: 'High Risk',
    },
    critical: {
      color: 'bg-risk-critical text-white',
      border: 'border-risk-critical/40',
      bgLight: 'bg-risk-critical/10 text-risk-critical',
      dot: 'bg-risk-critical',
      label: 'Critical Risk',
    },
  }[level];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-full font-medium border ${configs.bgLight} ${configs.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${configs.dot} animate-pulse`} />
      {showLabel && <span>{configs.label}</span>}
      {score !== undefined && (
        <span className="font-mono font-semibold">({Math.round(score)})</span>
      )}
    </span>
  );
};
