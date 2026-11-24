"""
FinSure User Management API Request/Response Schemas
Strict Pydantic models for admin user directory and role governance.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class UserSummaryResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    phone: str
    role: str
    email_verified: bool
    phone_verified: bool
    account_status: str
    created_at: str
    last_login_at: Optional[str] = None


class UserListResponse(BaseModel):
    users: List[UserSummaryResponse]
    total: int
    limit: int
    offset: int


class UpdateUserStatusRequest(BaseModel):
    status: str = Field(..., description="Target status: active, suspended, locked")


class UpdateUserRoleRequest(BaseModel):
    role: str = Field(..., description="Target RBAC role: customer, fraud_analyst, compliance_officer, admin")

