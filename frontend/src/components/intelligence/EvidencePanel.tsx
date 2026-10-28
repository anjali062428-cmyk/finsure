import React from 'react';
import { CheckCircle2, FileCheck } from 'lucide-react';

export interface EvidenceRecord {
  id: string;
  index: string;
  title: string;
  description: string;
  verified: boolean;
  hash: string;
}

export const EvidencePanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const evidenceRecords: EvidenceRecord[] = [
    {
      id: 'E1',
      index: '01',
      title: 'Baseline Outlier Amount',
      description: 'Transaction amount of ₹84,500 is 6.4x the customer’s recent 30-day baseline average (₹11,200).',
      verified: true,
      hash: 'sha256:7b1e...f982',
    },
    {
      id: 'E2',
      index: '02',
      title: 'Hardware Identity Mismatch',
      description: 'The transaction originated from a newly observed Android Pixel 7 device with no prior binding.',
      verified: true,
      hash: 'sha256:3a9c...11a4',
    },
    {
      id: 'E3',
      index: '03',
      title: 'Geographic Displacement',
      description: 'Location differs sharply from previous verified sessions (Mumbai IP vs prior Bengaluru GPS fix).',
      verified: true,
      hash: 'sha256:d84e...92e1',
    },
    {
      id: 'E4',
      index: '04',
      title: 'Accelerated Velocity Spike',
      description: 'Transaction velocity escalated across 4 rapid successive transfers within a 7-minute window.',
      verified: true,
      hash: 'sha256:6e01...bc44',
    },
  ];

  return (
    <div className={`w-full max-w-6xl mx-auto rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${className}`}>
      {/* Top Header */}
      <div className="pb-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#19D3C5] uppercase block">
            EXPLAINABLE AI ENGINE // ZERO BLACK BOX
          </span>
          <h3 className="text-xl sm:text-2xl font-display font-bold text-[#F4F7FA]">
            Multi-Signal Evidence Attribution
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-[#38D6A3]">
          <FileCheck className="w-4 h-4" />
          <span>CRYPTOGRAPHICALLY HASHED & AUDITED</span>
        </div>
      </div>

      {/* 3-Column Architectural Composition */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Risk Score Monument (lg:col-span-3) */}
        <div className="lg:col-span-3 p-6 rounded-xl bg-[#0E1721] border border-white/10 flex flex-col justify-between text-center lg:text-left">
          <div>
            <span className="text-xs font-mono text-[#8B9AAA] uppercase tracking-wider block">
              Aggregate Risk
            </span>
            <div className="text-5xl sm:text-6xl font-display font-black text-[#FF4D5F] mt-2">
              94.2%
            </div>
            <span className="text-xs font-mono font-bold text-[#FF4D5F] uppercase block mt-1">
              CRITICAL THREAT
            </span>
            <p className="mt-3 text-xs text-[#8B9AAA] font-sans leading-relaxed">
              Ensemble Brain (XGBoost + Temporal BiLSTM + Trinetra GNN + Isolation Forest) converged on high-risk outlier topology.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-[#8B9AAA]">
            <div className="flex justify-between py-1">
              <span>Decision:</span>
              <span className="text-[#FF4D5F] font-bold">AUTOMATED BLOCK</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Policy Rule:</span>
              <span className="text-white">P94_DRAIN_LOCK</span>
            </div>
          </div>
        </div>

        {/* Center Column: Contribution Visualization (lg:col-span-4) */}
        <div className="lg:col-span-4 p-6 rounded-xl bg-[#0E1721] border border-white/10 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-[#19D3C5] uppercase tracking-wider block mb-4">
              SHAP Attribution Waterfall
            </span>

            <div className="space-y-3.5 font-mono text-xs">
              <div>
                <div className="flex justify-between text-[#F4F7FA] mb-1">
                  <span>Amount Anomaly</span>
                  <span className="text-[#FF4D5F]">+31%</span>
                </div>
                <div className="w-full h-1.5 bg-[#05080D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF4D5F] rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#F4F7FA] mb-1">
                  <span>Device Hardware Binding</span>
                  <span className="text-[#FF4D5F]">+24%</span>
                </div>
                <div className="w-full h-1.5 bg-[#05080D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF8533] rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#F4F7FA] mb-1">
                  <span>Geographic Geo-Hop</span>
                  <span className="text-[#FF4D5F]">+19%</span>
                </div>
                <div className="w-full h-1.5 bg-[#05080D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFB84D] rounded-full" style={{ width: '52%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#F4F7FA] mb-1">
                  <span>Velocity Cadence</span>
                  <span className="text-[#FF4D5F]">+12%</span>
                </div>
                <div className="w-full h-1.5 bg-[#05080D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#19D3C5] rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#F4F7FA] mb-1">
                  <span>Sequence Transition</span>
                  <span className="text-[#FF4D5F]">+8%</span>
                </div>
                <div className="w-full h-1.5 bg-[#05080D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#38D6A3] rounded-full" style={{ width: '22%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-mono text-[#8B9AAA]">
            Model Base Value: 4.8% • Total Shift: +89.4%
          </div>
        </div>

        {/* Right Column: Evidence Dossier Cards (lg:col-span-5) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-[#0E1721] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#19D3C5] uppercase tracking-wider">
                Grounded Plain-Language Claims
              </span>
              <span className="text-[10px] font-mono text-[#8B9AAA]">4 of 4 Verified</span>
            </div>

            <div className="space-y-2.5">
              {evidenceRecords.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#080F17] border border-white/10 hover:border-white/20 transition-all flex items-start space-x-3"
                >
                  <span className="font-mono text-xs font-bold text-[#19D3C5] shrink-0 mt-0.5">
                    {item.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F4F7FA] font-sans">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono text-[#8B9AAA]">{item.hash}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#8B9AAA] leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#38D6A3]">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Model Hallucination</span>
            </span>
            <span className="text-[#8B9AAA]">Claim Validator v1.2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
