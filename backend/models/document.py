"""
FinSure Financial Document Verification Platform Domain Models
Defines canonical document entities, validation statuses, forensic indicator records,
and authorized transaction matching structures.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class DocumentType(str, Enum):
    """Canonical supported financial document types."""
    BANK_STATEMENT = "bank_statement"
    INVOICE = "invoice"
    PAYMENT_RECEIPT = "payment_receipt"
    OTHER = "other"


class DocumentStatus(str, Enum):
    """Lifecycle stages of financial document verification."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PARSED = "parsed"
    ANALYZED = "analyzed"
    FLAGGED = "flagged"
    VERIFIED = "verified"
    FAILED = "failed"


class VerificationVerdict(str, Enum):
    """
    Explainable document verification verdict categories.
    NOTE: In accordance with core safety rules:
    - Anomaly never equals automated "confirmed fraud".
    - "Authentic" is NEVER claimed or certified.
    - Receipts represent 'payment claims', not settled transactions.
    """
    NO_SIGNIFICANT_ANOMALIES = "no_significant_anomalies"
    REVIEW_RECOMMENDED = "review_recommended"
    HIGH_RISK_INDICATORS = "high_risk_indicators"
    VERIFICATION_INCOMPLETE = "verification_incomplete"


class ReviewStatus(str, Enum):
    """
    Human analyst governance review flow:
    suspected -> reviewed -> confirmed (strictly human-confirmed only).
    """
    SUSPECTED = "suspected"
    REVIEWED = "reviewed"
    CONFIRMED = "confirmed"


class DocumentRecord(BaseModel):
    """Canonical persistent metadata entity for an uploaded financial document."""
    document_id: str
    user_id: str
    filename: str
    file_size: int
    mime_type: str
    document_type: DocumentType
    sha256_hash: str
    storage_path: str
    status: DocumentStatus = DocumentStatus.UPLOADED
    verdict: Optional[VerificationVerdict] = None
    review_status: ReviewStatus = ReviewStatus.SUSPECTED
    claim_label: str = "general_document"
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class DocumentAuditEntry(BaseModel):
    """Append-only audit log entry for document lifecycle events."""
    audit_id: str
    document_id: str
    user_id: str
    action: str  # e.g., 'upload', 'view', 'download', 'duplicate_detected', 'status_change'
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class DocumentUploadResponse(BaseModel):
    """Structured response returned immediately upon successful document upload."""
    document_id: str
    user_id: str
    filename: str
    file_size: int
    mime_type: str
    document_type: DocumentType
    sha256_hash: str
    status: DocumentStatus
    claim_label: str
    is_duplicate: bool
    duplicate_of: Optional[str] = None
    created_at: str


class AuthorizedTransaction(BaseModel):
    """
    Authorized bank transaction record in the trusted ledger.
    Used by the Record Matching Engine to compare extracted document data with trusted feeds.
    """
    record_id: str
    reference_id: str  # UTR, RRN, or Invoice number
    account_number: Optional[str] = None
    payer_vpa: Optional[str] = None
    payee_vpa: Optional[str] = None
    amount: float
    currency: str = "INR"
    transaction_date: str
    is_synthetic: bool = False
    data_source: str = "manual_import"  # 'synthetic_seed', 'bank_feed', 'csv_upload'
    notes: Optional[str] = None
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
