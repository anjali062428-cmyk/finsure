"""
FinSure Authentication & Authorization API Request/Response Schemas
Strict Pydantic models with input sanitation and validation.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full legal name of the user")
    email: str = Field(..., min_length=5, max_length=255, description="Valid email address")
    phone: str = Field(..., min_length=10, max_length=20, description="Mobile number with country code, e.g. +919876543210")
    password: str = Field(..., min_length=8, description="Strong account password")
    role: Optional[str] = Field("customer", description="Account role (customer, fraud_analyst, compliance_officer, admin)")


class RegisterResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    phone: str
    role: str
    account_status: str
    message: str


class VerifyEmailRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class VerifyPhoneRequest(BaseModel):
    phone: str = Field(..., description="Registered phone number")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class GenericActionResponse(BaseModel):
    success: bool
    message: str


class LoginPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Registered email address or phone number")
    password: str = Field(..., description="Account password")
    device_id: Optional[str] = Field(None, description="Optional client device fingerprint ID")


class RequestOTPRequest(BaseModel):
    identifier: str = Field(..., description="Registered email or phone")
    channel: str = Field("phone", description="Channel to receive OTP ('email' or 'phone')")


class LoginOTPRequest(BaseModel):
    identifier: str = Field(..., description="Registered email or phone")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    device_id: Optional[str] = Field(None, description="Optional client device fingerprint ID")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Active session refresh token")


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token to revoke")


class PasswordResetRequest(BaseModel):
    identifier: str = Field(..., description="Registered email or phone")
    channel: str = Field("email", description="Channel to receive reset code ('email' or 'phone')")


class PasswordResetConfirmRequest(BaseModel):
    identifier: str = Field(..., description="Registered email or phone")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    new_password: str = Field(..., min_length=8, description="New strong password")


class StepUpRequest(BaseModel):
    transaction_id: Optional[str] = Field(None, description="Transaction ID requiring step-up authentication")
    channel: str = Field("phone", description="Channel to receive step-up OTP ('phone' or 'email')")


class StepUpChallengeResponse(BaseModel):
    challenge_id: str
    message: str


class StepUpVerifyRequest(BaseModel):
    challenge_id: str = Field(..., description="Active challenge ID returned by step-up request")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class StepUpVerifyResponse(BaseModel):
    success: bool
    message: str
    step_up_token: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    phone: str
    role: str
    email_verified: bool
    phone_verified: bool
    account_status: str


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Optional[Dict[str, Any]] = None
