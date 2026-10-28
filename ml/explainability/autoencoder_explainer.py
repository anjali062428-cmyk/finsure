"""
FinSure Deep Autoencoder Anomaly Explainer
Evaluates reconstruction errors against the certified frozen zero-day threshold (0.3418).
Identifies features with highest deviation from the learned manifold of legitimate transactions.
Reference: Master Prompt v2 Section 7.4 and FinSure SRS v2 Section 3.3.
"""

import os
import logging
from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import torch
import joblib

from ml.models.autoencoder import FinSureAutoencoder
from ml.features.pipeline import FEATURE_COLUMNS
from ml.explainability.shap_explainer import FEATURE_DISPLAY_NAMES

logger = logging.getLogger("finsure.autoencoder_explainer")

DEFAULT_MODEL_PATH = os.path.join("ml", "artifacts", "autoencoder.pt")
DEFAULT_SCALER_PATH = os.path.join("ml", "artifacts", "feature_scaler.joblib")
FROZEN_ZERO_DAY_THRESHOLD = 0.3418  # Certified Phase 3 validation operating point


class AutoencoderAnomalyExplainer:
    """
    Explains unsupervised reconstruction anomalies and pinpoints outlier dimensions.
    """
    def __init__(
        self,
        model_path: str = DEFAULT_MODEL_PATH,
        scaler_path: str = DEFAULT_SCALER_PATH,
        anomaly_threshold: float = FROZEN_ZERO_DAY_THRESHOLD,
        feature_names: Optional[List[str]] = None
    ):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.anomaly_threshold = anomaly_threshold
        self.feature_names = feature_names or list(FEATURE_COLUMNS)
        self.model = FinSureAutoencoder(input_dim=len(self.feature_names))
        self.scaler = None
        self.is_loaded = False

        if os.path.exists(self.model_path):
            state_dict = torch.load(self.model_path, map_location="cpu")
            self.model.load_state_dict(state_dict)
            self.model.eval()
            self.is_loaded = True
            logger.info(f"Loaded Autoencoder from {self.model_path}")
        else:
            logger.warning(f"Autoencoder artifact {self.model_path} not found.")

        if os.path.exists(self.scaler_path):
            try:
                self.scaler = joblib.load(self.scaler_path)
                logger.info(f"Loaded Feature Scaler from {self.scaler_path}")
            except Exception as e:
                logger.warning(f"Failed to load scaler from {self.scaler_path}: {e}")

    def explain_anomaly(
        self,
        features: Union[np.ndarray, List[float]],
        is_already_scaled: bool = False,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Analyzes reconstruction error on an instance and identifies anomalous feature components.
        Args:
            features: 1D feature array (length 36).
            is_already_scaled: Set to True if features are already z-score normalized.
            top_k: Number of most anomalous features to report.
        Returns:
            Dict containing reconstruction MSE, normalized anomaly score, zero-day flag,
            per-feature squared errors, top anomalous feature dimensions, and narrative.
        """
        if not self.is_loaded:
            raise RuntimeError(f"Autoencoder model not loaded from {self.model_path}")

        feat_arr = np.asarray(features, dtype=np.float32).flatten()
        if not is_already_scaled:
            if self.scaler is None:
                raise RuntimeError("Features require scaling but scaler is not loaded.")
            import pandas as pd
            df_feat = pd.DataFrame([feat_arr], columns=self.feature_names)
            scaled_feat = self.scaler.transform(df_feat)[0]
        else:
            scaled_feat = feat_arr

        feat_tensor = torch.tensor(scaled_feat, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            rec_tensor, _ = self.model(feat_tensor)
            rec_feat = rec_tensor.cpu().numpy()[0]

        # Squared error per feature dimension
        sq_errors = (scaled_feat - rec_feat) ** 2
        total_mse = float(np.mean(sq_errors))

        # Normalized anomaly score from model
        norm_score = float(self.model.get_anomaly_score(scaled_feat.reshape(1, -1))[0])

        is_zero_day = total_mse > self.anomaly_threshold

        feature_error_list = []
        for i, feat in enumerate(self.feature_names):
            err = float(sq_errors[i])
            display_name = FEATURE_DISPLAY_NAMES.get(feat, feat.replace("_", " ").title())
            feature_error_list.append({
                "feature": feat,
                "display_name": display_name,
                "squared_error": round(err, 4),
                "original_scaled_val": round(float(scaled_feat[i]), 3),
                "reconstructed_val": round(float(rec_feat[i]), 3)
            })

        # Rank features by reconstruction error
        feature_error_list.sort(key=lambda item: item["squared_error"], reverse=True)
        top_anomalous = feature_error_list[:top_k]

        if is_zero_day:
            top_feat_names = [f["display_name"] for f in top_anomalous[:3]]
            narrative = (
                f"Zero-Day Anomaly Detected: Reconstruction MSE ({round(total_mse, 4)}) exceeds the frozen "
                f"validation baseline threshold ({self.anomaly_threshold}). The transaction deviates significantly "
                f"from the learned manifold of legitimate banking behavior, primarily driven by: {', '.join(top_feat_names)}."
            )
        else:
            narrative = (
                f"Reconstruction MSE ({round(total_mse, 4)}) is within normal operational bounds "
                f"(<= {self.anomaly_threshold}). Tabular feature correlations conform to typical legitimate patterns."
            )

        return {
            "reconstruction_mse": round(total_mse, 4),
            "normalized_anomaly_score": round(norm_score, 4),
            "frozen_threshold": round(self.anomaly_threshold, 4),
            "is_zero_day_anomaly": is_zero_day,
            "top_anomalous_features": top_anomalous,
            "narrative": narrative
        }
