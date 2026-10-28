import React from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { StatusIndicator } from '../../components/intelligence';

export const ConsoleSecurityPage: React.FC = () => {
  const subsystems = [
    { name: 'Detection Engine', status: 'operational' as const, latency: '18 ms', desc: 'Real-time UPI telemetry ingestion & streaming pipeline' },
    { name: 'Risk Engine', status: 'operational' as const, latency: '24 ms', desc: 'Ensemble multi-signal scoring (P94 threshold calibration)' },
    { name: 'Network Intelligence', status: 'operational' as const, latency: '32 ms', desc: 'Trinetra multi-hop graph syndicate traversal' },
    { name: 'Explanation Engine', status: 'operational' as const, latency: '42 ms', desc: 'SHAP attribution & grounded evidence hash generator' },
    { name: 'API Microservice', status: 'operational' as const, latency: '9 ms', desc: 'FastAPI REST gateway with Argon2id auth & JWT rotation' },
    { name: 'Database & Ledger', status: 'operational' as const, latency: '4 ms', desc: 'Cryptographic SHA-256 tamper-evident audit store' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#38D6A3]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SYSTEM HEALTH // INTEGRITY PERIMETER</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
            Security & Subsystem Status
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Operational telemetry across all core detection, inference, and audit rails
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <StatusIndicator status="operational" label="100% Core Systems Active" />
        </div>
      </div>

      {/* Subsystems Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subsystems.map((sub) => (
          <div
            key={sub.name}
            className="p-5 rounded-xl bg-[#080F17] border border-white/10 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-display font-bold text-base text-[#F4F7FA]">
                {sub.name}
              </span>
              <StatusIndicator status={sub.status} />
            </div>

            <p className="mt-3 text-xs text-[#8B9AAA] font-sans leading-relaxed">
              {sub.desc}
            </p>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#8B9AAA]">
              <span>Internal P95: <strong className="text-[#19D3C5]">{sub.latency}</strong></span>
              <span className="text-[#38D6A3] flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audited</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Security Policies Box */}
      <div className="p-6 rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] font-mono text-xs space-y-3">
        <div className="flex items-center space-x-2 text-[#19D3C5] font-bold">
          <Lock className="w-4 h-4" />
          <span>INSTITUTIONAL INTEGRITY & GOVERNANCE COMPLIANCE</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[#8B9AAA] pt-2">
          <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
            <span className="text-white block font-bold mb-1">Four-Eyes Protocol</span>
            <span>Mandatory co-approver validation for critical fraud case dismissals.</span>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
            <span className="text-white block font-bold mb-1">SHA-256 Immutability</span>
            <span>All evidence records and decision dockets are cryptographically chained.</span>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
            <span className="text-white block font-bold mb-1">Assistive Non-Autonomy</span>
            <span>AI synthesizes and scores; humans maintain full authority on dispositions.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
