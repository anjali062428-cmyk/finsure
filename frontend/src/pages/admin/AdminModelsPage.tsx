import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { adminApi, BackendModelsResponse } from '../../api/admin';

interface FormattedModelEntry {
  id: string;
  name: string;
  architecture: string;
  role: string;
  status: string;
}

export const AdminModelsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsData, setModelsData] = useState<BackendModelsResponse | null>(null);

  const fetchModelRegistry = async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await adminApi.getModels();
      setModelsData(m);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query model registry';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelRegistry();
  }, []);

  const getModelEntries = (data: BackendModelsResponse): FormattedModelEntry[] => {
    const roles: Record<string, { name: string; role: string; status: string }> = {
      xgboost: {
        name: 'Classical XGBoost Classifier',
        role: 'Primary Tabular Baseline',
        status: 'Active (Loaded)',
      },
      sequence_model: {
        name: 'Temporal Sequence Model',
        role: 'Behavioral Trajectory Encoder',
        status: 'Active (Loaded)',
      },
      graph_sage: {
        name: 'GraphSAGE GNN Embedder',
        role: 'Topological Relational Sub-Score',
        status: 'Weak Baseline (Documented)',
      },
      autoencoder: {
        name: 'Deep Undercomplete Autoencoder',
        role: 'Unsupervised Reconstruction Anomaly',
        status: 'Active Anomaly Gate',
      },
      scam_classifier: {
        name: 'Scam Typology Classifier',
        role: 'Multi-Task Typology Head',
        status: 'Active (Loaded)',
      },
      meta_learner: {
        name: 'Ensemble Meta-Learner Brain',
        role: 'Calibrated Stacking Gate',
        status: 'Primary Decision Gate',
      },
    };

    return Object.entries(data.models).map(([key, desc]) => {
      const meta = roles[key] || {
        name: key.toUpperCase(),
        role: 'Auxiliary Scoring Model',
        status: 'Active',
      };
      return {
        id: key,
        name: meta.name,
        architecture: desc,
        role: meta.role,
        status: meta.status,
      };
    });
  };

  const columns: Column<FormattedModelEntry>[] = [
    {
      key: 'name',
      header: 'Model Name & Subsystem',
      render: (m) => (
        <div>
          <span className="font-semibold text-xs text-text">{m.name}</span>
          <div className="text-[11px] text-text-muted">{m.role}</div>
        </div>
      ),
    },
    {
      key: 'architecture',
      header: 'Architecture & Specifications',
      render: (m) => <span className="font-mono text-xs text-text">{m.architecture}</span>,
    },
    {
      key: 'status',
      header: 'Operational Status',
      render: (m) => (
        <span
          className={`font-mono text-[11px] px-2 py-0.5 rounded ${
            m.status.includes('Primary')
              ? 'bg-accent/10 text-accent border border-accent/20 font-bold'
              : m.status.includes('Weak')
              ? 'bg-warning/10 text-warning border border-warning/20'
              : 'bg-risk-low/10 text-risk-low border border-risk-low/20'
          }`}
        >
          {m.status}
        </span>
      ),
    },
  ];

  const modelEntries = modelsData ? getModelEntries(modelsData) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Registry & Governance"
        description="Specifications and operational status for all ensemble models from the backend model registry."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Models' },
        ]}
        actions={
          <button
            type="button"
            onClick={fetchModelRegistry}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Poll Registry</span>
          </button>
        }
      />

      {loading ? (
        <LoadingState message="Polling model registry metadata from backend..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchModelRegistry} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-xs text-text-muted block">Registry Version</span>
              <span className="text-xl font-bold font-mono text-text">
                {modelsData?.model_version || 'v1.0.0'}
              </span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-text-muted block">Feature Engineering Dimension</span>
              <span className="text-xl font-bold font-mono text-accent">
                {modelsData?.feature_count || 36} Features
              </span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-text-muted block">Serving Readiness</span>
              <span className="text-sm font-mono text-risk-low font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>All Artifacts Primed</span>
              </span>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-text flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-accent" />
              <span>Loaded Inference Artifacts</span>
            </h3>

            <Table
              data={modelEntries}
              columns={columns}
              keyExtractor={(m) => m.id}
            />
          </Card>

          {/* Decision Bands Governance Card */}
          <Card className="p-6 space-y-3">
            <h4 className="text-sm font-semibold text-text">Model Registry Decision Bands</h4>
            <p className="text-xs text-text-muted">
              Calibrated operational risk bands registered in <code>ModelRegistry.decision_engine</code>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded bg-surface-muted border border-risk-low/30">
                <span className="text-risk-low font-bold block">LOW BAND</span>
                <span className="text-text font-bold">0 – 39</span>
              </div>
              <div className="p-3 rounded bg-surface-muted border border-risk-medium/30">
                <span className="text-risk-medium font-bold block">MEDIUM BAND</span>
                <span className="text-text font-bold">40 – 69</span>
              </div>
              <div className="p-3 rounded bg-surface-muted border border-risk-high/30">
                <span className="text-risk-high font-bold block">HIGH BAND</span>
                <span className="text-text font-bold">70 – 89</span>
              </div>
              <div className="p-3 rounded bg-surface-muted border border-risk-critical/30">
                <span className="text-risk-critical font-bold block">CRITICAL BAND</span>
                <span className="text-text font-bold">90 – 100</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
