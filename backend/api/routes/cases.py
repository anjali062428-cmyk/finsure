"""
FinSure Case Investigation & Evidence Management API Endpoints
Implements Case creation, state machine transitions, evidence collection & withdrawal,
unified timeline, FinSure Investigator orchestration, claim validation,
kNN case similarity, audit chain verification, and ZIP evidence pack export.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response

from backend.models.auth import User
from backend.models.case import (
    Case, CaseStatus, CasePriority, EvidenceType,
    CaseEvidence, CaseTransition, CaseNote, InvestigationRun,
    ClaimValidationResult
)
from backend.api.schemas.case import (
    CaseCreateRequest, CaseTransitionRequest, CaseEvidenceAddRequest,
    CaseEvidenceWithdrawRequest, CaseNoteRequest, InvestigateRequest,
    ClaimValidationApiRequest, CaseWorkspaceResponse
)
from backend.services.case_service import CaseService
from backend.services.investigator_service import FinSureInvestigatorService
from backend.services.claim_validator import ClaimValidator
from backend.api.dependencies.auth import get_current_user, require_role
from backend.api.dependencies.case import (
    get_case_service, get_investigator_service, get_case_repo, get_tool_sandbox
)
from backend.services.tool_sandbox import InvestigatorToolSandbox

router = APIRouter(prefix="/api/v1/cases", tags=["Case Investigation"])


@router.post("", response_model=Case, status_code=status.HTTP_201_CREATED)
async def create_case(
    req: CaseCreateRequest,
    current_user: User = Depends(get_current_user),
    service: CaseService = Depends(get_case_service)
):
    """
    Creates a new canonical Case.
    Supported by analysts/admins or customers reporting suspicious transactions ("Not me" fast path).
    """
    try:
        if req.incident_id:
            # If customer creates, verify ownership
            case = service.create_case_from_incident(
                incident_id=req.incident_id,
                customer_reported=req.customer_reported,
                actor_id=current_user.user_id
            )
            if current_user.role == "customer" and case.user_id != current_user.user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this incident.")
            return case
        elif req.transaction_id:
            user_id = req.user_id or current_user.user_id
            if current_user.role == "customer" and user_id != current_user.user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create case for another user.")
            case = service.create_manual_case(
                transaction_id=req.transaction_id,
                user_id=user_id,
                risk_score=req.risk_score or 50.0,
                priority=req.priority or "MEDIUM",
                decision=req.decision or "flag",
                customer_reported=req.customer_reported,
                actor_id=current_user.user_id
            )
            return case
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either incident_id or transaction_id must be provided."
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[Case])
async def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    assigned_to: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    case_repo = Depends(get_case_repo)
):
    """
    Lists cases with optional status/priority filtering.
    Customer role is strictly isolated to their own cases.
    """
    user_filter = current_user.user_id if current_user.role == "customer" else None
    cases, _ = case_repo.list_cases(
        status=status_filter,
        priority=priority_filter,
        assigned_to=assigned_to,
        user_id=user_filter,
        limit=limit,
        offset=offset
    )
    return cases


@router.get("/{case_id}", response_model=CaseWorkspaceResponse)
async def get_case_workspace(
    case_id: str,
    current_user: User = Depends(get_current_user),
    case_repo = Depends(get_case_repo)
):
    """
    Retrieves full Case Workspace payload:
    Case entity, Evidence items, State Transitions, Notes, and latest Investigator Run.
    """
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    if current_user.role == "customer" and case.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this case.")

    evidence = case_repo.get_case_evidence(case_id, include_withdrawn=True)
    transitions = case_repo.get_case_transitions(case_id)
    notes = case_repo.get_case_notes(case_id)
    runs = case_repo.get_investigation_runs(case_id)
    latest_run = runs[0] if runs else None

    return CaseWorkspaceResponse(
        case=case,
        evidence=evidence,
        transitions=transitions,
        notes=notes,
        latest_investigation=latest_run
    )


@router.post("/{case_id}/transition", response_model=Case)
async def transition_case_state(
    case_id: str,
    req: CaseTransitionRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: CaseService = Depends(get_case_service)
):
    """
    Executes a Case State Machine transition.
    Enforces valid transition paths, mandatory justification reasons, and four-eyes policy.
    """
    try:
        updated_case = service.transition_case(
            case_id=case_id,
            to_status=req.to_status,
            actor_id=current_user.user_id,
            actor_role=current_user.role,
            reason_code=req.reason_code,
            note=req.note,
            approved_by=req.approved_by
        )
        return updated_case
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{case_id}/evidence", response_model=List[CaseEvidence])
async def list_case_evidence(
    case_id: str,
    include_withdrawn: bool = Query(False),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    case_repo = Depends(get_case_repo)
):
    """Lists evidence items registered for a case."""
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    return case_repo.get_case_evidence(case_id, include_withdrawn=include_withdrawn)


@router.post("/{case_id}/evidence", response_model=CaseEvidence, status_code=status.HTTP_201_CREATED)
async def add_case_evidence(
    case_id: str,
    req: CaseEvidenceAddRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: CaseService = Depends(get_case_service)
):
    """Adds an immutable evidence record to a case."""
    try:
        evidence = service.add_evidence(
            case_id=case_id,
            evidence_type=req.evidence_type,
            source_ref=req.source_ref,
            added_by=current_user.user_id,
            metadata=req.metadata
        )
        return evidence
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{case_id}/evidence/{evidence_id}/withdraw", response_model=CaseEvidence)
async def withdraw_case_evidence(
    case_id: str,
    evidence_id: str,
    req: CaseEvidenceWithdrawRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: CaseService = Depends(get_case_service)
):
    """Marks an evidence record as withdrawn with a mandatory reason (never deletes)."""
    try:
        evidence = service.withdraw_evidence(
            case_id=case_id,
            evidence_id=evidence_id,
            withdraw_reason=req.withdraw_reason,
            withdrawn_by=current_user.user_id
        )
        return evidence
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{case_id}/notes", response_model=List[CaseNote])
async def get_case_notes(
    case_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    case_repo = Depends(get_case_repo)
):
    """Retrieves notes for a case."""
    return case_repo.get_case_notes(case_id)


@router.post("/{case_id}/notes", response_model=CaseNote, status_code=status.HTTP_201_CREATED)
async def add_case_note(
    case_id: str,
    req: CaseNoteRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: CaseService = Depends(get_case_service)
):
    """Adds an analyst note to a case."""
    try:
        note = service.add_note(
            case_id=case_id,
            author_id=current_user.user_id,
            author_role=current_user.role,
            note_text=req.note_text
        )
        return note
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{case_id}/timeline")
async def get_case_timeline(
    case_id: str,
    current_user: User = Depends(get_current_user),
    case_repo = Depends(get_case_repo),
    sandbox: InvestigatorToolSandbox = Depends(get_tool_sandbox)
):
    """Unified chronological timeline combining incident events, transitions, and evidence updates."""
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    if current_user.role == "customer" and case.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this timeline.")

    timeline = sandbox.execute_tool("get_timeline", case_id=case_id)
    return {"case_id": case_id, "timeline": timeline}


@router.post("/{case_id}/investigate", response_model=InvestigationRun)
async def run_case_investigation(
    case_id: str,
    req: InvestigateRequest = InvestigateRequest(),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    investigator_service: FinSureInvestigatorService = Depends(get_investigator_service)
):
    """
    Executes the FinSure Investigator (Plan -> Examine -> Report).
    Strictly read-only, non-autonomous, evidence-grounded.
    """
    try:
        run = investigator_service.investigate_case(
            case_id=case_id,
            provider_name=req.provider
        )
        return run
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{case_id}/investigations/{run_id}", response_model=InvestigationRun)
async def get_investigation_run(
    case_id: str,
    run_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    case_repo = Depends(get_case_repo)
):
    """Retrieves a historical investigation run."""
    run = case_repo.get_investigation_run_by_id(run_id)
    if not run or run.case_id != case_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Investigation run {run_id} not found.")
    return run


@router.post("/{case_id}/claim-validation", response_model=ClaimValidationResult)
async def validate_case_claims(
    case_id: str,
    req: ClaimValidationApiRequest,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    case_repo = Depends(get_case_repo)
):
    """Validates arbitrary text claims against the case evidence store."""
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    evidence_list = case_repo.get_case_evidence(case_id, include_withdrawn=False)
    result = ClaimValidator.validate_report_claims(req.claim_text, evidence_list)
    return result


@router.get("/{case_id}/similar")
async def get_similar_cases(
    case_id: str,
    top_k: int = Query(3, ge=1, le=10),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    case_repo = Depends(get_case_repo),
    sandbox: InvestigatorToolSandbox = Depends(get_tool_sandbox)
):
    """Returns nearest historical cases using deterministic kNN."""
    similar = sandbox.execute_tool("get_similar_cases", case_id=case_id, limit=top_k)
    return {
        "case_id": case_id,
        "similar_cases": similar,
        "attribution_disclaimer": "Statistical similarity across historical embeddings; not causal proof of fraud."
    }


@router.get("/{case_id}/audit")
async def get_case_audit_trail(
    case_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    case_repo = Depends(get_case_repo),
    sandbox: InvestigatorToolSandbox = Depends(get_tool_sandbox)
):
    """Returns cryptographic hash-chained audit events for the case."""
    timeline = sandbox.execute_tool("get_timeline", case_id=case_id)
    transitions = case_repo.get_case_transitions(case_id)
    return {
        "case_id": case_id,
        "audit_events": timeline,
        "state_transitions": [t.model_dump() for t in transitions]
    }


@router.get("/{case_id}/audit/verify")
async def verify_case_audit_trail(
    case_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    sandbox: InvestigatorToolSandbox = Depends(get_tool_sandbox)
):
    """Verifies the SHA-256 hash-chain integrity of the case event ledger."""
    verify_result = sandbox.execute_tool("verify_audit_chain", case_id=case_id)
    return verify_result


@router.get("/{case_id}/evidence-pack")
async def download_evidence_pack(
    case_id: str,
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: CaseService = Depends(get_case_service)
):
    """Generates and returns an immutable ZIP evidence pack with SHA-256 manifest."""
    try:
        zip_bytes = service.export_evidence_pack(case_id=case_id, exported_by=current_user.user_id)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=evidence_pack_{case_id}.zip",
                "X-Case-ID": case_id
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
