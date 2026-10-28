"""
FinSure Token & Session Management Service
Implements RFC 7519 compliant JWT sessions with short-lived access tokens (15m),
cryptographically rotated refresh tokens (7d), and 5m step-up verification tokens.
"""

import uuid
import logging
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone, timedelta
import jwt

from backend.models.auth import RefreshTokenRecord
from backend.repositories.auth_repo import AuthRepository
from backend.services.crypto_service import CryptoService
from backend.core.config import config

logger = logging.getLogger("finsure.token")


class TokenService:
    """Manages generation, validation, rotation, and revocation of authentication tokens."""

    def __init__(self, auth_repo: AuthRepository, crypto_service: CryptoService):
        self.auth_repo = auth_repo
        self.crypto_service = crypto_service
        self.secret_key = config.JWT_SECRET
        self.algorithm = config.JWT_ALGORITHM

    def create_access_token(self, user_id: str, role: str) -> str:
        """
        Creates a short-lived access token (15-minute lifetime).
        Carries strictly non-PII claims: sub, role, type, jti, iat, exp.
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "role": role,
            "type": "access",
            "jti": f"acc_{uuid.uuid4().hex[:16]}",
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp())
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, user_id: str, device_id: Optional[str] = None) -> Tuple[str, str]:
        """
        Creates a long-lived refresh token (7-day lifetime) and stores its SHA-256 hash in DB.
        Returns: (encoded_token_string, jti)
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
        jti = f"ref_{uuid.uuid4().hex[:16]}"
        payload = {
            "sub": user_id,
            "type": "refresh",
            "jti": jti,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp())
        }
        raw_token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        token_hash = self.crypto_service.hash_token(raw_token)

        # Store in database
        record = RefreshTokenRecord(
            jti=jti,
            user_id=user_id,
            token_hash=token_hash,
            device_id=device_id,
            expires_at=exp.isoformat(),
            revoked_at=None,
            created_at=now.isoformat()
        )
        self.auth_repo.save_refresh_token(record)
        return raw_token, jti

    def create_step_up_token(self, user_id: str, challenge_id: str) -> str:
        """
        Creates a short-lived step-up authorization token (5-minute lifetime)
        confirming high-risk transaction 2FA completion.
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(minutes=config.STEP_UP_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "challenge_id": challenge_id,
            "type": "step_up",
            "jti": f"stp_{uuid.uuid4().hex[:16]}",
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp())
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def decode_and_validate_token(self, token: str, expected_type: str = "access") -> Dict[str, Any]:
        """
        Decodes and verifies token signature and expiration.
        Validates token type assertion.
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"require": ["exp", "iat", "sub", "type"]}
            )
            if payload.get("type") != expected_type:
                raise ValueError(f"Invalid token type: expected '{expected_type}', got '{payload.get('type')}'")
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired.")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid token: {e}")

    def rotate_refresh_token(self, old_refresh_token: str) -> Tuple[str, str, str, str]:
        """
        Validates refresh token against database, marks it as revoked, and issues
        a new access token AND a new rotated refresh token.
        Returns: (new_access_token, new_refresh_token, user_id, role)
        """
        payload = self.decode_and_validate_token(old_refresh_token, expected_type="refresh")
        jti = payload["jti"]
        user_id = payload["sub"]

        # Retrieve stored record
        record = self.auth_repo.get_refresh_token(jti)
        if not record:
            raise ValueError("Refresh token record not found.")

        if record.revoked_at is not None:
            # Possible token reuse attack detected! Revoke all tokens for user as safety measure
            now_iso = datetime.now(timezone.utc).isoformat()
            self.auth_repo.revoke_all_user_tokens(user_id, now_iso)
            logger.warning(f"Replay detected on revoked refresh token {jti} for user {user_id}. All sessions terminated.")
            raise ValueError("Refresh token has already been revoked.")

        now = datetime.now(timezone.utc)
        if now > datetime.fromisoformat(record.expires_at):
            raise ValueError("Refresh token has expired.")

        # Revoke old refresh token
        self.auth_repo.revoke_refresh_token(jti, now.isoformat())

        # Fetch latest user to retrieve role
        user = self.auth_repo.get_user_by_id(user_id)
        if not user or user.account_status != "active":
            raise ValueError("User account is inactive, locked, or suspended.")

        # Issue new token pair
        new_access = self.create_access_token(user.user_id, user.role)
        new_refresh, _ = self.create_refresh_token(user.user_id, device_id=record.device_id)

        return new_access, new_refresh, user.user_id, user.role

    def revoke_refresh_token(self, refresh_token: str) -> bool:
        """Revokes an active refresh token on logout."""
        try:
            payload = self.decode_and_validate_token(refresh_token, expected_type="refresh")
            jti = payload.get("jti")
            if jti:
                self.auth_repo.revoke_refresh_token(jti, datetime.now(timezone.utc).isoformat())
                return True
        except Exception as e:
            logger.debug(f"Refresh token revocation failed: {e}")
        return False
