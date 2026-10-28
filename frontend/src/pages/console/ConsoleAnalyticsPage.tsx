import React from 'react';
import { BarChart3 } from 'lucide-react';
import { MetricBlock } from '../../components/intelligence';

export const ConsoleAnalyticsPage: React.FC = () => {
  const metrics = [
    { label: 'Fraud Cases Triage', value: '412', change: '-8%', trend: 'down' as const, subtext: 'Trailing 30-day resolution', color: 'critical' as const },
    { label: 'Fraud Amount Prevented', value: '₹14.8M', change: '+24%', trend: 'up' as const, subtext: 'Zero settlement loss', color: 'teal' as const },
    { label: 'Detection Rate', value: '99.4%', change: '+0.6%', trend: 'up' as const, subtext: 'Ensemble recall @ 0.1% FPR', color: 'safe' as const },
    { label: 'False Positive Ratio', value: '0.08%', change: '-0.02%', trend: 'down' as const, subtext: 'Customer frictionless rate', color: 'safe' as const },
    { label: 'Average Risk Index', value: '28.4', change: '-4.1', trend: 'down' as const, subtext: 'Healthy population baseline', color: 'blue' as const },
    { label: 'Transaction Volume', value: '1.84M', change: '+310k', trend: 'up' as const, subtext: 'Total ingested UPI events', color: 'teal' as const },
  ];

  const categories = [
    { label: 'Account Takeover (ATO / SIM-Swap)', count: 184, volume: '₹6.8M', pct: 45, color: '#FF4D5F' },
    { label: 'Mule Syndicate Dispersal', count: 122, volume: '₹4.9M', pct: 30, color: '#FF8533' },
    { label: 'Coerced / Phishing Authorizations', count: 68, volume: '₹2.1M', pct: 16, color: '#FFB84D' },
    { label: 'Test Probes & Rapid Micro-Drains', count: 38, volume: '₹1.0M', pct: 9, color: '#19D3C5' },
  ];

  const regions = [
    { city: 'Mumbai', share: '34%', alerts: 142, state: 'High Velocity' },
    { city: 'Bengaluru', share: '24%', alerts: 88, state: 'Normal Baseline' },
    { city: 'Delhi-NCR', share: '22%', alerts: 96, state: 'Elevated ATO' },
    { city: 'Hyderabad', share: '12%', alerts: 44, state: 'Normal Baseline' },
    { city: 'Ahmedabad', share: '8%', alerts: 32, state: 'Monitored' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#19D3C5]">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>FINANCIAL RISK ANALYTICS</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
            Institutional Threat Telemetry
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Macro-level risk distribution, syndicate cadence, and capital defense efficiency
          </p>
        </div>
      </div>

      {/* 6 Macro Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <MetricBlock
            key={m.label}
            label={m.label}
            value={m.value}
            change={m.change}
            trend={m.trend}
            subtext={m.subtext}
            color={m.color}
          />
        ))}
      </div>

      {/* 2 Integrated Analysis Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Fraud Category Distribution (lg:col-span-7) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#080F17] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-display font-bold text-[#F4F7FA]">
                Fraud Modality Breakdown
              </h3>
              <span className="text-xs font-mono text-[#19D3C5]">Total: ₹14.8M Prevented</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {categories.map((cat) => (
                <div key={cat.label} className="p-3 rounded-lg bg-[#0E1721] border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#F4F7FA]">{cat.label}</span>
                    <span className="font-bold" style={{ color: cat.color }}>
                      {cat.volume} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05080D] rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#8B9AAA]">
                    <span>{cat.count} Discovered Dockets</span>
                    <span>Automated P94 Trigger</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geographic Distribution (lg:col-span-5) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#080F17] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-display font-bold text-[#F4F7FA]">
                Geographic Risk Nodes
              </h3>
              <span className="text-xs font-mono text-[#8B9AAA]">Top Indian Hubs</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {regions.map((r) => (
                <div
                  key={r.city}
                  className="p-3 rounded-lg bg-[#0E1721] border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-[#F4F7FA] block">{r.city}</span>
                    <span className="text-[10px] text-[#8B9AAA]">{r.state}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#19D3C5] block">{r.share}</span>
                    <span className="text-[10px] text-[#8B9AAA]">{r.alerts} Flagged Events</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-[#8B9AAA]">
            GPS and IP Geofencing updated every 60s
          </div>
        </div>
      </div>
    </div>
  );
};
