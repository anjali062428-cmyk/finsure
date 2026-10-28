"""
FinSure Case Investigation API Schemas
Pydantic validation schemas for case requests, transitions, evidence, and investigation endpoints.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from backend.models.case import (
    CaseStatus, CasePriority, EvidenceType,
    Case, CaseEvidence, CaseTransition, CaseNote, InvestigationRun,
    ClaimValidationResult
)


class CaseCreateRequest(BaseModel):
    incident_id: Optional[str] = None
    transaction_id: Optional[str] = None
    user_id: Optional[str] = None
    risk_score: Optional[float] = None
    priority: Optional[str] = "MEDIUM"
    decision: Optional[str] = "flag"
    customer_reported: bool = False


class CaseTransitionRequest(BaseModel):
    to_status: CaseStatus
    reason_code: Optional[str] = None
    note: Optional[str] = None
    approved_by: Optional[str] = None


class CaseEvidenceAddRequest(BaseModel):
    evidence_type: EvidenceType
    source_ref: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CaseEvidenceWithdrawRequest(BaseModel):
    withdraw_reason: str = Field(..., min_length=3)


class CaseNoteRequest(BaseModel):
    note_text: str = Field(..., min_length=1)


class InvestigateRequest(BaseModel):
    provider: str = "template"


class ClaimValidationApiRequest(BaseModel):
    claim_text: str = Field(..., min_length=1)
    evidence_ids: List[str] = Field(default_factory=list)


class CaseWorkspaceResponse(BaseModel):
    case: Case
    evidence: List[CaseEvidence]
    transitions: List[CaseTransition]
    notes: List[CaseNote]
    latest_investigation: Optional[InvestigationRun] = None
