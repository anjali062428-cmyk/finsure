# FinSure — Final Product Completion & Architectural Specification
**Consolidated Master Architecture, Operational Workflows & Production Governance**  
**Document Version:** 1.0.0  
**Phase Status:** PHASE 10 COMPLETED & VERIFIED  
**Date:** 2026-09-30  

---

## 1. Executive Product Architecture

FinSure is an end-to-end, multi-tier AI financial fraud detection and defense platform tailored for real-time Unified Payments Interface (UPI) ecosystems under strict sub-100ms inference budgets. 

```
                                 [ UPI Transaction Request ]
                                              │
                                              ▼
                             [ FastAPI Real-Time Gateway ]
                              (Rate-Limiting & Correlation)
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
            [ Shared Feature Engine ]                 [ Redis / Fallback Store ]
             (36 Dynamic UPI Vectors)                  (User & Device Profiles)
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
                 [ ML Ensemble Brain ]                   [ Scam Classifier ]
             ┌─────────────────────────┐               (6-Class Multi-Task)
             │ 1. Classical XGBoost    │
             │ 2. Sequence GRU+Attn    │
             │ 3. GraphSAGE Embeddings │
             │ 4. Deep Autoencoder     │
             └───────────┬─────────────┘
                         ▼
             [ Isotonic Meta-Learner ]
               (Calibrated Risk 0-100)
                         │
                         ▼
             [ Decision Engine Rails ]
     ┌───────────────────┬───────────────────┬───────────────────┐
     ▼                   ▼                   ▼                   ▼
 [ APPROVE ]        [ STEP-UP ]       [ COOLING HOLD ]       [ BLOCK ]
 (Score 0-39)       (Score 40-69)       (Score 70-89)      (Score 90-100)
     │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼
[ Instant ]       [ 2FA Challenge ]   [ 4-Hour Delay ]    [ Containment ]
     │                                                           │
     └───────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
                     [ Forensic Case Ledger ]
                      (SHA-256 Hash Chained)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [ Customer Portal ]             [ Analyst Workspace ]
     - Bi-lingual EN/HI Cards        - Evidence Binder
     - Safe Non-Technical Reasons    - FinSure Investigator
     - "Not Me" Fast-Track Dispute   - Four-Eyes Adjudication
                                     - Court-Ready ZIP Export
```

---

## 2. Customer Workflow (Safety & Self-Service)

1. **Authentication & Identity:**
   - User signs up with legal name, email, and phone (`POST /api/v1/auth/register`).
   - Dual-channel OTP verification (Email + SMS) validates account ownership before activation (`POST /api/v1/auth/verify-email`, `POST /api/v1/auth/verify-phone`).
   - Login via Argon2id hashed password or single-use OTP.
2. **Transaction Simulation & Instant Scoring:**
   - Customer initiates a payment via `/customer/transactions`.
   - Payload submitted to `POST /api/v1/transactions/score`.
   - Real-time decision rendered in <100ms.
3. **Decision Interactions:**
   - **`approve`:** Instant receipt generated with green safety indicators.
   - **`step_up`:** Immediate 2FA challenge via `/api/v1/auth/step-up/request` and verification via `/api/v1/auth/step-up/verify`.
   - **`cooling_period`:** 4-hour security delay with countdown timer and plain-language explanation.
   - **`block`:** Instant fraud rejection with clear, non-technical rationale in English and Hindi (EN/HI).
4. **Fast-Track "Not Me" Dispute:**
   - Customer reports unauthorized transaction with one click (`POST /api/v1/cases` with `customer_reported=True` and `priority=HIGH`).
   - Automatically initializes an immutable Case Docket and alerts analyst queue.

---

## 3. Analyst Command Center & Forensic Workflow

1. **Deterministic Alert Triage (`/analyst/alerts`):**
   - Alerts sorted strictly by Priority (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`) then Calibrated Risk Score DESC.
   - Single-click analyst claim & assignment.
2. **Incident Dossier Deep Dive (`/analyst/incidents/:id`):**
   - Full multi-modal feature breakdown: signed SHAP contributions, GRU sequence attention weights, GraphSAGE centrality, and autoencoder reconstruction errors.
   - Immutable SHA-256 cryptographic audit chain timeline.
3. **Case Docket Escalation (`/analyst/cases/:id`):**
   - Escalates high-risk incidents into full Case Dockets via `POST /api/v1/cases`.
4. **Forensic Workspace Tools:**
   - **Evidence Binder:** Immutable evidence store with Zero-Deletion rule.
   - **FinSure Investigator:** Assistive copilot generating citation-grounded narrative reports.
   - **Claim Grounding Sandbox:** Validates custom analyst hypotheses against active evidence.
   - **Four-Eyes Adjudication:** Enforces co-authorization for CRITICAL priority dismissals (`approved_by !== actor_id`).
   - **Evidence Pack ZIP:** One-click download of court-ready forensic archive.

---

## 4. Admin Governance & Telemetry Workflow

1. **System Administration Console (`/admin`):**
   - Real-time cluster health from `GET /api/v1/health`.
   - Active model artifact inspection from `GET /api/v1/models`.
   - Active case docket and alert counts from live database queries.
2. **User & Identity Governance (`/admin/users`):**
   - Active session inspection and credential security standards (Argon2id, refresh token family rotation).
   - Honest disclosure: User Directory bulk enumeration is unexposed by backend auth for privacy and security.
3. **Analyst Workload Allocation (`/admin/analysts`):**
   - Real-time docket workload distribution aggregated across live Case records (`GET /api/v1/cases`).
   - Critical/High priority backlog tracking per operator.
4. **Model Registry Governance (`/admin/models`):**
   - Comprehensive model architecture specifications (XGBoost, GRU Attention, GraphSAGE GNN, Autoencoder, Scam Classifier, Meta-Learner).
   - Real feature count (36) and decision bands.
5. **Policy & Threshold Management (`/admin/policies`):**
   - Read-only operational risk bands (0–39 LOW, 40–69 MEDIUM, 70–89 HIGH, 90–100 CRITICAL).
   - What-If policy simulator with strict backend authority disclosure.
6. **Audit Ledger Verification (`/admin/audit`):**
   - Cryptographic verification of case ledger block chains (`GET /api/v1/cases/:id/audit/verify`).
   - Real-time tamper detection alerting.
7. **Infrastructure Telemetry (`/admin/system`):**
   - FastAPI endpoints operational matrix, Redis connection status, and P95 latency monitoring.

---

## 5. Machine Learning Ensemble Architecture

1. **Feature Engineering Engine:**
   - 36 continuous, discrete, and behavioral features.
   - Features include transaction velocity, amount z-scores, night-time ratio, new-device flags, and graph degree metrics.
2. **Sub-Model Brains:**
   - **Tabular:** XGBoost Classifier trained on fold-safe stratified splits.
   - **Temporal:** GRU Recurrent Neural Network with temporal attention pooling over 50-step transaction sequences.
   - **Relational:** 2-Layer GraphSAGE generating 16-dimensional node embeddings from UPI transaction graphs.
   - **Unsupervised:** Deep Autoencoder trained exclusively on benign transactions to detect novel anomalies via reconstruction MSE.
   - **Scam Classifier:** Multi-task classification head predicting 6 scam typologies (Lottery, Impersonation, Sextortion, Investment, Part-Time Job, Phishing).
3. **Meta-Learner Ensemble Gate:**
   - Stacking meta-learner calibrated using isotonic regression.
   - Produces well-calibrated fraud probability ($P \in [0, 1]$) with Brier score $<0.05$.
   - Calibrated Risk Score $= \text{round}(P \times 100)$.

---

## 6. Incident & Event Ledger Architecture

- **Append-Only Ledger:** Incident events and state transitions are stored in append-only SQLite/PostgreSQL tables.
- **SHA-256 Hash Chaining:** Each ledger event computes:
  $$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} \parallel \text{Timestamp}_n \parallel \text{Actor}_n \parallel \text{Payload}_n)$$
- **Tamper Detection Guarantee:** Any unauthorized modification, deletion, or reordering of ledger events invalidates the cryptographic hash chain.

---

## 7. Case Investigation & Evidence Grounding

- **State Machine Lifecycle:**
  $$\text{new} \longrightarrow \text{under\_investigation} \longrightarrow \{\text{escalated}, \text{confirmed\_fraud}, \text{dismissed}\} \longrightarrow \text{closed}$$
  `closed` is strictly terminal.
- **Zero-Deletion Immutability:** Evidence items are never deleted. An item can only be transitioned to `withdrawn` with a mandatory $\ge 3$ character justification, maintaining a permanent audit trail.
- **Assistive AI Boundary:** FinSure Investigator is strictly assistive and non-autonomous. It evaluates evidence items and produces citation-grounded narrative reports citing explicit evidence IDs (e.g. `[E1]`, `[E2]`). It has zero permission or capability to mutate case status, adjust thresholds, alter risk scores, or decide fraud verdicts.

---

## 8. 3D Spatial Architecture & Accessibility Parity

- **Purposeful Spatial Views:**
  1. `VerdictGatePreview`: Visualizes the 3-stage flow (Transaction $\to$ FinSure Multi-Model $\to$ Decision).
  2. `TrinetraPreview`: Visualizes UPI relational graph topology using evidence-grounded terms ("Potential Hub", "Observed Cluster", "Under observation").
  3. `ThreatGlobePreview`: Visualizes synthetic regional transaction dispersion.
- **Code Splitting & Performance:** Three.js is lazy-loaded strictly on demand. 3D libraries are never loaded on login, signup, customer simulator, simple tables, or admin pages.
- **2D Accessible Fallback & Reduced Motion:** Every 3D canvas provides an accessible 2D table/matrix counterpart and automatically falls back to 2D when `prefers-reduced-motion` is active or WebGL is unsupported.

---

## 9. Security & Access Control

- **Argon2id Password Storage:** $m=65536$, $t=2$, $p=4$ with 16-byte cryptographically secure random salt.
- **Session Tokens:** Short-lived access tokens (15 minutes) with single-use refresh token rotation (7 days) and replay detection.
- **Lockout Policy:** 5 consecutive failures triggers a 15-minute lock.
- **Zero Stack Trace Leakage:** Production FastAPI exception handlers trap validation, missing artifact, and unhandled exceptions, returning structured error responses with correlation IDs.

---

## 10. Verification & Test Metrics Summary

| Test Suite | Tests Run | Result | Duration |
|---|---|---|---|
| Phase 1: Data & Synthetic UPI Engine | 7 | **7 / 7 PASSED** | Backend Suite |
| Phase 2: Features & Baselines | 9 | **9 / 9 PASSED** | Backend Suite |
| Phase 3: Deep Models & Ensemble | 14 | **14 / 14 PASSED** | Backend Suite |
| Phase 4: Explainability & Decision Engine | 16 | **16 / 16 PASSED** | Backend Suite |
| Phase 5: Inference API & Serving | 20 | **20 / 20 PASSED** | Backend Suite |
| Phase 6: Authentication & RBAC | 30 | **30 / 30 PASSED** | Backend Suite |
| Phase 7: Incidents, Replay & Reports | 28 | **28 / 28 PASSED** | Backend Suite |
| Phase 8: Case Investigation & Investigator | 24 | **24 / 24 PASSED** | Backend Suite |
| **Total Backend Python Regression** | **148** | **148 / 148 PASSED** | **105.78s** |
| Phase 9B: Customer Portal | 7 | **7 / 7 PASSED** | 285 ms |
| Phase 9C: Analyst Command Center | 13 | **13 / 13 PASSED** | 266 ms |
| Phase 9D: Case Investigation Workspace | 38 | **38 / 38 PASSED** | 414 ms |
| Phase 10: Product Completion & E2E Integration | 33 | **33 / 33 PASSED** | 355 ms |
| **Total Frontend Node Test Suites** | **91** | **91 / 91 PASSED** | **1.32s** |
| TypeScript Compilation (`npx tsc --noEmit`) | Full Repo | **0 Errors (Clean)** | Verified |
| Vite Production Build (`npm run build`) | Full Bundle | **Clean Compilation** | Verified |

---

## 11. Known Limitations & Production Notes

1. **LLM Provider Integration:** Primary investigation engine runs the deterministic `TemplateInvestigatorAdapter`, guaranteeing 100% citation groundedness. External LLM adapters (Ollama / Llama 3) require local setup and are mocked in offline testing.
2. **Four-Eyes Approver Input:** Co-authorization currently accepts input of a valid peer analyst user ID rather than an active multi-session web socket handshake.
3. **Simulated Payment Rails:** UPI data and transactions are simulated in synthetic sandboxes. Production integration requires connecting to licensed banking switch gateways.

---

## 12. Future MLOps Enhancements (Post-Completion)

1. **Real-Time Drift Monitoring:** Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) tests across streaming UPI feature vectors.
2. **Canary Model Serving:** Champion/Challenger routing with automated rollback on latency or calibration degradation.
3. **Prometheus & Grafana Dashboards:** Streaming inference latency percentiles, error rates, and cache hit ratios.
4. **Active Learning Feedback Loop:** Analyst feedback records feeding scheduled offline retraining pipelines without live model mutation.

---

**FINAL VERDICT:** FINSURE PRODUCT COMPLETION — READY FOR DEMO
