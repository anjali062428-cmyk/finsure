# FinSure — Phase 9D Case Investigation Integration Map

This document defines the strict, authoritative mapping between frontend actions and the Phase 8 Case Investigation backend API contracts.

---

## 1. Case Lifecycle & State Machine Architecture

### Canonical Case Lifecycle
The canonical case lifecycle strictly mirrors `VALID_TRANSITIONS` in `backend/services/case_service.py`:
```text
new ───> under_investigation ──┬───> escalated ────────┬───> closed
                               ├───> confirmed_fraud ──┤
                               └───> dismissed ────────┘
```
- **`new`**: Initial state upon case creation. Valid target: `['under_investigation']`.
- **`under_investigation`**: Active forensic analysis in progress. Valid targets: `['escalated', 'confirmed_fraud', 'dismissed']`.
- **`escalated`**: Transferred to senior compliance/tier-2 investigation. Valid targets: `['under_investigation', 'confirmed_fraud', 'dismissed', 'closed']`.
- **`confirmed_fraud`**: Human analyst verified fraudulent transaction. Valid target: `['closed']`.
- **`dismissed`**: Human analyst determined legitimate/false positive. Valid target: `['closed']`.
- **`closed`**: Strictly terminal docket state. Valid targets: `[]` (no transitions permitted).

---

## 2. API Endpoint & Frontend Action Mapping

### Action 1: List Cases
- **Frontend Trigger / View:** Navigating to `/analyst/cases` or changing filter/search/pagination controls.
- **Backend Endpoint:** `GET /api/v1/cases`
- **Request Parameters (Query):**
  - `status?: string` (e.g. `'new' | 'under_investigation' | 'escalated' | 'confirmed_fraud' | 'dismissed' | 'closed'`)
  - `priority?: string` (e.g. `'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'`)
  - `assigned_to?: string`
  - `limit?: number` (default 50, max 200)
  - `offset?: number` (default 0)
- **Response Schema:** `List[Case]`
  - `case_id: string`
  - `incident_id?: string`
  - `alert_id?: string`
  - `transaction_id: string`
  - `user_id: string`
  - `status: CaseStatus`
  - `priority: CasePriority`
  - `risk_score: float` (0.0 to 100.0)
  - `risk_band: string`
  - `decision: string`
  - `scam_type?: string`
  - `assigned_to?: string`
  - `sla_due_at?: string`
  - `customer_reported: boolean`
  - `opened_at: string` (ISO 8601)
  - `updated_at: string` (ISO 8601)
  - `evidence_count: number`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']` (Customers isolated to own cases).
- **Expected UI Behavior:** Renders case management table with priority chips, risk score indicator, status badge, search bar, status/priority dropdowns, empty state with retry, error toast on network failure.

---

### Action 2: Open Case from Incident
- **Frontend Trigger / View:** "Open Case" button in `AnalystIncidentDetailPage.tsx` or "Escalate to Case Docket" in `AnalystRingsPage.tsx`.
- **Backend Endpoint:** `POST /api/v1/cases`
- **Request Schema (JSON Body):**
  - `incident_id: string`
  - `customer_reported?: boolean` (default `false`)
- **Response Schema:** `Case` (Status 201 Created or 200 OK if existing case returned)
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin', 'customer']`.
- **Expected UI Behavior:** Shows loading indicator on button; handles duplicate gracefully (backend returns existing case if one already exists); navigates router to `/analyst/cases/:case_id` upon resolution; shows error toast on failure.

---

### Action 3: Load Case Workspace
- **Frontend Trigger / View:** Navigating to `/analyst/cases/:id`.
- **Backend Endpoint:** `GET /api/v1/cases/{case_id}`
- **Request Parameters:** Path param `case_id: string`
- **Response Schema:** `CaseWorkspaceResponse`
  - `case: Case`
  - `evidence: List[CaseEvidence]`
    - `evidence_id: string` (e.g. `'E1'`)
    - `evidence_type: EvidenceType` (`'transaction' | 'device' | 'location' | 'graph_link' | 'shap_reason' | 'autoencoder_anomaly' | 'user_profile' | 'external_file' | 'analyst_note' | 'customer_report'`)
    - `source_ref: string`
    - `added_by: string`
    - `content_hash: string` (SHA-256)
    - `metadata: Dict[str, Any]`
    - `withdrawn_at?: string`
    - `withdraw_reason?: string`
    - `created_at: string`
  - `transitions: List[CaseTransition]`
    - `transition_id: string`
    - `from_status: CaseStatus`
    - `to_status: CaseStatus`
    - `actor_id: string`
    - `reason_code?: string`
    - `note?: string`
    - `approved_by?: string`
    - `created_at: string`
  - `notes: List[CaseNote]`
    - `note_id: string`
    - `author_id: string`
    - `author_role: string`
    - `note_text: string`
    - `created_at: string`
  - `latest_investigation?: InvestigationRun`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** Populates header, evidence binder, timeline, notes thread, case status controls, and investigator panel. Shows full skeleton during loading; renders 404 error if case not found.

---

### Action 4: Case State Machine Transition
- **Frontend Trigger / View:** "Update Status" button in Case Workspace sidebar.
- **Backend Endpoint:** `POST /api/v1/cases/{case_id}/transition`
- **Request Schema (JSON Body):**
  - `to_status: CaseStatus`
  - `reason_code?: string` (Mandatory if `to_status` is `'dismissed'` or `'escalated'`)
  - `note?: string` (Mandatory if `to_status` is `'dismissed'` or `'escalated'`)
  - `approved_by?: string` (Mandatory if `to_status === 'dismissed'` and `case.priority === 'CRITICAL'`)
- **Response Schema:** `Case` (Updated case entity)
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Four-Eyes Policy Requirement:** Dismissing a `CRITICAL` priority case (`risk >= 90` or `priority === 'CRITICAL'`) requires an `approved_by` identity distinct from the current analyst. If missing, backend rejects with `ValueError: Four-eyes policy violation...`. UI displays "Additional approval required" badge and requires a second supervisor/compliance ID.
- **Expected UI Behavior:** Only valid transitions from current state are shown; terminal state (`closed`) disables transition button; modal enforces reason code and note; high-impact confirmation dialog shown for `confirmed_fraud` and `dismissed`.

---

### Action 5: Evidence Management (Add / Withdraw)
- **Add Evidence Endpoint:** `POST /api/v1/cases/{case_id}/evidence`
  - Request: `{ evidence_type: EvidenceType, source_ref: string, metadata: Dict[str, Any] }`
  - Response: `CaseEvidence`
- **Withdraw Evidence Endpoint:** `POST /api/v1/cases/{case_id}/evidence/{evidence_id}/withdraw`
  - Request: `{ withdraw_reason: string }`
  - Response: `CaseEvidence` (with `withdrawn_at` and `withdraw_reason` set)
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Zero-Deletion Principle:** Evidence items are never deleted; withdrawn items are displayed with strikethrough/badge, withdrawal reason, and timestamp.

---

### Action 6: Unified Chronological Timeline
- **Frontend Trigger / View:** "Timeline" tab or drawer in Case Workspace.
- **Backend Endpoint:** `GET /api/v1/cases/{case_id}/timeline`
- **Response Schema:** `{"case_id": string, "timeline": List[Dict[str, Any]]}`
  - Events include `timestamp`, `event_type`, `actor_id`, `actor_role`, `details`, `evidence_id`, `hash`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** Rendered chronologically with event type badges, actor labels, expandable metadata payloads, and linked evidence citations.

---

### Action 7: Case Notes
- **List Notes Endpoint:** `GET /api/v1/cases/{case_id}/notes`
- **Add Note Endpoint:** `POST /api/v1/cases/{case_id}/notes`
  - Request: `{ note_text: string }`
  - Response: `CaseNote`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** Real-time append to notes list with author badge (`analyst`, `compliance_officer`), ISO timestamp, and disabled submit state when empty.

---

### Action 8: Similar Historical Cases (kNN)
- **Frontend Trigger / View:** "Similar Cases" section in Case Workspace sidebar.
- **Backend Endpoint:** `GET /api/v1/cases/{case_id}/similar?top_k=3`
- **Response Schema:**
  - `case_id: string`
  - `similar_cases: List[Dict[str, Any]]` (contains `case_id`, `similarity_score`, `risk_score`, `scam_type`, `status`)
  - `attribution_disclaimer: string` ("Statistical similarity across historical embeddings; not causal proof of fraud.")
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** Displays cards with similarity percentage, scam type, status, and honest non-causal disclaimer copy ("Similar historical case — not causal proof of fraud").

---

### Action 9: FinSure Investigator Execution (Plan -> Examine -> Report)
- **Frontend Trigger / View:** "Run Investigation" button in Investigator Panel.
- **Backend Endpoint:** `POST /api/v1/cases/{case_id}/investigate`
- **Request Schema (JSON Body):**
  - `provider: string` (default `'template'`)
- **Response Schema:** `InvestigationRun`
  - `run_id: string`
  - `case_id: string`
  - `plan: List[str]`
  - `tool_calls: List[Dict[str, Any]]`
  - `findings: Dict[str, Any]`
  - `report_text: string`
  - `provider: string`
  - `model: string`
  - `validator_passed: boolean`
  - `groundedness_score: float` (0.0 to 1.0)
  - `unsupported_claims: List[str]`
  - `latency_ms: float`
  - `created_at: string`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Read-Only Sandbox Principle:** The Investigator is strictly assistive and executes whitelisted read-only tools. It can never modify risk score, change thresholds, block transactions, or mutate case status.
- **Expected UI Behavior:** Displays three distinct phases:
  1. **Plan:** Enumerates investigative inspection steps.
  2. **Examine:** Lists read tools executed with masked outputs.
  3. **Report:** Renders evidence-grounded narrative with clickable `[E1]`, `[E2]` citation badges that highlight corresponding evidence cards. Displays groundedness score and claim validation status.

---

### Action 10: Claim Validation API
- **Frontend Trigger / View:** Automatic on report render or custom claim testing.
- **Backend Endpoint:** `POST /api/v1/cases/{case_id}/claim-validation`
- **Request Schema (JSON Body):**
  - `claim_text: string`
  - `evidence_ids: List[str]`
- **Response Schema:** `ClaimValidationResult`
  - `valid: boolean`
  - `groundedness_score: float`
  - `supported_claims: List[str]`
  - `unsupported_claims: List[str]`
  - `rejection_reasons: List[str]`
  - `cited_evidence_verified: List[str]`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** If `valid === true`: displays green "Grounded & Verified" badge. If `valid === false`: displays prominent amber/red "Validation Failed — Narrative Requires Evidence Review" warning and lists specific rejection reasons.

---

### Action 11: Cryptographic Audit Trail Verification
- **Frontend Trigger / View:** "Verify Audit Chain" button in Sidebar.
- **Backend Endpoint:** `GET /api/v1/cases/{case_id}/audit/verify`
- **Response Schema:**
  - `verified: boolean`
  - `events_verified: number`
  - `error?: string`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** Displays green "Chain Verified (N blocks)" on success; displays high-priority warning banner "Audit Integrity Verification Failed" on mismatch.

---

### Action 12: Export Evidence Pack ZIP
- **Frontend Trigger / View:** "Export Evidence Pack" in PageHeader actions.
- **Backend Endpoint:** `GET /api/v1/cases/{case_id}/evidence-pack`
- **Response Schema:** Binary `application/zip` stream with header `Content-Disposition: attachment; filename=evidence_pack_{case_id}.zip`
- **Authorization:** `Bearer <JWT>` with roles `['fraud_analyst', 'analyst', 'compliance_officer', 'admin']`.
- **Expected UI Behavior:** Triggers native browser download of authentic court-ready ZIP bundle containing `manifest.json` (with SHA-256 hashes), `evidence_records.json`, and `audit_events.json`. Displays error notification if download fails.

---
