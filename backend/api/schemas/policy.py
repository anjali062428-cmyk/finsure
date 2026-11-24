"""
FinSure Policy Governance API Request/Response Schemas
Models for operational thresholds, calibrated decision policies, and simulation.
"""

from typing import Dict, Optional, Any
from pydantic import BaseModel, Field


class PolicyRuleResponse(BaseModel):
    action: str
    min_score: int
    max_score: int
    description: str


class RiskBandResponse(BaseModel):
    min_score: int
    max_score: int
    display_label: str
    badge_color: str


class CostParametersResponse(BaseModel):
    avg_fraud_loss_inr: float
    friction_cost_inr: float


class PolicyConfigResponse(BaseModel):
    version: str
    effective_date: str
    description: str
    frozen: bool
    thresholds: Dict[str, PolicyRuleResponse]
    bands: Dict[str, RiskBandResponse]
    cost_parameters: CostParametersResponse


class PolicySimulationRequest(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score to simulate (0 - 100)")


class PolicySimulationResponse(BaseModel):
    risk_score: int
    action: str
    risk_band: str
    description: str
    requires_challenge: bool
    allows_instant_execution: bool

