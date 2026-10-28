# FinSure 🛡️
> *Explainable fraud protection for every payment.*

FinSure is an end-to-end, production-style, evidence-backed real-time financial fraud detection and response platform designed for modern payment rails (UPI, cards, net banking).

---

## Key Highlights

1. **Multi-Model Fraud Brain**: Sequence model (user temporal behavior) + Graph Neural Network (GraphSAGE for mule rings and shared devices) + Autoencoder (unseen zero-day anomalies), fused via a calibrated meta-learner.
2. **Risk-Based Adaptive Authentication**: Risk scores (0–100) directly govern friction: instant approval, step-up OTP challenge, cooling period, or hard block.
3. **Evidence-Backed Explainability**: Transparent SHAP reason codes mapped to plain-language bilingual templates (English & Hindi) and sequence attention attribution.
4. **Threat Replay**: Visual, hash-chained step-by-step reconstruction of incident events with tamper detection.
5. **Tamper-Evident Incident Reports**: Automated generation of dual-persona PDF incident reports (Customer and Analyst/Bank versions) carrying QR codes and SHA-256 case hashes for cybercrime/bank submission.
6. **FinSure Investigator**: An assistive, read-only investigation copilot following `Plan -> Examine -> Report` that cites evidence IDs without hallucinating or mutating case state.

---

## Repository Layout

```text
finsure/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── ml/
│   ├── data/            # Loaders, FinSure Synthetic UPI generator
│   ├── features/        # Shared feature engineering pipeline (training + serving)
│   ├── models/          # Sequence (Transformer/GRU), GNN, Autoencoder, Meta-learner
│   ├── train/           # Training scripts & YAML configs
│   ├── eval/            # Metrics (PR-AUC, recall@FPR, cost curves, ablations)
│   ├── explain/         # SHAP explainer, bilingual reason-code mappings
│   ├── export/          # ONNX export & parity tests
│   └── notebooks/       # EDA & fraud-pattern gallery
├── backend/
│   ├── app/             # FastAPI gateway, auth, transactions, cases, reports, admin
│   ├── migrations/      # Alembic database migrations
│   └── tests/           # Unit, integration, and security tests
├── frontend/
│   └── src/             # React, Tailwind, Three.js / React Three Fiber (R3F) UI
├── monitoring/          # Drift monitoring (PSI/KS), Prometheus, Grafana
├── data/
│   └── raw/             # Benchmark dataset archives (gitignored)
├── reference/           # Benchmark research papers and report templates
└── docs/                # AGENT_PROGRESS.md, data_card.md, data_provenance.md
```

---

## Operating Guidelines & Standards

- **Operating Rules:** Defined in `AGENTS.md`.
- **Implementation Master Plan:** Defined in `FinSure_Master_Prompt_FINAL.md`.
- **Software Requirements Specification:** Defined in `FinSure_SRS_v2.docx`.
- **Primary Integrated Dataset:** FinSure Synthetic UPI dataset (seeded, configurable).
- **Public Benchmarks:** ULB Credit Card Fraud, Sparkov CC, PaySim, IEEE-CIS (used for baseline and specialized component verification).

---

## Development Setup

```bash
# 1. Clone & Enter Workspace
cd Finsure

# 2. Environment Configuration
cp .env.example .env

# 3. Virtual Environment & Dependencies
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\Activate.ps1
pip install -r ml/requirements.txt
```
