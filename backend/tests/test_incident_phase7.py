"""
FinSure Phase 7 Incident Response & Threat Replay Test Suite
Covers 28 required test scenarios:
1. Incident creation & priority calculation
2. Incident state machine (valid full lifecycle)
3. Illegal transition rejection
4. Dismissal reason requirement
5. Escalation reason requirement
6. Audit event creation across transitions
7. Hash-chain cryptographic verification
8. Tamper detection on modified ledger records
9. Customer report generation (valid PDF)
10. Analyst report generation (evidence pack)
11. Customer information isolation (no SHAP/internals)
12. Analyst information access (full multi-modal metrics)
13. Report SHA-256 integrity
14. QR verification endpoint
15. Threat replay chronological ordering
16. Threat replay recorded events only (no fabrication)
17. Missing event handling
18. Final-decision attribution labeling
19. Alert priority deterministic assignment
20. Alert queue filtering and deterministic sorting
21. Analyst feedback recording
22. Feedback audit ledger tracking
23. RBAC enforcement (Customer cannot download analyst PDF)
24. Customer isolation (Cannot access another user's incident)
25. Analyst permissions (Triage, notes, feedback, replay)
26. Compliance permissions (Audit ledger & chain verification)
27. Admin permissions (Elevated critical incident dismissal)
28. Similar-case retrieval determinism
"""

import json
import sqlite3
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.auth import User
from backend.models.incident import IncidentStatus, IncidentPriority
from backend.repositories.auth_repo import AuthRepository
from backend.repositories.incident_repo import IncidentRepository
from backend.services.crypto_service import CryptoService
from backend.services.otp_service import OTPService, TestNotificationAdapter
from backend.services.token_service import TokenService
from backend.services.auth_service import AuthService
from backend.services.incident_service import IncidentService
from backend.services.replay_service import ThreatReplayService
from backend.services.report_service import IncidentReportService
from backend.services.similarity_service import SimilarCaseService

from backend.api.dependencies.auth import (
    get_auth_repo, get_crypto_service, get_otp_service,
    get_token_service, get_auth_service, get_otp_adapter
)
from backend.api.dependencies.incident import (
    get_incident_repo, get_incident_service,
    get_replay_service, get_report_service, get_similarity_service
)


class TestIncidentPhase7(unittest.TestCase):

    def setUp(self):
        # Isolated in-memory repositories
        self.auth_repo = AuthRepository(":memory:")
        self.incident_repo = IncidentRepository(":memory:")

        self.crypto = CryptoService()
        self.adapter = TestNotificationAdapter()
        self.otp_svc = OTPService(self.auth_repo, self.crypto, self.adapter)
        self.token_svc = TokenService(self.auth_repo, self.crypto)
        self.auth_svc = AuthService(self.auth_repo, self.crypto, self.otp_svc, self.token_svc)

        self.incident_svc = IncidentService(self.incident_repo)
        self.replay_svc = ThreatReplayService(self.incident_repo)
        self.report_svc = IncidentReportService(self.incident_repo)
        self.similarity_svc = SimilarCaseService(self.incident_repo)

        # Dependency Overrides
        app.dependency_overrides[get_auth_repo] = lambda: self.auth_repo
        app.dependency_overrides[get_crypto_service] = lambda: self.crypto
        app.dependency_overrides[get_otp_adapter] = lambda: self.adapter
        app.dependency_overrides[get_otp_service] = lambda: self.otp_svc
        app.dependency_overrides[get_token_service] = lambda: self.token_svc
        app.dependency_overrides[get_auth_service] = lambda: self.auth_svc

        app.dependency_overrides[get_incident_repo] = lambda: self.incident_repo
        app.dependency_overrides[get_incident_service] = lambda: self.incident_svc
        app.dependency_overrides[get_replay_service] = lambda: self.replay_svc
        app.dependency_overrides[get_report_service] = lambda: self.report_svc
        app.dependency_overrides[get_similarity_service] = lambda: self.similarity_svc

        self.client = TestClient(app)

        # Create standard test users & auth tokens
        self.cust_user = self.auth_svc.register_user("Alice Customer", "alice@example.com", "+919876543001", "ValidPass123!", role="customer")
        self.auth_repo.update_verification_status(self.cust_user.user_id, email_verified=True, phone_verified=True)
        self.cust_token = self.token_svc.create_access_token(self.cust_user.user_id, "customer")

        self.cust2_user = self.auth_svc.register_user("Bob Customer", "bob@example.com", "+919876543002", "ValidPass123!", role="customer")
        self.auth_repo.update_verification_status(self.cust2_user.user_id, email_verified=True, phone_verified=True)
        self.cust2_token = self.token_svc.create_access_token(self.cust2_user.user_id, "customer")

        self.analyst_user = self.auth_svc.register_user("Charlie Analyst", "charlie@example.com", "+919876543003", "ValidPass123!", role="fraud_analyst")
        self.auth_repo.update_verification_status(self.analyst_user.user_id, email_verified=True, phone_verified=True)
        self.analyst_token = self.token_svc.create_access_token(self.analyst_user.user_id, "fraud_analyst")

        self.comp_user = self.auth_svc.register_user("Diana Compliance", "diana@example.com", "+919876543004", "ValidPass123!", role="compliance_officer")
        self.auth_repo.update_verification_status(self.comp_user.user_id, email_verified=True, phone_verified=True)
        self.comp_token = self.token_svc.create_access_token(self.comp_user.user_id, "compliance_officer")

        self.admin_user = self.auth_svc.register_user("Evan Admin", "evan@example.com", "+919876543005", "ValidPass123!", role="admin")
        self.auth_repo.update_verification_status(self.admin_user.user_id, email_verified=True, phone_verified=True)
        self.admin_token = self.token_svc.create_access_token(self.admin_user.user_id, "admin")

    def tearDown(self):
        app.dependency_overrides.clear()

    # 1. Incident creation & priority calculation
    def test_01_incident_creation(self):
        resp = self.client.post(
            "/api/v1/incidents",
            json={
                "transaction_id": "TXN_9901",
                "user_id": self.cust_user.user_id,
                "risk_score": 94.5,
                "risk_probability": 0.945,
                "risk_band": "CRITICAL_RISK",
                "decision": "block",
                "scam_type": "phishing",
                "scoring_snapshot": {"amount": 45000.0, "payee_id": "mule@upi"}
            },
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data["incident_id"].startswith("inc_"))
        self.assertEqual(data["status"], "new")
        self.assertEqual(data["priority"], "CRITICAL")
        self.assertIsNotNone(data["sla_due_at"])

        # Check genesis event created in hash chain
        events = self.incident_repo.get_incident_events(data["incident_id"])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].previous_hash, "0" * 64)

    # 2. Incident state machine (valid full lifecycle)
    def test_02_incident_state_machine(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9902", self.cust_user.user_id, 75.0, 0.75, "HIGH_RISK", "step_up"
        )
        iid = inc.incident_id

        # new -> under_investigation
        r1 = self.client.post(
            f"/api/v1/incidents/{iid}/transition",
            json={"new_status": "under_investigation"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()["status"], "under_investigation")

        # under_investigation -> escalated
        r2 = self.client.post(
            f"/api/v1/incidents/{iid}/transition",
            json={"new_status": "escalated", "reason": "High mule similarity index"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["status"], "escalated")

        # escalated -> confirmed_fraud
        r3 = self.client.post(
            f"/api/v1/incidents/{iid}/transition",
            json={"new_status": "confirmed_fraud"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.json()["status"], "confirmed_fraud")

        # confirmed_fraud -> closed
        r4 = self.client.post(
            f"/api/v1/incidents/{iid}/transition",
            json={"new_status": "closed"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(r4.status_code, 200)
        self.assertEqual(r4.json()["status"], "closed")

    # 3. Illegal transition rejection
    def test_03_illegal_transition_rejection(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9903", self.cust_user.user_id, 60.0, 0.60, "MEDIUM_RISK", "flag"
        )
        iid = inc.incident_id

        # Illegal: new -> closed (must go to under_investigation first)
        resp = self.client.post(
            f"/api/v1/incidents/{iid}/transition",
            json={"new_status": "closed"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Illegal state transition", resp.json()["detail"])

    # 4. Dismissal reason requirement
    def test_04_dismissal_reason_requirement(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9904", self.cust_user.user_id, 50.0, 0.50, "MEDIUM_RISK", "flag"
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)

        # Attempt dismissal with empty reason
        resp = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/transition",
            json={"new_status": "dismissed", "reason": "   "},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Dismissal requires a mandatory documented", resp.json()["detail"])

    # 5. Escalation reason requirement
    def test_05_escalation_reason_requirement(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9905", self.cust_user.user_id, 65.0, 0.65, "MEDIUM_RISK", "flag"
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)

        # Attempt escalation without reason
        resp = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/transition",
            json={"new_status": "escalated"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Escalation requires a mandatory documented", resp.json()["detail"])

    # 6. Audit event creation across transitions
    def test_06_audit_event_creation(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9906", self.cust_user.user_id, 70.0, 0.70, "HIGH_RISK", "step_up"
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)
        self.incident_svc.add_note(inc.incident_id, self.analyst_user.user_id, "fraud_analyst", "Customer contacted.")

        events = self.incident_repo.get_incident_events(inc.incident_id)
        self.assertEqual(len(events), 3)  # created, transition, note
        types = [e.event_type for e in events]
        self.assertEqual(types, ["incident_created", "status_transition", "note_added"])

    # 7. Hash-chain cryptographic verification
    def test_07_hash_chain_verification(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9907", self.cust_user.user_id, 80.0, 0.80, "HIGH_RISK", "step_up"
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.CONFIRMED_FRAUD, self.analyst_user.user_id)

        is_valid, msg, count = self.incident_repo.verify_incident_event_chain(inc.incident_id)
        self.assertTrue(is_valid)
        self.assertEqual(count, 3)
        self.assertIn("verified", msg.lower())

    # 8. Tamper detection on modified ledger records
    def test_08_tamper_detection(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9908", self.cust_user.user_id, 85.0, 0.85, "HIGH_RISK", "block"
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)

        # Directly tamper with SQLite table
        events = self.incident_repo.get_incident_events(inc.incident_id)
        target_event = events[1]
        with self.incident_repo._lock:
            with self.incident_repo._get_connection() as conn:
                conn.cursor().execute(
                    "UPDATE incident_events SET event_payload_json = ? WHERE event_id = ?",
                    (json.dumps({"forged_key": "malicious_modification"}), target_event.event_id)
                )
                conn.commit()

        # Chain verification must detect tampering!
        is_valid, msg, count = self.incident_repo.verify_incident_event_chain(inc.incident_id)
        self.assertFalse(is_valid)
        self.assertIn("tamper detected", msg.lower())

    # 9. Customer report generation (valid PDF)
    def test_09_customer_report_generation(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9909", self.cust_user.user_id, 92.0, 0.92, "CRITICAL_RISK", "block",
            scoring_snapshot={"amount": 25000.0, "customer_explanation": {"summary": "Payment blocked due to irregular device pattern."}}
        )
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}/report/customer",
            headers={"Authorization": f"Bearer {self.cust_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF-"))
        self.assertIn("X-Report-ID", resp.headers)
        self.assertIn("X-Content-SHA256", resp.headers)

    # 10. Analyst report generation (evidence pack)
    def test_10_analyst_report_generation(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9910", self.cust_user.user_id, 88.0, 0.88, "HIGH_RISK", "block",
            scoring_snapshot={
                "amount": 50000.0,
                "autoencoder_error": 0.542,
                "analyst_explanation": {
                    "top_shap_features": [{"feature": "amount", "contribution": 0.45}],
                    "autoencoder_evidence": {"reconstruction_error": 0.542, "threshold": 0.3418},
                    "graph_evidence": {"degree": 12, "connected_to_fraud_hub": True},
                    "sequence_evidence": {"top_attention_lag": 1}
                }
            }
        )
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}/report/analyst",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF-"))
        self.assertIn("X-Report-ID", resp.headers)

    # 11. Customer information isolation (no SHAP/internals)
    def test_11_customer_information_isolation(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9911", self.cust_user.user_id, 90.0, 0.90, "CRITICAL_RISK", "block",
            scoring_snapshot={"amount": 10000.0, "shap_values": [0.1, 0.2, 0.3], "autoencoder_error": 0.45}
        )
        # Customer fetching incident endpoint
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}",
            headers={"Authorization": f"Bearer {self.cust_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Scoring snapshot must be stripped for customer
        self.assertNotIn("scoring_snapshot", data)

        # Customer report generation must not include internal strings
        pdf_bytes, record = self.report_svc.generate_customer_report(inc.incident_id)
        # Verify internal terms are absent from customer PDF text stream
        self.assertNotIn(b"autoencoder_error", pdf_bytes)
        self.assertNotIn(b"TreeExplainer", pdf_bytes)

    # 12. Analyst information access (full multi-modal metrics)
    def test_12_analyst_information_access(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9912", self.cust_user.user_id, 91.0, 0.91, "CRITICAL_RISK", "block",
            scoring_snapshot={"amount": 12000.0, "shap_features": ["amount", "hour"]}
        )
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("scoring_snapshot", data)
        self.assertEqual(data["scoring_snapshot"]["amount"], 12000.0)

    # 13. Report SHA-256 integrity
    def test_13_report_sha256_integrity(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9913", self.cust_user.user_id, 45.0, 0.45, "MEDIUM_RISK", "flag"
        )
        pdf_bytes, record = self.report_svc.generate_customer_report(inc.incident_id)
        import hashlib
        computed_hash = hashlib.sha256(pdf_bytes).hexdigest()
        self.assertEqual(computed_hash, record.content_hash)

    # 14. QR verification endpoint
    def test_14_qr_verification(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9914", self.cust_user.user_id, 55.0, 0.55, "MEDIUM_RISK", "flag"
        )
        pdf_bytes, record = self.report_svc.generate_customer_report(inc.incident_id)

        # Verify correct hash
        resp = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/report/verify",
            json={"candidate_hash": record.content_hash, "report_type": "customer"},
            headers={"Authorization": f"Bearer {self.cust_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["verified"])

        # Verify wrong hash
        fake_hash = "0" * 64
        resp_fake = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/report/verify",
            json={"candidate_hash": fake_hash, "report_type": "customer"},
            headers={"Authorization": f"Bearer {self.cust_token}"}
        )
        self.assertEqual(resp_fake.status_code, 200)
        self.assertFalse(resp_fake.json()["verified"])

    # 15. Threat replay chronological ordering
    def test_15_replay_ordering(self):
        t0 = "2026-09-28T02:00:00+00:00"
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9915", self.cust_user.user_id, 82.0, 0.82, "HIGH_RISK", "block",
            scoring_snapshot={
                "amount": 20000.0,
                "timestamp": "2026-09-28T02:05:00+00:00",
                "user_history": [
                    {"timestamp": "2026-09-28T01:50:00+00:00", "amount": 500.0, "payee_id": "tea@upi"}
                ]
            }
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)

        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}/replay",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        events = data["events"]
        self.assertTrue(len(events) >= 3)

        # Verify ordering is strictly ascending
        timestamps = [e["timestamp"] for e in events]
        sorted_timestamps = sorted(timestamps)
        self.assertEqual(timestamps, sorted_timestamps)

    # 16. Threat replay recorded events only (no fabrication)
    def test_16_replay_uses_recorded_events_only(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9916", self.cust_user.user_id, 72.0, 0.72, "HIGH_RISK", "step_up"
        )
        replay = self.replay_svc.build_replay_timeline(inc.incident_id)
        for ev in replay["events"]:
            self.assertFalse(ev.get("is_synthesized", False))

    # 17. Missing event handling
    def test_17_missing_event_handling(self):
        # Empty user history snapshot
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9917", self.cust_user.user_id, 77.0, 0.77, "HIGH_RISK", "step_up",
            scoring_snapshot={"amount": 1500.0, "user_history": []}
        )
        replay = self.replay_svc.build_replay_timeline(inc.incident_id)
        # Should cleanly have only transaction + scoring + creation events, no invented history
        hist_events = [e for e in replay["events"] if e["event_type"] == "historical_transaction"]
        self.assertEqual(len(hist_events), 0)

    # 18. Final-decision attribution labeling
    def test_18_final_decision_attribution_labeling(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9918", self.cust_user.user_id, 83.0, 0.83, "HIGH_RISK", "block"
        )
        replay = self.replay_svc.build_replay_timeline(inc.incident_id)
        self.assertIn("Final-decision attribution", replay["attribution_notice"])
        tx_event = [e for e in replay["events"] if e["event_type"] == "transaction_initiated"][0]
        self.assertEqual(tx_event["risk_attribution"], "Final-decision attribution")

    # 19. Alert priority deterministic assignment
    def test_19_alert_priority(self):
        # Score 95 -> CRITICAL
        self.assertEqual(IncidentService.calculate_priority(95.0, "block"), IncidentPriority.CRITICAL)
        # Decision block -> CRITICAL even if score is 85
        self.assertEqual(IncidentService.calculate_priority(85.0, "block"), IncidentPriority.CRITICAL)
        # Score 75 -> HIGH
        self.assertEqual(IncidentService.calculate_priority(75.0, "step_up"), IncidentPriority.HIGH)
        # Score 50 -> MEDIUM
        self.assertEqual(IncidentService.calculate_priority(50.0, "flag"), IncidentPriority.MEDIUM)
        # Score 20 -> LOW
        self.assertEqual(IncidentService.calculate_priority(20.0, "approve"), IncidentPriority.LOW)

    # 20. Alert queue filtering and deterministic sorting
    def test_20_alert_filtering(self):
        self.incident_svc.create_incident_from_scoring("TXN_1", self.cust_user.user_id, 30.0, 0.30, "LOW_RISK", "approve")
        self.incident_svc.create_incident_from_scoring("TXN_2", self.cust_user.user_id, 95.0, 0.95, "CRITICAL_RISK", "block", scam_type="lottery")
        self.incident_svc.create_incident_from_scoring("TXN_3", self.cust_user.user_id, 75.0, 0.75, "HIGH_RISK", "step_up", scam_type="impersonation")

        # Query queue
        resp = self.client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {self.analyst_token}"})
        self.assertEqual(resp.status_code, 200)
        items = resp.json()
        self.assertTrue(len(items) >= 3)

        # First item must be CRITICAL priority
        self.assertEqual(items[0]["priority"], "CRITICAL")
        self.assertEqual(items[0]["transaction_id"], "TXN_2")

        # Filter by scam_type
        resp_filtered = self.client.get(
            "/api/v1/alerts?scam_type=lottery",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(len(resp_filtered.json()), 1)
        self.assertEqual(resp_filtered.json()[0]["scam_type"], "lottery")

    # 21. Analyst feedback recording
    def test_21_analyst_feedback(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9921", self.cust_user.user_id, 86.0, 0.86, "HIGH_RISK", "block"
        )
        resp = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/feedback",
            json={
                "verdict": "confirmed_fraud",
                "notes": "Victim confirmed unauthorized remote-desktop debit via AnyDesk.",
                "scam_type_corrected": "remote_access_scam",
                "evidence_references": ["ev_mule_report_01"]
            },
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])

        # Check feedback stored
        fb = self.incident_repo.get_feedback(inc.incident_id)
        self.assertEqual(len(fb), 1)
        self.assertEqual(fb[0].verdict, "confirmed_fraud")
        self.assertEqual(fb[0].scam_type_corrected, "remote_access_scam")

    # 22. Feedback audit ledger tracking
    def test_22_feedback_audit_trail(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9922", self.cust_user.user_id, 82.0, 0.82, "HIGH_RISK", "step_up"
        )
        self.incident_svc.submit_feedback(
            inc.incident_id, self.analyst_user.user_id, "escalated", "Escalating to AML team"
        )
        events = self.incident_repo.get_incident_events(inc.incident_id)
        types = [e.event_type for e in events]
        self.assertIn("feedback_recorded", types)

    # 23. RBAC enforcement (Customer cannot download analyst PDF)
    def test_23_rbac_enforcement(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9923", self.cust_user.user_id, 92.0, 0.92, "CRITICAL_RISK", "block"
        )
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}/report/analyst",
            headers={"Authorization": f"Bearer {self.cust_token}"}
        )
        self.assertEqual(resp.status_code, 403)

    # 24. Customer isolation (Cannot access another user's incident)
    def test_24_customer_cannot_access_another_user_incident(self):
        # Incident belongs to Bob (cust2)
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9924", self.cust2_user.user_id, 88.0, 0.88, "HIGH_RISK", "block"
        )
        # Alice (cust1) attempts access
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}",
            headers={"Authorization": f"Bearer {self.cust_token}"}
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Access denied", resp.json()["detail"])

    # 25. Analyst permissions (Triage, notes, feedback, replay)
    def test_25_analyst_permissions(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9925", self.cust_user.user_id, 79.0, 0.79, "HIGH_RISK", "step_up"
        )
        # Add note
        r_note = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/notes",
            json={"note_text": "Investigating payee cluster topology."},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(r_note.status_code, 200)

        # Get replay
        r_rep = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}/replay",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(r_rep.status_code, 200)

    # 26. Compliance permissions (Audit ledger & chain verification)
    def test_26_compliance_permissions(self):
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9926", self.cust_user.user_id, 81.0, 0.81, "HIGH_RISK", "block"
        )
        resp = self.client.get(
            f"/api/v1/incidents/{inc.incident_id}/audit",
            headers={"Authorization": f"Bearer {self.comp_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["chain_valid"])
        self.assertEqual(data["verified_event_count"], 1)

    # 27. Admin permissions (Elevated critical incident dismissal)
    def test_27_admin_permissions(self):
        # Critical incident (score >= 90)
        inc = self.incident_svc.create_incident_from_scoring(
            "TXN_9927", self.cust_user.user_id, 96.0, 0.96, "CRITICAL_RISK", "block"
        )
        self.incident_svc.transition_status(inc.incident_id, IncidentStatus.UNDER_INVESTIGATION, self.analyst_user.user_id)

        # Regular analyst attempting dismissal of CRITICAL incident is rejected
        resp_analyst = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/transition",
            json={"new_status": "dismissed", "reason": "Looks legitimate after call"},
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp_analyst.status_code, 400)
        self.assertIn("requires elevated 'admin'", resp_analyst.json()["detail"])

        # Admin can successfully dismiss CRITICAL incident
        resp_admin = self.client.post(
            f"/api/v1/incidents/{inc.incident_id}/transition",
            json={"new_status": "dismissed", "reason": "Executive override following verified KYC re-check"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp_admin.status_code, 200)
        self.assertEqual(resp_admin.json()["status"], "dismissed")

    # 28. Similar-case retrieval determinism
    def test_28_similar_case_determinism(self):
        inc1 = self.incident_svc.create_incident_from_scoring(
            "TXN_9928A", self.cust_user.user_id, 90.0, 0.90, "CRITICAL_RISK", "block",
            scam_type="phishing", scoring_snapshot={"amount": 40000.0}
        )
        inc2 = self.incident_svc.create_incident_from_scoring(
            "TXN_9928B", self.cust2_user.user_id, 88.0, 0.88, "CRITICAL_RISK", "block",
            scam_type="phishing", scoring_snapshot={"amount": 42000.0}
        )
        inc3 = self.incident_svc.create_incident_from_scoring(
            "TXN_9928C", self.cust_user.user_id, 20.0, 0.20, "LOW_RISK", "approve",
            scam_type="utility_bill", scoring_snapshot={"amount": 150.0}
        )

        resp = self.client.get(
            f"/api/v1/incidents/{inc1.incident_id}/similar?top_k=2",
            headers={"Authorization": f"Bearer {self.analyst_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(len(data) >= 1)

        # Most similar should be inc2 (same phishing scam, comparable amount, high risk)
        self.assertEqual(data[0]["similar_incident_id"], inc2.incident_id)
        self.assertGreater(data[0]["similarity_score"], 0.80)
        self.assertIn("Statistical similarity", data[0]["attribution_disclaimer"])


if __name__ == "__main__":
    unittest.main()
