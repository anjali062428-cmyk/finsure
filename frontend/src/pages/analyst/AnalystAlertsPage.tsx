import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { alertsApi } from '../../api/alerts';
import { AlertQueueItem } from '../../types/alert';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/ui/FilterBar';
import { Table, Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

export const AnalystAlertsPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertQueueItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assignedMap, setAssignedMap] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [autoPoll, setAutoPoll] = useState<boolean>(false);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await alertsApi.listAlerts({
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setAlerts(data);
    } catch (err: unknown) {
      console.warn('Failed to load alert queue', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [priorityFilter, statusFilter]);

  // Periodic polling when enabled (30 seconds)
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      loadAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoPoll, priorityFilter, statusFilter]);

  const handleAssignToMe = async (incidentId: string) => {
    if (!user) return;
    setAssigningId(incidentId);
    setAssignError(null);
    try {
      await alertsApi.assignAlert(incidentId, user.user_id);
      setAssignedMap((prev) => ({ ...prev, [incidentId]: user.user_id }));
    } catch (err: unknown) {
      setAssignError((err as Error).message || 'Assignment failed.');
    } finally {
      setAssigningId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      a.incident_id.toLowerCase().includes(term) ||
      a.transaction_id.toLowerCase().includes(term) ||
      a.user_id.toLowerCase().includes(term) ||
      (a.scam_type && a.scam_type.toLowerCase().includes(term));
    return matchSearch;
  });

  const columns: Column<AlertQueueItem>[] = [
    {
      key: 'incident_id',
      header: 'Alert / Incident ID',
      render: (a) => (
        <div>
          <span className="font-mono text-xs font-bold text-text">{a.incident_id}</span>
          <div className="text-[10px] text-text-muted font-mono">
            {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'transaction_id',
      header: 'Transaction & Subject',
      render: (a) => (
        <div>
          <div className="font-mono text-xs text-text font-medium">{a.transaction_id}</div>
          <div className="text-[11px] text-text-muted font-mono">Account: {a.user_id}</div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      render: (a) => <StatusBadge status={a.priority} />,
    },
    {
      key: 'risk_score',
      header: 'Risk Score',
      align: 'center',
      render: (a) => (
        <span
          className={`font-mono text-xs font-bold ${
            a.risk_score >= 90
              ? 'text-risk-critical'
              : a.risk_score >= 70
              ? 'text-risk-high'
              : 'text-risk-medium'
          }`}
        >
          {a.risk_score}/100
        </span>
      ),
    },
    {
      key: 'scam_type',
      header: 'Scam Type',
      render: (a) => (
        <span className="text-xs text-text-muted">
          {a.scam_type ? (
            <span className="font-semibold text-text">{a.scam_type}</span>
          ) : (
            <span className="italic opacity-60">Anomaly</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      render: (a) => {
        const assigned = assignedMap[a.incident_id] || a.assigned_to;
        return assigned ? (
          <span className="text-xs font-mono text-text flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-accent" />
            <span>{assigned}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleAssignToMe(a.incident_id)}
            disabled={assigningId === a.incident_id}
            className="text-xs text-accent hover:underline font-mono disabled:opacity-50"
          >
            {assigningId === a.incident_id ? 'Claiming...' : '+ Claim'}
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <Link
          to={`/analyst/incidents/${a.incident_id}`}
          className="text-xs font-semibold text-accent hover:underline font-mono inline-flex items-center gap-1"
        >
          <span>Triage</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Triage Queue"
        description="Deterministic triage queue sorted by Priority (CRITICAL > HIGH > MEDIUM), Risk Score DESC, and SLA due date."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Alert Queue' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={autoPoll ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setAutoPoll(!autoPoll)}
              title="Automatically poll backend every 30 seconds"
            >
              <span className="font-mono text-xs">Auto-Poll (30s): {autoPoll ? 'ACTIVE' : 'OFF'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={loadAlerts} isLoading={isLoading}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Manual Refresh</span>
            </Button>
          </div>
        }
      />

      {assignError && (
        <div className="p-3 rounded bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical">
          {assignError}
        </div>
      )}

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by Alert ID, Txn ID, User, or Scam Type..."
        filters={[
          {
            id: 'priority',
            label: 'Priority',
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { label: 'All Priorities', value: '' },
              { label: 'CRITICAL Priority', value: 'CRITICAL' },
              { label: 'HIGH Priority', value: 'HIGH' },
              { label: 'MEDIUM Priority', value: 'MEDIUM' },
              { label: 'LOW Priority', value: 'LOW' },
            ],
          },
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: '' },
              { label: 'New / Unassigned', value: 'new' },
              { label: 'Under Investigation', value: 'under_investigation' },
              { label: 'Escalated', value: 'escalated' },
              { label: 'Confirmed Fraud', value: 'confirmed_fraud' },
              { label: 'Dismissed', value: 'dismissed' },
            ],
          },
        ]}
      />

      <Table
        columns={columns}
        data={filteredAlerts}
        keyExtractor={(item) => item.incident_id}
        emptyMessage="No alerts matching the selected filters. Queue is nominal."
      />
    </div>
  );
};
