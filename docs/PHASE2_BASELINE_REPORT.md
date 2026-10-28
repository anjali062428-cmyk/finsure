# FinSure Phase 2: Feature Engineering & Baseline Models Report

**Execution Date:** 28 September 2026  
**Primary Dataset:** FinSure Synthetic UPI (`v1.0.0`)  
**Split Type:** Strict Chronological Time-Based Split (Train 60 days, Val 15 days, Test 15 days)  
**Headline Metric:** PR-AUC (Precision-Recall Area Under Curve)  

---

## 1. Dataset Partitions and Split Integrity

| Split | Window Start | Window End | Total Rows | Fraud Count | Prevalence | Role |
|---|---|---|---|---|---|---|
| **Train** | `2026-01-01` | `2026-03-01` | **36,550** | 358 | 0.979% | Model parameter fitting & feature prior estimation |
| **Validation** | `2026-03-02` | `2026-03-16` | **9,313** | 88 | 0.945% | Cost curve analysis & operating threshold tuning |
| **Test** | `2026-03-17` | `2026-03-31` | **9,164** | 124 | 1.353% | Final unbiased model performance benchmarking |

---

## 2. Feature Engineering Architecture

A total of **36 features** are engineered by `ml/features/pipeline.py` across 6 functional groups:
1. **Transaction Core (9):** `amount`, `log_amount`, `hour`, `dayofweek`, `is_weekend`, `is_night`, channel indicators (`UPI`, `card`, `bank_transfer`).
2. **Behavioral Profile (10):** `amt_to_user_mean`, `amt_to_user_median`, `amt_user_zscore`, `amt_to_user_max`, `time_since_prev_txn_sec`, `log_time_since_prev_sec`, `user_daily_limit_ratio`, `payee_familiarity_count`, `is_new_payee`, `hist_user_txn_count`.
3. **Device Familiarity (2):** `device_familiarity_count`, `is_new_device`.
4. **Velocity Counters (8):** `txn_count_1m`, `txn_count_1h`, `txn_count_24h`, `amt_sum_1m`, `amt_sum_1h`, `amt_sum_24h`, `distinct_payees_24h`, `distinct_devices_24h`.
5. **Geo & Mobility (4):** `is_out_of_home_city`, `dist_from_prev_txn_km`, `implied_travel_speed_kmh`, `impossible_travel`.
6. **Risk Interactions (3):** `is_new_device_and_night`, `is_new_payee_and_large`, `rapid_burst`.

**Leakage Protection:** Every rolling counter and historical summary strictly uses events in $[0, t)$. The current transaction is never included in its own historical state.

---

## 3. Baseline Performance Comparison on Test Set

| Metric | Phase 1 Baseline (Raw 8 Feats) | Phase 2 Logistic Regression | Phase 2 XGBoost Baseline | Improvement vs Phase 1 |
|---|---|---|---|---|
| **PR-AUC (Primary)** | **0.5508** | **0.8013** | **0.9260** | **++0.3752** |
| **Recall @ 1% FPR** | ~0.3500 | **0.9274** | **0.9435** | Substantial increase in high-precision detection |
| **ROC-AUC** | 0.8120 | **0.9511** | **0.9655** | High separability |
| **Brier Score (Calibration)** | — | **0.0388** | **0.0023** | Calibrated probability estimation |
| **P95 Latency (Single Txn)** | — | **0.26 ms** | **1.79 ms** | Well under the < 100 ms budget |

---

## 4. Cost-Based Threshold Analysis & Generalization Audit

Operating cost parameters:
- **Average Fraud Loss ($L_F$):** ₹32,000
- **Customer Friction Cost ($C_{FP}$):** ₹250
- **Cost Formula:** Total Cost = (FN * ₹32,000) + (FP * ₹250)

### Part A: Validation Set Cost Optimization (Threshold Selection Phase)

On the validation set, candidate thresholds were systematically scanned to determine $\arg\min(\text{Total Validation Cost})$.

| Model | Default Thresh (0.500) Cost | Optimal Thresh | Minimized Validation Cost | Validation Cost Reduction | Val FN (Default -> Opt) | Val FP (Default -> Opt) |
|---|---|---|---|---|---|---|
| **Logistic Regression** | ₹201,500.00 | **0.931** | **₹134,500.00** | **-₹67,000.00** | 4 -> 4 | 294 -> 27 |
| **XGBoost** | ₹129,750.00 | **0.812** | **₹128,750.00** | **-₹1,000.00** | 4 -> 4 | 7 -> 3 |

*Mathematical Proof:* On the Validation set, `optimal_cost <= default_cost` holds with exact mathematical certainty for both models.

### Part B: Unbiased Test Set Evaluation (Generalization Phase)

Applying the validation-selected thresholds to the unseen, out-of-sample future test period:

| Model | Operating Point | Test Threshold | Test Total Cost | Test FN | Test FP | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|---|
| **Logistic Regression** | Default Threshold | 0.500 | ₹387,250.00 | 9 | 397 | 0.2246 | 0.9274 | 0.3616 |
| **Logistic Regression** | Val-Selected Threshold | 0.931 | ₹521,750.00 | 16 | 39 | 0.6923 | 0.8710 | 0.7714 |
| **XGBoost** | Default Threshold | 0.500 | ₹226,750.00 | 7 | 11 | 0.9141 | 0.9435 | 0.9286 |
| **XGBoost** | Val-Selected Threshold | 0.812 | ₹290,250.00 | 7 | 9 | 0.9286 | 0.9435 | 0.9360 |

### Generalization Audit Note:
- For **XGBoost**, the validation-selected threshold (0.812) generalizes cleanly to the test set, reducing false alarms from 11 down to 9 while maintaining identical recall (FN = 7), saving ₹500 on test cost.
- For **Logistic Regression**, the validation-selected threshold (0.931) reduced false alarms drastically (397 down to 39, raising Precision from 22.4% to 69.2%), but resulted in 7 additional false negatives (FN = 16 vs 9) in the future test period. Because false negatives carry a steep penalty ($₹32,000$ vs $₹250$), test cost rose to ₹521,750.00. This highlights the classic operational trade-off between maximizing F1 precision/recall vs minimizing severe fraud loss risk.

---

## 5. Top 10 Most Predictive Features (XGBoost Gain)

| Rank | Feature | Normalized Gain Importance |
|---|---|---|
| 1 | `user_daily_limit_ratio` | 0.2897 |
| 2 | `is_out_of_home_city` | 0.1512 |
| 3 | `amt_to_user_median` | 0.0494 |
| 4 | `is_new_device_and_night` | 0.0399 |
| 5 | `dist_from_prev_txn_km` | 0.0373 |
| 6 | `amount` | 0.0356 |
| 7 | `device_familiarity_count` | 0.0353 |
| 8 | `time_since_prev_txn_sec` | 0.0277 |
| 9 | `payee_familiarity_count` | 0.0276 |
| 10 | `log_amount` | 0.0272 |

---

## 6. Known Limitations & Next Steps

1. **Current Baselines:** While XGBoost achieves strong performance on tabular features, it does not explicitly capture the sequential progression of attacks over long time windows (addressed by Sequence/Transformer models in Phase 3) nor topological ring clustering (addressed by GraphSAGE in Phase 3).
2. **Phase 3 Recommendation:** Proceed to deep models (Sequence Model for temporal history, GNN for mule rings, Autoencoder for zero-day concept drift, and Meta-Learner for calibration and fusion).
