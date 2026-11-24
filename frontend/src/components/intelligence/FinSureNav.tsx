import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, Search, Shield } from 'lucide-react';
import { Logo } from '../layout/Logo';

export const FinSureNav: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product Preview', href: '#preview' },
    { label: 'Extraction', href: '#extraction' },
    { label: 'Tamper Audit', href: '#audit' },
    { label: 'Investigation', href: '#investigation' },
    { label: 'Platform Console', href: '/console' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4 sm:px-8 ${isScrolled ? 'pt-2.5 sm:pt-3' : 'pt-5 sm:pt-6'
        }`}
    >
      <div
        className={`w-full max-w-7xl mx-auto rounded-full transition-all duration-300 flex items-center justify-between px-5 sm:px-8 ${isScrolled
            ? 'py-2.5 bg-[#05070D]/85 backdrop-blur-xl border border-[rgba(25,211,255,0.22)] shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_15px_rgba(25,211,255,0.08)]'
            : 'py-3.5 bg-[#070B14]/70 backdrop-blur-md border border-white/10'
          }`}
      >
        {/* LEFT: FinSure logo + FINANCIAL FORENSICS badge */}
        <div className="flex items-center space-x-2 shrink-0">
          <Link to="/" className="flex items-center space-x-2 group">
            <Logo size="sm" showSubtitle={false} />
            <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest text-[#19D3FF] uppercase px-2 py-0.5 rounded bg-[#19D3FF]/10 border border-[#19D3FF]/20">
              FINANCIAL FORENSICS
            </span>
          </Link>
        </div>

        {/* CENTER: Intelligence, Detection, Investigation, Network, Security */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-[11px] lg:text-xs font-mono tracking-wider uppercase text-[#8B9AAA]">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-[#19D3FF] transition-colors relative py-1 hover:drop-shadow-[0_0_8px_rgba(25,211,255,0.6)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* RIGHT: Search icon, theme/control, Sign In, Open Console */}
        <div className="hidden sm:flex items-center space-x-3.5">
          {/* Search Trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-1.5 rounded-full text-[#8B9AAA] hover:text-[#19D3FF] hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Search intelligence"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* System Control Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#0D1422] border border-white/5 text-[10px] font-mono text-[#38D6A3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38D6A3] animate-pulse" />
            <span className="text-[#8B9AAA]">OPERATIONAL</span>
          </div>

          <Link
            to="/login"
            className="text-xs font-mono font-medium text-[#8B9AAA] hover:text-[#F4F7FA] transition-colors px-2 py-1"
          >
            Sign In
          </Link>

          <Link
            to="/customer/documents"
            className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-[#05070D] bg-[#19D3FF] hover:bg-[#19D3FF]/90 px-4 py-2 rounded-full transition-all shadow-[0_0_16px_rgba(25,211,255,0.4)]"
          >
            <span>Analyze a Document</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg text-[#8B9AAA] hover:text-white"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Quick Search Dropdown */}
      {searchOpen && (
        <div className="absolute top-20 max-w-md w-full px-4 z-50">
          <div className="p-3 rounded-xl bg-[#080F17] border border-[rgba(25,211,255,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center space-x-3">
            <Search className="w-4 h-4 text-[#19D3FF]" />
            <input
              type="text"
              placeholder="Search case, txn ID, UPI VPA, or indicator..."
              className="bg-transparent border-none outline-none text-xs text-[#F4F7FA] placeholder:text-[#8B9AAA] w-full font-mono"
              autoFocus
            />
            <span className="text-[10px] font-mono text-[#8B9AAA] bg-[#0E1721] px-1.5 py-0.5 rounded border border-white/5">
              ESC
            </span>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-4 top-20 rounded-2xl bg-[#070B14] border border-[rgba(25,211,255,0.25)] shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-widest text-[#19D3FF]">
              FinSure Security
            </span>
            <span className="text-[10px] font-mono text-[#38D6A3] flex items-center gap-1">
              <Shield className="w-3 h-3" /> ONLINE
            </span>
          </div>
          <nav className="flex flex-col space-y-3 font-mono text-sm">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#8B9AAA] hover:text-[#19D3FF] py-1 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-white/10 flex flex-col space-y-2.5">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-xs font-mono text-[#F4F7FA] border border-white/10 rounded-lg"
            >
              Sign In
            </Link>
            <Link
              to="/console"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 text-xs font-mono font-bold bg-[#19D3FF] text-[#05080D] rounded-lg"
            >
              Open Console →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
