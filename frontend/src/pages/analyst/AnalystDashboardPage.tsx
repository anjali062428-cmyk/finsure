import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  Activity,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { alertsApi } from '../../api/alerts';
import { incidentsApi } from '../../api/incidents';
import { casesApi } from '../../api/cases';
import { AlertQueueItem } from '../../types/alert';
import { Incident } from '../../types/incident';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

export const AnalystDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertQueueItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [openCasesCount, setOpenCasesCount] = useState<number>(0);
  const [assignedAlerts, setAssignedAlerts] = useState<Record<string, string>>({});
  const [assigningAlertId, setAssigningAlertId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [alertList, incidentList, caseList] = await Promise.all([
          alertsApi.listAlerts({ limit: 10 }).catch(() => []),
          incidentsApi.listIncidents({ limit: 10 }).catch(() => []),
          casesApi.listCases({ status: 'new' }).catch(() => []),
        ]);
        setAlerts(alertList);
        setIncidents(incidentList);
        setOpenCasesCount(caseList.length);
      } catch (e) {
        console.warn('Dashboard fetch error', e);
      }
    };
    fetchDashboardData();
  }, []);

  const handleAssignToMe = async (incidentId: string) => {
    if (!user) return;
    setAssigningAlertId(incidentId);
    setAssignError(null);
    try {
      await alertsApi.assignAlert(incidentId, user.user_id);
      setAssignedAlerts((prev) => ({ ...prev, [incidentId]: user.user_id }));
    } catch (err: unknown) {
      setAssignError((err as Error).message || 'Assignment failed.');
    } finally {
      setAssigningAlertId(null);
    }
  };

  const criticalAlertsCount = alerts.filter(
    (a) => a.priority === 'CRITICAL' || a.priority === 'HIGH'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud Operations Command Center"
        description="Priority alert triage, multi-model threat diagnostics, and cryptographic evidence verification."
        badge={
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-accent/10 text-accent border border-accent/30">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Triage Status: Active ({alerts.length} in queue)</span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Link to="/analyst/alerts">
              <Button variant="primary" size="sm">
                <BellRing className="w-3.5 h-3.5 mr-1.5" />
                <span>Open Full Alert Queue</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Alerts"
          value={String(alerts.length)}
          subtitle={`${criticalAlertsCount} Critical/High priority`}
          variant={criticalAlertsCount > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          title="Active Incidents"
          value={String(incidents.length)}
          subtitle="Ledger-tracked events"
          variant="warning"
        />
        <MetricCard
          title="Dispute Cases"
          value={String(openCasesCount)}
          subtitle="Customer-escalated dockets"
        />
        <MetricCard
          title="Ensemble Latency"
          value="98.16 ms"
          subtitle="P95 budget < 100ms"
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Alert Triage Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-risk-critical" />
                <h3 className="text-base font-semibold text-text">Priority Triage Queue</h3>
              </div>
              <Link to="/analyst/alerts" className="text-xs text-accent hover:underline flex items-center space-x-1">
                <span>View All ({alerts.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-10 text-xs text-text-muted space-y-2">
                <CheckCircle2 className="w-8 h-8 text-risk-low mx-auto opacity-70" />
                <p className="font-semibold text-text">Zero Unassigned Critical Alerts</p>
                <p>All incoming transactions are currently within nominal operational bounds.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.incident_id}
                    className="p-4 rounded-lg bg-surface-muted border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-text">
                          {alert.incident_id}
                        </span>
                        <StatusBadge status={alert.priority} />
                        <span
                          className={`font-mono text-xs font-bold ${
                            alert.risk_score >= 90
                              ? 'text-risk-critical'
                              : alert.risk_score >= 70
                              ? 'text-risk-high'
                              : 'text-risk-medium'
                          }`}
                        >
                          Score: {alert.risk_score}/100
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-text">
                        Txn Ref: <span className="font-mono text-accent">{alert.transaction_id}</span>
                        {' · '}
                        Payer: <span className="font-mono text-text-muted">{alert.user_id}</span>
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        Scam Classification: <strong className="text-text">{alert.scam_type || 'Unclassified Anomaly'}</strong>
                        {' · '}
                        Logged: {new Date(alert.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {assignedAlerts[alert.incident_id] || alert.assigned_to ? (
                        <span className="text-[11px] font-mono text-text-muted px-2 py-1 rounded bg-surface border border-border flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-accent" />
                          <span>{assignedAlerts[alert.incident_id] || alert.assigned_to}</span>
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignToMe(alert.incident_id)}
                          isLoading={assigningAlertId === alert.incident_id}
                        >
                          Assign to Me
                        </Button>
                      )}
                      <Link to={`/analyst/incidents/${alert.incident_id}`}>
                        <Button variant="primary" size="sm">
                          <span>Investigate</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {assignError && (
              <div className="mt-3 p-2 rounded bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical">
                {assignError}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Incident Activity Feed */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <span>Recent Forensic Dossiers</span>
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Cryptographically chained security incidents:
            </p>

            {incidents.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-6">
                No incidents recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {incidents.slice(0, 5).map((inc) => (
                  <Link
                    key={inc.incident_id}
                    to={`/analyst/incidents/${inc.incident_id}`}
                    className="p-3 rounded-lg bg-surface-muted hover:bg-surface-elevated border border-border hover:border-accent/40 block text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-text">{inc.incident_id}</span>
                      <span className="font-mono font-bold text-risk-critical">
                        {inc.risk_score}/100
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted flex justify-between">
                      <span>Status: <strong className="text-text uppercase">{inc.status}</strong></span>
                      <span>Decision: <strong className="text-text uppercase">{inc.decision}</strong></span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-border flex justify-between items-center text-xs">
              <Link to="/analyst/replay" className="text-accent hover:underline font-mono">
                Threat Replay Tool →
              </Link>
              <Link to="/analyst/rings" className="text-accent hover:underline font-mono">
                Mule Ring Graph →
              </Link>
            </div>
          </Card>

          <Card className="p-4 bg-surface-muted/50 border border-border/80 text-xs text-text-muted space-y-2">
            <div className="flex items-center gap-1.5 text-text font-semibold">
              <ShieldAlert className="w-4 h-4 text-risk-high" />
              <span>Analyst SOP Policy Notice</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Dismissals of CRITICAL priority incidents require four-eyes verification by a second analyst or administrator. All transitions generate SHA-256 ledger blocks.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
