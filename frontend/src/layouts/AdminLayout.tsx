import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Server,
  Users,
  Cpu,
  Sliders,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { Sidebar, NavItem } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminNavItems: NavItem[] = [
    {
      label: 'Overview',
      path: '/admin',
      icon: <Server className="w-4 h-4" />,
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: 'Models',
      path: '/admin/models',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'v1.0',
    },
    {
      label: 'Risk Policies',
      path: '/admin/policies',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      label: 'Audit Ledger',
      path: '/admin/audit',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      label: 'System Health',
      path: '/admin/system',
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text">
      {/* Sidebar Navigation */}
      <Sidebar
        items={adminNavItems}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        roleLabel="System Admin"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMobileMenuOpen={() => setMobileOpen(true)}
          title="System Administration & ML Governance"
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
