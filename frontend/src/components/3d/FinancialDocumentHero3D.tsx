import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Scan, Shield } from 'lucide-react';

interface FinancialDocumentHero3DProps {
  className?: string;
}

export const FinancialDocumentHero3D: React.FC<FinancialDocumentHero3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activePin, setActivePin] = useState<string | null>('reconciled');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Dynamic rotation calculations (restrained for enterprise elegance)
  const rotX = prefersReducedMotion ? 0 : -mousePos.y * 7;
  const rotY = prefersReducedMotion ? 0 : mousePos.x * 9;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-[460px] sm:h-[540px] flex items-center justify-center select-none ${className}`}
      style={{ perspective: '1200px' }}
      aria-label="Interactive 3D Financial Document Forensic Inspection Composition"
    >
      {/* Background Soft Directional Glow & Grid Accent */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="w-[360px] sm:w-[460px] h-[360px] sm:h-[460px] rounded-full bg-gradient-to-tr from-[#2C3480]/20 via-[#BFE8F5]/10 to-transparent blur-3xl opacity-70" />
      </div>

      {/* Main 3D Stage with Hardware-Accelerated Perspective */}
      <div
        className="relative w-[340px] sm:w-[460px] h-[360px] sm:h-[440px] transition-transform duration-300 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        }}
      >
        {/* ========================================================
            DOCUMENT LAYER 1: National Commercial Bank Statement
            Base layer: Deepest elevation in 3D stack
            ======================================================== */}
        <div
          className="absolute inset-0 rounded-xl bg-[#0D1522] border border-[#BFE8F5]/20 shadow-[0_24px_50px_rgba(0,0,0,0.65)] p-5 sm:p-6 overflow-hidden flex flex-col justify-between"
          style={{
            transform: prefersReducedMotion
              ? 'translate(-20px, -20px)'
              : 'translate3d(-24px, -20px, -35px) rotateZ(-3deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Subtle Watermark Rupee Pattern */}
          <div className="absolute -right-6 -bottom-6 text-white/[0.03] font-display font-black text-9xl pointer-events-none">
            ₹
          </div>

          {/* Statement Header */}
          <div className="border-b border-white/10 pb-3 flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-sm bg-[#BFE8F5]/80" />
                <span className="text-[11px] font-mono tracking-widest text-[#BFE8F5] uppercase font-semibold">
                  Statement of Account
                </span>
              </div>
              <p className="text-xs text-white/50 font-mono mt-0.5">A/C: •••• 8421 • IFSC: FINB000104</p>
            </div>
            <div className="text-right font-mono text-[11px]">
              <span className="text-white/40 block text-[9px] uppercase">Period</span>
              <span className="text-white/80">01 OCT - 28 OCT 2026</span>
            </div>
          </div>

          {/* Ledger Transaction Rows */}
          <div className="space-y-2 py-2 font-mono text-[10px]">
            <div className="grid grid-cols-12 text-white/40 border-b border-white/5 pb-1 uppercase tracking-wider text-[9px]">
              <span className="col-span-3">Date</span>
              <span className="col-span-5">Particulars</span>
              <span className="col-span-2 text-right">Debit</span>
              <span className="col-span-2 text-right">Balance</span>
            </div>
            <div className="grid grid-cols-12 text-white/70 py-0.5">
              <span className="col-span-3 text-white/40">14-OCT-26</span>
              <span className="col-span-5 truncate text-white/80">UPI/SETTLEMENT/990</span>
              <span className="col-span-2 text-right text-rose-300">-₹12,400</span>
              <span className="col-span-2 text-right text-white font-medium">₹4,40,850</span>
            </div>
            <div className="grid grid-cols-12 text-white/70 py-0.5 bg-white/[0.02] rounded px-0.5">
              <span className="col-span-3 text-white/40">21-OCT-26</span>
              <span className="col-span-5 truncate text-white/80">CLEARING/VENDOR-B7</span>
              <span className="col-span-2 text-right text-rose-300">-₹84,500</span>
              <span className="col-span-2 text-right text-white font-medium">₹3,56,350</span>
            </div>
            <div className="grid grid-cols-12 text-white/70 py-0.5">
              <span className="col-span-3 text-white/40">28-OCT-26</span>
              <span className="col-span-5 truncate text-white/80">RTGS/CREDIT-LEDGER</span>
              <span className="col-span-2 text-right text-emerald-400">+₹72,100</span>
              <span className="col-span-2 text-right text-white font-medium">₹4,28,450</span>
            </div>
          </div>

          {/* Closing Math Bar */}
          <div className="pt-2 border-t border-white/10 flex justify-between items-center font-mono text-[11px]">
            <span className="text-white/50 text-[10px]">STATED CLOSING BALANCE:</span>
            <span className="text-[#BFE8F5] font-bold">₹4,28,450.00</span>
          </div>
        </div>

        {/* ========================================================
            DOCUMENT LAYER 2: Commercial Tax Invoice
            Middle layer: Angled offset with realistic paper thickness
            ======================================================== */}
        <div
          className="absolute inset-0 rounded-xl bg-[#141E30] border border-white/20 shadow-[0_20px_45px_rgba(0,0,0,0.6)] p-5 sm:p-6 overflow-hidden flex flex-col justify-between"
          style={{
            transform: prefersReducedMotion
              ? 'translate(0px, 0px)'
              : 'translate3d(6px, 4px, 20px) rotateZ(1.5deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Invoice Header */}
          <div className="border-b border-white/10 pb-3 flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#2C3480] text-[#BFE8F5] font-bold uppercase">
                  Tax Invoice
                </span>
                <span className="text-xs font-semibold text-white">INV-2026-9041</span>
              </div>
              <p className="text-[10px] text-white/50 font-mono mt-1">GSTIN: 27AAPFU0912K1Z9 • SAC 998313</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                GST Validated
              </span>
            </div>
          </div>

          {/* Line Items Sample */}
          <div className="space-y-1.5 py-2 font-mono text-[10px]">
            <div className="flex justify-between text-white/40 text-[9px] uppercase border-b border-white/5 pb-1">
              <span>Item Description</span>
              <span>Amount</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span className="truncate max-w-[200px]">Enterprise Intelligence Infrastructure</span>
              <span className="font-semibold text-white">₹1,56,694.92</span>
            </div>
            <div className="flex justify-between text-white/60 text-[9px]">
              <span>IGST Applicable (18.00%)</span>
              <span>₹28,205.08</span>
            </div>
            <div className="flex justify-between text-white/50 text-[9px] pt-1">
              <span>Tax Calculation Check:</span>
              <span className="text-emerald-400 font-mono">100% Verified Exact</span>
            </div>
          </div>

          {/* Total & Verification Stamp */}
          <div className="pt-2 border-t border-white/10 flex justify-between items-center font-mono">
            <div>
              <span className="text-[9px] text-white/40 block">TOTAL INVOICE VALUE</span>
              <span className="text-sm font-bold text-white">₹1,84,900.00</span>
            </div>
            <span className="text-[10px] font-mono text-[#BFE8F5] bg-[#2C3480]/50 px-2 py-1 rounded border border-[#BFE8F5]/30 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Math Reconciled</span>
            </span>
          </div>
        </div>

        {/* ========================================================
            DOCUMENT LAYER 3: Payment Claim with Active Forensic Scanning Frame
            Top Layer: Forefront elevation with scanning visor
            ======================================================== */}
        <div
          className="absolute inset-0 rounded-xl bg-[#1B273D]/95 backdrop-blur-md border border-[#BFE8F5]/40 shadow-[0_30px_60px_rgba(0,0,0,0.75)] p-5 sm:p-6 overflow-hidden flex flex-col justify-between"
          style={{
            transform: prefersReducedMotion
              ? 'translate(20px, 20px)'
              : 'translate3d(24px, 18px, 65px) rotateZ(-1deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Subtle Ambient Scanner Beam Sweeping Vertically */}
          {!prefersReducedMotion && (
            <div className="absolute inset-x-0 h-14 bg-gradient-to-b from-[#BFE8F5]/0 via-[#BFE8F5]/15 to-[#BFE8F5]/0 pointer-events-none animate-pulse" />
          )}

          {/* Document Header with Claim Invariant Pill */}
          <div className="border-b border-[#BFE8F5]/20 pb-3 flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#2C3480] text-[#BFE8F5] border border-[#BFE8F5]/30 font-bold">
                  Payment Claim
                </span>
                <span className="text-[10px] font-mono text-white/50">Receipt Verification</span>
              </div>
              <h3 className="text-sm font-display font-bold text-white tracking-tight">
                UPI Instant Payment Voucher
              </h3>
            </div>

            {/* Cryptographic Hash Micro-Chip */}
            <div className="text-right font-mono text-[9px] text-[#BFE8F5]/80 bg-[#101827] px-2 py-1 rounded border border-[#BFE8F5]/20">
              <span className="block text-white/40">SHA-256 CHECK</span>
              <span>1e66...a76f</span>
            </div>
          </div>

          {/* Optical Bounding Box & Extracted Telemetry Frame */}
          <div className="relative my-2 p-3 rounded-lg bg-[#101827]/80 border border-[#BFE8F5]/30">
            {/* Visual Corner Target Reticles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#BFE8F5]" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#BFE8F5]" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#BFE8F5]" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#BFE8F5]" />

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[9px] text-white/40 uppercase block">UTR Reference</span>
                <span className="text-[#BFE8F5] font-semibold">UTR8829104192</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-white/40 uppercase block">Claimed Amount</span>
                <span className="text-white font-bold text-sm">₹84,500.00</span>
              </div>
              <div>
                <span className="text-[9px] text-white/40 uppercase block">Beneficiary VPA</span>
                <span className="text-white/70 truncate block text-[11px]">merchant.ops@bank</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-white/40 uppercase block">Ledger Match</span>
                <span className="inline-flex items-center space-x-1 text-emerald-400 text-[10px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Authorized Feed</span>
                </span>
              </div>
            </div>
          </div>

          {/* Restrained Forensic Badge Invariant Banner */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center space-x-1.5 text-[#BFE8F5]">
              <Scan className="w-3.5 h-3.5 shrink-0" />
              <span>Tesseract v5.5.3 Bounded OCR</span>
            </div>
            <span className="text-white/40 text-[9px]">
              Invariant: <code>payment_claim</code>
            </span>
          </div>
        </div>

        {/* ========================================================
            FLOATING FORENSIC SIGNAL BADGES
            Orbital pins highlighting verification findings
            ======================================================== */}
        {/* Signal Pin 1: Balance Continuity */}
        <div
          className={`absolute -top-4 -right-2 sm:-right-8 px-3 py-1.5 rounded-lg bg-[#101827]/95 border border-emerald-500/40 text-emerald-300 shadow-xl backdrop-blur-md font-mono text-[11px] flex items-center space-x-2 transition-all hover:scale-105 cursor-pointer z-30 ${
            activePin === 'reconciled' ? 'ring-1 ring-emerald-400/50' : ''
          }`}
          onClick={() => setActivePin('reconciled')}
          style={{
            transform: prefersReducedMotion ? 'none' : 'translateZ(90px)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">Closing Balance Reconciled</span>
          <span className="text-white/40 text-[9px]">100% Math Match</span>
        </div>

        {/* Signal Pin 2: Authorized Ledger Match */}
        <div
          className={`absolute -bottom-5 -left-2 sm:-left-6 px-3 py-1.5 rounded-lg bg-[#101827]/95 border border-[#BFE8F5]/40 text-[#BFE8F5] shadow-xl backdrop-blur-md font-mono text-[11px] flex items-center space-x-2 transition-all hover:scale-105 cursor-pointer z-30 ${
            activePin === 'ledger' ? 'ring-1 ring-[#BFE8F5]/50' : ''
          }`}
          onClick={() => setActivePin('ledger')}
          style={{
            transform: prefersReducedMotion ? 'none' : 'translateZ(85px)',
          }}
        >
          <Shield className="w-3.5 h-3.5 text-[#BFE8F5]" />
          <span>Ledger Cross-Matched</span>
          <span className="text-white/40 text-[9px]">[Synthetic Seed]</span>
        </div>

        {/* Signal Pin 3: Restrained Rupee Cryptographic Motif Watermark Badge */}
        <div
          className="absolute -bottom-4 right-6 px-2.5 py-1 rounded bg-[#2C3480]/90 border border-[#BFE8F5]/30 text-white font-mono text-[10px] flex items-center space-x-1.5 z-20"
          style={{
            transform: prefersReducedMotion ? 'none' : 'translateZ(75px)',
          }}
        >
          <span className="text-[#BFE8F5] font-bold text-xs">₹</span>
          <span className="text-white/80">Rupee Forensics Protected</span>
        </div>
      </div>
    </div>
  );
};
