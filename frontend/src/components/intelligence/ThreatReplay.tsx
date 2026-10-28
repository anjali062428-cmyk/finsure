import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export interface ThreatEvent {
  step: number;
  label: string;
  sublabel: string;
  time: string;
  amount?: string;
  threatLevel: 'safe' | 'medium' | 'high' | 'critical';
  details: string;
  signalVector: string;
}

export const ThreatReplay: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const events: ThreatEvent[] = [
    {
      step: 1,
      label: 'SESSION LOGIN',
      sublabel: 'Legitimate Credentials',
      time: '10:32 PM',
      threatLevel: 'safe',
      details: 'User authenticated from known Bengaluru network via secondary factor.',
      signalVector: 'Auth Vector: Clean • IP Geolocation: Match • Biometric: PASS',
    },
    {
      step: 2,
      label: 'DEVICE BINDING',
      sublabel: 'Hardware Anomaly',
      time: '11:04 PM',
      threatLevel: 'medium',
      details: 'Unregistered Android device bound through SIM-swap SMS redirection in Mumbai.',
      signalVector: 'Hardware Hash: DEV-92831 (New) • Distance Velocity: 840 km/h • Risk: ELEVATED',
    },
    {
      step: 3,
      label: 'MICRO PROBE',
      sublabel: 'Balance Validation',
      time: '11:17 PM',
      amount: '₹2,000',
      threatLevel: 'medium',
      details: 'Small payment sent to test UPI pin correctness and bank balance availability.',
      signalVector: 'Amount: ₹2,000 • Payee: vpa_fast_test • Circadian: UNUSUAL',
    },
    {
      step: 4,
      label: 'PAYMENT ESCALATION',
      sublabel: 'Limit Stress Test',
      time: '11:19 PM',
      amount: '₹18,000',
      threatLevel: 'high',
      details: 'Immediate subsequent transfer 9x the first test, probing limits without friction.',
      signalVector: 'Cadence: 114s since last txn • Velocity Anomaly: +410% • Flag: REVIEW',
    },
    {
      step: 5,
      label: 'LARGE DRAIN TRANSFER',
      sublabel: 'Syndicate Exfiltration',
      time: '11:21 PM',
      amount: '₹84,500',
      threatLevel: 'critical',
      details: 'Final transaction attempt draining available daily UPI credit to mule syndicate VPA.',
      signalVector: 'Aggregate Velocity: ₹1,04,500 in 4 min • Graph Proximity: Mule Syndicate',
    },
    {
      step: 6,
      label: 'AUTOMATED BLOCK',
      sublabel: 'FinSure Active Defense',
      time: '11:21:03 PM',
      threatLevel: 'critical',
      details: 'Risk score 94.2% triggers immediate payment halt, freezes credentials, and initiates analyst case docket.',
      signalVector: 'Defense Action: TRANSACTION_BLOCKED • Account State: ISOLATED • Alert: DISPATCHED',
    },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isPlaying, events.length]);

  const activeEvent = events[currentStepIndex];

  return (
    <div className={`w-full max-w-5xl mx-auto rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${className}`}>
      {/* Replay Controller Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#19D3C5] uppercase block">
            FORENSIC THREAT REPLAY // TIME-SERIES RECONSTRUCTION
          </span>
          <h3 className="text-xl sm:text-2xl font-display font-bold text-[#F4F7FA]">
            Replay What Happened
          </h3>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2 bg-[#0E1721] p-1.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => {
              if (currentStepIndex >= events.length - 1) setCurrentStepIndex(0);
              setIsPlaying(!isPlaying);
            }}
            className="px-3.5 py-1.5 rounded bg-[#19D3C5] text-[#05080D] font-mono text-xs font-bold hover:bg-[#26E6D8] transition-all flex items-center space-x-1.5 shadow-[0_0_12px_rgba(25,211,197,0.4)]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>REPLAY INVESTIGATION</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-[#8B9AAA] hover:text-white transition-colors"
            title="Reset to beginning"
            aria-label="Reset replay"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Replay Steps Horizontal Chain */}
      <div className="my-8 overflow-x-auto pb-4">
        <div className="flex items-center space-x-3 min-w-[700px]">
          {events.map((ev, index) => {
            const isCurrent = currentStepIndex === index;
            const isDone = currentStepIndex > index;

            return (
              <React.Fragment key={ev.step}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(index);
                  }}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? 'bg-[#0E1721] border-[#19D3C5] shadow-[0_0_20px_rgba(25,211,197,0.3)] scale-[1.02]'
                      : isDone
                      ? 'bg-[#0E1721]/50 border-white/20 opacity-80'
                      : 'bg-[#0E1721]/30 border-white/5 opacity-50 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8B9AAA] mb-1">
                    <span>0{ev.step}</span>
                    <span>{ev.time}</span>
                  </div>
                  <div className="text-xs font-bold text-[#F4F7FA] font-sans truncate">
                    {ev.label}
                  </div>
                  <div className="text-[10px] font-mono text-[#19D3C5] truncate mt-0.5">
                    {ev.amount || ev.sublabel}
                  </div>
                </button>
                {index < events.length - 1 && (
                  <span className="text-[#8B9AAA] font-mono text-xs">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Step Cinematic Screen */}
      <div className="p-6 rounded-xl bg-[#0E1721] border border-[rgba(25,211,197,0.25)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold text-[#19D3C5]">
                SEQUENCE PHASE 0{activeEvent.step} // {activeEvent.time}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  activeEvent.threatLevel === 'safe'
                    ? 'bg-[#38D6A3]/15 text-[#38D6A3]'
                    : activeEvent.threatLevel === 'medium'
                    ? 'bg-[#FFB84D]/15 text-[#FFB84D]'
                    : 'bg-[#FF4D5F]/15 text-[#FF4D5F]'
                }`}
              >
                {activeEvent.threatLevel} severity
              </span>
            </div>

            <h4 className="text-2xl font-display font-extrabold text-[#F4F7FA]">
              {activeEvent.label} {activeEvent.amount && <span className="text-[#FF4D5F]">({activeEvent.amount})</span>}
            </h4>

            <p className="text-sm text-[#8B9AAA] max-w-2xl font-sans leading-relaxed">
              {activeEvent.details}
            </p>

            <div className="pt-2 text-xs font-mono text-[#19D3C5]">
              {activeEvent.signalVector}
            </div>
          </div>

          <div className="shrink-0 p-5 rounded-lg bg-[#080F17] border border-white/10 text-center min-w-[160px]">
            <span className="text-[10px] font-mono uppercase text-[#8B9AAA] block">System State</span>
            <span
              className={`text-lg font-mono font-bold block mt-1 ${
                activeEvent.step === 6 ? 'text-[#FF4D5F]' : 'text-[#38D6A3]'
              }`}
            >
              {activeEvent.step === 6 ? 'HALTED & FROZEN' : 'ACTIVE INGESTION'}
            </span>
            <span className="text-[10px] font-mono text-[#8B9AAA] block mt-0.5">
              Lat: 18ms • SHA-256 Valid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
