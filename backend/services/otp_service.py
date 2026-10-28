"""
FinSure OTP Subsystem & Safe Delivery Adapters
Enforces 6-digit cryptographically secure OTP, 5-minute expiration, hashed storage,
single-use invalidation, max-attempts limit, 60s resend cooldown, and safe testing delivery.
"""

import uuid
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone, timedelta

from backend.models.auth import OTPRecord
from backend.repositories.auth_repo import AuthRepository
from backend.services.crypto_service import CryptoService
from backend.core.config import config

logger = logging.getLogger("finsure.otp")


class NotificationAdapter(ABC):
    """Abstract interface for notification dispatching (email/SMS)."""

    @abstractmethod
    def send_email(self, recipient: str, subject: str, message: str, raw_otp_for_test: Optional[str] = None):
        pass

    @abstractmethod
    def send_sms(self, recipient: str, message: str, raw_otp_for_test: Optional[str] = None):
        pass


class TestNotificationAdapter(NotificationAdapter):
    """
    In-memory safe delivery adapter for dev and automated test suites.
    Never prints raw OTP to console logs; stores internally for programmatic assertion.
    """

    def __init__(self):
        self.outbox: List[Dict[str, Any]] = []

    def send_email(self, recipient: str, subject: str, message: str, raw_otp_for_test: Optional[str] = None):
        masked = self._mask_identifier(recipient)
        logger.info(f"Dispatched verification email to {masked}")
        self.outbox.append({
            "channel": "email",
            "recipient": recipient,
            "subject": subject,
            "message": message,
            "raw_otp": raw_otp_for_test,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    def send_sms(self, recipient: str, message: str, raw_otp_for_test: Optional[str] = None):
        masked = self._mask_identifier(recipient)
        logger.info(f"Dispatched verification SMS to {masked}")
        self.outbox.append({
            "channel": "phone",
            "recipient": recipient,
            "message": message,
            "raw_otp": raw_otp_for_test,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    def get_latest_otp(self, recipient: str, purpose: Optional[str] = None) -> Optional[str]:
        """Test helper to safely retrieve latest OTP without leaking into logs."""
        clean_recip = recipient.lower().strip()
        for item in reversed(self.outbox):
            if item["recipient"].lower().strip() == clean_recip:
                return item["raw_otp"]
        return None

    def clear(self):
        self.outbox.clear()

    @staticmethod
    def _mask_identifier(identifier: str) -> str:
        if "@" in identifier:
            parts = identifier.split("@")
            user = parts[0]
            masked_user = user[:2] + "***" if len(user) > 2 else "***"
            return f"{masked_user}@{parts[1]}"
        if len(identifier) > 4:
            return f"***{identifier[-4:]}"
        return "***"


class OTPService:
    """Coordinates OTP generation, rate limiting, hashing, storage, and verification."""

    def __init__(
        self,
        auth_repo: AuthRepository,
        crypto_service: CryptoService,
        adapter: Optional[NotificationAdapter] = None
    ):
        self.auth_repo = auth_repo
        self.crypto_service = crypto_service
        self.adapter = adapter or TestNotificationAdapter()

    def generate_and_send_otp(
        self,
        identifier: str,
        channel: str,
        purpose: str,
        user_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Generates and securely dispatches a single-use OTP.
        Enforces 60-second cooldown per identifier + purpose.
        Returns: (success: bool, message: str, otp_id: Optional[str])
        """
        now = datetime.now(timezone.utc)
        clean_identifier = identifier.strip().lower()

        # Cooldown verification
        latest_otp = self.auth_repo.get_latest_otp(clean_identifier, purpose)
        if latest_otp:
            created_at = datetime.fromisoformat(latest_otp.created_at)
            cooldown_remaining = config.OTP_RESEND_COOLDOWN_SECONDS - (now - created_at).total_seconds()
            if cooldown_remaining > 0:
                return (
                    False,
                    f"Please wait {int(cooldown_remaining)} seconds before requesting a new OTP.",
                    None
                )

        # Generate cryptographic OTP and salt
        raw_otp = self.crypto_service.generate_secure_otp(config.OTP_LENGTH)
        salt = self.crypto_service.generate_salt()
        code_hash = self.crypto_service.hash_otp(raw_otp, salt)

        expires_at = (now + timedelta(seconds=config.OTP_EXPIRE_SECONDS)).isoformat()
        otp_id = f"otp_{uuid.uuid4().hex[:12]}"

        record = OTPRecord(
            otp_id=otp_id,
            user_id=user_id,
            identifier=clean_identifier,
            channel=channel,
            purpose=purpose,
            code_hash=code_hash,
            salt=salt,
            attempts=0,
            max_attempts=config.OTP_MAX_ATTEMPTS,
            expires_at=expires_at,
            used_at=None,
            created_at=now.isoformat()
        )
        self.auth_repo.save_otp(record)

        # Dispatch via safe notification adapter
        subject = f"FinSure Verification Code [{purpose}]"
        message = f"Your FinSure verification code is: {raw_otp}. Valid for 5 minutes. Never share this code."

        if channel == "email":
            self.adapter.send_email(clean_identifier, subject, message, raw_otp_for_test=raw_otp)
        else:
            self.adapter.send_sms(clean_identifier, message, raw_otp_for_test=raw_otp)

        return True, "Verification code sent successfully.", otp_id

    def verify_otp(
        self,
        identifier: str,
        purpose: str,
        candidate_otp: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Validates candidate OTP against stored hash.
        Enforces single-use, max attempts, and expiration.
        Returns: (is_valid: bool, status_message: str, user_id: Optional[str])
        """
        now = datetime.now(timezone.utc)
        clean_identifier = identifier.strip().lower()
        latest = self.auth_repo.get_latest_otp(clean_identifier, purpose)

        if not latest:
            return False, "No active verification request found for this identifier.", None

        if latest.used_at is not None:
            return False, "This verification code has already been used.", None

        expires_at = datetime.fromisoformat(latest.expires_at)
        if now > expires_at:
            return False, "This verification code has expired. Please request a new one.", None

        if latest.attempts >= latest.max_attempts:
            return False, "Maximum verification attempts exceeded. Please request a new code.", None

        # Increment attempts counter
        new_attempts = self.auth_repo.increment_otp_attempts(latest.otp_id)

        # Verify candidate code
        expected_hash = self.crypto_service.hash_otp(candidate_otp.strip(), latest.salt)
        if expected_hash != latest.code_hash:
            remaining = latest.max_attempts - new_attempts
            return False, f"Invalid verification code. {max(0, remaining)} attempts remaining.", None

        # Success - Mark as used immediately (single-use enforcement)
        self.auth_repo.mark_otp_used(latest.otp_id, now.isoformat())
        return True, "Verification successful.", latest.user_id
