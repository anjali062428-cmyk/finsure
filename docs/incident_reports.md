# FinSure Incident Reports & Cryptographic Integrity Architecture

## 1. Overview
FinSure generates dual-tier, cryptographically sealed PDF reports for security incidents:
1. **Customer Incident Report**: Consumer-facing transaction notice providing transparency, protective steps, and plain-language rationale without exposing internal model mechanics.
2. **Analyst Evidence Pack**: Comprehensive forensic dossier containing multi-modal ML explainability, SHAP feature rankings, autoencoder reconstruction error, sequence attention weights, graph network topology, append-only ledger history, and cryptographic chain verification.

---

## 2. Report Specifications & Audience Separation

| Dimension | Customer Incident Report | Analyst Evidence Pack |
|:---|:---|:---|
| **Primary Audience** | Retail UPI Account Holder | Fraud Analysts, AML Investigators, Compliance Officers, Regulators |
| **RBAC Authorization** | `customer` (own transactions only), `analyst`, `admin` | `fraud_analyst`, `compliance_officer`, `admin` (Strictly prohibited for customer) |
| **Filename Pattern** | `FinSure_Customer_Report_{incident_id}.pdf` | `FinSure_Analyst_Evidence_{incident_id}.pdf` |
| **Risk Metrics Shown** | Qualitative protection band (e.g. `BLOCKED - SUSPICIOUS`) | Full quantitative metrics: 0–100 Risk Score, Calibrated Probability ($0.0-1.0$), Decision Action, Model Versions |
| **ML Explainability** | Plain-language summary (e.g. *"Unusual transaction pattern on a new device"*) | Top 5 SHAP values, Sequence Attention weights, GNN entity degrees, Autoencoder error vs 0.3418 threshold, Scam Type classification |
| **Auditing & Forensic Chain** | Verification QR seal & generation timestamp | Cryptographic ledger event table with individual event hashes and hash-chain verification status |
| **Actionable Guidance** | 1930 Cyber Fraud Helpline, UPI PIN reset, security recommendations | Investigative findings, evidence cross-references, ground-truth feedback |

---

## 3. Strict Customer Information Isolation

To prevent adversaries from reverse-engineering the detection engine or gaming threshold boundaries:
- **Zero SHAP Values**: Raw feature attribution contributions are stripped.
- **Zero Raw Model Weights**: Individual model probabilities (XGBoost, Sequence, GNN, Autoencoder) are omitted.
- **Zero Graph Ring Identifiers**: Fraud ring clusters, entity degrees, and syndicate names are excluded.
- **Zero Internal Policy Thresholds**: Boundary values (e.g. $40$, $70$, $90$) are never mentioned.

---

## 4. Cryptographic Report Integrity & Verification

### 4.1 Content Hashing
Every generated PDF is digested using SHA-256 immediately after compilation:
$$\text{content\_hash} = \text{SHA-256}(\text{PDF bytes})$$
This hash is:
- Stored in the `incident_reports` database table.
- Emitted in the HTTP response headers: `X-Content-SHA256: <hash>`.
- Included inside the embedded QR code payload.

### 4.2 QR Code Verification Payload
The embedded QR code encodes a tamper-evident JSON payload:
```json
{
  "report_id": "rep_cust_3a1b8c",
  "incident_id": "inc_9909",
  "type": "customer_report",
  "timestamp": "2026-09-29T01:36:55+00:00"
}
```
Scanning the QR code routes the client or auditor to the FinSure report verification endpoint.

### 4.3 Report Verification Endpoint
`POST /api/v1/incidents/{incident_id}/report/verify`
- **Request Body**:
  ```json
  {
    "candidate_hash": "a1b2c3d4...64_hex_chars...",
    "report_type": "customer"
  }
  ```
- **Response**:
  ```json
  {
    "incident_id": "inc_9909",
    "report_type": "customer",
    "verified": true,
    "message": "Report integrity verified: SHA-256 hash matches stored record bit-for-bit."
  }
  ```

### 4.4 Mandatory Legal & Policy Disclaimer
All generated reports carry the following explicit disclosure:
> *"Cryptographic hash verification proves document content integrity at the time of generation against FinSure tamper-evident audit records. It does not constitute judicial evidence that the underlying financial event is factually true or legally conclusive."*
