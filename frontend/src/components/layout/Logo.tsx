import React from 'react';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

/**
 * FinSure Risk Intelligence Core Emblem
 * Precision faceted geometric core with electric cyan & teal illumination:
 * 1. Transaction Signal (Electric Cyan #00E5FF)
 * 2. Behavior Signal (Primary Cyan #22D3EE)
 * 3. Network Signal (Deep Teal #14B8A6)
 */
export const RiskCoreIcon: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  className = '',
  size = 'md',
}) => {
  const pixelSizes = {
    sm: 22,
    md: 26,
    lg: 34,
  }[size];

  return (
    <svg
      width={pixelSizes}
      height={pixelSizes}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Electric Cyan & Teal Gradients */}
        <linearGradient id="facetTopCyan" x1="18" y1="6" x2="26" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="facetLeftCyan" x1="10" y1="15" x2="18" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0891B2" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0E7490" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="facetRightCyan" x1="26" y1="15" x2="18" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id="coreGlowCyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle Ambient Radial Glow */}
      <circle cx="18" cy="18" r="14" fill="url(#coreGlowCyan)" />

      {/* Orbital Path 1: Transaction Signal (Electric Cyan / Horizontal) */}
      <ellipse
        cx="18"
        cy="18"
        rx="15"
        ry="6.5"
        stroke="#00E5FF"
        strokeWidth="1.1"
        strokeOpacity="0.4"
        strokeDasharray="2 3"
      />
      <circle cx="33" cy="18" r="1.4" fill="#00E5FF" />

      {/* Orbital Path 2: Behavior Signal (Primary Cyan / Tilted +35 deg) */}
      <g transform="rotate(35 18 18)">
        <ellipse
          cx="18"
          cy="18"
          rx="15"
          ry="6.5"
          stroke="#22D3EE"
          strokeWidth="1.1"
          strokeOpacity="0.35"
        />
        <circle cx="3.5" cy="18" r="1.4" fill="#22D3EE" />
      </g>

      {/* Orbital Path 3: Network Signal (Teal / Tilted -35 deg) */}
      <g transform="rotate(-35 18 18)">
        <ellipse
          cx="18"
          cy="18"
          rx="15"
          ry="6.5"
          stroke="#14B8A6"
          strokeWidth="1.0"
          strokeOpacity="0.3"
        />
        <circle cx="18" cy="11.5" r="1.4" fill="#14B8A6" />
      </g>

      {/* Central Faceted Geometric Prism */}
      <polygon
        points="18,8 25,14 18,18 11,14"
        fill="url(#facetTopCyan)"
        stroke="#67E8F9"
        strokeWidth="0.6"
        strokeOpacity="0.8"
      />
      <polygon
        points="11,14 18,18 18,27 11,21"
        fill="url(#facetLeftCyan)"
        stroke="#22D3EE"
        strokeWidth="0.6"
        strokeOpacity="0.7"
      />
      <polygon
        points="18,18 25,14 25,21 18,27"
        fill="url(#facetRightCyan)"
        stroke="#14B8A6"
        strokeWidth="0.6"
        strokeOpacity="0.7"
      />

      {/* Center Specular Nexus */}
      <circle cx="18" cy="18" r="1.2" fill="#FFFFFF" />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  collapsed = false,
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl sm:text-2xl',
  }[size];

  return (
    <div className={`flex items-center space-x-2.5 select-none group ${className}`}>
      <div className="relative flex items-center justify-center p-1 rounded-md bg-surface-elevated/70 border border-border group-hover:border-accent/40 transition-colors shadow-cyan-subtle">
        <RiskCoreIcon size={size} />
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline space-x-1.5">
            <span className={`font-semibold tracking-tight text-text ${textSizes}`}>
              Fin<span className="text-accent">Sure</span>
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-accent">
              v1.0
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[9px] font-mono font-medium tracking-widest text-text-muted mt-1 uppercase">
              FINANCIAL SECURITY
            </span>
          )}
        </div>
      )}
    </div>
  );
};
