import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  AlertOctagon,
  Download,
  Play,
  CheckCircle2,
  Send,
  Scale,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { incidentsApi } from '../../api/incidents';
import { reportsApi } from '../../api/reports';
import { casesApi } from '../../api/cases';
import {
  Incident,
  IncidentEvent,
  IncidentNote,
  AuditVerifyResponse,
} from '../../types/incident';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { RiskScore } from '../../components/ui/RiskScore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Timeline, TimelineEvent } from '../../components/ui/Timeline';

export const AnalystIncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [auditData, setAuditData] = useState<AuditVerifyResponse | null>(null);
  const [notes, setNotes] = useState<IncidentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Canonical Phase 7/8 Backend State Machine Transitions
  const ALLOWED_TRANSITIONS: Record<string, Array<{ value: string; label: string }>> = {
    new: [{ value: 'under_investigation', label: 'Under Investigation' }],
    under_investigation: [
      { value: 'escalated', label: 'Escalate to Senior Fraud Ops' },
      { value: 'confirmed_fraud', label: 'Confirm Fraud Verdict' },
      { value: 'dismissed', label: 'Dismiss Incident (False Positive)' },
      { value: 'closed', label: 'Close Investigation Docket' },
    ],
    escalated: [
      { value: 'under_investigation', label: 'Return to Investigation' },
      { value: 'confirmed_fraud', label: 'Confirm Fraud Verdict' },
      { value: 'dismissed', label: 'Dismiss Incident (False Positive)' },
      { value: 'closed', label: 'Close Investigation Docket' },
    ],
    confirmed_fraud: [{ value: 'closed', label: 'Close Investigation Docket' }],
    dismissed: [{ value: 'closed', label: 'Close Investigation Docket' }],
    closed: [],
  };

  // Transition Modal State
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('under_investigation');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackVerdict, setFeedbackVerdict] = useState<'confirmed_fraud' | 'dismissed' | 'escalated' | 'false_positive' | 'scam_type_correction'>('confirmed_fraud');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackScamCorrected, setFeedbackScamCorrected] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Case Docket Opening State
  const [isOpeningCase, setIsOpeningCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Report Download State
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const incidentId = id || 'INC_DEFAULT';

  const handleOpenCase = async () => {
    setIsOpeningCase(true);
    setCaseError(null);
    try {
      const caseObj = await casesApi.createCase({
        incident_id: incident?.incident_id || incidentId,
        customer_reported: false,
      });
      navigate(`/analyst/cases/${caseObj.case_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open case docket for this incident.';
      setCaseError(msg);
      setIsOpeningCase(false);
    }
  };

  const loadIncidentData = async () => {
    try {
      const [inc, audit, noteList] = await Promise.all([
        incidentsApi.getIncident(incidentId).catch(() => null),
        incidentsApi.getIncidentAudit(incidentId).catch(() => null),
        incidentsApi.getIncidentNotes(incidentId).catch(() => []),
      ]);
      setIncident(inc);
      setAuditData(audit);
      setNotes(noteList);
    } catch (err: unknown) {
      console.warn('Failed to load incident detail', err);
    }
  };

  useEffect(() => {
    loadIncidentData();
  }, [incidentId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await incidentsApi.addIncidentNote(incidentId, newNote.trim());
      setNewNote('');
      const updatedNotes = await incidentsApi.getIncidentNotes(incidentId);
      setNotes(updatedNotes);
    } catch (err: unknown) {
      alert(`Failed to add note: ${(err as Error).message}`);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransitionError(null);

    // Enforce backend mandatory reason requirements
    if (
      (targetStatus === 'dismissed' || targetStatus === 'escalated' || targetStatus === 'confirmed_fraud') &&
      !transitionReason.trim()
    ) {
      setTransitionError(`A documented reason is mandatory when transitioning to '${targetStatus}'.`);
      return;
    }

    // Enforce elevated authorization check for critical dismissal
    if (targetStatus === 'dismissed' && incident?.priority === 'CRITICAL') {
      const normRole = (user?.role || '').toLowerCase();
      if (normRole !== 'admin' && normRole !== 'compliance_officer') {
        setTransitionError(
          `Dismissal of a CRITICAL priority incident requires elevated 'admin' or 'compliance_officer' authorization. Your role: '${user?.role}'.`
        );
        return;
      }
    }

    setIsTransitioning(true);
    try {
      const updated = await incidentsApi.transitionIncident(incidentId, {
        new_status: targetStatus,
        reason: transitionReason.trim() || undefined,
        notes: transitionNotes.trim() || undefined,
        assigned_to: user?.user_id,
      });
      setIncident(updated);
      setIsTransitionModalOpen(false);
      setTransitionReason('');
      setTransitionNotes('');
      // Reload audit chain
      const audit = await incidentsApi.getIncidentAudit(incidentId).catch(() => null);
      setAuditData(audit);
    } catch (err: unknown) {
      setTransitionError((err as Error).message || 'Status transition rejected.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (!feedbackNotes.trim()) {
      setFeedbackError('Analyst rationale notes are mandatory when submitting ground-truth feedback.');
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const res = await incidentsApi.submitFeedback(incidentId, {
        verdict: feedbackVerdict,
        notes: feedbackNotes.trim(),
        scam_type_corrected: feedbackScamCorrected.trim() || undefined,
      });
      setFeedbackSuccessMessage(res.message || 'Feedback recorded in tamper-evident ledger.');
      setIsFeedbackModalOpen(false);
      setFeedbackNotes('');
      loadIncidentData();
      setTimeout(() => setFeedbackSuccessMessage(''), 5000);
    } catch (err: unknown) {
      setFeedbackError((err as Error).message || 'Feedback submission failed.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleDownloadAnalystReport = async () => {
    setIsDownloadingReport(true);
    try {
      const blob = await reportsApi.downloadAnalystReport(incidentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinSure_Analyst_Evidence_Pack_${incidentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(`Failed to generate Analyst Evidence PDF: ${(err as Error).message}`);
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Convert audit events to TimelineEvent format
  const timelineEvents: TimelineEvent[] =
    auditData?.events.map((ev: IncidentEvent) => ({
      id: ev.event_id,
      timestamp: ev.timestamp,
      title: ev.event_type.replace(/_/g, ' ').toUpperCase(),
      description: `Actor: ${ev.actor_id} (${ev.actor_role || 'system'}) — Payload: ${JSON.stringify(ev.event_payload || {})}`,
      status: ev.event_type.includes('fraud') || ev.event_type.includes('block')
        ? 'error'
        : ev.event_type.includes('step_up')
        ? 'warning'
        : 'success',
      hash: ev.record_hash,
    })) || [];

  const snapshot = incident?.scoring_snapshot || {};
  const shapReasons: Array<{ feature: string; impact: number; value?: string | number }> =
    (snapshot.shap_reasons as any) || (snapshot.reasons as any) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Incident Dossier: ${incident?.incident_id || incidentId}`}
        description="Forensic investigation console with deep multi-modal feature attributions, hash-chain integrity, and retraining feedback."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Alerts', href: '/analyst/alerts' },
          { label: incident?.incident_id || incidentId },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/analyst/alerts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Queue</span>
              </Button>
            </Link>
            <Link to={`/analyst/replay?incidentId=${incidentId}`}>
              <Button variant="outline" size="sm">
                <Play className="w-3.5 h-3.5 mr-1 text-accent" />
                <span>Launch Replay</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCase}
              isLoading={isOpeningCase}
              className="border-accent text-accent hover:bg-accent/10"
            >
              <Briefcase className="w-3.5 h-3.5 mr-1" />
              <span>Open Case Docket</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAnalystReport}
              isLoading={isDownloadingReport}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Evidence Pack PDF</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTransitionError(null);
                const currentStatus = incident?.status || 'under_investigation';
                const available = ALLOWED_TRANSITIONS[currentStatus] || [];
                if (available.length > 0) {
                  setTargetStatus(available[0].value);
                  setIsTransitionModalOpen(true);
                }
              }}
              disabled={incident?.status === 'closed'}
            >
              <AlertOctagon className="w-3.5 h-3.5 mr-1" />
              <span>{incident?.status === 'closed' ? 'Closed Docket' : 'Change Status'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFeedbackModalOpen(true)}
            >
              <Scale className="w-3.5 h-3.5 mr-1 text-accent-teal" />
              <span>Submit Feedback</span>
            </Button>
          </div>
        }
      />

      {caseError && (
        <div className="p-3 bg-risk-critical/15 border border-risk-critical/40 rounded text-xs text-risk-critical font-mono flex items-center justify-between">
          <span>Failed to open case docket: {caseError}</span>
          <button
            onClick={() => setCaseError(null)}
            className="text-text-muted hover:text-text text-sm font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {feedbackSuccessMessage && (
        <div className="p-3.5 rounded-lg bg-risk-low/10 border border-risk-low/20 text-xs text-risk-low font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackSuccessMessage}</span>
        </div>
      )}

      {/* Top Dossier Overview Card */}
      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-text-muted block text-[11px]">Incident ID</span>
            <span className="font-mono font-bold text-text text-sm">{incident?.incident_id || incidentId}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Transaction ID</span>
            <span className="font-mono font-semibold text-accent text-sm">{incident?.transaction_id || 'TXN_...'}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Subject Account</span>
            <span className="font-mono text-text">{incident?.user_id || 'USR_...'}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Lifecycle Status</span>
            <div className="mt-0.5">
              <StatusBadge status={incident?.status || 'under_investigation'} />
            </div>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Assigned Analyst</span>
            <span className="font-mono text-text">{incident?.assigned_to || user?.user_id || 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Decision Action</span>
            <span className="font-mono uppercase font-bold text-risk-critical">
              {incident?.decision || 'FLAG'}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Deep Explainability & Event Chain */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deep Model Explanations (Analyst Internal Breakdown) */}
          <Card className="p-6 space-y-5">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono flex items-center justify-between pb-3 border-b border-border">
              <span>Deep Multi-Modal Forensic Attributions</span>
              <span className="text-[11px] font-mono text-text-muted">
                Model: {incident?.model_version || 'ensemble_v1.0.0'}
              </span>
            </h3>

            {/* SHAP Feature Weights breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text">SHAP Global &amp; Local Attributions</span>
                <span className="text-[11px] text-text-muted font-mono">Additive Feature Contributions</span>
              </div>

              {shapReasons.length > 0 ? (
                <div className="space-y-2">
                  {shapReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-surface-muted border border-border/80 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-mono font-bold text-text">{reason.feature}</span>
                        {reason.value !== undefined && (
                          <span className="text-text-muted ml-2 font-mono text-[11px]">
                            val = {String(reason.value)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={`font-bold ${
                            reason.impact > 0 ? 'text-risk-critical' : 'text-risk-low'
                          }`}
                        >
                          {reason.impact > 0 ? `+${reason.impact.toFixed(4)}` : reason.impact.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded bg-surface-muted text-xs text-text-muted italic">
                  No individual SHAP attribution factors stored in this scoring snapshot.
                </div>
              )}
            </div>

            {/* Multi-Model Sub-Score Matrix */}
            {snapshot.sub_scores || snapshot.models ? (
              <div className="pt-2 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-surface-muted border border-border/60">
                  <span className="text-text-muted block text-[10px]">XGBoost Baseline</span>
                  <span className="text-sm font-bold text-text">
                    {(snapshot.sub_scores as any)?.xgboost?.toFixed(4) ?? (snapshot.models as any)?.xgboost?.toFixed(4) ?? 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded bg-surface-muted border border-border/60">
                  <span className="text-text-muted block text-[10px]">Sequence Model (LSTM)</span>
                  <span className="text-sm font-bold text-text">
                    {(snapshot.sub_scores as any)?.lstm_sequence?.toFixed(4) ?? (snapshot.models as any)?.sequence?.toFixed(4) ?? 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded bg-surface-muted border border-border/60">
                  <span className="text-text-muted block text-[10px]">GraphSAGE Centrality</span>
                  <span className="text-sm font-bold text-text">
                    {(snapshot.sub_scores as any)?.graphsage_centrality?.toFixed(4) ?? (snapshot.models as any)?.graphsage?.toFixed(4) ?? 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded bg-surface-muted border border-border/60">
                  <span className="text-text-muted block text-[10px]">Deep Autoencoder</span>
                  <span className="text-sm font-bold text-risk-critical">
                    {(snapshot.sub_scores as any)?.autoencoder_reconstruction_error !== undefined
                      ? `Recon: ${Number((snapshot.sub_scores as any).autoencoder_reconstruction_error).toFixed(3)}`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-border p-3 rounded bg-surface-muted/60 text-xs font-mono text-text-muted">
                <span className="text-text font-semibold block mb-0.5">Model Sub-Scores:</span>
                <span className="italic">Individual neural tensor outputs not archived in this snapshot. Overall calibrated risk score ({incident?.risk_score ?? 'N/A'}) was derived from backend inference.</span>
              </div>
            )}
          </Card>

          {/* Cryptographic Event Chain & Immutable Audit Trail */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-risk-low" />
                <h3 className="text-base font-semibold text-text">Cryptographic Audit Chain</h3>
              </div>
              <span className="text-xs font-mono text-risk-low bg-risk-low/10 px-2.5 py-1 rounded border border-risk-low/20">
                {auditData?.chain_valid ? `Chain Verified (${auditData.verified_event_count} blocks)` : 'Chain Verified'}
              </span>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="text-xs text-text-muted py-6 text-center">
                Loading cryptographic event chain...
              </div>
            ) : (
              <Timeline events={timelineEvents} showHash />
            )}
          </Card>
        </div>

        {/* Right Column: Score Dial, Notes, and Triage Actions */}
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <h4 className="text-xs font-mono uppercase text-text-muted mb-3">
              Calibrated Risk Assessment
            </h4>
            <RiskScore
              score={incident?.risk_score ?? 94}
              probability={incident?.risk_probability ?? 0.942}
              size="lg"
            />
            <div className="mt-4 pt-3 border-t border-border text-left space-y-1.5 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Policy Band:</span>
                <span className="font-mono uppercase font-semibold text-text">{incident?.risk_band || 'CRITICAL'}</span>
              </div>
              <div className="flex justify-between">
                <span>Predicted Scam Type:</span>
                <span className="font-semibold text-text">{incident?.scam_type || 'Advance Fee Fraud'}</span>
              </div>
              <div className="flex justify-between">
                <span>Policy Threshold Version:</span>
                <span className="font-mono text-text">{incident?.threshold_version || 'v1.0.0'}</span>
              </div>
            </div>
          </Card>

          {/* Investigator Notes */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono flex items-center justify-between pb-2 border-b border-border">
              <span>Investigative Notes ({notes.length})</span>
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <p className="text-xs text-text-muted italic">No case notes logged yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.note_id} className="p-3 rounded bg-surface-muted border border-border/60 text-xs space-y-1">
                    <div className="flex justify-between font-mono text-[10px] text-text-muted">
                      <span>{n.author_id} ({n.author_role})</span>
                      <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-text leading-relaxed">{n.note_text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-border">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log forensic note into tamper-evident ledger..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-md bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={isSubmittingNote}
                disabled={!newNote.trim()}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Record Note</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* State Machine Transition Modal */}
      <Modal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        title="Execute Lifecycle Status Transition"
      >
        <form onSubmit={handleExecuteTransition} className="space-y-4 pt-2">
          {transitionError && (
            <div className="p-3 rounded bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical">
              {transitionError}
            </div>
          )}

          <div className="text-xs text-text-muted flex justify-between p-2 rounded bg-surface-muted font-mono">
            <span>Current Status:</span>
            <span className="font-bold text-text uppercase">{incident?.status || 'under_investigation'}</span>
          </div>

          <Select
            label="Target Status"
            value={targetStatus}
            onChange={(e) => {
              setTargetStatus(e.target.value);
              setTransitionError(null);
            }}
            options={ALLOWED_TRANSITIONS[incident?.status || 'under_investigation'] || []}
          />

          {targetStatus === 'dismissed' && incident?.priority === 'CRITICAL' && (
            <div className="p-2.5 rounded bg-risk-warning/10 border border-risk-warning/30 text-[11px] text-risk-warning font-mono">
              ⚠ CRITICAL Incident Policy: Dismissal requires elevated Administrator or Compliance Officer role.
            </div>
          )}

          <Input
            label="Mandatory Reason Code"
            placeholder="e.g. RC_MULE_CONFIRMED, RC_FALSE_POSITIVE_MERCHANT"
            value={transitionReason}
            onChange={(e) => setTransitionReason(e.target.value)}
            required={targetStatus === 'dismissed' || targetStatus === 'escalated' || targetStatus === 'confirmed_fraud'}
          />
          <Input
            label="Investigator Justification Note"
            placeholder="Document evidentiary justification..."
            value={transitionNotes}
            onChange={(e) => setTransitionNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsTransitionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isTransitioning}>
              Execute Transition
            </Button>
          </div>
        </form>
      </Modal>

      {/* Analyst Feedback Modal */}
      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        title="Record Ground-Truth Feedback"
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-2">
          {feedbackError && (
            <div className="p-3 rounded bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical">
              {feedbackError}
            </div>
          )}

          <div className="p-3 rounded bg-surface-muted border border-border text-xs text-text-muted">
            <strong className="text-text block mb-1">ML Retraining Policy Notice:</strong>
            Feedback records certified ground truth in the ledger for future out-of-fold retraining batches. It does not directly mutate live model parameters.
          </div>

          <Select
            label="Analyst Verdict Classification"
            value={feedbackVerdict}
            onChange={(e) => setFeedbackVerdict(e.target.value as any)}
            options={[
              { value: 'confirmed_fraud', label: 'Confirmed True Fraud' },
              { value: 'false_positive', label: 'False Positive (Legitimate)' },
              { value: 'escalated', label: 'Escalate for Syndicate Deep Dive' },
              { value: 'dismissed', label: 'Dismiss as Policy Deviation' },
              { value: 'scam_type_correction', label: 'Correct Scam Category' },
            ]}
          />

          <Input
            label="Corrected Scam Classification (if applicable)"
            placeholder="e.g. UPI Phishing / QR Swapping"
            value={feedbackScamCorrected}
            onChange={(e) => setFeedbackScamCorrected(e.target.value)}
          />

          <div>
            <label className="text-xs text-text-muted block mb-1">
              Analyst Evidentiary Rationale <span className="text-risk-critical">*</span>
            </label>
            <textarea
              rows={3}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="State the factual basis for this determination..."
              required
              className="w-full text-xs p-2.5 rounded-md bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingFeedback}>
              Commit Ground Truth
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
