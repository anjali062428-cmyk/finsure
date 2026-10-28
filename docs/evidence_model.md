# FinSure Evidence Model & Immutability Architecture

## 1. Overview
The **Case Evidence Store** (`case_evidence` table) acts as the immutable repository of forensic facts attached to an active fraud case. Evidence is strictly append-only:
- Evidence records are **never deleted**.
- If an item was attached in error or misattributed, it is marked `withdrawn` with a mandatory reason, timestamp, and actor ID.
- Active investigations automatically filter out withdrawn evidence, preserving historical audit integrity without contaminating downstream analytical reasoning.

---

## 2. Evidence Record Schema

```sql
CREATE TABLE case_evidence (
    evidence_id TEXT NOT NULL,
    case_id TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    added_by TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    withdrawn_at TEXT,
    withdraw_reason TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (case_id, evidence_id),
    FOREIGN KEY (case_id) REFERENCES cases(case_id)
);
```

### Supported Evidence Types

| Type | Source | Forensic Content |
|---|---|---|
| `transaction` | Core Engine / UPI Rails | Amount, timestamp, currency, channel (`UPI_P2P`, `UPI_P2M`), VPA handle, MCC. |
| `device` | Telemetry Collector | Device fingerprint, IP address, user agent, browser headers, trusted status. |
| `location` | Geo-IP Provider | Country, region, city, coordinates, proxy/VPN flag. |
| `shap_reason` | Explainability Engine | Signed additive SHAP feature contributions, baseline deviation. |
| `autoencoder_anomaly` | PyTorch AE Model | Latent space reconstruction error vs. calibrated 0.3418 threshold. |
| `graph_link` | Graph Neural Network | Syndicate degree, shared beneficiary nodes, ring clustering coefficient. |
| `user_profile` | Feature Engine / Redis | Account tenure, historical average ticket size, baseline transaction velocity. |
| `external_file` | Analyst Upload | FIR document, bank response letter, chargeback notice. |
| `analyst_note` | Fraud Analyst | Manual investigative annotations and cross-references. |
| `customer_report` | Customer App | Dispute narrative from "Not me" fast path. |

---

## 3. Cryptographic Content Hashing
Every evidence record computes a canonical SHA-256 hash over its metadata payload at creation time:
$$\text{Content Hash} = \text{SHA-256}(\text{json.dumps}(\text{metadata}, \text{sort\_keys}=\text{True}))$$
This hash is stored in `content_hash` and bundled into exported evidence packs, ensuring that historical records cannot be altered or substituted post hoc.

---

## 4. Immutable Withdrawal Protocol
When evidence is withdrawn via `POST /api/v1/cases/{case_id}/evidence/{evidence_id}/withdraw`:
1. `withdrawn_at` is populated with the current UTC timestamp.
2. `withdraw_reason` is recorded (e.g., `"Proxy IP confirmed as corporate VPN"`).
3. An audit event is appended to the incident hash chain.
4. Active queries (`include_withdrawn=False`) omit the record, but forensic audits (`include_withdrawn=True`) and ZIP evidence packs preserve the complete historical sequence.
