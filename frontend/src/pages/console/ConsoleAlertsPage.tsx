import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Filter, Search, CheckCircle2 } from 'lucide-react';
import { AlertItem, RiskLevel } from '../../components/intelligence';

interface AlertEntry {
  id: string;
  severity: RiskLevel;
  amount: string;
  riskScore: number;
  signalsSummary: string;
  timeAgo: string;
  customerName: string;
}

export const ConsoleAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [search, setSearch] = useState('');

  const alerts: AlertEntry[] = [
    {
      id: 'ALT-9921',
      severity: 'critical',
      amount: '₹84,500',
      riskScore: 94,
      signalsSummary: 'New device + unusual location + high transaction velocity (Micro-probe warmup)',
      timeAgo: '2 min ago',
      customerName: 'Priya Sharma',
    },
    {
      id: 'ALT-9920',
      severity: 'critical',
      amount: '₹92,000',
      riskScore: 96,
      signalsSummary: 'Direct payee hop to confirmed mule syndicate account + GPS spoofing flag',
      timeAgo: '5 min ago',
      customerName: 'Deepak Joshi',
    },
    {
      id: 'ALT-9919',
      severity: 'high',
      amount: '₹1,25,000',
      riskScore: 88,
      signalsSummary: 'Exceeds 90-day circadian transfer ceiling • Step-up challenge failure',
      timeAgo: '12 min ago',
      customerName: 'Suresh Patel',
    },
    {
      id: 'ALT-9918',
      severity: 'high',
      amount: '₹19,800',
      riskScore: 71,
      signalsSummary: 'Sudden high velocity transfer to newly whitelisted VPA within 15 minutes',
      timeAgo: '28 min ago',
      customerName: 'Ananya Iyer',
    },
    {
      id: 'ALT-9917',
      severity: 'medium',
      amount: '₹14,500',
      riskScore: 52,
      signalsSummary: 'First-time late night transfer from secondary mobile device',
      timeAgo: '1 hour ago',
      customerName: 'Vikramaditya Rao',
    },
  ];

  const handleInvestigate = (id: string) => {
    navigate('/console/investigations', { state: { alertId: id } });
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity === 'critical' && a.severity !== 'critical') return false;
    if (filterSeverity === 'high' && a.severity !== 'high') return false;
    if (filterSeverity === 'medium' && a.severity !== 'medium') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.signalsSummary.toLowerCase().includes(q) ||
        a.amount.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[#FF4D5F]">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>ALERT CENTER // TRIAGE INBOX</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
            Active Threat Alerts
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Severity-ranked alert inbox with direct evidence examination triggers
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-[#38D6A3]">
          <CheckCircle2 className="w-4 h-4" />
          <span>Zero Backlog Escalations</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#080F17] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8B9AAA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by customer, ID, or trigger..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0E1721] border border-white/10 text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3C5]"
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#8B9AAA]" />
          <span className="text-[#8B9AAA] mr-1">Severity:</span>
          {(['all', 'critical', 'high', 'medium'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilterSeverity(lvl)}
              className={`px-3 py-1 rounded text-xs uppercase font-bold transition-colors ${
                filterSeverity === lvl
                  ? 'bg-[#19D3C5] text-[#05080D]'
                  : 'bg-[#0E1721] text-[#8B9AAA] hover:text-white border border-white/10'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Inbox List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <AlertItem
            key={item.id}
            id={item.id}
            severity={item.severity}
            amount={item.amount}
            riskScore={item.riskScore}
            signalsSummary={item.signalsSummary}
            timeAgo={item.timeAgo}
            customerName={item.customerName}
            onInvestigate={handleInvestigate}
          />
        ))}
      </div>
    </div>
  );
};
