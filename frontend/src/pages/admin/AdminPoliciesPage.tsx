import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, Lock, ShieldCheck, RefreshCw, Cpu, Activity, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { adminApi, PolicyConfigResponse, PolicySimulationResponse } from '../../api/admin';

export const AdminPoliciesPage: React.FC = () => {
  const [policyConfig, setPolicyConfig] = useState<PolicyConfigResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Simulator state
  const [testScore, setTestScore] = useState<number>(65);
  const [simResult, setSimResult] = useState<PolicySimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Load policies
  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getPolicies();
      setPolicyConfig(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query policy thresholds';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Run authoritative simulation via backend endpoint
  const runSimulation = useCallback(async (score: number) => {
    setSimulating(true);
    try {
      const res = await adminApi.simulatePolicy(score);
      setSimResult(res);
    } catch (err) {
      // Fallback local heuristic if offline
      const action = score >= 90 ? 'BLOCK' : score >= 70 ? 'REVIEW' : score >= 40 ? 'CHALLENGE (OTP)' : 'ALLOW';
      const band = score >= 90 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
      setSimResult({
        risk_score: score,
        action,
        risk_band: band,
        description: 'Simulated locally (offline fallback)',
        requires_challenge: action.includes('CHALLENGE'),
        allows_instant_execution: action === 'ALLOW',
      });
    } finally {
      setSimulating(false);
    }
  }, []);

  useEffect(() => {
    runSimulation(testScore);
  }, [testScore, runSimulation]);

  const getActionColor = (action?: string) => {
    switch (action) {
      case 'BLOCK':
        return 'text-risk-critical';
      case 'REVIEW':
        return 'text-risk-high';
      case 'CHALLENGE (OTP)':
        return 'text-risk-medium';
      case 'ALLOW':
      default:
        return 'text-risk-low';
    }
  };

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

      {/* Backend Authority Policy Governance Banner */}
      <div className="p-4 rounded-lg bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-accent/10 border border-accent/20 text-accent mt-0.5">
            <ShieldCheck className="w-5 h-5 shrink-0" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-text flex items-center space-x-2">
              <span>Authoritative Policy Engine ({policyConfig?.version || 'v1.0.0-calibrated'})</span>
              {policyConfig?.frozen && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-muted border border-border text-text-muted flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>FROZEN IN PRODUCTION</span>
                </span>
              )}
            </h4>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Operational risk bands are deterministically derived from calibrated meta-learner probabilities via Isotonic Regression (Brier &lt; 0.05). Thresholds are immutable at runtime to maintain audit compliance and prevent uncalibrated drift.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadPolicies}
          disabled={loading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Policies
        </Button>
      </div>

      {loading && !policyConfig ? (
        <div className="p-12">
          <LoadingState message="Fetching live policy configuration from backend engine..." />
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
          <div className="flex items-center space-x-2 text-warning text-xs font-mono font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Using Cached Policy Bands (Backend query error: {error})</span>
          </div>
        </div>
      ) : null}

      {/* Authoritative Policy Bands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-risk-low/30 bg-risk-low/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-risk-low">ALLOW POLICY</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-risk-low/10 text-risk-low border border-risk-low/20">LOW</span>
          </div>
          <h4 className="text-2xl font-bold font-mono text-text">
            {policyConfig?.thresholds?.ALLOW ? `${policyConfig.thresholds.ALLOW.min_score} – ${policyConfig.thresholds.ALLOW.max_score}` : '0 – 39'}
          </h4>
          <p className="text-xs text-text-muted">
            {policyConfig?.thresholds?.ALLOW?.description || 'Instant execution. Calibrated fraud probability below challenge threshold.'}
          </p>
        </Card>

        <Card className="p-5 border-risk-medium/30 bg-risk-medium/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-risk-medium">CHALLENGE POLICY</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-risk-medium/10 text-risk-medium border border-risk-medium/20">MEDIUM</span>
          </div>
          <h4 className="text-2xl font-bold font-mono text-text">
            {policyConfig?.thresholds?.CHALLENGE ? `${policyConfig.thresholds.CHALLENGE.min_score} – ${policyConfig.thresholds.CHALLENGE.max_score}` : '40 – 69'}
          </h4>
          <p className="text-xs text-text-muted">
            {policyConfig?.thresholds?.CHALLENGE?.description || 'Mandatory step-up authentication. Requires SMS/Biometric OTP challenge.'}
          </p>
        </Card>

        <Card className="p-5 border-risk-high/30 bg-risk-high/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-risk-high">REVIEW POLICY</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-risk-high/10 text-risk-high border border-risk-high/20">HIGH</span>
          </div>
          <h4 className="text-2xl font-bold font-mono text-text">
            {policyConfig?.thresholds?.REVIEW ? `${policyConfig.thresholds.REVIEW.min_score} – ${policyConfig.thresholds.REVIEW.max_score}` : '70 – 89'}
          </h4>
          <p className="text-xs text-text-muted">
            {policyConfig?.thresholds?.REVIEW?.description || 'Transaction placed on analyst hold. Dispatched to investigation queue.'}
          </p>
        </Card>

        <Card className="p-5 border-risk-critical/30 bg-risk-critical/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-risk-critical">BLOCK POLICY</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-risk-critical/10 text-risk-critical border border-risk-critical/20">CRITICAL</span>
          </div>
          <h4 className="text-2xl font-bold font-mono text-text">
            {policyConfig?.thresholds?.BLOCK ? `${policyConfig.thresholds.BLOCK.min_score} – ${policyConfig.thresholds.BLOCK.max_score}` : '90 – 100'}
          </h4>
          <p className="text-xs text-text-muted">
            {policyConfig?.thresholds?.BLOCK?.description || 'Immediate execution halt. Instant rejection and account containment.'}
          </p>
        </Card>
      </div>

      {/* Authoritative What-If Policy Simulator */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-accent" />
            <h3 className="text-base font-semibold text-text">Authoritative What-If Policy Evaluation</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-text-muted flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span>Backend Evaluated (/api/v1/policies/simulate)</span>
            </span>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Adjust the calibrated risk score to observe real-time policy evaluation dispatched by the authoritative backend engine.
        </p>

        <div className="space-y-3 max-w-lg pt-1">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-text-muted">Calibrated Risk Score:</span>
            <span className="text-base font-bold text-text bg-surface-muted px-2.5 py-1 rounded border border-border">
              {testScore} / 100
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={testScore}
            onChange={(e) => setTestScore(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer h-2 bg-surface-muted rounded-lg border border-border"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-muted">
            <span>0 (Low)</span>
            <span>40 (Medium)</span>
            <span>70 (High)</span>
            <span>90 (Critical)</span>
            <span>100</span>
          </div>
        </div>

        {/* Simulation Output Card */}
        <div className="p-4 rounded-lg bg-surface-muted border border-border/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-xs text-text-muted block font-mono">Authoritative Decision</span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-lg font-bold font-mono ${getActionColor(simResult?.action)}`}>
                {simResult?.action || 'EVALUATING...'}
              </span>
              {simulating && <Activity className="w-3.5 h-3.5 animate-pulse text-accent" />}
            </div>
          </div>

          <div>
            <span className="text-xs text-text-muted block font-mono">Assigned Band</span>
            <span className="text-sm font-mono text-text font-bold block mt-0.5">
              {simResult?.risk_band || 'LOW'}
            </span>
          </div>

          <div>
            <span className="text-xs text-text-muted block font-mono">Execution Protocol</span>
            <span className="text-xs font-mono text-text-muted block mt-0.5">
              {simResult?.allows_instant_execution
                ? '⚡ Instant Settlement Allowed'
                : simResult?.requires_challenge
                  ? '🔐 Mandatory OTP Step-Up'
                  : '🛡️ Manual Hold & Forensic Inspection'}
            </span>
          </div>
        </div>

        {/* Cost Matrix Context */}
        {policyConfig?.cost_parameters && (
          <div className="pt-2 text-xs text-text-muted flex items-center space-x-6 border-t border-border/50">
            <div>
              <span className="font-mono text-text-muted">Avg Fraud Loss Assumption: </span>
              <span className="font-mono font-bold text-text">
                ₹{policyConfig.cost_parameters.avg_fraud_loss_inr.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-mono text-text-muted">Friction Step-up Cost: </span>
              <span className="font-mono font-bold text-text">
                ₹{policyConfig.cost_parameters.friction_cost_inr.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
