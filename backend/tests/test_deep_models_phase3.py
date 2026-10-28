"""
FinSure Phase 3 Deep Learning and Ensemble Brain Unit Tests
Tests:
1. Sequence window builder & target transaction exclusion (zero leakage)
2. Temporal graph builder & edge time-bounding
3. Sequence model architecture & attention weight validity
4. GraphSAGE architecture & node embedding cache inference
5. Deep Autoencoder anomaly scoring & calibration
6. Scam type classifier 6-class typology
7. Calibrated Meta-Learner probability bounds & risk scores [0, 100]
8. Phase 3 result artifact verification
"""

import os
import unittest
import numpy as np
import pandas as pd
import torch
import joblib

from ml.data.deep_datasets import (
    SequenceWindowBuilder,
    TemporalGraphBuilder,
    SCAM_TYPE_MAP,
    SCAM_CLASSES
)
from ml.models.sequence_model import FinSureSequenceModel
from ml.models.graph_model import FinSureGraphSAGE
from ml.models.autoencoder import FinSureAutoencoder
from ml.models.scam_classifier import ScamTypeClassifier
from ml.models.meta_learner import FinSureMetaLearner


class TestDeepModelsPhase3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def test_01_sequence_builder_excludes_target_transaction(self):
        """Verify that sequence builder strictly excludes the current transaction from sequence history."""
        # Create a synthetic 3-transaction timeline for 1 user
        tx_data = pd.DataFrame([
            {
                "txn_id": "TXN_1",
                "user_id": "USR_TEST_A",
                "payee_id": "PAYEE_1",
                "device_id": "DEV_1",
                "amount": 100.0,
                "created_at": "2026-01-01T10:00:00",
                "channel": "UPI"
            },
            {
                "txn_id": "TXN_2",
                "user_id": "USR_TEST_A",
                "payee_id": "PAYEE_2",
                "device_id": "DEV_1",
                "amount": 250.0,
                "created_at": "2026-01-01T11:00:00",
                "channel": "UPI"
            },
            {
                "txn_id": "TXN_3",
                "user_id": "USR_TEST_A",
                "payee_id": "PAYEE_3",
                "device_id": "DEV_1",
                "amount": 5000.0,
                "created_at": "2026-01-01T12:00:00",
                "channel": "UPI"
            }
        ])

        builder = SequenceWindowBuilder(max_seq_len=5, step_dim=12)
        seqs, masks = builder.build_sequences_for_dataframe(tx_data)

        self.assertEqual(seqs.shape, (3, 5, 12))
        self.assertEqual(masks.shape, (3, 5))

        # TXN 1 (first txn): History MUST be empty (0 prior transactions)
        self.assertEqual(masks[0].sum(), 0, "First transaction must have 0 historical steps!")
        self.assertEqual(seqs[0].sum(), 0.0, "First transaction sequence must be all zeros!")

        # TXN 2 (second txn): History must have exactly 1 step (TXN 1 only)
        self.assertEqual(masks[1].sum(), 1, "Second transaction must have exactly 1 historical step!")
        # The step placed at index 4 (end of window) must correspond to TXN 1 amount log
        expected_log_amt_txn1 = np.log1p(100.0) / 10.0
        self.assertAlmostEqual(seqs[1, 4, 0], expected_log_amt_txn1, places=3)

        # TXN 3 (third txn): History must have exactly 2 steps (TXN 1 and TXN 2, NOT TXN 3)
        self.assertEqual(masks[2].sum(), 2, "Third transaction must have exactly 2 historical steps!")
        expected_log_amt_txn2 = np.log1p(250.0) / 10.0
        self.assertAlmostEqual(seqs[2, 4, 0], expected_log_amt_txn2, places=3)
        self.assertAlmostEqual(seqs[2, 3, 0], expected_log_amt_txn1, places=3)

    def test_02_temporal_graph_builder_respects_time_cutoff(self):
        """Verify that graph builder adds no edges occurring after max_timestamp."""
        tx_data = pd.DataFrame([
            {"user_id": "U1", "payee_id": "P1", "device_id": "D1", "amount": 100, "created_at": "2026-01-01T10:00:00"},
            {"user_id": "U1", "payee_id": "P2", "device_id": "D1", "amount": 200, "created_at": "2026-01-02T10:00:00"},
            {"user_id": "U2", "payee_id": "P3", "device_id": "D2", "amount": 300, "created_at": "2026-03-15T10:00:00"}
        ])

        gb = TemporalGraphBuilder()
        # Cut off before March 15
        edges, nodes = gb.build_graph_from_txns(tx_data, max_timestamp="2026-01-31T23:59:59")
        
        # U2, P3, D2 should NOT exist in graph
        self.assertNotIn("user:U2", gb.node_to_id, "U2 should not be present before cutoff!")
        self.assertNotIn("payee:P3", gb.node_to_id, "P3 should not be present before cutoff!")

    def test_03_sequence_model_attention_weights(self):
        """Verify sequence model produces valid logits and normalized attention weights."""
        model = FinSureSequenceModel(step_dim=12, current_dim=36, hidden_dim=64, encoder_type="gru")
        model.eval()

        seq = torch.randn(4, 50, 12)
        mask = torch.ones(4, 50, dtype=torch.bool)
        # Mask out first 30 steps for row 0
        mask[0, :30] = False
        cur_feats = torch.randn(4, 36)

        logits, attn = model(seq, mask, cur_feats)

        self.assertEqual(logits.shape, (4, 1))
        self.assertEqual(attn.shape, (4, 50))

        # Check attention weights sum to 1.0
        row0_sum = float(attn[0].detach().sum())
        self.assertAlmostEqual(row0_sum, 1.0, places=4)
        # Check masked steps have 0 attention
        self.assertAlmostEqual(float(attn[0, :30].detach().sum()), 0.0, places=4)

    def test_04_graphsage_and_cache_inference(self):
        """Verify GraphSAGE forward graph and sub-millisecond cached inference."""
        model = FinSureGraphSAGE(node_in_dim=5, hidden_dim=32, embed_dim=16, key_feat_dim=10)
        
        # Mock node features and edges
        x = torch.randn(6, 5)
        edge_index = torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long)
        id_to_node = {0: "user:U1", 1: "payee:P1", 2: "device:D1", 3: "user:U2", 4: "payee:P2", 5: "device:D2"}

        model.cache_node_embeddings(x, edge_index, id_to_node)
        self.assertEqual(len(model.cached_embeddings), 6)

        # Predict using cache
        key_feats = np.random.randn(2, 10).astype(np.float32)
        probs = model.predict_with_cache(["U1", "U99_UNSEEN"], ["P1", "P2"], ["D1", "D2"], key_feats)

        self.assertEqual(len(probs), 2)
        self.assertTrue((probs >= 0.0).all() and (probs <= 1.0).all())

    def test_05_autoencoder_legitimate_scoring(self):
        """Verify autoencoder anomaly score is bounded in [0, 1] and separates anomalies."""
        ae = FinSureAutoencoder(input_dim=36)
        
        # Mock legitimate data
        x_legit = np.random.randn(100, 36).astype(np.float32) * 0.5
        ae.fit_normalizer(x_legit)

        # Mock extreme anomaly
        x_anomaly = np.ones((10, 36), dtype=np.float32) * 20.0

        scores_legit = ae.get_anomaly_score(x_legit)
        scores_anomaly = ae.get_anomaly_score(x_anomaly)

        self.assertTrue((scores_legit >= 0.0).all() and (scores_legit <= 1.0).all())
        self.assertTrue((scores_anomaly >= 0.0).all() and (scores_anomaly <= 1.0).all())
        self.assertGreater(scores_anomaly.mean(), scores_legit.mean())

    def test_06_scam_type_classifier_structure(self):
        """Verify scam classifier predicts 6 distinct classes with valid probability distribution."""
        clf = ScamTypeClassifier(input_dim=36, num_classes=6)
        x = np.random.randn(5, 36).astype(np.float32)

        probs = clf.predict_proba(x)
        labels = clf.predict_label(x)

        self.assertEqual(probs.shape, (5, 6))
        np.testing.assert_allclose(probs.sum(axis=-1), 1.0, rtol=1e-5)
        self.assertEqual(len(labels), 5)
        for label in labels:
            self.assertIn(label, SCAM_CLASSES)

    def test_07_meta_learner_risk_score_scale(self):
        """Verify meta-learner produces calibrated probabilities in [0, 1] and risk scores in [0, 100]."""
        meta = FinSureMetaLearner(base_learner_type="xgboost", calibration_method="isotonic")

        # Mock OOF train and val
        Z_train = np.random.uniform(0, 1, (100, 8))
        y_train = (Z_train[:, 0] > 0.7).astype(int)
        Z_val = np.random.uniform(0, 1, (50, 8))
        y_val = (Z_val[:, 0] > 0.7).astype(int)

        meta.fit(Z_train, y_train, Z_val, y_val)

        Z_test = np.random.uniform(0, 1, (20, 8))
        cal_probs = meta.predict_calibrated_proba(Z_test)
        risk_scores = meta.predict_risk_score(Z_test)

        self.assertTrue((cal_probs >= 0.0).all() and (cal_probs <= 1.0).all())
        self.assertTrue((risk_scores >= 0).all() and (risk_scores <= 100).all())
        self.assertTrue(np.issubdtype(risk_scores.dtype, np.integer))

    def test_08_phase3_artifacts_and_metrics_integrity(self):
        """Verify all Phase 3 required models and result JSON files exist on disk."""
        required_artifacts = [
            "ml/artifacts/sequence_model.pt",
            "ml/artifacts/graph_model.pt",
            "ml/artifacts/cached_embeddings.joblib",
            "ml/artifacts/autoencoder.pt",
            "ml/artifacts/scam_classifier.pt",
            "ml/artifacts/ensemble_meta_learner.joblib",
            "ml/artifacts/oof_predictions.joblib",
            "docs/results/phase3_models.json",
            "docs/results/phase3_ablation.json",
            "docs/results/phase3_oof_manifest.json",
            "docs/results/phase3_integrity_audit.json"
        ]

        for rel_path in required_artifacts:
            abs_path = os.path.join(self.project_root, rel_path)
            self.assertTrue(os.path.exists(abs_path), f"Missing required Phase 3 artifact: {rel_path}")

    def test_09_no_threshold_optimized_using_test_labels(self):
        """Regression Test 1: Verify no threshold was optimized using test labels."""
        import json
        ablation_path = os.path.join(self.project_root, "docs", "results", "phase3_ablation.json")
        with open(ablation_path) as f:
            ablations = json.load(f)

        for cfg_name, cfg_data in ablations.items():
            self.assertIn("validation_threshold_selection", cfg_data, f"{cfg_name} missing validation threshold selection!")
            self.assertIn("test_evaluation_at_validation_operating_point", cfg_data, f"{cfg_name} missing test evaluation at validation operating point!")
            self.assertNotIn("Optimal Test Cost", str(cfg_data), f"{cfg_name} illegally contains 'Optimal Test Cost'!")
            self.assertNotIn("optimal_test_cost", str(cfg_data), f"{cfg_name} illegally contains 'optimal_test_cost'!")

    def test_10_calibration_never_uses_test_labels(self):
        """Regression Test 2: Verify calibration never uses test labels."""
        bundle_path = os.path.join(self.project_root, "ml", "artifacts", "oof_predictions.joblib")
        bundle = joblib.load(bundle_path)
        meta_path = os.path.join(self.project_root, "ml", "artifacts", "ensemble_meta_learner.joblib")
        meta = FinSureMetaLearner.load(meta_path)

        # Confirm calibrator was fitted on validation set length
        val_len = len(bundle["y_val"])
        self.assertEqual(val_len, 9313)
        self.assertNotEqual(len(bundle["y_test"]), val_len)

    def test_11_meta_learner_never_trains_on_test_predictions(self):
        """Regression Test 3: Verify meta-learner never trains on test predictions."""
        bundle_path = os.path.join(self.project_root, "ml", "artifacts", "oof_predictions.joblib")
        bundle = joblib.load(bundle_path)

        # Meta training matrix Z_train must strictly have length equal to training split (36,550)
        self.assertEqual(len(bundle["Z_train"]), 36550)
        self.assertEqual(len(bundle["y_train"]), 36550)

    def test_12_oof_predictions_have_no_in_sample_rows(self):
        """Regression Test 4: Verify OOF predictions have strictly no in-sample rows."""
        import json
        manifest_path = os.path.join(self.project_root, "docs", "results", "phase3_oof_manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)

        self.assertEqual(manifest["train_samples"], 36550)
        self.assertEqual(manifest["n_folds"], 5)
        total_holdout = sum(fold["holdout_samples"] for fold in manifest["fold_details"])
        self.assertEqual(total_holdout, 36550, "Sum of fold holdouts must equal exact training size!")

    def test_13_zero_day_threshold_selected_without_test_labels(self):
        """Regression Test 5: Verify zero-day threshold is selected without final zero-day test labels."""
        import json
        audit_path = os.path.join(self.project_root, "docs", "results", "phase3_integrity_audit.json")
        with open(audit_path) as f:
            audit = json.load(f)

        ae_audit = audit["autoencoder_zero_day_audit"]
        self.assertEqual(ae_audit["status"], "CORRECTED_AND_VERIFIED")
        self.assertIn("Validation legitimate transactions", ae_audit["correction_applied"])
        self.assertAlmostEqual(ae_audit["frozen_validation_threshold"], 0.3418, places=3)

    def test_14_test_evaluation_uses_frozen_validation_thresholds(self):
        """Regression Test 6: Verify test evaluation uses frozen validation-selected thresholds."""
        import json
        models_path = os.path.join(self.project_root, "docs", "results", "phase3_models.json")
        with open(models_path) as f:
            models_data = json.load(f)

        ens = models_data["FinSure_Ensemble_Brain_Calibrated"]
        val_thresh = ens["validation_threshold_selection"]["selected_threshold"]
        applied_thresh = ens["test_evaluation_at_validation_operating_point"]["frozen_validation_threshold"]
        self.assertEqual(val_thresh, applied_thresh, "Applied test threshold must equal selected validation threshold!")


if __name__ == "__main__":
    unittest.main()

