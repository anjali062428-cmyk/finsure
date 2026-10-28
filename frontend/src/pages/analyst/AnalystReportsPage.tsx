import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, ShieldCheck, Search, AlertCircle } from 'lucide-react';
import { incidentsApi } from '../../api/incidents';
import { reportsApi } from '../../api/reports';
import { Incident } from '../../types/incident';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const AnalystReportsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Hash verification state
  const [verifyIncidentId, setVerifyIncidentId] = useState('');
  const [candidateHash, setCandidateHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const list = await incidentsApi.listIncidents({ limit: 50 });
        setIncidents(list);
      } catch (err: unknown) {
        console.warn('Failed to load incident reports list', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  const handleDownloadAnalystReport = async (incidentId: string) => {
    setDownloadingId(incidentId);
    try {
      const blob = await reportsApi.downloadAnalystReport(incidentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinSure_Analyst_Evidence_${incidentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(`Failed to download report: ${(err as Error).message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerifyHash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyIncidentId.trim() || !candidateHash.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await reportsApi.verifyReport(
        verifyIncidentId.trim(),
        candidateHash.trim(),
        'analyst'
      );
      setVerificationResult({
        verified: res.verified,
        message: res.message || (res.verified ? 'Cryptographic hash verified.' : 'Hash mismatch.'),
      });
    } catch (err: unknown) {
      setVerificationResult({
        verified: false,
        message: (err as Error).message || 'Verification failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance &amp; Regulatory Forensic Reports"
        description="Generate tamper-evident Analyst Evidence Packs (PDF) and verify SHA-256 cryptographic authenticity hashes."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Reports' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Incident Evidence Pack Generator */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <span>Forensic Evidence Packs by Incident ({incidents.length})</span>
          </h3>

          {isLoading ? (
            <Card className="p-8 text-center text-xs text-text-muted">
              Loading available forensic packs...
            </Card>
          ) : incidents.length === 0 ? (
            <Card className="p-8 text-center text-xs text-text-muted">
              No incidents currently available for report generation.
            </Card>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <Card key={inc.incident_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text">{inc.incident_id}</span>
                      <StatusBadge status={inc.priority} />
                      <span className="font-mono text-xs text-risk-critical font-bold">
                        Score: {inc.risk_score}/100
                      </span>
                    </div>
                    <p className="text-xs text-text font-medium">
                      Transaction Ref: <span className="font-mono text-accent">{inc.transaction_id}</span>
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Subject: {inc.user_id} · Recorded: {new Date(inc.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadAnalystReport(inc.incident_id)}
                    isLoading={downloadingId === inc.incident_id}
                    className="shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    <span>Download Analyst Pack</span>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: PDF SHA-256 Hash Verification Tool */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-semibold text-text">Verify Report Authenticity</h3>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Verify whether a downloaded PDF file matches the cryptographic SHA-256 digest recorded in the immutable ledger at generation time.
            </p>

            {verificationResult && (
              <div
                className={`p-3 rounded text-xs font-medium flex items-start gap-2 ${
                  verificationResult.verified
                    ? 'bg-risk-low/10 border border-risk-low/20 text-risk-low'
                    : 'bg-risk-critical/10 border border-risk-critical/20 text-risk-critical'
                }`}
              >
                {verificationResult.verified ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{verificationResult.message}</span>
              </div>
            )}

            <form onSubmit={handleVerifyHash} className="space-y-3">
              <Input
                label="Incident ID"
                placeholder="e.g. inc_2e22e7c2b8fe"
                value={verifyIncidentId}
                onChange={(e) => setVerifyIncidentId(e.target.value)}
                required
              />
              <div>
                <label className="text-xs text-text-muted block mb-1">
                  Candidate SHA-256 Digest (64 Hex Characters)
                </label>
                <textarea
                  rows={2}
                  placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                  value={candidateHash}
                  onChange={(e) => setCandidateHash(e.target.value)}
                  required
                  className="w-full text-xs font-mono p-2.5 rounded-md bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={isVerifying}
                disabled={candidateHash.length !== 64 || !verifyIncidentId.trim()}
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                <span>Verify Cryptographic Digest</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
