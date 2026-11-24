import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowDown,
  Layers,
  FileText,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import {
  FinSureNav,
  ThreatReplay,
  InvestigationPanel,
  ForensicProductPreview,
} from '../../components/intelligence';
import { FinancialDocumentHero3D } from '../../components/3d/FinancialDocumentHero3D';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#05070D] text-[#F4F7FA] selection:bg-[#19D3FF]/30 selection:text-white overflow-x-hidden font-sans relative">
      {/* Subtle Ambient Spatial Glow (Cyan / Violet / Deep Navy) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-gradient-to-b from-[#19D3FF]/6 via-[#8B5CF6]/4 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Minimal Floating Global Navigation */}
      <FinSureNav />

      {/* ========================================================
          HERO — FINANCIAL FORENSICS & VERIFICATION
          ======================================================== */}
      <section className="relative min-h-[85vh] flex flex-col justify-between pt-24 sm:pt-32 pb-10 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        {/* Main Asymmetric Hero Grid: Left ~48%, Right ~52% */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
          {/* Hero Left (~48%): Editorial Typography & Direct CTAs */}
          <div className="lg:col-span-6 z-10 space-y-6 text-left">
            {/* Small Technical Eyebrow */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0D1422] border border-[rgba(25,211,255,0.25)] shadow-[0_0_15px_rgba(25,211,255,0.12)] max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#19D3FF] animate-pulse shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest text-[#19D3FF] uppercase font-bold truncate">
                EXPLAINABLE FINANCIAL FORENSICS & VERIFICATION
              </span>
            </div>

            {/* Monumental Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight leading-[0.98] sm:leading-[0.95] text-[#F4F7FA]">
              See What Your Financial Documents <span className="text-[#19D3FF] drop-shadow-[0_0_35px_rgba(25,211,255,0.35)]">Hide.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-lg text-[#8B9AAA] max-w-xl font-sans font-normal leading-relaxed">
              Inspect financial documents, extract key information, identify inconsistencies, and investigate suspicious records through one secure workflow.
            </p>

            {/* Action Triggers */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 font-mono text-xs">
              <Link
                to="/customer/documents"
                className="px-6 py-3.5 rounded-full bg-[#19D3FF] text-[#05080D] font-bold text-center hover:bg-[#19D3FF]/90 transition-all shadow-[0_0_24px_rgba(25,211,255,0.4)] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Analyze a Document</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#preview"
                className="px-6 py-3.5 rounded-full bg-[#0D1422] text-[#F4F7FA] border border-white/15 font-semibold text-center hover:border-[#19D3FF] hover:text-[#19D3FF] transition-all flex items-center justify-center space-x-2"
              >
                <span>Explore How It Works</span>
                <ArrowDown className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>

            {/* Proof Invariants Row */}
            <div className="pt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-white/10 text-left">
              <div>
                <span className="block text-lg sm:text-xl font-display font-bold text-[#F4F7FA]">SHA-256</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8B9AAA]">Deduplication</span>
              </div>
              <div>
                <span className="block text-lg sm:text-xl font-display font-bold text-[#19D3FF]">Deterministic</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8B9AAA]">Arithmetic checks</span>
              </div>
              <div>
                <span className="block text-lg sm:text-xl font-display font-bold text-[#38D6A3]">Immutable</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8B9AAA]">Audit chain</span>
              </div>
            </div>
          </div>

          {/* Hero Right (~52%): Financial Document 3D Hero Composition */}
          <div className="lg:col-span-6 relative">
            <FinancialDocumentHero3D />
          </div>
        </div>

        {/* Hero Bottom: Scroll to Product Demo */}
        <div className="pt-8 text-center flex flex-col items-center justify-center">
          <a
            href="#preview"
            className="inline-flex flex-col items-center text-xs font-mono text-[#8B9AAA] hover:text-[#19D3FF] transition-colors group cursor-pointer"
          >
            <span className="tracking-widest uppercase mb-1">Explore Live Inspection Console</span>
            <ArrowDown className="w-4 h-4 animate-bounce text-[#19D3FF]" />
          </a>
        </div>
      </section>

      {/* ========================================================
          SECTION 00: INTERACTIVE PRODUCT DEMONSTRATION CONSOLE
          ======================================================== */}
      <section id="preview" className="scroll-mt-28 py-12 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <ForensicProductPreview />
      </section>

      {/* ========================================================
          SECTION 01: EXTRACTION ARCHITECTURE
          ======================================================== */}
      <section id="extraction" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono tracking-widest text-[#19D3FF] uppercase block font-bold">
            SECTION 01 // EXTRACTION ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-[#F4F7FA]">
            DIGITAL EXTRACTION + OCR FALLBACK
          </h2>
          <p className="text-sm sm:text-base text-[#8B9AAA] font-normal leading-relaxed">
            Digital PDF text and tables are extracted deterministically with PyMuPDF and pdfplumber. For scanned receipts and camera captures, Tesseract OCR extracts key payment claims with transparent bounding boxes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Bank Statements */}
          <div className="p-6 rounded-2xl bg-[#080F17] border border-white/10 hover:border-[#19D3FF]/40 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#19D3FF]/10 border border-[#19D3FF]/20 flex items-center justify-center text-[#19D3FF]">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold text-[#F4F7FA]">Bank Statements</h3>
              <p className="text-xs text-[#8B9AAA] leading-relaxed">
                Extracts opening balance, transaction ledger items (date, description, debit, credit), and closing balance. Validates mathematical invariant:
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#05080D] border border-white/5 font-mono text-[11px] text-[#38D6A3]">
              Opening + ∑(Credits) - ∑(Debits) == Closing
            </div>
          </div>

          {/* Card 2: Tax Invoices & Bills */}
          <div className="p-6 rounded-2xl bg-[#080F17] border border-white/10 hover:border-[#19D3FF]/40 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#6C9CFF]/10 border border-[#6C9CFF]/20 flex items-center justify-center text-[#6C9CFF]">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold text-[#F4F7FA]">Tax Invoices & Bills</h3>
              <p className="text-xs text-[#8B9AAA] leading-relaxed">
                Extracts supplier GSTIN, customer details, line items (quantity, unit price, line total), applicable CGST/SGST/IGST tax rates, and grand total.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#05080D] border border-white/5 font-mono text-[11px] text-[#6C9CFF]">
              ∑(Qty * Unit Price) + Tax == Grand Total
            </div>
          </div>

          {/* Card 3: Payment Receipts & Claims */}
          <div className="p-6 rounded-2xl bg-[#080F17] border border-white/10 hover:border-[#FF4D5F]/40 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF4D5F]/10 border border-[#FF4D5F]/20 flex items-center justify-center text-[#FF4D5F]">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold text-[#F4F7FA]">Payment Receipts & Claims</h3>
              <p className="text-xs text-[#8B9AAA] leading-relaxed">
                Extracts UPI reference/UTR number, payee VPA, timestamp, and claimed amount. Strictly labelled as <span className="font-mono text-[#19D3FF]">payment_claim</span> until matched against verified bank settlement records.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#05080D] border border-[#FF4D5F]/20 font-mono text-[11px] text-[#FF4D5F]">
              Never claims settlement from OCR alone
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 02: TAMPER AUDIT & FRAUD DETECTION
          ======================================================== */}
      <section id="audit" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-mono tracking-widest text-[#19D3FF] uppercase block font-bold">
              SECTION 02 // CRYPTOGRAPHIC INTEGRITY
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-[#F4F7FA]">
              Cryptographic Proof for Every Document.
            </h2>
            <p className="text-sm text-[#8B9AAA] leading-relaxed">
              Every document is fingerprinted with SHA-256 upon arrival. Any duplicate submissions or re-filings under alternate references are flagged immediately. Audit events are recorded in an append-only cryptographic ledger.
            </p>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center space-x-3 text-[#38D6A3]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Zero duplicate filing tolerance via instant hash matching</span>
              </div>
              <div className="flex items-center space-x-3 text-[#38D6A3]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Magic-byte MIME verification against file-extension spoofing</span>
              </div>
              <div className="flex items-center space-x-3 text-[#38D6A3]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Tamper-evident audit trail with immutable timestamps</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <ThreatReplay />
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 03: INVESTIGATION WORKSPACE
          ======================================================== */}
      <section id="investigation" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono tracking-widest text-[#19D3FF] uppercase block font-bold">
            SECTION 03 // HUMAN OVERSIGHT
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-[#F4F7FA]">
            HUMANS DECIDE. AI EXPLAINS.
          </h2>
          <p className="text-sm sm:text-base text-[#8B9AAA] font-normal leading-relaxed">
            FinSure Investigator generates assistive evidence cards with exact line citations. Automated findings never decide fraud autonomously—analysts retain full operational authority.
          </p>
        </div>
        <InvestigationPanel />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6 sm:px-12 text-center text-xs font-mono text-[#8B9AAA] bg-[#03060A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div>FinSure Financial Security & Forensics Platform v1.0 • All Rights Reserved</div>
          <div className="flex items-center space-x-6">
            <Link to="/customer" className="hover:text-[#19D3FF] transition-colors">Customer Portal</Link>
            <Link to="/console" className="hover:text-[#19D3FF] transition-colors">Analyst Console</Link>
            <Link to="/admin" className="hover:text-[#19D3FF] transition-colors">System Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
