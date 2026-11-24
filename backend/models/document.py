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


class ExtractedField(BaseModel):
    """Single extracted key-value field with provenance and confidence."""
    field_name: str
    value: Any
    confidence: float = 1.0  # 1.0 for digital PDF text; <=0.95 for OCR
    source: str = "digital_pdf"  # 'digital_pdf' or 'ocr'
    review_required: bool = False
    bounding_box: Optional[List[float]] = None  # [x0, y0, x1, y1]


class TransactionRow(BaseModel):
    """Structured transaction line extracted from a bank statement."""
    row_index: int
    date: str
    description: str
    reference_id: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0
    balance: float = 0.0
    source: str = "digital_pdf"
    review_required: bool = False


class InvoiceLineItem(BaseModel):
    """Structured line item extracted from an invoice or bill."""
    item_index: int
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    total_amount: float = 0.0
    source: str = "digital_pdf"


class BankStatementData(BaseModel):
    """Canonical extracted schema for bank statements."""
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    statement_period: Optional[str] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    currency: str = "INR"
    transactions: List[TransactionRow] = Field(default_factory=list)
    total_debits: float = 0.0
    total_credits: float = 0.0
    calculated_closing_balance: Optional[float] = None


class InvoiceData(BaseModel):
    """Canonical extracted schema for invoices and bills."""
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    customer_name: Optional[str] = None
    line_items: List[InvoiceLineItem] = Field(default_factory=list)
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    grand_total: Optional[float] = None
    calculated_total: Optional[float] = None


class PaymentReceiptData(BaseModel):
    """
    Canonical extracted schema for payment receipts.
    Receipts are strictly labeled 'payment_claim', never 'settled_payment'.
    """
    claim_label: str = "payment_claim"
    receipt_number: Optional[str] = None
    reference_id: Optional[str] = None  # UTR, RRN, or UPI Ref
    transaction_date: Optional[str] = None
    payer_name: Optional[str] = None
    payee_name: Optional[str] = None
    claimed_amount: Optional[float] = None
    currency: str = "INR"
    payment_mode: Optional[str] = None  # UPI, IMPS, NEFT, CARD, CASH


class ConsistencyCheck(BaseModel):
    """Rule-based financial verification check result."""
    check_id: str
    check_name: str
    passed: bool
    severity: str  # 'info', 'warning', 'high_risk'
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class DocumentFinding(BaseModel):
    """Explainable finding or indicator generated during verification."""
    finding_id: str
    title: str
    description: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    evidence_ids: List[str] = Field(default_factory=list)
    human_review_note: str = "Requires human analyst verification before final decision."


class DocumentExtractionResult(BaseModel):
    """Complete structured extraction and forensic verification report."""
    document_id: str
    document_type: DocumentType
    status: DocumentStatus
    verdict: VerificationVerdict
    review_status: ReviewStatus
    claim_label: str
    is_ocr_applied: bool = False
    ocr_confidence_avg: Optional[float] = None
    execution_time_seconds: float
    fields: Dict[str, Any] = Field(default_factory=dict)
    consistency_checks: List[ConsistencyCheck] = Field(default_factory=list)
    findings: List[DocumentFinding] = Field(default_factory=list)
    matched_ledger_records: List[Dict[str, Any]] = Field(default_factory=list)
    raw_text_preview: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ReviewStatusUpdateRequest(BaseModel):
    """Request payload for updating analyst review status."""
    review_status: ReviewStatus
    notes: Optional[str] = None


class CreateCaseFromDocRequest(BaseModel):
    """Request payload to escalate a document with anomalies to a Case Docket."""
    priority: str = "HIGH"  # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    initial_notes: Optional[str] = None
