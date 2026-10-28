# FinSure Phase 5 Engineering Report: Real-Time Inference, API & Model Serving

**Date:** 2026-09-28  
**Author:** FinSure Risk Engineering & Backend Architecture Team  
**Governing Standard:** IEEE 830 / FinSure SRS v2 (FR-ML-01, FR-ML-02, FR-ML-03) / Master Prompt v2 Section 5, 6, 8  
**Artifact Status:** Verified, Tested (66/66 Unit Tests Passing), and Production-Ready

---

## 1. Executive Summary

Phase 5 transitions the validated FinSure fraud detection engine into a high-performance, production-ready real-time inference microservice. Built on FastAPI, the service integrates all upstream artifacts developed in Phases 1–4 into a single, cohesive processing pipeline:

```
Transaction Request
        ↓
Input Validation (Pydantic v2)
        ↓
Feature Engineering (RealTimeFeatureService, 36 Tabular Features)
        ↓
User/Device/Payee Context (ProfileService, In-Memory / Redis Backing)
        ↓
Base Models Inference (XGBoost, Sequence GRU, GraphSAGE, Autoencoder, Scam Classifier)
        ↓
Meta-Learner & Calibration (Calibrated Probability P ∈ [0.0, 1.0])
        ↓
Risk Score & Decision Engine (S = round(100 × P) ∈ [0, 100] → approve | step_up | cooling_period | block)
        ↓
Multi-Modal Explainability (SHAP, Attention, Graph Topo, AE MSE, Reason Codes EN/HI)
        ↓
Cryptographic Audit Trail (SHA-256 Hash Chain)
        ↓
Canonical API Response
```

The system achieves a median latency of **36.40 ms** and a $P_{95}$ latency of **98.16 ms**, satisfying the strict sub-100ms SLA budget on standard CPU hardware without pre-filtering or sacrificing full mathematical explainability.

---

## 2. Files Created & Modified

```text
backend/
├── main.py                                        [Created: FastAPI app, lifespan, security middleware, error handlers]
├── api/
│   ├── __init__.py                                [Created]
│   ├── dependencies/
│   │   ├── __init__.py                            [Created]
│   │   └── services.py                            [Created: Dependency injection providers]
│   ├── routes/
│   │   ├── __init__.py                            [Created]
│   │   ├── health.py                              [Created: GET /health, GET /models]
│   │   └── transactions.py                        [Created: POST /transactions/score]
│   └── schemas/
│       ├── __init__.py                            [Created]
│       └── transaction.py                         [Created: Pydantic v2 request & canonical response schemas]
├── services/
│   ├── __init__.py                                [Created]
│   ├── model_service.py                           [Created: ModelRegistry singleton, artifact validation, pre-warming]
│   ├── feature_service.py                         [Created: RealTimeFeatureService, 36 features, sequence builder]
│   ├── profile_service.py                         [Created: ProfileService, state management, Redis + fallback]
│   └── inference_service.py                       [Created: InferenceService end-to-end pipeline coordinator]
└── tests/
    └── test_api_phase5.py                         [Created: 20 Unit & Integration Tests]

docs/
├── api_contract.md                                [Created: Complete OpenAPI/REST contract documentation]
├── model_serving.md                               [Created: Architecture, loading strategy, state resilience]
├── latency_report.md                              [Created: Empirical latency profiling and breakdown]
├── PHASE5_INFERENCE_API_REPORT.md                 [Created: This report]
├── AGENT_PROGRESS.md                              [Updated with Phase 5 completion]
└── results/
    └── phase5_latency_benchmark.json              [Generated: 100-request latency profiling dataset]
```

---

## 3. Real-Time Inference Architecture & Model Serving

1. **Lifespan Initialization (`ModelRegistry`):**
   - All 9 model artifacts (`xgboost_baseline.json`, `feature_scaler.joblib`, `sequence_model.pt`, `graph_model.pt`, `cached_embeddings.joblib`, `autoencoder.pt`, `scam_classifier.pt`, `ensemble_meta_learner.joblib`, `risk_thresholds.yaml`) are loaded once into memory during server boot.
   - Zero per-request disk reads.
   - Fails fast (`FileNotFoundError`) if any artifact is missing; zero fake models or fabricated predictions.
2. **Pre-Warming Routine:**
   - Runs a warm-up forward pass during lifespan startup to initialize PyTorch C++ allocators, tree pathing structures, and thread pools, ensuring that the first live transaction does not suffer cold-start compilation jitter.
3. **Feature Alignment Guarantee:**
   - `RealTimeFeatureService` guarantees that the serving feature vector strictly matches the 36-column definition from `FEATURE_COLUMNS`.
   - Feature dimensions, column names, finite float checks, and z-score scaling are validated on every request.
4. **Cold-Start Handling:**
   - **Sequence Model ($N=50$):** If a user has fewer than 50 historical transactions, the sequence is padded with zeros and the attention mask is set to `False` for padded steps. For brand-new users, attention defaults uniformly with explicit narrative notification.
   - **GraphSAGE:** For unseen users, payees, or devices absent from the 7,046 cached entity embeddings, a neutral zero vector is used alongside unfamiliarity risk signals.

---

## 4. API Endpoints & Request/Response Contracts

### Primary Scoring Endpoint: `POST /api/v1/transactions/score`

- **Request:** Accepts `user_id`, `payee_id`, `amount`, `device_id`, `channel`, `city`, and optional context (`language`, `note`, `latitude`, `longitude`).
- **Response:** Strict adherence to the Canonical Decision Contract:
  ```json
  {
    "transaction_id": "TXN_TEST_99182",
    "risk_score": 97,
    "risk_probability": 0.9676,
    "risk_band": "critical",
    "decision": "block",
    "reason_codes": [
      "RC_AMOUNT_ANOMALY",
      "RC_NEW_DEVICE",
      "RC_RECONSTRUCTION_OUTLIER",
      "RC_BENEFICIARY_RISK",
      "RC_HIGH_VALUE_FIRST_TIME"
    ],
    "customer_explanation": {
      "language": "en",
      "status": "block",
      "header": "Transaction Declined for Account Protection",
      "message": "This payment was declined due to security policies safeguarding your account against unauthorized access.",
      "instruction": "If you authorized this transaction, please contact 24/7 bank support through your app to verify your identity.",
      "safety_highlights": [...]
    },
    "analyst_explanation": {
      "meta": { ... },
      "xgboost_shap": { ... },
      "temporal_sequence": { ... },
      "entity_graph": { ... },
      "unsupervised_autoencoder": { ... },
      "scam_typology": { ... }
    },
    "model_version": "ensemble_v1.0.0",
    "threshold_version": "v1.0.0",
    "scored_at": "2026-09-28T14:30:00+00:00",
    "audit_record_id": "354ad8fc-8528-439c-91e9-adc8605e0069",
    "latency_ms": 53.397
  }
  ```

---

## 5. Empirical Latency Measurements

Benchmarked over 100 consecutive live inference cycles (`docs/results/phase5_latency_benchmark.json`):

| Metric | Measured Value | Target SLA | Compliance |
|---|:---:|:---:|:---:|
| **Minimum Latency** | 31.59 ms | — | — |
| **Median ($P_{50}$)** | 36.40 ms | $< 50\text{ ms}$ | **PASSED** |
| **$P_{90}$ Latency** | 47.39 ms | $< 80\text{ ms}$ | **PASSED** |
| **$P_{95}$ Latency** | **98.16 ms** | **$< 100\text{ ms}$** | **PASSED** |
| **Mean Latency** | 50.69 ms | — | — |

### Pipeline Stage Timing Breakdown (Mean):
1. **Feature Preparation:** 4.96 ms
2. **XGBoost Inference:** 2.44 ms
3. **Sequence Model (GRU):** 12.87 ms
4. **GraphSAGE (Cached):** 0.50 ms
5. **Deep Autoencoder:** 1.85 ms
6. **Meta-Learner & Calibration:** 2.73 ms
7. **Multi-Modal Explainability:** 24.03 ms
8. **Cryptographic Audit Trail:** 0.42 ms

---

## 6. Redis & State Layer Resilience

`ProfileService` implements dual-mode persistence:
- **Redis Mode:** Connects to `redis://localhost:6379/0` if a running Redis instance is detected.
- **In-Memory Fallback:** If Redis is down, timed out, or unconfigured, the service falls back automatically to internal Python dictionaries.
- **Fail-Safe Guarantee:** The application **never crashes or rejects transactions** due to transient Redis unavailability.

---

## 7. Security, Middleware & Audit Controls

1. **Payload Size Guard:** Enforces a 1 MB body ceiling, rejecting oversized payloads with `413 Payload Too Large`.
2. **Rate Limiting Middleware:** Implements a token-bucket sliding window (500 req/sec limit), throttling abusive traffic with `429 Too Many Requests`.
3. **Correlation Tracking:** Ingests or generates an `X-Request-ID` on every request, propagating it through logs, error handlers, and response headers.
4. **Zero Stack Trace Leakage:** Exception handlers trap unhandled errors and schema validation faults, returning clean, structured error JSON without internal file paths or stack traces.
5. **Cryptographic Audit Trail:** Every transaction decision generates an append-only SHA-256 hash-chained audit record verifying immutability.

---

## 8. Unit Test Suite Results across All Phases

```powershell
.\.venv\Scripts\python -m unittest discover backend/tests/
```

**Output:**
```text
C:\Users\Dell\Documents\Finsure\.venv\Lib\site-packages\torch\jit\_script.py:1491: FutureWarning: `torch.jit.script` is deprecated. Please switch to `torch.compile` or `torch.export`.
  warnings.warn(
..................................................................
----------------------------------------------------------------------
Ran 66 tests in 22.735s

OK
```

### Test Count Breakdown:
- **Phase 1 Data & EDA Tests (`test_data_phase1.py`):** 7 / 7 PASSED
- **Phase 2 Feature & Baseline Tests (`test_features_phase2.py`):** 9 / 9 PASSED
- **Phase 3 Deep Model Tests (`test_deep_models_phase3.py`):** 14 / 14 PASSED
- **Phase 4 Explainability Tests (`test_explainability_phase4.py`):** 16 / 16 PASSED
- **Phase 5 API & Serving Tests (`test_api_phase5.py`):** 20 / 20 PASSED
- **Total Test Suite:** **66 / 66 PASSED (100% Pass Rate)**

---

## 9. Known Limitations

1. **Static Graph Cache:** The 7,046 cached entity embeddings reflect the entity network at the Day 60 split boundary. Unseen entities receive neutral zero vectors until an asynchronous graph refresher is added in Phase 10.
2. **Synchronous SHAP Computation:** TreeExplainer accounts for $\sim 47\%$ of inference latency ($24\text{ ms}$). While well within the $100\text{ ms}$ budget, high-volume production deployments can decouple SHAP computation to background workers for low-risk approved transfers ($S < 40$).
3. **Bilingual Scope:** Customer explanations currently support English (`en`) and Hindi (`hi`). Additional regional Indian languages will be integrated during UI development.

---

## 10. Proposed Next Phase: Phase 6 — Authentication & Access Control

Now that the core inference service is validated and operational, Phase 6 will implement user and investigator security:
1. Multi-factor authentication (Email + phone OTP verification).
2. Password hashing using Argon2id.
3. Role-Based Access Control (RBAC): `customer`, `fraud_analyst`, `compliance_officer`, `admin`.
4. Account lockout policies, brute-force protection, and authenticated JWT sessions.
5. Tamper-evident investigator audit logging.
