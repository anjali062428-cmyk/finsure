# FinSure Phase 4 Engineering Report: Explainability, Risk Decision Engine & Operating Thresholds

**Date:** 2026-09-28  
**Author:** FinSure Risk Engineering & AI Architecture Team  
**Governing Standard:** IEEE 830 / FinSure SRS v2 (FR-ML-01, FR-ML-03) / Master Prompt v2 Section 6 & 7  
**Artifact Status:** Verified, Tested (44/44 Unit Tests Passing), and Certified Leak-Free

---

## 1. Executive Summary

Phase 4 bridges the gap between deep machine learning models and real-world banking operations. It establishes:
1. **The Canonical Risk Scoring Contract:** A deterministic transformation from calibrated ensemble probability $P \in [0.0, 1.0]$ to unified risk score $S = \text{round}(100 \times P) \in [0, 100]$, with a 4-tier operational action mapping (`approve`, `step_up`, `cooling_period`, `block`).
2. **Multi-Modal Explainability Suite:**
   - **XGBoost TreeExplainer SHAP:** Exact signed feature attribution (+ red for risk increase, - green for legitimacy) with plain-language feature names.
   - **Sequence Model Attention Pooling:** Temporal attention distribution ($\sum \alpha_t = 1.0$) ranking historical transactions without claiming causality.
   - **Graph Relationship Evidence:** Topological and node embedding analysis identifying shared devices, hub payees, and network risk.
   - **Deep Autoencoder Diagnostics:** Unsupervised reconstruction anomaly scoring against the certified frozen validation threshold ($0.3418$).
   - **Deterministic Reason Code Engine:** 10 canonical reason codes with priority ordering and bilingual support (English and Hindi).
   - **Strict Customer vs Analyst Isolation:** Calm, non-alarmist customer messages with zero model jargon, paired with deep technical payloads for fraud analysts.
3. **What-If Operational Threshold Simulator:** Scenario modeling of decision mixes and financial costs ($L_F = ₹32,000$, $C_{FP} = ₹250$) strictly preserving out-of-sample integrity (zero test-label tuning).
4. **Cryptographic Audit Trail:** Append-only SHA-256 hash-chained ledger ensuring non-repudiation, tamper detection, and regulatory audit compliance.

---

## 2. Canonical Risk Scoring Contract & Decision Engine

The FinSure Decision Engine (`ml/decision/decision_engine.py`) enforces a single source of truth for all operational channels.

### 2.1 Contract Specification

- **Calibrated Probability:** $P = \text{MetaLearner}(Z) \in [0.0, 1.0]$
- **Unified Integer Risk Score:** $S = \text{clip}(\text{round}(100 \times P), 0, 100)$
- **Deterministic Action & Band Mapping:**

| Score Range ($S$) | Risk Band | Brand Badge Color | Action Key | Description |
|:---:|:---:|:---:|:---:|---|
| **0 – 39** | `low` | `#13A89E` | `approve` | Low risk: Instant frictionless approval. |
| **40 – 69** | `medium` | `#E8A33D` | `step_up` | Medium risk: Step-up authentication challenge via OTP. |
| **70 – 89** | `high` | `#EA580C` | `cooling_period` | High risk: 2-hour temporary hold on high-value transfer. |
| **90 – 100** | `critical` | `#D64545` | `block` | Critical risk: Transaction declined immediately, customer notified. |

---

## 3. Multi-Modal Explainability Suite

### 3.1 XGBoost TreeExplainer SHAP (`ml/explainability/shap_explainer.py`)
- Evaluates raw feature vectors using tree path algorithms.
- Automatically decomposes feature attributions into:
  - `top_positive_factors`: Pushing risk higher (+ impact, e.g., large transfer ratio, unrecognized device).
  - `top_negative_factors`: Pulling risk lower (- impact, e.g., established payee familiarity, home city).
- Maps all 36 internal feature columns to clear, human-readable titles (e.g., `amt_user_zscore` $\to$ "Amount Z-Score (Deviation from Profile)").

### 3.2 Sequence Attention Explainer (`ml/explainability/sequence_explainer.py`)
- Extracts attention weights $\alpha \in \mathbb{R}^{50}$ from the Sequence Model's Attention Pooling layer.
- Guarantees valid unmasked historical transactions sum to $1.0$.
- Ranks past historical transactions chronologically (`t-1`, `t-2`, etc.) by model attention.
- Strictly adheres to the **Non-Causal Representation Requirement**: Explanations characterize temporal relevance and recurrent network focus, avoiding claims that past transactions caused the current event.

### 3.3 Graph Relationship Evidence (`ml/explainability/graph_explainer.py`)
- Queries the 7,046 cached entity node embeddings (`ml/artifacts/cached_embeddings.joblib`).
- Flags multi-account shared devices (e.g., device associated with $>1$ distinct account).
- Flags high in-degree payee hubs receiving funds from multiple distinct payers.
- Computes embedding cosine similarities for entity pairs (`user` $\leftrightarrow$ `payee`, `user` $\leftrightarrow$ `device`).

### 3.4 Deep Autoencoder Anomaly Explainer (`ml/explainability/autoencoder_explainer.py`)
- Evaluates reconstruction Mean Squared Error (MSE) across all 36 feature dimensions.
- Compares error directly against the certified frozen zero-day validation baseline threshold:
  $$\theta_{\text{val}} = 0.3418$$
- Identifies top anomalous feature dimensions where the transaction deviated most from legitimate behavior.

### 3.5 Deterministic Reason Code Engine (`ml/explainability/reason_codes.py`)
- Evaluates 10 canonical reason codes with strict priority ranking:
  1. `RC_AMOUNT_ANOMALY` (Priority 1)
  2. `RC_RAPID_VELOCITY` (Priority 2)
  3. `RC_NEW_DEVICE` (Priority 3)
  4. `RC_OFF_HOURS` (Priority 4)
  5. `RC_GRAPH_RISK` (Priority 5)
  6. `RC_SEQUENCE_ANOMALY` (Priority 6)
  7. `RC_RECONSTRUCTION_OUTLIER` (Priority 7)
  8. `RC_BENEFICIARY_RISK` (Priority 8)
  9. `RC_GEO_MISMATCH` (Priority 9)
  10. `RC_HIGH_VALUE_FIRST_TIME` (Priority 10)
- Provides complete bilingual dictionary definitions in both English (`en`) and Hindi (`hi`).

### 3.6 Customer vs. Analyst Explanation Isolation (`ml/explainability/explanation_formatter.py`)
- **Customer View:** Reassuring, polite, non-technical. Zero internal model leakage (no mention of SHAP, weights, z-scores, autoencoders, or numerical thresholds). Available in English and Hindi.
- **Analyst View:** Full technical depth for fraud operations (signed SHAP contributions, sequence attention rankings, graph topology evidence, autoencoder reconstruction error, scam typology head prediction, and reason codes).

---

## 4. Operational Threshold Simulation & Cost Modeling

Simulations were executed using `WhatIfThresholdSimulator` (`ml/decision/simulator.py`) on Out-of-Fold validation and test sets using the official economic loss parameters:
- Average Uncaught Fraud Loss: $L_F = ₹32,000$
- Legitimate Customer Friction Cost: $C_{FP} = ₹250$

### 4.1 Empirical Results Summary

| Metric | Validation Set ($N = 9,313$) | Test Set ($N = 9,164$) |
|---|:---:|:---:|
| **Approve Rate** | **99.02%** ($9,222$ txns) | **98.65%** ($9,040$ txns) |
| **Step-Up OTP Rate** | **0.12%** ($11$ txns) | **0.14%** ($13$ txns) |
| **Cooling Period Rate** | **0.06%** ($6$ txns) | **0.09%** ($8$ txns) |
| **Block Rate** | **0.79%** ($74$ txns) | **1.12%** ($103$ txns) |
| **Total Frauds** | 88 | 124 |
| **Frauds Intercepted** | 84 (**95.45% catch rate**) | 114 (**91.94% catch rate**) |
| **Missed Frauds (FN)** | 4 | 10 |
| **Total Legitimate** | 9,225 | 9,040 |
| **Legitimate Challenged (FP)** | 7 (**0.08% friction rate**) | 10 (**0.11% friction rate**) |
| **Uncaught Fraud Loss** | ₹128,000 | ₹320,000 |
| **Customer Friction Cost** | ₹1,750 | ₹2,500 |
| **Total Expected Business Cost** | **₹129,750** | **₹322,500** |

*Note: In accordance with the Phase 3 Evaluation Integrity Audit, test operating points were strictly frozen from the validation policy. No thresholds were tuned or optimized against test labels.*

---

## 5. Cryptographic Explanation Audit Trail

The audit ledger (`ml/explainability/audit_trail.py`) implements tamper-evident hash chaining:
1. Every risk decision and explanation payload is hashed via SHA-256 (`explanation_payload_hash`).
2. Each audit record contains:
   `f"{record_id}|{decision_id}|{transaction_id}|{timestamp}|{risk_score}|{action}|{sorted_codes}|{explanation_payload_hash}|{prev_record_hash}"`
3. Any modification to a decision, risk score, action, reason code, or explanation payload breaks the cryptographic chain immediately.

---

## 6. Verification & Test Results

The comprehensive test suite in `backend/tests/` was executed:
- **Phase 1 Data & EDA Tests (`test_data_phase1.py`):** 7 / 7 PASSED
- **Phase 2 Feature & Baseline Tests (`test_features_phase2.py`):** 9 / 9 PASSED
- **Phase 3 Deep Model & Ensemble Tests (`test_deep_models_phase3.py`):** 14 / 14 PASSED
- **Phase 4 Explainability & Decision Engine Tests (`test_explainability_phase4.py`):** 14 / 14 PASSED
- **Total Test Suite:** **44 / 44 tests passing** in 5.33 seconds.

---

## 7. Known Limitations

1. **Static Graph Embeddings:** Graph node embeddings are precomputed on the training/validation subgraphs. New entities not in the cache default to cold-start 1-hop heuristics until the graph cache is refreshed.
2. **Simplified Bilingual Support:** Bilingual customer explanations currently cover English and Hindi. Regional Indian languages (Tamil, Telugu, Kannada, Bengali, Marathi) will be integrated in subsequent releases.

---

## 8. Proposed Next Phase: Phase 5 — Real-Time Inference, API & Model Serving

In Phase 5, the models and decision engine will be deployed to high-performance inference services:
1. Exporting neural models to optimized ONNX / TorchScript runtimes for sub-50ms latency.
2. Fast Redis caching layer for user profiles, sequence windows, and graph node embeddings.
3. Production FastAPI endpoints adhering to the Canonical Decision Contract.
4. Latency profiling against the strict `<100ms` SLA budget.
