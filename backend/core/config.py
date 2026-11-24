"""
FinSure Core Security & Application Configuration
Centralizes cryptographic, token, and auth policy parameters.
"""

import os
import logging
from typing import Set, Optional, List

logger = logging.getLogger("finsure.config")

class AuthConfig:
    """Authentication, Cryptographic, and Security Environment Settings."""
    
    # Environment mode
    APP_ENV: str = os.getenv("APP_ENV", "development").lower()
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # Known development fallback secrets that MUST NOT be used in production
    INSECURE_FALLBACK_SECRETS: Set[str] = {
        "finsure_production_grade_jwt_secret_key_minimum_256_bits_length_for_rfc7518_security",
        "finsure_dev_secret_key_minimum_32_characters_long_for_security",
        "secret",
        "change_me",
        "default_jwt_secret"
    }

    # JWT Configuration (RFC 7518 compliant >= 256 bits)
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET", 
        "finsure_production_grade_jwt_secret_key_minimum_256_bits_length_for_rfc7518_security"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    STEP_UP_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("STEP_UP_TOKEN_EXPIRE_MINUTES", "5"))

    # CORS Allowed Origins
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,https://finsure-iota.vercel.app"
    )

    # Argon2id Parameters
    ARGON2_TIME_COST: int = int(os.getenv("ARGON2_TIME_COST", "2"))
    ARGON2_MEMORY_COST: int = int(os.getenv("ARGON2_MEMORY_COST", "65536"))  # 64 MB
    ARGON2_PARALLELISM: int = int(os.getenv("ARGON2_PARALLELISM", "4"))

    # OTP Policy Parameters
    OTP_LENGTH: int = 6
    OTP_EXPIRE_SECONDS: int = int(os.getenv("OTP_EXPIRE_SECONDS", "300"))  # 5 minutes
    OTP_RESEND_COOLDOWN_SECONDS: int = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))  # 60s
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))

    # Account Lockout Policy
    MAX_FAILED_LOGINS: int = int(os.getenv("MAX_FAILED_LOGINS", "5"))
    LOCKOUT_MINUTES: int = int(os.getenv("LOCKOUT_MINUTES", "15"))

    # Password Policy
    PASSWORD_MIN_LENGTH: int = 8

    # Database
    AUTH_DB_PATH: str = os.getenv("AUTH_DB_PATH", "data/finsure_auth.db")

    # Canonical Roles
    VALID_ROLES: Set[str] = {"customer", "fraud_analyst", "analyst", "compliance_officer", "admin"}

    def get_cors_origins(self) -> List[str]:
        """Parses and sanitizes the configured CORS origins list."""
        raw_origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if not raw_origins:
            return ["http://localhost:5173", "http://localhost:3000"]
        return raw_origins

    def validate_security_environment(self) -> None:
        """
        Validates security settings at application startup.
        In production/staging, fails fast on insecure defaults or weak keys.
        """
        is_production = self.APP_ENV in ("production", "prod", "staging")
        
        # 1. JWT Secret Validation
        raw_jwt_secret = os.getenv("JWT_SECRET")
        if is_production:
            if not raw_jwt_secret:
                raise RuntimeError(
                    "FATAL SECURITY CONFIGURATION: In production environment (APP_ENV='production'), "
                    "JWT_SECRET must be explicitly configured via environment variable."
                )
            if raw_jwt_secret in self.INSECURE_FALLBACK_SECRETS:
                raise RuntimeError(
                    "FATAL SECURITY CONFIGURATION: JWT_SECRET matches a known insecure default fallback. "
                    "Generate a cryptographically secure key (e.g., 'openssl rand -hex 32') for production."
                )
            if len(raw_jwt_secret) < 32:
                raise RuntimeError(
                    f"FATAL SECURITY CONFIGURATION: JWT_SECRET length ({len(raw_jwt_secret)}) is less than "
                    "the mandatory 32-character (256-bit) minimum requirement for RFC 7518 security."
                )
        else:
            if not raw_jwt_secret or raw_jwt_secret in self.INSECURE_FALLBACK_SECRETS:
                logger.warning(
                    "[SECURITY WARNING] Running with development default JWT_SECRET. "
                    "Configure a unique JWT_SECRET before deploying to production."
                )

        # 2. CORS Wildcard Check in Production
        if is_production:
            cors_list = self.get_cors_origins()
            if "*" in cors_list:
                raise RuntimeError(
                    "FATAL SECURITY CONFIGURATION: In production environment, CORS_ORIGINS must not contain wildcard ('*') "
                    "when credentials support (allow_credentials=True) is enabled. Specify explicit trusted domain origins."
                )

class DocumentConfig:
    """Document Storage, OCR, and Verification Engine Settings."""
    STORAGE_DIR: str = os.getenv("DOCUMENT_STORAGE_DIR", "data/uploads")
    DB_PATH: str = os.getenv("DOCUMENT_DB_PATH", "data/finsure_documents.db")
    MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    OCR_TIMEOUT_SECONDS: int = int(os.getenv("OCR_TIMEOUT_SECONDS", "15"))

    @staticmethod
    def get_tesseract_cmd() -> Optional[str]:
        """Discovers configured or installed Tesseract executable."""
        cmd = os.getenv("TESSERACT_CMD")
        if cmd and os.path.exists(cmd):
            return cmd
        import shutil
        found = shutil.which("tesseract")
        if found:
            return found
        std_candidates = [
            r"C:\Users\Dell\Downloads\tesseract.exe",
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for c in std_candidates:
            if os.path.exists(c):
                return c
        return None

    @staticmethod
    def get_tessdata_prefix() -> Optional[str]:
        """Discovers tessdata directory for language models."""
        prefix = os.getenv("TESSDATA_PREFIX")
        if prefix and os.path.exists(prefix):
            return prefix
        std_prefixes = [
            r"C:\Users\Dell\Downloads\tessdata",
            r"C:\Program Files\Tesseract-OCR\tessdata",
            r"C:\Program Files (x86)\Tesseract-OCR\tessdata",
        ]
        for p in std_prefixes:
            if os.path.exists(p):
                return p
        return None

config = AuthConfig()
doc_config = DocumentConfig()
