import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Radio,
  Activity,
  Layers,
  Search,
} from 'lucide-react';
import { MetricBlock, RiskBadge } from '../../components/intelligence';

export const ConsoleOverviewPage: React.FC = () => {
  const liveTransactions = [
    {
      id: 'TXN-82931',
      amount: '₹84,500',
      riskScore: 94,
      status: 'critical' as const,
      statusText: 'BLOCKED',
      time: 'Just now',
      payee: 'quickpay.mule99@oksbi',
      signal: 'Zero-Trust Device + Geo-Hop Mismatch + Micro-Probe Warmup',
    },
    {
      id: 'TXN-82932',
      amount: '₹2,100',
      riskScore: 8,
      status: 'safe' as const,
      statusText: 'SAFE',
      time: '24s ago',
      payee: 'grocery_mart@hdfc',
      signal: 'Trusted Device Binding • Clean Historical Merchant',
    },
    {
      id: 'TXN-82933',
      amount: '₹19,800',
      riskScore: 71,
      status: 'high' as const,
      statusText: 'REVIEW',
      time: '1m ago',
      payee: 'crypto_gate.in@axis',
      signal: 'Elevated Velocity Spike • New Payee Routing',
    },
    {
      id: 'TXN-82934',
      amount: '₹450',
      riskScore: 4,
      status: 'safe' as const,
      statusText: 'SAFE',
      time: '2m ago',
      payee: 'chai_point@icici',
      signal: 'Routine Small Ticket • Verified GPS Fix',
    },
    {
      id: 'TXN-82935',
      amount: '₹1,25,000',
      riskScore: 88,
      status: 'high' as const,
      statusText: 'HOLD',
      time: '3m ago',
      payee: 'fast_remit@yesbank',
      signal: 'Exceeds P90 User Ceiling • Cool-Off Triggered',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header: FIN SURE INTELLIGENCE / SYSTEM STATUS: OPERATIONAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#19D3FF]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-bold tracking-widest uppercase">FIN SURE INTELLIGENCE</span>
            <span className="text-white/20">•</span>
            <span className="text-[#38D6A3] font-semibold">SYSTEM STATUS: OPERATIONAL</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1.5">
            Security Command Overview
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Continuous multi-signal telemetry ingestion across simulated UPI settlement rails
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/console/investigations"
            className="px-4 py-2 rounded-xl bg-[#19D3FF] text-[#05080D] font-mono text-xs font-bold hover:bg-[#19D3FF]/90 transition-all flex items-center space-x-1.5 shadow-[0_0_16px_rgba(25,211,255,0.35)]"
          >
            <span>Active Docket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Large Data Blocks: Active Alerts, High Risk, Transactions Evaluated, P95 Latency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBlock
          label="Active Alerts"
          value="14"
          change="+3 Pending"
          trend="up"
          subtext="Requiring tier-1 analyst review"
          color="critical"
        />
        <MetricBlock
          label="High Risk Level"
          value="87"
          change="Critical Band"
          trend="up"
          subtext="Scale 0–100 • 3 Syndicates Under Triage"
          color="critical"
        />
        <MetricBlock
          label="Transactions Evaluated"
          value="142,890"
          change="+18.4% / 24h"
          trend="up"
          subtext="Real-time multi-model ingestion"
          color="teal"
        />
        <MetricBlock
          label="P95 Decision Latency"
          value="38 ms"
          change="-12% Latency"
          trend="down"
          subtext="Well within < 100ms SLO budget"
          color="teal"
        />
      </div>

      {/* Live Intelligence Field & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Telemetry Event Flow (lg:col-span-8) */}
        <div className="lg:col-span-8 rounded-2xl bg-[#080F17] border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#19D3FF] animate-pulse" />
                <h3 className="text-lg font-display font-bold text-[#F4F7FA]">
                  Live Transaction Intelligence Stream
                </h3>
              </div>
              <p className="text-xs font-mono text-[#8B9AAA] mt-0.5">
                Incoming UPI events evaluated dynamically by FinSure Brain
              </p>
            </div>

            <Link
              to="/console/detection"
              className="text-xs font-mono text-[#19D3FF] hover:underline flex items-center space-x-1"
            >
              <span>Full Stream View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Transaction Flow List with Visual Risk Hierarchy */}
          <div className="space-y-3">
            {liveTransactions.map((tx) => (
              <div
                key={tx.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  tx.status === 'critical'
                    ? 'bg-[#0E1721] border-[#FF4D5F]/35 shadow-[0_0_20px_rgba(255,77,95,0.12)]'
                    : tx.status === 'high'
                    ? 'bg-[#0E1721]/70 border-[#FFB84D]/25'
                    : 'bg-[#0B131D]/50 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-[#F4F7FA]">
                      {tx.id}
                    </span>
                    <span className="font-mono text-xs text-[#8B9AAA]">
                      {tx.payee}
                    </span>
                    <RiskBadge level={tx.status} score={tx.riskScore} />
                  </div>
                  <p className="text-xs font-mono text-[#8B9AAA] truncate">
                    {tx.signal}
                  </p>
                </div>

                <div className="flex items-center space-x-6 shrink-0 font-mono text-right">
                  <div>
                    <span className="block text-base font-bold text-[#F4F7FA]">
                      {tx.amount}
                    </span>
                    <span className="text-[11px] text-[#8B9AAA] flex items-center justify-end space-x-1">
                      <Clock className="w-3 h-3 inline" />
                      <span>{tx.time}</span>
                    </span>
                  </div>

                  <Link
                    to="/console/investigations"
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-[#F4F7FA] border border-white/10 transition-colors"
                  >
                    Triage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Risk Distribution & Modality Breakdown (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Risk Distribution Canvas */}
          <div className="p-6 rounded-2xl bg-[#080F17] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B9AAA]">
                Decision Distribution
              </span>
              <span className="text-[10px] font-mono text-[#38D6A3]">LAST 1,000 TXNS</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#38D6A3]">APPROVE (0–39)</span>
                  <span className="font-bold text-[#F4F7FA]">91.4%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#38D6A3] w-[91.4%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#FFB84D]">VERIFY (40–69)</span>
                  <span className="font-bold text-[#F4F7FA]">5.8%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFB84D] w-[5.8%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#FF8533]">HOLD (70–89)</span>
                  <span className="font-bold text-[#F4F7FA]">2.1%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF8533] w-[2.1%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#FF4D5F]">BLOCK (90–100)</span>
                  <span className="font-bold text-[#F4F7FA]">0.7%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF4D5F] w-[0.7%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-6 rounded-2xl bg-[#080F17] border border-white/10 space-y-3 font-mono text-xs">
            <span className="text-xs uppercase tracking-wider text-[#8B9AAA] block pb-2 border-b border-white/10">
              Analyst Workspaces
            </span>
            <Link
              to="/console/network"
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1422] hover:bg-[#0D1422]/80 border border-white/5 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-4 h-4 text-[#4F8CFF]" />
                <span>Trinetra Relational Graph</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8B9AAA]" />
            </Link>

            <Link
              to="/console/replay"
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1422] hover:bg-[#0D1422]/80 border border-white/5 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4 text-[#19D3C5]" />
                <span>Threat Attack Replay</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8B9AAA]" />
            </Link>

            <Link
              to="/console/investigations"
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1422] hover:bg-[#0D1422]/80 border border-white/5 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Search className="w-4 h-4 text-[#FF4D5F]" />
                <span>Case Docket &amp; Grounding</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8B9AAA]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
