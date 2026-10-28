import React from 'react';
import { ThreatReplay } from '../../components/intelligence';

export const ConsoleReplayPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-white/10">
        <span className="text-xs font-mono text-[#19D3C5] tracking-widest uppercase block">
          THREAT REPLAY // TIME-SERIES RECONSTRUCTION
        </span>
        <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
          Forensic Attack Replay
        </h1>
        <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
          Step through pre-attack credential validation, velocity probing, and automated enforcement
        </p>
      </div>

      <ThreatReplay />
    </div>
  );
};
