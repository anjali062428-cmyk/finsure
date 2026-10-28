"""
FinSure Phase 6 Authentication & Access Control Test Suite
30 Comprehensive Unit & Integration Tests covering:
1. Valid user registration
2. Rejection of weak passwords
3. Rejection of duplicate email
4. Rejection of duplicate phone
5. Argon2id password hashing verification
6. OTP generation and safe delivery
7. Hashed OTP storage (zero raw OTP in DB)
8. OTP expiration handling
9. Single-use OTP invalidation
10. OTP max-attempts enforcement
11. OTP resend 60-second cooldown
12. Email verification flow
13. Phone verification flow
14. Dual-verification account activation
15. Password login via email
16. Password login via phone
17. Invalid password failure and attempt tracking
18. Non-existent user login generic response
19. Brute-force protection & account lockout
20. Passwordless OTP login flow
21. JWT access token claims & absence of PII
22. Refresh token rotation
23. Refresh token reuse detection & revocation
24. Logout and token revocation
25. Step-up authentication challenge initiation
26. Step-up authentication OTP verification & step-up token
27. Password reset via OTP
28. RBAC: Customer permissions & forbidden boundaries
29. RBAC: Analyst, Admin permissions & unauthenticated 401
30. Immutable audit logging verification
"""

import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.repositories.auth_repo import AuthRepository
from backend.services.crypto_service import CryptoService
from backend.services.otp_service import OTPService, TestNotificationAdapter
from backend.services.token_service import TokenService
from backend.services.auth_service import AuthService
from backend.api.dependencies.auth import (
    get_auth_repo, get_crypto_service, get_otp_service,
    get_token_service, get_auth_service, get_otp_adapter
)


class TestAuthPhase6(unittest.TestCase):

    def setUp(self):
        # Fresh isolated in-memory SQLite database per test
        self.repo = AuthRepository(":memory:")
        self.crypto = CryptoService()
        self.adapter = TestNotificationAdapter()
        self.otp_svc = OTPService(self.repo, self.crypto, self.adapter)
        self.token_svc = TokenService(self.repo, self.crypto)
        self.auth_svc = AuthService(self.repo, self.crypto, self.otp_svc, self.token_svc)

        # Wire dependencies into FastAPI TestClient
        app.dependency_overrides[get_auth_repo] = lambda: self.repo
        app.dependency_overrides[get_crypto_service] = lambda: self.crypto
        app.dependency_overrides[get_otp_adapter] = lambda: self.adapter
        app.dependency_overrides[get_otp_service] = lambda: self.otp_svc
        app.dependency_overrides[get_token_service] = lambda: self.token_svc
        app.dependency_overrides[get_auth_service] = lambda: self.auth_svc

        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    # 1. Valid user registration
    def test_01_user_registration_success(self):
        resp = self.client.post("/api/v1/auth/register", json={
            "full_name": "Aditi Sharma",
            "email": "aditi.sharma@example.com",
            "phone": "+919876543210",
            "password": "SecurePassword123!",
            "role": "customer"
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data["user_id"].startswith("usr_"))
        self.assertEqual(data["email"], "aditi.sharma@example.com")
        self.assertEqual(data["account_status"], "pending_verification")

        # Verify DB entry
        user = self.repo.get_user_by_id(data["user_id"])
        self.assertIsNotNone(user)
        self.assertEqual(user.full_name, "Aditi Sharma")
        self.assertFalse(user.email_verified)
        self.assertFalse(user.phone_verified)

    # 2. Rejection of weak passwords
    def test_02_registration_weak_password_rejection(self):
        weak_passwords = [
            "short1!",        # < 8 chars
            "nouppercase123!", # no uppercase
            "NOLOWERCASE123!", # no lowercase
            "NoDigitsHere!!",  # no digit
            "NoSpecialChar123",# no symbol
            "Password123!"     # common password
        ]
        for weak_pwd in weak_passwords:
            resp = self.client.post("/api/v1/auth/register", json={
                "full_name": "Test Weak",
                "email": f"weak_{abs(hash(weak_pwd))}@example.com",
                "phone": f"+9198{abs(hash(weak_pwd)) % 100000000:08d}",
                "password": weak_pwd
            })
            self.assertIn(resp.status_code, [400, 422], f"Expected 400 or 422 for password: {weak_pwd}")

    # 3. Rejection of duplicate email
    def test_03_registration_duplicate_email(self):
        payload = {
            "full_name": "User One",
            "email": "duplicate@example.com",
            "phone": "+919876543211",
            "password": "ValidPassword123!"
        }
        resp1 = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(resp1.status_code, 201)

        payload2 = {
            "full_name": "User Two",
            "email": "duplicate@example.com",
            "phone": "+919876543212",
            "password": "ValidPassword123!"
        }
        resp2 = self.client.post("/api/v1/auth/register", json=payload2)
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already exists", resp2.json()["detail"])

    # 4. Rejection of duplicate phone
    def test_04_registration_duplicate_phone(self):
        payload1 = {
            "full_name": "User One",
            "email": "user1@example.com",
            "phone": "+919876543213",
            "password": "ValidPassword123!"
        }
        resp1 = self.client.post("/api/v1/auth/register", json=payload1)
        self.assertEqual(resp1.status_code, 201)

        payload2 = {
            "full_name": "User Two",
            "email": "user2@example.com",
            "phone": "+919876543213",
            "password": "ValidPassword123!"
        }
        resp2 = self.client.post("/api/v1/auth/register", json=payload2)
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already exists", resp2.json()["detail"])

    # 5. Argon2id password hashing verification
    def test_05_argon2id_password_hashing(self):
        raw_password = "SuperSecretPassword123!"
        hashed = self.crypto.hash_password(raw_password)
        self.assertTrue(hashed.startswith("$argon2id$"))
        self.assertTrue(self.crypto.verify_password(hashed, raw_password))
        self.assertFalse(self.crypto.verify_password(hashed, "WrongPassword123!"))

    # 6. OTP generation and safe delivery
    def test_06_otp_generation_and_delivery(self):
        resp = self.client.post("/api/v1/auth/register", json={
            "full_name": "Rohan Verma",
            "email": "rohan@example.com",
            "phone": "+919876543220",
            "password": "ValidPassword123!"
        })
        self.assertEqual(resp.status_code, 201)

        # Verify adapter received email and phone OTPs
        email_otp = self.adapter.get_latest_otp("rohan@example.com")
        phone_otp = self.adapter.get_latest_otp("+919876543220")

        self.assertIsNotNone(email_otp)
        self.assertIsNotNone(phone_otp)
        self.assertEqual(len(email_otp), 6)
        self.assertEqual(len(phone_otp), 6)
        self.assertTrue(email_otp.isdigit())
        self.assertTrue(phone_otp.isdigit())

    # 7. Hashed OTP storage (zero raw OTP in DB)
    def test_07_otp_hashed_storage(self):
        self.auth_svc.register_user("Neha Sen", "neha@example.com", "+919876543225", "ValidPassword123!")
        raw_otp = self.adapter.get_latest_otp("neha@example.com")

        # Inspect database record directly
        otp_record = self.repo.get_latest_otp("neha@example.com", "registration_email")
        self.assertIsNotNone(otp_record)
        # Stored code_hash must NOT be the raw OTP
        self.assertNotEqual(otp_record.code_hash, raw_otp)
        self.assertEqual(len(otp_record.code_hash), 64)  # SHA-256 length
        # Salt must be present
        self.assertTrue(len(otp_record.salt) >= 16)

    # 8. OTP expiration handling
    def test_08_otp_expiration(self):
        self.auth_svc.register_user("Exp User", "exp@example.com", "+919876543230", "ValidPassword123!")
        raw_otp = self.adapter.get_latest_otp("exp@example.com")
        otp_record = self.repo.get_latest_otp("exp@example.com", "registration_email")

        # Backdate expiration by 10 minutes in DB
        expired_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        with self.repo._lock:
            with self.repo._get_connection() as conn:
                conn.cursor().execute("UPDATE otp_codes SET expires_at = ? WHERE otp_id = ?", (expired_time, otp_record.otp_id))
                conn.commit()

        # Attempt verification
        resp = self.client.post("/api/v1/auth/verify-email", json={
            "email": "exp@example.com",
            "otp": raw_otp
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("expired", resp.json()["detail"].lower())

    # 9. Single-use OTP invalidation
    def test_09_otp_single_use(self):
        self.auth_svc.register_user("Single User", "single@example.com", "+919876543235", "ValidPassword123!")
        raw_otp = self.adapter.get_latest_otp("single@example.com")

        # First verification succeeds
        resp1 = self.client.post("/api/v1/auth/verify-email", json={
            "email": "single@example.com",
            "otp": raw_otp
        })
        self.assertEqual(resp1.status_code, 200)

        # Second attempt with same OTP fails
        resp2 = self.client.post("/api/v1/auth/verify-email", json={
            "email": "single@example.com",
            "otp": raw_otp
        })
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already been used", resp2.json()["detail"].lower())

    # 10. OTP max-attempts enforcement
    def test_10_otp_max_attempts_lockout(self):
        self.auth_svc.register_user("Max User", "max@example.com", "+919876543240", "ValidPassword123!")

        # 5 consecutive wrong OTP attempts
        for i in range(5):
            resp = self.client.post("/api/v1/auth/verify-email", json={
                "email": "max@example.com",
                "otp": "000000"
            })
            self.assertEqual(resp.status_code, 400)

        # 6th attempt (even with right OTP) should be rejected due to max attempts
        raw_otp = self.adapter.get_latest_otp("max@example.com")
        resp6 = self.client.post("/api/v1/auth/verify-email", json={
            "email": "max@example.com",
            "otp": raw_otp
        })
        self.assertEqual(resp6.status_code, 400)
        self.assertIn("maximum verification attempts exceeded", resp6.json()["detail"].lower())

    # 11. OTP resend 60-second cooldown
    def test_11_otp_resend_cooldown(self):
        user = self.auth_svc.register_user("Cool User", "cool@example.com", "+919876543245", "ValidPassword123!")

        # Immediately request login OTP
        resp1 = self.client.post("/api/v1/auth/otp/request", json={
            "identifier": "cool@example.com",
            "channel": "email"
        })
        self.assertEqual(resp1.status_code, 200)

        # Immediate second request should be throttled by 60s cooldown
        resp2 = self.client.post("/api/v1/auth/otp/request", json={
            "identifier": "cool@example.com",
            "channel": "email"
        })
        self.assertEqual(resp2.status_code, 429)
        self.assertIn("wait", resp2.json()["detail"].lower())

    # 12. Email verification flow
    def test_12_email_verification_flow(self):
        self.auth_svc.register_user("Ver User", "ver_email@example.com", "+919876543250", "ValidPassword123!")
        raw_otp = self.adapter.get_latest_otp("ver_email@example.com")

        resp = self.client.post("/api/v1/auth/verify-email", json={
            "email": "ver_email@example.com",
            "otp": raw_otp
        })
        self.assertEqual(resp.status_code, 200)

        user = self.repo.get_user_by_email("ver_email@example.com")
        self.assertTrue(user.email_verified)
        self.assertFalse(user.phone_verified)
        self.assertEqual(user.account_status, "pending_verification")

    # 13. Phone verification flow
    def test_13_phone_verification_flow(self):
        self.auth_svc.register_user("Phone User", "phone_user@example.com", "+919876543255", "ValidPassword123!")
        raw_otp = self.adapter.get_latest_otp("+919876543255")

        resp = self.client.post("/api/v1/auth/verify-phone", json={
            "phone": "+919876543255",
            "otp": raw_otp
        })
        self.assertEqual(resp.status_code, 200)

        user = self.repo.get_user_by_phone("+919876543255")
        self.assertFalse(user.email_verified)
        self.assertTrue(user.phone_verified)
        self.assertEqual(user.account_status, "pending_verification")

    # 14. Dual-verification account activation
    def test_14_account_activation_on_dual_verification(self):
        self.auth_svc.register_user("Dual User", "dual@example.com", "+919876543260", "ValidPassword123!")
        email_otp = self.adapter.get_latest_otp("dual@example.com")
        phone_otp = self.adapter.get_latest_otp("+919876543260")

        self.client.post("/api/v1/auth/verify-email", json={"email": "dual@example.com", "otp": email_otp})
        self.client.post("/api/v1/auth/verify-phone", json={"phone": "+919876543260", "otp": phone_otp})

        user = self.repo.get_user_by_email("dual@example.com")
        self.assertTrue(user.email_verified)
        self.assertTrue(user.phone_verified)
        self.assertEqual(user.account_status, "active")

    # 15. Password login via email
    def test_15_login_password_success(self):
        user = self.auth_svc.register_user("Login User", "login@example.com", "+919876543265", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)

        resp = self.client.post("/api/v1/auth/login", json={
            "identifier": "login@example.com",
            "password": "ValidPassword123!"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["user_id"], user.user_id)

    # 16. Password login via phone
    def test_16_login_password_phone_success(self):
        user = self.auth_svc.register_user("Phone Login", "phone_login@example.com", "+919876543270", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)

        resp = self.client.post("/api/v1/auth/login", json={
            "identifier": "+919876543270",
            "password": "ValidPassword123!"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)

    # 17. Invalid password failure and attempt tracking
    def test_17_login_invalid_password(self):
        user = self.auth_svc.register_user("Fail User", "fail@example.com", "+919876543275", "ValidPassword123!")

        resp = self.client.post("/api/v1/auth/login", json={
            "identifier": "fail@example.com",
            "password": "WrongPassword123!"
        })
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid credentials", resp.json()["detail"])

        refreshed = self.repo.get_user_by_id(user.user_id)
        self.assertEqual(refreshed.failed_login_count, 1)

    # 18. Non-existent user login generic response
    def test_18_login_nonexistent_user(self):
        resp = self.client.post("/api/v1/auth/login", json={
            "identifier": "nonexistent@example.com",
            "password": "AnyPassword123!"
        })
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid credentials", resp.json()["detail"])

    # 19. Brute-force protection & account lockout
    def test_19_brute_force_lockout(self):
        user = self.auth_svc.register_user("Lock User", "lock@example.com", "+919876543280", "ValidPassword123!")

        # 5 consecutive failed logins
        for i in range(5):
            resp = self.client.post("/api/v1/auth/login", json={
                "identifier": "lock@example.com",
                "password": "WrongPassword123!"
            })
            if i < 4:
                self.assertEqual(resp.status_code, 401)
            else:
                # 5th attempt triggers lockout and returns 403 Forbidden
                self.assertEqual(resp.status_code, 403)
                self.assertIn("locked", resp.json()["detail"].lower())

        # 6th attempt is blocked with 403 Forbidden lockout message
        resp6 = self.client.post("/api/v1/auth/login", json={
            "identifier": "lock@example.com",
            "password": "ValidPassword123!"  # Even right password fails while locked
        })
        self.assertEqual(resp6.status_code, 403)
        self.assertIn("temporarily locked", resp6.json()["detail"].lower())

    # 20. Passwordless OTP login flow
    def test_20_passwordless_otp_login(self):
        user = self.auth_svc.register_user("OTP User", "otp_login@example.com", "+919876543285", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)

        # Request OTP
        req_resp = self.client.post("/api/v1/auth/otp/request", json={
            "identifier": "otp_login@example.com",
            "channel": "email"
        })
        self.assertEqual(req_resp.status_code, 200)

        raw_otp = self.adapter.get_latest_otp("otp_login@example.com")
        # Verify and login
        login_resp = self.client.post("/api/v1/auth/otp/verify", json={
            "identifier": "otp_login@example.com",
            "otp": raw_otp
        })
        self.assertEqual(login_resp.status_code, 200)
        data = login_resp.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)

    # 21. JWT access token claims & absence of PII
    def test_21_jwt_access_token_claims(self):
        user = self.auth_svc.register_user("Claims User", "claims@example.com", "+919876543290", "ValidPassword123!")
        token = self.token_svc.create_access_token(user.user_id, user.role)

        payload = self.token_svc.decode_and_validate_token(token, expected_type="access")
        self.assertEqual(payload["sub"], user.user_id)
        self.assertEqual(payload["role"], "customer")
        self.assertEqual(payload["type"], "access")
        self.assertIn("jti", payload)
        self.assertIn("exp", payload)

        # Non-PII check: No email, phone, or password hash in claims
        self.assertNotIn("email", payload)
        self.assertNotIn("phone", payload)
        self.assertNotIn("password", payload)
        self.assertNotIn("password_hash", payload)

    # 22. Refresh token rotation
    def test_22_jwt_refresh_token_rotation(self):
        user = self.auth_svc.register_user("Rotate User", "rotate@example.com", "+919876543295", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)
        login_data = self.auth_svc.login_with_password("rotate@example.com", "ValidPassword123!")
        old_refresh = login_data["refresh_token"]

        resp = self.client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        new_refresh = data["refresh_token"]
        self.assertNotEqual(old_refresh, new_refresh)

        # Old refresh token is marked revoked
        old_jti = self.token_svc.decode_and_validate_token(old_refresh, expected_type="refresh")["jti"]
        record = self.repo.get_refresh_token(old_jti)
        self.assertIsNotNone(record.revoked_at)

    # 23. Refresh token reuse detection & revocation
    def test_23_refresh_token_reuse_detection(self):
        user = self.auth_svc.register_user("Replay User", "replay@example.com", "+919876543300", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)
        login_data = self.auth_svc.login_with_password("replay@example.com", "ValidPassword123!")
        refresh_tok = login_data["refresh_token"]

        # First refresh succeeds
        self.client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_tok})

        # Replaying the same refresh token should fail with 401
        replay_resp = self.client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_tok})
        self.assertEqual(replay_resp.status_code, 401)
        self.assertIn("revoked", replay_resp.json()["detail"].lower())

    # 24. Logout and token revocation
    def test_24_logout_flow(self):
        user = self.auth_svc.register_user("Logout User", "logout@example.com", "+919876543305", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)
        login_data = self.auth_svc.login_with_password("logout@example.com", "ValidPassword123!")
        refresh_tok = login_data["refresh_token"]

        logout_resp = self.client.post("/api/v1/auth/logout", json={"refresh_token": refresh_tok})
        self.assertEqual(logout_resp.status_code, 200)

        # Attempting to refresh using revoked token fails
        ref_resp = self.client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_tok})
        self.assertEqual(ref_resp.status_code, 401)

    # 25. Step-up authentication challenge initiation
    def test_25_step_up_challenge_initiation(self):
        user = self.auth_svc.register_user("Step User", "step@example.com", "+919876543310", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)
        token = self.token_svc.create_access_token(user.user_id, user.role)

        resp = self.client.post(
            "/api/v1/auth/step-up/request",
            json={"transaction_id": "TXN_HIGH_RISK_001", "channel": "phone"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["challenge_id"].startswith("chl_"))

        # Check OTP was sent to phone
        raw_otp = self.adapter.get_latest_otp("+919876543310")
        self.assertIsNotNone(raw_otp)

    # 26. Step-up authentication OTP verification & step-up token
    def test_26_step_up_challenge_verification(self):
        user = self.auth_svc.register_user("Step2 User", "step2@example.com", "+919876543315", "ValidPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)
        token = self.token_svc.create_access_token(user.user_id, user.role)

        req_resp = self.client.post(
            "/api/v1/auth/step-up/request",
            json={"transaction_id": "TXN_HIGH_RISK_002", "channel": "phone"},
            headers={"Authorization": f"Bearer {token}"}
        )
        challenge_id = req_resp.json()["challenge_id"]
        raw_otp = self.adapter.get_latest_otp("+919876543315")

        verify_resp = self.client.post(
            "/api/v1/auth/step-up/verify",
            json={"challenge_id": challenge_id, "otp": raw_otp},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(verify_resp.status_code, 200)
        data = verify_resp.json()
        self.assertTrue(data["success"])
        step_up_token = data["step_up_token"]
        self.assertIsNotNone(step_up_token)

        # Validate step-up token payload
        payload = self.token_svc.decode_and_validate_token(step_up_token, expected_type="step_up")
        self.assertEqual(payload["challenge_id"], challenge_id)
        self.assertEqual(payload["sub"], user.user_id)

    # 27. Password reset via OTP
    def test_27_password_reset_flow(self):
        user = self.auth_svc.register_user("Reset User", "reset@example.com", "+919876543320", "OldPassword123!")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)

        # Request reset
        req_resp = self.client.post("/api/v1/auth/password-reset/request", json={
            "identifier": "reset@example.com",
            "channel": "email"
        })
        self.assertEqual(req_resp.status_code, 200)

        raw_otp = self.adapter.get_latest_otp("reset@example.com")
        self.assertIsNotNone(raw_otp)

        # Confirm reset
        conf_resp = self.client.post("/api/v1/auth/password-reset/confirm", json={
            "identifier": "reset@example.com",
            "otp": raw_otp,
            "new_password": "BrandNewPassword123!"
        })
        self.assertEqual(conf_resp.status_code, 200)

        # Verify old password fails and new password succeeds
        fail_login = self.client.post("/api/v1/auth/login", json={
            "identifier": "reset@example.com",
            "password": "OldPassword123!"
        })
        self.assertEqual(fail_login.status_code, 401)

        succ_login = self.client.post("/api/v1/auth/login", json={
            "identifier": "reset@example.com",
            "password": "BrandNewPassword123!"
        })
        self.assertEqual(succ_login.status_code, 200)

    # 28. RBAC: Customer permissions & forbidden boundaries
    def test_28_rbac_customer_access(self):
        user = self.auth_svc.register_user("Cust User", "cust@example.com", "+919876543325", "ValidPassword123!", role="customer")
        self.repo.update_verification_status(user.user_id, email_verified=True, phone_verified=True)
        token = self.token_svc.create_access_token(user.user_id, "customer")

        # Customer endpoint: 200 OK
        resp_cust = self.client.get("/api/v1/auth/protected/customer-only", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp_cust.status_code, 200)

        # Analyst endpoint: 403 Forbidden
        resp_analyst = self.client.get("/api/v1/auth/protected/analyst-only", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp_analyst.status_code, 403)

        # Compliance endpoint: 403 Forbidden
        resp_comp = self.client.get("/api/v1/auth/protected/compliance-only", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp_comp.status_code, 403)

        # Admin endpoint: 403 Forbidden
        resp_admin = self.client.get("/api/v1/auth/protected/admin-only", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp_admin.status_code, 403)

    # 29. RBAC: Analyst, Admin permissions & unauthenticated 401
    def test_29_rbac_analyst_and_admin_access(self):
        analyst = self.auth_svc.register_user("Analyst User", "analyst@example.com", "+919876543330", "ValidPassword123!", role="fraud_analyst")
        admin = self.auth_svc.register_user("Admin User", "admin@example.com", "+919876543335", "ValidPassword123!", role="admin")

        self.repo.update_verification_status(analyst.user_id, email_verified=True, phone_verified=True)
        self.repo.update_verification_status(admin.user_id, email_verified=True, phone_verified=True)

        analyst_tok = self.token_svc.create_access_token(analyst.user_id, "fraud_analyst")
        admin_tok = self.token_svc.create_access_token(admin.user_id, "admin")

        # Analyst can access analyst route
        self.assertEqual(
            self.client.get("/api/v1/auth/protected/analyst-only", headers={"Authorization": f"Bearer {analyst_tok}"}).status_code,
            200
        )
        # Admin can access admin route
        self.assertEqual(
            self.client.get("/api/v1/auth/protected/admin-only", headers={"Authorization": f"Bearer {admin_tok}"}).status_code,
            200
        )
        # Unauthenticated request receives 401
        self.assertEqual(
            self.client.get("/api/v1/auth/protected/admin-only").status_code,
            401
        )

    # 30. Immutable audit logging verification
    def test_30_immutable_audit_logging(self):
        user = self.auth_svc.register_user("Audit User", "audit@example.com", "+919876543340", "ValidPassword123!")
        self.auth_svc.login_with_password("audit@example.com", "ValidPassword123!")
        self.auth_svc.initiate_step_up_challenge(user.user_id, channel="phone")

        logs = self.repo.get_audit_logs(actor_id=user.user_id)
        event_types = [entry.event_type for entry in logs]

        self.assertIn("register", event_types)
        self.assertIn("login_password", event_types)
        self.assertIn("step_up_challenge_initiated", event_types)

        for log in logs:
            self.assertIsNotNone(log.event_id)
            self.assertIsNotNone(log.timestamp)
            self.assertEqual(log.status, "success")


if __name__ == "__main__":
    unittest.main()
