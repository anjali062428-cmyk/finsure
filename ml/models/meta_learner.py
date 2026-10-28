"""
FinSure Calibrated Meta-Learner (Ensemble Brain)
Fuses predictions from base models:
[XGBoost, Sequence Transformer, GraphSAGE, Autoencoder Anomaly Score] + key risk signals.
Trained on Out-of-Fold (OOF) predictions to guarantee zero data leakage.
Applies Isotonic Regression / Platt scaling calibration to produce true risk probabilities [0, 1]
and the unified 0-100 FinSure risk score.
"""

import os
import joblib
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss
from sklearn.calibration import calibration_curve
import xgboost as xgb


class FinSureMetaLearner:
    """
    Ensemble Meta-Learner combining base model outputs into a calibrated fraud probability.
    """
    def __init__(
        self,
        base_learner_type: str = "xgboost",
        calibration_method: str = "isotonic",
        random_state: int = 42
    ):
        self.base_learner_type = base_learner_type
        self.calibration_method = calibration_method
        self.random_state = random_state

        if base_learner_type == "xgboost":
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                scale_pos_weight=3.0,
                random_state=random_state,
                eval_metric="logloss"
            )
        else:
            self.model = LogisticRegression(
                C=1.0,
                class_weight="balanced",
                max_iter=1000,
                random_state=random_state
            )

        if calibration_method == "isotonic":
            self.calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        else:  # platt / sigmoid
            self.calibrator = LogisticRegression(C=1.0, max_iter=500, random_state=random_state)

        self.is_fitted: bool = False
        self.feature_names: List[str] = []

    def fit(
        self,
        Z_train_oof: np.ndarray,
        y_train: np.ndarray,
        Z_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Trains meta-learner on out-of-fold predictions and fits calibrator on validation predictions.
        """
        self.feature_names = feature_names or [f"meta_feat_{i}" for i in range(Z_train_oof.shape[1])]
        
        # 1. Train meta-learner on OOF predictions
        self.model.fit(Z_train_oof, y_train)

        # 2. Predict on validation set
        if hasattr(self.model, "predict_proba"):
            val_raw_probs = self.model.predict_proba(Z_val)[:, 1]
        else:
            val_raw_probs = self.model.decision_function(Z_val)

        # 3. Fit calibrator on validation predictions
        if self.calibration_method == "isotonic":
            self.calibrator.fit(val_raw_probs, y_val)
        else:
            self.calibrator.fit(val_raw_probs.reshape(-1, 1), y_val)

        self.is_fitted = True

        # Validation calibration diagnostics
        calibrated_val_probs = self.predict_calibrated_proba(Z_val)
        raw_brier = float(brier_score_loss(y_val, val_raw_probs))
        cal_brier = float(brier_score_loss(y_val, calibrated_val_probs))

        return {
            "raw_validation_brier": round(raw_brier, 5),
            "calibrated_validation_brier": round(cal_brier, 5),
            "brier_improvement_pct": round((raw_brier - cal_brier) / max(1e-6, raw_brier) * 100, 2),
            "calibrator_type": self.calibration_method
        }

    def predict_raw_proba(self, Z: np.ndarray) -> np.ndarray:
        """Returns uncalibrated probability from base meta-learner."""
        if not self.is_fitted:
            raise ValueError("Meta-learner is not fitted yet.")
        if hasattr(self.model, "predict_proba"):
            return self.model.predict_proba(Z)[:, 1]
        return 1.0 / (1.0 + np.exp(-self.model.decision_function(Z)))

    def predict_calibrated_proba(self, Z: np.ndarray) -> np.ndarray:
        """Returns calibrated probability in [0, 1]."""
        raw_probs = self.predict_raw_proba(Z)
        if self.calibration_method == "isotonic":
            cal_probs = self.calibrator.predict(raw_probs)
        else:
            cal_probs = self.calibrator.predict_proba(raw_probs.reshape(-1, 1))[:, 1]
        return np.clip(cal_probs, 0.0, 1.0)

    def predict_risk_score(self, Z: np.ndarray) -> np.ndarray:
        """Returns FinSure unified 0-100 risk score."""
        cal_probs = self.predict_calibrated_proba(Z)
        return np.round(cal_probs * 100).astype(int)

    def compute_calibration_curve(
        self,
        y_true: np.ndarray,
        probs: np.ndarray,
        n_bins: int = 10
    ) -> Dict[str, Any]:
        """Calculates calibration curve points and expected calibration error (ECE)."""
        prob_true, prob_pred = calibration_curve(y_true, probs, n_bins=n_bins, strategy="uniform")
        
        # Calculate ECE (Expected Calibration Error)
        bin_edges = np.linspace(0, 1, n_bins + 1)
        bin_indices = np.digitize(probs, bin_edges) - 1
        bin_indices = np.clip(bin_indices, 0, n_bins - 1)
        
        ece = 0.0
        N = len(y_true)
        for i in range(n_bins):
            bin_mask = bin_indices == i
            n_in_bin = np.sum(bin_mask)
            if n_in_bin > 0:
                acc = np.mean(y_true[bin_mask])
                conf = np.mean(probs[bin_mask])
                ece += (n_in_bin / N) * abs(acc - conf)

        return {
            "prob_true": [round(float(p), 4) for p in prob_true],
            "prob_pred": [round(float(p), 4) for p in prob_pred],
            "ece": round(float(ece), 4),
            "brier_score": round(float(brier_score_loss(y_true, probs)), 5)
        }

    def save(self, filepath: str):
        """Persists meta-learner and calibrator."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "base_learner_type": self.base_learner_type,
            "calibration_method": self.calibration_method,
            "random_state": self.random_state,
            "model": self.model,
            "calibrator": self.calibrator,
            "feature_names": self.feature_names,
            "is_fitted": self.is_fitted
        }, filepath)

    @classmethod
    def load(cls, filepath: str) -> "FinSureMetaLearner":
        """Loads saved meta-learner."""
        data = joblib.load(filepath)
        instance = cls(
            base_learner_type=data["base_learner_type"],
            calibration_method=data["calibration_method"],
            random_state=data["random_state"]
        )
        instance.model = data["model"]
        instance.calibrator = data["calibrator"]
        instance.feature_names = data["feature_names"]
        instance.is_fitted = data["is_fitted"]
        return instance
