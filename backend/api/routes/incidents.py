"""
FinSure Incident Management & Response API Endpoints
Implements incident creation, state transitions, forensic replay,
dual PDF report generation, report verification, audit trail queries, and feedback.
Enforces strict server-side RBAC across Customer, Analyst, Compliance Officer, and Admin.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response

from backend.models.auth import User
from backend.models.incident import IncidentStatus, IncidentPriority
from backend.api.schemas.incident import (
    IncidentCreateRequest, IncidentTransitionRequest, IncidentNoteRequest,
    AnalystFeedbackRequest, ReportVerifyRequest, IncidentResponse,
    AuditVerifyResponse
)
from backend.services.incident_service import IncidentService
from backend.services.replay_service import ThreatReplayService
from backend.services.report_service import IncidentReportService
from backend.services.similarity_service import SimilarCaseService
from backend.api.dependencies.auth import get_current_user, require_role
from backend.api.dependencies.incident import (
    get_incident_service, get_replay_service,
    get_report_service, get_similarity_service
)

router = APIRouter(prefix="/api/v1/incidents", tags=["Incident Management"])


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    req: IncidentCreateRequest,
    current_user: User = Depends(require_role(["admin", "fraud_analyst", "analyst"])),
    service: IncidentService = Depends(get_incident_service)
):
    """Creates a new incident record and initializes the cryptographic ledger chain."""
    try:
        inc = service.create_incident_from_scoring(
            transaction_id=req.transaction_id,
            user_id=req.user_id,
            risk_score=req.risk_score,
            risk_probability=req.risk_probability,
            risk_band=req.risk_band,
            decision=req.decision,
            scam_type=req.scam_type,
            scoring_snapshot=req.scoring_snapshot,
            actor_id=current_user.user_id,
            actor_role=current_user.role
        )
        return inc
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    service: IncidentService = Depends(get_incident_service)
):
    """
    Lists incidents.
    Customer Role: Strictly isolated to own incidents.
    Analyst/Compliance/Admin: Can query across all incidents.
    """
    user_filter = current_user.user_id if current_user.role == "customer" else None
    incidents = service.repo.list_incidents(
        user_id=user_filter,
        status=status_filter,
        priority=priority_filter,
        limit=limit,
        offset=offset
    )
    return incidents


@router.get("/{incident_id}", response_model=Dict[str, Any])
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    service: IncidentService = Depends(get_incident_service)
):
    """Retrieves incident details with customer ownership validation."""
    inc = service.repo.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident '{incident_id}' not found.")

    # Customer Isolation Boundary
    if current_user.role == "customer" and inc.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to view another user's incident."
        )

    # Return sanitized data for customer, full forensic data for analysts
    data = inc.model_dump()
    if current_user.role == "customer":
        # Remove internal ML snapshots and model weights
        data.pop("scoring_snapshot", None)
    return data


@router.post("/{incident_id}/transition", response_model=IncidentResponse)
async def transition_incident(
    incident_id: str,
    req: IncidentTransitionRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "admin"])),
    service: IncidentService = Depends(get_incident_service)
):
    """Executes a validated state transition with mandatory justifications and audit logging."""
    try:
        new_status = IncidentStatus(req.new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target status '{req.new_status}'. Allowed: {[s.value for s in IncidentStatus]}."
        )

    try:
        updated = service.transition_status(
            incident_id=incident_id,
            new_status=new_status,
            actor_id=current_user.user_id,
            actor_role=current_user.role,
            reason=req.reason,
            notes=req.notes,
            assigned_to=req.assigned_to
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{incident_id}/replay", response_model=Dict[str, Any])
async def threat_replay(
    incident_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    replay_svc: ThreatReplayService = Depends(get_replay_service)
):
    """Returns chronological forensic timeline reconstructed from recorded ledger events."""
    try:
        return replay_svc.build_replay_timeline(incident_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{incident_id}/report/customer")
async def download_customer_report(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    report_svc: IncidentReportService = Depends(get_report_service)
):
    """Generates and downloads customer-safe PDF report."""
    incident = report_svc.repo.get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    if current_user.role == "customer" and incident.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to report.")

    try:
        pdf_bytes, record = report_svc.generate_customer_report(incident_id)
        headers = {
            "Content-Disposition": f"attachment; filename=FinSure_Customer_Report_{incident_id}.pdf",
            "X-Report-ID": record.report_id,
            "X-Content-SHA256": record.content_hash
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{incident_id}/report/analyst")
async def download_analyst_report(
    incident_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    report_svc: IncidentReportService = Depends(get_report_service)
):
    """Generates and downloads full forensic Analyst Evidence Pack PDF."""
    try:
        pdf_bytes, record = report_svc.generate_analyst_report(incident_id, generator_role=current_user.role)
        headers = {
            "Content-Disposition": f"attachment; filename=FinSure_Analyst_Evidence_{incident_id}.pdf",
            "X-Report-ID": record.report_id,
            "X-Content-SHA256": record.content_hash
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{incident_id}/report/verify", response_model=Dict[str, Any])
async def verify_report_hash(
    incident_id: str,
    req: ReportVerifyRequest,
    current_user: User = Depends(get_current_user),
    report_svc: IncidentReportService = Depends(get_report_service)
):
    """Cryptographically verifies a candidate PDF hash against stored metadata."""
    is_valid, msg = report_svc.verify_report_hash(incident_id, req.report_type, req.candidate_hash)
    return {"incident_id": incident_id, "report_type": req.report_type, "verified": is_valid, "message": msg}


@router.get("/{incident_id}/audit", response_model=AuditVerifyResponse)
async def get_incident_audit_trail(
    incident_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: IncidentService = Depends(get_incident_service)
):
    """Verifies cryptographic hash chain and returns complete immutable audit trail."""
    inc = service.repo.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    is_valid, msg, count = service.repo.verify_incident_event_chain(incident_id)
    events = service.repo.get_incident_events(incident_id)

    return AuditVerifyResponse(
        incident_id=incident_id,
        chain_valid=is_valid,
        message=msg,
        verified_event_count=count,
        events=[ev.model_dump() for ev in events]
    )


@router.post("/{incident_id}/notes", response_model=Dict[str, Any])
async def add_incident_note(
    incident_id: str,
    req: IncidentNoteRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "admin"])),
    service: IncidentService = Depends(get_incident_service)
):
    """Appends an investigative note and logs an audit ledger event."""
    try:
        note = service.add_note(
            incident_id=incident_id,
            author_id=current_user.user_id,
            author_role=current_user.role,
            note_text=req.note_text
        )
        return {"success": True, "note_id": note.note_id, "message": "Investigator note logged."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{incident_id}/feedback", response_model=Dict[str, Any])
async def submit_analyst_feedback(
    incident_id: str,
    req: AnalystFeedbackRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "admin"])),
    service: IncidentService = Depends(get_incident_service)
):
    """Submits ground-truth feedback for future MLOps retraining and executes state transitions."""
    try:
        feedback = service.submit_feedback(
            incident_id=incident_id,
            analyst_id=current_user.user_id,
            verdict=req.verdict,
            notes=req.notes,
            scam_type_corrected=req.scam_type_corrected,
            evidence_references=req.evidence_references
        )
        return {
            "success": True,
            "feedback_id": feedback.feedback_id,
            "verdict": feedback.verdict,
            "message": "Analyst feedback recorded in tamper-evident ledger."
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{incident_id}/similar", response_model=List[Dict[str, Any]])
async def get_similar_incidents(
    incident_id: str,
    top_k: int = Query(3, ge=1, le=10),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    sim_svc: SimilarCaseService = Depends(get_similarity_service)
):
    """Retrieves top-k statistically similar reference cases via deterministic kNN."""
    try:
        results = sim_svc.find_similar_cases(incident_id, top_k=top_k)
        return [r.model_dump() for r in results]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
