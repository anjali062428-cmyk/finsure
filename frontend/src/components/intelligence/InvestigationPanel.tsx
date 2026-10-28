import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  FileText,
  Clock,
} from 'lucide-react';
import { RiskBadge } from './RiskBadge';

export interface InvestigationPanelProps {
  caseId?: string;
  amount?: string;
  riskScore?: number;
  onDecision?: (action: 'confirm_fraud' | 'escalate' | 'dismiss') => void;
  className?: string;
}

export const InvestigationPanel: React.FC<InvestigationPanelProps> = ({
  caseId = 'CASE-82931',
  amount = '₹84,500',
  riskScore = 94.2,
  onDecision,
  className = '',
}) => {
  const [currentDecision, setCurrentDecision] = useState<string | null>(null);
  const [analystNote, setAnalystNote] = useState('');

  const transactionData = {
    amount,
    time: '2026-09-30 02:47:11 AM IST',
    location: 'Mumbai, Maharashtra, IN (19.0760° N, 72.8777° E)',
    device: 'Android Pixel 7 (Hardware Hash: 9f8a...33d1)',
    merchant: 'quickpay.mule99@oksbi (Shell Corporate Entity)',
    ip: '49.36.19.82 (Commercial VPN / Proxy AS13335)',
    paymentType: 'UPI P2P Express Immediate Settlement',
  };

  const evidenceItems = [
    {
      id: 'E1',
      title: 'New Hardware Device',
      detail: 'Device DEV-92831 bound to UPI app 14 mins prior without secondary device approval.',
      hash: 'sha256:7b1e...f982',
    },
    {
      id: 'E2',
      title: 'Amount Anomaly (6.4x Baseline)',
      detail: '₹84,500 represents 99.4th percentile of user outgoing payment history.',
      hash: 'sha256:3a9c...11a4',
    },
    {
      id: 'E3',
      title: 'Geographic Velocity Mismatch',
      detail: 'User was in Bengaluru 82 minutes ago. 840km impossible physical transit.',
      hash: 'sha256:d84e...92e1',
    },
    {
      id: 'E4',
      title: 'Rapid Limit Draw Velocity',
      detail: '4 transfers total ₹1,04,500 within 7 minutes draining remaining daily ceiling.',
      hash: 'sha256:6e01...bc44',
    },
    {
      id: 'E5',
      title: 'Graph Proximity to Mule Syndicate',
      detail: 'Payee linked in Trinetra relational graph to 3 confirmed fraud incident dockets.',
      hash: 'sha256:22a8...f9c0',
    },
  ];

  const handleAction = (action: 'confirm_fraud' | 'escalate' | 'dismiss') => {
    setCurrentDecision(action);
    if (onDecision) onDecision(action);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.25)] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.9)] ${className}`}>
      {/* Top Banner: Spacious Command Center Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-[#0E1721] border border-white/10 text-[#19D3C5]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono tracking-widest text-[#8B9AAA]">INVESTIGATION DOCKET</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                {caseId}
              </span>
            </div>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-3xl sm:text-4xl font-display font-extrabold text-[#F4F7FA]">
                {amount}
              </span>
              <span className="text-xs font-mono text-[#8B9AAA]">INR • UPI P2P</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block">AI Threat Score</span>
            <span className="text-2xl font-mono font-bold text-[#FF4D5F]">{riskScore}%</span>
          </div>
          <RiskBadge level="critical" label="CRITICAL FRAUD" size="lg" />
        </div>
      </div>

      {/* Main Composition: 3 Columns */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Transaction Context (lg:col-span-4) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0E1721] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-wider text-[#19D3C5] font-bold">
              01 // Transaction Context
            </span>
            <FileText className="w-4 h-4 text-[#8B9AAA]" />
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Amount</span>
              <span className="text-base font-bold text-[#F4F7FA] font-display">{transactionData.amount}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Timestamp</span>
              <span className="text-white/90">{transactionData.time}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Device Binding</span>
              <span className="text-[#FF4D5F]">{transactionData.device}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Geolocation</span>
              <span className="text-white/90">{transactionData.location}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">IP Address</span>
              <span className="text-white/90">{transactionData.ip}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Payee VPA</span>
              <span className="text-[#FF4D5F]">{transactionData.merchant}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Rail Protocol</span>
              <span className="text-white/90">{transactionData.paymentType}</span>
            </div>
          </div>
        </div>

        {/* CENTER: Investigation Evidence (lg:col-span-4) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0E1721] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-wider text-[#19D3C5] font-bold">
              02 // Grounded Evidence Binder
            </span>
            <span className="text-[10px] font-mono text-[#38D6A3]">5 of 5 Verified</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {evidenceItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-[#080F17] border border-white/10 hover:border-white/20 transition-all text-xs"
              >
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="font-bold text-[#19D3C5]">[{item.id}] {item.title}</span>
                  <span className="text-[9px] text-[#8B9AAA]">{item.hash}</span>
                </div>
                <p className="text-[#8B9AAA] font-sans leading-relaxed text-[11px]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: AI Explanation & Governance (lg:col-span-4) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0E1721] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-wider text-[#19D3C5] font-bold">
              03 // FinSure AI Synthesis
            </span>
            <span className="text-[10px] font-mono text-[#8B9AAA]">Model Latency: 42ms</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#080F17] border border-white/10 text-xs text-[#8B9AAA] leading-relaxed font-sans">
            <p className="mb-2">
              <strong className="text-[#F4F7FA]">Investigator Assessment:</strong> High probability of deliberate account takeover and rapid funds drain attempt via social engineering or SIM redirection.
            </p>
            <p>
              Evidence vectors [E1], [E2], and [E3] jointly exceed the automated P94 threshold. Recommending immediate fraud confirmation and credential revoking.
            </p>
          </div>

          {/* Decision Actions: Subtle, deliberate, NOT visually aggressive */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div>
              <label htmlFor="analyst-note-input" className="text-[10px] font-mono text-[#8B9AAA] uppercase block mb-1">
                Investigation Findings Note (Optional):
              </label>
              <input
                id="analyst-note-input"
                type="text"
                value={analystNote}
                onChange={(e) => setAnalystNote(e.target.value)}
                placeholder="e.g., Confirmed SIM-swap via telecom carrier logs..."
                className="w-full px-2.5 py-1.5 rounded bg-[#080F17] border border-white/10 text-xs font-mono text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3C5]"
              />
            </div>

            <span className="text-[11px] font-mono text-[#8B9AAA] uppercase block">
              Analyst Authority Action:
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAction('confirm_fraud')}
                className={`px-3 py-2 rounded text-xs font-mono font-semibold transition-all border ${
                  currentDecision === 'confirm_fraud'
                    ? 'bg-[#FF4D5F] text-[#05080D] border-[#FF4D5F] shadow-[0_0_12px_rgba(255,77,95,0.4)]'
                    : 'bg-[#0E1721] text-[#FF4D5F] border-[#FF4D5F]/30 hover:border-[#FF4D5F] hover:bg-[#FF4D5F]/10'
                }`}
              >
                CONFIRM FRAUD
              </button>

              <button
                type="button"
                onClick={() => handleAction('escalate')}
                className={`px-3 py-2 rounded text-xs font-mono font-semibold transition-all border ${
                  currentDecision === 'escalate'
                    ? 'bg-[#FFB84D] text-[#05080D] border-[#FFB84D] shadow-[0_0_12px_rgba(255,184,77,0.4)]'
                    : 'bg-[#0E1721] text-[#FFB84D] border-[#FFB84D]/30 hover:border-[#FFB84D] hover:bg-[#FFB84D]/10'
                }`}
              >
                ESCALATE
              </button>

              <button
                type="button"
                onClick={() => handleAction('dismiss')}
                className={`px-3 py-2 rounded text-xs font-mono font-semibold transition-all border ${
                  currentDecision === 'dismiss'
                    ? 'bg-[#38D6A3] text-[#05080D] border-[#38D6A3] shadow-[0_0_12px_rgba(56,214,163,0.4)]'
                    : 'bg-[#0E1721] text-[#38D6A3] border-[#38D6A3]/30 hover:border-[#38D6A3] hover:bg-[#38D6A3]/10'
                }`}
              >
                DISMISS
              </button>
            </div>

            {currentDecision && (
              <div className="mt-3 p-2 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-[#38D6A3] flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Action recorded in tamper-evident audit ledger</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Decision Timeline */}
      <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between text-xs font-mono text-[#8B9AAA]">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#19D3C5]" />
          <span>DECISION AUDIT TRAIL: Event Ingested 02:47:11 $\to$ Risk Calculated 02:47:11.042 $\to$ Automated Hold Enforced</span>
        </div>
        <span className="text-[#19D3C5]">Four-Eyes Audit Verified</span>
      </div>
    </div>
  );
};
