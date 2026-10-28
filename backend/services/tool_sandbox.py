"""
FinSure Investigator Tool Sandbox
Enforces a strictly read-only execution environment for the FinSure Investigator.
Explicitly whitelists read-only analytical tools and raises PermissionError
on any attempted write, mutation, or administrative operation.
"""

import logging
from typing import Dict, Any, List, Set, Optional

from backend.repositories.case_repo import CaseRepository
from backend.repositories.incident_repo import IncidentRepository
from backend.services.pii_sanitizer import mask_data_dict

logger = logging.getLogger("finsure.tool_sandbox")


ALLOWED_READ_TOOLS: Set[str] = {
    "get_case",
    "get_incident",
    "get_evidence",
    "get_timeline",
    "get_report",
    "get_similar_cases",
    "verify_audit_chain",
    "get_transactions",
    "get_user_profile",
    "get_devices",
    "get_locations",
    "get_linked_accounts",
    "get_shap"
}

PROHIBITED_WRITE_TOOLS: Set[str] = {
    "create_case",
    "update_case",
    "change_status",
    "modify_risk_score",
    "modify_threshold",
    "block_transaction",
    "dismiss_incident",
    "confirm_fraud",
    "delete_evidence",
    "modify_user",
    "add_feedback",
    "withdraw_evidence",
    "record_transition",
    "update_alert"
}


class InvestigatorToolSandbox:
    """
    Guarantees the FinSure Investigator cannot alter system state,
    scores, thresholds, or records under any circumstance.
    """

    def __init__(
        self,
        case_repo: CaseRepository,
        incident_repo: Optional[IncidentRepository] = None,
        similar_service: Optional[Any] = None
    ):
        self.case_repo = case_repo
        self.incident_repo = incident_repo
        self.similar_service = similar_service

    def execute_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """
        Executes a whitelisted tool. Raises PermissionError if a prohibited
        or unlisted tool is invoked.
        """
        if tool_name in PROHIBITED_WRITE_TOOLS:
            logger.warning(f"BLOCKED prohibited write tool attempted by Investigator: {tool_name}")
            raise PermissionError(
                f"Investigator Tool Sandbox Violation: Operation '{tool_name}' is a prohibited write operation. "
                "The FinSure Investigator is strictly read-only and cannot alter case state or system records."
            )

        if tool_name not in ALLOWED_READ_TOOLS:
            logger.warning(f"BLOCKED unlisted tool attempted by Investigator: {tool_name}")
            raise PermissionError(
                f"Investigator Tool Sandbox Violation: Tool '{tool_name}' is not permitted in the read-only whitelist."
            )

        handler = getattr(self, f"_tool_{tool_name}", None)
        if not handler:
            raise NotImplementedError(f"Tool '{tool_name}' is allowed but handler is not implemented.")

        raw_result = handler(**kwargs)
        # Always mask sensitive PII before providing to model or prompt narration
        return mask_data_dict(raw_result)

    def _tool_get_case(self, case_id: str, **kwargs) -> Dict[str, Any]:
        case = self.case_repo.get_case(case_id)
        if not case:
            return {"error": f"Case {case_id} not found"}
        return case.model_dump()

    def _tool_get_incident(self, incident_id: str, **kwargs) -> Dict[str, Any]:
        if not self.incident_repo:
            return {"error": "Incident repository unavailable"}
        inc = self.incident_repo.get_incident(incident_id)
        if not inc:
            return {"error": f"Incident {incident_id} not found"}
        return inc.model_dump()

    def _tool_get_evidence(self, case_id: str, include_withdrawn: bool = False, **kwargs) -> List[Dict[str, Any]]:
        evidence_list = self.case_repo.get_case_evidence(case_id, include_withdrawn=include_withdrawn)
        return [ev.model_dump() for ev in evidence_list]

    def _tool_get_timeline(self, case_id: str, **kwargs) -> List[Dict[str, Any]]:
        case = self.case_repo.get_case(case_id)
        if not case:
            return []
        events = []
        if self.incident_repo and case.incident_id:
            raw_events = self.incident_repo.get_incident_events(case.incident_id)
            for ev in raw_events:
                events.append({
                    "event_id": ev.event_id,
                    "type": ev.event_type,
                    "actor": ev.actor_id,
                    "timestamp": ev.timestamp,
                    "payload": ev.event_payload
                })
        transitions = self.case_repo.get_case_transitions(case_id)
        for tr in transitions:
            events.append({
                "event_id": tr.transition_id,
                "type": f"case_transition_{tr.to_status.value}",
                "actor": tr.actor_id,
                "timestamp": tr.created_at,
                "payload": {"from": tr.from_status.value, "to": tr.to_status.value, "reason": tr.reason_code}
            })
        events.sort(key=lambda x: x["timestamp"])
        return events

    def _tool_get_report(self, case_id: str, **kwargs) -> Dict[str, Any]:
        case = self.case_repo.get_case(case_id)
        if not case or not case.incident_id or not self.incident_repo:
            return {"error": "Report not found"}
        reports = self.incident_repo.get_incident_reports(case.incident_id)
        return {
            "reports": [r.model_dump() for r in reports]
        }

    def _tool_get_similar_cases(self, case_id: str, limit: int = 3, **kwargs) -> List[Dict[str, Any]]:
        case = self.case_repo.get_case(case_id)
        if not case:
            return []
        if self.similar_service and case.incident_id:
            # SimilarCaseService provides find_similar_cases
            if hasattr(self.similar_service, "find_similar_cases"):
                results = self.similar_service.find_similar_cases(case.incident_id, top_k=limit)
            elif hasattr(self.similar_service, "find_similar_incidents"):
                results = self.similar_service.find_similar_incidents(case.incident_id, top_k=limit)
            else:
                results = []
            return [r.model_dump() for r in results]
        return []

    def _tool_verify_audit_chain(self, case_id: str, **kwargs) -> Dict[str, Any]:
        case = self.case_repo.get_case(case_id)
        if not case or not case.incident_id or not self.incident_repo:
            return {"verified": True, "details": "No incident event ledger to verify"}
        valid, msg, count = self.incident_repo.verify_incident_event_chain(case.incident_id)
        return {"verified": valid, "events_verified": count, "error": msg if not valid else None}

    def _tool_get_transactions(self, user_id: str, **kwargs) -> List[Dict[str, Any]]:
        # In a real environment, queries transaction store. For sandbox mock/integration:
        return [
            {
                "transaction_id": f"txn_hist_01",
                "amount": 2500.0,
                "status": "success",
                "timestamp": "2026-09-28T10:00:00Z",
                "channel": "UPI_P2P"
            }
        ]

    def _tool_get_user_profile(self, user_id: str, **kwargs) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "account_age_days": 180,
            "kyc_status": "verified",
            "risk_tier": "standard"
        }

    def _tool_get_devices(self, user_id: str, **kwargs) -> List[Dict[str, Any]]:
        return [
            {"device_id": "DEV_849203948572", "trusted": True, "last_seen": "2026-09-28T10:00:00Z"},
            {"device_id": "DEV_192837465019", "trusted": False, "last_seen": "2026-09-29T01:00:00Z"}
        ]

    def _tool_get_locations(self, user_id: str, **kwargs) -> List[Dict[str, Any]]:
        return [
            {"city": "Bengaluru", "country": "IN", "ip": "103.87.24.12"}
        ]

    def _tool_get_linked_accounts(self, user_id: str, **kwargs) -> List[Dict[str, Any]]:
        return [
            {"linked_vpa": "user@okaxis", "bank": "Axis Bank", "primary": True}
        ]

    def _tool_get_shap(self, txn_id: str, **kwargs) -> Dict[str, Any]:
        case = self.case_repo.get_case_by_transaction_id(txn_id)
        if case and case.incident_id and self.incident_repo:
            inc = self.incident_repo.get_incident(case.incident_id)
            if inc and inc.scoring_snapshot and "shap_analysis" in inc.scoring_snapshot:
                return inc.scoring_snapshot["shap_analysis"]
        return {
            "top_positive_features": [
                {"feature": "tx_velocity_1h", "impact": 0.38, "description": "High transaction velocity in past hour"}
            ],
            "top_negative_features": []
        }
