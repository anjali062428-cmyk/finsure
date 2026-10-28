"""
FinSure Authentication & Authorization Domain Models
Defines domain entities for users, credentials, OTP tokens, sessions, and audit entries.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class User(BaseModel):
    user_id: str
    full_name: str
    email: str
    phone: str
    password_hash: str
    role: str = "customer"  # customer, fraud_analyst, compliance_officer, admin
    email_verified: bool = False
    phone_verified: bool = False
    account_status: str = "pending_verification"  # pending_verification, active, suspended, locked
    failed_login_count: int = 0
    locked_until: Optional[str] = None
    created_at: str
    updated_at: str
    last_login_at: Optional[str] = None


class OTPRecord(BaseModel):
    otp_id: str
    user_id: Optional[str] = None
    identifier: str  # email or phone
    channel: str  # email or phone
    purpose: str  # registration_email, registration_phone, login_email, login_phone, password_reset, step_up
    code_hash: str
    salt: str
    attempts: int = 0
    max_attempts: int = 5
    expires_at: str
    used_at: Optional[str] = None
    created_at: str


class RefreshTokenRecord(BaseModel):
    jti: str
    user_id: str
    token_hash: str
    device_id: Optional[str] = None
    expires_at: str
    revoked_at: Optional[str] = None
    created_at: str


class StepUpChallenge(BaseModel):
    challenge_id: str
    user_id: str
    transaction_id: Optional[str] = None
    otp_id: str
    verified: bool = False
    expires_at: str
    created_at: str


class AuthAuditLog(BaseModel):
    id: Optional[int] = None
    event_id: str
    actor_id: Optional[str] = None
    event_type: str
    channel: Optional[str] = None
    status: str  # success, failure
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    reason_category: Optional[str] = None
    metadata_json: Optional[str] = None
    timestamp: str
