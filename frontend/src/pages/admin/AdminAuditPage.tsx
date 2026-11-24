import React, { useState, useEffect } from 'react';
import { ShieldCheck, Hash, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { casesApi } from '../../api/cases';
import { Case } from '../../types/case';

interface AuditVerifyResult {
  verified: boolean;
  events_verified: number;
  error?: string;
}

interface DocketEvent {
  event_id: string;
  type?: string;
  event_type?: string;
  actor?: string;
  actor_id?: string;
  timestamp: string;
  source?: string;
  payload?: Record<string, unknown>;
}

export const AdminAuditPage: React.FC = () => {
  const [loadingCases, setLoadingCases] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerifyResult | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<DocketEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load available cases
  const loadCases = async () => {
    setLoadingCases(true);
    setError(null);
    try {
      const list = await casesApi.listCases({ limit: 50 });
      setCases(list);
      if (list.length > 0 && !selectedCaseId) {
        setSelectedCaseId(list[0].case_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query case records';
      setError(msg);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Verify audit trail for selected case
  const verifySelectedCase = async (caseId: string) => {
    if (!caseId) return;
    setIsVerifying(true);
    setError(null);
    try {
      const [auditRes, timelineRes] = await Promise.all([
        casesApi.verifyAuditTrail(caseId),
        casesApi.getCaseTimeline(caseId).catch(() => ({ case_id: caseId, timeline: [] })),
      ]);
      setVerificationResult(auditRes);
      const rawEvents = (timelineRes && Array.isArray(timelineRes.timeline)) ? timelineRes.timeline : [];
      setTimelineEvents(rawEvents as DocketEvent[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cryptographic audit verification call failed';
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Trigger verify on selection change
  useEffect(() => {
    if (selectedCaseId) {
      verifySelectedCase(selectedCaseId);
    }
  }, [selectedCaseId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail Cryptographic Ledger"
        description="Verify SHA-256 hash chains across incident transitions, case modifications, and model decisions."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Audit Trail' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => verifySelectedCase(selectedCaseId)}
            isLoading={isVerifying}
            disabled={!selectedCaseId}
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            <span>Verify Selected Docket Chain</span>
          </Button>
        }
      />

      <div className="p-3 rounded-md bg-surface border border-border text-xs text-text-muted leading-relaxed font-mono">
        TAMPER-PROOF DISCLOSURE: Hash-chain integrity proves tamper detection of the stored digital records. It verifies that entries have not been modified post-write, but does not certify the factual real-world ground truth of events.
      </div>

      {loadingCases ? (
        <LoadingState message="Querying case dockets for cryptographic ledger verification..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCases} />
      ) : cases.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <Hash className="w-8 h-8 text-text-muted mx-auto" />
          <h4 className="text-sm font-semibold text-text">No Case Ledgers Found</h4>
          <p className="text-xs text-text-muted">
            Create or escalate an incident to a Case docket to initialize an immutable cryptographic ledger chain.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Case Docket Selector */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-text-muted">Target Case Docket:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-surface-muted border border-border rounded px-3 py-1 text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} (Txn: {c.transaction_id} · Priority: {c.priority})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] font-mono text-text-muted">
              Total Dockets: {cases.length}
            </span>
          </Card>

          {/* Verification Status Banner */}
          {verificationResult && (
            <div
              className={`p-4 rounded-lg border text-xs font-mono flex items-start space-x-3 ${
                verificationResult.verified
                  ? 'bg-risk-low/10 border-risk-low/30 text-risk-low'
                  : 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical'
              }`}
            >
              {verificationResult.verified ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-risk-low mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0 text-risk-critical mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  {verificationResult.verified
                    ? 'Cryptographic Chain Integrity Verified Valid'
                    : 'INTEGRITY ALERT: Chain Verification Failed'}
                </span>
                <p>
                  {verificationResult.verified
                    ? 'All block hashes, link pointers, and payload checksums verified successfully.'
                    : verificationResult.error || 'Checksum or pointer mismatch detected in ledger block chain.'}
                </p>
                <div className="text-[11px] opacity-80 pt-1">
                  Verified Blocks: {verificationResult.events_verified}
                  {verificationResult.error && (
                    <span className="block font-bold">
                      Error Details: {verificationResult.error}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Real Timeline Events */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-text flex items-center space-x-2">
              <Hash className="w-4 h-4 text-accent" />
              <span>Cryptographically Chained Docket Events ({timelineEvents.length} Events)</span>
            </h3>

            {timelineEvents.length === 0 ? (
              <p className="text-xs text-text-muted font-mono">No events recorded in this case ledger yet.</p>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {timelineEvents.map((ev, index) => (
                  <div
                    key={ev.event_id || index}
                    className="p-3 rounded bg-surface-muted border border-border/80 space-y-1"
                  >
                    <div className="flex justify-between text-text font-bold">
                      <span>Event #{index + 1}: {ev.type || ev.event_type || 'LEDGER_EVENT'}</span>
                      <span className="text-accent-teal text-[11px]">CHAINED</span>
                    </div>
                    <div className="text-text-muted text-[11px] truncate">
                      Event ID: {ev.event_id} · Actor: {ev.actor || ev.actor_id || 'system'}
                    </div>
                    <div className="text-[11px] text-text-muted flex justify-between pt-1">
                      <span>Timestamp: {ev.timestamp}</span>
                      <span>Source: {ev.source || 'case_ledger'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
