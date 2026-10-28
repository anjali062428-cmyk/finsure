import React, { lazy, Suspense } from 'react';
import { Activity, ShieldAlert, Wifi, Zap, Cpu, MapPin, Smartphone } from 'lucide-react';

const RiskCorePreview = lazy(() =>
  import('../3d/RiskCorePreview').then((m) => ({ default: m.RiskCorePreview }))
);

interface TelemetryChipProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: 'cyan' | 'teal' | 'blue' | 'violet' | 'red';
  className?: string;
}

const TelemetryChip: React.FC<TelemetryChipProps> = ({
  label,
  value,
  icon,
  accent,
  className = '',
}) => {
  const accentClasses = {
    cyan: 'border-[#19D3FF]/30 text-[#19D3FF] bg-[#070B14]/85 shadow-[0_0_15px_rgba(25,211,255,0.2)]',
    teal: 'border-[#19D3C5]/30 text-[#19D3C5] bg-[#070B14]/85 shadow-[0_0_15px_rgba(25,211,197,0.2)]',
    blue: 'border-[#4F8CFF]/30 text-[#4F8CFF] bg-[#070B14]/85 shadow-[0_0_15px_rgba(79,140,255,0.2)]',
    violet: 'border-[#8B5CF6]/30 text-[#8B5CF6] bg-[#070B14]/85 shadow-[0_0_15px_rgba(139,92,246,0.2)]',
    red: 'border-[#FF4D5F]/35 text-[#FF4D5F] bg-[#070B14]/85 shadow-[0_0_18px_rgba(255,77,95,0.25)]',
  };

  const dotClasses = {
    cyan: 'bg-[#19D3FF]',
    teal: 'bg-[#19D3C5]',
    blue: 'bg-[#4F8CFF]',
    violet: 'bg-[#8B5CF6]',
    red: 'bg-[#FF4D5F] animate-ping',
  };

  return (
    <div
      className={`backdrop-blur-md px-3 py-1.5 rounded-lg border flex items-center space-x-2 text-xs font-mono transition-transform hover:scale-105 pointer-events-auto ${accentClasses[accent]} ${className}`}
    >
      <div className="flex items-center space-x-1.5 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[accent]}`} />
        <span className="opacity-80">{icon}</span>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-[9px] uppercase tracking-wider text-[#8B9AAA] leading-none">
          {label}
        </span>
        <span className="text-[11px] font-bold text-[#F4F7FA] mt-0.5 leading-tight">
          {value}
        </span>
      </div>
    </div>
  );
};

export const RiskCore: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-[620px] sm:h-[680px] lg:h-[720px] flex items-center justify-center select-none ${className}`}>
      {/* Ambient Radial Gradient Halo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#19D3FF]/8 via-[#8B5CF6]/5 to-[#A855F7]/3 rounded-full blur-3xl pointer-events-none" />

      {/* Three.js 3D Dynamic Vault Canvas */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-[#19D3FF]/20 animate-spin" />
            </div>
          }
        >
          <RiskCorePreview height="100%" />
        </Suspense>
      </div>

      {/* ========================================================
          7 SPATIAL FLOATING TELEMETRY LABELS
          ======================================================== */}

      {/* 1. TRANSACTION SIGNAL (Top Right) */}
      <div className="absolute top-[8%] right-2 sm:right-[8%] z-20 animate-pulse">
        <TelemetryChip
          label="TRANSACTION SIGNAL"
          value="₹85,000 unusual amount"
          icon={<Zap className="w-3 h-3" />}
          accent="red"
        />
      </div>

      {/* 2. BEHAVIOR CHANGE (Top Left) */}
      <div className="absolute top-[12%] left-2 sm:left-[6%] z-20">
        <TelemetryChip
          label="BEHAVIOR CHANGE"
          value="New device detected"
          icon={<Smartphone className="w-3 h-3" />}
          accent="violet"
        />
      </div>

      {/* 3. NETWORK INTELLIGENCE (Middle Left) */}
      <div className="hidden sm:block absolute top-[38%] left-2 sm:left-[4%] z-20">
        <TelemetryChip
          label="NETWORK INTELLIGENCE"
          value="2 connected paths"
          icon={<Wifi className="w-3 h-3" />}
          accent="blue"
        />
      </div>

      {/* 4. LOCATION SIGNAL (Middle Right) */}
      <div className="hidden sm:block absolute top-[40%] right-2 sm:right-[4%] z-20">
        <TelemetryChip
          label="LOCATION SIGNAL"
          value="Unusual location"
          icon={<MapPin className="w-3 h-3" />}
          accent="cyan"
        />
      </div>

      {/* 5. VELOCITY (Bottom Left) */}
      <div className="absolute bottom-[24%] left-2 sm:left-[6%] z-20">
        <TelemetryChip
          label="VELOCITY"
          value="Rapid transaction burst"
          icon={<Activity className="w-3 h-3" />}
          accent="teal"
        />
      </div>

      {/* 6. RISK SCORE (Bottom Right) */}
      <div className="absolute bottom-[26%] right-2 sm:right-[6%] z-20">
        <TelemetryChip
          label="RISK SCORE"
          value="94 • HIGH RISK"
          icon={<ShieldAlert className="w-3 h-3" />}
          accent="red"
        />
      </div>

      {/* 7. MODEL SIGNAL (Apex Center - Uncluttered) */}
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 z-20">
        <TelemetryChip
          label="MODEL SIGNAL"
          value="Multi-model agreement"
          icon={<Cpu className="w-3 h-3" />}
          accent="cyan"
        />
      </div>

      {/* ========================================================
          HERO SECONDARY VISUAL PANELS (SUBORDINATE & INTEGRATED)
          ======================================================== */}
      {/* Panel A: Live Transaction Intelligence (Floating Bottom-Left) */}
      <div className="hidden xl:block absolute -bottom-4 -left-6 z-10 w-72 p-3.5 rounded-xl bg-[#070B14]/90 backdrop-blur-md border border-[rgba(25,211,255,0.2)] shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B9AAA]">
            Live Intelligence
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#19D3FF]/10 text-[#19D3FF] border border-[#19D3FF]/20">
            DEMO
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[10px]">
          <div className="flex items-center justify-between text-[#FF4D5F] bg-[#FF4D5F]/5 px-2 py-1 rounded">
            <span>TXN-89321</span>
            <span>₹84,500</span>
            <span className="font-bold">94% BLOCKED</span>
          </div>
          <div className="flex items-center justify-between text-[#38D6A3] px-2 py-1">
            <span>TXN-89322</span>
            <span>₹2,100</span>
            <span>12% SAFE</span>
          </div>
          <div className="flex items-center justify-between text-[#FFB84D] px-2 py-1">
            <span>TXN-89323</span>
            <span>₹17,800</span>
            <span>76% REVIEW</span>
          </div>
          <div className="flex items-center justify-between text-[#38D6A3] px-2 py-1">
            <span>TXN-89324</span>
            <span>₹9,350</span>
            <span>18% SAFE</span>
          </div>
        </div>
      </div>

      {/* Panel B: Risk Contribution (Floating Bottom-Right) */}
      <div className="hidden xl:block absolute -bottom-4 -right-6 z-10 w-72 p-3.5 rounded-xl bg-[#070B14]/90 backdrop-blur-md border border-[rgba(139,92,246,0.2)] shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B9AAA]">
            Risk Contribution
          </span>
          <span className="text-[9px] font-mono text-[#8B5CF6]">SHAP</span>
        </div>
        <div className="space-y-2 text-[10px] font-mono">
          <div>
            <div className="flex justify-between text-[#8B9AAA] mb-0.5">
              <span>Amount anomaly</span>
              <span className="text-[#FF4D5F] font-bold">94%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FF4D5F] w-[94%]" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[#8B9AAA] mb-0.5">
              <span>Location anomaly</span>
              <span className="text-[#FFB84D] font-bold">78%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFB84D] w-[78%]" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[#8B9AAA] mb-0.5">
              <span>Device change</span>
              <span className="text-[#8B5CF6] font-bold">62%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#8B5CF6] w-[62%]" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[#8B9AAA] mb-0.5">
              <span>Velocity</span>
              <span className="text-[#19D3FF] font-bold">54%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#19D3FF] w-[54%]" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[#8B9AAA] mb-0.5">
              <span>Behavior shift</span>
              <span className="text-[#19D3C5] font-bold">37%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#19D3C5] w-[37%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
