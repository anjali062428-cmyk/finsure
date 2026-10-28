"""
FinSure Health & Model Inspection Routes
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any
from backend.services.model_service import ModelRegistry
from backend.services.profile_service import ProfileService
from backend.api.dependencies.services import get_model_registry, get_profile_service

router = APIRouter(prefix="/api/v1", tags=["Health & Inspection"])


@router.get("/health")
def health_check(
    registry: ModelRegistry = Depends(get_model_registry),
    profile_service: ProfileService = Depends(get_profile_service)
) -> Dict[str, Any]:
    """
    Returns platform health, model loading status, and backing store connectivity.
    """
    return {
        "status": "healthy" if registry.is_loaded else "degraded",
        "service": "FinSure Real-Time Fraud Inference Service",
        "models_loaded": registry.is_loaded,
        "model_version": registry.model_version,
        "threshold_version": registry.threshold_version,
        "redis_connected": profile_service.is_redis_available,
        "backing_store": "Redis" if profile_service.is_redis_available else "In-Memory Resilient Fallback"
    }


@router.get("/models")
def inspect_models(
    registry: ModelRegistry = Depends(get_model_registry)
) -> Dict[str, Any]:
    """
    Returns operational metadata for all loaded models.
    """
    return {
        "model_version": registry.model_version,
        "threshold_version": registry.threshold_version,
        "models": {
            "xgboost": "XGBoost v3.4.1 (36 Tabular Features)",
            "sequence_model": "GRU + Attention Pooling (50 Steps x 12 Features)",
            "graph_sage": "2-Layer GraphSAGE (7,046 Cached Node Embeddings)",
            "autoencoder": "Deep Undercomplete Autoencoder (Bottleneck: 6 dims)",
            "scam_classifier": "6-Class Multi-Task Typology Head",
            "meta_learner": "Calibrated Ensemble Meta-Learner (Isotonic Regression)"
        },
        "feature_count": 36,
        "decision_bands": registry.decision_engine.risk_bands if registry.decision_engine else {}
    }
