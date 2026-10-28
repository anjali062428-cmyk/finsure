import React, { useState } from 'react';
import { Smartphone, CreditCard, LogIn } from 'lucide-react';

export interface TimelineStep {
  time: string;
  title: string;
  type: 'login' | 'device' | 'test_txn' | 'warmup_txn' | 'drain_txn';
  amount?: string;
  riskScore: number;
  riskState: 'safe' | 'medium' | 'high' | 'critical';
  details: string;
  telemetry: string;
}

export const BehaviorTimeline: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(4);

  const steps: TimelineStep[] = [
    {
      time: '10:32 PM',
      title: 'Normal Authentication',
      type: 'login',
      riskScore: 4,
      riskState: 'safe',
      details: 'User logged in via trusted biometric session on primary iPhone 14 in Bengaluru.',
      telemetry: 'Known IP (122.171.x.x) • Baseline Velocity • Biometrics Verified',
    },
    {
      time: '11:04 PM',
      title: 'New Hardware Bound',
      type: 'device',
      riskScore: 38,
      riskState: 'medium',
      details: 'Second session initiated from an unrecognized Android device in Mumbai via sudden IP change.',
      telemetry: 'Device ID DEV-92831 • Geo-Hop: 840 km in 32 min • Velocity Alert 1',
    },
    {
      time: '11:17 PM',
      title: 'Micro-Probe Transfer',
      type: 'test_txn',
      amount: '₹2,000',
      riskScore: 54,
      riskState: 'medium',
      details: 'Small payment sent to a newly added payee within 13 minutes of credential addition.',
      telemetry: 'Payee: vpa_fast_test • Balance Probe • Out of Profile Timing',
    },
    {
      time: '11:19 PM',
      title: 'Escalation Probe',
      type: 'warmup_txn',
      amount: '₹18,000',
      riskScore: 78,
      riskState: 'high',
      details: 'Secondary transfer 9x the first test, verifying daily UPI limit ceiling without friction.',
      telemetry: 'Inter-arrival delta: 114s • Velocity Spike • High Risk Payee Cluster',
    },
    {
      time: '11:21 PM',
      title: 'Full Account Drain Attempt',
      type: 'drain_txn',
      amount: '₹84,500',
      riskScore: 94,
      riskState: 'critical',
      details: 'Maximum balance sweep attempted. Multi-signal AI triggers automated block and freezes account.',
      telemetry: 'Cumulative velocity: ₹1,04,500 in 4 min • High Anomaly • Threat Blocked',
    },
  ];

  const currentStep = steps[activeStepIndex];

  return (
    <div className={`w-full max-w-5xl mx-auto rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${className}`}>
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#19D3C5] uppercase block">
            BEHAVIORAL SEQUENCE INTELLIGENCE
          </span>
          <h3 className="text-xl font-display font-bold text-[#F4F7FA] mt-0.5">
            Temporal Velocity Escalation
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-[#8B9AAA]">TIMELINE ESCALATION:</span>
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold text-[#FF4D5F] bg-[#FF4D5F]/15 border border-[#FF4D5F]/30">
            RAPID ACCOUNT DRAIN KILL-CHAIN
          </span>
        </div>
      </div>

      {/* Interactive Escalation Progression Bar */}
      <div className="my-8">
        <div className="relative flex items-center justify-between">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-white/10 -z-0">
            <div
              className="h-full bg-gradient-to-r from-[#38D6A3] via-[#FFB84D] to-[#FF4D5F] transition-all duration-300"
              style={{ width: `${(activeStepIndex / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Stepper Nodes */}
          {steps.map((s, idx) => {
            const isSelected = activeStepIndex === idx;
            return (
              <button
                key={s.time}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-200 ${
                    isSelected
                      ? 'ring-4 ring-[#19D3C5]/40 scale-110 shadow-[0_0_20px_#19D3C5]'
                      : 'hover:scale-105'
                  } ${
                    s.riskState === 'safe'
                      ? 'bg-[#0E1721] text-[#38D6A3] border-2 border-[#38D6A3]'
                      : s.riskState === 'medium'
                      ? 'bg-[#0E1721] text-[#FFB84D] border-2 border-[#FFB84D]'
                      : s.riskState === 'high'
                      ? 'bg-[#0E1721] text-[#FF8533] border-2 border-[#FF8533]'
                      : 'bg-[#0E1721] text-[#FF4D5F] border-2 border-[#FF4D5F]'
                  }`}
                >
                  {s.type === 'login' && <LogIn className="w-4 h-4" />}
                  {s.type === 'device' && <Smartphone className="w-4 h-4" />}
                  {(s.type === 'test_txn' || s.type === 'warmup_txn' || s.type === 'drain_txn') && (
                    <CreditCard className="w-4 h-4" />
                  )}
                </div>

                <div className="mt-3 text-center">
                  <span className="text-[11px] font-mono font-bold text-[#F4F7FA] block">
                    {s.time}
                  </span>
                  <span className="text-[10px] font-mono text-[#8B9AAA]">
                    {s.amount || 'Event'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Timeline Step Dossier */}
      <div className="p-6 rounded-xl bg-[#0E1721] border border-white/10 relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 bottom-0 w-1.5 ${
            currentStep.riskState === 'safe'
              ? 'bg-[#38D6A3]'
              : currentStep.riskState === 'medium'
              ? 'bg-[#FFB84D]'
              : currentStep.riskState === 'high'
              ? 'bg-[#FF8533]'
              : 'bg-[#FF4D5F]'
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-[#19D3C5] font-semibold">
                STEP 0{activeStepIndex + 1} OF 05
              </span>
              <span className="text-xs font-mono text-[#8B9AAA]">@{currentStep.time}</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  currentStep.riskState === 'safe'
                    ? 'bg-[#38D6A3]/15 text-[#38D6A3]'
                    : currentStep.riskState === 'medium'
                    ? 'bg-[#FFB84D]/15 text-[#FFB84D]'
                    : currentStep.riskState === 'high'
                    ? 'bg-[#FF8533]/15 text-[#FF8533]'
                    : 'bg-[#FF4D5F]/15 text-[#FF4D5F]'
                }`}
              >
                {currentStep.riskState} risk ({currentStep.riskScore}%)
              </span>
            </div>

            <h4 className="text-xl font-display font-bold text-[#F4F7FA] mt-1.5 flex items-center space-x-2">
              <span>{currentStep.title}</span>
              {currentStep.amount && (
                <span className="text-[#FF4D5F] font-mono font-bold">({currentStep.amount})</span>
              )}
            </h4>

            <p className="mt-2 text-sm text-[#8B9AAA] leading-relaxed max-w-3xl">
              {currentStep.details}
            </p>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center space-x-2 text-xs font-mono text-[#19D3C5]">
              <span className="text-[#8B9AAA]">TELEMETRY SIGNALS:</span>
              <span>{currentStep.telemetry}</span>
            </div>
          </div>

          <div className="shrink-0 flex md:flex-col items-center justify-between md:items-end p-4 rounded-lg bg-[#080F17] border border-white/10 min-w-[140px]">
            <span className="text-[10px] font-mono uppercase text-[#8B9AAA]">Instant Threat</span>
            <span
              className={`text-3xl font-display font-extrabold ${
                currentStep.riskScore >= 90
                  ? 'text-[#FF4D5F]'
                  : currentStep.riskScore >= 70
                  ? 'text-[#FF8533]'
                  : currentStep.riskScore >= 40
                  ? 'text-[#FFB84D]'
                  : 'text-[#38D6A3]'
              }`}
            >
              {currentStep.riskScore}%
            </span>
            <span className="text-[10px] font-mono text-[#8B9AAA]">
              {currentStep.riskScore >= 90 ? 'Automated Halt' : 'Passive Telemetry'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
