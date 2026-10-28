"""
FinSure XGBoost SHAP Explainer
Computes exact TreeExplainer SHAP values for tree-based fraud models.
Exposes signed positive/negative factor decomposition and plain-language feature names.
Reference: Master Prompt v2 Section 7.1 and FinSure SRS v2 Section 3.3.
"""

import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import pandas as pd
import xgboost as xgb
import shap

from ml.features.pipeline import FEATURE_COLUMNS

logger = logging.getLogger("finsure.shap_explainer")

DEFAULT_MODEL_PATH = os.path.join("ml", "artifacts", "xgboost_baseline.json")

FEATURE_DISPLAY_NAMES = {
    "amount": "Transaction Amount (INR)",
    "log_amount": "Log-Transformed Amount",
    "hour": "Hour of Day (0-23)",
    "dayofweek": "Day of Week",
    "is_weekend": "Weekend Transaction",
    "is_night": "Night Hours (11PM-6AM)",
    "channel_upi": "UPI Channel",
    "channel_card": "Debit/Credit Card Channel",
    "channel_bank_transfer": "NetBanking/Transfer Channel",
    "hist_user_txn_count": "Historical Transaction Count",
    "amt_to_user_mean": "Ratio to Historical Mean Amount",
    "amt_to_user_median": "Ratio to Historical Median Amount",
    "amt_user_zscore": "Amount Z-Score (Deviation from Profile)",
    "amt_to_user_max": "Ratio to Historical Max Amount",
    "time_since_prev_txn_sec": "Time Elapsed Since Previous Transaction",
    "log_time_since_prev_sec": "Log Elapsed Time Since Previous Transaction",
    "user_daily_limit_ratio": "Daily Spending Limit Utilization",
    "payee_familiarity_count": "Historical Transfers to Payee",
    "is_new_payee": "First-Time Unfamiliar Payee",
    "device_familiarity_count": "Historical Uses of Device",
    "is_new_device": "Unrecognized / New Device",
    "txn_count_1m": "1-Minute Velocity (Transaction Count)",
    "txn_count_1h": "1-Hour Velocity (Transaction Count)",
    "txn_count_24h": "24-Hour Velocity (Transaction Count)",
    "amt_sum_1m": "1-Minute Cumulative Spending",
    "amt_sum_1h": "1-Hour Cumulative Spending",
    "amt_sum_24h": "24-Hour Cumulative Spending",
    "distinct_payees_24h": "Distinct Beneficiaries in 24 Hours",
    "distinct_devices_24h": "Distinct Devices in 24 Hours",
    "is_out_of_home_city": "Transaction Outside Registered City",
    "dist_from_prev_txn_km": "Distance from Previous Location (km)",
    "implied_travel_speed_kmh": "Implied Travel Speed (km/h)",
    "impossible_travel": "Impossible Travel Velocity Flag (>800 km/h)",
    "is_new_device_and_night": "New Device used during Night Hours",
    "is_new_payee_and_large": "Large Transfer to First-Time Payee",
    "rapid_burst": "High-Frequency Burst Activity"
}


class XGBoostShapExplainer:
    """
    SHAP TreeExplainer wrapper for FinSure XGBoost baseline model.
    """
    def __init__(
        self,
        model_path: str = DEFAULT_MODEL_PATH,
        feature_names: Optional[List[str]] = None
    ):
        self.model_path = model_path
        self.feature_names = feature_names or list(FEATURE_COLUMNS)
        self.model = xgb.XGBClassifier()
        
        if os.path.exists(self.model_path):
            self.model.load_model(self.model_path)
            logger.info(f"Loaded XGBoost model for SHAP explanations from {self.model_path}")
            self.explainer = shap.TreeExplainer(self.model)
        else:
            logger.warning(f"XGBoost model file {self.model_path} not found. Explainer uninitialized.")
            self.explainer = None

    def explain_instance(
        self,
        x_raw: Union[np.ndarray, pd.Series, List[float]],
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Explains a single transaction row.
        Args:
            x_raw: 1D vector of raw tabular features (length 36).
            top_k: Number of top positive and negative factors to return.
        Returns:
            Dict containing base_value, shap_values, top_positive_factors, top_negative_factors.
        """
        if self.explainer is None:
            raise RuntimeError("TreeExplainer is not initialized because model artifact was not found.")

        if isinstance(x_raw, pd.Series):
            x_arr = x_raw.values.astype(np.float32)
        elif isinstance(x_raw, list):
            x_arr = np.asarray(x_raw, dtype=np.float32)
        else:
            x_arr = np.asarray(x_raw, dtype=np.float32)

        if x_arr.ndim == 1:
            x_2d = x_arr.reshape(1, -1)
        else:
            x_2d = x_arr

        # Compute SHAP values
        raw_shap = self.explainer.shap_values(x_2d)
        if isinstance(raw_shap, list):
            # Binary classification list [class 0, class 1]
            shap_vec = raw_shap[1][0]
        elif raw_shap.ndim == 2:
            shap_vec = raw_shap[0]
        elif raw_shap.ndim == 3:
            shap_vec = raw_shap[0, :, 1]
        else:
            shap_vec = raw_shap

        base_val = self.explainer.expected_value
        if isinstance(base_val, (list, np.ndarray)):
            base_val = float(base_val[-1])
        else:
            base_val = float(base_val)

        feature_shap_map = {}
        factors = []
        for i, feat in enumerate(self.feature_names):
            val = float(x_arr.flatten()[i])
            impact = float(shap_vec[i])
            display_name = FEATURE_DISPLAY_NAMES.get(feat, feat.replace("_", " ").title())
            feature_shap_map[feat] = round(impact, 4)
            factors.append({
                "feature": feat,
                "display_name": display_name,
                "value": round(val, 2),
                "shap_impact": round(impact, 4),
                "direction": "increases_risk" if impact > 0 else "decreases_risk"
            })

        # Top positive factors (factors pushing risk higher)
        pos_factors = [f for f in factors if f["shap_impact"] > 0]
        pos_factors.sort(key=lambda item: item["shap_impact"], reverse=True)
        top_positive = pos_factors[:top_k]

        # Top negative factors (factors pulling risk lower)
        neg_factors = [f for f in factors if f["shap_impact"] < 0]
        neg_factors.sort(key=lambda item: item["shap_impact"])  # most negative first
        top_negative = neg_factors[:top_k]

        # Compute exact model outputs for full mathematical traceability
        raw_margin = float(self.model.predict(x_2d, output_margin=True)[0])
        model_prob = float(self.model.predict_proba(x_2d)[0, 1])

        return {
            "raw_prediction_margin": round(raw_margin, 5),
            "model_probability": round(model_prob, 5),
            "base_value": round(base_val, 4),
            "shap_values": feature_shap_map,
            "top_positive_factors": top_positive,
            "top_negative_factors": top_negative
        }

    def explain_batch(self, X_raw: np.ndarray) -> np.ndarray:
        """Computes SHAP matrix for batch of transactions (N, 36)."""
        if self.explainer is None:
            raise RuntimeError("TreeExplainer is not initialized.")
        return self.explainer.shap_values(X_raw)
