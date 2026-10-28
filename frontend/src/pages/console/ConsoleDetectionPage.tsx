import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Pause,
  Play,
} from 'lucide-react';
import { RiskBadge, RiskLevel } from '../../components/intelligence';

interface DetectionEvent {
  id: string;
  amount: string;
  riskScore: number;
  status: RiskLevel;
  statusLabel: string;
  primarySignal: string;
  timestamp: string;
  customer: string;
  device: string;
  location: string;
}

export const ConsoleDetectionPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'review' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLivePaused, setIsLivePaused] = useState(false);

  const events: DetectionEvent[] = [
    {
      id: 'TXN-82931',
      amount: '₹84,500',
      riskScore: 94.2,
      status: 'critical',
      statusLabel: 'CRITICAL',
      primarySignal: 'Zero-Trust Device + Micro-Probe Warmup + Rapid Drain',
      timestamp: '02:47:11 AM',
      customer: 'Priya Sharma (CUST-99182)',
      device: 'DEV-92831 (Pixel 7)',
      location: 'Mumbai, IN',
    },
    {
      id: 'TXN-82932',
      amount: '₹2,100',
      riskScore: 8.4,
      status: 'safe',
      statusLabel: 'SAFE',
      primarySignal: 'Known Hardware Fingerprint • Routine Merchant Category',
      timestamp: '02:46:58 AM',
      customer: 'Rahul Verma (CUST-38192)',
      device: 'DEV-11029 (iPhone 14)',
      location: 'Bengaluru, IN',
    },
    {
      id: 'TXN-82933',
      amount: '₹19,800',
      riskScore: 71.8,
      status: 'high',
      statusLabel: 'REVIEW',
      primarySignal: 'Elevated Velocity Spike • New Payee Routing',
      timestamp: '02:45:20 AM',
      customer: 'Ananya Iyer (CUST-44021)',
      device: 'DEV-44012 (Galaxy S23)',
      location: 'Delhi, IN',
    },
    {
      id: 'TXN-82934',
      amount: '₹450',
      riskScore: 4.1,
      status: 'safe',
      statusLabel: 'SAFE',
      primarySignal: 'Micro-Amount Grocery • Biometrics Match',
      timestamp: '02:44:11 AM',
      customer: 'Vikram Singh (CUST-88192)',
      device: 'DEV-88121 (OnePlus 11)',
      location: 'Pune, IN',
    },
    {
      id: 'TXN-82935',
      amount: '₹1,25,000',
      riskScore: 88.5,
      status: 'high',
      statusLabel: 'REVIEW',
      primarySignal: 'Exceeds P90 User Ceiling • Cool-Off Enforced',
      timestamp: '02:43:05 AM',
      customer: 'Suresh Patel (CUST-19283)',
      device: 'DEV-99120 (Pixel 6)',
      location: 'Ahmedabad, IN',
    },
    {
      id: 'TXN-82936',
      amount: '₹92,000',
      riskScore: 96.0,
      status: 'critical',
      statusLabel: 'CRITICAL',
      primarySignal: 'Mule Ring Hop • Geo-Hop Displacement • Midnight Outlier',
      timestamp: '02:41:48 AM',
      customer: 'Deepak Joshi (CUST-77291)',
      device: 'DEV-92831 (Pixel 7)',
      location: 'Mumbai, IN',
    },
    {
      id: 'TXN-82937',
      amount: '₹1,400',
      riskScore: 12.0,
      status: 'safe',
      statusLabel: 'SAFE',
      primarySignal: 'Standard Retail UPI • Trusted Session',
      timestamp: '02:40:02 AM',
      customer: 'Meera Nair (CUST-55192)',
      device: 'DEV-55102 (iPhone 13)',
      location: 'Kochi, IN',
    },
  ];

  const filteredEvents = events.filter((ev) => {
    if (filter === 'critical' && ev.status !== 'critical') return false;
    if (filter === 'review' && ev.status !== 'high') return false;
    if (filter === 'safe' && ev.status !== 'safe') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ev.id.toLowerCase().includes(q) ||
        ev.customer.toLowerCase().includes(q) ||
        ev.primarySignal.toLowerCase().includes(q) ||
        ev.amount.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#19D3C5]">
            <Radio className={`w-3.5 h-3.5 ${isLivePaused ? '' : 'animate-pulse'}`} />
            <span>LIVE DETECTION // VERTICAL EVENT STREAM</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
            Real-Time Threat Ingestion
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Continuous transaction stream processed under 42ms median latency
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsLivePaused(!isLivePaused)}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              isLivePaused
                ? 'bg-[#FFB84D] text-[#05080D] border-[#FFB84D]'
                : 'bg-[#19D3C5] text-[#05080D] border-[#19D3C5]'
            }`}
          >
            {isLivePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isLivePaused ? 'RESUME STREAM' : 'PAUSE LIVE'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-[#080F17] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8B9AAA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by TXN ID, customer, signal..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0E1721] border border-white/10 text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3C5]"
          />
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#8B9AAA]" />
          <span className="text-[#8B9AAA] mr-1">Filter:</span>
          {(['all', 'critical', 'review', 'safe'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded text-xs uppercase font-bold transition-colors ${
                filter === t
                  ? 'bg-[#19D3C5] text-[#05080D]'
                  : 'bg-[#0E1721] text-[#8B9AAA] hover:text-white border border-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Flowing Event Stream */}
      <div className="space-y-3">
        {filteredEvents.map((ev) => (
          <div
            key={ev.id}
            className={`p-4 sm:p-5 rounded-xl border transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              ev.status === 'critical'
                ? 'bg-[#0E1721] border-[#FF4D5F]/40 shadow-[0_0_24px_rgba(255,77,95,0.18)]'
                : ev.status === 'high'
                ? 'bg-[#0E1721] border-[#FF8533]/30'
                : 'bg-[#0E1721]/60 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start space-x-4 min-w-0">
              <div className="mt-1 shrink-0">
                <RiskBadge level={ev.status} score={ev.riskScore} size="md" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-xl font-display font-bold text-[#F4F7FA]">
                    {ev.amount}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#19D3C5]">{ev.id}</span>
                  <span className="text-xs font-sans text-[#8B9AAA]">({ev.customer})</span>
                </div>

                <p className="mt-1 text-xs font-mono text-[#8B9AAA]">
                  {ev.primarySignal}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#576574]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#19D3C5]" />
                    <span>{ev.timestamp}</span>
                  </span>
                  <span>•</span>
                  <span>{ev.device}</span>
                  <span>•</span>
                  <span>{ev.location}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-3">
              <Link
                to={`/console/investigations`}
                className="px-4 py-2 rounded font-mono text-xs font-bold bg-[#19D3C5] text-[#05080D] hover:bg-[#26E6D8] transition-all flex items-center space-x-1.5 shadow-[0_0_12px_rgba(25,211,197,0.3)]"
              >
                <span>Triage Event</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
