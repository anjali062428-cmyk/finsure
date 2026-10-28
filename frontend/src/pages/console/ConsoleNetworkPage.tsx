import React, { useState } from 'react';
import { Network, Filter, Clock } from 'lucide-react';
import { FraudNetwork } from '../../components/intelligence';

export const ConsoleNetworkPage: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');

  const timelineEvents = [
    { time: '10:32 PM', note: 'Customer Priya Sharma authenticates from clean IP in Bengaluru.' },
    { time: '11:04 PM', note: 'New Device DEV-92831 connects via Proxy IP 49.36.19.82 in Mumbai.' },
    { time: '11:17 PM', note: 'Micro-probe of ₹2,000 sent to newly linked VPA quickpay.mule99@oksbi.' },
    { time: '11:19 PM', note: 'Second transfer of ₹18,000 executed; graph link weight increases.' },
    { time: '11:21 PM', note: 'TXN-82931 of ₹84,500 blocked by Trinetra multi-hop syndicate detection.' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#19D3C5]">
            <Network className="w-3.5 h-3.5" />
            <span>TRINETRA NETWORK GRAPH EXPLORER</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
            Fraud Syndicate Relational Topology
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Interactive multi-hop entity graph identifying mule rings, device clusters, and egress proxies
          </p>
        </div>
      </div>

      {/* Main Full-Screen Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Filter Column (lg:col-span-3) */}
        <div className="lg:col-span-3 p-5 rounded-xl bg-[#080F17] border border-white/10 space-y-4 font-mono text-xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-white/10 text-[#19D3C5] font-bold">
            <Filter className="w-4 h-4" />
            <span>Entity Scope Filters</span>
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'all', label: 'All Entities (6)' },
              { id: 'customer', label: 'Customers' },
              { id: 'device', label: 'Hardware Devices' },
              { id: 'ip', label: 'IP / Proxies' },
              { id: 'merchant', label: 'Mule VPAs' },
              { id: 'transaction', label: 'Transactions' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterType(item.id)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  filterType === item.id
                    ? 'bg-[#0E1721] text-[#19D3C5] border border-[rgba(25,211,197,0.3)] font-bold'
                    : 'text-[#8B9AAA] hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <span className="text-[10px] text-[#8B9AAA] uppercase block">Detection Parameters</span>
            <div className="text-[11px] text-[#8B9AAA]">
              <div>Max Hop Depth: <strong className="text-white">3 Hops</strong></div>
              <div>Syndicate Clust: <strong className="text-[#FF4D5F]">SYN-MULE-44</strong></div>
              <div>Graph Algorithm: <strong className="text-[#19D3C5]">Louvain + PageRank</strong></div>
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Graph & Entity Details (lg:col-span-9) */}
        <div className="lg:col-span-9 space-y-6">
          <FraudNetwork height="h-[480px]" />

          {/* Bottom: Relationship Timeline */}
          <div className="p-5 rounded-xl bg-[#080F17] border border-white/10 font-mono text-xs">
            <div className="flex items-center space-x-2 pb-3 border-b border-white/10 mb-3 text-[#19D3C5] font-bold">
              <Clock className="w-4 h-4" />
              <span>Syndicate Formation & Multi-Hop Execution Timeline</span>
            </div>

            <div className="space-y-2">
              {timelineEvents.map((t, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs">
                  <span className="text-[#19D3C5] font-bold shrink-0">{t.time}</span>
                  <span className="text-[#8B9AAA]">{t.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
