import React, { useState } from 'react';
import { User, CreditCard, Smartphone, Globe, Store, FileText } from 'lucide-react';

export interface NetworkNode {
  id: string;
  type: 'customer' | 'account' | 'device' | 'ip' | 'merchant' | 'transaction';
  name: string;
  subtext: string;
  risk: 'safe' | 'medium' | 'high' | 'critical';
  x: number;
  y: number;
  details: {
    entityId: string;
    connectedCount: number;
    suspiciousCount: number;
    firstSeen: string;
    flagReason: string;
  };
}

export interface NetworkLink {
  source: string;
  target: string;
  label?: string;
  critical?: boolean;
}

export const FraudNetwork: React.FC<{
  className?: string;
  onSelectNode?: (node: NetworkNode) => void;
  height?: string;
}> = ({ className = '', onSelectNode, height = 'h-[500px]' }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-device');

  const nodes: NetworkNode[] = [
    {
      id: 'node-customer',
      type: 'customer',
      name: 'Priya Sharma',
      subtext: 'USER_CUST_99182',
      risk: 'safe',
      x: 180,
      y: 120,
      details: {
        entityId: 'CUST-99182',
        connectedCount: 2,
        suspiciousCount: 1,
        firstSeen: '2023-04-12',
        flagReason: 'Legitimate account holder whose credentials were compromised via SIM swap.',
      },
    },
    {
      id: 'node-account',
      type: 'account',
      name: 'SBI Prim. Account',
      subtext: 'AC-781920-99',
      risk: 'medium',
      x: 240,
      y: 280,
      details: {
        entityId: 'AC-781920-99',
        connectedCount: 3,
        suspiciousCount: 2,
        firstSeen: '2023-04-14',
        flagReason: 'High outbound velocity after 90 days of normal salary inflows.',
      },
    },
    {
      id: 'node-device',
      type: 'device',
      name: 'Hardware DEV-92831',
      subtext: 'Android Pixel 7',
      risk: 'critical',
      x: 500,
      y: 100,
      details: {
        entityId: 'DEV-92831',
        connectedCount: 4,
        suspiciousCount: 7,
        firstSeen: '2026-09-30',
        flagReason: 'Known device fingerprint tied to 4 distinct UPI IDs and 7 suspicious transfers across 2 banks.',
      },
    },
    {
      id: 'node-ip',
      type: 'ip',
      name: 'Proxy IP 49.36.19.82',
      subtext: 'Commercial VPN AS13335',
      risk: 'critical',
      x: 740,
      y: 150,
      details: {
        entityId: 'IP-49.36.19.82',
        connectedCount: 18,
        suspiciousCount: 14,
        firstSeen: '2026-08-11',
        flagReason: 'Datacenter egress IP associated with coordinated brute-force & credential stuffing campaigns.',
      },
    },
    {
      id: 'node-merchant',
      type: 'merchant',
      name: 'quickpay.mule99@oksbi',
      subtext: 'Flagged Mule VPA',
      risk: 'critical',
      x: 520,
      y: 310,
      details: {
        entityId: 'VPA-MULE-99',
        connectedCount: 11,
        suspiciousCount: 9,
        firstSeen: '2026-09-28',
        flagReason: 'Shell merchant account receiving funds from disparate customer profiles and immediately off-ramping.',
      },
    },
    {
      id: 'node-transaction',
      type: 'transaction',
      name: 'TXN-82931 (₹84,500)',
      subtext: 'Target Fraud Event',
      risk: 'critical',
      x: 520,
      y: 440,
      details: {
        entityId: 'TXN-82931',
        connectedCount: 5,
        suspiciousCount: 5,
        firstSeen: '2026-09-30 02:47 AM',
        flagReason: 'Blocked transaction attempt triggered by aggregate multi-hop graph proximity to mule syndicate.',
      },
    },
  ];

  const links: NetworkLink[] = [
    { source: 'node-customer', target: 'node-account', label: 'Primary Owner' },
    { source: 'node-device', target: 'node-account', label: 'Unverified Binding', critical: true },
    { source: 'node-device', target: 'node-ip', label: 'Egress Route', critical: true },
    { source: 'node-account', target: 'node-merchant', label: 'Escalating Inflow', critical: true },
    { source: 'node-ip', target: 'node-merchant', label: 'Coordinated Access', critical: true },
    { source: 'node-merchant', target: 'node-transaction', label: 'Settlement Payload', critical: true },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];

  const getNodeIcon = (type: NetworkNode['type']) => {
    switch (type) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'account':
        return <CreditCard className="w-4 h-4" />;
      case 'device':
        return <Smartphone className="w-4 h-4" />;
      case 'ip':
        return <Globe className="w-4 h-4" />;
      case 'merchant':
        return <Store className="w-4 h-4" />;
      case 'transaction':
        return <FileText className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk: NetworkNode['risk']) => {
    switch (risk) {
      case 'safe':
        return '#38D6A3';
      case 'medium':
        return '#FFB84D';
      case 'high':
        return '#FF8533';
      case 'critical':
        return '#FF4D5F';
    }
  };

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className={`relative w-full rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] ${className}`}>
      {/* Top Bar */}
      <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#19D3C5] uppercase block">
            TRINETRA GRAPH ENGINE // MULTI-HOP TOPOLOGY
          </span>
          <h3 className="text-xl font-display font-bold text-[#F4F7FA]">
            Fraud Syndicate Relational Ring
          </h3>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-[#38D6A3]">
            <span className="w-2 h-2 rounded-full bg-[#38D6A3]" />
            <span>Customer</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#FFB84D]">
            <span className="w-2 h-2 rounded-full bg-[#FFB84D]" />
            <span>Account</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#FF4D5F]">
            <span className="w-2 h-2 rounded-full bg-[#FF4D5F] shadow-[0_0_8px_#FF4D5F]" />
            <span>Mule / Threat</span>
          </div>
        </div>
      </div>

      {/* Main Canvas and Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* SVG Network Visualizer */}
        <div className={`lg:col-span-2 relative ${height} bg-[#05080D] p-4 flex items-center justify-center overflow-x-auto`}>
          {/* Subtle Background Grid */}
          <div className="absolute inset-0 bg-dot-dense opacity-40 pointer-events-none" />

          <svg
            viewBox="0 0 920 540"
            className="w-full h-full max-w-full"
            style={{ minWidth: '600px' }}
          >
            <defs>
              <linearGradient id="linkGradientThreat" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#19D3C5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FF4D5F" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Links / Edges */}
            {links.map((link, idx) => {
              const src = nodes.find((n) => n.id === link.source);
              const tgt = nodes.find((n) => n.id === link.target);
              if (!src || !tgt) return null;

              const isHighlighted =
                selectedNodeId === link.source || selectedNodeId === link.target;

              return (
                <g key={`link-${idx}`}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={link.critical ? 'url(#linkGradientThreat)' : 'rgba(25,211,197,0.2)'}
                    strokeWidth={isHighlighted ? 2.5 : link.critical ? 1.8 : 1.2}
                    strokeDasharray={link.critical ? '4 2' : 'none'}
                    className="transition-all duration-300"
                  />
                  {/* Midpoint Label */}
                  {link.label && (
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 6}
                      fill="#8B9AAA"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const color = getRiskColor(node.risk);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  className="cursor-pointer group"
                >
                  {/* Pulse Halo for critical nodes */}
                  {node.risk === 'critical' && (
                    <circle
                      r="26"
                      fill="none"
                      stroke="#FF4D5F"
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      r="24"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      filter="url(#glowEffect)"
                    />
                  )}

                  {/* Base node circle */}
                  <circle
                    r="18"
                    fill="#0E1721"
                    stroke={color}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="transition-transform group-hover:scale-110"
                  />

                  {/* Node Icon */}
                  <foreignObject x="-9" y="-9" width="18" height="18" className="pointer-events-none">
                    <div className="w-full h-full flex items-center justify-center text-white/90">
                      {getNodeIcon(node.type)}
                    </div>
                  </foreignObject>

                  {/* Text Label */}
                  <text
                    y="32"
                    fill="#F4F7FA"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {node.name}
                  </text>
                  <text
                    y="45"
                    fill="#8B9AAA"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {node.subtext}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Entity Context Panel */}
        <div className="p-6 bg-[#0E1721] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-[11px] font-mono tracking-widest text-[#19D3C5] uppercase">
                ENTITY TELEMETRY
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  selectedNode.risk === 'critical'
                    ? 'bg-[#FF4D5F]/15 text-[#FF4D5F] border border-[#FF4D5F]/30'
                    : selectedNode.risk === 'high'
                    ? 'bg-[#FF8533]/15 text-[#FF8533] border border-[#FF8533]/30'
                    : selectedNode.risk === 'medium'
                    ? 'bg-[#FFB84D]/15 text-[#FFB84D] border border-[#FFB84D]/30'
                    : 'bg-[#38D6A3]/15 text-[#38D6A3] border border-[#38D6A3]/30'
                }`}
              >
                {selectedNode.risk} risk
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs font-mono text-[#8B9AAA] uppercase">
                {selectedNode.type}
              </span>
              <h4 className="text-xl font-display font-bold text-[#F4F7FA] mt-0.5">
                {selectedNode.name}
              </h4>
              <span className="text-xs font-mono text-[#19D3C5] block mt-0.5">
                {selectedNode.details.entityId}
              </span>
            </div>

            {/* Entity Stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-[#080F17] border border-white/10">
                <span className="text-[10px] text-[#8B9AAA] uppercase block">
                  Connected Accounts
                </span>
                <span className="text-xl font-bold text-[#F4F7FA]">
                  {selectedNode.details.connectedCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#080F17] border border-white/10">
                <span className="text-[10px] text-[#8B9AAA] uppercase block">
                  Suspicious Events
                </span>
                <span className="text-xl font-bold text-[#FF4D5F]">
                  {selectedNode.details.suspiciousCount}
                </span>
              </div>
            </div>

            {/* Analysis Dossier */}
            <div className="mt-5 p-3.5 rounded-lg bg-[#080F17] border border-white/10">
              <span className="text-[10px] font-mono text-[#8B9AAA] uppercase block mb-1">
                Forensic Graph Assessment
              </span>
              <p className="text-xs text-[#8B9AAA] leading-relaxed font-sans">
                {selectedNode.details.flagReason}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#8B9AAA]">
            <span>FIRST LOGGED: {selectedNode.details.firstSeen}</span>
            <span className="text-[#19D3C5] flex items-center space-x-1">
              <span>Trinetra v2.1</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
