"""
FinSure Analyst Alert Queue API Endpoints
Provides deterministic triage, filtering, and priority-based sorting for fraud alerts.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from backend.models.auth import User
from backend.api.schemas.incident import AlertQueueItem
from backend.services.incident_service import IncidentService
from backend.api.dependencies.auth import require_role
from backend.api.dependencies.incident import get_incident_service

router = APIRouter(prefix="/api/v1/alerts", tags=["Analyst Alert Queue"])

PRIORITY_RANK = {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 3,
    "LOW": 4
}


@router.get("", response_model=List[AlertQueueItem])
async def list_alerts(
    priority: Optional[str] = Query(None, description="Filter by priority (CRITICAL, HIGH, MEDIUM, LOW)"),
    status: Optional[str] = Query(None, description="Filter by status (new, under_investigation, escalated...)"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned analyst"),
    scam_type: Optional[str] = Query(None, description="Filter by scam classification"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: IncidentService = Depends(get_incident_service)
):
    """
    Returns prioritized fraud alert queue.
    Deterministic sorting: Priority (CRITICAL > HIGH > MEDIUM > LOW), Risk Score DESC, SLA Due Time ASC.
    """
    incidents = service.repo.list_incidents(
        status=status,
        priority=priority,
        limit=1000
    )

    if assigned_to:
        incidents = [inc for inc in incidents if inc.assigned_to == assigned_to]
    if scam_type:
        incidents = [inc for inc in incidents if inc.scam_type == scam_type]

    # Deterministic multi-key sort
    def sort_key(inc):
        p_rank = PRIORITY_RANK.get(inc.priority.value, 99)
        score_rank = -inc.risk_score
        sla_str = inc.sla_due_at or "9999-99-99"
        return (p_rank, score_rank, sla_str)

    incidents.sort(key=sort_key)
    paged = incidents[offset: offset + limit]

    return [
        AlertQueueItem(
            incident_id=inc.incident_id,
            transaction_id=inc.transaction_id,
            user_id=inc.user_id,
            priority=inc.priority.value,
            risk_score=inc.risk_score,
            status=inc.status.value,
            scam_type=inc.scam_type,
            created_at=inc.created_at,
            sla_due_at=inc.sla_due_at,
            assigned_to=inc.assigned_to
        )
        for inc in paged
    ]
