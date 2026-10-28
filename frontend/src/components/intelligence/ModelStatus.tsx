import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';

export const ModelStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const architectureSteps = [
    { label: 'INPUT', sub: 'UPI Payload' },
    { label: 'FEATURE ENGINEERING', sub: '92 Real-Time Signals' },
    { label: 'DEEP LEARNING MODEL', sub: 'BiLSTM + Attn' },
    { label: 'ANOMALY DETECTION', sub: 'Isolation Forest' },
    { label: 'RISK ENGINE', sub: 'Threshold Calibration' },
    { label: 'EXPLANATION', sub: 'SHAP + TreeExplainer' },
  ];

  const metrics = [
    { label: 'Model Version', value: 'v2.4.1-prod' },
    { label: 'ROC-AUC', value: '0.9842', highlight: true },
    { label: 'PR-AUC', value: '0.9410' },
    { label: 'Recall @ 0.1% FPR', value: '89.6%' },
    { label: 'Precision', value: '94.8%' },
    { label: 'F1 Score', value: '0.9213' },
    { label: 'Inference P95', value: '42 ms' },
    { label: 'Dataset Hash', value: 'syn_upi_2026_09' },
  ];

  return (
    <div className={`w-full rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-[#0E1721] border border-white/10 text-[#19D3C5]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#19D3C5] uppercase block">
              MODEL INFERENCE CENTER
            </span>
            <h3 className="text-xl font-display font-bold text-[#F4F7FA]">
              FinSure Ensemble Brain
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <StatusIndicator status="operational" label="Inference Engine Active" />
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-[#F4F7FA]">
            PyTorch + XGBoost
          </span>
        </div>
      </div>

      {/* Architecture Flow Visualization */}
      <div className="my-8">
        <span className="text-xs font-mono uppercase tracking-wider text-[#8B9AAA] block mb-4">
          END-TO-END INFERENCE PIPELINE
        </span>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {architectureSteps.map((step, idx) => (
            <div
              key={step.label}
              className="p-3 rounded-lg bg-[#0E1721] border border-white/10 text-center relative flex flex-col justify-between"
            >
              <div>
                <span className="text-[9px] font-mono text-[#19D3C5] block mb-1">
                  0{idx + 1}
                </span>
                <span className="text-xs font-mono font-bold text-[#F4F7FA] block leading-tight">
                  {step.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8B9AAA] mt-2 block border-t border-white/10 pt-1">
                {step.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quantitative Brain Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="p-3.5 rounded-lg bg-[#0E1721] border border-white/10">
            <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block truncate">
              {m.label}
            </span>
            <span
              className={`text-lg sm:text-xl font-mono font-bold block mt-0.5 ${
                m.highlight ? 'text-[#19D3C5]' : 'text-[#F4F7FA]'
              }`}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#8B9AAA]">
        <span>LAST RETRAINED: 2026-09-28 14:00 UTC (LEAK-FREE FOLD SAFE)</span>
        <span className="text-[#38D6A3] flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Zero Future Leakage Verified</span>
        </span>
      </div>
    </div>
  );
};
