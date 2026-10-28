"""
FinSure Authentication & Authorization API Endpoints
Implements registration, multi-factor verification, password & passwordless login,
session token rotation, step-up challenges, password resets, and RBAC guards.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response

from backend.api.schemas.auth import (
    RegisterRequest, RegisterResponse,
    VerifyEmailRequest, VerifyPhoneRequest, GenericActionResponse,
    LoginPasswordRequest, RequestOTPRequest, LoginOTPRequest, AuthTokenResponse,
    RefreshTokenRequest, LogoutRequest,
    PasswordResetRequest, PasswordResetConfirmRequest,
    StepUpRequest, StepUpChallengeResponse, StepUpVerifyRequest, StepUpVerifyResponse,
    UserProfileResponse
)
from backend.models.auth import User
from backend.services.auth_service import AuthService
from backend.api.dependencies.auth import get_auth_service, get_current_user, require_role

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Access Control"])


def _extract_meta(request: Request):
    ip = request.client.host if request.client else "127.0.0.1"
    req_id = request.headers.get("X-Request-ID")
    return ip, req_id


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Registers a new user account and initiates email and phone verification."""
    ip, req_id = _extract_meta(request)
    try:
        user = auth_service.register_user(
            full_name=req.full_name,
            email=req.email,
            phone=req.phone,
            password=req.password,
            role=req.role or "customer",
            request_id=req_id,
            ip=ip
        )
        return RegisterResponse(
            user_id=user.user_id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            role=user.role,
            account_status=user.account_status,
            message="Registration successful. Verification codes have been sent to your email and phone."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-email", response_model=GenericActionResponse)
async def verify_email(req: VerifyEmailRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Verifies user's email address with 6-digit OTP."""
    ip, req_id = _extract_meta(request)
    try:
        auth_service.verify_email(req.email, req.otp, request_id=req_id, ip=ip)
        return GenericActionResponse(success=True, message="Email address verified successfully.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-phone", response_model=GenericActionResponse)
async def verify_phone(req: VerifyPhoneRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Verifies user's mobile number with 6-digit OTP."""
    ip, req_id = _extract_meta(request)
    try:
        auth_service.verify_phone(req.phone, req.otp, request_id=req_id, ip=ip)
        return GenericActionResponse(success=True, message="Phone number verified successfully.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthTokenResponse)
async def login(req: LoginPasswordRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Authenticates via email/phone and password, returning access and refresh JWTs."""
    ip, req_id = _extract_meta(request)
    try:
        res = auth_service.login_with_password(
            identifier=req.identifier,
            password=req.password,
            device_id=req.device_id,
            request_id=req_id,
            ip=ip
        )
        return AuthTokenResponse(**res)
    except ValueError as e:
        err_msg = str(e)
        if "locked" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err_msg)


@router.post("/otp/request", response_model=GenericActionResponse)
async def request_otp(req: RequestOTPRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Requests a single-use OTP for passwordless login or verification."""
    ip, req_id = _extract_meta(request)
    success, msg = auth_service.request_otp_login(req.identifier, req.channel, request_id=req_id, ip=ip)
    if not success and "wait" in msg.lower():
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=msg)
    return GenericActionResponse(success=success, message=msg)


@router.post("/otp/verify", response_model=AuthTokenResponse)
async def verify_otp_login(req: LoginOTPRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Authenticates using single-use OTP code."""
    ip, req_id = _extract_meta(request)
    try:
        res = auth_service.login_with_otp(
            identifier=req.identifier,
            otp=req.otp,
            device_id=req.device_id,
            request_id=req_id,
            ip=ip
        )
        return AuthTokenResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh_token(req: RefreshTokenRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Rotates refresh token and issues a new access token."""
    ip, req_id = _extract_meta(request)
    try:
        res = auth_service.refresh_session(req.refresh_token, request_id=req_id, ip=ip)
        return AuthTokenResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=GenericActionResponse)
async def logout(req: LogoutRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Revokes active refresh token and terminates session."""
    ip, req_id = _extract_meta(request)
    auth_service.logout(req.refresh_token, request_id=req_id, ip=ip)
    return GenericActionResponse(success=True, message="Successfully logged out.")


@router.post("/password-reset/request", response_model=GenericActionResponse)
async def password_reset_request(req: PasswordResetRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Requests a password reset code."""
    ip, req_id = _extract_meta(request)
    success, msg = auth_service.request_password_reset(req.identifier, req.channel, request_id=req_id, ip=ip)
    return GenericActionResponse(success=success, message=msg)


@router.post("/password-reset/confirm", response_model=GenericActionResponse)
async def password_reset_confirm(req: PasswordResetConfirmRequest, request: Request, auth_service: AuthService = Depends(get_auth_service)):
    """Validates reset code and establishes new password."""
    ip, req_id = _extract_meta(request)
    try:
        success, msg = auth_service.confirm_password_reset(req.identifier, req.otp, req.new_password, request_id=req_id, ip=ip)
        return GenericActionResponse(success=success, message=msg)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/step-up/request", response_model=StepUpChallengeResponse)
async def step_up_request(
    req: StepUpRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Triggers step-up 2FA authentication challenge for high-risk transactions."""
    ip, req_id = _extract_meta(request)
    try:
        challenge_id, msg = auth_service.initiate_step_up_challenge(
            user_id=current_user.user_id,
            transaction_id=req.transaction_id,
            channel=req.channel,
            request_id=req_id,
            ip=ip
        )
        return StepUpChallengeResponse(challenge_id=challenge_id, message=msg)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/step-up/verify", response_model=StepUpVerifyResponse)
async def step_up_verify(
    req: StepUpVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Verifies step-up OTP and returns short-lived step-up authorization token."""
    ip, req_id = _extract_meta(request)
    success, msg, token = auth_service.verify_step_up_challenge(
        user_id=current_user.user_id,
        challenge_id=req.challenge_id,
        otp=req.otp,
        request_id=req_id,
        ip=ip
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return StepUpVerifyResponse(success=True, message=msg, step_up_token=token)


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile of currently authenticated user."""
    return UserProfileResponse(
        user_id=current_user.user_id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        email_verified=current_user.email_verified,
        phone_verified=current_user.phone_verified,
        account_status=current_user.account_status
    )


# -------------------------------------------------------------
# Protected RBAC Test Endpoints
# -------------------------------------------------------------
@router.get("/protected/customer-only", response_model=GenericActionResponse)
async def customer_protected_endpoint(user: User = Depends(require_role(["customer"]))):
    return GenericActionResponse(success=True, message=f"Authorized customer access for {user.user_id}")


@router.get("/protected/analyst-only", response_model=GenericActionResponse)
async def analyst_protected_endpoint(user: User = Depends(require_role(["fraud_analyst", "analyst"]))):
    return GenericActionResponse(success=True, message=f"Authorized analyst access for {user.user_id}")


@router.get("/protected/compliance-only", response_model=GenericActionResponse)
async def compliance_protected_endpoint(user: User = Depends(require_role(["compliance_officer"]))):
    return GenericActionResponse(success=True, message=f"Authorized compliance access for {user.user_id}")


@router.get("/protected/admin-only", response_model=GenericActionResponse)
async def admin_protected_endpoint(user: User = Depends(require_role(["admin"]))):
    return GenericActionResponse(success=True, message=f"Authorized admin access for {user.user_id}")
