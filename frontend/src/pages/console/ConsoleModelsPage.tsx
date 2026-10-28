import React from 'react';
import { ModelStatus } from '../../components/intelligence';

export const ConsoleModelsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-white/10">
        <span className="text-xs font-mono text-[#19D3C5] tracking-widest uppercase block">
          AI ARCHITECTURE // MACHINE LEARNING BRAIN
        </span>
        <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
          Model Inference & Governance Center
        </h1>
        <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
          End-to-end multi-model ensemble health, leak-free validation metrics, and architecture flow
        </p>
      </div>

      <ModelStatus />
    </div>
  );
};
