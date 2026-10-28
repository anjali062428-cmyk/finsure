import React from 'react';
import { getRiskLevelFromScore } from './RiskIndicator';

interface RiskScoreProps {
  score: number;
  probability?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export const RiskScore: React.FC<RiskScoreProps> = ({
  score,
  probability,
  size = 'md',
  showDetails = true,
  className = '',
}) => {
  const roundedScore = Math.round(score * 10) / 10;
  const level = getRiskLevelFromScore(score);

  const colors = {
    low: 'text-risk-low border-risk-low/30 bg-risk-low/5',
    medium: 'text-risk-medium border-risk-medium/30 bg-risk-medium/5',
    high: 'text-risk-high border-risk-high/30 bg-risk-high/5',
    critical: 'text-risk-critical border-risk-critical/30 bg-risk-critical/5',
  }[level];

  const textColors = {
    low: 'text-risk-low',
    medium: 'text-risk-medium',
    high: 'text-risk-high',
    critical: 'text-risk-critical',
  }[level];

  const bandDescriptions = {
    low: 'Low Risk — Safe Policy Threshold (0–39)',
    medium: 'Medium Risk — Step-Up OTP Verification Required (40–69)',
    high: 'High Risk — Analyst Review / Hold Policy (70–89)',
    critical: 'Critical Risk — Immediate Transaction Block (90–100)',
  }[level];

  const sizeClasses = {
    sm: {
      number: 'text-2xl font-bold font-mono tracking-tight',
      sub: 'text-xs',
      container: 'p-2',
    },
    md: {
      number: 'text-4xl font-bold font-mono tracking-tight',
      sub: 'text-xs',
      container: 'p-3',
    },
    lg: {
      number: 'text-6xl font-extrabold font-mono tracking-tight',
      sub: 'text-sm',
      container: 'p-5',
    },
  }[size];

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-lg border ${colors} ${sizeClasses.container} ${className}`}
    >
      <div className="flex items-baseline space-x-1">
        <span className={`${sizeClasses.number} ${textColors}`}>
          {roundedScore}
        </span>
        <span className="text-xs font-mono text-text-muted">/100</span>
      </div>

      {showDetails && (
        <div className="text-center mt-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-text">
            {level} RISK
          </span>
          {probability !== undefined && (
            <p className="text-[11px] font-mono text-text-muted mt-0.5">
              P(fraud): {(probability * 100).toFixed(2)}%
            </p>
          )}
          <p className="text-[10px] text-text-muted mt-0.5 max-w-[200px] leading-tight opacity-80">
            {bandDescriptions}
          </p>
        </div>
      )}
    </div>
  );
};
