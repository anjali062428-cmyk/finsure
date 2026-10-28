"""
FinSure Incident Management & Response Domain Models
Defines domain entities for incidents, append-only event logs, state transitions,
analyst feedback, and report integrity records.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class IncidentStatus(str, Enum):
    NEW = "new"
    UNDER_INVESTIGATION = "under_investigation"
    ESCALATED = "escalated"
    CONFIRMED_FRAUD = "confirmed_fraud"
    DISMISSED = "dismissed"
    CLOSED = "closed"


class IncidentPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Incident(BaseModel):
    incident_id: str
    transaction_id: str
    user_id: str
    risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_probability: float = Field(..., ge=0.0, le=1.0)
    risk_band: str
    decision: str
    status: IncidentStatus = IncidentStatus.NEW
    priority: IncidentPriority = IncidentPriority.MEDIUM
    scam_type: Optional[str] = None
    assigned_to: Optional[str] = None
    sla_due_at: Optional[str] = None
    scoring_snapshot: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str
    closed_at: Optional[str] = None
    model_version: str = "v1.0.0"
    threshold_version: str = "v1.0.0"


class IncidentEvent(BaseModel):
    event_id: str
    incident_id: str
    event_type: str
    actor_id: str  # user_id, analyst_id, or "system"
    actor_role: Optional[str] = "system"
    timestamp: str
    event_payload: Dict[str, Any] = Field(default_factory=dict)
    previous_hash: str
    record_hash: str


class IncidentNote(BaseModel):
    note_id: str
    incident_id: str
    author_id: str
    author_role: str
    note_text: str
    created_at: str


class AnalystFeedback(BaseModel):
    feedback_id: str
    incident_id: str
    analyst_id: str
    verdict: str  # confirmed_fraud, dismissed, escalated, false_positive, scam_type_correction
    scam_type_corrected: Optional[str] = None
    notes: str
    evidence_references: List[str] = Field(default_factory=list)
    created_at: str


class IncidentReportRecord(BaseModel):
    report_id: str
    incident_id: str
    report_type: str  # customer, analyst
    file_path: Optional[str] = None
    content_hash: str  # SHA-256 of the generated PDF bytes
    qr_payload: str
    generated_at: str
    generator_role: str


class SimilarCaseResult(BaseModel):
    similar_incident_id: str
    transaction_id: str
    similarity_score: float
    risk_score: float
    scam_type: Optional[str]
    status: str
    matching_features: List[str]
    attribution_disclaimer: str = (
        "Statistical similarity (Euclidean/Cosine on feature embeddings). "
        "Does not establish shared criminal intent or syndicate association."
    )
