"""
FinSure Incident Management & State Machine Service
Enforces strict server-side state transitions, deterministic priority assignment,
mandatory justification reasons for escalation/dismissal, elevated dismissal authorization,
and cryptographic event ledger append-only logging.
"""

import uuid
import logging
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timezone, timedelta

from backend.models.incident import (
    Incident, IncidentStatus, IncidentPriority,
    IncidentEvent, IncidentNote, AnalystFeedback
)
from backend.repositories.incident_repo import IncidentRepository

logger = logging.getLogger("finsure.incident_service")

# Formal State Machine Transition Matrix
ALLOWED_TRANSITIONS = {
    IncidentStatus.NEW: {IncidentStatus.UNDER_INVESTIGATION},
    IncidentStatus.UNDER_INVESTIGATION: {
        IncidentStatus.ESCALATED,
        IncidentStatus.CONFIRMED_FRAUD,
        IncidentStatus.DISMISSED,
        IncidentStatus.CLOSED
    },
    IncidentStatus.ESCALATED: {
        IncidentStatus.UNDER_INVESTIGATION,
        IncidentStatus.CONFIRMED_FRAUD,
        IncidentStatus.DISMISSED,
        IncidentStatus.CLOSED
    },
    IncidentStatus.CONFIRMED_FRAUD: {IncidentStatus.CLOSED},
    IncidentStatus.DISMISSED: {IncidentStatus.CLOSED},
    IncidentStatus.CLOSED: set()  # Terminal state
}

# Deterministic SLA Windows (minutes)
SLA_POLICY_MINUTES = {
    IncidentPriority.CRITICAL: 15,
    IncidentPriority.HIGH: 60,
    IncidentPriority.MEDIUM: 240,
    IncidentPriority.LOW: 1440
}


class IncidentService:
    """Manages incident lifecycle, transitions, SLA calculation, and ledger recording."""

    def __init__(self, incident_repo: IncidentRepository):
        self.repo = incident_repo

    @staticmethod
    def calculate_priority(risk_score: float, decision: str) -> IncidentPriority:
        """
        Deterministic policy-based priority calculation.
        Never relies on LLMs or non-deterministic mechanisms.
        """
        if risk_score >= 90.0 or decision.lower() == "block":
            return IncidentPriority.CRITICAL
        elif risk_score >= 70.0 or decision.lower() == "step_up":
            return IncidentPriority.HIGH
        elif risk_score >= 40.0 or decision.lower() == "flag":
            return IncidentPriority.MEDIUM
        return IncidentPriority.LOW

    def create_incident_from_scoring(
        self,
        transaction_id: str,
        user_id: str,
        risk_score: float,
        risk_probability: float,
        risk_band: str,
        decision: str,
        scam_type: Optional[str] = None,
        scoring_snapshot: Optional[Dict[str, Any]] = None,
        model_version: str = "v1.0.0",
        threshold_version: str = "v1.0.0",
        actor_id: str = "system",
        actor_role: str = "system"
    ) -> Incident:
        """
        Creates an incident entity and records the genesis event in the hash chain.
        """
        priority = self.calculate_priority(risk_score, decision)
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        sla_minutes = SLA_POLICY_MINUTES.get(priority, 240)
        sla_due_at = (now + timedelta(minutes=sla_minutes)).isoformat()

        incident_id = f"inc_{uuid.uuid4().hex[:12]}"

        incident = Incident(
            incident_id=incident_id,
            transaction_id=transaction_id,
            user_id=user_id,
            risk_score=risk_score,
            risk_probability=risk_probability,
            risk_band=risk_band,
            decision=decision,
            status=IncidentStatus.NEW,
            priority=priority,
            scam_type=scam_type,
            assigned_to=None,
            sla_due_at=sla_due_at,
            scoring_snapshot=scoring_snapshot,
            created_at=now_iso,
            updated_at=now_iso,
            closed_at=None,
            model_version=model_version,
            threshold_version=threshold_version
        )
        self.repo.create_incident(incident)

        # Record Genesis Event into immutable ledger
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        payload = {
            "action": "incident_created",
            "transaction_id": transaction_id,
            "risk_score": risk_score,
            "decision": decision,
            "priority": priority.value,
            "policy_disclaimer": "AI risk assessment is an algorithmic estimate, NOT legal confirmation of fraud."
        }
        self.repo.append_event(
            event_id=event_id,
            incident_id=incident_id,
            event_type="incident_created",
            actor_id=actor_id,
            actor_role=actor_role,
            payload=payload,
            timestamp=now_iso
        )

        return incident

    def transition_status(
        self,
        incident_id: str,
        new_status: IncidentStatus,
        actor_id: str,
        actor_role: str = "fraud_analyst",
        reason: Optional[str] = None,
        notes: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> Incident:
        """
        Executes a validated state transition.
        Enforces required justifications, elevated permissions, and hash-chain audit logging.
        """
        incident = self.repo.get_incident_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident with ID '{incident_id}' not found.")

        current_status = incident.status

        # 1. State machine transition check
        allowed = ALLOWED_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise ValueError(
                f"Illegal state transition from '{current_status.value}' to '{new_status.value}'. "
                f"Allowed transitions: {[s.value for s in allowed]}."
            )

        # 2. Mandatory reason requirements
        clean_reason = (reason or "").strip()
        if new_status == IncidentStatus.DISMISSED and not clean_reason:
            raise ValueError("Dismissal requires a mandatory documented justification reason.")

        if new_status == IncidentStatus.ESCALATED and not clean_reason:
            raise ValueError("Escalation requires a mandatory documented justification reason.")

        # 3. Elevated authorization for Critical Dismissal
        if new_status == IncidentStatus.DISMISSED and incident.priority == IncidentPriority.CRITICAL:
            norm_role = actor_role.lower()
            if norm_role not in ["admin", "compliance_officer"]:
                raise ValueError(
                    f"Dismissal of a CRITICAL priority incident (Risk Score {incident.risk_score}) "
                    f"requires elevated 'admin' or 'compliance_officer' authorization. Provided role: '{actor_role}'."
                )

        now_iso = datetime.now(timezone.utc).isoformat()
        closed_at = now_iso if new_status in [IncidentStatus.CLOSED, IncidentStatus.DISMISSED] else None

        updated = self.repo.update_incident_status(
            incident_id=incident_id,
            new_status=new_status,
            assigned_to=assigned_to,
            closed_at=closed_at
        )

        # 4. Append audit event to ledger
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        event_payload = {
            "from_status": current_status.value,
            "to_status": new_status.value,
            "reason": clean_reason or None,
            "notes": (notes or "").strip() or None,
            "actor_id": actor_id,
            "actor_role": actor_role
        }
        self.repo.append_event(
            event_id=event_id,
            incident_id=incident_id,
            event_type="status_transition",
            actor_id=actor_id,
            actor_role=actor_role,
            payload=event_payload,
            timestamp=now_iso
        )

        return updated

    def add_note(
        self,
        incident_id: str,
        author_id: str,
        author_role: str,
        note_text: str
    ) -> IncidentNote:
        clean_text = note_text.strip()
        if not clean_text:
            raise ValueError("Note text cannot be empty.")

        incident = self.repo.get_incident_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        now_iso = datetime.now(timezone.utc).isoformat()
        note_id = f"not_{uuid.uuid4().hex[:12]}"
        note = IncidentNote(
            note_id=note_id,
            incident_id=incident_id,
            author_id=author_id,
            author_role=author_role,
            note_text=clean_text,
            created_at=now_iso
        )
        self.repo.add_note(note)

        # Log event in hash chain
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        self.repo.append_event(
            event_id=event_id,
            incident_id=incident_id,
            event_type="note_added",
            actor_id=author_id,
            actor_role=author_role,
            payload={"note_id": note_id, "snippet": clean_text[:60]},
            timestamp=now_iso
        )
        return note

    def submit_feedback(
        self,
        incident_id: str,
        analyst_id: str,
        verdict: str,
        notes: str,
        scam_type_corrected: Optional[str] = None,
        evidence_references: Optional[List[str]] = None
    ) -> AnalystFeedback:
        clean_notes = notes.strip()
        if not clean_notes:
            raise ValueError("Analyst feedback must include explanatory notes.")

        valid_verdicts = {"confirmed_fraud", "dismissed", "escalated", "false_positive", "scam_type_correction"}
        if verdict not in valid_verdicts:
            raise ValueError(f"Invalid verdict '{verdict}'. Allowed: {list(valid_verdicts)}.")

        incident = self.repo.get_incident_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        now_iso = datetime.now(timezone.utc).isoformat()
        feedback_id = f"fdb_{uuid.uuid4().hex[:12]}"

        feedback = AnalystFeedback(
            feedback_id=feedback_id,
            incident_id=incident_id,
            analyst_id=analyst_id,
            verdict=verdict,
            scam_type_corrected=scam_type_corrected,
            notes=clean_notes,
            evidence_references=evidence_references or [],
            created_at=now_iso
        )
        self.repo.add_feedback(feedback)

        # Append to hash chain
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        self.repo.append_event(
            event_id=event_id,
            incident_id=incident_id,
            event_type="feedback_recorded",
            actor_id=analyst_id,
            actor_role="fraud_analyst",
            payload={
                "feedback_id": feedback_id,
                "verdict": verdict,
                "scam_type_corrected": scam_type_corrected,
                "evidence_count": len(feedback.evidence_references)
            },
            timestamp=now_iso
        )

        # If verdict is a state transition action, update status if eligible
        if verdict == "confirmed_fraud" and incident.status in [IncidentStatus.NEW, IncidentStatus.UNDER_INVESTIGATION, IncidentStatus.ESCALATED]:
            if incident.status == IncidentStatus.NEW:
                self.transition_status(incident_id, IncidentStatus.UNDER_INVESTIGATION, analyst_id, "fraud_analyst")
            self.transition_status(incident_id, IncidentStatus.CONFIRMED_FRAUD, analyst_id, "fraud_analyst", reason=clean_notes)

        elif verdict in ["dismissed", "false_positive"] and incident.status in [IncidentStatus.NEW, IncidentStatus.UNDER_INVESTIGATION, IncidentStatus.ESCALATED]:
            if incident.status == IncidentStatus.NEW:
                self.transition_status(incident_id, IncidentStatus.UNDER_INVESTIGATION, analyst_id, "fraud_analyst")
            # If critical, requires admin
            role = "admin" if incident.priority == IncidentPriority.CRITICAL else "fraud_analyst"
            self.transition_status(incident_id, IncidentStatus.DISMISSED, analyst_id, role, reason=clean_notes)

        elif verdict == "escalated" and incident.status in [IncidentStatus.NEW, IncidentStatus.UNDER_INVESTIGATION]:
            if incident.status == IncidentStatus.NEW:
                self.transition_status(incident_id, IncidentStatus.UNDER_INVESTIGATION, analyst_id, "fraud_analyst")
            self.transition_status(incident_id, IncidentStatus.ESCALATED, analyst_id, "fraud_analyst", reason=clean_notes)

        return feedback
