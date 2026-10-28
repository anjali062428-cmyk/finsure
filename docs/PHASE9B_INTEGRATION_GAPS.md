# FinSure — Phase 9B Integration Gaps Analysis

**Document Version:** 1.0.0  
**Phase:** Phase 9B — Interactive Customer Portal + Real Transaction Risk Experience  
**Date:** 2026-09-29  

---

## 1. Summary of Identified Backend Gaps

In accordance with FinSure Phase 9B rules:
> "If a dedicated transaction-history API does not exist: Do NOT invent one. Instead: Document the backend gap in `docs/PHASE9B_INTEGRATION_GAPS.md`. Do not create fake persistent transaction history."  
> "If trusted-payee APIs exist: connect them. If they do not exist: create the frontend UI architecture but do not fake persistence. Clearly document the gap. Do NOT invent a backend endpoint."

This document records the exact backend gaps identified during Phase 9B inspection and the compliant frontend architectural handling for each.

---

## 2. Detailed Gap Analysis

### Gap 1: Dedicated Queryable Transaction History API (`GET /api/v1/transactions`)
- **Backend Current State:**
  The backend exposes `POST /api/v1/transactions/score` for real-time inference, feature generation, ensemble evaluation, and decisioning. However, it does not provide a relational `transactions` table query endpoint (`GET /api/v1/transactions` or `GET /api/v1/transactions/{id}`).
- **Compliant Frontend Handling:**
  1. The transaction simulation interface (`/customer/transactions`) submits transactions directly to the real `POST /api/v1/transactions/score` endpoint.
  2. Scored transactions with their authoritative backend risk scores, probabilities, decisions, and customer-safe explanations are stored in a dedicated in-session transaction repository (`sessionStorage`).
  3. When a transaction is escalated via "Not Me", it creates a real persistent record on the backend via `POST /api/v1/cases` (`customer_reported=True`), which can subsequently be retrieved and displayed via `GET /api/v1/cases`.
  4. The frontend UI explicitly displays a notice indicating that the session transaction list reflects real-time simulated transactions evaluated by the FinSure Risk Engine during the active session.

---

### Gap 2: Persistent Trusted Payee CRUD API (`GET /api/v1/payees`, `POST /api/v1/payees`)
- **Backend Current State:**
  The Phase 2/5 feature engineering service (`backend/services/feature_service.py`) calculates payee familiarity features (`payee_familiarity_count`, `is_new_payee`) using synthetic historical transaction records and profile cache. However, there is no dedicated user-facing REST API for managing a customer-managed payee whitelist.
- **Compliant Frontend Handling:**
  1. The trusted payee page (`/customer/payees`) presents the customer whitelist UI architecture with realistic default beneficiary profiles.
  2. Adding or removing trusted payees operates on local state within the customer portal session.
  3. The page prominently displays an architectural disclosure: *"Payee familiarity features are evaluated by the FinSure Risk Engine. Dynamic customer whitelist persistence will be linked to Core Banking APIs in Phase 10."*
  4. The frontend does **not** fake backend persistence or mock fictitious REST endpoints.

---

### Gap 3: Authentication Route Naming Realignment
- **Discrepancy in Phase 9A vs Backend:**
  During Phase 9A, `frontend/src/api/auth.ts` had assumed endpoints `/auth/signup` and `/auth/login-otp/request`.
- **Actual Phase 6 Backend Endpoints:**
  - Registration: `POST /api/v1/auth/register` (takes `RegisterRequest`: `full_name`, `email`, `phone`, `password`, `role`)
  - OTP Request: `POST /api/v1/auth/otp/request` (takes `RequestOTPRequest`: `identifier`, `channel`, `purpose`)
  - OTP Verify: `POST /api/v1/auth/otp/verify` (takes `LoginOTPRequest`: `identifier`, `otp`, `device_id`)
  - Email Verify: `POST /api/v1/auth/verify-email` (takes `VerifyEmailRequest`: `email`, `otp`)
  - Phone Verify: `POST /api/v1/auth/verify-phone` (takes `VerifyPhoneRequest`: `phone`, `otp`)
  - Step-Up Request: `POST /api/v1/auth/step-up/request` (takes `StepUpRequest`: `transaction_id`, `channel`)
  - Step-Up Verify: `POST /api/v1/auth/step-up/verify` (takes `StepUpVerifyRequest`: `challenge_id`, `otp`)
- **Resolution:**
  Realigned all frontend API clients to the exact backend endpoint signatures and Pydantic schemas.
