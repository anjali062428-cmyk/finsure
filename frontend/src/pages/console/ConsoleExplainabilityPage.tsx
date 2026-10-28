import React from 'react';
import { EvidencePanel, RiskContribution } from '../../components/intelligence';

export const ConsoleExplainabilityPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-white/10">
        <span className="text-xs font-mono text-[#19D3C5] tracking-widest uppercase block">
          EXPLAINABLE AI // AUDITABLE ATTRIBUTION
        </span>
        <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
          SHAP & Feature Attribution Center
        </h1>
        <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
          Auditable decomposition of neural sequence attention, graph weights, and tabular trees
        </p>
      </div>

      <EvidencePanel />

      <RiskContribution />
    </div>
  );
};
