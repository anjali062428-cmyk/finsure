import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Network, ShieldAlert, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Fallback2DView } from '../../components/3d/Fallback2DView';
import { LoadingState } from '../../components/ui/LoadingState';
import { casesApi } from '../../api/cases';

const TrinetraPreview = React.lazy(() =>
  import('../../components/3d/TrinetraPreview').then((m) => ({ default: m.TrinetraPreview }))
);

interface RingCluster {
  id: string;
  name: string;
  hubVpa: string;
  nodeCount: number;
  maxInDegree: number;
  totalVolume: number;
  clusteringCoeff: number;
  cyclesDetected: number;
  riskBand: 'CRITICAL' | 'HIGH';
  status: 'UNDER_OBSERVATION' | 'FLAGGED_FOR_INVESTIGATION';
}

const SYNDICATE_CLUSTERS: RingCluster[] = [
  {
    id: 'RING_KOLKATA_01',
    name: 'Observed High-Fanout Cluster (Kolkata Region)',
    hubVpa: 'fastcash_payout_hub@okhdfcbank',
    nodeCount: 18,
    maxInDegree: 147,
    totalVolume: 3450000,
    clusteringCoeff: 0.782,
    cyclesDetected: 2,
    riskBand: 'CRITICAL',
    status: 'UNDER_OBSERVATION',
  },
  {
    id: 'RING_PATNA_02',
    name: 'Observed Rapid Dispersal Cluster (Patna Region)',
    hubVpa: 'prize_release_desk@yesbank',
    nodeCount: 9,
    maxInDegree: 64,
    totalVolume: 1250000,
    clusteringCoeff: 0.641,
    cyclesDetected: 1,
    riskBand: 'HIGH',
    status: 'FLAGGED_FOR_INVESTIGATION',
  },
];

export const AnalystRingsPage: React.FC = () => {
  const [selectedRing, setSelectedRing] = useState<RingCluster>(SYNDICATE_CLUSTERS[0]);
  const [displayMode, setDisplayMode] = useState<'3d' | '2d'>('3d');

  // Escalation state
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalatedCaseId, setEscalatedCaseId] = useState<string | null>(null);
  const [escalateError, setEscalateError] = useState<string | null>(null);

  const handleEscalateCluster = async () => {
    setIsEscalating(true);
    setEscalateError(null);
    try {
      const createdCase = await casesApi.createCase({
        transaction_id: `CLUSTER_${selectedRing.id}_REF`,
        user_id: `SYSTEM_CLUSTER_${selectedRing.id}`,
        risk_score: selectedRing.riskBand === 'CRITICAL' ? 95 : 82,
      });
      setEscalatedCaseId(createdCase.case_id);
    } catch (err: unknown) {
      setEscalateError((err as Error).message || 'Failed to escalate cluster to investigation docket.');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trinetra Ego-Network Pattern Exploration"
        description="3-hop ego-network graph analysis displaying observed transaction transfer patterns, high-fanout hubs, and cyclic flows. Algorithmic patterns are investigative indicators, not legal confirmation of fraud."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Network Patterns' },
          { label: selectedRing.id },
        ]}
      />

      {/* Reference Sandbox Disclaimer */}
      <div className="p-3.5 rounded-lg bg-surface-muted border border-border/80 text-xs text-text-muted flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-text font-semibold">Curated Reference Topology (Visual Sandbox):</strong>
          <p>
            These topological structures represent curated benchmark ego-networks for forensic pattern analysis. In live operation, GraphSAGE entity embeddings compute real-time structural priors without automatically determining legal guilt.
          </p>
        </div>
      </div>

      {/* Ring Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-surface-muted border border-border">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-accent shrink-0" />
          <div>
            <span className="text-xs font-semibold text-text uppercase tracking-wider font-mono block">
              Active Network Pattern Cluster:
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {SYNDICATE_CLUSTERS.map((ring) => (
                <button
                  key={ring.id}
                  type="button"
                  onClick={() => {
                    setSelectedRing(ring);
                    setEscalatedCaseId(null);
                    setEscalateError(null);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                    selectedRing.id === ring.id
                      ? 'bg-accent text-white font-bold'
                      : 'bg-surface hover:bg-surface-elevated text-text-muted border border-border'
                  }`}
                >
                  {ring.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-mono">View:</span>
          <div className="flex border border-border rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setDisplayMode('3d')}
              className={`px-2.5 py-1 text-xs font-mono transition-colors ${
                displayMode === '3d'
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              3D Trinetra
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('2d')}
              className={`px-2.5 py-1 text-xs font-mono transition-colors ${
                displayMode === '2d'
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              2D Matrix
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Trinetra 3D Canvas or 2D Tabular Fallback */}
        <div className="lg:col-span-2 space-y-4">
          {displayMode === '3d' ? (
            <React.Suspense
              fallback={
                <div className="h-80 flex items-center justify-center bg-surface-muted rounded-lg border border-border">
                  <LoadingState message="Loading 3D Trinetra topology..." size="sm" />
                </div>
              }
            >
              <TrinetraPreview />
            </React.Suspense>
          ) : (
            <Fallback2DView
              title="2D Ego-Network Topology Matrix"
              reason="Accessible counterpart to 3D Trinetra graph"
              dataSummary={{
                Cluster: selectedRing.name,
                Nodes: selectedRing.nodeCount,
                MaxInDegree: selectedRing.maxInDegree,
                Cycles: selectedRing.cyclesDetected,
              }}
              onToggle3D={() => setDisplayMode('3d')}
            >
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-border/80 text-text-muted">
                    <tr>
                      <th className="py-2 px-3">Node ID</th>
                      <th className="py-2 px-3">Observed Role</th>
                      <th className="py-2 px-3">VPA</th>
                      <th className="py-2 px-3">In-Degree</th>
                      <th className="py-2 px-3">Anomaly Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[
                      { NodeID: 'HUB_01', Role: 'Observed High-Fanout Hub', VPA: selectedRing.hubVpa, Degree: selectedRing.maxInDegree, Risk: 'CRITICAL_ANOMALY' },
                      { NodeID: 'LEAF_01', Role: 'Observed Inflow Node', VPA: 'source_acct_892@icici', Degree: 4, Risk: 'HIGH_ANOMALY' },
                      { NodeID: 'LEAF_02', Role: 'Observed Inflow Node', VPA: 'source_acct_412@sbi', Degree: 3, Risk: 'HIGH_ANOMALY' },
                      { NodeID: 'MULE_01', Role: 'Potential Dispersal Node', VPA: 'cashout_atm_781@axis', Degree: 12, Risk: 'CRITICAL_ANOMALY' },
                      { NodeID: 'MULE_02', Role: 'Potential Cyclic Transactor', VPA: 'wash_cycle_099@yesbank', Degree: 8, Risk: 'HIGH_ANOMALY' },
                    ].map((row) => (
                      <tr key={row.NodeID} className="hover:bg-surface-muted/50">
                        <td className="py-2 px-3 font-semibold text-text">{row.NodeID}</td>
                        <td className="py-2 px-3 text-text-muted">{row.Role}</td>
                        <td className="py-2 px-3 text-accent">{row.VPA}</td>
                        <td className="py-2 px-3">{row.Degree}</td>
                        <td className="py-2 px-3 font-bold text-risk-critical">{row.Risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Fallback2DView>
          )}
        </div>

        {/* Right Column: Centrality Metrics & Actions */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono pb-2 border-b border-border">
              Observed Centrality Telemetry
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded bg-surface-muted">
                <span className="text-text-muted">Graph Nodes (3-Hop):</span>
                <span className="font-mono font-bold text-text">{selectedRing.nodeCount} accounts</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-surface-muted">
                <span className="text-text-muted">Max In-Degree:</span>
                <span className="font-mono font-bold text-risk-critical">
                  {selectedRing.maxInDegree} (High-Fanout Hub)
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-surface-muted">
                <span className="text-text-muted">Clustering Coefficient:</span>
                <span className="font-mono font-bold text-text">{selectedRing.clusteringCoeff}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-surface-muted">
                <span className="text-text-muted">Circular Cycles:</span>
                <span className="font-mono font-bold text-risk-high">{selectedRing.cyclesDetected} cycles</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-surface-muted">
                <span className="text-text-muted">Aggregated Flow Volume:</span>
                <span className="font-mono font-bold text-text">
                  ₹ {selectedRing.totalVolume.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
              Forensic Investigation Actions
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Escalating this pattern will create a formal Case docket in the backend evidence store for multi-hop graph subpoena.
            </p>

            {escalatedCaseId && (
              <div className="p-3 rounded bg-risk-low/10 border border-risk-low/20 text-xs text-risk-low space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Investigation Docket Created</span>
                </div>
                <div className="font-mono text-[11px]">Docket Ref: {escalatedCaseId}</div>
              </div>
            )}

            {escalateError && (
              <div className="p-3 rounded bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{escalateError}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={handleEscalateCluster}
                isLoading={isEscalating}
                disabled={Boolean(escalatedCaseId)}
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                <span>{escalatedCaseId ? 'Cluster Escalated' : 'Escalate for Case Investigation'}</span>
              </Button>

              <Link to="/analyst/reports">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  <span>View Verified Evidence Packs</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
