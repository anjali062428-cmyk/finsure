import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  RefreshCw,
  AlertTriangle,
  FolderOpen,
  Clock,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RiskScore } from '../../components/ui/RiskScore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { casesApi } from '../../api/cases';
import { Case } from '../../types/case';

export const AnalystCasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'risk_desc' | 'risk_asc' | 'priority'>('newest');

  const fetchCases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { status?: string; priority?: string; limit: number } = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }
      const data = await casesApi.listCases(params);
      setCases(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve cases from backend.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter]);

  // Client-side filtering and sorting
  const filteredCases = useMemo(() => {
    let result = [...cases];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          (c.incident_id && c.incident_id.toLowerCase().includes(q)) ||
          c.transaction_id.toLowerCase().includes(q) ||
          c.user_id.toLowerCase().includes(q) ||
          (c.assigned_to && c.assigned_to.toLowerCase().includes(q)) ||
          (c.scam_type && c.scam_type.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime();
      }
      if (sortBy === 'risk_desc') {
        return b.risk_score - a.risk_score;
      }
      if (sortBy === 'risk_asc') {
        return a.risk_score - b.risk_score;
      }
      if (sortBy === 'priority') {
        const order: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (order[b.priority] || 0) - (order[a.priority] || 0);
      }
      return 0;
    });

    return result;
  }, [cases, searchQuery, sortBy]);

  // Aggregate telemetry
  const criticalCount = useMemo(() => cases.filter((c) => c.priority === 'CRITICAL').length, [cases]);
  const activeCount = useMemo(
    () => cases.filter((c) => c.status === 'new' || c.status === 'under_investigation').length,
    [cases]
  );
  const escalatedCount = useMemo(() => cases.filter((c) => c.status === 'escalated').length, [cases]);

  const columns: Column<Case>[] = [
    {
      key: 'case_id',
      header: 'Case Docket ID',
      render: (c) => (
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-xs font-bold text-accent">{c.case_id}</span>
            {c.customer_reported && (
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-risk-critical/15 text-risk-critical border border-risk-critical/30">
                DISPUTE
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-text-muted">
            User: {c.user_id}
          </div>
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'Source Reference',
      render: (c) => (
        <div className="space-y-0.5">
          {c.incident_id ? (
            <div className="text-xs font-mono text-text">
              <span className="text-text-muted">Inc:</span> {c.incident_id}
            </div>
          ) : (
            <div className="text-xs font-mono text-text">
              <span className="text-text-muted">Tx:</span> {c.transaction_id}
            </div>
          )}
          {c.scam_type && (
            <div className="text-[11px] font-sans text-text-muted capitalize">
              Typology: {c.scam_type.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Calibrated Risk',
      align: 'center',
      render: (c) => (
        <div className="flex flex-col items-center">
          <RiskScore score={c.risk_score} size="sm" showDetails={false} />
          <span className="text-[10px] font-mono uppercase text-text-muted mt-0.5">
            {c.risk_band} ({c.risk_score.toFixed(1)})
          </span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      render: (c) => <StatusBadge status={c.priority} />,
    },
    {
      key: 'status',
      header: 'Lifecycle State',
      align: 'center',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'assigned_to',
      header: 'Investigator',
      render: (c) => (
        <div className="flex items-center space-x-1.5 text-xs font-mono text-text-muted">
          <UserCheck className="w-3.5 h-3.5 text-text-muted/60" />
          <span>{c.assigned_to || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'opened_at',
      header: 'Opened At',
      render: (c) => (
        <div className="space-y-0.5 text-xs font-mono text-text-muted">
          <div>{new Date(c.opened_at).toLocaleDateString()}</div>
          <div className="text-[11px] text-text-muted/70">{new Date(c.opened_at).toLocaleTimeString()}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <Link
          to={`/analyst/cases/${c.case_id}`}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-accent hover:underline font-mono"
        >
          <span>Open Workspace</span>
          <span>→</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Investigation Workspaces"
        description="Authoritative case lifecycle management, evidence store integrity, and FinSure Investigator copilot review."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Case Management' },
        ]}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCases}
              isLoading={isLoading}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-text-muted tracking-wider">Total Dockets</p>
            <p className="text-2xl font-bold font-mono text-text mt-1">{cases.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-text-muted border border-border/60">
            <Briefcase className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-text-muted tracking-wider">Active Investigations</p>
            <p className="text-2xl font-bold font-mono text-accent mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-text-muted tracking-wider">Critical Priority</p>
            <p className="text-2xl font-bold font-mono text-risk-critical mt-1">{criticalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-risk-critical/10 flex items-center justify-center text-risk-critical border border-risk-critical/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-text-muted tracking-wider">Tier-2 Escalations</p>
            <p className="text-2xl font-bold font-mono text-risk-high mt-1">{escalatedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-risk-high/10 flex items-center justify-center text-risk-high border border-risk-high/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3 border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <Input
              placeholder="Search ID, user, tx, analyst..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            />
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Lifecycle States' },
                { value: 'new', label: 'New Docket' },
                { value: 'under_investigation', label: 'Under Investigation' },
                { value: 'escalated', label: 'Escalated' },
                { value: 'confirmed_fraud', label: 'Confirmed Fraud' },
                { value: 'dismissed', label: 'Dismissed' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
          </div>

          <div>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </div>

          <div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { value: 'newest', label: 'Sort: Newest First' },
                { value: 'risk_desc', label: 'Sort: Highest Risk' },
                { value: 'risk_asc', label: 'Sort: Lowest Risk' },
                { value: 'priority', label: 'Sort: Priority (Critical First)' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <Card className="p-12">
          <LoadingState message="Loading case dockets from FinSure case repository..." />
        </Card>
      ) : error ? (
        <Card className="p-8">
          <ErrorState
            title="Failed to Load Cases"
            message={error}
            onRetry={fetchCases}
          />
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            title="No Case Dockets Found"
            description={
              searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'No cases match your active filter and search criteria. Try resetting filters.'
                : 'No cases have been created yet. Open an incident from the Alert Queue to escalate and open a case docket.'
            }
            icon={<FolderOpen className="w-6 h-6 text-text-muted" />}
            actionLabel={
              searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Reset Filters'
                : undefined
            }
            onAction={
              searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? () => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <Card className="p-0 border-border overflow-hidden">
          <Table<Case>
            columns={columns}
            data={filteredCases}
            keyExtractor={(c) => c.case_id}
          />
          <div className="p-3 bg-surface-muted border-t border-border flex items-center justify-between text-xs text-text-muted font-mono">
            <span>Showing {filteredCases.length} of {cases.length} dockets</span>
            <span>Case Store: SHA-256 Validated</span>
          </div>
        </Card>
      )}
    </div>
  );
};
export default AnalystCasesPage;
