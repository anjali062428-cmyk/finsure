import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Download,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  PlusCircle,
  FileSpreadsheet,
  Hash,
  Share2,
  Play,
  Sparkles,
  Send,
  FileText,
  Activity,
  Layers,
  AlertOctagon,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { casesApi } from '../../api/cases';
import {
  CaseWorkspace,
  InvestigationRun,
  ClaimValidationResult,
  CaseStatus,
  EvidenceType,
} from '../../types/case';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { RiskScore } from '../../components/ui/RiskScore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EvidenceChip } from '../../components/ui/EvidenceChip';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const AnalystCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const caseId = id || '';

  // Workspace Data
  const [workspace, setWorkspace] = useState<CaseWorkspace | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [similarCases, setSimilarCases] = useState<any[]>([]);
  const [similarDisclaimer, setSimilarDisclaimer] = useState<string>('');
  const [auditVerification, setAuditVerification] = useState<{
    verified: boolean;
    events_verified: number;
    error?: string;
  } | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'evidence' | 'investigator' | 'timeline'>('evidence');
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);

  // Evidence Filtering
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<string>('all');
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<'all' | 'active' | 'withdrawn'>('all');
  const [evidenceSearch, setEvidenceSearch] = useState('');

  // Add Evidence Modal
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false);
  const [newEvidenceType, setNewEvidenceType] = useState<EvidenceType>('external_file');
  const [newSourceRef, setNewSourceRef] = useState('');
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [addEvidenceError, setAddEvidenceError] = useState<string | null>(null);

  // Withdraw Evidence Modal
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawingEvidenceId, setWithdrawingEvidenceId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Transition Modal State
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CaseStatus>('under_investigation');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Note Submission State
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Investigator Execution State
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationError, setInvestigationError] = useState<string | null>(null);
  const [activeInvestigation, setActiveInvestigation] = useState<InvestigationRun | null>(null);

  // Interactive Claim Validator State
  const [customClaimText, setCustomClaimText] = useState('');
  const [isValidatingClaim, setIsValidatingClaim] = useState(false);
  const [customClaimResult, setCustomClaimResult] = useState<ClaimValidationResult | null>(null);
  const [claimValidateError, setClaimValidateError] = useState<string | null>(null);

  // Audit Verification & Export States
  const [isVerifyingAudit, setIsVerifyingAudit] = useState(false);
  const [isExportingPack, setIsExportingPack] = useState(false);
  const [packExportNotice, setPackExportNotice] = useState<string | null>(null);

  // Canonical Phase 8 Transitions Matrix
  const ALLOWED_TRANSITIONS: Record<CaseStatus, Array<{ value: CaseStatus; label: string }>> = {
    new: [{ value: 'under_investigation', label: 'Start Forensic Investigation' }],
    under_investigation: [
      { value: 'escalated', label: 'Escalate to Tier-2 / Compliance' },
      { value: 'confirmed_fraud', label: 'Confirm Fraud Verdict (Final Adjudication)' },
      { value: 'dismissed', label: 'Dismiss Case (False Positive / Benign)' },
    ],
    escalated: [
      { value: 'under_investigation', label: 'Return to Investigation' },
      { value: 'confirmed_fraud', label: 'Confirm Fraud Verdict (Final Adjudication)' },
      { value: 'dismissed', label: 'Dismiss Case (False Positive / Benign)' },
      { value: 'closed', label: 'Close Docket' },
    ],
    confirmed_fraud: [{ value: 'closed', label: 'Close Docket' }],
    dismissed: [{ value: 'closed', label: 'Close Docket' }],
    closed: [],
  };

  // Load Full Case Workspace
  const loadCaseWorkspace = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ws, tl, sim, audit] = await Promise.all([
        casesApi.getCaseWorkspace(caseId),
        casesApi.getCaseTimeline(caseId).catch(() => ({ case_id: caseId, timeline: [] })),
        casesApi.getSimilarCases(caseId, 3).catch(() => ({ case_id: caseId, similar_cases: [], attribution_disclaimer: '' })),
        casesApi.verifyAuditTrail(caseId).catch(() => null),
      ]);
      setWorkspace(ws);
      setTimelineEvents(tl.timeline || []);
      setSimilarCases(sim.similar_cases || []);
      setSimilarDisclaimer(sim.attribution_disclaimer || '');
      setAuditVerification(audit);
      if (ws.latest_investigation) {
        setActiveInvestigation(ws.latest_investigation);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to load case ${caseId}`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      loadCaseWorkspace();
    }
  }, [caseId]);

  const currentCase = workspace?.case;
  const evidenceList = workspace?.evidence || [];
  const notesList = workspace?.notes || [];
  const transitionsList = workspace?.transitions || [];

  // Filtered Evidence
  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((ev) => {
      if (evidenceTypeFilter !== 'all' && ev.evidence_type !== evidenceTypeFilter) {
        return false;
      }
      if (evidenceStatusFilter === 'active' && ev.withdrawn_at) {
        return false;
      }
      if (evidenceStatusFilter === 'withdrawn' && !ev.withdrawn_at) {
        return false;
      }
      if (evidenceSearch.trim()) {
        const q = evidenceSearch.toLowerCase().trim();
        const inId = ev.evidence_id.toLowerCase().includes(q);
        const inType = ev.evidence_type.toLowerCase().includes(q);
        const inSource = ev.source_ref.toLowerCase().includes(q);
        const inMeta = JSON.stringify(ev.metadata).toLowerCase().includes(q);
        return inId || inType || inSource || inMeta;
      }
      return true;
    });
  }, [evidenceList, evidenceTypeFilter, evidenceStatusFilter, evidenceSearch]);

  // Navigate to and highlight cited evidence item
  const handleCitationClick = (evidenceId: string) => {
    setActiveTab('evidence');
    setHighlightedEvidenceId(evidenceId);
    setTimeout(() => {
      const el = document.getElementById(`evidence-card-${evidenceId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => {
      setHighlightedEvidenceId(null);
    }, 3500);
  };

  // Add Note Handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);
    setNoteError(null);
    try {
      const note = await casesApi.addNote(caseId, newNoteText.trim());
      setWorkspace((prev) => (prev ? { ...prev, notes: [...prev.notes, note] } : prev));
      setNewNoteText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add analyst note.';
      setNoteError(msg);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Run FinSure Investigator
  const handleRunInvestigator = async () => {
    setIsInvestigating(true);
    setInvestigationError(null);
    try {
      const run = await casesApi.runInvestigator(caseId, 'template');
      setActiveInvestigation(run);
      setWorkspace((prev) => (prev ? { ...prev, latest_investigation: run } : prev));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Investigator execution failed.';
      setInvestigationError(msg);
    } finally {
      setIsInvestigating(false);
    }
  };

  // Live Claim Validation Handler
  const handleValidateCustomClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customClaimText.trim()) return;
    setIsValidatingClaim(true);
    setClaimValidateError(null);
    try {
      const result = await casesApi.validateClaims(caseId, customClaimText.trim());
      setCustomClaimResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim validation check failed.';
      setClaimValidateError(msg);
    } finally {
      setIsValidatingClaim(false);
    }
  };

  // Add Evidence Handler
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceRef.trim()) {
      setAddEvidenceError('Source reference is required.');
      return;
    }
    setIsAddingEvidence(true);
    setAddEvidenceError(null);
    try {
      const meta: Record<string, unknown> = {};
      if (newMetadataKey.trim()) {
        meta[newMetadataKey.trim()] = newMetadataValue.trim();
      }
      meta['added_timestamp'] = new Date().toISOString();

      const newEv = await casesApi.addEvidence(caseId, {
        evidence_type: newEvidenceType,
        source_ref: newSourceRef.trim(),
        metadata: meta,
      });

      setWorkspace((prev) => (prev ? { ...prev, evidence: [...prev.evidence, newEv] } : prev));
      setIsAddEvidenceModalOpen(false);
      setNewSourceRef('');
      setNewMetadataKey('');
      setNewMetadataValue('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register evidence item.';
      setAddEvidenceError(msg);
    } finally {
      setIsAddingEvidence(false);
    }
  };

  // Withdraw Evidence Handler
  const handleWithdrawEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawingEvidenceId) return;
    if (withdrawReason.trim().length < 3) {
      setWithdrawError('Withdrawal reason must be at least 3 characters.');
      return;
    }
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const updatedEv = await casesApi.withdrawEvidence(caseId, withdrawingEvidenceId, withdrawReason.trim());
      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          evidence: prev.evidence.map((ev) => (ev.evidence_id === updatedEv.evidence_id ? updatedEv : ev)),
        };
      });
      setIsWithdrawModalOpen(false);
      setWithdrawingEvidenceId(null);
      setWithdrawReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to withdraw evidence item.';
      setWithdrawError(msg);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Case State Machine Transition Handler
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase) return;

    // Validate reason and note for dismissed and escalated
    if ((targetStatus === 'dismissed' || targetStatus === 'escalated') && !transitionReason.trim()) {
      setTransitionError(`Transition to '${targetStatus}' requires a mandatory reason code.`);
      return;
    }
    if ((targetStatus === 'dismissed' || targetStatus === 'escalated') && !transitionNote.trim()) {
      setTransitionError(`Transition to '${targetStatus}' requires a mandatory explanatory note.`);
      return;
    }

    // Four-Eyes Policy Check for Critical Dismissal
    const isCritical = currentCase.priority === 'CRITICAL' || currentCase.risk_score >= 90;
    if (targetStatus === 'dismissed' && isCritical) {
      if (!approvedBy.trim()) {
        setTransitionError(
          "Four-Eyes Policy: Dismissing a CRITICAL priority case requires approval by a second analyst or compliance supervisor ('approved_by')."
        );
        return;
      }
      if (user?.user_id && approvedBy.trim().toLowerCase() === user.user_id.toLowerCase()) {
        setTransitionError("Four-Eyes Policy: Approver cannot be the same analyst requesting the dismissal.");
        return;
      }
    }

    setIsTransitioning(true);
    setTransitionError(null);
    try {
      const updatedCase = await casesApi.transitionCase(caseId, {
        to_status: targetStatus,
        reason_code: transitionReason.trim() || undefined,
        note: transitionNote.trim() || undefined,
        approved_by: approvedBy.trim() || undefined,
      });

      setWorkspace((prev) => (prev ? { ...prev, case: updatedCase } : prev));
      setIsTransitionModalOpen(false);
      setTransitionReason('');
      setTransitionNote('');
      setApprovedBy('');
      // Reload timeline and workspace to reflect transition events
      loadCaseWorkspace();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute state transition.';
      setTransitionError(msg);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Audit Trail Integrity Verification
  const handleVerifyAudit = async () => {
    setIsVerifyingAudit(true);
    try {
      const res = await casesApi.verifyAuditTrail(caseId);
      setAuditVerification(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audit verification check failed.';
      setAuditVerification({ verified: false, events_verified: 0, error: msg });
    } finally {
      setIsVerifyingAudit(false);
    }
  };

  // Download Evidence Pack ZIP
  const handleExportEvidencePack = async () => {
    setIsExportingPack(true);
    setPackExportNotice(null);
    try {
      const blob = await casesApi.downloadEvidencePack(caseId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evidence_pack_${caseId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPackExportNotice('Evidence pack ZIP exported successfully.');
      setTimeout(() => setPackExportNotice(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export evidence pack.';
      setPackExportNotice(`Export failed: ${msg}`);
    } finally {
      setIsExportingPack(false);
    }
  };

  // Helper to render narrative with interactive citations
  const renderInteractiveNarrative = (text: string) => {
    if (!text) return null;

    // Splits on citations like [E1], [E2]
    const parts = text.split(/(\[E\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/^\[(E\d+)\]$/);
      if (match) {
        const evId = match[1];
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleCitationClick(evId)}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-mono font-bold rounded bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 hover:border-accent transition-colors"
            title={`Click to view verified evidence item ${evId}`}
          >
            [{evId}]
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Case Investigation Docket: ${caseId}`}
          description="Hydrating forensic evidence store, state machine ledger, and investigator models..."
          breadcrumbs={[{ label: 'Cases', href: '/analyst/cases' }, { label: caseId }]}
        />
        <Card className="p-16">
          <LoadingState message="Hydrating case workspace from FinSure repository..." />
        </Card>
      </div>
    );
  }

  if (error || !currentCase) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Case Docket: ${caseId}`}
          breadcrumbs={[{ label: 'Cases', href: '/analyst/cases' }, { label: caseId }]}
        />
        <Card className="p-12">
          <ErrorState
            title="Failed to Load Case Docket"
            message={error || `Case ${caseId} does not exist in the repository.`}
            onRetry={loadCaseWorkspace}
          />
        </Card>
      </div>
    );
  }

  const hasGraphEvidence = evidenceList.some((e) => e.evidence_type === 'graph_link');
  const allowedTransitions = ALLOWED_TRANSITIONS[currentCase.status] || [];
  const isTerminal = currentCase.status === 'closed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Case Docket: ${currentCase.case_id}`}
        description="Forensic investigation workspace with immutable evidence ledger, FinSure Investigator copilot, and state adjudication."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Cases', href: '/analyst/cases' },
          { label: currentCase.case_id },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/analyst/cases">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Cases</span>
              </Button>
            </Link>

            {currentCase.incident_id && (
              <Link to={`/analyst/incidents/${currentCase.incident_id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  <span>Incident Dossier</span>
                </Button>
              </Link>
            )}

            {currentCase.incident_id && (
              <Link to={`/analyst/replay?incidentId=${currentCase.incident_id}`}>
                <Button variant="outline" size="sm">
                  <Play className="w-3.5 h-3.5 mr-1 text-accent" />
                  <span>Replay Timeline</span>
                </Button>
              </Link>
            )}

            {hasGraphEvidence && (
              <Link to="/analyst/rings">
                <Button variant="outline" size="sm">
                  <Share2 className="w-3.5 h-3.5 mr-1 text-accent-teal" />
                  <span>Mule Network</span>
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportEvidencePack}
              isLoading={isExportingPack}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Export Evidence Pack (ZIP)</span>
            </Button>
          </div>
        }
      />

      {packExportNotice && (
        <div
          className={`p-3 rounded text-xs font-mono flex items-center justify-between ${
            packExportNotice.includes('successfully')
              ? 'bg-risk-low/10 border border-risk-low/30 text-risk-low'
              : 'bg-risk-critical/10 border border-risk-critical/30 text-risk-critical'
          }`}
        >
          <span>{packExportNotice}</span>
          <button onClick={() => setPackExportNotice(null)} className="text-text-muted hover:text-text font-bold">
            ×
          </button>
        </div>
      )}

      {/* Top Docket Telemetry Bar */}
      <Card className="p-4 border-border bg-surface-muted/40">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-mono">
          <div>
            <span className="text-text-muted block text-[11px] uppercase">Transaction ID</span>
            <span className="text-text font-semibold truncate block mt-0.5" title={currentCase.transaction_id}>
              {currentCase.transaction_id}
            </span>
          </div>

          <div>
            <span className="text-text-muted block text-[11px] uppercase">User Profile ID</span>
            <span className="text-text font-semibold truncate block mt-0.5" title={currentCase.user_id}>
              {currentCase.user_id}
            </span>
          </div>

          <div>
            <span className="text-text-muted block text-[11px] uppercase">Calibrated Risk</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <RiskScore score={currentCase.risk_score} size="sm" showDetails={false} />
              <span className="font-semibold text-text">{currentCase.risk_score.toFixed(1)}/100</span>
            </div>
          </div>

          <div>
            <span className="text-text-muted block text-[11px] uppercase">Priority</span>
            <div className="mt-0.5">
              <StatusBadge status={currentCase.priority} />
            </div>
          </div>

          <div>
            <span className="text-text-muted block text-[11px] uppercase">Lifecycle State</span>
            <div className="mt-0.5">
              <StatusBadge status={currentCase.status} />
            </div>
          </div>

          <div>
            <span className="text-text-muted block text-[11px] uppercase">Assigned Analyst</span>
            <div className="flex items-center space-x-1 mt-0.5 text-text">
              <UserCheck className="w-3.5 h-3.5 text-text-muted" />
              <span>{currentCase.assigned_to || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {currentCase.customer_reported && (
          <div className="mt-3 pt-3 border-t border-border flex items-center space-x-2 text-xs text-risk-critical">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Customer "Not Me" Fast-Track Dispute: Transaction was contested directly by the account holder.
            </span>
          </div>
        )}
      </Card>

      {/* Main 2-Column Investigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Workspace Area (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-border pb-2">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t text-sm font-semibold transition-colors ${
                activeTab === 'evidence'
                  ? 'border-b-2 border-accent text-accent bg-accent/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-muted'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Evidence Binder ({evidenceList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('investigator')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t text-sm font-semibold transition-colors ${
                activeTab === 'investigator'
                  ? 'border-b-2 border-accent text-accent bg-accent/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-muted'
              }`}
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>FinSure Investigator</span>
              {activeInvestigation && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeInvestigation.validator_passed
                      ? 'bg-risk-low/15 text-risk-low'
                      : 'bg-risk-critical/15 text-risk-critical'
                  }`}
                >
                  {activeInvestigation.validator_passed ? 'Grounded' : 'Check'}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t text-sm font-semibold transition-colors ${
                activeTab === 'timeline'
                  ? 'border-b-2 border-accent text-accent bg-accent/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-muted'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Unified Timeline ({timelineEvents.length})</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: EVIDENCE BINDER                                         */}
          {/* ============================================================== */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {/* Evidence Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded border border-border">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-48">
                    <Input
                      placeholder="Search evidence..."
                      value={evidenceSearch}
                      onChange={(e) => setEvidenceSearch(e.target.value)}
                      className="py-1 text-xs"
                    />
                  </div>

                  <div className="w-36">
                    <Select
                      value={evidenceTypeFilter}
                      onChange={(e) => setEvidenceTypeFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Types' },
                        { value: 'transaction', label: 'Transaction' },
                        { value: 'device', label: 'Device' },
                        { value: 'location', label: 'Location' },
                        { value: 'graph_link', label: 'Graph Link' },
                        { value: 'shap_reason', label: 'SHAP Reason' },
                        { value: 'autoencoder_anomaly', label: 'Autoencoder' },
                        { value: 'user_profile', label: 'Profile' },
                        { value: 'external_file', label: 'External File' },
                        { value: 'analyst_note', label: 'Analyst Note' },
                        { value: 'customer_report', label: 'Customer Report' },
                      ]}
                      className="py-1 text-xs"
                    />
                  </div>

                  <div className="w-32">
                    <Select
                      value={evidenceStatusFilter}
                      onChange={(e) => setEvidenceStatusFilter(e.target.value as any)}
                      options={[
                        { value: 'all', label: 'All Status' },
                        { value: 'active', label: 'Active Only' },
                        { value: 'withdrawn', label: 'Withdrawn' },
                      ]}
                      className="py-1 text-xs"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddEvidenceModalOpen(true)}
                  className="shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1 text-accent" />
                  <span>Register Evidence</span>
                </Button>
              </div>

              {/* Evidence Inventory Cards */}
              {filteredEvidence.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-xs text-text-muted font-mono">
                    No evidence records matching the active filter.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEvidence.map((ev) => {
                    const isWithdrawn = !!ev.withdrawn_at;
                    const isHighlighted = highlightedEvidenceId === ev.evidence_id;

                    return (
                      <div
                        key={ev.evidence_id}
                        id={`evidence-card-${ev.evidence_id}`}
                        className={`p-4 rounded-lg border transition-all duration-300 ${
                          isHighlighted
                            ? 'border-accent ring-2 ring-accent/50 bg-accent/10 shadow-lg'
                            : isWithdrawn
                            ? 'border-risk-critical/30 bg-risk-critical/5 opacity-70'
                            : 'border-border bg-surface hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <EvidenceChip id={ev.evidence_id} type={ev.evidence_type} />
                            <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
                              {ev.evidence_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] font-mono text-text-muted">
                              Ref: {ev.source_ref}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isWithdrawn ? (
                              <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-risk-critical font-bold px-2 py-0.5 rounded bg-risk-critical/15 border border-risk-critical/30">
                                <UserX className="w-3 h-3" />
                                <span>WITHDRAWN</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-accent-teal">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Chain Verified</span>
                              </span>
                            )}

                            {!isWithdrawn && !isTerminal && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setWithdrawingEvidenceId(ev.evidence_id);
                                  setWithdrawReason('');
                                  setWithdrawError(null);
                                  setIsWithdrawModalOpen(true);
                                }}
                                className="text-[11px] px-2 py-0.5 h-auto text-text-muted hover:text-risk-critical"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Metadata Payload Grid */}
                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                          <div className="bg-surface-muted/60 rounded p-2.5 mb-2.5 border border-border/40 text-xs font-mono">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                              {Object.entries(ev.metadata).map(([k, v]) => (
                                <div key={k} className="flex justify-between py-0.5 border-b border-border/20 last:border-0">
                                  <span className="text-text-muted">{k}:</span>
                                  <span className="text-text font-medium truncate max-w-[200px]" title={String(v)}>
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Withdrawn Notice */}
                        {isWithdrawn && (
                          <div className="p-2 mb-2 rounded bg-risk-critical/10 border border-risk-critical/30 text-xs font-mono text-risk-critical flex items-start space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold">Withdrawal Justification:</span> {ev.withdraw_reason}
                              <div className="text-[10px] text-risk-critical/80 mt-0.5">
                                Withdrawn at {new Date(ev.withdrawn_at!).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cryptographic SHA-256 Hash */}
                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-text-muted">
                          <div className="flex items-center space-x-1.5">
                            <Hash className="w-3 h-3 text-text-muted/70" />
                            <span>SHA-256:</span>
                            <span className="truncate max-w-[260px] select-all" title={ev.content_hash}>
                              {ev.content_hash}
                            </span>
                          </div>
                          <span>Added: {new Date(ev.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: FINSURE INVESTIGATOR (ASSISTIVE COPILOT)               */}
          {/* ============================================================== */}
          {activeTab === 'investigator' && (
            <div className="space-y-6">
              {/* Guidance & Assistive Boundary Banner */}
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-accent">
                    <Sparkles className="w-4 h-4" />
                    <span>FinSure Investigator — Assistive Forensic Copilot</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                    Read-Only Sandbox Active
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  FinSure Investigator assists fraud analysts by executing read-only tools against recorded case evidence
                  and formulating citation-grounded forensic assessments. All statements must link to explicit evidence IDs
                  (e.g. <span className="font-mono text-accent">[E1]</span>). The copilot has zero authority to mutate case
                  records, alter risk scores, change thresholds, or confirm fraud verdicts.
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-muted">
                    Active Provider: <span className="text-text font-bold">Deterministic Template Adapter (v1.0)</span>
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunInvestigator}
                    isLoading={isInvestigating}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    <span>Run Investigation</span>
                  </Button>
                </div>
              </div>

              {investigationError && (
                <div className="p-3 bg-risk-critical/15 border border-risk-critical/40 rounded text-xs text-risk-critical font-mono">
                  Investigator error: {investigationError}
                </div>
              )}

              {/* Active Investigation Run Display */}
              {activeInvestigation ? (
                <div className="space-y-6">
                  {/* Validation Telemetry Ribbon */}
                  <Card className="p-4 border-border">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-text-muted block text-[11px]">GROUNDEDNESS</span>
                        <span className="text-base font-bold text-accent">
                          {(activeInvestigation.groundedness_score * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div>
                        <span className="text-text-muted block text-[11px]">CLAIM VALIDATION</span>
                        {activeInvestigation.validator_passed ? (
                          <span className="inline-flex items-center space-x-1 text-risk-low font-bold text-xs mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>100% Grounded</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-risk-critical font-bold text-xs mt-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Requires Review</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-text-muted block text-[11px]">LATENCY</span>
                        <span className="text-text font-bold mt-1 block">
                          {activeInvestigation.latency_ms.toFixed(1)} ms
                        </span>
                      </div>

                      <div>
                        <span className="text-text-muted block text-[11px]">PROMPT HASH</span>
                        <span className="text-text-muted truncate block mt-1 select-all" title={activeInvestigation.prompt_hash}>
                          {activeInvestigation.prompt_hash.substring(0, 12)}...
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* 1. Investigation Plan */}
                  <Card className="p-4 border-border space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold font-mono text-text uppercase tracking-wider border-b border-border pb-2">
                      <Layers className="w-3.5 h-3.5 text-accent" />
                      <span>Phase 1 — Investigation Plan</span>
                    </div>
                    <ol className="space-y-1.5 text-xs text-text-muted font-mono list-decimal list-inside">
                      {activeInvestigation.plan.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <span className="text-text">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>

                  {/* 2. Tool Calls Executed (Examine Phase) */}
                  <Card className="p-4 border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center space-x-2 text-xs font-bold font-mono text-text uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5 text-accent-teal" />
                        <span>Phase 2 — Read-Only Tool Execution ({activeInvestigation.tool_calls.length})</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">Prohibited Writes Blocked</span>
                    </div>
                    <div className="space-y-2">
                      {activeInvestigation.tool_calls.map((tc, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-surface-muted/60 border border-border/50 text-xs font-mono">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-accent">{tc.tool}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-risk-low/15 text-risk-low font-bold">
                              {tc.status || 'SUCCESS'}
                            </span>
                          </div>
                          {tc.args && Object.keys(tc.args).length > 0 && (
                            <div className="text-[11px] text-text-muted truncate">
                              Args: {JSON.stringify(tc.args)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* 3. Generated Forensic Narrative */}
                  <Card className="p-5 border-border space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center space-x-2 text-xs font-bold font-mono text-text uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-accent" />
                        <span>Phase 3 — Citation-Grounded Forensic Assessment</span>
                      </div>
                      <span className="text-[11px] font-mono text-accent">
                        Click citations [E#] to inspect evidence
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs text-text leading-relaxed font-sans bg-surface-muted/30 p-4 rounded border border-border/60">
                      {activeInvestigation.report_text.split('\n').map((line, idx) => {
                        if (!line.trim()) return <div key={idx} className="h-2" />;
                        if (line.startsWith('# ')) {
                          return (
                            <h3 key={idx} className="text-sm font-bold text-text font-mono border-b border-border/40 pb-1 mt-2">
                              {line.replace('# ', '')}
                            </h3>
                          );
                        }
                        if (line.startsWith('## ')) {
                          return (
                            <h4 key={idx} className="text-xs font-bold text-accent font-mono uppercase tracking-wider mt-3 mb-1">
                              {line.replace('## ', '')}
                            </h4>
                          );
                        }
                        return (
                          <p key={idx} className="leading-relaxed">
                            {renderInteractiveNarrative(line)}
                          </p>
                        );
                      })}
                    </div>
                  </Card>

                  {/* 4. Unsupported Claims Warning if applicable */}
                  {activeInvestigation.unsupported_claims && activeInvestigation.unsupported_claims.length > 0 && (
                    <Card className="p-4 border-risk-critical/40 bg-risk-critical/5 space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold font-mono text-risk-critical uppercase">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Unsupported Claims Detected by ClaimValidator</span>
                      </div>
                      <p className="text-xs text-risk-critical/90">
                        The following statements did not pass strict evidence citation validation and must not be treated as factual:
                      </p>
                      <ul className="space-y-1 text-xs font-mono text-risk-critical list-disc list-inside">
                        {activeInvestigation.unsupported_claims.map((claim, idx) => (
                          <li key={idx}>{claim}</li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* 5. Interactive Claim Validation Testing Sandbox */}
                  <Card className="p-4 border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center space-x-2 text-xs font-bold font-mono text-text uppercase">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                        <span>Claim Grounding Sandbox (Live API Test)</span>
                      </div>
                      <span className="text-[11px] font-mono text-text-muted">Authoritative Validator</span>
                    </div>

                    <form onSubmit={handleValidateCustomClaim} className="space-y-2">
                      <Input
                        placeholder="Test claim, e.g.: The transaction for ₹25,000 was flagged [E1]."
                        value={customClaimText}
                        onChange={(e) => setCustomClaimText(e.target.value)}
                        className="text-xs font-mono"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          isLoading={isValidatingClaim}
                          disabled={!customClaimText.trim()}
                        >
                          Validate Grounding
                        </Button>
                      </div>
                    </form>

                    {claimValidateError && (
                      <p className="text-xs font-mono text-risk-critical">{claimValidateError}</p>
                    )}

                    {customClaimResult && (
                      <div
                        className={`p-3 rounded text-xs font-mono border ${
                          customClaimResult.valid
                            ? 'bg-risk-low/10 border-risk-low/30 text-risk-low'
                            : 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 font-bold">
                          <span>
                            {customClaimResult.valid ? 'VALID — 100% EVIDENCE GROUNDED' : 'REJECTED — VALIDATION FAILED'}
                          </span>
                          <span>Score: {(customClaimResult.groundedness_score * 100).toFixed(1)}%</span>
                        </div>
                        {customClaimResult.rejection_reasons.length > 0 && (
                          <div className="space-y-1 mt-1 text-[11px]">
                            <span className="font-semibold block">Rejection Reasons:</span>
                            {customClaimResult.rejection_reasons.map((r, i) => (
                              <div key={i} className="pl-2 border-l border-risk-critical/40">
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}
                        {customClaimResult.cited_evidence_verified.length > 0 && (
                          <div className="mt-2 text-[11px] text-text-muted">
                            Verified citations: {customClaimResult.cited_evidence_verified.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              ) : (
                <Card className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-text">No Investigation Executed Yet</h4>
                  <p className="text-xs text-text-muted max-w-md mx-auto">
                    Click "Run Investigation" above to initiate the Plan → Examine → Report copilot workflow.
                    The investigator will examine recorded case evidence items and generate an evidence-grounded summary.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: UNIFIED CHRONOLOGICAL TIMELINE                          */}
          {/* ============================================================== */}
          {activeTab === 'timeline' && (
            <Card className="p-5 border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono">
                    Unified Chronological Docket Timeline
                  </h3>
                </div>
                <span className="text-xs font-mono text-text-muted">
                  {timelineEvents.length} Recorded Ledger Events
                </span>
              </div>

              {timelineEvents.length === 0 ? (
                <p className="text-xs font-mono text-text-muted italic py-6 text-center">
                  No chronological events recorded for this case docket.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-surface bg-accent" />
                      <div className="flex items-center space-x-2 text-xs font-mono">
                        <span className="font-bold text-text">
                          {(evt.event_type || evt.type || 'EVENT').toUpperCase()}
                        </span>
                        <span className="text-text-muted">
                          {new Date(evt.timestamp || evt.created_at || Date.now()).toLocaleString()}
                        </span>
                        <span className="text-text-muted">
                          · Actor: {evt.actor_id || evt.actor || 'system'} ({evt.actor_role || 'system'})
                        </span>
                      </div>
                      {evt.description && (
                        <p className="text-xs text-text-muted font-sans">{evt.description}</p>
                      )}
                      {evt.payload && (
                        <div className="p-2 rounded bg-surface-muted/60 text-[11px] font-mono text-text-muted border border-border/40 truncate">
                          {JSON.stringify(evt.payload)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Sidebar Area (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Case State Machine Adjudication Card */}
          <Card className="p-5 border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <AlertOctagon className="w-4 h-4 text-accent" />
                <span>State Adjudication</span>
              </h3>
              <StatusBadge status={currentCase.status} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-text-muted">Current State:</span>
                <span className="font-bold text-text uppercase">{currentCase.status}</span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-text-muted">Four-Eyes Status:</span>
                <span className={`font-semibold ${currentCase.priority === 'CRITICAL' ? 'text-risk-critical' : 'text-text-muted'}`}>
                  {currentCase.priority === 'CRITICAL' ? 'Mandatory for Dismissal' : 'Single Analyst'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-text-muted">Recorded Transitions:</span>
                <span className="font-semibold text-text">{transitionsList.length}</span>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  disabled={isTerminal || allowedTransitions.length === 0}
                  onClick={() => {
                    setTransitionError(null);
                    if (allowedTransitions.length > 0) {
                      setTargetStatus(allowedTransitions[0].value);
                      setIsTransitionModalOpen(true);
                    }
                  }}
                >
                  <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                  <span>{isTerminal ? 'Docket Closed (Terminal)' : 'Update Case State'}</span>
                </Button>
              </div>

              {allowedTransitions.length > 0 && (
                <div className="text-[11px] text-text-muted font-mono space-y-1">
                  <span className="block font-semibold">Permitted Transitions:</span>
                  <div className="flex flex-wrap gap-1">
                    {allowedTransitions.map((t) => (
                      <span key={t.value} className="px-1.5 py-0.5 rounded bg-surface-muted border border-border/60">
                        → {t.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 2. Cryptographic Audit Chain Integrity Card */}
          <Card className="p-5 border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                <span>Audit Ledger Integrity</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyAudit}
                isLoading={isVerifyingAudit}
                className="text-[11px] px-2 py-0.5 h-auto"
              >
                Verify
              </Button>
            </div>

            {auditVerification ? (
              <div
                className={`p-3 rounded text-xs font-mono border ${
                  auditVerification.verified
                    ? 'bg-risk-low/10 border-risk-low/30 text-risk-low'
                    : 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  {auditVerification.verified ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {auditVerification.verified ? 'Audit Chain Verified' : 'Integrity Verification Failed'}
                  </span>
                </div>
                <div className="text-[11px] text-text-muted">
                  Events verified: {auditVerification.events_verified}
                </div>
                {auditVerification.error && (
                  <div className="text-[11px] text-risk-critical mt-1">{auditVerification.error}</div>
                )}
              </div>
            ) : (
              <p className="text-xs font-mono text-text-muted italic">
                Click verify to validate the SHA-256 hash-chain of all docket events.
              </p>
            )}
          </Card>

          {/* 3. Analyst Case Notes Thread */}
          <Card className="p-5 border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Analyst Notes ({notesList.length})</span>
              </h3>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {notesList.length === 0 ? (
                <p className="text-xs font-mono text-text-muted italic py-3">No analyst notes logged yet.</p>
              ) : (
                notesList.map((n) => (
                  <div key={n.note_id} className="p-2.5 rounded bg-surface-muted/60 border border-border/40 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span className="font-bold text-accent">{n.author_id}</span>
                      <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-text font-sans leading-relaxed">{n.note_text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-border">
              <Input
                placeholder="Log internal case note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="text-xs"
              />
              <div className="flex justify-between items-center">
                {noteError && <p className="text-[11px] font-mono text-risk-critical">{noteError}</p>}
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  isLoading={isSubmittingNote}
                  disabled={!newNoteText.trim()}
                  className="ml-auto"
                >
                  <Send className="w-3 h-3 mr-1" />
                  <span>Add Note</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* 4. Similar Historical Cases (kNN) */}
          <Card className="p-5 border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span>Similar Historical Cases</span>
              </h3>
              <span className="text-[10px] font-mono text-text-muted">kNN (top 3)</span>
            </div>

            {similarCases.length === 0 ? (
              <p className="text-xs font-mono text-text-muted italic py-2">
                No historical embeddings matched within threshold.
              </p>
            ) : (
              <div className="space-y-2">
                {similarCases.map((sim, idx) => (
                  <Link
                    key={idx}
                    to={`/analyst/cases/${sim.case_id}`}
                    className="block p-2.5 rounded bg-surface-muted/60 border border-border/50 hover:border-accent/40 text-xs font-mono transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-accent truncate">{sim.case_id}</span>
                      <span className="text-[11px] text-text-muted">
                        Match: {((sim.similarity_score || 0.85) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span>Typology: {sim.scam_type || 'unauthorized'}</span>
                      <StatusBadge status={sim.status || 'closed'} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <p className="text-[11px] text-text-muted font-mono leading-relaxed pt-1 border-t border-border/40">
              Disclaimer: {similarDisclaimer || 'Statistical similarity across historical embeddings; not causal proof of fraud.'}
            </p>
          </Card>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CASE TRANSITION MODAL                                 */}
      {/* ============================================================== */}
      <Modal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        title="Execute Case State Transition"
        size="md"
      >
        <form onSubmit={handleTransitionSubmit} className="space-y-4">
          <div className="p-3 rounded bg-surface-muted border border-border text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-text-muted">Current State:</span>
              <span className="font-bold text-text uppercase">{currentCase.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Case Priority:</span>
              <span className="font-bold text-text">{currentCase.priority}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-text-muted block mb-1">
              Target State (Canonical Allowed)
            </label>
            <Select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as CaseStatus)}
              options={allowedTransitions.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>

          {(targetStatus === 'dismissed' || targetStatus === 'escalated') && (
            <>
              <div>
                <label className="text-xs font-mono uppercase text-text-muted block mb-1">
                  Reason Code (Mandatory)
                </label>
                <Input
                  placeholder="e.g.: verified_customer_consent, insufficient_evidence"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-text-muted block mb-1">
                  Explanatory Note (Mandatory)
                </label>
                <Input
                  placeholder="Detailed rationale for this transition..."
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Four-Eyes Co-Approval Input for Critical Priority Dismissal */}
          {targetStatus === 'dismissed' && (currentCase.priority === 'CRITICAL' || currentCase.risk_score >= 90) && (
            <div className="p-3 rounded bg-risk-critical/10 border border-risk-critical/30 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold font-mono text-risk-critical">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Four-Eyes Policy Co-Approval Required</span>
              </div>
              <p className="text-xs text-risk-critical/90">
                Dismissing a CRITICAL priority case requires approval from a second analyst or compliance officer.
              </p>
              <div>
                <label className="text-xs font-mono uppercase text-text-muted block mb-1">
                  Co-Approver User ID (Must differ from current analyst)
                </label>
                <Input
                  placeholder="e.g.: compliance_officer_01"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                />
              </div>
            </div>
          )}

          {targetStatus === 'confirmed_fraud' && (
            <div className="p-3 rounded bg-risk-high/10 border border-risk-high/30 text-xs text-risk-high space-y-1">
              <span className="font-bold block">Adjudication Notice:</span>
              <p>
                Confirming fraud is a high-impact action that finalizes legal adjudication.
                AI copilot findings are advisory; human analyst retains sole legal responsibility.
              </p>
            </div>
          )}

          {transitionError && (
            <p className="text-xs font-mono text-risk-critical">{transitionError}</p>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTransitionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isTransitioning}
            >
              Commit Transition
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: ADD EVIDENCE MODAL                                    */}
      {/* ============================================================== */}
      <Modal
        isOpen={isAddEvidenceModalOpen}
        onClose={() => setIsAddEvidenceModalOpen(false)}
        title="Register Case Evidence Record"
        size="md"
      >
        <form onSubmit={handleAddEvidence} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-text-muted block mb-1">
              Evidence Type
            </label>
            <Select
              value={newEvidenceType}
              onChange={(e) => setNewEvidenceType(e.target.value as EvidenceType)}
              options={[
                { value: 'external_file', label: 'External File / Document' },
                { value: 'analyst_note', label: 'Analyst Sworn Statement' },
                { value: 'device', label: 'Device Telemetry Record' },
                { value: 'location', label: 'Geo-Location Telemetry' },
                { value: 'customer_report', label: 'Customer Grievance Filing' },
                { value: 'transaction', label: 'Bank Rail Transaction Log' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-text-muted block mb-1">
              Source Reference
            </label>
            <Input
              placeholder="e.g.: FIU_IND_STR_2026_09, bank_statement_pdf"
              value={newSourceRef}
              onChange={(e) => setNewSourceRef(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-mono uppercase text-text-muted block mb-1">
                Metadata Key (Optional)
              </label>
              <Input
                placeholder="key"
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-text-muted block mb-1">
                Metadata Value
              </label>
              <Input
                placeholder="value"
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
              />
            </div>
          </div>

          {addEvidenceError && (
            <p className="text-xs font-mono text-risk-critical">{addEvidenceError}</p>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddEvidenceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isAddingEvidence}
            >
              Store Immutable Evidence
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: WITHDRAW EVIDENCE MODAL                               */}
      {/* ============================================================== */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title={`Withdraw Evidence Item: ${withdrawingEvidenceId}`}
        size="md"
      >
        <form onSubmit={handleWithdrawEvidence} className="space-y-4">
          <div className="p-3 rounded bg-surface-muted text-xs font-mono text-text-muted space-y-1">
            <span className="font-semibold text-text block">Zero-Deletion Invariant:</span>
            <p>
              Evidence items are immutable and are never deleted from the case store.
              Withdrawing marks the item as withdrawn with a recorded timestamp and justification reason,
              removing it from the active investigator citation pool.
            </p>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-text-muted block mb-1">
              Mandatory Withdrawal Reason (min 3 chars)
            </label>
            <Input
              placeholder="e.g.: Duplicate filing, superseded by official bank statement"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
            />
          </div>

          {withdrawError && (
            <p className="text-xs font-mono text-risk-critical">{withdrawError}</p>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWithdrawModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isWithdrawing}
            >
              Withdraw Evidence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default AnalystCaseDetailPage;
