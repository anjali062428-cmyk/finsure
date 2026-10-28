import React from 'react';

interface ProbabilityDisplayProps {
  probability: number;
  confidenceInterval?: [number, number];
  label?: string;
  showBar?: boolean;
  className?: string;
}

export const ProbabilityDisplay: React.FC<ProbabilityDisplayProps> = ({
  probability,
  confidenceInterval,
  label = 'Calibrated Probability',
  showBar = true,
  className = '',
}) => {
  const percent = Math.min(Math.max(probability * 100, 0), 100);
  const formattedPercent = percent.toFixed(2);

  const getBarColor = (p: number) => {
    if (p >= 0.7) return 'bg-risk-critical';
    if (p >= 0.4) return 'bg-risk-high';
    if (p >= 0.2) return 'bg-risk-medium';
    return 'bg-risk-low';
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted font-medium">{label}</span>
        <span className="font-mono font-semibold text-text">
          {formattedPercent}%{' '}
          <span className="text-text-muted font-normal text-[11px]">
            ({probability.toFixed(4)})
          </span>
        </span>
      </div>

      {showBar && (
        <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getBarColor(probability)}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {confidenceInterval && (
        <div className="flex justify-between text-[11px] font-mono text-text-muted">
          <span>95% CI:</span>
          <span>
            [{(confidenceInterval[0] * 100).toFixed(1)}% —{' '}
            {(confidenceInterval[1] * 100).toFixed(1)}%]
          </span>
        </div>
      )}
    </div>
  );
};
