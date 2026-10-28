import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Users,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { Sidebar, NavItem } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

export const CustomerLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const customerNavItems: NavItem[] = [
    {
      label: 'Overview',
      path: '/customer',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'Payments',
      path: '/customer/transactions',
      icon: <ArrowRightLeft className="w-4 h-4" />,
    },
    {
      label: 'Trusted Payees',
      path: '/customer/payees',
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: 'Security',
      path: '/customer/security',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: 'Protected',
    },
    {
      label: 'Reports',
      path: '/customer/reports',
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text">
      {/* Sidebar Navigation */}
      <Sidebar
        items={customerNavItems}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        roleLabel="Customer Portal"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMobileMenuOpen={() => setMobileOpen(true)}
          title="Customer Dashboard"
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
