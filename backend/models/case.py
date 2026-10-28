"""
FinSure Case Investigation Domain Models
Defines domain entities for Canonical Cases, Evidence Store, Case State Machine Transitions,
Notes, Investigation Runs, and Claim Validation.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CaseStatus(str, Enum):
    NEW = "new"
    UNDER_INVESTIGATION = "under_investigation"
    ESCALATED = "escalated"
    CONFIRMED_FRAUD = "confirmed_fraud"
    DISMISSED = "dismissed"
    CLOSED = "closed"


class CasePriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class EvidenceType(str, Enum):
    TRANSACTION = "transaction"
    DEVICE = "device"
    LOCATION = "location"
    GRAPH_LINK = "graph_link"
    SHAP_REASON = "shap_reason"
    AUTOENCODER_ANOMALY = "autoencoder_anomaly"
    USER_PROFILE = "user_profile"
    EXTERNAL_FILE = "external_file"
    ANALYST_NOTE = "analyst_note"
    CUSTOMER_REPORT = "customer_report"


class Case(BaseModel):
    case_id: str
    incident_id: Optional[str] = None
    alert_id: Optional[str] = None
    transaction_id: str
    user_id: str
    status: CaseStatus = CaseStatus.NEW
    priority: CasePriority = CasePriority.MEDIUM
    risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_band: str
    decision: str
    scam_type: Optional[str] = None
    assigned_to: Optional[str] = None
    sla_due_at: Optional[str] = None
    customer_reported: bool = False
    opened_at: str
    updated_at: str
    closed_at: Optional[str] = None
    closed_by: Optional[str] = None
    disposition: Optional[str] = None
    disposition_reason: Optional[str] = None
    disposition_note: Optional[str] = None
    created_by: Optional[str] = None
    evidence_count: int = 0


class CaseEvidence(BaseModel):
    evidence_id: str
    case_id: str
    evidence_type: EvidenceType
    source_ref: str
    added_by: str
    content_hash: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    withdrawn_at: Optional[str] = None
    withdraw_reason: Optional[str] = None
    created_at: str


class CaseTransition(BaseModel):
    transition_id: str
    case_id: str
    from_status: CaseStatus
    to_status: CaseStatus
    actor_id: str
    reason_code: Optional[str] = None
    note: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: str


class CaseNote(BaseModel):
    note_id: str
    case_id: str
    author_id: str
    author_role: str
    note_text: str
    created_at: str


class InvestigationRun(BaseModel):
    run_id: str
    case_id: str
    plan: List[str]
    tool_calls: List[Dict[str, Any]]
    findings: Dict[str, Any]
    report_text: str
    provider: str = "template"
    model: str = "deterministic-v1"
    prompt_hash: str
    validator_passed: bool
    groundedness_score: float
    unsupported_claims: List[str] = Field(default_factory=list)
    latency_ms: float
    created_at: str


class ClaimValidationRequest(BaseModel):
    claim_text: str
    evidence_ids: List[str] = Field(default_factory=list)


class ClaimValidationResult(BaseModel):
    valid: bool
    groundedness_score: float
    supported_claims: List[str] = Field(default_factory=list)
    unsupported_claims: List[str] = Field(default_factory=list)
    rejection_reasons: List[str] = Field(default_factory=list)
    cited_evidence_verified: List[str] = Field(default_factory=list)
