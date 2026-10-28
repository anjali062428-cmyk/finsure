import React from 'react';
import { InvestigationPanel } from '../../components/intelligence';

export const ConsoleInvestigationsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-white/10">
        <span className="text-xs font-mono text-[#19D3C5] tracking-widest uppercase block">
          INVESTIGATION WORKSPACE // ADAPTIVE TRIAGE
        </span>
        <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
          Analyst Investigation Docket
        </h1>
        <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
          Spacious 3-column forensic command center for evidence-grounded human review
        </p>
      </div>

      <InvestigationPanel caseId="CASE-82931" amount="₹84,500" riskScore={94.2} />
    </div>
  );
};
