"""
FinSure Cryptographic Service
Handles Argon2id password hashing, validation, cryptographically secure OTP generation,
and token hashing.
"""

import re
import secrets
import hashlib
import logging
from typing import Tuple, Optional
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from backend.core.config import config

logger = logging.getLogger("finsure.crypto")

# Common weak passwords list to reject
COMMON_PASSWORDS = {
    "password", "password123", "password123!", "admin123", "admin123!", "12345678",
    "123456789", "qwertyuiop", "letmein123", "welcome123", "finsure123", "iloveyou"
}


class CryptoService:
    """Argon2id hashing, secure token generation, and OTP cryptography."""

    def __init__(self):
        self.hasher = PasswordHasher(
            time_cost=config.ARGON2_TIME_COST,
            memory_cost=config.ARGON2_MEMORY_COST,
            parallelism=config.ARGON2_PARALLELISM,
            hash_len=32,
            salt_len=16
        )

    def hash_password(self, password: str) -> str:
        """Hashes password with Argon2id and per-password unique salt."""
        return self.hasher.hash(password)

    def verify_password(self, password_hash: str, candidate_password: str) -> bool:
        """Verifies candidate password against Argon2id hash in constant time."""
        try:
            return self.hasher.verify(password_hash, candidate_password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False
        except Exception as e:
            logger.warning(f"Unexpected error during password verification: {e}")
            return False

    def validate_password_strength(self, password: str) -> Tuple[bool, Optional[str]]:
        """
        Validates password against complexity requirements and common passwords list.
        Requirements:
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special symbol
        - Not in common passwords list
        """
        if len(password) < config.PASSWORD_MIN_LENGTH:
            return False, f"Password must be at least {config.PASSWORD_MIN_LENGTH} characters long."
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter."
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter."
        if not re.search(r"[0-9]", password):
            return False, "Password must contain at least one number."
        if not re.search(r"[\W_]", password):
            return False, "Password must contain at least one special character."
        if password.lower() in COMMON_PASSWORDS:
            return False, "Password is too common and easily guessable."
        return True, None

    def generate_secure_otp(self, length: int = 6) -> str:
        """Generates a cryptographically secure numeric OTP using secrets module."""
        # 6-digit numeric OTP (100000 - 999999)
        min_val = 10 ** (length - 1)
        max_val = (10 ** length) - 1
        otp_int = secrets.randbelow(max_val - min_val + 1) + min_val
        return str(otp_int)

    def hash_otp(self, otp: str, salt: str) -> str:
        """Computes salted SHA-256 hash of the OTP for secure at-rest storage."""
        combined = f"{salt}:{otp}".encode("utf-8")
        return hashlib.sha256(combined).hexdigest()

    def generate_salt(self, nbytes: int = 16) -> str:
        """Generates a cryptographically random salt string."""
        return secrets.token_hex(nbytes)

    def hash_token(self, token: str) -> str:
        """Computes SHA-256 digest of session or refresh tokens for database persistence."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
