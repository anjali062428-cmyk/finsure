"""
FinSure Authentication & RBAC Dependencies
Provides FastAPI security dependencies, Bearer token extraction, user validation,
and role-based authorization guards.
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.models.auth import User
from backend.repositories.auth_repo import AuthRepository
from backend.services.crypto_service import CryptoService
from backend.services.otp_service import OTPService, TestNotificationAdapter
from backend.services.token_service import TokenService
from backend.services.auth_service import AuthService

security_bearer = HTTPBearer(auto_error=False)

# Singleton service instances
_auth_repo: Optional[AuthRepository] = None
_crypto_service: Optional[CryptoService] = None
_otp_adapter: Optional[TestNotificationAdapter] = None
_otp_service: Optional[OTPService] = None
_token_service: Optional[TokenService] = None
_auth_service: Optional[AuthService] = None


def get_auth_repo() -> AuthRepository:
    global _auth_repo
    if _auth_repo is None:
        _auth_repo = AuthRepository()
    return _auth_repo


def get_crypto_service() -> CryptoService:
    global _crypto_service
    if _crypto_service is None:
        _crypto_service = CryptoService()
    return _crypto_service


def get_otp_adapter() -> TestNotificationAdapter:
    global _otp_adapter
    if _otp_adapter is None:
        _otp_adapter = TestNotificationAdapter()
    return _otp_adapter


def get_otp_service() -> OTPService:
    global _otp_service
    if _otp_service is None:
        repo = get_auth_repo()
        crypto = get_crypto_service()
        adapter = get_otp_adapter()
        _otp_service = OTPService(repo, crypto, adapter)
    return _otp_service


def get_token_service() -> TokenService:
    global _token_service
    if _token_service is None:
        repo = get_auth_repo()
        crypto = get_crypto_service()
        _token_service = TokenService(repo, crypto)
    return _token_service


def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        repo = get_auth_repo()
        crypto = get_crypto_service()
        otp = get_otp_service()
        token = get_token_service()
        _auth_service = AuthService(repo, crypto, otp, token)
    return _auth_service


def set_custom_auth_service(auth_service: AuthService):
    """Allows test fixtures to inject isolated auth services with in-memory DBs."""
    global _auth_service, _auth_repo, _crypto_service, _otp_service, _token_service
    _auth_service = auth_service
    _auth_repo = auth_service.auth_repo
    _crypto_service = auth_service.crypto_service
    _otp_service = auth_service.otp_service
    _token_service = auth_service.token_service


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    token_service: TokenService = Depends(get_token_service),
    auth_repo: AuthRepository = Depends(get_auth_repo)
) -> User:
    """
    Extracts Bearer token from Authorization header and validates identity.
    Raises HTTP 401 on missing, expired, or invalid credentials.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    try:
        payload = token_service.decode_and_validate_token(token, expected_type="access")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject identifier missing.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = auth_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if user.account_status in ["suspended", "locked"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.account_status}."
        )

    return user


def require_role(allowed_roles: List[str]):
    """
    RBAC dependency factory.
    Verifies user has one of the allowed roles.
    Permits seamless alias compatibility between 'analyst' and 'fraud_analyst'.
    """
    normalized_roles = set(allowed_roles)
    if "fraud_analyst" in normalized_roles:
        normalized_roles.add("analyst")
    if "analyst" in normalized_roles:
        normalized_roles.add("fraud_analyst")

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {list(allowed_roles)}, current role: '{current_user.role}'."
            )
        return current_user

    return role_checker
