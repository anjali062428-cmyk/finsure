import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { RiskBadge, RiskLevel } from './RiskBadge';

export interface AlertItemProps {
  id: string;
  severity: RiskLevel;
  amount: string;
  riskScore: number;
  signalsSummary: string;
  timeAgo: string;
  customerName?: string;
  onInvestigate?: (id: string) => void;
  className?: string;
}

export const AlertItem: React.FC<AlertItemProps> = ({
  id,
  severity,
  amount,
  riskScore,
  signalsSummary,
  timeAgo,
  customerName = 'Account Holder',
  onInvestigate,
  className = '',
}) => {
  const borderStyles = {
    critical: 'border-[rgba(255,77,95,0.3)] hover:border-[#FF4D5F] hover:shadow-[0_0_20px_rgba(255,77,95,0.2)]',
    high: 'border-[rgba(255,133,51,0.25)] hover:border-[#FF8533] hover:shadow-[0_0_20px_rgba(255,133,51,0.2)]',
    medium: 'border-[rgba(255,184,77,0.2)] hover:border-[#FFB84D]',
    low: 'border-white/10 hover:border-white/20',
    safe: 'border-white/10 hover:border-white/20',
  }[severity];

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl bg-[#0E1721] border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${borderStyles} ${className}`}
    >
      <div className="flex items-start space-x-3.5 min-w-0">
        <div className="mt-0.5 shrink-0">
          <RiskBadge level={severity} score={riskScore} size="sm" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base sm:text-lg font-display font-bold text-[#F4F7FA]">
              {amount} transaction
            </span>
            <span className="text-xs font-mono text-[#8B9AAA]">
              // {id}
            </span>
            {customerName && (
              <span className="text-xs font-sans text-[#8B9AAA]">
                ({customerName})
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-[#8B9AAA] font-mono leading-relaxed line-clamp-1">
            {signalsSummary}
          </p>

          <div className="mt-2 flex items-center space-x-3 text-[11px] font-mono text-[#576574]">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-[#19D3C5]" />
              <span>{timeAgo}</span>
            </span>
            <span>•</span>
            <span className="text-[#19D3C5]">AI Evidence Grounded</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onInvestigate && onInvestigate(id)}
          className={`px-4 py-2 rounded font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border ${
            severity === 'critical'
              ? 'bg-[#FF4D5F] text-[#05080D] border-[#FF4D5F] hover:bg-[#FF6B7B] shadow-[0_0_12px_rgba(255,77,95,0.35)]'
              : 'bg-[#19D3C5] text-[#05080D] border-[#19D3C5] hover:bg-[#26E6D8] shadow-[0_0_12px_rgba(25,211,197,0.35)]'
          }`}
        >
          <span>INVESTIGATE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
