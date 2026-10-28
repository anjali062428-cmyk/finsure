import React, { useState } from 'react';
import { Smartphone, Clock, MapPin, Zap, Store, CreditCard } from 'lucide-react';

export interface TransactionSignal {
  id: string;
  name: string;
  icon: React.ReactNode;
  value: string;
  anomaly: string;
  severity: 'safe' | 'warning' | 'critical' | 'teal';
  details: string;
}

export interface TransactionEventProps {
  amount?: string;
  timestamp?: string;
  location?: string;
  device?: string;
  channel?: string;
  status?: string;
  riskScore?: number;
  interactive?: boolean;
  className?: string;
}

export const TransactionEvent: React.FC<TransactionEventProps> = ({
  amount = '₹84,500',
  timestamp = '02:47 AM',
  location = 'Mumbai, IN',
  device = 'Pixel 7 (Unrecognized)',
  channel = 'UPI P2P',
  riskScore = 94.2,
  interactive = true,
  className = '',
}) => {
  const [selectedSignal, setSelectedSignal] = useState<string | null>('device');

  const signals: TransactionSignal[] = [
    {
      id: 'amount',
      name: 'AMOUNT',
      icon: <CreditCard className="w-3.5 h-3.5" />,
      value: amount,
      anomaly: '+640% vs Baseline',
      severity: 'critical',
      details: 'Historical 30-day mean for this customer is ₹11,200. This single payment exceeds 99th percentile threshold.',
    },
    {
      id: 'time',
      name: 'TIME',
      icon: <Clock className="w-3.5 h-3.5" />,
      value: timestamp,
      anomaly: 'Circadian Outlier',
      severity: 'warning',
      details: 'Account has zero transaction history between 01:00 AM and 05:30 AM over past 180 days.',
    },
    {
      id: 'device',
      name: 'DEVICE',
      icon: <Smartphone className="w-3.5 h-3.5" />,
      value: device,
      anomaly: 'Zero Trust Hardware',
      severity: 'critical',
      details: 'Fingerprint hash not seen in user history. SIM-binding authentication token refreshed 14 minutes prior.',
    },
    {
      id: 'location',
      name: 'LOCATION',
      icon: <MapPin className="w-3.5 h-3.5" />,
      value: location,
      anomaly: 'Geo-Hop Mismatch',
      severity: 'critical',
      details: 'Previous legitimate transaction logged in Bengaluru 82 minutes ago. Physical transit impossible.',
    },
    {
      id: 'velocity',
      name: 'VELOCITY',
      icon: <Zap className="w-3.5 h-3.5" />,
      value: '4 Txns / 7 min',
      anomaly: 'Rapid Escalation',
      severity: 'critical',
      details: 'Sequence of micro-test transfers rapidly escalating: ₹10 -> ₹2,000 -> ₹18,000 -> ₹84,500.',
    },
    {
      id: 'merchant',
      name: 'PAYEE',
      icon: <Store className="w-3.5 h-3.5" />,
      value: 'quickpay.mule99@oksbi',
      anomaly: 'Known High-Risk Cluster',
      severity: 'critical',
      details: 'Counterparty VPA linked to a mule syndicate flagged in 12 bank fraud reports within 48 hours.',
    },
  ];

  const activeSignal = signals.find((s) => s.id === selectedSignal) || signals[0];

  return (
    <div className={`relative w-full max-w-4xl mx-auto rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] ${className}`}>
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#19D3C5]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D5F] animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-[#8B9AAA] uppercase">
            EVENT TELEMETRY // {channel}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-[#8B9AAA]">RISK EVALUATION</span>
          <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold text-[#FF4D5F] bg-[#FF4D5F]/10 border border-[#FF4D5F]/30">
            {riskScore}% CRITICAL
          </span>
        </div>
      </div>

      {/* Central Transaction Object */}
      <div className="py-8 text-center relative">
        <span className="text-xs font-mono uppercase tracking-widest text-[#19D3C5] mb-2 block">
          Flagged Transaction Payload
        </span>
        <div className="text-5xl sm:text-7xl font-display font-extrabold tracking-tight text-[#F4F7FA] text-glow">
          {amount}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-[#8B9AAA]">
          <span className="px-2 py-0.5 rounded bg-[#0E1721] border border-white/10">{channel}</span>
          <span className="px-2 py-0.5 rounded bg-[#0E1721] border border-white/10">{timestamp}</span>
          <span className="px-2 py-0.5 rounded bg-[#0E1721] border border-white/10">{location}</span>
          <span className="px-2 py-0.5 rounded bg-[#FF4D5F]/10 text-[#FF4D5F] border border-[#FF4D5F]/20">
            {device}
          </span>
        </div>
      </div>

      {/* Dimensional Signals Grid */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="text-xs font-mono uppercase tracking-wider text-[#8B9AAA] mb-4 text-center">
          Connected Telemetry Signals (Click to Inspect Evidence)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {signals.map((signal) => (
            <button
              key={signal.id}
              type="button"
              onClick={() => interactive && setSelectedSignal(signal.id)}
              className={`p-3 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between ${
                selectedSignal === signal.id
                  ? 'bg-[#0E1721] border-[#19D3C5] shadow-[0_0_20px_rgba(25,211,197,0.25)]'
                  : 'bg-[#0E1721]/50 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#8B9AAA] mb-2">
                <span className="text-[10px] font-mono font-bold tracking-wider">{signal.name}</span>
                <span className="text-[#19D3C5]">{signal.icon}</span>
              </div>
              <div className="font-mono text-xs font-semibold text-[#F4F7FA] truncate">
                {signal.value}
              </div>
              <div className="mt-1 text-[10px] font-mono text-[#FF4D5F] truncate">
                {signal.anomaly}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Signal Detail Panel */}
        {activeSignal && (
          <div className="mt-6 p-4 rounded-xl bg-[#0E1721] border border-[rgba(25,211,197,0.25)] animate-in fade-in duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-[#080F17] border border-[rgba(25,211,197,0.3)] text-[#19D3C5] shrink-0 mt-0.5">
                {activeSignal.icon}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-[#19D3C5] tracking-wide">
                    {activeSignal.name} ANOMALY ANALYSIS
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FF4D5F]/15 text-[#FF4D5F] border border-[#FF4D5F]/30">
                    {activeSignal.anomaly}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#8B9AAA] leading-relaxed max-w-2xl font-sans">
                  {activeSignal.details}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono uppercase text-[#8B9AAA] block">Telemetry Status</span>
              <span className="text-xs font-mono font-bold text-[#38D6A3]">VERIFIED EVIDENCE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
