# FinSure Role-Based Access Control (RBAC) Policy

## 1. Role Definitions
FinSure defines four discrete, non-overlapping roles structured around the principle of least privilege:

| Role Identifier | Title | Purpose & Responsibilities |
|:---|:---|:---|
| `customer` | FinSure Customer | End-user executing UPI payments. Can view own transaction history, manage profile, initiate step-up challenges, and file dispute feedback. |
| `fraud_analyst` / `analyst` | Fraud Investigation Analyst | First responder to fraud anomalies. Can inspect the live alert queue, analyze multi-modal explainability (SHAP, sequence attention, graph entity clusters, autoencoder anomaly scores), initiate investigations, and label cases as legit or fraud. |
| `compliance_officer` | Compliance & Risk Auditor | Regulatory compliance and governance officer. Can inspect append-only cryptographic audit logs, review model version provenance, audit threshold calibration curves, and generate regulatory filings. |
| `admin` | System Administrator | Platform operations engineer. Can manage system configurations, calibrate operating risk policy thresholds, run what-if simulation experiments, manage user roles, and retire/deploy champion models. |

---

## 2. Permissions & Endpoint Access Matrix

| Category | Endpoint / Resource | `customer` | `fraud_analyst` | `compliance_officer` | `admin` |
|:---|:---|:---:|:---:|:---:|:---:|
| **Authentication** | `POST /api/v1/auth/register` | Public | Public | Public | Public |
| | `POST /api/v1/auth/login` | Public | Public | Public | Public |
| | `POST /api/v1/auth/otp/*` | Public | Public | Public | Public |
| | `POST /api/v1/auth/refresh` | Public | Public | Public | Public |
| | `POST /api/v1/auth/logout` | Public | Public | Public | Public |
| | `GET /api/v1/auth/me` | Allowed | Allowed | Allowed | Allowed |
| | `POST /api/v1/auth/step-up/*` | Allowed | Allowed | Allowed | Allowed |
| **Transaction Scoring** | `POST /api/v1/transactions/score` | Allowed (Own) | Allowed | Prohibited | Allowed |
| | Customer Explanation View | Allowed | Allowed | Allowed | Allowed |
| | Internal Analyst Explanation (SHAP/Attention/Graph) | Prohibited | Allowed | Allowed | Allowed |
| **Alert & Case Queue** | `GET /api/v1/alerts` | Prohibited | Allowed | Allowed | Allowed |
| | `POST /api/v1/cases/transition` | Prohibited | Allowed | Prohibited | Allowed |
| | `GET /api/v1/cases/{id}/evidence` | Prohibited | Allowed | Allowed | Allowed |
| **Compliance & Audits**| `GET /api/v1/audit/logs` | Prohibited | Prohibited | Allowed | Allowed |
| | `GET /api/v1/audit/verify-chain` | Prohibited | Prohibited | Allowed | Allowed |
| | `GET /api/v1/compliance/reports` | Prohibited | Prohibited | Allowed | Allowed |
| **Platform Admin** | `PUT /api/v1/config/thresholds` | Prohibited | Prohibited | Prohibited | Allowed |
| | `POST /api/v1/simulator/what-if` | Prohibited | Prohibited | Prohibited | Allowed |
| | `POST /api/v1/admin/users/roles` | Prohibited | Prohibited | Prohibited | Allowed |

---

## 3. Server-Side Enforcement Architecture

RBAC is strictly enforced on the server for every incoming request using FastAPI dependency injection (`backend/api/dependencies/auth.py`):

```python
def require_role(allowed_roles: List[str]):
    normalized_roles = set(allowed_roles)
    # Seamless alias support between fraud_analyst and analyst
    if "fraud_analyst" in normalized_roles:
        normalized_roles.add("analyst")
    if "analyst" in normalized_roles:
        normalized_roles.add("fraud_analyst")

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {list(allowed_roles)}, current role: '{current_user.role}'."
            )
        return current_user

    return role_checker
```

### 3.1 HTTP Status Code Semantics
- **`401 Unauthorized`**:
  - Missing `Authorization` header.
  - Expired access token.
  - Invalid signature or malformed JWT.
  - Header: `WWW-Authenticate: Bearer`.
- **`403 Forbidden`**:
  - Authenticated user whose role does not meet the endpoint requirement.
  - Account status is `locked` (due to brute-force lockout) or `suspended`.
