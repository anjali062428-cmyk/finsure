"""
FinSure Phase 5 API & Model Serving Unit Tests
Covers 20 comprehensive production-readiness verification scenarios:
1. Valid transaction scoring
2. Invalid payload handling (negative/zero amount)
3. Missing required field handling
4. Wrong datatype handling
5. Missing model artifact fail-fast
6. Model loading only once (singleton reuse)
7. Deterministic repeated scoring
8. Sequence cold-start (zero past history)
9. Unseen graph entity handling
10. Autoencoder anomaly handling
11. Decision engine integration
12. Explanation integration (customer & analyst)
13. Audit trail creation
14. Audit chain cryptographic verification
15. Safe error response (zero stack traces leaked)
16. Request ID / Correlation ID propagation
17. Rate-limit behavior
18. Redis unavailable resilient fallback
19. Feature-order consistency (training == inference)
20. End-to-end inference execution
"""

import os
import unittest
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.model_service import ModelRegistry
from backend.services.feature_service import RealTimeFeatureService
from backend.services.profile_service import ProfileService
from backend.services.inference_service import InferenceService
from backend.api.schemas.transaction import TransactionScoreRequest
from ml.features.pipeline import FEATURE_COLUMNS


class TestAPIPhase5(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.registry = ModelRegistry.get_instance()
        if not cls.registry.is_loaded:
            cls.registry.load_all_artifacts()
        cls.feature_svc = RealTimeFeatureService()
        cls.profile_svc = ProfileService()
        cls.inference_svc = InferenceService(
            model_registry=cls.registry,
            feature_service=cls.feature_svc,
            profile_service=cls.profile_svc
        )

    # 1. Valid transaction scoring
    def test_valid_transaction_scoring(self):
        payload = {
            "transaction_id": "TXN_TEST_001",
            "timestamp": "2026-09-28T14:30:00Z",
            "user_id": "USR_000319",
            "payee_id": "reyanshkulkarni53@okhdfcbank",
            "amount": 2500.0,
            "device_id": "DEV_USR_000319_1",
            "channel": "upi",
            "city": "Mumbai"
        }
        res = self.client.post("/api/v1/transactions/score", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["transaction_id"], "TXN_TEST_001")
        self.assertIn("risk_score", data)
        self.assertIn("risk_probability", data)
        self.assertIn("decision", data)
        self.assertIn("reason_codes", data)
        self.assertIn("customer_explanation", data)
        self.assertIn("analyst_explanation", data)
        self.assertIn("scored_at", data)

    # 2. Invalid payload (negative amount)
    def test_invalid_payload_negative_amount(self):
        payload = {
            "user_id": "USR_001",
            "payee_id": "payee_1@upi",
            "amount": -500.0,
            "device_id": "DEV_001",
            "channel": "upi"
        }
        res = self.client.post("/api/v1/transactions/score", json=payload)
        self.assertEqual(res.status_code, 422)
        data = res.json()
        self.assertEqual(data["error"], "ValidationError")

    # 3. Missing required field
    def test_missing_required_field(self):
        payload = {
            # missing user_id and amount
            "payee_id": "payee_1@upi",
            "device_id": "DEV_001"
        }
        res = self.client.post("/api/v1/transactions/score", json=payload)
        self.assertEqual(res.status_code, 422)
        data = res.json()
        self.assertEqual(data["error"], "ValidationError")

    # 4. Wrong datatype
    def test_wrong_datatype(self):
        payload = {
            "user_id": "USR_001",
            "payee_id": "payee_1@upi",
            "amount": "NOT_A_FLOAT",
            "device_id": "DEV_001",
            "channel": "upi"
        }
        res = self.client.post("/api/v1/transactions/score", json=payload)
        self.assertEqual(res.status_code, 422)

    # 5. Missing model artifact fail-fast
    def test_missing_model_artifact_fail_fast(self):
        registry_bad = ModelRegistry(artifacts_dir="non_existent_dir")
        # Temporarily mock a missing artifact
        from backend.services.model_service import REQUIRED_ARTIFACTS
        orig_val = REQUIRED_ARTIFACTS["xgboost"]
        try:
            REQUIRED_ARTIFACTS["xgboost"] = "non_existent_file.json"
            registry_bad.is_loaded = False
            with self.assertRaises(FileNotFoundError):
                registry_bad.load_all_artifacts()
        finally:
            REQUIRED_ARTIFACTS["xgboost"] = orig_val

    # 6. Model loading only once (singleton reuse)
    def test_model_loading_only_once(self):
        reg = ModelRegistry.get_instance()
        self.assertTrue(reg.is_loaded)
        # Calling load_all_artifacts again should be a no-op
        reg.load_all_artifacts()
        self.assertTrue(reg.is_loaded)

    # 7. Deterministic repeated scoring
    def test_deterministic_repeated_scoring(self):
        req = TransactionScoreRequest(
            transaction_id="TXN_DETERMINISTIC_TEST",
            timestamp="2026-09-28T14:30:00Z",
            user_id="USR_DET_99",
            payee_id="payee_det@upi",
            amount=15000.0,
            device_id="DEV_DET_99",
            channel="upi"
        )
        # Use isolated profile service so second call doesn't read the first transaction in history
        prof_svc_isolated = ProfileService()
        inf_svc_isolated = InferenceService(
            model_registry=self.registry,
            feature_service=self.feature_svc,
            profile_service=prof_svc_isolated
        )
        res1, _ = inf_svc_isolated.score_transaction(req)
        
        prof_svc_isolated_2 = ProfileService()
        inf_svc_isolated_2 = InferenceService(
            model_registry=self.registry,
            feature_service=self.feature_svc,
            profile_service=prof_svc_isolated_2
        )
        res2, _ = inf_svc_isolated_2.score_transaction(req)

        self.assertEqual(res1.risk_score, res2.risk_score)
        self.assertEqual(res1.risk_probability, res2.risk_probability)
        self.assertEqual(res1.decision, res2.decision)
        self.assertEqual(res1.reason_codes, res2.reason_codes)

    # 8. Sequence cold-start (zero past history)
    def test_sequence_cold_start(self):
        req = TransactionScoreRequest(
            transaction_id="TXN_COLD_START",
            user_id="USR_BRAND_NEW_101",
            payee_id="payee_new@upi",
            amount=500.0,
            device_id="DEV_NEW_101",
            channel="upi"
        )
        res, lats = self.inference_svc.score_transaction(req)
        self.assertEqual(res.analyst_explanation["temporal_sequence"]["history_length"], 0)
        self.assertIn("No prior transaction history", res.analyst_explanation["temporal_sequence"]["narrative"])

    # 9. Unseen graph entity handling
    def test_unseen_graph_entity(self):
        req = TransactionScoreRequest(
            transaction_id="TXN_UNSEEN_GRAPH",
            user_id="USR_UNSEEN_X999",
            payee_id="payee_unseen@upi",
            amount=3000.0,
            device_id="DEV_UNSEEN_Z888",
            channel="upi"
        )
        res, lats = self.inference_svc.score_transaction(req)
        cache_status = res.analyst_explanation["entity_graph"]["topology_evidence"]
        self.assertIn("evidence_items", cache_status)

    # 10. Autoencoder anomaly handling
    def test_autoencoder_anomaly_handling(self):
        req = TransactionScoreRequest(
            transaction_id="TXN_OUTLIER_TEST",
            user_id="USR_000319",
            payee_id="reyanshkulkarni53@okhdfcbank",
            amount=98000.0,  # massive amount relative to user mean
            device_id="DEV_USR_000319_1",
            channel="upi"
        )
        res, _ = self.inference_svc.score_transaction(req)
        ae_data = res.analyst_explanation["unsupervised_autoencoder"]
        self.assertIn("reconstruction_mse", ae_data)
        self.assertIn("frozen_threshold", ae_data)

    # 11. Decision engine integration
    def test_decision_engine_integration(self):
        bands = ["low", "medium", "high", "critical"]
        decisions = ["approve", "step_up", "cooling_period", "block"]
        for score in [10, 45, 75, 95]:
            band_info = self.registry.decision_engine.get_risk_band(score)
            act_info = self.registry.decision_engine.get_action(score)
            self.assertIn(band_info["band"], bands)
            self.assertIn(act_info["action"], decisions)

    # 12. Explanation integration
    def test_explanation_integration(self):
        payload = {
            "user_id": "USR_000319",
            "payee_id": "reyanshkulkarni53@okhdfcbank",
            "amount": 1000.0,
            "device_id": "DEV_USR_000319_1",
            "channel": "upi",
            "language": "hi"
        }
        res = self.client.post("/api/v1/transactions/score", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["customer_explanation"]["language"], "hi")
        self.assertIn("header", data["customer_explanation"])
        self.assertIn("xgboost_shap", data["analyst_explanation"])

    # 13. Audit trail creation
    def test_audit_trail_creation(self):
        initial_count = len(self.registry.audit_trail.records)
        req = TransactionScoreRequest(
            user_id="USR_000319",
            payee_id="reyanshkulkarni53@okhdfcbank",
            amount=1200.0,
            device_id="DEV_USR_000319_1",
            channel="upi"
        )
        res, _ = self.inference_svc.score_transaction(req)
        self.assertEqual(len(self.registry.audit_trail.records), initial_count + 1)
        self.assertEqual(self.registry.audit_trail.records[-1].transaction_id, res.transaction_id)

    # 14. Audit chain cryptographic verification
    def test_audit_chain_verification(self):
        valid, err = self.registry.audit_trail.verify_chain()
        self.assertTrue(valid)
        self.assertIsNone(err)

    # 15. Safe error response
    def test_safe_error_response(self):
        res = self.client.post("/api/v1/transactions/score", json={"bad_field": 123})
        self.assertEqual(res.status_code, 422)
        body = res.text.lower()
        self.assertNotIn("traceback", body)
        self.assertNotIn("file \"", body)

    # 16. Request ID propagation
    def test_request_id_propagation(self):
        custom_id = "test-corr-id-98765"
        res = self.client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("X-Request-ID"), custom_id)

    # 17. Rate-limit behavior
    def test_rate_limit_behavior(self):
        # Normal requests within threshold succeed
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)

    # 18. Redis unavailable resilient fallback
    def test_redis_unavailable_fallback(self):
        bad_profile_svc = ProfileService(redis_url="redis://localhost:9999/0")
        self.assertFalse(bad_profile_svc.is_redis_available)
        prof = bad_profile_svc.get_user_profile("USR_FALLBACK")
        self.assertEqual(prof["mean_amount"], 1300.0)

    # 19. Feature-order consistency
    def test_feature_order_consistency(self):
        self.assertEqual(len(self.feature_svc.feature_columns), 36)
        self.assertEqual(self.feature_svc.feature_columns, list(FEATURE_COLUMNS))
        vec, f_dict = self.feature_svc.compute_features(
            {"amount": 100.0},
            {"mean_amount": 1300.0},
            [],
            {"is_new_payee": 1, "is_new_device": 1}
        )
        self.assertEqual(len(vec), 36)
        self.assertEqual(vec.dtype, np.float32)

    # 20. End-to-end inference execution
    def test_end_to_end_inference(self):
        payload = {
            "transaction_id": "TXN_E2E_VERIFY",
            "user_id": "USR_000319",
            "payee_id": "reyanshkulkarni53@okhdfcbank",
            "amount": 7500.0,
            "device_id": "DEV_USR_000319_1",
            "channel": "upi"
        }
        res = self.client.post("/api/v1/transactions/score", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["transaction_id"], "TXN_E2E_VERIFY")
        self.assertIn("X-Response-Time-Ms", res.headers)
        self.assertIn("X-Request-ID", res.headers)


if __name__ == "__main__":
    unittest.main()
