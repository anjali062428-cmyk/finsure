"""
FinSure Financial Document Service
Handles secure document ingestion, content-based MIME & magic byte verification,
SHA-256 deduplication, content-addressable storage, IDOR access controls,
and the trusted authorized transaction ledger.
"""

import os
import shutil
import hashlib
import uuid
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import csv

from backend.models.document import (
    DocumentRecord, DocumentType, DocumentStatus,
    VerificationVerdict, ReviewStatus, DocumentAuditEntry,
    DocumentUploadResponse, AuthorizedTransaction,
    DocumentExtractionResult
)
from backend.repositories.document_repo import DocumentRepository
from backend.models.auth import User
from backend.core.config import doc_config
from backend.services.parsing_service import ParsingService

logger = logging.getLogger("finsure.document_service")

# 25 MB document upload ceiling
MAX_DOCUMENT_SIZE = 25 * 1024 * 1024

# Magic byte signatures
MAGIC_SIGNATURES = {
    "pdf": [b"%PDF-"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpeg": [b"\xff\xd8\xff"],
    "jpg": [b"\xff\xd8\xff"],
    "tiff": [b"II*\x00", b"MM\x00*"],
    "tif": [b"II*\x00", b"MM\x00*"],
}

MIME_MAPPINGS = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "tiff": "image/tiff",
    "tif": "image/tiff",
}


class DocumentService:
    """Manages document validation, storage, deduplication, and IDOR-safe access."""

    def __init__(
        self,
        repo: DocumentRepository,
        storage_dir: Optional[str] = None,
        parsing_service: Optional[ParsingService] = None
    ):
        self.repo = repo
        self.storage_dir = storage_dir or doc_config.STORAGE_DIR
        os.makedirs(os.path.abspath(self.storage_dir), exist_ok=True)
        self.parsing_service = parsing_service or ParsingService(self.repo)

    # ------------------------------------------------------------------
    # Validation Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def detect_file_signature(content: bytes, claimed_filename: str) -> Tuple[str, str]:
        """
        Validates content magic bytes against supported document formats.
        Returns (extension, mime_type) if valid; raises ValueError if invalid/tampered.
        """
        if not content:
            raise ValueError("Uploaded file is empty (0 bytes).")

        if len(content) > MAX_DOCUMENT_SIZE:
            raise ValueError(
                f"File size ({len(content)} bytes) exceeds the maximum allowed limit of {MAX_DOCUMENT_SIZE} bytes (25 MB)."
            )

        # Detect matching magic signature
        matched_ext = None
        for ext, signatures in MAGIC_SIGNATURES.items():
            for sig in signatures:
                if content.startswith(sig):
                    matched_ext = ext
                    break
            if matched_ext:
                break

        if not matched_ext:
            raise ValueError(
                "Unsupported file signature or corrupted magic bytes. "
                "Supported formats are PDF, PNG, JPG/JPEG, and TIFF."
            )

        # Check claimed extension consistency
        claimed_ext = claimed_filename.rsplit(".", 1)[-1].lower() if "." in claimed_filename else ""
        if claimed_ext:
            # Map jpg -> jpeg equivalence
            norm_claimed = "jpeg" if claimed_ext == "jpg" else claimed_ext
            norm_matched = "jpeg" if matched_ext in ("jpg", "jpeg") else matched_ext
            norm_claimed = "tiff" if norm_claimed == "tif" else norm_claimed
            norm_matched = "tiff" if norm_matched in ("tif", "tiff") else norm_matched

            if norm_claimed != norm_matched:
                raise ValueError(
                    f"MIME/Magic-bytes mismatch: claimed extension '.{claimed_ext}' does not match detected content signature ({norm_matched})."
                )

        mime = MIME_MAPPINGS.get(matched_ext, "application/octet-stream")
        return matched_ext, mime

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """Computes 64-character SHA-256 hex checksum."""
        return hashlib.sha256(content).hexdigest()

    # ------------------------------------------------------------------
    # OCR Capability Inspection
    # ------------------------------------------------------------------

    @staticmethod
    def check_ocr_status() -> Dict[str, Any]:
        """
        Checks whether Tesseract OCR executable is available on the system.
        Fails gracefully without throwing exceptions.
        """
        tesseract_cmd = doc_config.get_tesseract_cmd()
        if tesseract_cmd:
            return {
                "available": True,
                "executable": tesseract_cmd,
                "status": "Ready for scanned document OCR extraction."
            }

        return {
            "available": False,
            "executable": None,
            "status": "OCR engine binary (tesseract.exe) is unavailable on this host.",
            "fallback_note": "Digital PDF text/table extraction (pypdf/pdfplumber) is operational. Scanned images will return 'Verification incomplete'."
        }

    # ------------------------------------------------------------------
    # Document Ingestion & Storage
    # ------------------------------------------------------------------

    def upload_document(
        self,
        user: User,
        filename: str,
        content: bytes,
        document_type: DocumentType,
        notes: Optional[str] = None
    ) -> DocumentUploadResponse:
        """
        Ingests a financial document:
        1. Validates magic bytes & size (<= 25 MB)
        2. Computes content SHA-256
        3. Writes to content-addressable storage (data/uploads/<hash>.<ext>)
        4. Detects duplicates (links to original)
        5. Saves metadata & logs audit entry
        """
        # Clean filename
        safe_filename = os.path.basename(filename).replace(" ", "_")
        ext, mime_type = self.detect_file_signature(content, safe_filename)
        sha256 = self.compute_sha256(content)

        # Content-addressable filename on disk
        stored_filename = f"{sha256}.{ext}"
        storage_rel_path = os.path.join(self.storage_dir, stored_filename).replace("\\", "/")
        storage_abs_path = os.path.abspath(storage_rel_path)

        # Write to disk if not already present
        if not os.path.exists(storage_abs_path):
            with open(storage_abs_path, "wb") as f:
                f.write(content)

        # Check for duplicates across stored records
        existing_doc = self.repo.find_by_hash(sha256)
        is_duplicate = existing_doc is not None
        duplicate_of = existing_doc.document_id if existing_doc else None

        # Determine claim label (Receipts are strictly payment claims, never settled payments)
        if document_type == DocumentType.PAYMENT_RECEIPT:
            claim_label = "payment_claim"
        elif document_type == DocumentType.BANK_STATEMENT:
            claim_label = "statement_record"
        elif document_type == DocumentType.INVOICE:
            claim_label = "invoice_claim"
        else:
            claim_label = "general_document"

        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        doc_record = DocumentRecord(
            document_id=doc_id,
            user_id=user.user_id,
            filename=safe_filename,
            file_size=len(content),
            mime_type=mime_type,
            document_type=document_type,
            sha256_hash=sha256,
            storage_path=storage_rel_path,
            status=DocumentStatus.UPLOADED,
            verdict=None,
            review_status=ReviewStatus.SUSPECTED,
            claim_label=claim_label,
            is_duplicate=is_duplicate,
            duplicate_of=duplicate_of,
            metadata={
                "notes": notes,
                "detected_extension": ext,
                "uploader_role": user.role,
                "storage_backend": "local_content_addressed"
            },
            created_at=now_iso,
            updated_at=now_iso
        )

        saved = self.repo.save_document(doc_record)

        # Record immutable audit log
        audit_entry = DocumentAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            document_id=doc_id,
            user_id=user.user_id,
            action="upload",
            details={
                "filename": safe_filename,
                "sha256": sha256,
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of,
                "document_type": document_type.value,
                "size_bytes": len(content)
            },
            timestamp=now_iso
        )
        self.repo.record_audit(audit_entry)

        if is_duplicate:
            self.repo.record_audit(DocumentAuditEntry(
                audit_id=f"aud_{uuid.uuid4().hex[:12]}",
                document_id=doc_id,
                user_id=user.user_id,
                action="duplicate_detected",
                details={
                    "sha256": sha256,
                    "original_document_id": duplicate_of
                },
                timestamp=now_iso
            ))

        return DocumentUploadResponse(
            document_id=saved.document_id,
            user_id=saved.user_id,
            filename=saved.filename,
            file_size=saved.file_size,
            mime_type=saved.mime_type,
            document_type=saved.document_type,
            sha256_hash=saved.sha256_hash,
            status=saved.status,
            claim_label=saved.claim_label,
            is_duplicate=saved.is_duplicate,
            duplicate_of=saved.duplicate_of,
            created_at=saved.created_at
        )

    # ------------------------------------------------------------------
    # IDOR-Safe Document Retrieval & File Serving
    # ------------------------------------------------------------------

    def get_document(self, document_id: str, requesting_user: User) -> DocumentRecord:
        """
        Retrieves document metadata with strict IDOR access enforcement:
        - Customers can ONLY view documents they own.
        - Analysts, Compliance Officers, and Admins can view any document.
        """
        doc = self.repo.get_document(document_id)
        if not doc:
            raise LookupError(f"Document with ID '{document_id}' not found.")

        # IDOR Guard
        if requesting_user.role == "customer" and doc.user_id != requesting_user.user_id:
            logger.warning(
                f"IDOR violation attempt: Customer '{requesting_user.user_id}' requested document '{document_id}' belonging to '{doc.user_id}'"
            )
            raise PermissionError("Access forbidden: You do not have permission to view this document.")

        # Log view audit event
        self.repo.record_audit(DocumentAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            document_id=document_id,
            user_id=requesting_user.user_id,
            action="view",
            details={"requester_role": requesting_user.role},
            timestamp=datetime.now(timezone.utc).isoformat()
        ))

        return doc

    def list_documents(
        self,
        requesting_user: User,
        document_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[DocumentRecord]:
        """
        Lists documents with automatic role-based scoping:
        - Customers: only their own documents (enforced at repository level).
        - Analysts/Compliance/Admin: all documents.
        """
        user_scope = requesting_user.user_id if requesting_user.role == "customer" else None
        return self.repo.list_documents(
            user_id=user_scope,
            document_type=document_type,
            status=status,
            limit=limit,
            offset=offset
        )

    def get_document_file(self, document_id: str, requesting_user: User) -> Tuple[str, str, str]:
        """
        Retrieves local absolute file path for secure binary streaming.
        Enforces IDOR check: raises PermissionError if customer attempts to access other's file.
        Returns (absolute_file_path, filename, mime_type).
        """
        doc = self.get_document(document_id, requesting_user)

        abs_path = os.path.abspath(doc.storage_path)
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Underlying document file is missing on storage: {doc.storage_path}")

        # Log download audit event
        self.repo.record_audit(DocumentAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            document_id=document_id,
            user_id=requesting_user.user_id,
            action="download",
            details={
                "requester_role": requesting_user.role,
                "file_path": doc.storage_path
            },
            timestamp=datetime.now(timezone.utc).isoformat()
        ))

        return abs_path, doc.filename, doc.mime_type

    # ------------------------------------------------------------------
    # Authorized Transaction Ledger (Record Matching Data Store)
    # ------------------------------------------------------------------

    def seed_synthetic_transactions(self, csv_path: str = "data/processed/synthetic/transactions.csv") -> int:
        """
        Seeds the authorized ledger from existing synthetic transactions.
        Marks every record explicitly as `is_synthetic = True` and data_source = 'synthetic_seed'.
        """
        if not os.path.exists(csv_path):
            logger.info(f"Synthetic transaction file not found at {csv_path}; skipping seed.")
            return 0

        seeded_records: List[AuthorizedTransaction] = []
        try:
            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    if idx >= 500:  # Seed first 500 records for fast baseline matching
                        break
                    
                    tx_id = row.get("transaction_id", f"txn_{idx}")
                    amount = float(row.get("amount", 0.0))
                    tx_date = row.get("timestamp", datetime.now(timezone.utc).isoformat())
                    payer = row.get("sender_vpa") or row.get("user_id")
                    payee = row.get("payee_vpa") or row.get("beneficiary_id")
                    ref_id = row.get("rrn") or row.get("transaction_id") or f"UTR_{idx}"

                    seeded_records.append(AuthorizedTransaction(
                        record_id=f"auth_{tx_id}",
                        reference_id=ref_id,
                        account_number=row.get("account_number"),
                        payer_vpa=payer,
                        payee_vpa=payee,
                        amount=amount,
                        currency="INR",
                        transaction_date=tx_date,
                        is_synthetic=True,
                        data_source="synthetic_seed",
                        notes="Imported from FinSure baseline synthetic UPI dataset",
                        created_at=datetime.now(timezone.utc).isoformat()
                    ))

            count = self.repo.batch_save_authorized_transactions(seeded_records)
            logger.info(f"Successfully seeded {count} synthetic authorized transactions into ledger.")
            return count
        except Exception as e:
            logger.error(f"Error seeding synthetic transactions: {e}")
            return 0

    def import_authorized_records_csv(self, user: User, csv_content: str) -> int:
        """
        Allows fraud analysts / compliance officers / admins to upload authorized CSV records.
        Records audit trail of who performed the import.
        """
        if user.role not in ["fraud_analyst", "analyst", "compliance_officer", "admin"]:
            raise PermissionError("Forbidden: Only analysts or administrators can import authorized records.")

        records: List[AuthorizedTransaction] = []
        lines = csv_content.strip().splitlines()
        reader = csv.DictReader(lines)
        now_iso = datetime.now(timezone.utc).isoformat()

        for idx, row in enumerate(reader):
            ref = row.get("reference_id") or row.get("reference") or row.get("utr") or f"REF_{idx}_{uuid.uuid4().hex[:6]}"
            amount_val = float(row.get("amount", 0.0))
            dt = row.get("transaction_date") or row.get("date") or now_iso
            
            records.append(AuthorizedTransaction(
                record_id=f"auth_{uuid.uuid4().hex[:12]}",
                reference_id=ref,
                account_number=row.get("account_number"),
                payer_vpa=row.get("payer_vpa"),
                payee_vpa=row.get("payee_vpa"),
                amount=amount_val,
                currency=row.get("currency", "INR"),
                transaction_date=dt,
                is_synthetic=False,
                data_source="analyst_csv_upload",
                notes=f"Uploaded by {user.user_id} ({user.role})",
                created_at=now_iso
            ))

        count = self.repo.batch_save_authorized_transactions(records)
        logger.info(f"Analyst {user.user_id} imported {count} authorized transactions.")
        return count

    # ------------------------------------------------------------------
    # Parsing, Consistency Checks & Verification Orchestration
    # ------------------------------------------------------------------

    def parse_and_verify(self, document_id: str, requesting_user: User) -> DocumentExtractionResult:
        """
        Executes full digital/OCR parsing, runs financial consistency rules,
        matches with authorized ledger, and updates document verdict.
        IDOR protected: Customers can only parse their own documents.
        """
        doc = self.get_document(document_id, requesting_user)
        abs_path = os.path.abspath(doc.storage_path)

        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Underlying document file is missing on storage: {doc.storage_path}")

        result = self.parsing_service.parse_and_verify(doc, abs_path)

        # Record audit event
        self.repo.record_audit(DocumentAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            document_id=document_id,
            user_id=requesting_user.user_id,
            action="parse_and_verify",
            details={
                "verdict": result.verdict.value,
                "is_ocr_applied": result.is_ocr_applied,
                "findings_count": len(result.findings),
                "checks_count": len(result.consistency_checks),
                "execution_time_seconds": result.execution_time_seconds
            },
            timestamp=datetime.now(timezone.utc).isoformat()
        ))

        return result

    def get_extracted_data(self, document_id: str, requesting_user: User) -> DocumentExtractionResult:
        """
        Returns structured extraction results, checks, and findings.
        If document has not yet been parsed, triggers parse_and_verify automatically.
        """
        return self.parse_and_verify(document_id, requesting_user)

    def update_review_status(
        self,
        document_id: str,
        new_status: ReviewStatus,
        notes: Optional[str],
        requesting_user: User
    ) -> DocumentRecord:
        """
        Updates document review status (suspected -> reviewed -> confirmed).
        Strictly restricted to analysts, compliance officers, and administrators.
        """
        if requesting_user.role not in ["fraud_analyst", "analyst", "compliance_officer", "admin"]:
            raise PermissionError("Forbidden: Only fraud analysts or administrators can update review status.")

        doc = self.repo.get_document(document_id)
        if not doc:
            raise LookupError(f"Document '{document_id}' not found.")

        updated = self.repo.update_document(
            document_id=document_id,
            review_status=new_status,
            metadata_update={
                "reviewed_by": requesting_user.user_id,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "analyst_review_notes": notes
            }
        )

        self.repo.record_audit(DocumentAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            document_id=document_id,
            user_id=requesting_user.user_id,
            action="review_status_updated",
            details={
                "previous_status": doc.review_status.value,
                "new_status": new_status.value,
                "notes": notes
            },
            timestamp=datetime.now(timezone.utc).isoformat()
        ))

        return updated

    def create_case_from_document(
        self,
        document_id: str,
        priority: str,
        initial_notes: Optional[str],
        requesting_user: User
    ) -> Dict[str, Any]:
        """
        Escalates a document with verification findings to a formal Case Docket.
        Registers the document and its findings into the Case Evidence Store.
        """
        doc = self.get_document(document_id, requesting_user)

        from backend.repositories.case_repo import CaseRepository
        from backend.models.case import (
            Case, CaseStatus, CasePriority, EvidenceType, CaseEvidence
        )

        case_repo = CaseRepository()
        case_id = f"case_doc_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Determine priority
        p_upper = priority.upper().strip()
        case_priority = CasePriority.HIGH if p_upper not in [p.value for p in CasePriority] else CasePriority(p_upper)

        # Risk score heuristic
        risk_score = 85.0 if doc.verdict == VerificationVerdict.HIGH_RISK_INDICATORS else 55.0

        new_case = Case(
            case_id=case_id,
            incident_id=None,
            alert_id=None,
            transaction_id=doc.document_id,
            user_id=doc.user_id,
            status=CaseStatus.NEW,
            priority=case_priority,
            risk_score=risk_score,
            risk_band="CRITICAL" if risk_score >= 80 else "HIGH",
            decision="document_verification_review",
            scam_type=f"Document Anomaly ({doc.document_type.value})",
            customer_reported=(requesting_user.role == "customer"),
            opened_at=now_iso,
            updated_at=now_iso
        )
        case_repo.create_case(new_case)

        ev_id = f"ev_{uuid.uuid4().hex[:8]}"
        evidence_payload = {
            "document_id": doc.document_id,
            "filename": doc.filename,
            "sha256": doc.sha256_hash,
            "document_type": doc.document_type.value,
            "claim_label": doc.claim_label,
            "verdict": doc.verdict.value if doc.verdict else "unverified",
            "escalated_by": requesting_user.user_id,
            "notes": initial_notes
        }
        case_repo.add_case_evidence(CaseEvidence(
            evidence_id=ev_id,
            case_id=case_id,
            evidence_type=EvidenceType.EXTERNAL_FILE,
            source_ref=doc.document_id,
            added_by=requesting_user.user_id,
            content_hash=doc.sha256_hash,
            metadata=evidence_payload,
            created_at=now_iso
        ))

        # Log audit entry
        self.repo.record_audit(DocumentAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            document_id=document_id,
            user_id=requesting_user.user_id,
            action="escalate_to_case",
            details={
                "case_id": case_id,
                "priority": case_priority.value,
                "evidence_id": ev_id
            },
            timestamp=now_iso
        ))

        return {
            "status": "success",
            "case_id": case_id,
            "document_id": document_id,
            "priority": case_priority.value,
            "message": f"Successfully created Case Docket {case_id} for document '{doc.filename}'."
        }
