import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Logo } from './Logo';
import { Tooltip } from '../ui/Tooltip';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  roleLabel: string;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  roleLabel,
  className = '',
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-surface border-r border-border transition-all duration-200 ease-in-out lg:static lg:z-auto ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${className}`}
        aria-label="Primary Navigation"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Logo collapsed={collapsed} />
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden text-text-muted hover:text-text p-1.5 rounded-md"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge Indicator */}
        <div className={`px-4 py-2 border-b border-border/60 ${collapsed ? 'text-center' : ''}`}>
          <span
            className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
              roleLabel.toLowerCase().includes('admin')
                ? 'bg-risk-critical/10 text-risk-critical border border-risk-critical/20'
                : roleLabel.toLowerCase().includes('analyst')
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'bg-surface-muted text-text-muted border border-border'
            }`}
          >
            {collapsed ? roleLabel.slice(0, 3) : roleLabel}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/customer' || item.path === '/analyst' || item.path === '/admin'}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-accent text-white shadow-sm font-semibold'
                    : 'text-text-muted hover:bg-surface-elevated hover:text-text'
                } ${collapsed ? 'justify-center' : 'justify-between'}`
              }
            >
              {({ isActive }) => {
                const content = (
                  <div className={`flex items-center space-x-3 ${collapsed ? 'justify-center' : ''}`}>
                    <span className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-text-muted group-hover:text-text'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                );

                return (
                  <>
                    {collapsed ? (
                      <Tooltip content={item.label} position="right">
                        {content}
                      </Tooltip>
                    ) : (
                      content
                    )}

                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-muted text-text-muted group-hover:text-text'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        {/* Footer Collapse Toggle (Desktop only) */}
        <div className="hidden lg:flex items-center justify-between p-3 border-t border-border">
          {!collapsed && (
            <span className="text-xs text-text-muted font-mono">
              FinSure Terminal
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-elevated transition-colors ml-auto"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
