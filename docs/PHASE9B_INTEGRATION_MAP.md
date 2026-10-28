# FinSure — Phase 9B Integration Map

**Document Version:** 1.0.0  
**Phase:** Phase 9B — Interactive Customer Portal + Real Transaction Risk Experience  
**Date:** 2026-09-29  

---

## 1. Overview

This document maps every customer-facing frontend screen to its authoritative backend API endpoint, request schema, response schema, authentication requirement, and customer role authorization rule.

---

## 2. Screen-to-API Mapping Matrix

| Frontend Screen | API Endpoint | HTTP Method | Request Schema | Response Schema | Auth Required | Customer Authorization Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Login (`/login`)** | `/api/v1/auth/login` | `POST` | `LoginPasswordRequest`<br>• `identifier`: str<br>• `password`: str<br>• `device_id`: Optional[str] | `AuthTokenResponse`<br>• `access_token`: str<br>• `refresh_token`: str<br>• `token_type`: "bearer"<br>• `expires_in`: int<br>• `user`: Dict | No | Public endpoint; returns tokens and role. |
| **Login OTP Request (`/login` tab / `/verify-otp`)** | `/api/v1/auth/otp/request` | `POST` | `RequestOTPRequest`<br>• `identifier`: str<br>• `channel`: "phone" \| "email" | `GenericActionResponse`<br>• `success`: bool<br>• `message`: str | No | Public endpoint; rate limited (60s cooldown). |
| **Login OTP Verify (`/verify-otp`)** | `/api/v1/auth/otp/verify` | `POST` | `LoginOTPRequest`<br>• `identifier`: str<br>• `otp`: str (6-digit)<br>• `device_id`: Optional[str] | `AuthTokenResponse`<br>• `access_token`: str<br>• `refresh_token`: str<br>• `user`: Dict | No | Public endpoint; validates 6-digit OTP, max 5 attempts. |
| **Register / Signup (`/signup`)** | `/api/v1/auth/register` | `POST` | `RegisterRequest`<br>• `full_name`: str<br>• `email`: str<br>• `phone`: str<br>• `password`: str<br>• `role`: Optional[str] = "customer" | `RegisterResponse`<br>• `user_id`: str<br>• `full_name`: str<br>• `email`: str<br>• `phone`: str<br>• `role`: str<br>• `account_status`: str<br>• `message`: str | No | Public endpoint; creates account with Argon2id hash. |
| **Verify Email (`/verify-otp` for email)** | `/api/v1/auth/verify-email` | `POST` | `VerifyEmailRequest`<br>• `email`: str<br>• `otp`: str (6-digit) | `GenericActionResponse`<br>• `success`: bool<br>• `message`: str | No | Public endpoint; activates email verification status. |
| **Verify Phone (`/verify-otp` for phone)** | `/api/v1/auth/verify-phone` | `POST` | `VerifyPhoneRequest`<br>• `phone`: str<br>• `otp`: str (6-digit) | `GenericActionResponse`<br>• `success`: bool<br>• `message`: str | No | Public endpoint; activates phone verification status. |
| **Forgot Password (`/forgot-password`)** | `/api/v1/auth/password-reset/request` | `POST` | `PasswordResetRequest`<br>• `identifier`: str<br>• `channel`: "email" \| "phone" | `GenericActionResponse`<br>• `success`: bool<br>• `message`: str | No | Public endpoint; anti-enumeration safe response. |
| **Reset Password (`/reset-password`)** | `/api/v1/auth/password-reset/confirm` | `POST` | `PasswordResetConfirmRequest`<br>• `identifier`: str<br>• `otp`: str (6-digit)<br>• `new_password`: str | `GenericActionResponse`<br>• `success`: bool<br>• `message`: str | No | Public endpoint; revokes all existing refresh sessions. |
| **Session Hydration (`AuthContext`)** | `/api/v1/auth/me` | `GET` | None | `UserProfileResponse`<br>• `user_id`: str<br>• `full_name`: str<br>• `email`: str<br>• `phone`: str<br>• `role`: str<br>• `email_verified`: bool<br>• `phone_verified`: bool<br>• `account_status`: str | Yes (`Bearer`) | Any authenticated user; strictly returns authenticated user's own profile. |
| **Session Refresh (`AuthContext`)** | `/api/v1/auth/refresh` | `POST` | `RefreshTokenRequest`<br>• `refresh_token`: str | `AuthTokenResponse`<br>• `access_token`: str<br>• `refresh_token`: str | No | Rotates refresh token; replay attack revokes all sessions. |
| **Logout (`Topbar` / `AuthContext`)** | `/api/v1/auth/logout` | `POST` | `LogoutRequest`<br>• `refresh_token`: str | `GenericActionResponse`<br>• `success`: bool<br>• `message`: str | No | Revokes the active refresh token in auth repo. |
| **Simulate Transaction (`/customer/transactions`)** | `/api/v1/transactions/score` | `POST` | `TransactionScoreRequest`<br>• `user_id`: str<br>• `payee_id`: str<br>• `amount`: float (&gt;0)<br>• `device_id`: str<br>• `channel`: "upi" \| "card" \| "bank_transfer"<br>• `city`: Optional[str]<br>• `language`: "en" \| "hi"<br>• `note`: Optional[str] | `CanonicalTransactionScoreResponse`<br>• `transaction_id`: str<br>• `risk_score`: int (0–100)<br>• `risk_probability`: float (0.0–1.0)<br>• `risk_band`: "low" \| "medium" \| "high" \| "critical"<br>• `decision`: "approve" \| "step_up" \| "cooling_period" \| "block"<br>• `customer_explanation`: Dict<br>• `scored_at`: str | Yes (Session User ID) | User can score simulated transactions under their authenticated `user_id`. |
| **Step-Up 2FA Challenge Request (`/customer/transactions`)** | `/api/v1/auth/step-up/request` | `POST` | `StepUpRequest`<br>• `transaction_id`: Optional[str]<br>• `channel`: "phone" \| "email" | `StepUpChallengeResponse`<br>• `challenge_id`: str<br>• `message`: str | Yes (`Bearer`) | Initiated automatically or on demand when `decision == "step_up"`. |
| **Step-Up 2FA Challenge Verify (`/customer/transactions`)** | `/api/v1/auth/step-up/verify` | `POST` | `StepUpVerifyRequest`<br>• `challenge_id`: str<br>• `otp`: str (6-digit) | `StepUpVerifyResponse`<br>• `success`: bool<br>• `message`: str<br>• `step_up_token`: Optional[str] | Yes (`Bearer`) | Customer enters 6-digit OTP to prove identity and authorize transaction. |
| **Dispute / "Not Me" (`/customer/transactions/:id`)** | `/api/v1/cases` | `POST` | `CaseCreateRequest`<br>• `transaction_id`: str<br>• `user_id`: str<br>• `risk_score`: float<br>• `priority`: "HIGH"<br>• `decision`: "flag"<br>• `customer_reported`: true | `Case`<br>• `case_id`: str<br>• `title`: str<br>• `status`: "new"<br>• `priority`: str<br>• `customer_reported`: true | Yes (`Bearer`) | Customer creates a customer-reported dispute docket for their own transaction. |
| **Customer Incidents / Disputes List (`/customer/reports`)** | `/api/v1/incidents` | `GET` | Query params: `status`, `limit`, `offset` | `List[IncidentResponse]` | Yes (`Bearer`) | Backend strictly filters `user_id == current_user.user_id` when role is `customer`. |
| **Customer Dispute Cases List (`/customer/reports`)** | `/api/v1/cases` | `GET` | Query params: `status`, `priority`, `limit` | `List[Case]` | Yes (`Bearer`) | Backend strictly filters `user_id == current_user.user_id` when role is `customer`. |
| **Customer Report Download (`/customer/reports`)** | `/api/v1/incidents/{incident_id}/report/customer` | `GET` | Path param: `incident_id` | PDF stream (`application/pdf`) with `X-Content-SHA256` | Yes (`Bearer`) | Backend strictly checks `incident.user_id == current_user.user_id`. |
| **Report Verification (`/customer/reports`)** | `/api/v1/incidents/{incident_id}/report/verify` | `POST` | `ReportVerifyRequest`<br>• `report_type`: "customer"<br>• `candidate_hash`: str | `Dict`<br>• `verified`: bool<br>• `message`: str | Yes (`Bearer`) | Validates cryptographic hash of downloaded report against ledger. |

---

## 3. Decision Matrix & Policy Actions

| Backend Decision | Policy Risk Band | Score Range | Calibrated Probability | UX Action & Customer-Safe Flow |
| :--- | :--- | :--- | :--- | :--- |
| **`approve`** | `low` | 0 – 39 | $P(\text{fraud}) &lt; 0.15$ | **Transaction Approved.** Instant simulated execution. Returns customer explanation and success receipt. |
| **`step_up`** | `medium` | 40 – 69 | $0.15 \le P(\text{fraud}) &lt; 0.70$ | **Additional Verification Required.** Automatic step-up 2FA flow via `POST /api/v1/auth/step-up/request` + OTP challenge modal via `POST /api/v1/auth/step-up/verify`. |
| **`cooling_period`** | `high` | 70 – 89 | $0.70 \le P(\text{fraud}) &lt; 0.90$ | **Temporary Security Hold.** Transaction held for user safety. Explains plain-language reasons (new device, time deviation, unusual amount). No bypass allowed. |
| **`block`** | `critical` | 90 – 100 | $P(\text{fraud}) \ge 0.90$ | **Transaction Blocked.** Immediate prevention of loss. Displays plain-language explanation and immediate "Dispute / Not Me" escalation trigger. |
