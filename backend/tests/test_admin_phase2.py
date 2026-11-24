"""
FinSure Phase 2 Admin & Policy Governance Tests
Verifies:
1. Directory inspection (/api/v1/users) RBAC enforcement:
   - 401 Unauthorized for unauthenticated requests
   - 403 Forbidden for customer and fraud_analyst
   - 200 OK for compliance_officer and admin
2. User directory search, filtering by role/status, and pagination.
3. User status mutations (/api/v1/users/{id}/status):
   - Admin-only authorization
   - Self-suspension guard (admin cannot suspend own account)
4. User role mutations (/api/v1/users/{id}/role):
   - Admin-only authorization
   - Self-demotion guard (admin cannot alter own role)
5. Policy configuration endpoint (/api/v1/policies):
   - Thresholds, risk bands, cost parameters, and frozen status
6. Authoritative Policy Simulator (/api/v1/policies/simulate):
   - Deterministic risk score evaluation across all 4 operational policy bands
"""

import unittest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.model_service import ModelRegistry
from backend.repositories.auth_repo import AuthRepository
from backend.services.crypto_service import CryptoService
from backend.services.otp_service import OTPService, TestNotificationAdapter
from backend.services.token_service import TokenService
from backend.services.auth_service import AuthService
from backend.api.dependencies.auth import (
    get_auth_repo, get_crypto_service, get_otp_adapter,
    get_otp_service, get_token_service, get_auth_service,
    set_custom_auth_service
)


class TestAdminPhase2(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Mark ModelRegistry as loaded to bypass reloading ML weights for unit testing
        ModelRegistry.get_instance().is_loaded = True

        # Shared in-memory test database for fast execution (avoids repeating Argon2 for each test)
        cls.auth_repo = AuthRepository(":memory:")
        cls.crypto = CryptoService()
        cls.adapter = TestNotificationAdapter()
        cls.otp_svc = OTPService(cls.auth_repo, cls.crypto, cls.adapter)
        cls.token_svc = TokenService(cls.auth_repo, cls.crypto)
        cls.auth_svc = AuthService(cls.auth_repo, cls.crypto, cls.otp_svc, cls.token_svc)

        # Seed test actors once
        cls.customer = cls.auth_svc.register_user(
            "Alice Customer", "alice@example.com", "+919876543210", "StrongK8!xP9#vL2", role="customer"
        )
        cls.auth_repo.update_verification_status(cls.customer.user_id, email_verified=True, phone_verified=True)
        cls.customer_token = cls.token_svc.create_access_token(cls.customer.user_id, "customer")

        cls.analyst = cls.auth_svc.register_user(
            "Bob Analyst", "bob@finsure.internal", "+919876543211", "StrongK8!xP9#vL2", role="fraud_analyst"
        )
        cls.auth_repo.update_verification_status(cls.analyst.user_id, email_verified=True, phone_verified=True)
        cls.analyst_token = cls.token_svc.create_access_token(cls.analyst.user_id, "fraud_analyst")

        cls.compliance = cls.auth_svc.register_user(
            "Carol Compliance", "carol@finsure.internal", "+919876543212", "StrongK8!xP9#vL2", role="compliance_officer"
        )
        cls.auth_repo.update_verification_status(cls.compliance.user_id, email_verified=True, phone_verified=True)
        cls.compliance_token = cls.token_svc.create_access_token(cls.compliance.user_id, "compliance_officer")

        cls.admin = cls.auth_svc.register_user(
            "Dave Admin", "dave@finsure.internal", "+919876543213", "StrongK8!xP9#vL2", role="admin"
        )
        cls.auth_repo.update_verification_status(cls.admin.user_id, email_verified=True, phone_verified=True)
        cls.admin_token = cls.token_svc.create_access_token(cls.admin.user_id, "admin")

        set_custom_auth_service(cls.auth_svc)

        app.dependency_overrides[get_auth_repo] = lambda: cls.auth_repo
        app.dependency_overrides[get_crypto_service] = lambda: cls.crypto
        app.dependency_overrides[get_otp_adapter] = lambda: cls.adapter
        app.dependency_overrides[get_otp_service] = lambda: cls.otp_svc
        app.dependency_overrides[get_token_service] = lambda: cls.token_svc
        app.dependency_overrides[get_auth_service] = lambda: cls.auth_svc

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    # -------------------------------------------------------------
    # 1. Directory RBAC & Listing
    # -------------------------------------------------------------

    def test_list_users_unauthenticated_returns_401(self):
        resp = self.client.get("/api/v1/users")
        self.assertEqual(resp.status_code, 401)

    def test_list_users_customer_forbidden(self):
        resp = self.client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        self.assertEqual(resp.status_code, 403)

    def test_list_users_analyst_forbidden(self):
        resp = self.client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 403)

    def test_list_users_compliance_allowed(self):
        resp = self.client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {self.compliance_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["total"], 4)
        self.assertEqual(len(data["users"]), data["total"])

    def test_list_users_admin_allowed_with_filters(self):
        # Filter by role
        resp = self.client.get(
            "/api/v1/users?role=customer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["total"], 1)
        self.assertTrue(any(u["email"] == "alice@example.com" for u in data["users"]))

        # Search by keyword
        resp_search = self.client.get(
            "/api/v1/users?search=Carol",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp_search.status_code, 200)
        search_data = resp_search.json()
        self.assertGreaterEqual(search_data["total"], 1)
        self.assertTrue(any(u["user_id"] == self.compliance.user_id for u in search_data["users"]))

    def test_get_single_user_by_id(self):
        resp = self.client.get(
            f"/api/v1/users/{self.customer.user_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["user_id"], self.customer.user_id)

    # -------------------------------------------------------------
    # 2. Status Mutations & Self-Protection Guards
    # -------------------------------------------------------------

    def test_update_status_forbidden_for_compliance(self):
        resp = self.client.patch(
            f"/api/v1/users/{self.customer.user_id}/status",
            headers={"Authorization": f"Bearer {self.compliance_token}"},
            json={"status": "suspended"}
        )
        self.assertEqual(resp.status_code, 403)

    def test_admin_updates_user_status_successfully(self):
        # Create a dedicated user for status mutation to avoid side-effects on others
        temp_user = self.auth_svc.register_user(
            "Temp Status User", "temp_status@example.com", "+919876543299", "StrongK8!xP9#vL2", role="customer"
        )
        resp = self.client.patch(
            f"/api/v1/users/{temp_user.user_id}/status",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"status": "suspended"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["account_status"], "suspended")

        # Verify persisted in repository
        fetched = self.auth_repo.get_user_by_id(temp_user.user_id)
        self.assertEqual(fetched.account_status, "suspended")

    def test_admin_cannot_suspend_self(self):
        resp = self.client.patch(
            f"/api/v1/users/{self.admin.user_id}/status",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"status": "suspended"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot suspend their own active", resp.json()["detail"])

    # -------------------------------------------------------------
    # 3. Role Mutations & Self-Protection Guards
    # -------------------------------------------------------------

    def test_update_role_forbidden_for_compliance(self):
        resp = self.client.patch(
            f"/api/v1/users/{self.customer.user_id}/role",
            headers={"Authorization": f"Bearer {self.compliance_token}"},
            json={"role": "fraud_analyst"}
        )
        self.assertEqual(resp.status_code, 403)

    def test_admin_updates_user_role_successfully(self):
        temp_role_user = self.auth_svc.register_user(
            "Temp Role User", "temp_role@example.com", "+919876543298", "StrongK8!xP9#vL2", role="customer"
        )
        resp = self.client.patch(
            f"/api/v1/users/{temp_role_user.user_id}/role",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"role": "fraud_analyst"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["role"], "fraud_analyst")

        # Verify persisted
        fetched = self.auth_repo.get_user_by_id(temp_role_user.user_id)
        self.assertEqual(fetched.role, "fraud_analyst")

    def test_admin_cannot_change_self_role(self):
        resp = self.client.patch(
            f"/api/v1/users/{self.admin.user_id}/role",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"role": "customer"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot demote their own active", resp.json()["detail"])

    # -------------------------------------------------------------
    # 4. Policy Endpoints & Simulation
    # -------------------------------------------------------------

    def test_get_policies_endpoint(self):
        resp = self.client.get("/api/v1/policies")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("version", data)
        self.assertTrue(data["frozen"])
        self.assertIn("ALLOW", data["thresholds"])
        self.assertIn("CHALLENGE", data["thresholds"])
        self.assertIn("REVIEW", data["thresholds"])
        self.assertIn("BLOCK", data["thresholds"])
        self.assertEqual(data["thresholds"]["ALLOW"]["min_score"], 0)
        self.assertEqual(data["thresholds"]["ALLOW"]["max_score"], 39)
        self.assertEqual(data["thresholds"]["BLOCK"]["min_score"], 90)

    def test_simulate_policy_across_all_operational_bands(self):
        test_cases = [
            (15, "ALLOW", "LOW", False, True),
            (50, "CHALLENGE (OTP)", "MEDIUM", True, False),
            (75, "REVIEW", "HIGH", False, False),
            (95, "BLOCK", "CRITICAL", False, False),
        ]

        for score, expected_action, expected_band, req_challenge, allow_instant in test_cases:
            resp = self.client.post("/api/v1/policies/simulate", json={"risk_score": score})
            self.assertEqual(resp.status_code, 200, f"Failed for score {score}")
            body = resp.json()
            self.assertEqual(body["risk_score"], score)
            self.assertEqual(body["action"], expected_action)
            self.assertEqual(body["risk_band"], expected_band)
            self.assertEqual(body["requires_challenge"], req_challenge)
            self.assertEqual(body["allows_instant_execution"], allow_instant)


if __name__ == "__main__":
    unittest.main()
