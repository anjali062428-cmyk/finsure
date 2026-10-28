"""
FinSure Document Repository
Provides thread-safe persistence for uploaded financial documents,
immutable audit trails, duplicate detection, and the authorized transaction ledger.
"""

import os
import json
import sqlite3
import threading
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from backend.models.document import (
    DocumentRecord, DocumentType, DocumentStatus,
    VerificationVerdict, ReviewStatus, DocumentAuditEntry,
    AuthorizedTransaction
)

logger = logging.getLogger("finsure.document_repo")


class DocumentRepository:
    """Thread-safe SQLite repository for document verification workflows."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("DOCUMENT_DB_PATH", "data/finsure_documents.db")
        self._lock = threading.Lock()
        if self.db_path == ":memory:":
            self._mem_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._mem_conn.row_factory = sqlite3.Row
        else:
            self._mem_conn = None
            os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self._mem_conn is not None:
            return self._mem_conn
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initializes tables and indexes for document platform."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Documents table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS documents (
                        document_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_size INTEGER NOT NULL,
                        mime_type TEXT NOT NULL,
                        document_type TEXT NOT NULL,
                        sha256_hash TEXT NOT NULL,
                        storage_path TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'uploaded',
                        verdict TEXT,
                        review_status TEXT NOT NULL DEFAULT 'suspected',
                        claim_label TEXT NOT NULL DEFAULT 'general_document',
                        is_duplicate INTEGER NOT NULL DEFAULT 0,
                        duplicate_of TEXT,
                        metadata_json TEXT NOT NULL DEFAULT '{}',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_user ON documents(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_hash ON documents(sha256_hash)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_type ON documents(document_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_status ON documents(status)")

                # Document Audit Events table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS document_audit (
                        audit_id TEXT PRIMARY KEY,
                        document_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        action TEXT NOT NULL,
                        details_json TEXT NOT NULL DEFAULT '{}',
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (document_id) REFERENCES documents(document_id)
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_audit_doc ON document_audit(document_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_audit_user ON document_audit(user_id)")

                # Authorized Transaction / General Ledger table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS authorized_ledger (
                        record_id TEXT PRIMARY KEY,
                        reference_id TEXT NOT NULL,
                        account_number TEXT,
                        payer_vpa TEXT,
                        payee_vpa TEXT,
                        amount REAL NOT NULL,
                        currency TEXT NOT NULL DEFAULT 'INR',
                        transaction_date TEXT NOT NULL,
                        is_synthetic INTEGER NOT NULL DEFAULT 0,
                        data_source TEXT NOT NULL DEFAULT 'manual_import',
                        notes TEXT,
                        created_at TEXT NOT NULL
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_ref ON authorized_ledger(reference_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_acc ON authorized_ledger(account_number)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_date ON authorized_ledger(transaction_date)")

                conn.commit()

    def save_document(self, doc: DocumentRecord) -> DocumentRecord:
        """Saves a new or existing document record."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO documents (
                        document_id, user_id, filename, file_size, mime_type,
                        document_type, sha256_hash, storage_path, status,
                        verdict, review_status, claim_label, is_duplicate,
                        duplicate_of, metadata_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    doc.document_id,
                    doc.user_id,
                    doc.filename,
                    doc.file_size,
                    doc.mime_type,
                    doc.document_type.value,
                    doc.sha256_hash,
                    doc.storage_path,
                    doc.status.value,
                    doc.verdict.value if doc.verdict else None,
                    doc.review_status.value,
                    doc.claim_label,
                    1 if doc.is_duplicate else 0,
                    doc.duplicate_of,
                    json.dumps(doc.metadata or {}),
                    doc.created_at,
                    doc.updated_at
                ))
                conn.commit()
                return doc

    def get_document(self, document_id: str) -> Optional[DocumentRecord]:
        """Retrieves a document by its document_id."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM documents WHERE document_id = ?", (document_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                return self._row_to_document(row)

    def find_by_hash(self, sha256_hash: str) -> Optional[DocumentRecord]:
        """Checks for existing document with identical content hash (deduplication check)."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM documents WHERE sha256_hash = ? ORDER BY created_at ASC LIMIT 1",
                    (sha256_hash,)
                )
                row = cursor.fetchone()
                if not row:
                    return None
                return self._row_to_document(row)

    def list_documents(
        self,
        user_id: Optional[str] = None,
        document_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[DocumentRecord]:
        """Lists documents with role-aware user scoping and filters."""
        query = "SELECT * FROM documents WHERE 1=1"
        params: List[Any] = []

        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if document_type:
            query += " AND document_type = ?"
            params.append(document_type)
        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [self._row_to_document(r) for r in rows]

    def count_documents(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        document_type: Optional[str] = None
    ) -> int:
        """Returns total document count matching filter criteria."""
        query = "SELECT COUNT(*) FROM documents WHERE 1=1"
        params: List[Any] = []

        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if status:
            query += " AND status = ?"
            params.append(status)
        if document_type:
            query += " AND document_type = ?"
            params.append(document_type)

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                return cursor.fetchone()[0]

    def update_document(
        self,
        document_id: str,
        status: Optional[DocumentStatus] = None,
        verdict: Optional[VerificationVerdict] = None,
        review_status: Optional[ReviewStatus] = None,
        metadata_update: Optional[Dict[str, Any]] = None
    ) -> Optional[DocumentRecord]:
        """Updates status, verdict, review state, or metadata for an existing document."""
        doc = self.get_document(document_id)
        if not doc:
            return None

        if status:
            doc.status = status
        if verdict:
            doc.verdict = verdict
        if review_status:
            doc.review_status = review_status
        if metadata_update:
            doc.metadata.update(metadata_update)

        doc.updated_at = datetime.now(timezone.utc).isoformat()
        return self.save_document(doc)

    def record_audit(self, entry: DocumentAuditEntry):
        """Records an immutable audit event for a document."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO document_audit (
                        audit_id, document_id, user_id, action, details_json, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    entry.audit_id,
                    entry.document_id,
                    entry.user_id,
                    entry.action,
                    json.dumps(entry.details or {}),
                    entry.timestamp
                ))
                conn.commit()

    def list_audit_entries(self, document_id: str) -> List[DocumentAuditEntry]:
        """Returns chronological audit trail for a document."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM document_audit WHERE document_id = ? ORDER BY timestamp ASC",
                    (document_id,)
                )
                rows = cursor.fetchall()
                return [
                    DocumentAuditEntry(
                        audit_id=r["audit_id"],
                        document_id=r["document_id"],
                        user_id=r["user_id"],
                        action=r["action"],
                        details=json.loads(r["details_json"]),
                        timestamp=r["timestamp"]
                    )
                    for r in rows
                ]

    # --- Authorized Ledger Persistence ---

    def save_authorized_transaction(self, tx: AuthorizedTransaction) -> AuthorizedTransaction:
        """Inserts or replaces an authorized ledger record."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO authorized_ledger (
                        record_id, reference_id, account_number, payer_vpa, payee_vpa,
                        amount, currency, transaction_date, is_synthetic, data_source,
                        notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tx.record_id,
                    tx.reference_id,
                    tx.account_number,
                    tx.payer_vpa,
                    tx.payee_vpa,
                    tx.amount,
                    tx.currency,
                    tx.transaction_date,
                    1 if tx.is_synthetic else 0,
                    tx.data_source,
                    tx.notes,
                    tx.created_at
                ))
                conn.commit()
                return tx

    def batch_save_authorized_transactions(self, txs: List[AuthorizedTransaction]) -> int:
        """Batch inserts authorized ledger records."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                records = [
                    (
                        tx.record_id,
                        tx.reference_id,
                        tx.account_number,
                        tx.payer_vpa,
                        tx.payee_vpa,
                        tx.amount,
                        tx.currency,
                        tx.transaction_date,
                        1 if tx.is_synthetic else 0,
                        tx.data_source,
                        tx.notes,
                        tx.created_at
                    )
                    for tx in txs
                ]
                cursor.executemany("""
                    INSERT OR REPLACE INTO authorized_ledger (
                        record_id, reference_id, account_number, payer_vpa, payee_vpa,
                        amount, currency, transaction_date, is_synthetic, data_source,
                        notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, records)
                conn.commit()
                return len(records)

    def find_authorized_transactions(
        self,
        reference_id: Optional[str] = None,
        amount: Optional[float] = None,
        account_number: Optional[str] = None,
        transaction_date: Optional[str] = None,
        limit: int = 20
    ) -> List[AuthorizedTransaction]:
        """Finds matching authorized ledger records based on key fields."""
        query = "SELECT * FROM authorized_ledger WHERE 1=1"
        params: List[Any] = []

        if reference_id:
            query += " AND reference_id = ?"
            params.append(reference_id)
        if amount is not None:
            # Match within 0.01 precision for float tolerance
            query += " AND ABS(amount - ?) < 0.01"
            params.append(amount)
        if account_number:
            query += " AND account_number = ?"
            params.append(account_number)
        if transaction_date:
            query += " AND transaction_date LIKE ?"
            params.append(f"{transaction_date}%")

        query += " LIMIT ?"
        params.append(limit)

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [self._row_to_authorized_tx(r) for r in rows]

    def count_authorized_transactions(self) -> int:
        """Returns total count of authorized records in ledger."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM authorized_ledger")
                return cursor.fetchone()[0]

    # --- Internal Row Helpers ---

    def _row_to_document(self, row: sqlite3.Row) -> DocumentRecord:
        return DocumentRecord(
            document_id=row["document_id"],
            user_id=row["user_id"],
            filename=row["filename"],
            file_size=row["file_size"],
            mime_type=row["mime_type"],
            document_type=DocumentType(row["document_type"]),
            sha256_hash=row["sha256_hash"],
            storage_path=row["storage_path"],
            status=DocumentStatus(row["status"]),
            verdict=VerificationVerdict(row["verdict"]) if row["verdict"] else None,
            review_status=ReviewStatus(row["review_status"]),
            claim_label=row["claim_label"],
            is_duplicate=bool(row["is_duplicate"]),
            duplicate_of=row["duplicate_of"],
            metadata=json.loads(row["metadata_json"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

    def _row_to_authorized_tx(self, row: sqlite3.Row) -> AuthorizedTransaction:
        return AuthorizedTransaction(
            record_id=row["record_id"],
            reference_id=row["reference_id"],
            account_number=row["account_number"],
            payer_vpa=row["payer_vpa"],
            payee_vpa=row["payee_vpa"],
            amount=row["amount"],
            currency=row["currency"],
            transaction_date=row["transaction_date"],
            is_synthetic=bool(row["is_synthetic"]),
            data_source=row["data_source"],
            notes=row["notes"],
            created_at=row["created_at"]
        )
