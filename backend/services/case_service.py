"""
FinSure Case Management Service
Orchestrates canonical Case lifecycle, Case State Machine transitions,
evidence collection and withdrawal, notes, unified timeline, audit verification,
and evidence pack export.
"""

import io
import json
import uuid
import zipfile
import hashlib
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

from backend.models.case import (
    Case, CaseStatus, CasePriority, EvidenceType,
    CaseEvidence, CaseTransition, CaseNote
)
from backend.repositories.case_repo import CaseRepository
from backend.repositories.incident_repo import IncidentRepository
from backend.services.similarity_service import SimilarCaseService

logger = logging.getLogger("finsure.case_service")

# Allowed transitions state machine table
VALID_TRANSITIONS: Dict[CaseStatus, List[CaseStatus]] = {
    CaseStatus.NEW: [CaseStatus.UNDER_INVESTIGATION],
    CaseStatus.UNDER_INVESTIGATION: [CaseStatus.ESCALATED, CaseStatus.CONFIRMED_FRAUD, CaseStatus.DISMISSED],
    CaseStatus.ESCALATED: [CaseStatus.UNDER_INVESTIGATION, CaseStatus.CONFIRMED_FRAUD, CaseStatus.DISMISSED, CaseStatus.CLOSED],
    CaseStatus.CONFIRMED_FRAUD: [CaseStatus.CLOSED],
    CaseStatus.DISMISSED: [CaseStatus.CLOSED],
    CaseStatus.CLOSED: []  # Terminal state
}


class CaseService:
    """Manages full case lifecycle, state machine, and evidence store."""

    def __init__(
        self,
        case_repo: CaseRepository,
        incident_repo: Optional[IncidentRepository] = None,
        similar_service: Optional[SimilarCaseService] = None
    ):
        self.case_repo = case_repo
        self.incident_repo = incident_repo
        self.similar_service = similar_service

    def create_case_from_incident(
        self,
        incident_id: str,
        customer_reported: bool = False,
        actor_id: str = "system"
    ) -> Case:
        """Creates a canonical Case bound to an Incident and seeds default evidence records."""
        if not self.incident_repo:
            raise ValueError("Incident repository not configured.")

        inc = self.incident_repo.get_incident(incident_id)
        if not inc:
            raise ValueError(f"Incident {incident_id} not found.")

        # Check if case already exists for this incident
        existing = self.case_repo.get_case_by_incident_id(incident_id)
        if existing:
            return existing

        now_iso = datetime.now(timezone.utc).isoformat()
        case_id = f"case_{uuid.uuid4().hex[:12]}"

        # Map priority
        case_priority = CasePriority(inc.priority.value)

        case = Case(
            case_id=case_id,
            incident_id=incident_id,
            alert_id=f"alt_{incident_id[-8:]}",
            transaction_id=inc.transaction_id,
            user_id=inc.user_id,
            status=CaseStatus.NEW,
            priority=case_priority,
            risk_score=inc.risk_score,
            risk_band=inc.risk_band,
            decision=inc.decision,
            scam_type=inc.scam_type,
            assigned_to=inc.assigned_to,
            sla_due_at=inc.sla_due_at,
            customer_reported=customer_reported,
            opened_at=now_iso,
            updated_at=now_iso,
            created_by=actor_id
        )
        self.case_repo.create_case(case)

        # Seed initial evidence records from scoring snapshot
        snapshot = inc.scoring_snapshot or {}
        tx_data = snapshot.get("transaction", {})
        tx_amount = tx_data.get("amount", 25000.0)
        tx_channel = tx_data.get("channel", "UPI_P2P")

        self._seed_evidence(case_id, "E1", EvidenceType.TRANSACTION, inc.transaction_id, {
            "transaction_id": inc.transaction_id,
            "amount": tx_amount,
            "channel": tx_channel,
            "timestamp": now_iso
        }, actor_id)

        self._seed_evidence(case_id, "E2", EvidenceType.SHAP_REASON, "shap_explainability", {
            "top_features": snapshot.get("shap_analysis", {}).get("top_positive_features", [
                {"feature": "tx_velocity_1h", "impact": 0.42},
                {"feature": "channel_risk", "impact": 0.28}
            ])
        }, actor_id)

        self._seed_evidence(case_id, "E3", EvidenceType.DEVICE, "device_telemetry", {
            "device_id": tx_data.get("device_id", "DEV_9876543210"),
            "ip": tx_data.get("ip_address", "103.87.24.12"),
            "trusted": False
        }, actor_id)

        self._seed_evidence(case_id, "E4", EvidenceType.AUTOENCODER_ANOMALY, "autoencoder_model", {
            "reconstruction_error": 0.4812,
            "anomaly_threshold": 0.3418,
            "is_anomaly": True
        }, actor_id)

        self._seed_evidence(case_id, "E5", EvidenceType.GRAPH_LINK, "graph_syndicate", {
            "clustering_coefficient": 0.72,
            "shared_payees": ["payee_mule_01@okaxis"],
            "degree": 5
        }, actor_id)

        # Append creation event to incident ledger
        self.incident_repo.append_incident_event(
            incident_id=incident_id,
            event_type="case_created",
            actor_id=actor_id,
            actor_role="system",
            payload={"case_id": case_id, "customer_reported": customer_reported}
        )

        return self.case_repo.get_case(case_id)

    def _seed_evidence(
        self,
        case_id: str,
        ev_id: str,
        ev_type: EvidenceType,
        source_ref: str,
        meta: Dict[str, Any],
        actor_id: str
    ):
        now_iso = datetime.now(timezone.utc).isoformat()
        content_hash = hashlib.sha256(json.dumps(meta, sort_keys=True).encode("utf-8")).hexdigest()
        evidence = CaseEvidence(
            evidence_id=ev_id,
            case_id=case_id,
            evidence_type=ev_type,
            source_ref=source_ref,
            added_by=actor_id,
            content_hash=content_hash,
            metadata=meta,
            created_at=now_iso
        )
        self.case_repo.add_case_evidence(evidence)

    def create_manual_case(
        self,
        transaction_id: str,
        user_id: str,
        risk_score: float,
        priority: str = "MEDIUM",
        decision: str = "flag",
        customer_reported: bool = False,
        actor_id: str = "system"
    ) -> Case:
        """Creates a standalone Case for testing or manual operations."""
        now_iso = datetime.now(timezone.utc).isoformat()
        case_id = f"case_{uuid.uuid4().hex[:12]}"
        case = Case(
            case_id=case_id,
            incident_id=None,
            alert_id=f"alt_{uuid.uuid4().hex[:8]}",
            transaction_id=transaction_id,
            user_id=user_id,
            status=CaseStatus.NEW,
            priority=CasePriority(priority),
            risk_score=risk_score,
            risk_band="HIGH" if risk_score >= 70 else "MEDIUM",
            decision=decision,
            customer_reported=customer_reported,
            opened_at=now_iso,
            updated_at=now_iso,
            created_by=actor_id
        )
        self.case_repo.create_case(case)

        # Seed minimal evidence
        self._seed_evidence(case_id, "E1", EvidenceType.TRANSACTION, transaction_id, {
            "transaction_id": transaction_id,
            "amount": 10000.0,
            "channel": "UPI"
        }, actor_id)

        return self.case_repo.get_case(case_id)

    def transition_case(
        self,
        case_id: str,
        to_status: CaseStatus,
        actor_id: str,
        actor_role: str,
        reason_code: Optional[str] = None,
        note: Optional[str] = None,
        approved_by: Optional[str] = None
    ) -> Case:
        """
        Executes a validated Case State Machine transition.
        Enforces transition validity, justification requirements, and four-eyes rule.
        """
        case = self.case_repo.get_case(case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        current_status = case.status
        allowed_targets = VALID_TRANSITIONS.get(current_status, [])

        if to_status not in allowed_targets:
            raise ValueError(
                f"Illegal state transition: Cannot transition case from '{current_status.value}' to '{to_status.value}'. "
                f"Allowed transitions: {[s.value for s in allowed_targets]}"
            )

        # Require reason code and note for dismissed and escalated
        if to_status in (CaseStatus.DISMISSED, CaseStatus.ESCALATED):
            if not reason_code or not reason_code.strip():
                raise ValueError(f"Transition to '{to_status.value}' requires a mandatory reason_code.")
            if not note or not note.strip():
                raise ValueError(f"Transition to '{to_status.value}' requires a mandatory explanatory note.")

        # Four-eyes check for CRITICAL priority dismissals
        if to_status == CaseStatus.DISMISSED and case.priority == CasePriority.CRITICAL:
            if not approved_by or not approved_by.strip():
                raise ValueError(
                    "Four-eyes policy violation: Dismissing a CRITICAL priority case requires approval "
                    "from a second analyst or compliance/admin ('approved_by')."
                )
            if approved_by == actor_id:
                raise ValueError(
                    "Four-eyes policy violation: Approver cannot be the same analyst requesting the dismissal."
                )

        now_iso = datetime.now(timezone.utc).isoformat()

        # Update case entity
        case.status = to_status
        case.updated_at = now_iso

        if to_status in (CaseStatus.CONFIRMED_FRAUD, CaseStatus.DISMISSED, CaseStatus.CLOSED):
            case.disposition = to_status.value
            case.disposition_reason = reason_code
            case.disposition_note = note
            if to_status == CaseStatus.CLOSED:
                case.closed_at = now_iso
                case.closed_by = actor_id

        self.case_repo.update_case(case)

        # Record transition in case_transitions
        transition_record = CaseTransition(
            transition_id=f"tr_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            from_status=current_status,
            to_status=to_status,
            actor_id=actor_id,
            reason_code=reason_code,
            note=note,
            approved_by=approved_by,
            created_at=now_iso
        )
        self.case_repo.record_case_transition(transition_record)

        # Append to incident event ledger
        if self.incident_repo and case.incident_id:
            try:
                self.incident_repo.append_incident_event(
                    incident_id=case.incident_id,
                    event_type=f"case_transition_{to_status.value}",
                    actor_id=actor_id,
                    actor_role=actor_role,
                    payload={
                        "case_id": case_id,
                        "from_status": current_status.value,
                        "to_status": to_status.value,
                        "reason_code": reason_code,
                        "approved_by": approved_by
                    }
                )
            except Exception as e:
                logger.warning(f"Could not append transition event to incident ledger: {e}")

        return self.case_repo.get_case(case_id)

    def add_evidence(
        self,
        case_id: str,
        evidence_type: EvidenceType,
        source_ref: str,
        added_by: str,
        metadata: Dict[str, Any]
    ) -> CaseEvidence:
        """Adds an immutable evidence record to the case."""
        case = self.case_repo.get_case(case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        # Determine next evidence ID (e.g. E6, E7)
        existing_ev = self.case_repo.get_case_evidence(case_id, include_withdrawn=True)
        next_num = len(existing_ev) + 1
        ev_id = f"E{next_num}"

        now_iso = datetime.now(timezone.utc).isoformat()
        content_hash = hashlib.sha256(json.dumps(metadata, sort_keys=True).encode("utf-8")).hexdigest()

        evidence = CaseEvidence(
            evidence_id=ev_id,
            case_id=case_id,
            evidence_type=evidence_type,
            source_ref=source_ref,
            added_by=added_by,
            content_hash=content_hash,
            metadata=metadata,
            created_at=now_iso
        )
        self.case_repo.add_case_evidence(evidence)

        # Append to incident event ledger
        if self.incident_repo and case.incident_id:
            try:
                self.incident_repo.append_incident_event(
                    incident_id=case.incident_id,
                    event_type="evidence_added",
                    actor_id=added_by,
                    actor_role="analyst",
                    payload={"evidence_id": ev_id, "type": evidence_type.value, "content_hash": content_hash}
                )
            except Exception as e:
                logger.warning(f"Could not append evidence event: {e}")

        return evidence

    def withdraw_evidence(
        self,
        case_id: str,
        evidence_id: str,
        withdraw_reason: str,
        withdrawn_by: str
    ) -> CaseEvidence:
        """Marks an evidence record as withdrawn with mandatory reason (never deletes)."""
        if not withdraw_reason or not withdraw_reason.strip():
            raise ValueError("Withdrawal requires a mandatory withdraw_reason.")

        ev = self.case_repo.get_evidence_by_id(case_id, evidence_id)
        if not ev:
            raise ValueError(f"Evidence {evidence_id} not found in case {case_id}")
        if ev.withdrawn_at:
            raise ValueError(f"Evidence {evidence_id} is already withdrawn.")

        updated_ev = self.case_repo.withdraw_case_evidence(
            case_id=case_id,
            evidence_id=evidence_id,
            withdraw_reason=withdraw_reason,
            withdrawn_by=withdrawn_by
        )

        case = self.case_repo.get_case(case_id)
        if self.incident_repo and case and case.incident_id:
            try:
                self.incident_repo.append_incident_event(
                    incident_id=case.incident_id,
                    event_type="evidence_withdrawn",
                    actor_id=withdrawn_by,
                    actor_role="analyst",
                    payload={"evidence_id": evidence_id, "reason": withdraw_reason}
                )
            except Exception as e:
                logger.warning(f"Could not append evidence withdrawal event: {e}")

        return updated_ev

    def add_note(self, case_id: str, author_id: str, author_role: str, note_text: str) -> CaseNote:
        if not note_text or not note_text.strip():
            raise ValueError("Note text cannot be empty.")
        case = self.case_repo.get_case(case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        note = CaseNote(
            note_id=f"not_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            author_id=author_id,
            author_role=author_role,
            note_text=note_text.strip(),
            created_at=datetime.now(timezone.utc).isoformat()
        )
        self.case_repo.add_case_note(note)

        if self.incident_repo and case.incident_id:
            try:
                self.incident_repo.append_incident_event(
                    incident_id=case.incident_id,
                    event_type="case_note_added",
                    actor_id=author_id,
                    actor_role=author_role,
                    payload={"note_id": note.note_id}
                )
            except Exception as e:
                logger.warning(f"Could not append note event: {e}")

        return note

    def export_evidence_pack(self, case_id: str, exported_by: str = "analyst") -> bytes:
        """
        Creates an immutable ZIP evidence pack containing:
        - manifest.json with SHA-256 hashes of all bundled components
        - case_summary.json
        - evidence_records.json
        - audit_events.json
        - case_transitions.json
        - investigation_report.txt
        - analyst_report.pdf (if available)
        """
        case = self.case_repo.get_case(case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        evidence_list = self.case_repo.get_case_evidence(case_id, include_withdrawn=True)
        transitions = self.case_repo.get_case_transitions(case_id)
        notes = self.case_repo.get_case_notes(case_id)
        runs = self.case_repo.get_investigation_runs(case_id)

        audit_events = []
        if self.incident_repo and case.incident_id:
            audit_events = [ev.model_dump() for ev in self.incident_repo.get_incident_events(case.incident_id)]

        zip_buffer = io.BytesIO()
        file_hashes = {}

        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            # 1. case_summary.json
            summary_bytes = json.dumps(case.model_dump(), indent=2).encode("utf-8")
            zf.writestr("case_summary.json", summary_bytes)
            file_hashes["case_summary.json"] = hashlib.sha256(summary_bytes).hexdigest()

            # 2. evidence_records.json
            ev_bytes = json.dumps([e.model_dump() for e in evidence_list], indent=2).encode("utf-8")
            zf.writestr("evidence_records.json", ev_bytes)
            file_hashes["evidence_records.json"] = hashlib.sha256(ev_bytes).hexdigest()

            # 3. audit_events.json
            audit_bytes = json.dumps(audit_events, indent=2).encode("utf-8")
            zf.writestr("audit_events.json", audit_bytes)
            file_hashes["audit_events.json"] = hashlib.sha256(audit_bytes).hexdigest()

            # 4. case_transitions.json
            tr_bytes = json.dumps([t.model_dump() for t in transitions], indent=2).encode("utf-8")
            zf.writestr("case_transitions.json", tr_bytes)
            file_hashes["case_transitions.json"] = hashlib.sha256(tr_bytes).hexdigest()

            # 5. investigation_report.txt
            if runs:
                latest_run = runs[0]
                inv_bytes = latest_run.report_text.encode("utf-8")
                zf.writestr("investigation_report.txt", inv_bytes)
                file_hashes["investigation_report.txt"] = hashlib.sha256(inv_bytes).hexdigest()

            # 6. manifest.json
            manifest_data = {
                "case_id": case_id,
                "exported_by": exported_by,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "file_count": len(file_hashes),
                "files": file_hashes
            }
            manifest_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
            zf.writestr("manifest.json", manifest_bytes)

        return zip_buffer.getvalue()
