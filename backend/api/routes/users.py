"""
FinSure User Management API Endpoints
Provides administrative directory inspection, user search, account status modification,
and RBAC role governance.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from backend.api.schemas.user import (
    UserListResponse, UserSummaryResponse,
    UpdateUserStatusRequest, UpdateUserRoleRequest
)
from backend.api.schemas.auth import GenericActionResponse
from backend.models.auth import User
from backend.services.auth_service import AuthService
from backend.api.dependencies.auth import get_auth_service, get_current_user, require_role

router = APIRouter(prefix="/api/v1/users", tags=["User Governance & Directory"])


def _extract_meta(request: Request):
    ip = request.client.host if request.client else "127.0.0.1"
    req_id = request.headers.get("X-Request-ID")
    return ip, req_id


@router.get("", response_model=UserListResponse)
async def list_users(
    request: Request,
    role: Optional[str] = Query(None, description="Filter by role"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by account status"),
    search: Optional[str] = Query(None, description="Search by name, email, phone, or ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role(["admin", "compliance_officer"])),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Lists registered users with filtering and pagination (Admin & Compliance)."""
    ip, req_id = _extract_meta(request)
    users, total = auth_service.list_users(
        role=role,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset,
        actor_id=current_user.user_id,
        request_id=req_id,
        ip=ip
    )

    summaries = [
        UserSummaryResponse(
            user_id=u.user_id,
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            role=u.role,
            email_verified=u.email_verified,
            phone_verified=u.phone_verified,
            account_status=u.account_status,
            created_at=u.created_at,
            last_login_at=u.last_login_at
        ) for u in users
    ]

    return UserListResponse(
        users=summaries,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/{user_id}", response_model=UserSummaryResponse)
async def get_user_detail(
    user_id: str,
    current_user: User = Depends(require_role(["admin", "compliance_officer"])),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Retrieves single user profile by ID."""
    target = auth_service.auth_repo.get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    return UserSummaryResponse(
        user_id=target.user_id,
        full_name=target.full_name,
        email=target.email,
        phone=target.phone,
        role=target.role,
        email_verified=target.email_verified,
        phone_verified=target.phone_verified,
        account_status=target.account_status,
        created_at=target.created_at,
        last_login_at=target.last_login_at
    )


@router.patch("/{user_id}/status", response_model=UserSummaryResponse)
async def update_user_status(
    user_id: str,
    req: UpdateUserStatusRequest,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Updates account status (active, suspended, locked). Admin only."""
    ip, req_id = _extract_meta(request)
    try:
        updated = auth_service.update_user_status(
            target_user_id=user_id,
            new_status=req.status,
            actor_id=current_user.user_id,
            request_id=req_id,
            ip=ip
        )
        return UserSummaryResponse(
            user_id=updated.user_id,
            full_name=updated.full_name,
            email=updated.email,
            phone=updated.phone,
            role=updated.role,
            email_verified=updated.email_verified,
            phone_verified=updated.phone_verified,
            account_status=updated.account_status,
            created_at=updated.created_at,
            last_login_at=updated.last_login_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{user_id}/role", response_model=UserSummaryResponse)
async def update_user_role(
    user_id: str,
    req: UpdateUserRoleRequest,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Updates user RBAC role. Admin only."""
    ip, req_id = _extract_meta(request)
    try:
        updated = auth_service.update_user_role(
            target_user_id=user_id,
            new_role=req.role,
            actor_id=current_user.user_id,
            request_id=req_id,
            ip=ip
        )
        return UserSummaryResponse(
            user_id=updated.user_id,
            full_name=updated.full_name,
            email=updated.email,
            phone=updated.phone,
            role=updated.role,
            email_verified=updated.email_verified,
            phone_verified=updated.phone_verified,
            account_status=updated.account_status,
            created_at=updated.created_at,
            last_login_at=updated.last_login_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

