"""
FinSure Comprehensive Authentication & Access Control Service
Orchestrates user registration, multi-channel verification, Argon2id authentication,
passwordless OTP login, session lifecycle management, step-up challenges, and immutable audit logs.
"""

import uuid
import json
import logging
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timezone, timedelta

from backend.models.auth import User, StepUpChallenge, AuthAuditLog
from backend.repositories.auth_repo import AuthRepository
from backend.services.crypto_service import CryptoService
from backend.services.otp_service import OTPService
from backend.services.token_service import TokenService
from backend.core.config import config

logger = logging.getLogger("finsure.auth_service")


class AuthService:
    """Core domain service for FinSure authentication and authorization."""

    def __init__(
        self,
        auth_repo: AuthRepository,
        crypto_service: CryptoService,
        otp_service: OTPService,
        token_service: TokenService
    ):
        self.auth_repo = auth_repo
        self.crypto_service = crypto_service
        self.otp_service = otp_service
        self.token_service = token_service

    # -------------------------------------------------------------
    # Audit Helper
    # -------------------------------------------------------------
    def _log_audit_event(
        self,
        event_type: str,
        status: str,
        actor_id: Optional[str] = None,
        channel: Optional[str] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None,
        reason_category: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        event_id = f"aud_{uuid.uuid4().hex[:16]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        metadata_str = json.dumps(metadata) if metadata else None
        log_entry = AuthAuditLog(
            event_id=event_id,
            actor_id=actor_id,
            event_type=event_type,
            channel=channel,
            status=status,
            ip_address=ip_address,
            request_id=request_id,
            reason_category=reason_category,
            metadata_json=metadata_str,
            timestamp=now_iso
        )
        self.auth_repo.append_audit_log(log_entry)

    # -------------------------------------------------------------
    # Registration Flow
    # -------------------------------------------------------------
    def register_user(
        self,
        full_name: str,
        email: str,
        phone: str,
        password: str,
        role: str = "customer",
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> User:
        """
        Registers a new user with dual-channel (email + phone) pending verification.
        Enforces Argon2id password hashing and rejects weak passwords.
        """
        clean_email = email.lower().strip()
        clean_phone = phone.strip()

        # Validate password strength
        valid, reason = self.crypto_service.validate_password_strength(password)
        if not valid:
            self._log_audit_event("register", "failure", None, "web", ip, request_id, "weak_password")
            raise ValueError(reason)

        # Check existing duplicates
        if self.auth_repo.get_user_by_email(clean_email):
            self._log_audit_event("register", "failure", None, "web", ip, request_id, "duplicate_email")
            raise ValueError("An account with this email address already exists.")

        if self.auth_repo.get_user_by_phone(clean_phone):
            self._log_audit_event("register", "failure", None, "web", ip, request_id, "duplicate_phone")
            raise ValueError("An account with this phone number already exists.")

        # Hash password with Argon2id
        password_hash = self.crypto_service.hash_password(password)

        assigned_role = role if role in config.VALID_ROLES else "customer"
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        user = User(
            user_id=user_id,
            full_name=full_name.strip(),
            email=clean_email,
            phone=clean_phone,
            password_hash=password_hash,
            role=assigned_role,
            email_verified=False,
            phone_verified=False,
            account_status="pending_verification",
            failed_login_count=0,
            locked_until=None,
            created_at=now_iso,
            updated_at=now_iso,
            last_login_at=None
        )
        self.auth_repo.create_user(user)

        # Send initial verification OTPs to both channels
        self.otp_service.generate_and_send_otp(clean_email, "email", "registration_email", user_id=user_id)
        self.otp_service.generate_and_send_otp(clean_phone, "phone", "registration_phone", user_id=user_id)

        self._log_audit_event("register", "success", user_id, "web", ip, request_id, metadata={"role": assigned_role})
        return user

    # -------------------------------------------------------------
    # Verification Endpoints
    # -------------------------------------------------------------
    def verify_email(
        self,
        identifier: str,
        otp: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> User:
        """Verifies email address using single-use OTP."""
        clean_identifier = identifier.strip().lower()
        success, message, _ = self.otp_service.verify_otp(clean_identifier, "registration_email", otp)
        if not success:
            self._log_audit_event("verify_email", "failure", None, "email", ip, request_id, "invalid_otp")
            raise ValueError(message)

        user = self.auth_repo.get_user_by_email(clean_identifier)
        if not user:
            raise ValueError("Associated user account not found.")

        updated = self.auth_repo.update_verification_status(user.user_id, email_verified=True)
        self._log_audit_event("verify_email", "success", user.user_id, "email", ip, request_id)
        return updated

    def verify_phone(
        self,
        identifier: str,
        otp: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> User:
        """Verifies phone number using single-use OTP."""
        clean_identifier = identifier.strip()
        success, message, _ = self.otp_service.verify_otp(clean_identifier, "registration_phone", otp)
        if not success:
            self._log_audit_event("verify_phone", "failure", None, "phone", ip, request_id, "invalid_otp")
            raise ValueError(message)

        user = self.auth_repo.get_user_by_phone(clean_identifier)
        if not user:
            raise ValueError("Associated user account not found.")

        updated = self.auth_repo.update_verification_status(user.user_id, phone_verified=True)
        self._log_audit_event("verify_phone", "success", user.user_id, "phone", ip, request_id)
        return updated

    # -------------------------------------------------------------
    # Password Login Flow
    # -------------------------------------------------------------
    def login_with_password(
        self,
        identifier: str,
        password: str,
        device_id: Optional[str] = None,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Authenticates user with email/phone and password.
        Guards against timing attacks, brute force, and account lockout.
        """
        generic_error = "Invalid credentials. Please verify your email/phone and password."
        clean_identifier = identifier.strip()

        user = self.auth_repo.get_user_by_identifier(clean_identifier)
        if not user:
            # Constant-time dummy verify to mitigate timing attacks
            self.crypto_service.verify_password(
                "$argon2id$v=19$m=65536,t=2,p=4$dummyhashdummysalt$dummyhashvalue",
                password
            )
            self._log_audit_event("login_password", "failure", None, "web", ip, request_id, "user_not_found")
            raise ValueError(generic_error)

        # Check account lockout
        now = datetime.now(timezone.utc)
        if user.locked_until:
            locked_until = datetime.fromisoformat(user.locked_until)
            if now < locked_until:
                remaining_mins = max(1, int((locked_until - now).total_seconds() / 60))
                self._log_audit_event("login_password", "failure", user.user_id, "web", ip, request_id, "locked")
                raise ValueError(
                    f"Account is temporarily locked due to multiple failed login attempts. "
                    f"Please try again in {remaining_mins} minutes."
                )

        # Check account status
        if user.account_status == "suspended":
            self._log_audit_event("login_password", "failure", user.user_id, "web", ip, request_id, "suspended")
            raise ValueError("Account has been suspended. Please contact customer support.")

        # Verify password with Argon2id
        is_valid = self.crypto_service.verify_password(user.password_hash, password)
        if not is_valid:
            new_failures = self.auth_repo.record_login_failure(
                user.user_id,
                max_failures=config.MAX_FAILED_LOGINS,
                lockout_minutes=config.LOCKOUT_MINUTES
            )
            if new_failures >= config.MAX_FAILED_LOGINS:
                self._log_audit_event("account_lockout", "failure", user.user_id, "web", ip, request_id, "max_failures_exceeded")
                raise ValueError(
                    f"Account locked due to {config.MAX_FAILED_LOGINS} consecutive failed attempts. "
                    f"Please try again in {config.LOCKOUT_MINUTES} minutes."
                )
            self._log_audit_event("login_password", "failure", user.user_id, "web", ip, request_id, "invalid_password")
            raise ValueError(generic_error)

        # Reset failed attempts and record login
        now_iso = now.isoformat()
        self.auth_repo.reset_login_failures(user.user_id, now_iso)

        # Issue JWT tokens
        access_token = self.token_service.create_access_token(user.user_id, user.role)
        refresh_token, _ = self.token_service.create_refresh_token(user.user_id, device_id=device_id)

        self._log_audit_event("login_password", "success", user.user_id, "web", ip, request_id)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "user_id": user.user_id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "email_verified": user.email_verified,
                "phone_verified": user.phone_verified,
                "account_status": user.account_status
            }
        }

    # -------------------------------------------------------------
    # Passwordless OTP Login Flow
    # -------------------------------------------------------------
    def request_otp_login(
        self,
        identifier: str,
        channel: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Requests single-use OTP for passwordless login."""
        clean_identifier = identifier.strip()
        user = self.auth_repo.get_user_by_identifier(clean_identifier)

        # Generic response to prevent identifier enumeration
        if not user:
            return True, "If an active account is associated with this identifier, an OTP has been sent."

        if user.account_status == "suspended":
            return False, "Account has been suspended."

        success, msg, _ = self.otp_service.generate_and_send_otp(
            clean_identifier, channel, "login", user_id=user.user_id
        )
        self._log_audit_event("otp_login_request", "success" if success else "failure", user.user_id, channel, ip, request_id)
        return success, msg

    def login_with_otp(
        self,
        identifier: str,
        otp: str,
        device_id: Optional[str] = None,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """Authenticates user via validated single-use OTP."""
        clean_identifier = identifier.strip()
        success, message, _ = self.otp_service.verify_otp(clean_identifier, "login", otp)
        if not success:
            self._log_audit_event("login_otp", "failure", None, "otp", ip, request_id, "invalid_otp")
            raise ValueError(message)

        user = self.auth_repo.get_user_by_identifier(clean_identifier)
        if not user:
            raise ValueError("User not found.")

        now_iso = datetime.now(timezone.utc).isoformat()
        self.auth_repo.reset_login_failures(user.user_id, now_iso)

        access_token = self.token_service.create_access_token(user.user_id, user.role)
        refresh_token, _ = self.token_service.create_refresh_token(user.user_id, device_id=device_id)

        self._log_audit_event("login_otp", "success", user.user_id, "otp", ip, request_id)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "user_id": user.user_id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "email_verified": user.email_verified,
                "phone_verified": user.phone_verified,
                "account_status": user.account_status
            }
        }

    # -------------------------------------------------------------
    # Session Refresh & Logout
    # -------------------------------------------------------------
    def refresh_session(
        self,
        refresh_token: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """Rotates refresh token and issues fresh access token."""
        try:
            new_access, new_refresh, user_id, role = self.token_service.rotate_refresh_token(refresh_token)
            self._log_audit_event("token_refresh", "success", user_id, "jwt", ip, request_id)
            return {
                "access_token": new_access,
                "refresh_token": new_refresh,
                "token_type": "bearer",
                "expires_in": config.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            }
        except Exception as e:
            self._log_audit_event("token_refresh", "failure", None, "jwt", ip, request_id, str(e))
            raise ValueError(f"Session refresh failed: {e}")

    def logout(
        self,
        refresh_token: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> bool:
        """Revokes refresh token on user sign-out."""
        revoked = self.token_service.revoke_refresh_token(refresh_token)
        self._log_audit_event("logout", "success" if revoked else "failure", user_id, "web", ip, request_id)
        return revoked

    # -------------------------------------------------------------
    # Password Reset Flow
    # -------------------------------------------------------------
    def request_password_reset(
        self,
        identifier: str,
        channel: str = "email",
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Dispatches password reset OTP. Reversible across email or phone."""
        clean_identifier = identifier.strip()
        user = self.auth_repo.get_user_by_identifier(clean_identifier)

        # Generic answer to prevent username enumeration
        if not user:
            return True, "If this identifier is registered, password reset instructions have been sent."

        success, msg, _ = self.otp_service.generate_and_send_otp(
            clean_identifier, channel, "password_reset", user_id=user.user_id
        )
        self._log_audit_event("password_reset_request", "success" if success else "failure", user.user_id, channel, ip, request_id)
        return success, msg

    def confirm_password_reset(
        self,
        identifier: str,
        otp: str,
        new_password: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Verifies OTP and updates account password with Argon2id."""
        clean_identifier = identifier.strip()

        # Validate password strength
        valid, reason = self.crypto_service.validate_password_strength(new_password)
        if not valid:
            self._log_audit_event("password_reset_confirm", "failure", None, "web", ip, request_id, "weak_password")
            raise ValueError(reason)

        # Verify OTP
        success, message, _ = self.otp_service.verify_otp(clean_identifier, "password_reset", otp)
        if not success:
            self._log_audit_event("password_reset_confirm", "failure", None, "web", ip, request_id, "invalid_otp")
            raise ValueError(message)

        user = self.auth_repo.get_user_by_identifier(clean_identifier)
        if not user:
            raise ValueError("User account not found.")

        # Re-hash new password with Argon2id
        new_hash = self.crypto_service.hash_password(new_password)
        self.auth_repo.update_password(user.user_id, new_hash)

        # Revoke all existing refresh sessions for security
        self.auth_repo.revoke_all_user_tokens(user.user_id, datetime.now(timezone.utc).isoformat())

        self._log_audit_event("password_reset_confirm", "success", user.user_id, "web", ip, request_id)
        return True, "Password has been successfully updated. All existing sessions revoked."

    # -------------------------------------------------------------
    # Step-Up Authentication Flow
    # -------------------------------------------------------------
    def initiate_step_up_challenge(
        self,
        user_id: str,
        transaction_id: Optional[str] = None,
        channel: str = "phone",
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Initiates a step-up challenge when transaction decision requires 2FA step-up.
        Dispatches OTP to registered phone/email and returns challenge_id.
        """
        user = self.auth_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found.")

        recipient = user.phone if channel == "phone" else user.email
        success, msg, otp_id = self.otp_service.generate_and_send_otp(
            recipient, channel, "step_up", user_id=user.user_id
        )
        if not success:
            raise ValueError(msg)

        challenge_id = f"chl_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(seconds=config.OTP_EXPIRE_SECONDS)).isoformat()

        challenge = StepUpChallenge(
            challenge_id=challenge_id,
            user_id=user_id,
            transaction_id=transaction_id,
            otp_id=otp_id,
            verified=False,
            expires_at=expires_at,
            created_at=now.isoformat()
        )
        self.auth_repo.save_step_up_challenge(challenge)

        self._log_audit_event(
            "step_up_challenge_initiated", "success", user_id, channel, ip, request_id,
            metadata={"challenge_id": challenge_id, "transaction_id": transaction_id}
        )
        return challenge_id, "Step-up authentication challenge initiated. Verification OTP sent."

    def verify_step_up_challenge(
        self,
        user_id: str,
        challenge_id: str,
        otp: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Verifies step-up OTP and issues a short-lived step-up authorization token (5m).
        Returns: (success: bool, message: str, step_up_token: Optional[str])
        """
        challenge = self.auth_repo.get_step_up_challenge(challenge_id)
        if not challenge or challenge.user_id != user_id:
            self._log_audit_event("step_up_verify", "failure", user_id, "step_up", ip, request_id, "challenge_not_found")
            return False, "Invalid or expired step-up challenge.", None

        if challenge.verified:
            return False, "This challenge has already been verified and consumed.", None

        now = datetime.now(timezone.utc)
        if now > datetime.fromisoformat(challenge.expires_at):
            return False, "Step-up challenge has expired. Please initiate a new challenge.", None

        user = self.auth_repo.get_user_by_id(user_id)
        # Determine channel used
        otp_record = self.auth_repo.get_otp_by_id(challenge.otp_id)
        identifier = otp_record.identifier if otp_record else user.phone

        success, msg, _ = self.otp_service.verify_otp(identifier, "step_up", otp)
        if not success:
            self._log_audit_event("step_up_verify", "failure", user_id, "step_up", ip, request_id, "invalid_otp")
            return False, msg, None

        self.auth_repo.mark_step_up_verified(challenge_id)
        step_up_token = self.token_service.create_step_up_token(user_id, challenge_id)

        self._log_audit_event(
            "step_up_verify", "success", user_id, "step_up", ip, request_id,
            metadata={"challenge_id": challenge_id}
        )
        return True, "Step-up challenge successfully verified.", step_up_token

    # -------------------------------------------------------------
    # Administrative User Governance
    # -------------------------------------------------------------
    def list_users(
        self,
        role: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        actor_id: Optional[str] = None,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Tuple[List[User], int]:
        """Lists registered platform users with filtering and pagination."""
        users, total = self.auth_repo.list_users(
            role=role,
            status=status,
            search=search,
            limit=limit,
            offset=offset
        )
        return users, total

    def update_user_status(
        self,
        target_user_id: str,
        new_status: str,
        actor_id: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> User:
        """Modifies user status (active, suspended, locked). Revokes sessions on suspension."""
        valid_statuses = {"active", "suspended", "locked", "pending_verification"}
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid account status '{new_status}'. Allowed: {list(valid_statuses)}")

        user = self.auth_repo.get_user_by_id(target_user_id)
        if not user:
            raise ValueError(f"User '{target_user_id}' not found.")

        # Guard against admin self-suspension
        if target_user_id == actor_id and new_status == "suspended":
            raise ValueError("Administrators cannot suspend their own active administrative account.")

        updated = self.auth_repo.update_user_status(target_user_id, new_status)

        # If suspended or locked, revoke all existing refresh tokens
        if new_status in ("suspended", "locked"):
            self.auth_repo.revoke_all_user_tokens(target_user_id, datetime.now(timezone.utc).isoformat())

        self._log_audit_event(
            "admin_user_status_update", "success", actor_id, "web", ip, request_id,
            metadata={"target_user_id": target_user_id, "new_status": new_status, "previous_status": user.account_status}
        )
        return updated

    def update_user_role(
        self,
        target_user_id: str,
        new_role: str,
        actor_id: str,
        request_id: Optional[str] = None,
        ip: Optional[str] = None
    ) -> User:
        """Updates user's assigned RBAC role."""
        if new_role not in config.VALID_ROLES:
            raise ValueError(f"Invalid role '{new_role}'. Allowed: {list(config.VALID_ROLES)}")

        user = self.auth_repo.get_user_by_id(target_user_id)
        if not user:
            raise ValueError(f"User '{target_user_id}' not found.")

        # Guard against self-demoting the last admin
        if target_user_id == actor_id and new_role != "admin":
            raise ValueError("Administrators cannot demote their own active administrative role.")

        updated = self.auth_repo.update_user_role(target_user_id, new_role)

        # Revoke tokens to force re-authentication with new claims
        self.auth_repo.revoke_all_user_tokens(target_user_id, datetime.now(timezone.utc).isoformat())

        self._log_audit_event(
            "admin_user_role_update", "success", actor_id, "web", ip, request_id,
            metadata={"target_user_id": target_user_id, "new_role": new_role, "previous_role": user.role}
        )
        return updated
