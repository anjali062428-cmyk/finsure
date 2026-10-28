"""
FinSure Phase 1 Test Suite
Tests data integrity, raw dataset checksums, streaming loaders,
synthetic UPI generation schemas, fraud rates, and incident event hash-chain verification.
Built with standard unittest for zero-dependency execution.
"""

import os
import json
import unittest
import pandas as pd

from ml.data.loaders import (
    verify_archive_integrity,
    load_ulb_sample,
    load_sparkov_sample,
    load_paysim_sample,
    load_ieee_sample,
    DATASET_ARCHIVES
)
from ml.data.synthetic_generator import (
    FinSureSyntheticGenerator,
    verify_incident_event_chain,
    compute_event_hash
)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SYNTHETIC_DIR = os.path.join(PROJECT_ROOT, "data", "processed", "synthetic")


class TestPhase1DataIntegrity(unittest.TestCase):
    """Verifies that all raw archives exist and are untampered."""
    
    def test_raw_archive_checksums(self):
        for archive_key in ["ulb", "sparkov", "paysim", "ieee"]:
            with self.subTest(archive=archive_key):
                self.assertTrue(verify_archive_integrity(archive_key))


class TestPhase1Loaders(unittest.TestCase):
    """Tests sample reading from each benchmark dataset."""
    
    def test_ulb_loader(self):
        df = load_ulb_sample(nrows=100)
        self.assertEqual(len(df), 100)
        self.assertIn("Class", df.columns)
        self.assertIn("Time", df.columns)
        self.assertEqual(df.shape[1], 31)

    def test_sparkov_loader(self):
        df_train = load_sparkov_sample(split="train", nrows=100)
        df_test = load_sparkov_sample(split="test", nrows=100)
        self.assertEqual(len(df_train), 100)
        self.assertEqual(len(df_test), 100)
        self.assertIn("is_fraud", df_train.columns)
        self.assertIn("trans_date_trans_time", df_train.columns)

    def test_paysim_loader(self):
        df = load_paysim_sample(nrows=100)
        self.assertEqual(len(df), 100)
        self.assertIn("isFraud", df.columns)
        self.assertIn("step", df.columns)
        self.assertIn("nameOrig", df.columns)

    def test_ieee_loader(self):
        df_txn = load_ieee_sample(table="train_transaction", nrows=100)
        df_id = load_ieee_sample(table="train_identity", nrows=100)
        self.assertEqual(len(df_txn), 100)
        self.assertEqual(len(df_id), 100)
        self.assertIn("isFraud", df_txn.columns)
        self.assertIn("TransactionDT", df_txn.columns)


class TestFinSureSyntheticData(unittest.TestCase):
    """Validates the FinSure Synthetic UPI generator and dataset properties."""
    
    @classmethod
    def setUpClass(cls):
        if not os.path.exists(os.path.join(SYNTHETIC_DIR, "transactions.csv")):
            gen = FinSureSyntheticGenerator()
            gen.run()
            
        cls.df_txns = pd.read_csv(os.path.join(SYNTHETIC_DIR, "transactions.csv"))
        cls.df_users = pd.read_csv(os.path.join(SYNTHETIC_DIR, "users.csv"))
        cls.df_devices = pd.read_csv(os.path.join(SYNTHETIC_DIR, "devices.csv"))
        cls.df_events = pd.read_csv(os.path.join(SYNTHETIC_DIR, "incident_events.csv"))
        with open(os.path.join(SYNTHETIC_DIR, "synthetic_manifest.json")) as f:
            cls.manifest = json.load(f)

    def test_entity_counts(self):
        self.assertGreaterEqual(len(self.df_users), 1000)
        self.assertGreaterEqual(len(self.df_devices), 1000)
        self.assertGreaterEqual(len(self.df_txns), 50000)

    def test_fraud_prevalence_bounds(self):
        prevalence = (self.df_txns["is_fraud"] == 1).mean() * 100
        self.assertGreaterEqual(prevalence, 0.2)
        self.assertLessEqual(prevalence, 2.0)

    def test_scam_types_coverage(self):
        scam_types = set(self.df_txns[self.df_txns["is_fraud"] == 1]["scam_type"].unique())
        required = {
            "account_takeover",
            "mule_account",
            "collect_request_scam",
            "phishing_or_social_engineering",
            "card_testing"
        }
        missing = required - scam_types
        self.assertFalse(missing, f"Missing required scam types: {missing}")

    def test_hard_negatives_present(self):
        self.assertIn("is_hard_negative", self.df_txns.columns)
        hard_negs = self.df_txns["is_hard_negative"].sum()
        self.assertGreater(hard_negs, 1000)

    def test_event_hash_chain_validity(self):
        events = self.df_events.to_dict("records")
        valid, err = verify_incident_event_chain(events)
        self.assertTrue(valid, f"Event chain verification failed: {err}")

    def test_tamper_detection(self):
        events = self.df_events.to_dict("records")
        self.assertGreater(len(events), 0)
        tampered_events = [dict(e) for e in events]
        tampered_events[2]["details_json"] = '{"tampered": true}'
        
        valid, err = verify_incident_event_chain(tampered_events)
        self.assertFalse(valid, "Tampered event was not detected by chain verification!")
        self.assertTrue("Tampered event content detected" in err or "Broken chain link" in err)


if __name__ == "__main__":
    unittest.main(verbosity=2)
