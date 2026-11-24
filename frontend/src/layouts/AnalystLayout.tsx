import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  ShieldAlert,
  BellRing,
  FolderKanban,
  Network,
  History,
  FileCheck,
  LayoutDashboard,
} from 'lucide-react';
import { Sidebar, NavItem } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

export const AnalystLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const analystNavItems: NavItem[] = [
    {
      label: 'Command Center',
      path: '/analyst',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'Alerts',
      path: '/analyst/alerts',
      icon: <BellRing className="w-4 h-4" />,
      badge: 4,
    },
    {
      label: 'Incidents',
      path: '/analyst/incidents',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: 'Active',
    },
    {
      label: 'Cases',
      path: '/analyst/cases',
      icon: <FolderKanban className="w-4 h-4" />,
    },
    {
      label: 'Network Intelligence',
      path: '/analyst/rings',
      icon: <Network className="w-4 h-4" />,
    },
    {
      label: 'Threat Replay',
      path: '/analyst/replay',
      icon: <History className="w-4 h-4" />,
    },
    {
      label: 'Reports',
      path: '/analyst/reports',
      icon: <FileCheck className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text">
      {/* Sidebar Navigation */}
      <Sidebar
        items={analystNavItems}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        roleLabel="Fraud Analyst"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMobileMenuOpen={() => setMobileOpen(true)}
          title="Fraud Analyst Command Center"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
