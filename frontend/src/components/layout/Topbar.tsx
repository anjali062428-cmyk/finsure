import React from 'react';
import { Menu, Sun, Moon, Box, Activity, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { IconButton } from '../ui/IconButton';
import { Tooltip } from '../ui/Tooltip';

interface TopbarProps {
  onMobileMenuOpen: () => void;
  title?: string;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onMobileMenuOpen,
  title,
  className = '',
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, is3DEnabled, toggle3D, reducedMotion } = useTheme();

  return (
    <header
      className={`h-16 px-4 sm:px-6 bg-surface border-b border-border flex items-center justify-between z-10 ${className}`}
    >
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="lg:hidden text-text-muted hover:text-text p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <h2 className="text-base sm:text-lg font-semibold text-text truncate">
            {title}
          </h2>
        )}

        {/* Development / Synthetic Rails Warning */}
        <span className="hidden md:inline-flex items-center space-x-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-surface-muted border border-border text-text-muted">
          <ShieldCheck className="w-3 h-3 text-accent" />
          <span>NPCI Rails: Synthetic</span>
        </span>
      </div>

      {/* Right: Controls & User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* 3D Visualizer Toggle */}
        <Tooltip
          content={is3DEnabled ? '3D Visualizations Active (Click to switch to 2D)' : '3D Disabled (Click to enable 3D)'}
          position="bottom"
        >
          <button
            type="button"
            onClick={toggle3D}
            aria-pressed={is3DEnabled}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors ${
              is3DEnabled
                ? 'bg-accent/10 border-accent/40 text-accent font-semibold'
                : 'bg-surface-muted border-border text-text-muted hover:text-text'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{is3DEnabled ? '3D Active' : '2D Only'}</span>
          </button>
        </Tooltip>

        {/* Reduced Motion Indicator if enabled */}
        {reducedMotion && (
          <Tooltip content="Reduced motion mode detected & active" position="bottom">
            <span className="hidden sm:inline-flex items-center p-1.5 rounded text-text-muted bg-surface-muted border border-border text-xs">
              <Activity className="w-3.5 h-3.5 mr-1 text-risk-medium" />
              <span className="text-[11px] font-mono">No-Motion</span>
            </span>
          </Tooltip>
        )}

        {/* Theme Toggle Button */}
        <Tooltip content={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'} position="bottom">
          <IconButton
            icon={theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-accent" />}
            aria-label="Toggle theme mode"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
          />
        </Tooltip>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* User Identity & Logout */}
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-text truncate max-w-[150px]">
                {user.email || user.phone || 'FinSure Operator'}
              </span>
              <span className="text-[10px] font-mono uppercase text-text-muted">
                {user.role}
              </span>
            </div>

            <Tooltip content="Sign out of FinSure" position="bottom">
              <button
                type="button"
                onClick={logout}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs text-text-muted hover:text-risk-critical hover:bg-risk-critical/10 transition-colors border border-transparent hover:border-risk-critical/20"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs text-text-muted">
            <User className="w-3.5 h-3.5" />
            <span className="font-mono">Guest</span>
          </div>
        )}
      </div>
    </header>
  );
};
