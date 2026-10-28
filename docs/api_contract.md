# FinSure Real-Time Inference API Contract Specification

**API Version:** `v1.0.0`  
**Base Path:** `/api/v1`  
**Governing Standard:** IEEE 830 / FinSure SRS v2 / Master Prompt v2 Section 6 & 8  
**Protocol:** HTTPS / JSON REST  

---

## 1. Endpoints Overview

| Method | Endpoint | Description | Auth Required (Phase 5) |
|---|---|---|:---:|
| `GET` | `/api/v1/health` | Service health check, model readiness, backing store status. | No |
| `GET` | `/api/v1/models` | Active model architectures, versions, and feature metadata. | No |
| `POST` | `/api/v1/transactions/score` | Primary real-time risk scoring, decisioning, and explainability. | No |

---

## 2. Real-Time Transaction Scoring (`POST /api/v1/transactions/score`)

### 2.1 Request Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TransactionScoreRequest",
  "type": "object",
  "required": ["user_id", "payee_id", "amount", "device_id"],
  "properties": {
    "transaction_id": {
      "type": "string",
      "description": "Unique transaction reference. Auto-generated if omitted."
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 transaction initiation timestamp. Defaults to UTC now."
    },
    "user_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Payer user account ID."
    },
    "payee_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Payee / beneficiary VPA or account identifier."
    },
    "amount": {
      "type": "number",
      "exclusiveMinimum": 0.0,
      "maximum": 10000000.0,
      "description": "Transfer amount in INR (strictly positive, <= ₹10,000,000)."
    },
    "device_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Unique device fingerprint / hardware ID."
    },
    "channel": {
      "type": "string",
      "enum": ["upi", "card", "bank_transfer"],
      "default": "upi"
    },
    "city": {
      "type": "string",
      "default": "Mumbai",
      "description": "Transaction initiation city name for geographic anomaly checks."
    },
    "latitude": { "type": ["number", "null"] },
    "longitude": { "type": ["number", "null"] },
    "ip_address": { "type": ["string", "null"] },
    "note": { "type": ["string", "null"], "maxLength": 256 },
    "language": {
      "type": "string",
      "enum": ["en", "hi"],
      "default": "en",
      "description": "Language for customer explanation ('en' = English, 'hi' = Hindi)."
    }
  }
}
```

### 2.2 Response Schema (The Canonical Decision Contract)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CanonicalTransactionScoreResponse",
  "type": "object",
  "required": [
    "transaction_id",
    "risk_score",
    "risk_probability",
    "risk_band",
    "decision",
    "reason_codes",
    "customer_explanation",
    "analyst_explanation",
    "model_version",
    "threshold_version",
    "scored_at"
  ],
  "properties": {
    "transaction_id": { "type": "string" },
    "risk_score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "risk_probability": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
    "risk_band": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
    "decision": { "type": "string", "enum": ["approve", "step_up", "cooling_period", "block"] },
    "reason_codes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "customer_explanation": {
      "type": "object",
      "required": ["language", "status", "header", "message", "instruction"],
      "properties": {
        "language": { "type": "string" },
        "status": { "type": "string" },
        "header": { "type": "string" },
        "message": { "type": "string" },
        "instruction": { "type": "string" },
        "safety_highlights": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "summary": { "type": "string" }
            }
          }
        }
      }
    },
    "analyst_explanation": {
      "type": "object",
      "required": [
        "meta",
        "xgboost_shap",
        "temporal_sequence",
        "entity_graph",
        "unsupervised_autoencoder",
        "scam_typology"
      ]
    },
    "model_version": { "type": "string" },
    "threshold_version": { "type": "string" },
    "scored_at": { "type": "string", "format": "date-time" },
    "audit_record_id": { "type": "string" },
    "latency_ms": { "type": "number" }
  }
}
```

---

## 3. Standard HTTP Headers

| Header | Direction | Description | Example |
|---|---|---|---|
| `X-Request-ID` | Request / Response | Correlation ID for tracing across microservices. | `req_9a8f12c4b01e` |
| `X-Process-Time-Ms` | Response | Total API processing time at server middleware. | `48.215` |
| `X-Response-Time-Ms` | Response | Core model inference execution duration. | `45.892` |

---

## 4. Error Responses

FinSure guarantees **zero stack trace leakage** in error responses.

### 4.1 Schema Validation Failure (`422 Unprocessable Entity`)
```json
{
  "error": "ValidationError",
  "message": "The supplied transaction request failed schema validation.",
  "details": [
    {
      "type": "greater_than",
      "loc": ["body", "amount"],
      "msg": "Input should be greater than 0",
      "input": -500.0
    }
  ],
  "request_id": "req_9a8f12c4b01e"
}
```

### 4.2 Payload Too Large (`413 Payload Too Large`)
Triggered if request body exceeds 1 MB:
```json
{
  "error": "PayloadTooLarge",
  "message": "Request body exceeds maximum permissible size (1048576 bytes).",
  "request_id": "req_9a8f12c4b01e"
}
```

### 4.3 Rate Limit Exceeded (`429 Too Many Requests`)
Triggered if client IP exceeds 500 requests per second:
```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please throttle your traffic.",
  "request_id": "req_9a8f12c4b01e"
}
```

### 4.4 Model Service Unavailable (`503 Service Unavailable`)
Returned if required model artifacts are missing or fail-fast check triggers:
```json
{
  "error": "ModelServiceUnavailable",
  "message": "Inference engine is temporarily unavailable due to missing core model artifacts.",
  "request_id": "req_9a8f12c4b01e"
}
```
