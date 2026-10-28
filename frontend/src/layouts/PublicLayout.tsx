import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X, ArrowRight, Search } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { useTheme } from '../context/ThemeContext';
import { IconButton } from '../components/ui/IconButton';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // If landing page or auth routes, render dedicated cinematic full-screen layouts directly
  const standaloneRoutes = ['/', '/login', '/signup', '/register', '/verify-otp', '/forgot-password', '/reset-password'];
  if (standaloneRoutes.includes(location.pathname)) {
    return <Outlet />;
  }

  const navLinks = [
    { label: 'Overview', href: '/#overview' },
    { label: 'Intelligence', href: '/#intelligence' },
    { label: 'Detection', href: '/#detection' },
    { label: 'Security', href: '/#security' },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-background text-text selection:bg-accent/25 selection:text-text font-sans antialiased">
      {/* Main Public Header: Compact, Elegant, Horizontally Aligned on ONE baseline */}
      <header className="h-[68px] border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-40 transition-colors w-full">
        <div className="max-w-[1440px] mx-auto h-full px-6 sm:px-12 flex items-center justify-between">
          <div className="flex items-center space-x-8 lg:space-x-12 min-w-0">
            <Link to="/" className="hover:opacity-95 transition-opacity shrink-0">
              <Logo size="md" showSubtitle={true} />
            </Link>

            {/* Desktop Center Navigation */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-medium tracking-normal text-text-secondary">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="hover:text-accent transition-colors py-1"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Quick Search Trigger */}
          <div className="relative">
            <IconButton
              icon={<Search className="w-4 h-4 text-text-secondary hover:text-accent" />}
              aria-label="Quick search navigation"
              variant="ghost"
              size="sm"
              onClick={() => setSearchOpen(!searchOpen)}
            />
            {searchOpen && (
              <div className="absolute right-0 top-10 w-64 p-2 bg-surface-elevated border border-border shadow-modal rounded-md z-50 animate-in fade-in zoom-in-95 duration-150">
                <input
                  type="text"
                  placeholder="Jump to section or topic..."
                  className="w-full px-3 py-1.5 text-xs bg-surface-sunken border border-border rounded text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.toLowerCase();
                      if (val.includes('intel')) window.location.href = '/#intelligence';
                      else if (val.includes('detect') || val.includes('live')) window.location.href = '/#detection';
                      else if (val.includes('sec') || val.includes('protect')) window.location.href = '/#security';
                      else window.location.href = '/#overview';
                      setSearchOpen(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <IconButton
            icon={theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-accent" />}
            aria-label="Toggle dark or light theme"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
          />

          {/* Sign In */}
          <Link
            to="/login"
            className="hidden sm:inline-flex text-xs font-medium text-text-secondary hover:text-text px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>

          {/* Get Started -> */}
          <Link
            to="/signup"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold text-navy-950 bg-accent hover:bg-accent-hover px-3.5 py-1.5 rounded transition-all shadow-cyan-subtle"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded text-text-secondary hover:text-text hover:bg-surface"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[77px] z-50 bg-surface border-b border-border shadow-modal p-5 space-y-4">
          <nav className="flex flex-col space-y-2.5">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-accent hover:bg-surface-elevated rounded transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-border flex flex-col space-y-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-xs font-medium text-text border border-border rounded"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-xs font-semibold text-navy-950 bg-accent hover:bg-accent-hover rounded shadow-cyan-subtle"
            >
              Get Started →
            </Link>
          </div>
        </div>
      )}

      {/* Main Page Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Concise SaaS Institutional Footer */}
      <footer className="border-t border-border bg-surface-deep text-text-secondary py-12 px-6 sm:px-10 text-xs">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-1.5">
              <span className="font-semibold text-sm tracking-tight text-text">
                Fin<span className="text-accent">Sure</span>
                <span className="ml-2 text-[10px] font-mono text-accent font-normal">v1.0</span>
              </span>
              <p className="text-text-muted max-w-sm text-[11px] leading-relaxed">
                Autonomous real-time fraud defense for digital payments. Multiple signals understand every transaction under 100 milliseconds.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[11px] text-text-muted">
              <a href="#overview" className="hover:text-text transition-colors">Overview</a>
              <a href="#intelligence" className="hover:text-text transition-colors">Intelligence</a>
              <a href="#detection" className="hover:text-text transition-colors">Detection</a>
              <a href="#security" className="hover:text-text transition-colors">Security</a>
              <Link to="/login" className="hover:text-text transition-colors">Sign In</Link>
              <Link to="/signup" className="hover:text-accent transition-colors font-medium">Get Started →</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-muted font-mono">
            <span>© 2026 FinSure Technologies. Built for IEEE 830 compliance.</span>
            <span>Simulated Payment Rails · Synthetic UPI Data</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
