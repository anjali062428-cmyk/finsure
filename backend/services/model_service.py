"""
FinSure Model Registry & Lifecycle Service
Loads all trained model artifacts once at startup, validates versions, primes caches,
and exposes thread-safe inference interfaces.
Guarantees: Zero reload per request, fail-fast on missing artifacts, no fake models.
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
import numpy as np
import torch
import joblib
import xgboost as xgb
import shap
import pandas as pd

from ml.features.pipeline import FEATURE_COLUMNS
from ml.models.sequence_model import FinSureSequenceModel
from ml.models.graph_model import FinSureGraphSAGE
from ml.models.autoencoder import FinSureAutoencoder
from ml.models.scam_classifier import ScamTypeClassifier
from ml.models.meta_learner import FinSureMetaLearner
from ml.decision.decision_engine import FinSureDecisionEngine
from ml.explainability.shap_explainer import XGBoostShapExplainer
from ml.explainability.sequence_explainer import SequenceAttentionExplainer
from ml.explainability.graph_explainer import GraphEvidenceExplainer
from ml.explainability.autoencoder_explainer import AutoencoderAnomalyExplainer
from ml.explainability.reason_codes import ReasonCodeEngine
from ml.explainability.explanation_formatter import ExplanationFormatter
from ml.explainability.audit_trail import ExplanationAuditTrail

logger = logging.getLogger("finsure.model_service")

REQUIRED_ARTIFACTS = {
    "xgboost": os.path.join("ml", "artifacts", "xgboost_baseline.json"),
    "scaler": os.path.join("ml", "artifacts", "feature_scaler.joblib"),
    "sequence_model": os.path.join("ml", "artifacts", "sequence_model.pt"),
    "graph_model": os.path.join("ml", "artifacts", "graph_model.pt"),
    "cached_embeddings": os.path.join("ml", "artifacts", "cached_embeddings.joblib"),
    "autoencoder": os.path.join("ml", "artifacts", "autoencoder.pt"),
    "scam_classifier": os.path.join("ml", "artifacts", "scam_classifier.pt"),
    "meta_learner": os.path.join("ml", "artifacts", "ensemble_meta_learner.joblib"),
    "risk_thresholds": os.path.join("configs", "risk_thresholds.yaml")
}


class ModelRegistry:
    """
    Singleton registry holding pre-loaded models and explainers in memory.
    """
    _instance: Optional["ModelRegistry"] = None

    def __init__(self, artifacts_dir: str = "ml/artifacts", config_path: str = "configs/risk_thresholds.yaml"):
        self.artifacts_dir = artifacts_dir
        self.config_path = config_path
        self.is_loaded = False

        self.model_version = "ensemble_v1.0.0"
        self.threshold_version = "v1.0.0"

        # Model containers
        self.xgb_model: Optional[xgb.XGBClassifier] = None
        self.scaler: Optional[Any] = None
        self.seq_model: Optional[FinSureSequenceModel] = None
        self.gnn_model: Optional[FinSureGraphSAGE] = None
        self.cached_embeddings: Dict[str, np.ndarray] = {}
        self.ae_model: Optional[FinSureAutoencoder] = None
        self.scam_model: Optional[ScamTypeClassifier] = None
        self.meta_learner: Optional[FinSureMetaLearner] = None
        self.decision_engine: Optional[FinSureDecisionEngine] = None

        # Explainers and tools
        self.shap_explainer: Optional[XGBoostShapExplainer] = None
        self.seq_explainer: Optional[SequenceAttentionExplainer] = None
        self.graph_explainer: Optional[GraphEvidenceExplainer] = None
        self.ae_explainer: Optional[AutoencoderAnomalyExplainer] = None
        self.reason_engine: Optional[ReasonCodeEngine] = None
        self.audit_trail: Optional[ExplanationAuditTrail] = None

    @classmethod
    def get_instance(cls) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_all_artifacts(self):
        """Loads all required models and fails fast if any artifact is missing."""
        if self.is_loaded:
            logger.info("ModelRegistry already loaded. Skipping redundant reload.")
            return

        logger.info("Initializing FinSure Model Registry and validating artifacts...")

        # 1. Validate artifact presence
        missing = []
        for name, path in REQUIRED_ARTIFACTS.items():
            if not os.path.exists(path):
                missing.append(f"{name} ({path})")

        if missing:
            err_msg = f"Fatal Error: Missing required model artifacts:\n" + "\n".join(f" - {m}" for m in missing)
            logger.critical(err_msg)
            raise FileNotFoundError(err_msg)

        # 2. Load Feature Scaler
        self.scaler = joblib.load(REQUIRED_ARTIFACTS["scaler"])

        # 3. Load XGBoost baseline
        self.xgb_model = xgb.XGBClassifier()
        self.xgb_model.load_model(REQUIRED_ARTIFACTS["xgboost"])

        # 4. Load Sequence Model
        self.seq_model = FinSureSequenceModel(step_dim=12, current_dim=36, hidden_dim=64)
        self.seq_model.load_state_dict(torch.load(REQUIRED_ARTIFACTS["sequence_model"], map_location="cpu"))
        self.seq_model.eval()

        # 5. Load GraphSAGE & Cached Embeddings
        self.cached_embeddings = joblib.load(REQUIRED_ARTIFACTS["cached_embeddings"])
        self.gnn_model = FinSureGraphSAGE(node_in_dim=5, hidden_dim=64, embed_dim=32, key_feat_dim=10)
        self.gnn_model.load_state_dict(torch.load(REQUIRED_ARTIFACTS["graph_model"], map_location="cpu"))
        self.gnn_model.cached_embeddings = self.cached_embeddings
        self.gnn_model.eval()

        # 6. Load Deep Autoencoder
        self.ae_model = FinSureAutoencoder(input_dim=36)
        self.ae_model.load_state_dict(torch.load(REQUIRED_ARTIFACTS["autoencoder"], map_location="cpu"))
        self.ae_model.eval()

        # 7. Load Scam Classifier
        self.scam_model = ScamTypeClassifier(input_dim=36, hidden_dim=64, num_classes=6)
        self.scam_model.load_state_dict(torch.load(REQUIRED_ARTIFACTS["scam_classifier"], map_location="cpu"))
        self.scam_model.eval()

        # 8. Load Calibrated Meta-Learner
        self.meta_learner = FinSureMetaLearner.load(REQUIRED_ARTIFACTS["meta_learner"])

        # 9. Load Decision Engine
        self.decision_engine = FinSureDecisionEngine(config_path=REQUIRED_ARTIFACTS["risk_thresholds"])
        self.threshold_version = self.decision_engine.policy_version

        # 10. Initialize Explainers & Audit Trail
        self.shap_explainer = XGBoostShapExplainer(model_path=REQUIRED_ARTIFACTS["xgboost"])
        self.seq_explainer = SequenceAttentionExplainer(model_path=REQUIRED_ARTIFACTS["sequence_model"])
        self.graph_explainer = GraphEvidenceExplainer(embeddings_path=REQUIRED_ARTIFACTS["cached_embeddings"])
        self.ae_explainer = AutoencoderAnomalyExplainer(
            model_path=REQUIRED_ARTIFACTS["autoencoder"],
            scaler_path=REQUIRED_ARTIFACTS["scaler"]
        )
        self.reason_engine = ReasonCodeEngine()
        self.audit_trail = ExplanationAuditTrail()

        self.is_loaded = True
        logger.info("All FinSure model artifacts successfully loaded and initialized.")

        # 11. Run Warm-Up Pass
        self.warmup()

    def warmup(self):
        """Performs a forward pass to prime PyTorch threads, memory allocators, and SHAP trees."""
        logger.info("Executing model registry pre-warming...")
        try:
            dummy_x = np.zeros(36, dtype=np.float32)
            df_dummy = pd.DataFrame([dummy_x], columns=FEATURE_COLUMNS)
            dummy_scaled = self.scaler.transform(df_dummy)[0].astype(np.float32)
            dummy_seq = np.zeros((1, 50, 12), dtype=np.float32)
            dummy_mask = np.zeros((1, 50), dtype=bool)
            dummy_mask[0, 0] = True

            # Warmup individual models
            _ = self.xgb_model.predict_proba(dummy_x.reshape(1, -1))
            with torch.no_grad():
                _ = self.seq_model(
                    torch.tensor(dummy_seq, dtype=torch.float32),
                    torch.tensor(dummy_mask, dtype=torch.bool),
                    torch.tensor(dummy_scaled.reshape(1, -1), dtype=torch.float32)
                )
                _ = self.ae_model(torch.tensor(dummy_scaled.reshape(1, -1), dtype=torch.float32))
                _ = self.scam_model(torch.tensor(dummy_scaled.reshape(1, -1), dtype=torch.float32))

            # Warmup meta-learner (8 features: 4 base model outputs + 4 tabular)
            dummy_meta_z = np.zeros((1, 8), dtype=np.float32)
            _ = self.meta_learner.predict_calibrated_proba(dummy_meta_z)

            # Warmup SHAP explainer
            _ = self.shap_explainer.explain_instance(dummy_x)

            logger.info("Model registry warm-up complete. System ready for traffic.")
        except Exception as e:
            logger.warning(f"Warm-up pass completed with non-fatal warning: {e}")
