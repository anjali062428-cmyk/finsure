"""
FinSure Incident & Alert API Schemas
Pydantic models for incident lifecycle, alert triage queue, notes, feedback, and audit queries.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class IncidentCreateRequest(BaseModel):
    transaction_id: str = Field(..., description="ID of the scored transaction")
    user_id: str = Field(..., description="Account holder ID")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score on 0-100 scale")
    risk_probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated fraud probability")
    risk_band: str = Field(..., description="Operational risk band (e.g. HIGH_RISK, CRITICAL_RISK)")
    decision: str = Field(..., description="Enforced decision (approve, flag, step_up, block)")
    scam_type: Optional[str] = Field(None, description="Predicted scam category")
    scoring_snapshot: Optional[Dict[str, Any]] = Field(None, description="Exact inference snapshot")


class IncidentTransitionRequest(BaseModel):
    new_status: str = Field(..., description="Target status: under_investigation, escalated, confirmed_fraud, dismissed, closed")
    reason: Optional[str] = Field(None, description="Mandatory reason for dismissal or escalation")
    notes: Optional[str] = Field(None, description="Optional investigative context")
    assigned_to: Optional[str] = Field(None, description="Analyst to assign case to")


class IncidentNoteRequest(BaseModel):
    note_text: str = Field(..., min_length=1, description="Investigator note body")


class AnalystFeedbackRequest(BaseModel):
    verdict: str = Field(..., description="Feedback verdict: confirmed_fraud, dismissed, escalated, false_positive, scam_type_correction")
    notes: str = Field(..., min_length=1, description="Mandatory analyst rationale")
    scam_type_corrected: Optional[str] = Field(None, description="Corrected scam type if misclassified")
    evidence_references: Optional[List[str]] = Field(default_factory=list, description="Referenced evidence or artifact IDs")


class ReportVerifyRequest(BaseModel):
    candidate_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 hex digest of candidate PDF")
    report_type: str = Field("customer", description="Report type: 'customer' or 'analyst'")


class IncidentResponse(BaseModel):
    incident_id: str
    transaction_id: str
    user_id: str
    risk_score: float
    risk_probability: float
    risk_band: str
    decision: str
    status: str
    priority: str
    scam_type: Optional[str]
    assigned_to: Optional[str]
    sla_due_at: Optional[str]
    created_at: str
    updated_at: str


class AlertQueueItem(BaseModel):
    incident_id: str
    transaction_id: str
    user_id: str
    priority: str
    risk_score: float
    status: str
    scam_type: Optional[str]
    created_at: str
    sla_due_at: Optional[str]
    assigned_to: Optional[str]


class AuditVerifyResponse(BaseModel):
    incident_id: str
    chain_valid: bool
    message: str
    verified_event_count: int
    events: List[Dict[str, Any]]
