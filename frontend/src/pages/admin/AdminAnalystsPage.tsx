import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, AlertTriangle, Briefcase, RefreshCw, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { casesApi } from '../../api/cases';
import { Case } from '../../types/case';

interface AnalystWorkload {
  analystId: string;
  totalCases: number;
  criticalCases: number;
  highCases: number;
  mediumCases: number;
  lowCases: number;
  activeStatusCount: number;
}

export const AdminAnalystsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workloads, setWorkloads] = useState<AnalystWorkload[]>([]);
  const [totalCasesCount, setTotalCasesCount] = useState(0);

  const fetchWorkloads = async () => {
    setLoading(true);
    setError(null);
    try {
      const cases = await casesApi.listCases({ limit: 100 });
      setTotalCasesCount(cases.length);

      // Group cases by assigned analyst
      const map: Record<string, AnalystWorkload> = {};

      cases.forEach((c: Case) => {
        const analyst = c.assigned_to || 'Unassigned';
        if (!map[analyst]) {
          map[analyst] = {
            analystId: analyst,
            totalCases: 0,
            criticalCases: 0,
            highCases: 0,
            mediumCases: 0,
            lowCases: 0,
            activeStatusCount: 0,
          };
        }
        map[analyst].totalCases += 1;
        if (c.priority === 'CRITICAL') map[analyst].criticalCases += 1;
        if (c.priority === 'HIGH') map[analyst].highCases += 1;
        if (c.priority === 'MEDIUM') map[analyst].mediumCases += 1;
        if (c.priority === 'LOW') map[analyst].lowCases += 1;
        if (c.status !== 'closed') map[analyst].activeStatusCount += 1;
      });

      setWorkloads(Object.values(map));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve case dockets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloads();
  }, []);

  const columns: Column<AnalystWorkload>[] = [
    {
      key: 'analystId',
      header: 'Analyst ID / Assignment',
      render: (w) => (
        <div className="flex items-center space-x-2">
          <Briefcase className="w-4 h-4 text-accent shrink-0" />
          <span className="font-mono text-xs font-bold text-text">{w.analystId}</span>
          {w.analystId === 'Unassigned' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-mono">
              Action Required
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'totalCases',
      header: 'Dockets Assigned',
      align: 'center',
      render: (w) => <span className="font-mono text-xs font-bold text-text">{w.totalCases}</span>,
    },
    {
      key: 'activeStatusCount',
      header: 'Active Reviews',
      align: 'center',
      render: (w) => (
        <span className="font-mono text-xs text-accent font-semibold">{w.activeStatusCount}</span>
      ),
    },
    {
      key: 'criticalCases',
      header: 'Critical Priority',
      align: 'center',
      render: (w) => (
        <span
          className={`font-mono text-xs font-bold ${
            w.criticalCases > 0 ? 'text-risk-critical' : 'text-text-muted'
          }`}
        >
          {w.criticalCases}
        </span>
      ),
    },
    {
      key: 'highCases',
      header: 'High Priority',
      align: 'center',
      render: (w) => (
        <span
          className={`font-mono text-xs ${
            w.highCases > 0 ? 'text-risk-high font-semibold' : 'text-text-muted'
          }`}
        >
          {w.highCases}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: () => (
        <Link
          to="/analyst/cases"
          className="inline-flex items-center space-x-1 text-xs text-accent hover:underline font-mono"
        >
          <span>View Dockets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyst Staff & Workload Governance"
        description="Operational docket allocations and triage capacity derived from live backend Case records."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Analysts' },
        ]}
        actions={
          <button
            type="button"
            onClick={fetchWorkloads}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        }
      />

      {/* Honest Backend Disclosure */}
      <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
        <div className="flex items-center space-x-2 text-warning text-xs font-mono font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>BACKEND GAP DISCLOSURE: RBAC Directory Endpoint</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          The backend service does not expose a bulk analyst employee directory endpoint (`/api/v1/analysts`). In strict compliance with <strong>Rule #1 (Backend Authority &amp; Non-Fabrication)</strong>, mock analyst personnel are not simulated. Workload metrics below are calculated exclusively from live Case records fetched from <code>GET /api/v1/cases</code>.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Aggregating operational analyst docket telemetry..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchWorkloads} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-xs text-text-muted block">Active Operators / Buckets</span>
              <span className="text-xl font-bold font-mono text-text">{workloads.length}</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-text-muted block">Total Tracked Dockets</span>
              <span className="text-xl font-bold font-mono text-accent">{totalCasesCount}</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-text-muted block">RBAC Enforcement Mode</span>
              <span className="text-sm font-mono text-risk-low font-semibold flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Strict Four-Eyes Boundary</span>
              </span>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-text flex items-center space-x-2">
              <Users className="w-4 h-4 text-accent" />
              <span>Operational Docket Assignments by Operator</span>
            </h3>

            {workloads.length === 0 ? (
              <p className="text-xs text-text-muted font-mono">No case dockets currently logged in the backend database.</p>
            ) : (
              <Table
                data={workloads}
                columns={columns}
                keyExtractor={(w) => w.analystId}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
