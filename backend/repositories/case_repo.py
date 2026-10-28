"""
FinSure Case Investigation Repository
Provides persistence for cases, immutable evidence store, state transitions,
analyst notes, and investigation runs using SQLite.
"""

import os
import json
import sqlite3
import hashlib
import threading
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

from backend.models.case import (
    Case, CaseStatus, CasePriority, EvidenceType,
    CaseEvidence, CaseTransition, CaseNote, InvestigationRun
)

logger = logging.getLogger("finsure.case_repo")


class CaseRepository:
    """Thread-safe SQLite repository for cases, evidence, transitions, and investigation runs."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("CASE_DB_PATH", "data/finsure_cases.db")
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
        """Initializes tables and indexes."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Cases table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS cases (
                        case_id TEXT PRIMARY KEY,
                        incident_id TEXT,
                        alert_id TEXT,
                        transaction_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'new',
                        priority TEXT NOT NULL DEFAULT 'MEDIUM',
                        risk_score REAL NOT NULL,
                        risk_band TEXT NOT NULL,
                        decision TEXT NOT NULL,
                        scam_type TEXT,
                        assigned_to TEXT,
                        sla_due_at TEXT,
                        customer_reported INTEGER NOT NULL DEFAULT 0,
                        opened_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        closed_at TEXT,
                        closed_by TEXT,
                        disposition TEXT,
                        disposition_reason TEXT,
                        disposition_note TEXT,
                        created_by TEXT
                    )
                """)

                # Case evidence table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS case_evidence (
                        evidence_id TEXT NOT NULL,
                        case_id TEXT NOT NULL,
                        evidence_type TEXT NOT NULL,
                        source_ref TEXT NOT NULL,
                        added_by TEXT NOT NULL,
                        content_hash TEXT NOT NULL,
                        metadata_json TEXT NOT NULL,
                        withdrawn_at TEXT,
                        withdraw_reason TEXT,
                        created_at TEXT NOT NULL,
                        PRIMARY KEY (case_id, evidence_id),
                        FOREIGN KEY (case_id) REFERENCES cases(case_id)
                    )
                """)

                # Case transitions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS case_transitions (
                        transition_id TEXT PRIMARY KEY,
                        case_id TEXT NOT NULL,
                        from_status TEXT NOT NULL,
                        to_status TEXT NOT NULL,
                        actor_id TEXT NOT NULL,
                        reason_code TEXT,
                        note TEXT,
                        approved_by TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (case_id) REFERENCES cases(case_id)
                    )
                """)

                # Case notes table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS case_notes (
                        note_id TEXT PRIMARY KEY,
                        case_id TEXT NOT NULL,
                        author_id TEXT NOT NULL,
                        author_role TEXT NOT NULL,
                        note_text TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (case_id) REFERENCES cases(case_id)
                    )
                """)

                # Investigation runs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS investigation_runs (
                        run_id TEXT PRIMARY KEY,
                        case_id TEXT NOT NULL,
                        plan_json TEXT NOT NULL,
                        tool_calls_json TEXT NOT NULL,
                        findings_json TEXT NOT NULL,
                        report_text TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        model TEXT NOT NULL,
                        prompt_hash TEXT NOT NULL,
                        validator_passed INTEGER NOT NULL,
                        groundedness_score REAL NOT NULL,
                        unsupported_claims_json TEXT NOT NULL,
                        latency_ms REAL NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (case_id) REFERENCES cases(case_id)
                    )
                """)

                # Indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases(assigned_to)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_txn ON cases(transaction_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_case_transitions_case ON case_transitions(case_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigation_runs_case ON investigation_runs(case_id)")

                conn.commit()

    def create_case(self, case: Case) -> Case:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO cases (
                        case_id, incident_id, alert_id, transaction_id, user_id,
                        status, priority, risk_score, risk_band, decision,
                        scam_type, assigned_to, sla_due_at, customer_reported,
                        opened_at, updated_at, closed_at, closed_by,
                        disposition, disposition_reason, disposition_note, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    case.case_id, case.incident_id, case.alert_id, case.transaction_id, case.user_id,
                    case.status.value, case.priority.value, case.risk_score, case.risk_band, case.decision,
                    case.scam_type, case.assigned_to, case.sla_due_at, 1 if case.customer_reported else 0,
                    case.opened_at, case.updated_at, case.closed_at, case.closed_by,
                    case.disposition, case.disposition_reason, case.disposition_note, case.created_by
                ))
                conn.commit()
        return case

    def get_case(self, case_id: str) -> Optional[Case]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                
                # Count active evidence
                cursor.execute("SELECT COUNT(*) FROM case_evidence WHERE case_id = ? AND withdrawn_at IS NULL", (case_id,))
                ev_count = cursor.fetchone()[0]

                return self._row_to_case(row, ev_count)

    def get_case_by_transaction_id(self, txn_id: str) -> Optional[Case]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM cases WHERE transaction_id = ?", (txn_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                cursor.execute("SELECT COUNT(*) FROM case_evidence WHERE case_id = ? AND withdrawn_at IS NULL", (row["case_id"],))
                ev_count = cursor.fetchone()[0]
                return self._row_to_case(row, ev_count)

    def get_case_by_incident_id(self, incident_id: str) -> Optional[Case]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM cases WHERE incident_id = ?", (incident_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                cursor.execute("SELECT COUNT(*) FROM case_evidence WHERE case_id = ? AND withdrawn_at IS NULL", (row["case_id"],))
                ev_count = cursor.fetchone()[0]
                return self._row_to_case(row, ev_count)

    def list_cases(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Case], int]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                query = "SELECT * FROM cases WHERE 1=1"
                params: List[Any] = []

                if status:
                    query += " AND status = ?"
                    params.append(status)
                if priority:
                    query += " AND priority = ?"
                    params.append(priority)
                if assigned_to:
                    query += " AND assigned_to = ?"
                    params.append(assigned_to)
                if user_id:
                    query += " AND user_id = ?"
                    params.append(user_id)

                count_cursor = conn.cursor()
                count_query = query.replace("SELECT *", "SELECT COUNT(*)")
                count_cursor.execute(count_query, params)
                total = count_cursor.fetchone()[0]

                # Deterministic sorting: priority rank -> risk score desc -> opened_at asc
                query += """
                    ORDER BY 
                    CASE priority
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END ASC,
                    risk_score DESC,
                    opened_at ASC
                    LIMIT ? OFFSET ?
                """
                params.extend([limit, offset])

                cursor.execute(query, params)
                rows = cursor.fetchall()
                cases = []
                for r in rows:
                    c_id = r["case_id"]
                    cursor.execute("SELECT COUNT(*) FROM case_evidence WHERE case_id = ? AND withdrawn_at IS NULL", (c_id,))
                    ev_count = cursor.fetchone()[0]
                    cases.append(self._row_to_case(r, ev_count))
                return cases, total

    def update_case(self, case: Case) -> Case:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE cases SET
                        status = ?,
                        priority = ?,
                        assigned_to = ?,
                        sla_due_at = ?,
                        updated_at = ?,
                        closed_at = ?,
                        closed_by = ?,
                        disposition = ?,
                        disposition_reason = ?,
                        disposition_note = ?
                    WHERE case_id = ?
                """, (
                    case.status.value, case.priority.value, case.assigned_to, case.sla_due_at,
                    case.updated_at, case.closed_at, case.closed_by, case.disposition,
                    case.disposition_reason, case.disposition_note, case.case_id
                ))
                conn.commit()
        return case

    def add_case_evidence(self, evidence: CaseEvidence) -> CaseEvidence:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO case_evidence (
                        evidence_id, case_id, evidence_type, source_ref,
                        added_by, content_hash, metadata_json, withdrawn_at,
                        withdraw_reason, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    evidence.evidence_id, evidence.case_id, evidence.evidence_type.value,
                    evidence.source_ref, evidence.added_by, evidence.content_hash,
                    json.dumps(evidence.metadata, sort_keys=True),
                    evidence.withdrawn_at, evidence.withdraw_reason, evidence.created_at
                ))
                conn.commit()
        return evidence

    def get_case_evidence(self, case_id: str, include_withdrawn: bool = False) -> List[CaseEvidence]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                if include_withdrawn:
                    cursor.execute("SELECT * FROM case_evidence WHERE case_id = ? ORDER BY created_at ASC", (case_id,))
                else:
                    cursor.execute("SELECT * FROM case_evidence WHERE case_id = ? AND withdrawn_at IS NULL ORDER BY created_at ASC", (case_id,))
                rows = cursor.fetchall()
                return [self._row_to_evidence(r) for r in rows]

    def get_evidence_by_id(self, case_id: str, evidence_id: str) -> Optional[CaseEvidence]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM case_evidence WHERE case_id = ? AND evidence_id = ?", (case_id, evidence_id))
                row = cursor.fetchone()
                if not row:
                    return None
                return self._row_to_evidence(row)

    def withdraw_case_evidence(
        self, case_id: str, evidence_id: str, withdraw_reason: str, withdrawn_by: str
    ) -> Optional[CaseEvidence]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE case_evidence SET
                        withdrawn_at = ?,
                        withdraw_reason = ?
                    WHERE case_id = ? AND evidence_id = ? AND withdrawn_at IS NULL
                """, (now_iso, withdraw_reason, case_id, evidence_id))
                conn.commit()

        return self.get_evidence_by_id(case_id, evidence_id)

    def record_case_transition(self, transition: CaseTransition) -> CaseTransition:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO case_transitions (
                        transition_id, case_id, from_status, to_status,
                        actor_id, reason_code, note, approved_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    transition.transition_id, transition.case_id, transition.from_status.value,
                    transition.to_status.value, transition.actor_id, transition.reason_code,
                    transition.note, transition.approved_by, transition.created_at
                ))
                conn.commit()
        return transition

    def get_case_transitions(self, case_id: str) -> List[CaseTransition]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM case_transitions WHERE case_id = ? ORDER BY created_at ASC", (case_id,))
                rows = cursor.fetchall()
                return [
                    CaseTransition(
                        transition_id=r["transition_id"],
                        case_id=r["case_id"],
                        from_status=CaseStatus(r["from_status"]),
                        to_status=CaseStatus(r["to_status"]),
                        actor_id=r["actor_id"],
                        reason_code=r["reason_code"],
                        note=r["note"],
                        approved_by=r["approved_by"],
                        created_at=r["created_at"]
                    )
                    for r in rows
                ]

    def add_case_note(self, note: CaseNote) -> CaseNote:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO case_notes (
                        note_id, case_id, author_id, author_role, note_text, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    note.note_id, note.case_id, note.author_id,
                    note.author_role, note.note_text, note.created_at
                ))
                conn.commit()
        return note

    def get_case_notes(self, case_id: str) -> List[CaseNote]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at ASC", (case_id,))
                rows = cursor.fetchall()
                return [
                    CaseNote(
                        note_id=r["note_id"],
                        case_id=r["case_id"],
                        author_id=r["author_id"],
                        author_role=r["author_role"],
                        note_text=r["note_text"],
                        created_at=r["created_at"]
                    )
                    for r in rows
                ]

    def save_investigation_run(self, run: InvestigationRun) -> InvestigationRun:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO investigation_runs (
                        run_id, case_id, plan_json, tool_calls_json, findings_json,
                        report_text, provider, model, prompt_hash, validator_passed,
                        groundedness_score, unsupported_claims_json, latency_ms, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run.run_id, run.case_id,
                    json.dumps(run.plan),
                    json.dumps(run.tool_calls),
                    json.dumps(run.findings),
                    run.report_text,
                    run.provider,
                    run.model,
                    run.prompt_hash,
                    1 if run.validator_passed else 0,
                    run.groundedness_score,
                    json.dumps(run.unsupported_claims),
                    run.latency_ms,
                    run.created_at
                ))
                conn.commit()
        return run

    def get_investigation_runs(self, case_id: str) -> List[InvestigationRun]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM investigation_runs WHERE case_id = ? ORDER BY created_at DESC", (case_id,))
                rows = cursor.fetchall()
                return [self._row_to_investigation_run(r) for r in rows]

    def get_investigation_run_by_id(self, run_id: str) -> Optional[InvestigationRun]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM investigation_runs WHERE run_id = ?", (run_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                return self._row_to_investigation_run(row)

    def _row_to_case(self, row: sqlite3.Row, ev_count: int = 0) -> Case:
        return Case(
            case_id=row["case_id"],
            incident_id=row["incident_id"],
            alert_id=row["alert_id"],
            transaction_id=row["transaction_id"],
            user_id=row["user_id"],
            status=CaseStatus(row["status"]),
            priority=CasePriority(row["priority"]),
            risk_score=float(row["risk_score"]),
            risk_band=row["risk_band"],
            decision=row["decision"],
            scam_type=row["scam_type"],
            assigned_to=row["assigned_to"],
            sla_due_at=row["sla_due_at"],
            customer_reported=bool(row["customer_reported"]),
            opened_at=row["opened_at"],
            updated_at=row["updated_at"],
            closed_at=row["closed_at"],
            closed_by=row["closed_by"],
            disposition=row["disposition"],
            disposition_reason=row["disposition_reason"],
            disposition_note=row["disposition_note"],
            created_by=row["created_by"],
            evidence_count=ev_count
        )

    def _row_to_evidence(self, row: sqlite3.Row) -> CaseEvidence:
        return CaseEvidence(
            evidence_id=row["evidence_id"],
            case_id=row["case_id"],
            evidence_type=EvidenceType(row["evidence_type"]),
            source_ref=row["source_ref"],
            added_by=row["added_by"],
            content_hash=row["content_hash"],
            metadata=json.loads(row["metadata_json"]) if row["metadata_json"] else {},
            withdrawn_at=row["withdrawn_at"],
            withdraw_reason=row["withdraw_reason"],
            created_at=row["created_at"]
        )

    def _row_to_investigation_run(self, row: sqlite3.Row) -> InvestigationRun:
        return InvestigationRun(
            run_id=row["run_id"],
            case_id=row["case_id"],
            plan=json.loads(row["plan_json"]) if row["plan_json"] else [],
            tool_calls=json.loads(row["tool_calls_json"]) if row["tool_calls_json"] else [],
            findings=json.loads(row["findings_json"]) if row["findings_json"] else {},
            report_text=row["report_text"],
            provider=row["provider"],
            model=row["model"],
            prompt_hash=row["prompt_hash"],
            validator_passed=bool(row["validator_passed"]),
            groundedness_score=float(row["groundedness_score"]),
            unsupported_claims=json.loads(row["unsupported_claims_json"]) if row["unsupported_claims_json"] else [],
            latency_ms=float(row["latency_ms"]),
            created_at=row["created_at"]
        )
