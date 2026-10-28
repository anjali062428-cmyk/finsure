"""
FinSure FastAPI Dependency Injection Providers
Provides singleton instances of ModelRegistry, InferenceService, ProfileService.
"""

from fastapi import Request
from backend.services.model_service import ModelRegistry
from backend.services.feature_service import RealTimeFeatureService
from backend.services.profile_service import ProfileService
from backend.services.inference_service import InferenceService

_inference_service: InferenceService = None
_profile_service: ProfileService = None
_model_registry: ModelRegistry = None


def get_model_registry() -> ModelRegistry:
    global _model_registry
    if _model_registry is None:
        _model_registry = ModelRegistry.get_instance()
        if not _model_registry.is_loaded:
            _model_registry.load_all_artifacts()
    return _model_registry


def get_profile_service() -> ProfileService:
    global _profile_service
    if _profile_service is None:
        _profile_service = ProfileService()
    return _profile_service


def get_inference_service() -> InferenceService:
    global _inference_service
    if _inference_service is None:
        registry = get_model_registry()
        profile_svc = get_profile_service()
        feature_svc = RealTimeFeatureService()
        _inference_service = InferenceService(
            model_registry=registry,
            feature_service=feature_svc,
            profile_service=profile_svc
        )
    return _inference_service
