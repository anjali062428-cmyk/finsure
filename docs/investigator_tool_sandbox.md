# FinSure Investigator Tool Sandbox Specification

## 1. Sandbox Purpose
The **Investigator Tool Sandbox** (`backend/services/tool_sandbox.py`) enforces strict least-privilege boundary controls around the FinSure Investigator. It guarantees that an AI model or prompt-injection attempt can never mutate database state, alter risk scores, change thresholds, or affect user accounts.

---

## 2. Whitelisted Read-Only Tools

The sandbox strictly permits only the following read methods:

| Tool Name | Scope | Output Data (PII-Masked) |
|---|---|---|
| `get_case` | Case details | Status, priority, risk score, decision, timestamps. |
| `get_incident` | Raw incident | Transaction ID, scoring snapshot, incident status. |
| `get_evidence` | Case evidence | Active evidence records, metadata, content hashes. |
| `get_timeline` | Case events | Chronological event stream from ledger. |
| `get_report` | Generated reports | Report records and PDF content hashes. |
| `get_similar_cases` | kNN case match | Top-k nearest historical incidents with disclaimer. |
| `verify_audit_chain`| Cryptographic audit| Tamper-verification status of incident hash chain. |
| `get_transactions` | Account history | Historical transaction amounts, channels, timestamps. |
| `get_user_profile` | Account tenure | KYC verification status, account age. |
| `get_devices` | Telemetry | Device IDs (masked), trust status, last seen. |
| `get_locations` | Geo-telemetry | City, country, IP address (masked). |
| `get_linked_accounts`| Banking links | Masked VPA handles, bank names. |
| `get_shap` | Explainability | Positive/negative feature contributions from XGBoost. |

---

## 3. Explicitly Prohibited Operations

Any call to the following operations raises a `PermissionError` immediately:
- `create_case`
- `update_case`
- `change_status`
- `modify_risk_score`
- `modify_threshold`
- `block_transaction`
- `dismiss_incident`
- `confirm_fraud`
- `delete_evidence`
- `withdraw_evidence`
- `modify_user`
- `add_feedback`
- `record_transition`
- `update_alert`

This sandbox policy is verified automatically on every test run in `backend/tests/test_case_phase8.py`.
