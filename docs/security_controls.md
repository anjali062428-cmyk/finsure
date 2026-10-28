# FinSure Authentication & API Security Controls

## 1. Threat Model & Mitigation Matrix

FinSure implements multi-layered defensive controls adhering to OWASP Top 10 API Security Risks:

| Threat / Attack Vector | FinSure Mitigation Mechanism | Implementation File |
|:---|:---|:---|
| **Brute-Force / Password Guessing** | 5 consecutive failed login attempts locks account for 15 minutes. 5 consecutive failed OTP attempts permanently invalidates the OTP. | `backend/services/auth_service.py`<br>`backend/repositories/auth_repo.py` |
| **Side-Channel Timing Attacks** | When an unknown identifier is submitted for login, a dummy Argon2id hash verification is executed to equalize response latency and prevent timing attacks. | `backend/services/auth_service.py` |
| **User & Account Enumeration** | Generic error messages across all entrypoints. Login always returns `"Invalid credentials. Please verify your email/phone and password."` Password reset and OTP requests return identical generic messages whether the account exists or not. | `backend/services/auth_service.py`<br>`backend/api/routes/auth.py` |
| **Credential Stuffing / Password Reuse** | Argon2id high-memory parameters ($m=64\text{ MB}$, $t=2$, $p=4$) render mass offline cracking computationally infeasible. Password validation blocks top breached passwords. | `backend/services/crypto_service.py` |
| **Session Hijacking & Token Replay** | Refresh token rotation: each refresh consumes and revokes the old refresh token. If a revoked token is re-submitted, the system flags a replay attack and terminates **all** active sessions for the user. | `backend/services/token_service.py` |
| **Sensitive Data Exposure in Logs** | Zero plaintext passwords, raw OTPs, or auth tokens are written to logs. Recipient identifiers are automatically masked (e.g. `cl***@example.com`, `***3290`). | `backend/services/otp_service.py` |
| **OTP Interception & Tampering** | 6-digit cryptographic OTPs generated via CSPRNG (`secrets`). Stored at rest as $\text{SHA-256}(\text{salt} \parallel \text{otp})$. Expire strictly in 5 minutes; single-use only. | `backend/services/otp_service.py`<br>`backend/services/crypto_service.py` |
| **Denial of Service / Resource Exhaustion** | 1 MB payload size ceiling, in-memory sliding-window token-bucket rate limiter, and 60-second cooldown on OTP dispatch. | `backend/main.py`<br>`backend/services/otp_service.py` |
| **Clock Skew & Offset Bugs** | All datetime generation and comparison operations strictly enforce timezone-aware UTC (`timezone.utc`). | Throughout all auth modules |

---

## 2. Rate Limiting & Cooldown Specification

1. **OTP Resend Cooldown**:
   - Limit: 1 OTP request per identifier + purpose per 60 seconds.
   - Response: `HTTP 429 Too Many Requests` with `"Please wait X seconds before requesting a new OTP."`
2. **Account Lockout Policy**:
   - Limit: 5 failed password attempts.
   - Action: Account status set to `locked` with `locked_until = now + 15 minutes`.
   - Response: `HTTP 403 Forbidden` with `"Account is temporarily locked due to multiple failed login attempts. Please try again in X minutes."`
3. **OTP Verification Policy**:
   - Limit: 5 attempts per OTP code.
   - Action: OTP invalidated on 5th failure.
   - Response: `HTTP 400 Bad Request` with `"Maximum verification attempts exceeded. Please request a new code."`

---

## 3. Cryptographic Audit Trail

Every authentication event is recorded in the append-only `auth_audit_logs` table:
- `event_id`: Unique cryptographic identifier (`aud_<hex16>`).
- `actor_id`: User ID (or null for unauthenticated attempts).
- `event_type`: Categorical action (`register`, `login_password`, `verify_email`, `verify_phone`, `account_lockout`, `token_refresh`, `logout`, `password_reset_request`, `password_reset_confirm`, `step_up_challenge_initiated`, `step_up_verify`).
- `status`: `success` or `failure`.
- `reason_category`: Standardized category (e.g. `invalid_password`, `locked`, `max_failures_exceeded`, `duplicate_email`, `weak_password`).
- `ip_address`: Client IP extracted from request.
- `request_id`: Correlation ID (`X-Request-ID`).
- `timestamp`: UTC ISO 8601 string.
