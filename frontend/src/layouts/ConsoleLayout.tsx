import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  FileSpreadsheet,
  Bell,
  Search,
  Network,
  History,
  FileCheck,
  BarChart3,
  Cpu,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { useAuth } from '../context/AuthContext';
import { StatusIndicator } from '../components/intelligence/StatusIndicator';

export const ConsoleLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    { label: 'Overview', to: '/console', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
    { label: 'Live Detection', to: '/console/detection', icon: <Radio className="w-4 h-4" /> },
    { label: 'Transactions', to: '/console/transactions', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: 'Alerts', to: '/console/alerts', icon: <Bell className="w-4 h-4" />, badge: '3' },
    { label: 'Investigations', to: '/console/investigations', icon: <Search className="w-4 h-4" /> },
    { label: 'Fraud Network', to: '/console/network', icon: <Network className="w-4 h-4" /> },
    { label: 'Threat Replay', to: '/console/replay', icon: <History className="w-4 h-4" /> },
    { label: 'AI Explainability', to: '/console/explainability', icon: <FileCheck className="w-4 h-4" /> },
    { label: 'Analytics', to: '/console/analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Model Center', to: '/console/models', icon: <Cpu className="w-4 h-4" /> },
    { label: 'Security', to: '/console/security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#05080D] text-[#F4F7FA] flex overflow-hidden font-sans">
      {/* Compact Left Command-Center Navigation */}
      <aside
        className={`shrink-0 h-screen sticky top-0 bg-[#080F17] border-r border-white/10 flex flex-col justify-between transition-all duration-300 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div>
          {/* Brand Emblem & Collapse Toggle */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <Link to="/" className="flex items-center space-x-2 overflow-hidden">
              <Logo size="sm" showSubtitle={false} collapsed={collapsed} />
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded text-[#8B9AAA] hover:text-white hover:bg-white/5 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navigationItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-[#0D1422] text-[#19D3FF] border border-[rgba(25,211,255,0.3)] shadow-[0_0_16px_rgba(25,211,255,0.18)] font-bold'
                      : 'text-[#8B9AAA] hover:text-[#F4F7FA] hover:bg-white/5'
                  }`
                }
              >
                <span className="shrink-0 group-hover:text-[#19D3FF] transition-colors">
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FF4D5F] text-[#05080D]">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Profile & Status */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-[#05080D]/40">
          {!collapsed && (
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-mono">
              <StatusIndicator status="operational" label="Connected" />
              <Link to="/" className="text-[#8B9AAA] hover:text-white flex items-center space-x-0.5">
                <span>Landing</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {!collapsed ? (
              <div className="min-w-0 pr-2">
                <div className="text-xs font-mono font-bold text-[#F4F7FA] truncate">
                  {user?.full_name || 'Security Analyst'}
                </div>
                <div className="text-[10px] font-mono text-[#8B9AAA] uppercase truncate">
                  {user?.role || 'fraud_analyst'}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded text-[#8B9AAA] hover:text-[#FF4D5F] hover:bg-[#FF4D5F]/10 transition-colors shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Command Bar */}
        <header className="h-16 px-6 border-b border-white/10 bg-[#080F17]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4 shrink-0">
          {/* Quick Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-[#8B9AAA] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions, entities, alert dockets (Cmd+K)..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#05080D] border border-white/10 text-xs font-mono text-[#F4F7FA] placeholder:text-[#576574] focus:outline-none focus:border-[#19D3C5] transition-colors"
            />
          </div>

          {/* Right Top Status & Actions */}
          <div className="flex items-center space-x-4 shrink-0">
            <Link
              to="/console/alerts"
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#FF4D5F]/15 border border-[#FF4D5F]/30 text-[#FF4D5F] text-xs font-mono font-bold hover:bg-[#FF4D5F]/20 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>3 CRITICAL ALERTS</span>
            </Link>

            <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-[#8B9AAA] pl-3 border-l border-white/10">
              <StatusIndicator status="operational" label="All Systems Operational" />
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
