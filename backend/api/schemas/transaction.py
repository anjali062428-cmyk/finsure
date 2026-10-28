"""
FinSure Pydantic Request & Response Schemas for Transaction Scoring API
Enforces strict type validation, constraints, and the Canonical Decision Contract.
"""

from typing import Dict, List, Optional, Any, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class TransactionScoreRequest(BaseModel):
    transaction_id: Optional[str] = Field(
        default=None,
        description="Unique transaction reference ID. Auto-generated if not provided."
    )
    timestamp: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 transaction initiation timestamp."
    )
    user_id: str = Field(..., min_length=1, max_length=100, description="Payer user account identifier.")
    payee_id: str = Field(..., min_length=1, max_length=100, description="Payee / beneficiary VPA or account identifier.")
    amount: float = Field(..., gt=0.0, description="Monetary transfer value in INR.")
    device_id: str = Field(..., min_length=1, max_length=100, description="Device fingerprint identifier.")
    channel: Literal["upi", "card", "bank_transfer"] = Field(
        default="upi",
        description="Payment channel: upi, card, or bank_transfer."
    )
    city: Optional[str] = Field(default="Mumbai", description="Transaction initiation city.")
    latitude: Optional[float] = Field(default=None, description="Optional GPS latitude.")
    longitude: Optional[float] = Field(default=None, description="Optional GPS longitude.")
    ip_address: Optional[str] = Field(default=None, description="Client IP address.")
    note: Optional[str] = Field(default=None, max_length=256, description="Optional transaction narrative / remarks.")
    language: Optional[str] = Field(default="en", description="Language preference for customer explanation: 'en' or 'hi'.")

    @field_validator("amount")
    @classmethod
    def validate_amount_bounds(cls, v: float) -> float:
        if v <= 0.0:
            raise ValueError("Transaction amount must be strictly positive.")
        if v > 10_000_000.0:
            raise ValueError("Amount exceeds maximum single-transaction ceiling (₹10,000,000).")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "transaction_id": "TXN_LIVE_982341",
                "timestamp": "2026-09-28T14:30:00Z",
                "user_id": "USR_000319",
                "payee_id": "reyanshkulkarni53@okhdfcbank",
                "amount": 4500.0,
                "device_id": "DEV_USR_000319_1",
                "channel": "upi",
                "city": "Mumbai",
                "language": "en"
            }
        }
    }


class CustomerExplanationPayload(BaseModel):
    language: str
    status: str
    header: str
    message: str
    instruction: str
    safety_highlights: List[Dict[str, str]] = Field(default_factory=list)


class CanonicalTransactionScoreResponse(BaseModel):
    transaction_id: str
    risk_score: int = Field(..., ge=0, le=100, description="Unified integer risk score in [0, 100].")
    risk_probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated ensemble fraud probability.")
    risk_band: Literal["low", "medium", "high", "critical"]
    decision: Literal["approve", "step_up", "cooling_period", "block"]
    reason_codes: List[str] = Field(default_factory=list, description="Prioritized list of triggered canonical reason codes.")
    customer_explanation: Dict[str, Any] = Field(default_factory=dict, description="Calm, non-technical customer message.")
    analyst_explanation: Dict[str, Any] = Field(default_factory=dict, description="Deep technical breakdown for investigators.")
    model_version: str = Field(default="ensemble_v1.0.0", description="Ensemble Brain model architecture version.")
    threshold_version: str = Field(default="v1.0.0", description="Operational risk threshold policy version.")
    scored_at: str = Field(..., description="ISO 8601 scoring timestamp.")
    audit_record_id: Optional[str] = Field(default=None, description="Cryptographic audit ledger record ID.")
    latency_ms: Optional[float] = Field(default=None, description="Total scoring latency in milliseconds.")
