# FinSure Phase 1: Comprehensive Exploratory Data Analysis (EDA) Report

**Generated Date:** 28 September 2026  
**Dataset Under Review:** FinSure Synthetic UPI Dataset (`v1.0.0`)  
**Associated Benchmark Datasets:** ULB Credit Card Fraud, Sparkov CC, PaySim, IEEE-CIS Fraud Detection  

---

## 1. Multi-Dataset Profiling & Benchmark Comparison

| Dataset | Type | Total Rows | Target Col | Fraud Prevalence | Temporal Span | Missingness | FinSure Role |
|---|---|---|---|---|---|---|---|
| **ULB Credit Card** | Tabular (PCA) | 284,807 | `Class` | 0.173% (492) | 48 hours (`Time`) | 0.0% | Quick extreme-imbalance baseline |
| **Sparkov CC** | Tabular/Time | 1,852,394 | `is_fraud` | 0.524% (avg) | 2 years | 0.0% | Temporal sequence model benchmark |
| **PaySim** | Graph/Transfer | 6,362,620 | `isFraud` | 0.129% (8,213) | 31 days (744 steps) | 0.0% | Account transfer graph sanity checks |
| **IEEE-CIS** | Tabular/ID | 590,540 (train) | `isFraud` | 3.499% (20,663) | 182 days | 81.0% cols sparse | Rich feature engineering & XGBoost baseline |
| **FinSure Synthetic** | Multi-Entity UPI | 55,027 | `is_fraud` | 1.036% (570) | 90 days | 0.0% | **Primary integrated dataset** |

---

## 2. FinSure Synthetic UPI: Class & Scam Type Distributions

- **Total Transactions:** 55,027
- **Legitimate Transactions:** 54,457 (98.96%)
- **Fraudulent Transactions:** 570 (1.04%)
- **Target Fraud Prevalence:** Within mandatory 0.2% – 2.0% bounds.

### Scam Archetype Distribution
```text
{
  "account_takeover": 181,
  "collect_request_scam": 127,
  "phishing_or_social_engineering": 97,
  "card_testing": 60,
  "qr_code_proxy_tampering": 39,
  "unidentified_anomaly": 36,
  "mule_account": 30
}
```

---

## 3. Amount & Value Dynamics (Hard Negatives vs Fraud)

| Metric | Legitimate (₹) | Fraudulent (₹) | Observation |
|---|---|---|---|
| **Mean** | ₹1,317.54 | ₹32,633.59 | Fraud amounts average higher due to rapid extraction. |
| **Median** | ₹207.8 | ₹23,504.08 | Noticeable separation while maintaining overlap. |
| **95th Percentile** | ₹991.34 | ₹85,063.32 | Hard negatives (rent/tuition) simulate legitimate high values. |
| **Maximum** | ₹189,502.09 | ₹94,553.4 | Governed by user daily transfer caps. |

---

## 4. Temporal Dynamics & Diurnal Cycle

- **Nocturnal Window (01:00 – 05:00):** Fraud rate is **4.88%**
- **Daytime Window (06:00 – 24:00):** Fraud rate is **0.83%**
- **Diurnal Observation:** Account Takeover and Card Testing clusters exhibit concentrated execution during nocturnal hours when customer notification response times are slow.

---

## 5. Leakage Auditing & Guardrails

To preserve machine learning integrity, the following rules are enforced:
1. **Strict Temporal Splitting:** All model validation must use time-ordered splits (e.g. Days 1–60 Train, Days 61–75 Validation, Days 76–90 Test). Random K-Fold CV is prohibited.
2. **Graph Edge Protection:** In GraphSAGE training, edges created after timestamp `T` cannot exist in the neighborhood computation of a transaction occurring at `T`.
3. **Resampling Guard:** SMOTE / undersampling must only occur inside training folds.
4. **Out-of-Fold (OOF) Ensembling:** Meta-learner training will strictly use out-of-fold predictions from base models to prevent label over-confidence.

---

## 6. Sanity Gate Verification

Per Master Prompt Section 5.1.1, the synthetic dataset must not be trivially separable:
- **Baseline Evaluator:** `HistGradientBoostingClassifier` on basic temporal/value features.
- **Split:** Strictly temporal (first 70% Train, last 30% Test).
- **PR-AUC Achieved:** **0.5508**
- **Sanity Gate Status:** **PASSED** (Baseline PR-AUC is well below 0.95 and above random baseline, confirming presence of realistic hard negatives, noise, and complex multi-modal fraud typologies).
