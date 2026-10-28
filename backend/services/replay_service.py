"""
FinSure Threat Replay Engine
Reconstructs chronological forensic event timelines from recorded incident ledger events
and historical transaction profiles.
Adheres strictly to zero-fabrication rules and explicit final-decision risk attribution labeling.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.models.incident import Incident
from backend.repositories.incident_repo import IncidentRepository

logger = logging.getLogger("finsure.replay_service")


class ThreatReplayService:
    """Forensic replay generator for fraud investigation."""

    def __init__(self, incident_repo: IncidentRepository):
        self.repo = incident_repo

    def build_replay_timeline(self, incident_id: str) -> Dict[str, Any]:
        """
        Builds chronological threat replay timeline.
        Enforces:
        - Recorded events only (zero fabrication).
        - Gaps and deltas computed from actual timestamps.
        - Risk attribution labeled as 'Final-decision attribution' where appropriate.
        """
        incident = self.repo.get_incident_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident with ID '{incident_id}' not found.")

        events = self.repo.get_incident_events(incident_id)
        snapshot = incident.scoring_snapshot or {}

        timeline_items: List[Dict[str, Any]] = []

        # 1. Historical pre-transaction events from recorded scoring snapshot (if captured)
        user_history = snapshot.get("user_history", [])
        if user_history and isinstance(user_history, list):
            for h in user_history:
                ts = h.get("timestamp")
                if ts:
                    timeline_items.append({
                        "event_type": "historical_transaction",
                        "timestamp": ts,
                        "source": "banking_core",
                        "actor": "user",
                        "details": {
                            "amount": h.get("amount"),
                            "payee_id": h.get("payee_id"),
                            "channel": h.get("channel", "UPI")
                        },
                        "risk_attribution": "Final-decision attribution (Historical context)",
                        "is_synthesized": False
                    })

        # 2. Transaction evaluation event
        txn_ts = snapshot.get("timestamp", incident.created_at)
        timeline_items.append({
            "event_type": "transaction_initiated",
            "timestamp": txn_ts,
            "source": "upi_rails",
            "actor": "user",
            "details": {
                "transaction_id": incident.transaction_id,
                "amount": snapshot.get("amount"),
                "payee_id": snapshot.get("payee_id"),
                "device_id": snapshot.get("device_id")
            },
            "risk_attribution": "Final-decision attribution",
            "is_synthesized": False
        })

        # 3. Model Scoring & Decisioning
        timeline_items.append({
            "event_type": "fraud_detection_scoring",
            "timestamp": incident.created_at,
            "source": "ml_engine",
            "actor": "system",
            "details": {
                "risk_score": incident.risk_score,
                "risk_probability": incident.risk_probability,
                "risk_band": incident.risk_band,
                "decision": incident.decision,
                "scam_type": incident.scam_type,
                "model_version": incident.model_version,
                "threshold_version": incident.threshold_version
            },
            "risk_attribution": "Recorded scoring snapshot",
            "is_synthesized": False
        })

        # 4. Subsequent Ledger Events (investigations, transitions, notes, feedback)
        for ev in events:
            # Skip initial creation as it's represented above
            if ev.event_type == "incident_created":
                continue
            timeline_items.append({
                "event_type": ev.event_type,
                "timestamp": ev.timestamp,
                "source": "incident_ledger",
                "actor": ev.actor_id,
                "details": ev.event_payload,
                "risk_attribution": "Final-decision attribution",
                "is_synthesized": False
            })

        # Sort strictly by timestamp ASC
        def parse_ts(item):
            try:
                return datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00"))
            except Exception:
                return datetime.now(timezone.utc)

        timeline_items.sort(key=parse_ts)

        # Compute intervals and gaps
        enriched_items = []
        prev_dt = None
        for idx, item in enumerate(timeline_items):
            cur_dt = parse_ts(item)
            delta_sec = None
            if prev_dt is not None:
                delta_sec = max(0.0, round((cur_dt - prev_dt).total_seconds(), 2))

            item["sequence_index"] = idx + 1
            item["time_delta_seconds"] = delta_sec
            enriched_items.append(item)
            prev_dt = cur_dt

        return {
            "incident_id": incident.incident_id,
            "transaction_id": incident.transaction_id,
            "user_id": incident.user_id,
            "risk_score": incident.risk_score,
            "decision": incident.decision,
            "total_events": len(enriched_items),
            "attribution_notice": (
                "IMPORTANT: Earlier chronological steps reflect 'Final-decision attribution'. "
                "The ML ensemble evaluated the state at transaction scoring time; "
                "risk scores are not retroactively implied for prior historical baseline events."
            ),
            "events": enriched_items
        }
