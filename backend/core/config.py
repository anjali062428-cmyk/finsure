"""
FinSure Core Security & Application Configuration
Centralizes cryptographic, token, and auth policy parameters.
"""

import os
from typing import Set

class AuthConfig:
    """Authentication and Cryptographic Settings."""
    # JWT Configuration (RFC 7518 compliant >= 256 bits)
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET", 
        "finsure_production_grade_jwt_secret_key_minimum_256_bits_length_for_rfc7518_security"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    STEP_UP_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("STEP_UP_TOKEN_EXPIRE_MINUTES", "5"))

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

config = AuthConfig()
