import React, { useState } from 'react';
import { Search, ArrowRight, X } from 'lucide-react';
import { RiskBadge, RiskLevel } from '../../components/intelligence';

interface TransactionRecord {
  id: string;
  amount: string;
  amountNumeric: number;
  riskScore: number;
  status: RiskLevel;
  date: string;
  time: string;
  location: string;
  device: string;
  merchant: string;
  payeeVpa: string;
  customer: string;
  account: string;
  signals: string[];
}

export const ConsoleTransactionsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [minRisk, setMinRisk] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState<TransactionRecord | null>(null);

  const transactions: TransactionRecord[] = [
    {
      id: 'TXN-82931',
      amount: '₹84,500',
      amountNumeric: 84500,
      riskScore: 94.2,
      status: 'critical',
      date: '2026-09-30',
      time: '02:47 AM',
      location: 'Mumbai, IN',
      device: 'DEV-92831 (Pixel 7)',
      merchant: 'Shell Corporate Entity',
      payeeVpa: 'quickpay.mule99@oksbi',
      customer: 'Priya Sharma (CUST-99182)',
      account: 'SB-88192-01',
      signals: ['Amount +640%', 'Unbound Device', 'Geo-Hop Mismatch', 'Mule Syndicate VPA'],
    },
    {
      id: 'TXN-82932',
      amount: '₹2,100',
      amountNumeric: 2100,
      riskScore: 8.4,
      status: 'safe',
      date: '2026-09-30',
      time: '02:46 AM',
      location: 'Bengaluru, IN',
      device: 'DEV-11029 (iPhone 14)',
      merchant: 'Fresh Organic Mart',
      payeeVpa: 'grocery_mart@hdfc',
      customer: 'Rahul Verma (CUST-38192)',
      account: 'SB-38192-02',
      signals: ['Clean History', 'Biometric Bound', 'Trusted POS'],
    },
    {
      id: 'TXN-82933',
      amount: '₹19,800',
      amountNumeric: 19800,
      riskScore: 71.8,
      status: 'high',
      date: '2026-09-30',
      time: '02:45 AM',
      location: 'Delhi, IN',
      device: 'DEV-44012 (Galaxy S23)',
      merchant: 'Digital Asset Remit',
      payeeVpa: 'crypto_gate.in@axis',
      customer: 'Ananya Iyer (CUST-44021)',
      account: 'SB-44021-01',
      signals: ['Velocity Spike', 'New Beneficiary', 'Late Night Cadence'],
    },
    {
      id: 'TXN-82934',
      amount: '₹450',
      amountNumeric: 450,
      riskScore: 4.1,
      status: 'safe',
      date: '2026-09-30',
      time: '02:44 AM',
      location: 'Pune, IN',
      device: 'DEV-88121 (OnePlus 11)',
      merchant: 'Chai Point Express',
      payeeVpa: 'chai_point@icici',
      customer: 'Vikram Singh (CUST-88192)',
      account: 'SB-88192-03',
      signals: ['Everyday Payment', 'Local Geofence'],
    },
    {
      id: 'TXN-82935',
      amount: '₹1,25,000',
      amountNumeric: 125000,
      riskScore: 88.5,
      status: 'high',
      date: '2026-09-30',
      time: '02:43 AM',
      location: 'Ahmedabad, IN',
      device: 'DEV-99120 (Pixel 6)',
      merchant: 'Fast Remittance Corp',
      payeeVpa: 'fast_remit@yesbank',
      customer: 'Suresh Patel (CUST-19283)',
      account: 'SB-19283-01',
      signals: ['Exceeds P90 Threshold', 'Cool-Off Applied'],
    },
    {
      id: 'TXN-82936',
      amount: '₹92,000',
      amountNumeric: 92000,
      riskScore: 96.0,
      status: 'critical',
      date: '2026-09-30',
      time: '02:41 AM',
      location: 'Mumbai, IN',
      device: 'DEV-92831 (Pixel 7)',
      merchant: 'Shell Corporate Entity',
      payeeVpa: 'mule_ops_collector@icici',
      customer: 'Deepak Joshi (CUST-77291)',
      account: 'SB-77291-01',
      signals: ['Known Device Cluster', 'Proxy Egress', 'Drain Pattern'],
    },
  ];

  const filtered = transactions.filter((t) => {
    if (t.riskScore < minRisk) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.merchant.toLowerCase().includes(q) ||
        t.device.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-xs font-mono text-[#19D3C5] tracking-widest uppercase block">
            TELEMETRY EXPLORER // QUERY ENGINE
          </span>
          <h1 className="text-3xl font-display font-extrabold text-[#F4F7FA] mt-1">
            Transaction Intelligence Explorer
          </h1>
          <p className="text-xs text-[#8B9AAA] font-mono mt-0.5">
            Filter, search, and deep-inspect financial events across dimensional parameters
          </p>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="p-5 rounded-xl bg-[#080F17] border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-4 font-mono text-xs items-center">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-[#8B9AAA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, customer, merchant, location..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0E1721] border border-white/10 text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3C5]"
          />
        </div>

        {/* Risk Range Slider */}
        <div className="md:col-span-6 flex items-center space-x-3 bg-[#0E1721] p-2 rounded-lg border border-white/10">
          <span className="text-[#8B9AAA] shrink-0">Min Risk: {minRisk}%</span>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minRisk}
            onChange={(e) => setMinRisk(Number(e.target.value))}
            className="w-full accent-[#19D3C5] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setMinRisk(0)}
            className="text-[10px] text-[#19D3C5] underline shrink-0 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Transactions Table / List View */}
      <div className="rounded-xl bg-[#080F17] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0E1721] text-[#8B9AAA] uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Threat Level</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTxn(t)}
                  className={`hover:bg-white/5 cursor-pointer transition-colors ${
                    selectedTxn?.id === t.id ? 'bg-[#0E1721] border-l-2 border-[#19D3C5]' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-[#F4F7FA]">{t.id}</td>
                  <td className="py-3.5 px-4 font-bold text-[#F4F7FA] font-display text-sm">
                    {t.amount}
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskBadge level={t.status} score={t.riskScore} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-[#8B9AAA] truncate max-w-[160px]">{t.customer}</td>
                  <td className="py-3.5 px-4 text-[#8B9AAA]">{t.location}</td>
                  <td className="py-3.5 px-4 text-[#8B9AAA] truncate max-w-[140px]">{t.device}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-[#19D3C5] hover:underline font-bold inline-flex items-center space-x-1">
                      <span>Examine</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Transaction Detailed Drawer / Slideover */}
      {selectedTxn && (
        <div className="p-6 rounded-xl bg-[#0E1721] border border-[rgba(25,211,197,0.3)] shadow-[0_12px_40px_rgba(0,0,0,0.85)] animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <RiskBadge level={selectedTxn.status} score={selectedTxn.riskScore} size="md" />
              <span className="text-xl font-display font-bold text-[#F4F7FA]">
                {selectedTxn.id} // Detailed Telemetry Dossier
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTxn(null)}
              className="p-1.5 rounded text-[#8B9AAA] hover:text-white hover:bg-white/10"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#080F17] border border-white/10">
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Amount & Payee</span>
              <span className="text-xl font-bold text-[#F4F7FA] font-display">{selectedTxn.amount}</span>
              <span className="text-[11px] text-[#19D3C5] block mt-0.5 truncate">{selectedTxn.payeeVpa}</span>
            </div>

            <div className="p-3 rounded-lg bg-[#080F17] border border-white/10">
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Hardware & Egress</span>
              <span className="text-sm font-bold text-[#F4F7FA] block truncate">{selectedTxn.device}</span>
              <span className="text-[11px] text-[#8B9AAA] block mt-0.5">{selectedTxn.location}</span>
            </div>

            <div className="p-3 rounded-lg bg-[#080F17] border border-white/10">
              <span className="text-[10px] text-[#8B9AAA] uppercase block">Telemetry Flags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTxn.signals.map((s) => (
                  <span key={s} className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-white">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
