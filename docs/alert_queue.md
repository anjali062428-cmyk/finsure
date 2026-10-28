# FinSure Analyst Alert Queue & Feedback Specification

## 1. Overview
The **Analyst Alert Queue** is the primary operational triage hub for fraud detection teams. It surfaces flagged, blocked, and stepped-up transactions with deterministic priority scores, SLA clocks, and categorization.

---

## 2. Deterministic Priority Assignment

FinSure strictly avoids using non-deterministic models or LLMs to assign alert priorities. Priority is determined by explicit operational risk policy rules:

| Priority Band | Criteria / Trigger Condition | SLA Target Window | Operational Protocol |
|:---|:---|:---|:---|
| `CRITICAL` | Risk Score $\ge 90.0$ OR Enforced Decision == `block` | **15 minutes** | Immediate live intervention. Requires executive or compliance review for dismissal. |
| `HIGH` | Risk Score $\ge 70.0$ OR Enforced Decision == `step_up` | **60 minutes** | Senior analyst review. Verify customer device & payee familiarity. |
| `MEDIUM` | Risk Score $\ge 40.0$ OR Enforced Decision == `flag` | **240 minutes (4 hours)** | Standard alert queue triage. Inspect rolling velocity and burst patterns. |
| `LOW` | Risk Score $< 40.0$ | **1440 minutes (24 hours)** | Retrospective sampling & baseline validation. |

---

## 3. Queue Sorting & Filtering Architecture

The endpoint `GET /api/v1/alerts` supports deterministic multi-key sorting:
1. **Primary Sort Key**: Priority Rank (`CRITICAL` = 1, `HIGH` = 2, `MEDIUM` = 3, `LOW` = 4).
2. **Secondary Sort Key**: Risk Score descending (highest risk first within priority band).
3. **Tertiary Sort Key**: SLA Due Time ascending (closest to breach first).

### Supported Filter Parameters:
- `priority`: Filter by priority string (`CRITICAL`, `HIGH`, etc.).
- `status`: Filter by case status (`new`, `under_investigation`, `escalated`).
- `assigned_to`: Filter by assigned analyst ID.
- `scam_type`: Filter by predicted scam classification (e.g. `phishing`, `lottery`, `impersonation`).

---

## 4. Analyst Feedback & MLOps Ingestion

When an analyst finishes reviewing an incident, they submit ground-truth feedback via `POST /api/v1/incidents/{incident_id}/feedback`:

```json
{
  "verdict": "confirmed_fraud",
  "notes": "Customer confirmed unauthorized remote-desktop debit via AnyDesk.",
  "scam_type_corrected": "remote_access_scam",
  "evidence_references": ["ev_call_recording_01", "ev_mule_account_report"]
}
```

### Supported Verdicts:
1. `confirmed_fraud`: Confirms transaction was fraudulent.
2. `false_positive` / `dismissed`: Confirms transaction was legitimate.
3. `escalated`: Transfers case to senior investigator or legal team.
4. `scam_type_correction`: Re-labels the specific scam category (e.g., predicted `lottery`, actual `impersonation`).

### MLOps Governance & Non-Tampering Rule
> [!IMPORTANT]
> **Safety Invariant:** Analyst feedback **NEVER directly modifies model weights in real time**. 
> All feedback submissions are written to the append-only `analyst_feedback` table and incident ledger. These verified ground-truth labels serve as historical training data for Phase 10 Champion/Challenger scheduled re-training pipelines.
