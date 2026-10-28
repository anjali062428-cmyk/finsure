"""
FinSure Incident Repository
Provides persistence for incidents, append-only cryptographic event logs (hash chain),
notes, feedback, and report verification records using SQLite.
"""

import os
import json
import uuid
import sqlite3
import hashlib
import threading
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

from backend.models.incident import (
    Incident, IncidentStatus, IncidentPriority,
    IncidentEvent, IncidentNote, AnalystFeedback, IncidentReportRecord
)

logger = logging.getLogger("finsure.incident_repo")


class IncidentRepository:
    """Thread-safe SQLite repository for incidents and cryptographic audit chains."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("INCIDENT_DB_PATH", "data/finsure_incidents.db")
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

                # Incidents table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS incidents (
                        incident_id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        risk_score REAL NOT NULL,
                        risk_probability REAL NOT NULL,
                        risk_band TEXT NOT NULL,
                        decision TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'new',
                        priority TEXT NOT NULL DEFAULT 'MEDIUM',
                        scam_type TEXT,
                        assigned_to TEXT,
                        sla_due_at TEXT,
                        scoring_snapshot_json TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        closed_at TEXT,
                        model_version TEXT NOT NULL,
                        threshold_version TEXT NOT NULL
                    )
                """)

                # Append-only incident events ledger (hash chain)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS incident_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT NOT NULL UNIQUE,
                        incident_id TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        actor_id TEXT NOT NULL,
                        actor_role TEXT,
                        timestamp TEXT NOT NULL,
                        event_payload_json TEXT NOT NULL,
                        previous_hash TEXT NOT NULL,
                        record_hash TEXT NOT NULL,
                        FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
                    )
                """)

                # Incident notes
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS incident_notes (
                        note_id TEXT PRIMARY KEY,
                        incident_id TEXT NOT NULL,
                        author_id TEXT NOT NULL,
                        author_role TEXT NOT NULL,
                        note_text TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
                    )
                """)

                # Analyst feedback
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS analyst_feedback (
                        feedback_id TEXT PRIMARY KEY,
                        incident_id TEXT NOT NULL,
                        analyst_id TEXT NOT NULL,
                        verdict TEXT NOT NULL,
                        scam_type_corrected TEXT,
                        notes TEXT NOT NULL,
                        evidence_references_json TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
                    )
                """)

                # Incident reports
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS incident_reports (
                        report_id TEXT PRIMARY KEY,
                        incident_id TEXT NOT NULL,
                        report_type TEXT NOT NULL,
                        file_path TEXT,
                        content_hash TEXT NOT NULL,
                        qr_payload TEXT NOT NULL,
                        generated_at TEXT NOT NULL,
                        generator_role TEXT NOT NULL,
                        FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
                    )
                """)

                # Indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_incident ON incident_events(incident_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_incident ON incident_notes(incident_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_incident ON analyst_feedback(incident_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_incident ON incident_reports(incident_id)")

                conn.commit()

    # -------------------------------------------------------------
    # Incident CRUD
    # -------------------------------------------------------------
    def create_incident(self, incident: Incident) -> Incident:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO incidents (
                        incident_id, transaction_id, user_id, risk_score, risk_probability,
                        risk_band, decision, status, priority, scam_type,
                        assigned_to, sla_due_at, scoring_snapshot_json,
                        created_at, updated_at, closed_at, model_version, threshold_version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    incident.incident_id, incident.transaction_id, incident.user_id,
                    incident.risk_score, incident.risk_probability, incident.risk_band,
                    incident.decision, incident.status.value, incident.priority.value,
                    incident.scam_type, incident.assigned_to, incident.sla_due_at,
                    json.dumps(incident.scoring_snapshot) if incident.scoring_snapshot else None,
                    incident.created_at, incident.updated_at, incident.closed_at,
                    incident.model_version, incident.threshold_version
                ))
                conn.commit()
                return incident

    def get_incident_by_id(self, incident_id: str) -> Optional[Incident]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
                row = cursor.fetchone()
                return self._row_to_incident(row) if row else None

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self.get_incident_by_id(incident_id)

    def list_incidents(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Incident]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                query = "SELECT * FROM incidents WHERE 1=1"
                params: List[Any] = []
                if user_id:
                    query += " AND user_id = ?"
                    params.append(user_id)
                if status:
                    query += " AND status = ?"
                    params.append(status)
                if priority:
                    query += " AND priority = ?"
                    params.append(priority)
                query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])

                cursor.execute(query, tuple(params))
                rows = cursor.fetchall()
                return [self._row_to_incident(r) for r in rows]

    def update_incident_status(
        self,
        incident_id: str,
        new_status: IncidentStatus,
        assigned_to: Optional[str] = None,
        closed_at: Optional[str] = None
    ) -> Optional[Incident]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                now_iso = datetime.now(timezone.utc).isoformat()
                cursor.execute("""
                    UPDATE incidents SET
                        status = ?,
                        assigned_to = COALESCE(?, assigned_to),
                        closed_at = COALESCE(?, closed_at),
                        updated_at = ?
                    WHERE incident_id = ?
                """, (new_status.value, assigned_to, closed_at, now_iso, incident_id))
                conn.commit()
        return self.get_incident_by_id(incident_id)

    def _row_to_incident(self, row: sqlite3.Row) -> Incident:
        snapshot = json.loads(row["scoring_snapshot_json"]) if row["scoring_snapshot_json"] else None
        return Incident(
            incident_id=row["incident_id"],
            transaction_id=row["transaction_id"],
            user_id=row["user_id"],
            risk_score=row["risk_score"],
            risk_probability=row["risk_probability"],
            risk_band=row["risk_band"],
            decision=row["decision"],
            status=IncidentStatus(row["status"]),
            priority=IncidentPriority(row["priority"]),
            scam_type=row["scam_type"],
            assigned_to=row["assigned_to"],
            sla_due_at=row["sla_due_at"],
            scoring_snapshot=snapshot,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            closed_at=row["closed_at"],
            model_version=row["model_version"],
            threshold_version=row["threshold_version"]
        )

    # -------------------------------------------------------------
    # Append-Only Event Log & Cryptographic Hash Chain
    # -------------------------------------------------------------
    @staticmethod
    def compute_record_hash(
        event_id: str,
        incident_id: str,
        event_type: str,
        actor_id: str,
        timestamp: str,
        payload: Dict[str, Any],
        previous_hash: str
    ) -> str:
        canonical_payload = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        canonical_record = f"{event_id}|{incident_id}|{event_type}|{actor_id}|{timestamp}|{canonical_payload}|{previous_hash}"
        return hashlib.sha256(canonical_record.encode("utf-8")).hexdigest()

    def append_event(
        self,
        event_id: str,
        incident_id: str,
        event_type: str,
        actor_id: str,
        actor_role: Optional[str] = "system",
        payload: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None
    ) -> IncidentEvent:
        """
        Appends an event to the incident's immutable hash chain.
        Automatically binds to the latest event's record_hash.
        """
        now_iso = timestamp or datetime.now(timezone.utc).isoformat()
        event_payload = payload or {}

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Get latest event in the chain for this incident
                cursor.execute("""
                    SELECT record_hash FROM incident_events
                    WHERE incident_id = ?
                    ORDER BY id DESC LIMIT 1
                """, (incident_id,))
                latest = cursor.fetchone()
                previous_hash = latest["record_hash"] if latest else ("0" * 64)

                # Compute SHA-256 record hash
                record_hash = self.compute_record_hash(
                    event_id=event_id,
                    incident_id=incident_id,
                    event_type=event_type,
                    actor_id=actor_id,
                    timestamp=now_iso,
                    payload=event_payload,
                    previous_hash=previous_hash
                )

                cursor.execute("""
                    INSERT INTO incident_events (
                        event_id, incident_id, event_type, actor_id, actor_role,
                        timestamp, event_payload_json, previous_hash, record_hash
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event_id, incident_id, event_type, actor_id, actor_role,
                    now_iso, json.dumps(event_payload, sort_keys=True),
                    previous_hash, record_hash
                ))
                conn.commit()

                return IncidentEvent(
                    event_id=event_id,
                    incident_id=incident_id,
                    event_type=event_type,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    timestamp=now_iso,
                    event_payload=event_payload,
                    previous_hash=previous_hash,
                    record_hash=record_hash
                )

    def append_incident_event(
        self,
        incident_id: str,
        event_type: str,
        actor_id: str,
        actor_role: Optional[str] = "system",
        payload: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None
    ) -> IncidentEvent:
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        return self.append_event(
            event_id=event_id,
            incident_id=incident_id,
            event_type=event_type,
            actor_id=actor_id,
            actor_role=actor_role,
            payload=payload,
            timestamp=timestamp
        )

    def get_incident_events(self, incident_id: str) -> List[IncidentEvent]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM incident_events
                    WHERE incident_id = ?
                    ORDER BY id ASC
                """, (incident_id,))
                rows = cursor.fetchall()
                return [
                    IncidentEvent(
                        event_id=r["event_id"],
                        incident_id=r["incident_id"],
                        event_type=r["event_type"],
                        actor_id=r["actor_id"],
                        actor_role=r["actor_role"],
                        timestamp=r["timestamp"],
                        event_payload=json.loads(r["event_payload_json"]),
                        previous_hash=r["previous_hash"],
                        record_hash=r["record_hash"]
                    )
                    for r in rows
                ]

    def verify_incident_event_chain(self, incident_id: str) -> Tuple[bool, str, int]:
        """
        Cryptographically verifies the SHA-256 hash chain for an incident.
        Returns: (is_valid: bool, status_message: str, verified_event_count: int)
        """
        events = self.get_incident_events(incident_id)
        if not events:
            return True, "No events recorded; empty chain is trivial.", 0

        expected_prev_hash = "0" * 64
        for idx, ev in enumerate(events):
            # 1. Verify previous hash link
            if ev.previous_hash != expected_prev_hash:
                return (
                    False,
                    f"Chain broken at event #{idx+1} ({ev.event_id}): "
                    f"expected prev_hash '{expected_prev_hash[:12]}...' but got '{ev.previous_hash[:12]}...'",
                    idx
                )

            # 2. Recompute record hash
            computed_hash = self.compute_record_hash(
                event_id=ev.event_id,
                incident_id=ev.incident_id,
                event_type=ev.event_type,
                actor_id=ev.actor_id,
                timestamp=ev.timestamp,
                payload=ev.event_payload,
                previous_hash=ev.previous_hash
            )
            if computed_hash != ev.record_hash:
                return (
                    False,
                    f"Tamper detected at event #{idx+1} ({ev.event_id}): "
                    f"computed hash '{computed_hash[:12]}...' does not match stored hash '{ev.record_hash[:12]}...'",
                    idx
                )

            expected_prev_hash = ev.record_hash

        return True, "Cryptographic hash chain verified; all links unbroken.", len(events)

    # -------------------------------------------------------------
    # Notes & Feedback
    # -------------------------------------------------------------
    def add_note(self, note: IncidentNote) -> IncidentNote:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO incident_notes (
                        note_id, incident_id, author_id, author_role, note_text, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    note.note_id, note.incident_id, note.author_id,
                    note.author_role, note.note_text, note.created_at
                ))
                conn.commit()
                return note

    def get_notes(self, incident_id: str) -> List[IncidentNote]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM incident_notes
                    WHERE incident_id = ?
                    ORDER BY created_at ASC
                """, (incident_id,))
                rows = cursor.fetchall()
                return [
                    IncidentNote(
                        note_id=r["note_id"],
                        incident_id=r["incident_id"],
                        author_id=r["author_id"],
                        author_role=r["author_role"],
                        note_text=r["note_text"],
                        created_at=r["created_at"]
                    )
                    for r in rows
                ]

    def add_feedback(self, feedback: AnalystFeedback) -> AnalystFeedback:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO analyst_feedback (
                        feedback_id, incident_id, analyst_id, verdict,
                        scam_type_corrected, notes, evidence_references_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback.feedback_id, feedback.incident_id, feedback.analyst_id,
                    feedback.verdict, feedback.scam_type_corrected, feedback.notes,
                    json.dumps(feedback.evidence_references), feedback.created_at
                ))
                conn.commit()
                return feedback

    def get_feedback(self, incident_id: str) -> List[AnalystFeedback]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM analyst_feedback
                    WHERE incident_id = ?
                    ORDER BY created_at ASC
                """, (incident_id,))
                rows = cursor.fetchall()
                return [
                    AnalystFeedback(
                        feedback_id=r["feedback_id"],
                        incident_id=r["incident_id"],
                        analyst_id=r["analyst_id"],
                        verdict=r["verdict"],
                        scam_type_corrected=r["scam_type_corrected"],
                        notes=r["notes"],
                        evidence_references=json.loads(r["evidence_references_json"]) if r["evidence_references_json"] else [],
                        created_at=r["created_at"]
                    )
                    for r in rows
                ]

    # -------------------------------------------------------------
    # Report Records
    # -------------------------------------------------------------
    def save_report_record(self, record: IncidentReportRecord) -> IncidentReportRecord:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO incident_reports (
                        report_id, incident_id, report_type, file_path,
                        content_hash, qr_payload, generated_at, generator_role
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.report_id, record.incident_id, record.report_type,
                    record.file_path, record.content_hash, record.qr_payload,
                    record.generated_at, record.generator_role
                ))
                conn.commit()
                return record

    def get_latest_report(self, incident_id: str, report_type: str) -> Optional[IncidentReportRecord]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM incident_reports
                    WHERE incident_id = ? AND report_type = ?
                    ORDER BY generated_at DESC LIMIT 1
                """, (incident_id, report_type))
                r = cursor.fetchone()
                if not r:
                    return None
                return IncidentReportRecord(
                    report_id=r["report_id"],
                    incident_id=r["incident_id"],
                    report_type=r["report_type"],
                    file_path=r["file_path"],
                    content_hash=r["content_hash"],
                    qr_payload=r["qr_payload"],
                    generated_at=r["generated_at"],
                    generator_role=r["generator_role"]
                )
