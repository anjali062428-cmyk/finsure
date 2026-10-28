# FinSure — Phase 9A: Design System Specification

**Status:** Completed & Verified  
**Date:** 2026-09-29  
**Version:** 1.0.0  

---

## 1. Design Philosophy: Institutional Calm & Evidence-Grounded Precision

The FinSure Design System is designed specifically for high-stakes financial crime operations, bank compliance officers, and everyday UPI account holders. 

### Core Aesthetic Principles
1. **Calm, High-Information-Density Interfaces:** No neon glow effects, sci-fi cyberpunk elements, or floating holographic gimmicks. The interface evokes bank-grade stability, institutional trust, and analytical clarity.
2. **Deterministic Risk Semantics:** Colors are never purely decorative. Green, Amber, Red, and Navy have immutable mathematical and policy meanings across the entire system.
3. **Cryptographic Grounding:** Audit trails, evidence dockets, and ML inference probabilities are displayed with monospace numbers, hash truncated badges, and clear source attributions.
4. **Universal Accessibility (WCAG 2.1 AA):** All interactable components feature visible 2px focus rings (`focus-visible:ring-accent`), ARIA attributes, semantic HTML elements, and complete 2D equivalents for all 3D visualizations.

---

## 2. Color Tokens & Semantic Variables

Theme tokens are implemented as CSS custom properties with native dark mode defaults and light mode switching support:

```css
:root {
  /* Dark Theme Default (Institutional Navy & Deep Surface) */
  --background: #0b0f17;
  --surface: #111827;
  --surface-elevated: #1f2937;
  --surface-muted: #162032;

  --border: #1f293d;
  --border-muted: #162032;

  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Primary FinTech Security Brand Accent */
  --accent: #0284c7;
  --accent-hover: #0369a1;
  --accent-muted: rgba(2, 132, 199, 0.15);
  --accent-teal: #0d9488;

  /* Deterministic Fraud Risk Bands */
  --risk-low: #10b981;       /* Score 0–39: Safe Policy (Allow) */
  --risk-medium: #f59e0b;    /* Score 40–69: Challenge Policy (Step-up OTP) */
  --risk-high: #f97316;      /* Score 70–89: High Risk (Analyst Review) */
  --risk-critical: #ef4444;  /* Score 90–100: Critical Risk (Immediate Block) */
}

[data-theme='light'] {
  --background: #f8fafc;
  --surface: #ffffff;
  --surface-elevated: #f1f5f9;
  --surface-muted: #f8fafc;

  --border: #e2e8f0;
  --border-muted: #edf2f7;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
}
```

---

## 3. Typography Hierarchy

| Style | Font Family | Size | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | Inter / System | 36px–48px | Bold (700) | Tight (-0.025em) | Public hero & major banners |
| **Section Header** | Inter / System | 20px–24px | Semibold (600) | Tight (-0.015em) | Page headers, module headings |
| **Card Header** | Inter / System | 14px–16px | Semibold (600) | Normal | Card titles, modal headers |
| **Body Text** | Inter / System | 13px–14px | Regular (400) | Normal | Data descriptions, notes |
| **Numeric & Monospace** | JetBrains Mono | 12px–28px | Medium / Bold | Tight | Risk scores, transaction amounts, hashes, timestamps |
| **Micro Caption** | Inter / JetBrains | 10px–11px | Medium (500) | Wide (+0.05em) | Status badges, table headers |

---

## 4. 30 Reusable UI Components Inventory

| # | Component | Purpose | Key Props / Capabilities |
| :--- | :--- | :--- | :--- |
| 1 | `Button` | Primary, outline, ghost, danger, success actions | `variant`, `size`, `isLoading`, `leftIcon`, `disabled` |
| 2 | `IconButton` | Compact icon-only trigger with tooltip accessibility | `icon`, `aria-label`, `variant`, `size` |
| 3 | `Input` | Text, password, number inputs with validation | `label`, `error`, `helperText`, `leftIcon`, `rightIcon` |
| 4 | `Select` | Dropdown selector with keyboard navigation | `label`, `options`, `value`, `onChange`, `error` |
| 5 | `Search` | Search bar with search icon and clear button | `value`, `onChange`, `onClear`, `placeholder` |
| 6 | `Badge` | Generic category and role indicator badge | `variant`, `size`, `className` |
| 7 | `StatusBadge` | Deterministic transaction & case state badge | `status` (settled, pending, blocked, review) |
| 8 | `Card` | Base institutional content container | `variant` (default, elevated), `padding` |
| 9 | `MetricCard` | High-impact telemetry card with trend indicators | `title`, `value`, `subtitle`, `badge`, `variant` |
| 10 | `Modal` | Accessible dialog with overlay backdrop and ESC key | `isOpen`, `onClose`, `title`, `size`, `children` |
| 11 | `Drawer` | Mobile sliding drawer navigation container | `isOpen`, `onClose`, `title`, `side` |
| 12 | `Tooltip` | Hover/focus explanation bubble | `content`, `position` (top, bottom, left, right) |
| 13 | `Tabs` | Underlined, pill, or segmented navigation tabs | `tabs`, `activeTab`, `onChange`, `variant` |
| 14 | `Table` | Responsive data table with sorting and empty states | `columns`, `data`, `keyExtractor`, `sortColumn`, `onSort` |
| 15 | `Pagination` | Accessible pagination controls with page numbers | `currentPage`, `totalPages`, `totalItems`, `onPageChange` |
| 16 | `EmptyState` | Empty container with icon, message, and action | `title`, `description`, `icon`, `actionLabel`, `onAction` |
| 17 | `LoadingState` | Polished spinner with `aria-live="polite"` region | `message`, `size`, `fullHeight` |
| 18 | `ErrorState` | Error boundary with alert icon and retry trigger | `title`, `message`, `onRetry` |
| 19 | `Skeleton` | Content loading skeleton placeholder | `variant` (text, circular, rectangular), `width`, `height` |
| 20 | `Toast` | Global notification alerts with auto-dismiss | `type` (success, warning, error, info), `title`, `message` |
| 21 | `ConfirmationDialog` | Safety confirmation for high-consequence operations | `title`, `message`, `confirmLabel`, `variant` (danger/warn) |
| 22 | `Timeline` | Event history with hash chain verifier | `events`, `showHash` (SHA-256 verification display) |
| 23 | `RiskIndicator` | Color-coded risk band badge (0-39/40-69/70-89/90-100) | `score`, `level`, `showLabel`, `size` |
| 24 | `RiskScore` | Large institutional 0–100 score typography | `score`, `probability`, `size`, `showDetails` |
| 25 | `ProbabilityDisplay`| Calibrated probability bar with 95% confidence intervals | `probability`, `confidenceInterval`, `showBar` |
| 26 | `EvidenceChip` | Grounded evidence reference chip (`[EV-001]`) | `id`, `type`, `label`, `onClick` |
| 27 | `EvidenceCard` | Tamper-proof evidence record card with SHA-256 stamp | `evidenceId`, `type`, `source`, `details`, `hash` |
| 28 | `FilterBar` | Search and dropdown composition row | `searchValue`, `filters`, `hasActiveFilters`, `onReset` |
| 29 | `Breadcrumb` | Hierarchical navigational path | `items`, `showHome` |
| 30 | `PageHeader` | Standard page title with breadcrumbs and action buttons | `title`, `description`, `badge`, `breadcrumbs`, `actions` |

---

## 5. 3D Architectural Boundary & Accessible 2D Fallback Rules

1. **Context Initialization:** `FinSureCanvas` lazily initializes Three.js scenes. If WebGL is unavailable or fails, it intercepts the error and presents `Fallback2DView` without crashing the page.
2. **Accessibility Parity:** Every 3D visualization has a 1-to-1 equivalent data table rendering identical metrics, nodes, edges, or model probability gates.
3. **Motion Sensitivity:** Respects system `prefers-reduced-motion` settings automatically, preventing rotational motion sickness.
