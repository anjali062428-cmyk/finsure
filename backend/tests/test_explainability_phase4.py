"""
FinSure Phase 4 Explainability & Risk Decision Engine Unit Tests
Tests:
1. Canonical Risk Scoring Contract (P in [0,1] -> S in [0,100])
2. Operational Threshold Decision Mapping (approve, step_up, cooling_period, block)
3. Configuration and Version Policy Loading
4. TreeExplainer SHAP Factor Decomposition (directional signs & display names)
5. Sequence Model Attention Weights (sum to 1.0, ranking, non-causal narrative)
6. Graph Relationship Evidence (cache lookup, shared device, hub payee)
7. Deep Autoencoder Anomaly Diagnostics vs Frozen Threshold (0.3418)
8. Canonical Reason Code Engine & Priority Ordering
9. Bilingual Template Verification (English & Hindi)
10. Customer-Facing Leakage Prevention (zero internal model jargon)
11. Analyst Technical Payload Completeness
12. Cryptographic Audit Trail Hash-Chaining
13. Audit Trail Tamper Detection
14. What-If Threshold Simulator Cost & Decision Mix Evaluation
"""

import os
import unittest
import numpy as np
import pandas as pd
import torch

from ml.decision.decision_engine import FinSureDecisionEngine
from ml.decision.simulator import WhatIfThresholdSimulator
from ml.explainability.shap_explainer import XGBoostShapExplainer, FEATURE_DISPLAY_NAMES
from ml.explainability.sequence_explainer import SequenceAttentionExplainer
from ml.explainability.graph_explainer import GraphEvidenceExplainer
from ml.explainability.autoencoder_explainer import AutoencoderAnomalyExplainer, FROZEN_ZERO_DAY_THRESHOLD
from ml.explainability.reason_codes import ReasonCodeEngine, CanonicalReasonCode, REASON_CODE_METADATA
from ml.explainability.explanation_formatter import ExplanationFormatter
from ml.explainability.audit_trail import ExplanationAuditTrail, AuditRecord
from ml.features.pipeline import FEATURE_COLUMNS


class TestExplainabilityPhase4(unittest.TestCase):

    def setUp(self):
        self.decision_engine = FinSureDecisionEngine()
        self.simulator = WhatIfThresholdSimulator()
        self.reason_engine = ReasonCodeEngine()

    # 1. Canonical Risk Scoring Contract
    def test_risk_scoring_contract(self):
        # Boundary and rounding tests
        self.assertEqual(FinSureDecisionEngine.probability_to_score(0.0), 0)
        self.assertEqual(FinSureDecisionEngine.probability_to_score(1.0), 100)
        self.assertEqual(FinSureDecisionEngine.probability_to_score(0.394), 39)
        self.assertEqual(FinSureDecisionEngine.probability_to_score(0.396), 40)
        self.assertEqual(FinSureDecisionEngine.probability_to_score(0.694), 69)
        self.assertEqual(FinSureDecisionEngine.probability_to_score(0.895), 90)
        
        # Clamping
        self.assertEqual(FinSureDecisionEngine.probability_to_score(-0.1), 0)
        self.assertEqual(FinSureDecisionEngine.probability_to_score(1.5), 100)

        # Vectorized
        probs = np.array([0.05, 0.42, 0.75, 0.95])
        scores = FinSureDecisionEngine.probability_to_score(probs)
        np.testing.assert_array_equal(scores, [5, 42, 75, 95])

    # 2. Operational Threshold Decision Mapping
    def test_operational_decision_mapping(self):
        test_cases = [
            (0, "approve", "low"),
            (39, "approve", "low"),
            (40, "step_up", "medium"),
            (69, "step_up", "medium"),
            (70, "cooling_period", "high"),
            (89, "cooling_period", "high"),
            (90, "block", "critical"),
            (100, "block", "critical")
        ]
        for score, expected_action, expected_band in test_cases:
            action_info = self.decision_engine.get_action(score)
            band_info = self.decision_engine.get_risk_band(score)
            self.assertEqual(action_info["action"], expected_action, f"Failed action for score {score}")
            self.assertEqual(band_info["band"], expected_band, f"Failed band for score {score}")

    # 3. Configuration Loading
    def test_threshold_configuration_loading(self):
        self.assertEqual(self.decision_engine.policy_version, "v1.0.0")
        self.assertIn("approve", self.decision_engine.decision_thresholds)
        self.assertIn("step_up", self.decision_engine.decision_thresholds)
        self.assertIn("cooling_period", self.decision_engine.decision_thresholds)
        self.assertIn("block", self.decision_engine.decision_thresholds)
        self.assertEqual(self.decision_engine.cost_parameters["avg_fraud_loss_inr"], 32000.0)
        self.assertEqual(self.decision_engine.cost_parameters["friction_cost_inr"], 250.0)

    # 4. TreeExplainer SHAP Factor Decomposition
    def test_xgboost_shap_explainer(self):
        explainer = XGBoostShapExplainer()
        if not explainer.explainer:
            self.skipTest("XGBoost artifact not available.")

        # Test single instance explanation
        x_dummy = np.zeros(len(FEATURE_COLUMNS), dtype=np.float32)
        x_dummy[0] = 50000.0  # high amount
        x_dummy[12] = 4.5     # high amt_user_zscore
        x_dummy[20] = 1.0     # is_new_device

        res = explainer.explain_instance(x_dummy, top_k=5)
        self.assertIn("base_value", res)
        self.assertIn("shap_values", res)
        self.assertIn("top_positive_factors", res)
        self.assertIn("top_negative_factors", res)

        # Check directional flags
        for factor in res["top_positive_factors"]:
            self.assertEqual(factor["direction"], "increases_risk")
            self.assertGreater(factor["shap_impact"], 0.0)
            self.assertIn(factor["feature"], FEATURE_COLUMNS)
            self.assertTrue(len(factor["display_name"]) > 0)

        for factor in res["top_negative_factors"]:
            self.assertEqual(factor["direction"], "decreases_risk")
            self.assertLess(factor["shap_impact"], 0.0)

    # 5. Sequence Model Attention Weights
    def test_sequence_attention_explainer(self):
        explainer = SequenceAttentionExplainer()
        if not explainer.is_loaded:
            self.skipTest("Sequence model artifact not available.")

        seq = np.random.randn(1, 50, 12).astype(np.float32)
        mask = np.ones((1, 50), dtype=bool)
        mask[0, 15:] = False  # 15 valid steps
        cur_feats = np.zeros((1, 36), dtype=np.float32)

        res = explainer.explain_sequence(seq, mask, cur_feats, top_k=5)
        self.assertEqual(res["valid_history_length"], 15)
        self.assertAlmostEqual(res["weights_sum"], 1.0, places=4)
        self.assertTrue(len(res["ranked_steps"]) <= 5)

        # Verify ranking order
        weights = [s["attention_weight"] for s in res["ranked_steps"]]
        self.assertEqual(weights, sorted(weights, reverse=True))

        # Verify non-causal narrative constraint
        narrative = res["narrative"]
        self.assertIn("temporal relevance", narrative.lower())
        self.assertIn("not direct causality", narrative.lower())

    # 6. Graph Relationship Evidence
    def test_graph_evidence_explainer(self):
        explainer = GraphEvidenceExplainer()
        # Register a shared device with multiple users
        explainer.register_graph_edges("USR_001", "payee_1@upi", "DEV_SHARED")
        explainer.register_graph_edges("USR_002", "payee_1@upi", "DEV_SHARED")
        explainer.register_graph_edges("USR_003", "payee_1@upi", "DEV_SHARED")

        res = explainer.explain_relationships("USR_001", "payee_1@upi", "DEV_SHARED")
        self.assertTrue(res["topology_evidence"]["is_shared_device"])
        self.assertEqual(res["topology_evidence"]["device_account_count"], 3)
        self.assertIn("topology_evidence", res)
        self.assertIn("graph_narrative", res)

    # 7. Deep Autoencoder Anomaly Diagnostics vs 0.3418
    def test_autoencoder_anomaly_explainer(self):
        explainer = AutoencoderAnomalyExplainer()
        if not explainer.is_loaded:
            self.skipTest("Autoencoder artifact not available.")

        self.assertEqual(explainer.anomaly_threshold, FROZEN_ZERO_DAY_THRESHOLD)

        # Baseline features
        x_norm = np.zeros(len(FEATURE_COLUMNS), dtype=np.float32)
        res_norm = explainer.explain_anomaly(x_norm, is_already_scaled=True)
        self.assertIn("reconstruction_mse", res_norm)
        self.assertIn("top_anomalous_features", res_norm)
        self.assertIn("narrative", res_norm)

        # Extreme outlier triggering zero-day threshold
        x_outlier = np.full(len(FEATURE_COLUMNS), 50.0, dtype=np.float32)
        res_outlier = explainer.explain_anomaly(x_outlier, is_already_scaled=True)
        self.assertTrue(res_outlier["is_zero_day_anomaly"])
        self.assertGreater(res_outlier["reconstruction_mse"], FROZEN_ZERO_DAY_THRESHOLD)
        self.assertIn("Zero-Day Anomaly", res_outlier["narrative"])

    # 8. Canonical Reason Code Engine
    def test_reason_code_engine(self):
        # All 10 codes exist in metadata
        for code in CanonicalReasonCode:
            self.assertIn(code, REASON_CODE_METADATA)

        # Test trigger logic
        feats = {
            "amount": 75000.0,
            "amt_user_zscore": 4.8,
            "amt_to_user_mean": 6.2,
            "is_new_device": 1,
            "is_new_payee": 1,
            "is_night": 1,
            "txn_count_1m": 2.0,
            "rapid_burst": 1,
            "impossible_travel": 1
        }
        ae_ev = {"is_zero_day_anomaly": True, "reconstruction_mse": 0.45}
        graph_ev = {"topology_evidence": {"is_shared_device": True}}

        triggered = self.reason_engine.evaluate_reason_codes(
            feats,
            graph_evidence=graph_ev,
            ae_evidence=ae_ev
        )
        codes = [item["code"] for item in triggered]

        self.assertIn(CanonicalReasonCode.RC_AMOUNT_ANOMALY.value, codes)
        self.assertIn(CanonicalReasonCode.RC_RAPID_VELOCITY.value, codes)
        self.assertIn(CanonicalReasonCode.RC_NEW_DEVICE.value, codes)
        self.assertIn(CanonicalReasonCode.RC_OFF_HOURS.value, codes)
        self.assertIn(CanonicalReasonCode.RC_GRAPH_RISK.value, codes)
        self.assertIn(CanonicalReasonCode.RC_RECONSTRUCTION_OUTLIER.value, codes)
        self.assertIn(CanonicalReasonCode.RC_BENEFICIARY_RISK.value, codes)
        self.assertIn(CanonicalReasonCode.RC_GEO_MISMATCH.value, codes)
        self.assertIn(CanonicalReasonCode.RC_HIGH_VALUE_FIRST_TIME.value, codes)

        # Verify sorted by priority
        priorities = [item["priority"] for item in triggered]
        self.assertEqual(priorities, sorted(priorities))

    # 9. Bilingual Template Verification
    def test_bilingual_templates(self):
        for code, meta in REASON_CODE_METADATA.items():
            self.assertTrue(len(meta["en"]["title"]) > 0)
            self.assertTrue(len(meta["en"]["description"]) > 0)
            self.assertTrue(len(meta["hi"]["title"]) > 0)
            self.assertTrue(len(meta["hi"]["description"]) > 0)

    # 10. Customer-Facing Leakage Prevention
    def test_customer_explanation_isolation(self):
        reason_codes = [
            REASON_CODE_METADATA[CanonicalReasonCode.RC_AMOUNT_ANOMALY],
            REASON_CODE_METADATA[CanonicalReasonCode.RC_NEW_DEVICE]
        ]
        
        for lang in ["en", "hi"]:
            res = ExplanationFormatter.format_customer_explanation(
                action="step_up",
                reason_codes=reason_codes,
                language=lang
            )
            # Combine all text
            all_text = f"{res['header']} {res['message']} {res['instruction']} "
            for h in res["safety_highlights"]:
                all_text += f"{h['title']} {h['summary']} "

            all_text_lower = all_text.lower()
            forbidden = [
                "shap", "xgboost", "zscore", "z-score", "gru", "autoencoder",
                "graphsage", "latent", "0.3418", "feature", "epoch", "loss"
            ]
            for word in forbidden:
                self.assertNotIn(word, all_text_lower, f"Forbidden word '{word}' found in customer message ({lang})")

    # 11. Analyst Technical Payload Completeness
    def test_analyst_explanation_completeness(self):
        analyst_payload = ExplanationFormatter.format_analyst_explanation(
            transaction_id="TXN_TEST_001",
            risk_score=85,
            risk_band="high",
            calibrated_probability=0.852,
            action="cooling_period",
            policy_version="v1.0.0",
            shap_explanation={"base_value": -2.1, "top_positive_factors": [], "top_negative_factors": []},
            sequence_explanation={"sequence_model_probability": 0.88, "valid_history_length": 5, "ranked_steps": []},
            graph_explanation={"topology_evidence": {}, "similarity_metrics": {}},
            autoencoder_explanation={"reconstruction_mse": 0.38, "is_zero_day_anomaly": True},
            scam_prediction={"scam_type": "account_takeover", "confidence": 0.94},
            reason_codes=[{"code": "RC_AMOUNT_ANOMALY"}]
        )
        self.assertIn("meta", analyst_payload)
        self.assertIn("xgboost_shap", analyst_payload)
        self.assertIn("temporal_sequence", analyst_payload)
        self.assertIn("entity_graph", analyst_payload)
        self.assertIn("unsupervised_autoencoder", analyst_payload)
        self.assertIn("scam_typology", analyst_payload)
        self.assertEqual(analyst_payload["meta"]["risk_score"], 85)
        self.assertEqual(analyst_payload["scam_typology"]["predicted_scam_type"], "account_takeover")

    # 12. Cryptographic Audit Trail Hash-Chaining
    def test_audit_trail_integrity(self):
        trail = ExplanationAuditTrail()
        
        trail.append(
            decision_id="DEC_101",
            transaction_id="TXN_001",
            risk_score=20,
            action="approve",
            reason_codes=[],
            explanation_payload={"customer": "Approved"}
        )
        trail.append(
            decision_id="DEC_102",
            transaction_id="TXN_002",
            risk_score=82,
            action="cooling_period",
            reason_codes=["RC_AMOUNT_ANOMALY"],
            explanation_payload={"customer": "Hold applied"}
        )
        
        valid, err = trail.verify_chain()
        self.assertTrue(valid)
        self.assertIsNone(err)

    # 13. Audit Trail Tamper Detection
    def test_audit_trail_tamper_detection(self):
        trail = ExplanationAuditTrail()
        trail.append("DEC_1", "TXN_1", 20, "approve", [], {"note": "ok"})
        trail.append("DEC_2", "TXN_2", 95, "block", ["RC_NEW_DEVICE"], {"note": "blocked"})

        # Tamper with the score in record 1
        trail.records[1].risk_score = 15  # fraudulent modification!
        valid, err = trail.verify_chain()
        self.assertFalse(valid)
        self.assertIn("Hash mismatch", err)

        # Restore score, but tamper with action
        trail.records[1].risk_score = 95
        trail.records[1].action = "approve"  # illegal override!
        valid, err = trail.verify_chain()
        self.assertFalse(valid)
        self.assertIn("Hash mismatch", err)

    # 14. What-If Threshold Simulator Cost & Mix
    def test_what_if_simulator(self):
        scores = np.array([10, 20, 30, 45, 55, 75, 85, 95])
        labels = np.array([0,  0,  0,  0,  1,  0,  1,  1])  # 3 frauds, 5 legit

        res = self.simulator.evaluate_policy(
            risk_scores=scores,
            y_true=labels,
            approve_max=39,
            step_up_max=69,
            cooling_max=89,
            policy_name="test_policy"
        )
        mix = res["decision_mix"]
        self.assertEqual(mix["approve_count"], 3)
        self.assertEqual(mix["step_up_count"], 2)
        self.assertEqual(mix["cooling_period_count"], 2)
        self.assertEqual(mix["block_count"], 1)

        # Check financial impact
        impact = res["financial_impact"]
        # In scores <= 39 (approve), how many frauds? None! All frauds are in 55, 85, 95.
        self.assertEqual(impact["frauds_approved_missed"], 0)
        self.assertEqual(impact["frauds_intercepted"], 3)
        self.assertEqual(impact["fraud_catch_rate_pct"], 100.0)

        # Compare policies
        comp = self.simulator.compare_policies(scores, labels)
        self.assertEqual(comp["comparison_count"], 3)

    # 15. Audit Trail Persistence & Restart Verification
    def test_audit_trail_restart_persistence(self):
        import tempfile
        trail = ExplanationAuditTrail()
        trail.append("DEC_P1", "TXN_P1", 10, "approve", [], {"customer": "ok"})
        trail.append("DEC_P2", "TXN_P2", 80, "cooling_period", ["RC_AMOUNT_ANOMALY"], {"customer": "hold"})

        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as f:
            temp_path = f.name

        try:
            trail.save(temp_path)
            reloaded = ExplanationAuditTrail.load(temp_path)
            valid, err = reloaded.verify_chain()
            self.assertTrue(valid)
            self.assertIsNone(err)
            self.assertEqual(len(reloaded.records), 2)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # 16. What-If Simulator Cannot Mutate Production Thresholds
    def test_simulator_cannot_mutate_production_config(self):
        # Initial production thresholds
        prod_decision_thresholds = dict(self.decision_engine.decision_thresholds)
        prod_policy_version = self.decision_engine.policy_version

        # Run simulator with completely arbitrary wild thresholds
        scores = np.array([10, 50, 90])
        sim_res = self.simulator.evaluate_policy(scores, approve_max=10, step_up_max=20, cooling_max=30)

        # Assert production engine state remains completely untouched
        self.assertEqual(self.decision_engine.decision_thresholds, prod_decision_thresholds)
        self.assertEqual(self.decision_engine.policy_version, prod_policy_version)
        self.assertEqual(self.decision_engine.decision_thresholds["approve"]["max_score"], 39)


if __name__ == "__main__":
    unittest.main()

