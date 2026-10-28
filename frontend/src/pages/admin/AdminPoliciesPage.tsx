import React, { useState } from 'react';
import { Sliders, Lock, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';

export const AdminPoliciesPage: React.FC = () => {
  const [testScore, setTestScore] = useState(65);

  const getSimulatedAction = (s: number) => {
    if (s >= 90) return { decision: 'BLOCK', band: 'Critical (90–100)', color: 'text-risk-critical' };
    if (s >= 70) return { decision: 'REVIEW', band: 'High (70–89)', color: 'text-risk-high' };
    if (s >= 40) return { decision: 'CHALLENGE (OTP)', band: 'Medium (40–69)', color: 'text-risk-medium' };
    return { decision: 'ALLOW', band: 'Low (0–39)', color: 'text-risk-low' };
  };

  const sim = getSimulatedAction(testScore);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy & Decision Operating Thresholds"
        description="Formal operational risk bands deterministically derived from calibrated fraud probabilities."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Policies' },
        ]}
      />

      {/* Backend Authority Policy Disclosure */}
      <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
        <div className="flex items-center space-x-2 text-accent text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>POLICY GOVERNANCE &amp; BACKEND AUTHORITY</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Operational risk bands (0–39 LOW, 40–69 MEDIUM, 70–89 HIGH, 90–100 CRITICAL) are hardcoded in the authoritative backend decision engine (<code>backend/services/model_service.py</code>) calibrated via isotonic regression (Brier score &lt;0.05). No backend mutation endpoint exists; the frontend enforces strict backend authority and does not pretend that thresholds can be modified from the UI.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-risk-low/30 bg-risk-low/5 space-y-2">
          <span className="text-xs font-mono font-bold text-risk-low">ALLOW POLICY</span>
          <h4 className="text-2xl font-bold font-mono text-text">0 – 39</h4>
          <p className="text-xs text-text-muted">Unfettered instant execution. Low calibrated fraud probability (&lt;15%).</p>
        </Card>

        <Card className="p-5 border-risk-medium/30 bg-risk-medium/5 space-y-2">
          <span className="text-xs font-mono font-bold text-risk-medium">CHALLENGE POLICY</span>
          <h4 className="text-2xl font-bold font-mono text-text">40 – 69</h4>
          <p className="text-xs text-text-muted">Step-up verification. Mandatory SMS/Push OTP authentication.</p>
        </Card>

        <Card className="p-5 border-risk-high/30 bg-risk-high/5 space-y-2">
          <span className="text-xs font-mono font-bold text-risk-high">REVIEW POLICY</span>
          <h4 className="text-2xl font-bold font-mono text-text">70 – 89</h4>
          <p className="text-xs text-text-muted">Analyst hold. Dispatched to alert queue with forensic evidence pack.</p>
        </Card>

        <Card className="p-5 border-risk-critical/30 bg-risk-critical/5 space-y-2">
          <span className="text-xs font-mono font-bold text-risk-critical">BLOCK POLICY</span>
          <h4 className="text-2xl font-bold font-mono text-text">90 – 100</h4>
          <p className="text-xs text-text-muted">Immediate halt. Instant rejection and account containment.</p>
        </Card>
      </div>

      {/* Read-Only What-If Simulator */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-accent" />
            <h3 className="text-base font-semibold text-text">Read-Only What-If Policy Evaluation</h3>
          </div>
          <span className="text-xs font-mono text-text-muted flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Production Configuration Locked</span>
          </span>
        </div>

        <p className="text-xs text-text-muted">
          Simulate how transactions with different synthetic risk scores are dispatched across the policy bands. This simulator cannot mutate active production thresholds.
        </p>

        <div className="space-y-2 max-w-md pt-2">
          <div className="flex justify-between text-xs font-mono">
            <span>Synthetic Calibrated Score:</span>
            <span className="font-bold text-text">{testScore} / 100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={testScore}
            onChange={(e) => setTestScore(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
        </div>

        <div className="p-4 rounded-lg bg-surface-muted border border-border/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted block font-mono">Simulated Decision</span>
            <span className={`text-base font-bold font-mono ${sim.color}`}>{sim.decision}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-text-muted block font-mono">Active Policy Band</span>
            <span className="text-sm font-mono text-text font-bold">{sim.band}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
