# FinSure Case State Machine Specification

## 1. Overview
The **Case State Machine** defines the formal lifecycle for fraud investigation cases (`cases` table). It decouples operational case investigation and dispositioning from raw, immutable transaction and incident records.

FinSure strictly enforces valid transitions at the backend API layer. Any attempted invalid transition is rejected with `HTTP 400 Bad Request`.

---

## 2. States & Transition Matrix

```
       [ Customer "Not me" / Alert Triage ]
                        │
                        ▼
                     +-----+
                     | NEW |
                     +-----+
                        │
                        │ (Analyst assigns / starts review)
                        ▼
             +---------------------+
             | UNDER_INVESTIGATION |
             +---------------------+
                 │        │        │
    (Escalate)   │        │        │ (Dismiss with Reason)
         ┌───────┘        │        └───────┐
         ▼                │                ▼
   +-----------+          │          +-----------+
   | ESCALATED |          │          | DISMISSED |
   +-----------+          │          +-----------+
         │                ▼                │
         │       +-----------------+       │
         │       | CONFIRMED_FRAUD |       │
         │       +-----------------+       │
         │                │                │
         └──────────┐     │     ┌──────────┘
                    ▼     ▼     ▼
                    +------------+
                    |   CLOSED   |  (Terminal State)
                    +------------+
```

### Transition Matrix Table

| From State | Allowed Target States | Permitted Roles | Required Parameters & Business Rules |
|---|---|---|---|
| `new` | `under_investigation` | Analyst, Admin | Case assignment to analyst. |
| `under_investigation` | `escalated` | Analyst, Admin | Mandatory `reason_code` (e.g., `suspected_syndicate`, `cross_channel_pattern`) + mandatory `note`. |
| `under_investigation` | `confirmed_fraud` | Analyst, Admin | Sets `disposition='confirmed_fraud'`. Appends evidence snapshot to retraining ledger. |
| `under_investigation` | `dismissed` | Analyst, Admin | Mandatory `reason_code` + `note`. **Four-eyes rule**: If case priority is `CRITICAL`, requires approval by a second analyst or admin (`approved_by`). |
| `escalated` | `under_investigation`, `confirmed_fraud`, `dismissed`, `closed` | Compliance Officer, Admin | Resolution or de-escalation of complex / syndicate cases. |
| `confirmed_fraud` | `closed` | Analyst, Admin | Archive / case wrap-up. |
| `dismissed` | `closed` | Analyst, Admin | Archive / case wrap-up. |
| `closed` | *(None)* | — | Terminal state. Closed cases are immutable. Re-opening requires a new case. |

---

## 3. Four-Eyes Policy Enforcement
For cases flagged with `CRITICAL` priority (Risk Score $\ge 90$ or decision `block`), dismissal carries significant financial and regulatory risk.
- A single analyst cannot unilaterally dismiss a `CRITICAL` case.
- The transition payload must supply an `approved_by` user ID.
- The `approved_by` user ID must not match the acting analyst (`actor_id != approved_by`).
- Both the actor ID and approver ID are permanently committed to the immutable `case_transitions` repository and incident event hash chain.

---

## 4. Transition Auditing
Every state transition:
1. Updates the `cases` table: `status`, `updated_at`, `closed_at`, `closed_by`, `disposition`, `disposition_reason`, and `disposition_note`.
2. Inserts an immutable record into `case_transitions`:
   $$\text{Record} = \{\text{transition\_id}, \text{case\_id}, \text{from\_status}, \text{to\_status}, \text{actor\_id}, \text{reason\_code}, \text{note}, \text{approved\_by}, \text{created\_at}\}$$
3. Appends a cryptographic audit event into the incident SHA-256 hash-chain ledger (`incident_events`), ensuring tamper-evident tracking.
