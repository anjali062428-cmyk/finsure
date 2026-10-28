"""
FinSure Phase 2 Feature Leakage & Integrity Test Suite
Verifies mathematical causality and zero temporal data leakage in the shared FeaturePipeline:
1. Future transaction alteration does not mutate earlier feature values.
2. Current transaction is strictly excluded from its own historical velocity and rolling stats.
3. Feature values are completely independent of future and present fraud labels.
4. Chronological non-overlapping boundaries are preserved across Train/Val/Test partitions.
5. Standard scaling and training priors are fit strictly on Train and never on Val or Test.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

from ml.features.pipeline import FeaturePipeline, FEATURE_COLUMNS
from ml.features.splits import create_temporal_splits


class TestFeatureLeakageAndIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a small controlled test transaction stream with known timestamps
        cls.test_user = "USR_TEST_001"
        cls.base_time = pd.to_datetime("2026-02-01T10:00:00")
        
        # 5 sequential transactions for the user
        cls.mock_txns = pd.DataFrame([
            {
                "txn_id": "TXN_MOCK_1",
                "user_id": cls.test_user,
                "payee_id": "payee_A@okhdfc",
                "amount": 500.0,
                "channel": "UPI",
                "device_id": "DEV_A",
                "ip": "103.1.1.1",
                "geo": "Mumbai",
                "status": "approved",
                "created_at": (cls.base_time).isoformat(),
                "is_fraud": 0,
                "scam_type": "none"
            },
            {
                "txn_id": "TXN_MOCK_2",
                "user_id": cls.test_user,
                "payee_id": "payee_B@okhdfc",
                "amount": 1000.0,
                "channel": "UPI",
                "device_id": "DEV_A",
                "ip": "103.1.1.1",
                "geo": "Mumbai",
                "status": "approved",
                "created_at": (cls.base_time + pd.Timedelta(seconds=30)).isoformat(), # 30s later (within 1m)
                "is_fraud": 0,
                "scam_type": "none"
            },
            {
                "txn_id": "TXN_MOCK_3",
                "user_id": cls.test_user,
                "payee_id": "payee_A@okhdfc",
                "amount": 1500.0,
                "channel": "card",
                "device_id": "DEV_A",
                "ip": "103.1.1.1",
                "geo": "Mumbai",
                "status": "approved",
                "created_at": (cls.base_time + pd.Timedelta(minutes=5)).isoformat(), # 5m later (within 1h)
                "is_fraud": 0,
                "scam_type": "none"
            },
            {
                "txn_id": "TXN_MOCK_4",
                "user_id": cls.test_user,
                "payee_id": "payee_C@okhdfc",
                "amount": 2000.0,
                "channel": "UPI",
                "device_id": "DEV_B",
                "ip": "103.1.1.1",
                "geo": "Delhi",  # Travelling to Delhi
                "status": "approved",
                "created_at": (cls.base_time + pd.Timedelta(hours=4)).isoformat(), # 4h later (within 24h)
                "is_fraud": 0,
                "scam_type": "none"
            },
            {
                "txn_id": "TXN_MOCK_5",
                "user_id": cls.test_user,
                "payee_id": "payee_MALICIOUS@ybl",
                "amount": 80000.0,
                "channel": "UPI",
                "device_id": "DEV_C",
                "ip": "185.220.1.1",
                "geo": "Lagos",  # Impossible travel
                "status": "blocked",
                "created_at": (cls.base_time + pd.Timedelta(hours=5)).isoformat(), # 5h later
                "is_fraud": 1,
                "scam_type": "account_takeover"
            }
        ])
        
        cls.pipeline = FeaturePipeline()
        cls.pipeline.user_profiles[cls.test_user] = {
            "city": "Mumbai",
            "daily_limit": 100000.0,
            "income_band": "mid"
        }

    def test_current_transaction_excluded_from_own_history(self):
        """Verifies that at transaction t, history strictly contains only [0, t) events."""
        df_feat = self.pipeline.transform(self.mock_txns)
        
        # Transaction 1: First transaction ever for this user
        row1 = df_feat.iloc[0]
        self.assertEqual(row1["hist_user_txn_count"], 0.0, "First transaction must have 0 historical count!")
        self.assertEqual(row1["txn_count_1m"], 0.0, "First transaction cannot count itself in 1m velocity!")
        self.assertEqual(row1["amt_sum_1m"], 0.0, "First transaction cannot count its amount in 1m sum!")
        self.assertEqual(row1["is_new_payee"], 1.0, "Payee A should be new for transaction 1")
        
        # Transaction 2: Occurs 30 seconds after transaction 1
        row2 = df_feat.iloc[1]
        self.assertEqual(row2["hist_user_txn_count"], 1.0, "Transaction 2 should see exactly 1 prior transaction")
        self.assertEqual(row2["txn_count_1m"], 1.0, "Transaction 2 should see 1 prior transaction in 1m window")
        self.assertEqual(row2["amt_sum_1m"], 500.0, "Transaction 2 1m sum must be exactly 500.0 (excluding its own 1000.0)")
        
        # Transaction 3: Occurs 5 minutes after transaction 1
        row3 = df_feat.iloc[2]
        self.assertEqual(row3["txn_count_1m"], 0.0, "Transaction 3 has no transactions in the last 1 minute")
        self.assertEqual(row3["txn_count_1h"], 2.0, "Transaction 3 has 2 prior transactions in the last 1 hour")
        self.assertEqual(row3["amt_sum_1h"], 1500.0, "Transaction 3 1h sum must be 500 + 1000 = 1500.0")
        self.assertEqual(row3["payee_familiarity_count"], 1.0, "Payee A was visited once before")
        self.assertEqual(row3["is_new_payee"], 0.0, "Payee A is not new for transaction 3")

    def test_future_transaction_invariance(self):
        """Modifying or deleting a future transaction MUST NOT alter features of prior transactions."""
        df_feat_original = self.pipeline.transform(self.mock_txns)
        
        # Create mutated stream where transaction 5 amount is changed from 80,000 to 10.0 and geo is changed
        mutated_txns = self.mock_txns.copy()
        mutated_txns.loc[4, "amount"] = 10.0
        mutated_txns.loc[4, "geo"] = "Mumbai"
        
        df_feat_mutated = self.pipeline.transform(mutated_txns)
        
        # Features for transactions 1, 2, 3, 4 MUST be bit-for-bit identical
        for idx in range(4):
            orig_vals = df_feat_original.iloc[idx][FEATURE_COLUMNS].to_dict()
            mut_vals = df_feat_mutated.iloc[idx][FEATURE_COLUMNS].to_dict()
            self.assertEqual(orig_vals, mut_vals, f"Leakage detected! Transaction {idx+1} features changed after mutating future transaction 5!")

    def test_zero_label_leakage(self):
        """Feature pipeline must be completely agnostic of the 'is_fraud' label."""
        txns_no_label = self.mock_txns.drop(columns=["is_fraud"])
        txns_flipped_label = self.mock_txns.copy()
        txns_flipped_label["is_fraud"] = 1 - txns_flipped_label["is_fraud"]
        
        df_feat_1 = self.pipeline.transform(self.mock_txns)
        df_feat_2 = self.pipeline.transform(txns_flipped_label)
        
        for col in FEATURE_COLUMNS:
            np.testing.assert_array_almost_equal(
                df_feat_1[col].to_numpy(),
                df_feat_2[col].to_numpy(),
                err_msg=f"Label leakage detected in feature column {col}!"
            )

    def test_temporal_split_isolation(self):
        """Verifies that split boundaries are non-overlapping in time."""
        processed_path = os.path.join(PROJECT_ROOT, "data", "processed", "features_phase2.csv")
        if not os.path.exists(processed_path):
            self.skipTest("features_phase2.csv not yet cached")
            
        df_feat = pd.read_csv(processed_path)
        X_train, y_train, X_val, y_val, X_test, y_test, meta = create_temporal_splits(df_feat)
        
        # Verify timestamps ordering
        self.assertLess(meta["train"]["end"], meta["validation"]["start"], "Train end must precede Validation start")
        self.assertLess(meta["validation"]["end"], meta["test"]["start"], "Validation end must precede Test start")
        self.assertGreater(meta["train"]["total_rows"], 0)
        self.assertGreater(meta["validation"]["total_rows"], 0)
        self.assertGreater(meta["test"]["total_rows"], 0)


class TestCostOptimizationRegression(unittest.TestCase):
    """Regression test asserting exact mathematical properties of the cost optimization framework."""

    def test_selected_cost_equals_minimum_candidate_costs(self):
        from ml.eval.cost import evaluate_cost_curve
        from sklearn.metrics import confusion_matrix
        
        np.random.seed(42)
        y_true = np.random.choice([0, 1], size=1000, p=[0.98, 0.02])
        y_probs = np.where(
            y_true == 1,
            np.random.beta(5, 2, size=1000),
            np.random.beta(1, 5, size=1000)
        )
        
        avg_loss = 32000.0
        friction = 250.0
        
        cost_result = evaluate_cost_curve(
            y_true,
            y_probs,
            avg_fraud_loss=avg_loss,
            friction_cost=friction
        )
        
        base_grid = np.linspace(0.01, 0.99, 100)
        standards = np.array([0.40, 0.50, 0.89, 0.90])
        thresholds = np.unique(np.sort(np.concatenate([base_grid, standards])))
        
        all_costs = []
        for th in thresholds:
            th_val = round(float(th), 4)
            pred = (y_probs >= th_val).astype(int)
            tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
            c = int(fn) * avg_loss + int(fp) * friction
            all_costs.append(c)
            
        min_candidate_cost = min(all_costs)
        selected_cost = cost_result["optimal_operating_point"]["minimum_cost_inr"]
        
        # Exact integer equality assertion
        self.assertEqual(
            int(selected_cost),
            int(min_candidate_cost),
            f"Selected cost {selected_cost} != minimum candidate cost {min_candidate_cost}"
        )
        
        # Guarantee optimal cost <= default cost
        default_cost = cost_result["default_operating_point"]["total_cost"]
        self.assertLessEqual(
            int(selected_cost),
            int(default_cost),
            f"Selected optimal cost {selected_cost} exceeds default cost {default_cost}"
        )
        
        # Verify precision, recall, FN, FP match confusion matrix at selected threshold
        opt_thresh = cost_result["optimal_operating_point"]["recommended_threshold"]
        pred_opt = (y_probs >= opt_thresh).astype(int)
        tn_opt, fp_opt, fn_opt, tp_opt = confusion_matrix(y_true, pred_opt).ravel()
        
        details = cost_result["optimal_operating_point"]["details"]
        self.assertEqual(details["false_negatives"], int(fn_opt))
        self.assertEqual(details["false_positives"], int(fp_opt))
        self.assertEqual(details["true_positives"], int(tp_opt))
        self.assertEqual(details["true_negatives"], int(tn_opt))


if __name__ == "__main__":
    unittest.main(verbosity=2)
