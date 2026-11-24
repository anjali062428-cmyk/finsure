/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
          secondary: 'var(--background-secondary)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          sunken: 'var(--surface-sunken)',
          deep: 'var(--panel-deep)',
          muted: 'var(--surface-elevated)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        text: {
          DEFAULT: 'var(--text-primary)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          electric: 'var(--accent-cyan)',
          teal: 'var(--accent-teal)',
          soft: 'var(--accent-softCyan)',
        },
        // FinSure Midnight Navy + Brand Intelligence Teal Identity
        navy: {
          950: '#03060A',
          900: '#05080D', // Primary background
          850: '#080F17', // Secondary background
          800: '#0E1721', // Surface
          750: '#121E29', // Elevated surface
          700: '#162533', // Deep panel
        },
        tealBrand: {
          DEFAULT: '#19D3C5', // Primary intelligence teal
          hover: '#26E6D8',
          soft: '#6FEBE0',
          blue: '#6C9CFF',   // Secondary intelligence blue
        },
        fraud: {
          critical: '#FF4D5F',
          warning: '#FFB84D',
          safe: '#38D6A3',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
          border: 'var(--success-border)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
          border: 'var(--warning-border)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
          border: 'var(--danger-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
          border: 'var(--info-border)',
        },
        risk: {
          low: 'var(--risk-low)',         // #38D6A3
          medium: 'var(--risk-medium)',   // #FFB84D
          high: 'var(--risk-high)',       // #FF8533
          critical: 'var(--risk-critical)',// #FF4D5F
        },
      },
      fontFamily: {
        display: [
          '"Space Grotesk"',
          '"Sora"',
          'sans-serif',
        ],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"',
          '"Geist Mono"',
          '"JetBrains Mono"',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.55)',
        'modal': '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
        'teal-glow': '0 0 32px -4px rgba(25, 211, 197, 0.28)',
        'teal-subtle': '0 0 16px -2px rgba(25, 211, 197, 0.18)',
        'blue-glow': '0 0 32px -4px rgba(108, 156, 255, 0.25)',
        'critical-glow': '0 0 32px -4px rgba(255, 77, 95, 0.28)',
      },
      borderRadius: {
        'card': '10px',
        'button': '6px',
        'badge': '4px',
      },
    },
  },
  plugins: [],
};
