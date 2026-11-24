import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowDown,
  Terminal,
} from 'lucide-react';
import {
  FinSureNav,
  RiskCore,
  TransactionEvent,
  BehaviorTimeline,
  FraudNetwork,
  RiskContribution,
  EvidencePanel,
  ThreatReplay,
  InvestigationPanel,
  ModelStatus,
  MetricBlock,
} from '../../components/intelligence';

export const LandingPage: React.FC = () => {
  const proofMetrics = [
    { label: 'Decision Latency', value: '< 100 ms', change: 'Real-time', trend: 'down' as const, subtext: 'Continuous UPI scoring', color: 'teal' as const },
    { label: 'Risk Signals', value: '4+ Layers', change: 'Multi-modal', trend: 'up' as const, subtext: 'Behavior + Graph + Sequence', color: 'teal' as const },
    { label: 'Defense Monitoring', value: '24 / 7', change: 'Always-on', trend: 'neutral' as const, subtext: 'Zero autonomous loss', color: 'safe' as const },
    { label: 'Evidence Grounding', value: '100%', change: 'SHA-256 verified', trend: 'neutral' as const, subtext: 'Zero fabricated claims', color: 'blue' as const },
  ];

  return (
    <div className="min-h-screen bg-[#05070D] text-[#F4F7FA] selection:bg-[#19D3FF]/30 selection:text-white overflow-x-hidden font-sans relative">
      {/* Subtle Ambient Spatial Glow (Cyan / Violet / Deep Navy) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-gradient-to-b from-[#19D3FF]/6 via-[#8B5CF6]/4 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Minimal Floating Global Navigation */}
      <FinSureNav />

      {/* ========================================================
          HERO — REIMAGINED FULL-SCREEN CINEMATIC EXPERIENCE
          ======================================================== */}
      <section className="relative min-h-screen flex flex-col justify-between pt-28 sm:pt-36 pb-12 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        {/* Main Asymmetric Hero Grid: Left ~45%, Right ~55% */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
          {/* Hero Left (~45%): Editorial Typography & Direct CTAs */}
          <div className="lg:col-span-5 z-10 space-y-6 text-left">
            {/* Small Technical Eyebrow */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0D1422] border border-[rgba(25,211,255,0.25)] shadow-[0_0_15px_rgba(25,211,255,0.12)] max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#19D3FF] animate-pulse shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest text-[#19D3FF] uppercase font-bold truncate">
                FINANCIAL SECURITY • AI RISK INTELLIGENCE • REAL-TIME DEFENSE
              </span>
            </div>

            {/* Monumental Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight leading-[0.98] sm:leading-[0.95] text-[#F4F7FA]">
              FRAUD DOESN'T LOOK LIKE <span className="text-[#19D3FF] drop-shadow-[0_0_35px_rgba(25,211,255,0.35)]">FRAUD.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-lg text-[#8B9AAA] max-w-xl font-sans font-normal leading-relaxed">
              FinSure connects transaction behavior, network relationships, and multi-model intelligence before suspicious activity becomes loss.
            </p>

            {/* Action Triggers */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 font-mono text-xs">
              <a
                href="#signal"
                className="px-6 py-3.5 rounded-xl bg-[#19D3FF] text-[#05080D] font-bold text-center hover:bg-[#19D3FF]/90 transition-all shadow-[0_0_24px_rgba(25,211,255,0.4)] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Explore Intelligence</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                to="/console"
                className="px-6 py-3.5 rounded-xl bg-[#0D1422] text-[#F4F7FA] border border-white/15 font-semibold text-center hover:border-[#19D3FF] hover:text-[#19D3FF] transition-all flex items-center justify-center space-x-2"
              >
                <Terminal className="w-4 h-4" />
                <span>Open Security Console</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>

            {/* Proof Metrics Below CTAs */}
            <div className="pt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-white/10 text-left">
              <div>
                <span className="block text-lg sm:text-xl font-display font-bold text-[#F4F7FA]">&lt;100ms</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8B9AAA]">Decision latency</span>
              </div>
              <div>
                <span className="block text-lg sm:text-xl font-display font-bold text-[#19D3FF]">4+</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8B9AAA]">Risk signals</span>
              </div>
              <div>
                <span className="block text-lg sm:text-xl font-display font-bold text-[#38D6A3]">24/7</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8B9AAA]">Defense monitoring</span>
              </div>
            </div>
          </div>

          {/* Hero Right (~55%): Hero-Scale 3D Intelligence Object & Floating Telemetry */}
          <div className="lg:col-span-7 relative">
            <RiskCore />
          </div>
        </div>

        {/* Hero Bottom: Scroll to Investigate */}
        <div className="pt-8 text-center flex flex-col items-center justify-center">
          <a
            href="#signal"
            className="inline-flex flex-col items-center text-xs font-mono text-[#8B9AAA] hover:text-[#19D3FF] transition-colors group cursor-pointer"
          >
            <span className="tracking-widest uppercase mb-1">Scroll to Investigate</span>
            <ArrowDown className="w-4 h-4 animate-bounce text-[#19D3FF]" />
          </a>
        </div>
      </section>

      {/* KPI Proof Ticker Ribbon */}
      <section className="border-y border-white/10 bg-[#070B14] py-6 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {proofMetrics.map((kpi) => (
            <MetricBlock
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              subtext={kpi.subtext}
              color={kpi.color}
            />
          ))}
        </div>
      </section>

      {/* ========================================================
          SECTION 01 — "ONE TRANSACTION."
          ======================================================== */}
      <section id="signal" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#19D3FF] uppercase font-bold block mb-3">
            SECTION 01 // DISSECTING THE EVENT
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            ONE TRANSACTION.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            Every payment carries latent telemetry: amount deviation, circadian rhythm, hardware certificates, geographic velocity hops, and counterparty histories.
          </p>
        </div>

        <TransactionEvent />
      </section>

      {/* ========================================================
          SECTION 02 — "THEN THE PATTERN APPEARS."
          ======================================================== */}
      <section id="behavior" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#19D3C5] uppercase font-bold block mb-3">
            SECTION 02 // BEHAVIORAL CADENCE
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            THEN THE PATTERN APPEARS.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            Fraudulent account takeovers follow distinct sequences: normal activity, credential verification, device change, unusual timing, velocity spike, and final drainage.
          </p>
        </div>

        <BehaviorTimeline />
      </section>

      {/* ========================================================
          SECTION 03 — "FRAUD HIDES IN CONNECTIONS."
          ======================================================== */}
      <section id="network" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#4F8CFF] uppercase font-bold block mb-3">
            SECTION 03 // RELATIONAL GRAPH
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            FRAUD HIDES IN CONNECTIONS.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            Syndicates coordinate across device farms, proxy IP nodes, and mule beneficiary rings. FinSure Trinetra traverses multi-hop relationships to identify mule clusters in real time.
          </p>
        </div>

        <FraudNetwork />
      </section>

      {/* ========================================================
          SECTION 04 — "EVERY SIGNAL COUNTS."
          ======================================================== */}
      <section id="models" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#8B5CF6] uppercase font-bold block mb-3">
            SECTION 04 // MULTI-MODEL INTELLIGENCE
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            EVERY SIGNAL COUNTS.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            XGBoost, Sequence RNN, GraphSAGE embeddings, and Autoencoders feed into an audited meta-learner with leak-free out-of-fold calibration.
          </p>
        </div>

        <ModelStatus />
      </section>

      {/* ========================================================
          SECTION 05 — "THE DECISION."
          ======================================================== */}
      <section id="decision" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#FF4D5F] uppercase font-bold block mb-3">
            SECTION 05 // COMPOSITE THREAT SCORE
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            THE DECISION.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            Definitive risk scoring mapped directly to backend policy thresholds: APPROVED (0-39), VERIFY (40-69), HOLD (70-89), and BLOCK (90-100).
          </p>
        </div>

        <RiskContribution />
      </section>

      {/* ========================================================
          SECTION 06 — "EXPLAIN THE DECISION."
          ======================================================== */}
      <section id="explainable" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#19D3FF] uppercase font-bold block mb-3">
            SECTION 06 // EVIDENCE INTEGRITY
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            EXPLAIN THE DECISION.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            Plain-language clarity for customers. Technical SHAP attribution for analysts. 100% cryptographic SHA-256 evidence integrity for compliance audits.
          </p>
        </div>

        <EvidencePanel />
      </section>

      {/* ========================================================
          SECTION 07 — "REPLAY WHAT HAPPENED."
          ======================================================== */}
      <section id="replay" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#19D3C5] uppercase font-bold block mb-3">
            SECTION 07 // FORENSIC TIMELINE
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            REPLAY WHAT HAPPENED.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            Step through forensic attack reconstructions: LOGIN → DEVICE CHANGE → NEW PAYEE → VELOCITY SPIKE → TRANSACTION → DETECTION → DECISION.
          </p>
        </div>

        <ThreatReplay />
      </section>

      {/* ========================================================
          SECTION 08 — "HUMANS DECIDE."
          ======================================================== */}
      <section id="investigation" className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 text-left">
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-widest text-[#38D6A3] uppercase font-bold block mb-3">
            SECTION 08 // HUMAN-IN-THE-LOOP GOVERNANCE
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#F4F7FA] uppercase leading-tight">
            HUMANS DECIDE.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8B9AAA] font-sans">
            FinSure Investigator extracts and validates claims against immutable evidence IDs, leaving final case adjudication strictly with authorized analysts.
          </p>
        </div>

        <InvestigationPanel />
      </section>

      {/* ========================================================
          GOVERNANCE CREED / CLOSING STATEMENT
          ======================================================== */}
      <section className="py-20 px-6 sm:px-12 border-t border-white/10 bg-[#070B14] text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h3 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-[#F4F7FA] uppercase leading-tight">
            AI INVESTIGATES.<br />
            EVIDENCE EXPLAINS.<br />
            <span className="text-[#19D3FF]">HUMANS DECIDE.</span>
          </h3>

          <p className="text-sm text-[#8B9AAA] max-w-xl mx-auto font-sans leading-relaxed">
            FinSure is engineered for production financial crime units where autonomous execution is forbidden, evidence must be tamper-evident, and explanations must stand up to regulatory scrutiny.
          </p>

          <div className="pt-4 flex justify-center gap-4">
            <Link
              to="/console"
              className="px-8 py-3.5 rounded-xl bg-[#19D3FF] text-[#05080D] font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#19D3FF]/90 transition-all shadow-[0_0_24px_rgba(25,211,255,0.4)]"
            >
              Enter Command Center →
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Spatial Footer */}
      <footer className="border-t border-white/5 bg-[#05070D] py-12 px-6 sm:px-12 text-xs font-mono text-[#8B9AAA]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-[#F4F7FA]">FINSURE</span>
            <span>//</span>
            <span>FINANCIAL CRIME INTELLIGENCE</span>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#signal" className="hover:text-[#19D3FF] transition-colors">Intelligence</a>
            <a href="#behavior" className="hover:text-[#19D3FF] transition-colors">Detection</a>
            <a href="#network" className="hover:text-[#19D3FF] transition-colors">Network</a>
            <a href="#investigation" className="hover:text-[#19D3FF] transition-colors">Investigation</a>
            <Link to="/login" className="hover:text-[#F4F7FA] transition-colors">Sign In</Link>
          </div>

          <div>
            <span>SYNTHETIC RAILS • ZERO REAL PII</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
