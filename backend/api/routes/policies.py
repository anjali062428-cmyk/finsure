"""
FinSure Policy Governance API Endpoints
Provides inspection of operational risk bands, calibrated thresholds, and decision simulations.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.schemas.policy import (
    PolicyConfigResponse, PolicyRuleResponse, RiskBandResponse,
    CostParametersResponse, PolicySimulationRequest, PolicySimulationResponse
)
from backend.models.auth import User
from backend.services.model_service import ModelRegistry
from backend.api.dependencies.services import get_model_registry
from backend.api.dependencies.auth import require_role

router = APIRouter(prefix="/api/v1/policies", tags=["Policy Governance & Risk Bands"])


@router.get("", response_model=PolicyConfigResponse)
async def get_current_policies(
    current_user: User = Depends(require_role(["admin", "fraud_analyst", "analyst", "compliance_officer"])),
    registry: ModelRegistry = Depends(get_model_registry)
):
    """Retrieves current operational risk thresholds, risk bands, and cost parameters."""
    de = registry.decision_engine

    thresholds_map = {}
    for action_key, rule in de.decision_thresholds.items():
        thresholds_map[action_key] = PolicyRuleResponse(
            action=rule["action"],
            min_score=rule["min_score"],
            max_score=rule["max_score"],
            description=rule["description"]
        )

    bands_map = {}
    for band_key, band in de.risk_bands.items():
        bands_map[band_key] = RiskBandResponse(
            min_score=band["min_score"],
            max_score=band["max_score"],
            display_label=band["display_label"],
            badge_color=band["badge_color"]
        )

    cost_params = CostParametersResponse(
        avg_fraud_loss_inr=de.cost_parameters.get("avg_fraud_loss_inr", 32000.0),
        friction_cost_inr=de.cost_parameters.get("friction_cost_inr", 250.0)
    )

    return PolicyConfigResponse(
        version=de.policy_version,
        effective_date="2026-09-28T00:00:00Z",
        description="Operational risk score bands and deterministic decision thresholds derived from validation set cost curve.",
        frozen=True,
        thresholds=thresholds_map,
        bands=bands_map,
        cost_parameters=cost_params
    )


@router.post("/simulate", response_model=PolicySimulationResponse)
async def simulate_policy_decision(
    req: PolicySimulationRequest,
    current_user: User = Depends(require_role(["admin", "fraud_analyst", "analyst", "compliance_officer"])),
    registry: ModelRegistry = Depends(get_model_registry)
):
    """Simulates deterministic policy decision for an arbitrary candidate risk score."""
    de = registry.decision_engine
    score = int(round(req.risk_score))

    action_info = de.get_action(score)
    band_info = de.get_risk_band(score)

    action = action_info["action"]
    requires_challenge = action == "step_up"
    allows_instant = action == "approve"

    return PolicySimulationResponse(
        risk_score=score,
        action=action,
        risk_band=band_info["band"],
        description=action_info["description"],
        requires_challenge=requires_challenge,
        allows_instant_execution=allows_instant
    )

