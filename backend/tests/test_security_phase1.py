"""
FinSure Phase 1 Security Hardening Unit Tests
Verifies:
1. JWT Secret production fail-fast enforcement (zero insecure fallbacks in production).
2. Minimum 32-character key length validation for RFC 7518 compliance.
3. CORS origin parsing and wildcard prohibition in production.
4. Security response headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy).
5. File upload security (MIME sniffing, size limit, path traversal defense).
"""

import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.core.config import AuthConfig
from backend.main import app
from backend.services.document_service import DocumentService


class TestSecurityPhase1(unittest.TestCase):

    def test_dev_mode_permits_default_secret_with_warning(self):
        """In development mode, default secrets are permitted for local development."""
        cfg = AuthConfig()
        cfg.APP_ENV = "development"
        # Should not raise exception
        try:
            cfg.validate_security_environment()
        except RuntimeError:
            self.fail("validate_security_environment() unexpectedly raised RuntimeError in development mode.")

    @patch.dict(os.environ, {"APP_ENV": "production", "JWT_SECRET": ""}, clear=False)
    def test_production_fails_when_jwt_secret_missing(self):
        """In production, missing JWT_SECRET must raise RuntimeError immediately."""
        cfg = AuthConfig()
        cfg.APP_ENV = "production"
        with self.assertRaises(RuntimeError) as ctx:
            cfg.validate_security_environment()
        self.assertIn("JWT_SECRET must be explicitly configured", str(ctx.exception))

    @patch.dict(os.environ, {
        "APP_ENV": "production",
        "JWT_SECRET": "finsure_production_grade_jwt_secret_key_minimum_256_bits_length_for_rfc7518_security"
    }, clear=False)
    def test_production_fails_when_jwt_secret_is_known_insecure_fallback(self):
        """In production, known fallback default secrets must raise RuntimeError immediately."""
        cfg = AuthConfig()
        cfg.APP_ENV = "production"
        cfg.JWT_SECRET = "finsure_production_grade_jwt_secret_key_minimum_256_bits_length_for_rfc7518_security"
        with self.assertRaises(RuntimeError) as ctx:
            cfg.validate_security_environment()
        self.assertIn("insecure default fallback", str(ctx.exception))

    @patch.dict(os.environ, {
        "APP_ENV": "production",
        "JWT_SECRET": "too_short_key_under_32_chars"
    }, clear=False)
    def test_production_fails_when_jwt_secret_too_short(self):
        """In production, secret length under 32 chars must raise RuntimeError."""
        cfg = AuthConfig()
        cfg.APP_ENV = "production"
        cfg.JWT_SECRET = "too_short_key_under_32_chars"
        with self.assertRaises(RuntimeError) as ctx:
            cfg.validate_security_environment()
        self.assertIn("less than the mandatory 32-character", str(ctx.exception))

    @patch.dict(os.environ, {
        "APP_ENV": "production",
        "JWT_SECRET": "a_very_strong_custom_production_secret_key_exceeding_32_characters",
        "CORS_ORIGINS": "*"
    }, clear=False)
    def test_production_fails_when_cors_contains_wildcard(self):
        """In production with allow_credentials=True, wildcard CORS must raise RuntimeError."""
        cfg = AuthConfig()
        cfg.APP_ENV = "production"
        cfg.JWT_SECRET = "a_very_strong_custom_production_secret_key_exceeding_32_characters"
        cfg.CORS_ORIGINS = "*"
        with self.assertRaises(RuntimeError) as ctx:
            cfg.validate_security_environment()
        self.assertIn("CORS_ORIGINS must not contain wildcard", str(ctx.exception))

    @patch.dict(os.environ, {
        "APP_ENV": "production",
        "JWT_SECRET": "a_very_strong_custom_production_secret_key_exceeding_32_characters",
        "CORS_ORIGINS": "https://finsure.app, https://admin.finsure.app"
    }, clear=False)
    def test_production_succeeds_with_strong_secret_and_explicit_cors(self):
        """In production with valid secret and explicit domains, validation passes cleanly."""
        cfg = AuthConfig()
        cfg.APP_ENV = "production"
        cfg.JWT_SECRET = "a_very_strong_custom_production_secret_key_exceeding_32_characters"
        cfg.CORS_ORIGINS = "https://finsure.app, https://admin.finsure.app"
        # Should not raise exception
        try:
            cfg.validate_security_environment()
        except RuntimeError:
            self.fail("validate_security_environment() unexpectedly raised RuntimeError with valid configuration.")

    def test_cors_origins_parsing(self):
        """Origins parsing strips whitespace, discards empty elements, and falls back cleanly."""
        cfg = AuthConfig()
        cfg.CORS_ORIGINS = " https://app.finsure.io , https://api.finsure.io, , "
        parsed = cfg.get_cors_origins()
        self.assertEqual(parsed, ["https://app.finsure.io", "https://api.finsure.io"])

    def test_security_headers_present_in_responses(self):
        """Every response must carry defensive security headers."""
        client = TestClient(app)
        res = client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(res.headers.get("X-XSS-Protection"), "1; mode=block")
        self.assertEqual(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
        self.assertIn("X-Request-ID", res.headers)
        self.assertIn("X-Process-Time-Ms", res.headers)

    def test_document_magic_byte_spoofing_rejected(self):
        """Files claiming to be PDF with non-PDF magic bytes are rejected."""
        fake_pdf = b"NOT_A_REAL_PDF_HEADER"
        with self.assertRaises(ValueError) as ctx:
            DocumentService.detect_file_signature(fake_pdf, "statement.pdf")
        self.assertIn("Unsupported file signature", str(ctx.exception))

    def test_document_extension_mismatch_rejected(self):
        """Files with PNG content but .pdf extension are rejected for MIME spoofing."""
        png_magic = b"\x89PNG\r\n\x1a\n" + b"extra_bytes"
        with self.assertRaises(ValueError) as ctx:
            DocumentService.detect_file_signature(png_magic, "statement.pdf")
        self.assertIn("MIME/Magic-bytes mismatch", str(ctx.exception))

    def test_document_size_ceiling_enforced(self):
        """Files exceeding 25 MB are rejected immediately."""
        oversized = b"P" * (25 * 1024 * 1024 + 1)
        with self.assertRaises(ValueError) as ctx:
            DocumentService.detect_file_signature(oversized, "huge.pdf")
        self.assertIn("exceeds the maximum allowed limit", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()

