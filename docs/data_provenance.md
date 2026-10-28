# FinSure Data and Model Provenance Standard

**Document Version:** 1.0  
**Effective Date:** 28 September 2026  

---

## 1. Overview and Principles

FinSure adheres to strict data and model lineage requirements. Every dataset generated, ingested, or transformed, and every model trained and deployed must produce a cryptographically verifiable provenance record.

### Core Non-Negotiables
1. **Zero Data Leakage:** Features for training must strictly use time-bounded historical data. No future events, edges, or statistics may bleed across splits.
2. **Immutable Raw Data:** Raw benchmark files in `data/raw/` are read-only and never altered in place.
3. **Reproducibility:** All synthetic generation, splits, and model training routines must record explicit pseudorandom seeds, dependency snapshots, and hardware runtime characteristics.

---

## 2. Machine-Readable Provenance Record Schema

Every experiment or data generation artifact will emit a `provenance.json` adhering to the following structure:

```json
{
  "provenance_id": "prov_20260928_upi_v1_001",
  "timestamp_utc": "2026-09-28T13:45:00Z",
  "dataset": {
    "name": "FinSure Synthetic UPI",
    "version": "1.0.0",
    "sha256": "<calculated_sha256_of_data_output>",
    "generator_config_hash": "<sha256_of_generator_config_yaml>",
    "generator_script": "ml/data/synthetic_generator.py",
    "random_seed": 42
  },
  "temporal_splits": {
    "train_window": ["2026-01-01T00:00:00", "2026-06-30T23:59:59"],
    "val_window": ["2026-07-01T00:00:00", "2026-07-31T23:59:59"],
    "test_window": ["2026-08-01T00:00:00", "2026-08-31T23:59:59"]
  },
  "statistics": {
    "total_rows": 100000,
    "total_users": 1000,
    "total_devices": 1850,
    "total_payees": 3500,
    "fraud_count": 850,
    "fraud_prevalence_pct": 0.85
  },
  "environment": {
    "python_version": "3.13.13",
    "os": "Windows 11",
    "dependencies": {
      "pandas": "2.2.3",
      "numpy": "2.2.0",
      "scikit-learn": "1.6.0"
    }
  }
}
```

---

## 3. Dataset Registry & Current Fingerprints

| Dataset | Local Filename | SHA-256 Checksum | Verified Date |
|---|---|---|---|
| ULB Credit Card Fraud | `archive (10).zip` | `a0360ce715992212e9ac72d8ccdca97f4be87dc1fdf2bed011358f7ab409a28a` | 2026-09-28 |
| Sparkov Credit Card Fraud | `archive (8).zip` | `4e32829b9ba5a6b17af707c513c15204011044df0e8971e431cedca3d8c0a8a1` | 2026-09-28 |
| PaySim Mobile Money | `archive (9).zip` | `f7eef9ffad5cfa64a034143a5c9b30491d189420b273d5ad5723ca40b596613d` | 2026-09-28 |
| IEEE-CIS Fraud Detection | `ieee-fraud-detection.zip` | `4cc646da09d0a9b265983ffed775b1f9ee15af5266586df610e04d6adae0b829` | 2026-09-28 |
| IBM Synthetic AML Paper | `IBM_Synthetic_AML-Data.pdf` | `995afebdac5e87eaba1bb790239efab1f50849e843d32d415e2ee52c37a024c9` | 2026-09-28 |
| BAF NeurIPS Paper | `NeurIPS-2022-...Paper.pdf` | `b05cfbe15916173c0ae79728cd6e314ebd92ad82191ea7ddf2929a3280373641` | 2026-09-28 |
| FinSure Analyst Report Prototype | `FinSure_FS-2026-000481_analyst.pdf` | `13ea1e437fb109744ff27623c2a1f382d2f06062de68407e7e656afa320d5df4` | 2026-09-28 |

---

## 4. Phase 2 Feature & Model Provenance Record

```json
{
  "provenance_id": "prov_20260928_phase2_baselines_001",
  "timestamp_utc": "2026-09-28T15:23:57Z",
  "feature_engineering": {
    "module": "ml/features/pipeline.py",
    "feature_version": "2.0.0",
    "feature_count": 36,
    "feature_names_path": "ml/artifacts/feature_metadata.json",
    "features_cache_path": "data/processed/features_phase2.csv"
  },
  "temporal_splits": {
    "strategy": "Strict Chronological (Time-Based)",
    "train_window": ["2026-01-01T00:16:33", "2026-03-01T23:52:00"],
    "val_window": ["2026-03-02T00:12:24", "2026-03-16T23:57:16"],
    "test_window": ["2026-03-17T00:32:30", "2026-03-31T23:53:02"],
    "train_rows": 36550,
    "val_rows": 9313,
    "test_rows": 9164
  },
  "models": {
    "logistic_regression": {
      "artifact": "ml/artifacts/logistic_regression.joblib",
      "scaler_artifact": "ml/artifacts/feature_scaler.joblib",
      "hyperparameters": { "class_weight": "balanced", "max_iter": 1000, "solver": "lbfgs" },
      "test_pr_auc": 0.8013,
      "test_recall_at_1pct_fpr": 0.9274,
      "cost_optimal_val_threshold": 0.921
    },
    "xgboost": {
      "artifact": "ml/artifacts/xgboost_baseline.json",
      "hyperparameters": {
        "n_estimators": 150,
        "max_depth": 5,
        "learning_rate": 0.08,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "scale_pos_weight": 101.09
      },
      "test_pr_auc": 0.9260,
      "test_recall_at_1pct_fpr": 0.9435,
      "cost_optimal_val_threshold": 0.823
    }
  },
  "runtime_environment": {
    "python": "3.13.13",
    "scikit-learn": "1.9.1",
    "xgboost": "3.4.1",
    "pandas": "3.0.6",
    "numpy": "2.5.3"
  }
}
```

---

## 5. Phase 3 Deep Model & Ensemble Provenance Record

```json
{
  "provenance_id": "prov_20260928_phase3_deep_ensemble_001",
  "timestamp_utc": "2026-09-28T16:20:00Z",
  "dataset": {
    "name": "FinSure Synthetic UPI",
    "transactions_count": 55027,
    "feature_matrix": "data/processed/features_phase2.csv",
    "sequence_cache": "data/processed/sequences_phase3.npz",
    "sequence_shape": [55027, 50, 12]
  },
  "temporal_splits": {
    "train_rows": 36550,
    "val_rows": 9313,
    "test_rows": 9164,
    "train_frauds": 358,
    "val_frauds": 88,
    "test_frauds": 124
  },
  "deep_models": {
    "sequence_model": {
      "architecture": "GRU (hidden_dim=64, layers=1) + Multihead Attention Pooling",
      "target_exclusion": "Strictly excluded from past-50 sequence",
      "artifact": "ml/artifacts/sequence_model.pt",
      "test_pr_auc": 0.8396,
      "test_recall_at_1pct_fpr": 0.9274
    },
    "graph_model": {
      "architecture": "2-Layer GraphSAGE (SAGEConv 5->64->32)",
      "graph_edges_cutoff": "2026-03-01T23:59:59 (Train Period Only)",
      "cached_embeddings_count": 7046,
      "artifact": "ml/artifacts/graph_model.pt",
      "embeddings_artifact": "ml/artifacts/cached_embeddings.joblib",
      "test_pr_auc": 0.1859
    },
    "autoencoder": {
      "architecture": "Undercomplete MLP (36 -> 24 -> 12 -> 6 -> 12 -> 24 -> 36)",
      "training_set": "Strictly legitimate training transactions (is_fraud == 0)",
      "artifact": "ml/artifacts/autoencoder.pt",
      "zero_day_detection_rate": 0.7609
    },
    "scam_type_classifier": {
      "architecture": "MLP (36 -> 64 -> 32 -> 6) + Class-Weighted Cross-Entropy",
      "classes": ["account_takeover", "collect_request_scam", "mule_account", "phishing_or_social_engineering", "card_testing", "other"],
      "artifact": "ml/artifacts/scam_classifier.pt"
    },
    "ensemble_brain": {
      "meta_learner": "XGBoost + Isotonic Regression Calibration",
      "inputs": ["prob_xgb", "prob_seq", "prob_gnn", "score_ae", "log_amount", "is_new_device", "is_new_payee", "amt_user_zscore"],
      "oof_pipeline": "5-Fold Stratified Cross-Validation on Train",
      "oof_manifest": "docs/results/phase3_oof_manifest.json",
      "artifact": "ml/artifacts/ensemble_meta_learner.joblib",
      "predictions_artifact": "ml/artifacts/oof_predictions.joblib",
      "test_pr_auc": 0.9058,
      "test_pr_auc_multi_seed": "0.9070 +/- 0.0018",
      "test_recall_at_1pct_fpr": 0.9274,
      "test_brier_score": 0.00185,
      "test_ece": 0.0009,
      "single_sample_latency_p95_ms": 3.226,
      "evaluation_protocol": "Validation-selected operating point applied unchanged to test set (zero test threshold leakage)",
      "integrity_audit_record": "docs/results/phase3_integrity_audit.json"
    }
  },
  "runtime_environment": {
    "python": "3.13.13",
    "torch": "2.14.0+cpu",
    "torch-geometric": "2.8.0.post1",
    "scikit-learn": "1.9.1",
    "xgboost": "3.4.1",
    "pandas": "3.0.6",
    "numpy": "2.5.3"
  }
}
```

---

## 6. Phase 4 Explainability & Decision Engine Provenance Record

```json
{
  "provenance_id": "prov_20260928_phase4_explainability_001",
  "timestamp_utc": "2026-09-28T16:55:00Z",
  "risk_decision_engine": {
    "module": "ml/decision/decision_engine.py",
    "policy_version": "v1.0.0",
    "configuration_path": "configs/risk_thresholds.yaml",
    "scoring_contract": "Unified Integer Score S = round(100 * P_calibrated) in [0, 100]",
    "operating_actions": {
      "approve": [0, 39],
      "step_up": [40, 69],
      "cooling_period": [70, 89],
      "block": [90, 100]
    },
    "cost_parameters": {
      "avg_fraud_loss_inr": 32000.0,
      "friction_cost_inr": 250.0
    }
  },
  "explainability_suite": {
    "shap_explainer": {
      "module": "ml/explainability/shap_explainer.py",
      "method": "shap.TreeExplainer on XGBoost baseline",
      "feature_count": 36,
      "directional_attribution": "Signed (+ increases risk, - decreases risk)"
    },
    "sequence_explainer": {
      "module": "ml/explainability/sequence_explainer.py",
      "method": "AttentionPooling normalized weights (sum to 1.0)",
      "narrative_constraint": "Temporal relevance only (strictly non-causal)"
    },
    "graph_explainer": {
      "module": "ml/explainability/graph_explainer.py",
      "node_embeddings_source": "ml/artifacts/cached_embeddings.joblib",
      "cached_entities_count": 7046,
      "topological_features": ["shared_device", "high_indegree_payee", "cosine_similarity"]
    },
    "autoencoder_explainer": {
      "module": "ml/explainability/autoencoder_explainer.py",
      "frozen_zero_day_threshold": 0.3418,
      "reconstruction_error": "MSE across 36 features"
    },
    "reason_code_engine": {
      "module": "ml/explainability/reason_codes.py",
      "canonical_codes_count": 10,
      "languages": ["en", "hi"],
      "priority_ordering": true
    },
    "explanation_formatter": {
      "module": "ml/explainability/explanation_formatter.py",
      "audience_isolation": "Strict Customer (non-technical, calm) vs Analyst (full transparency)"
    },
    "audit_trail": {
      "module": "ml/explainability/audit_trail.py",
      "method": "Append-only SHA-256 hash chaining of decision and explanation payloads",
      "tamper_evidence": "Instant verification failure on bit flip"
    }
  },
  "simulation_results": {
    "artifact": "docs/results/phase4_threshold_simulation.json",
    "validation_catch_rate": 0.9545,
    "validation_friction_rate": 0.0008,
    "validation_total_cost_inr": 129750.0,
    "test_catch_rate": 0.9194,
    "test_friction_rate": 0.0011,
    "test_total_cost_inr": 322500.0,
    "protocol": "Zero test label tuning; validation operating points frozen"
  }
}
```


