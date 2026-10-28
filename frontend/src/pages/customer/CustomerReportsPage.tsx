import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, ShieldAlert, FileText, CheckCircle2, Clock } from 'lucide-react';
import { casesApi } from '../../api/cases';
import { incidentsApi } from '../../api/incidents';
import { reportsApi } from '../../api/reports';
import { Case } from '../../types/case';
import { Incident } from '../../types/incident';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export const CustomerReportsPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cList, iList] = await Promise.all([
          casesApi.listCases().catch(() => []),
          incidentsApi.listIncidents().catch(() => []),
        ]);
        setCases(cList);
        setIncidents(iList);
      } catch (e) {
        console.warn('Error fetching reports data', e);
      }
    };
    fetchData();
  }, []);

  const handleDownloadCustomerReport = async (incidentId: string) => {
    setDownloadingId(incidentId);
    setDownloadError('');
    try {
      const blob = await reportsApi.downloadCustomerReport(incidentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinSure_Customer_Statement_${incidentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setDownloadError(`Failed to generate PDF statement: ${(err as Error).message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispute &amp; Incident Reports"
        description="Track customer-reported fraud dockets, review case statuses, and download cryptographic incident statements."
        breadcrumbs={[
          { label: 'Dashboard', href: '/customer' },
          { label: 'Disputes & Reports' },
        ]}
      />

      {downloadError && (
        <div className="p-3 rounded-md bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical font-medium">
          {downloadError}
        </div>
      )}

      {/* Disputed Cases Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-risk-critical" />
          <span>Customer-Reported Fraud Disputes ({cases.length})</span>
        </h3>

        {cases.length === 0 ? (
          <EmptyState
            title="No Active Disputes"
            description="You have not filed any unauthorized transaction disputes. If you identify an unrecognized payment, you can file a fast-track dispute from the transaction receipt."
            actionLabel="Go to Transactions"
            onAction={() => (window.location.href = '/customer/transactions')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {cases.map((c) => (
              <Card key={c.case_id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-text">{c.case_id}</span>
                    <span className="text-xs text-text-muted">
                      Linked to Transaction: <strong className="text-text font-mono">{c.transaction_id}</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-risk-critical/10 text-risk-critical border border-risk-critical/20">
                      Priority: {c.priority}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px]">Calibrated Risk Score</span>
                    <span className="font-mono font-bold text-text">{c.risk_score} / 100</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">Reported At</span>
                    <span className="font-mono text-text">
                      {new Date(c.opened_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">Assigned Review Team</span>
                    <span className="text-text font-medium">{c.assigned_to || 'L1 Fraud Operations Queue'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] font-mono text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>SLA: Escalated for Priority Analyst Verification</span>
                  </span>
                  <Link
                    to={`/customer/transactions/${c.transaction_id}`}
                    className="text-accent hover:underline font-semibold"
                  >
                    View Original Transaction →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Security Incidents & PDF Statements Section */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <span>Verified Security Incidents &amp; PDF Statements ({incidents.length})</span>
        </h3>

        {incidents.length === 0 ? (
          <div className="p-6 rounded-lg bg-surface-muted/40 border border-border/80 text-center text-xs text-text-muted">
            <CheckCircle2 className="w-8 h-8 text-risk-low mx-auto mb-2 opacity-80" />
            <p>Zero high-risk security incidents recorded for your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incidents.map((inc) => (
              <Card key={inc.incident_id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-text">{inc.incident_id}</span>
                    <StatusBadge status={inc.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    Transaction: <span className="font-mono text-text">{inc.transaction_id}</span>
                    {' · '}
                    Risk Score: <span className="font-mono font-semibold text-text">{inc.risk_score}/100</span>
                    {' · '}
                    Recorded: {new Date(inc.created_at).toLocaleDateString()}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadCustomerReport(inc.incident_id)}
                  isLoading={downloadingId === inc.incident_id}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Download PDF Statement</span>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
