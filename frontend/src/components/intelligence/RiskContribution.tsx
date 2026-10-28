import React from 'react';
import { Info } from 'lucide-react';

export interface FactorContribution {
  feature: string;
  category: string;
  contributionPct: number;
  direction: 'positive' | 'negative';
  description: string;
}

export interface RiskContributionProps {
  score?: number;
  probability?: number;
  evidenceCount?: number;
  confidence?: number;
  factors?: FactorContribution[];
  className?: string;
}

export const RiskContribution: React.FC<RiskContributionProps> = ({
  score = 94.2,
  probability = 0.942,
  evidenceCount = 5,
  confidence = 98.4,
  factors = [
    {
      feature: 'Amount anomaly',
      category: 'Financial Magnitude',
      contributionPct: 31,
      direction: 'positive',
      description: 'Transaction amount is 6.4x the recent 30-day user rolling mean.',
    },
    {
      feature: 'Device anomaly',
      category: 'Hardware Binding',
      contributionPct: 24,
      direction: 'positive',
      description: 'Newly registered Android device without hardware-backed keystore confirmation.',
    },
    {
      feature: 'Location anomaly',
      category: 'Geographic Telemetry',
      contributionPct: 19,
      direction: 'positive',
      description: 'Geo-hop from Bengaluru to Mumbai logged in under 35 minutes.',
    },
    {
      feature: 'Velocity anomaly',
      category: 'Circadian Cadence',
      contributionPct: 12,
      direction: 'positive',
      description: '4 consecutive transfers completed within 7 minutes during uncharacteristic hours.',
    },
    {
      feature: 'Behavior deviation',
      category: 'Pattern Sequence',
      contributionPct: 8,
      direction: 'positive',
      description: 'Micro-probe warmup followed by immediate maximum balance draw attempt.',
    },
  ],
  className = '',
}) => {
  return (
    <div className={`w-full max-w-4xl mx-auto rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${className}`}>
      {/* Quiet Monumental Header */}
      <div className="text-center py-4">
        <span className="text-xs font-mono uppercase tracking-widest text-[#19D3C5] block mb-2">
          COMPOSITE RISK REASONING ENGINE
        </span>
        <div className="text-6xl sm:text-8xl font-display font-extrabold text-[#FF4D5F] tracking-tighter shadow-critical">
          {score}%
        </div>
        <div className="mt-2 text-sm font-mono tracking-widest text-[#8B9AAA] uppercase font-bold">
          ELEVATED FRAUD RISK DETECTED
        </div>
        <p className="mt-2 text-xs sm:text-sm text-[#8B9AAA] max-w-xl mx-auto font-sans">
          FinSure AI detected anomalous transaction, behavioral, and network signals. Final operational disposition is governed by human-in-the-loop audit protocol.
        </p>
      </div>

      {/* 4 Multi-Dimensional Metric Blocks */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
          <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block">Risk Score</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-[#FF4D5F]">{score} / 100</span>
        </div>
        <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
          <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block">Model Probability</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-[#19D3C5]">{probability.toFixed(3)}</span>
        </div>
        <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
          <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block">Grounded Evidence</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-[#F4F7FA]">{evidenceCount} Records</span>
        </div>
        <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
          <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block">Model Confidence</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-[#38D6A3]">{confidence}%</span>
        </div>
      </div>

      {/* Why Did FinSure Flag This? Horizontal Factor Contribution Bars */}
      <div className="mt-10 pt-8 border-t border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-display font-bold text-[#F4F7FA]">
              WHY DID FINSURE FLAG THIS?
            </h4>
            <span className="text-xs font-mono text-[#8B9AAA]">
              SHAP Attribution & Feature Decomposition
            </span>
          </div>
          <div className="text-xs font-mono text-[#19D3C5]">
            Σ Attribution = +94%
          </div>
        </div>

        <div className="space-y-4">
          {factors.map((factor) => (
            <div
              key={factor.feature}
              className="p-3.5 rounded-lg bg-[#0E1721] border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#F4F7FA]">{factor.feature}</span>
                  <span className="text-[10px] text-[#8B9AAA]">({factor.category})</span>
                </div>
                <span className="font-bold text-[#FF4D5F]">
                  +{factor.contributionPct}%
                </span>
              </div>

              {/* Horizontal Bar */}
              <div className="w-full h-2 rounded-full bg-[#05080D] overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-[#FFB84D] to-[#FF4D5F] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, factor.contributionPct * 2.8)}%` }}
                />
              </div>

              <p className="text-[11px] text-[#8B9AAA] font-sans leading-tight">
                {factor.description}
              </p>
            </div>
          ))}
        </div>

        {/* Clear Non-Causal / Human Authority Footnote */}
        <div className="mt-6 p-3.5 rounded-lg bg-[#05080D] border border-white/10 flex items-start space-x-3 text-xs text-[#8B9AAA]">
          <Info className="w-4 h-4 text-[#19D3C5] shrink-0 mt-0.5" />
          <p className="font-sans leading-relaxed">
            <strong className="text-[#F4F7FA]">System Boundary Note:</strong> Machine learning flags elevated risk patterns and synthesizes evidence vectors. FinSure never executes autonomous final fraud determinations; all account freezes or dispute escalations are governed by explicit policy and human review.
          </p>
        </div>
      </div>
    </div>
  );
};
