"""
FinSure Deterministic Risk Decision Engine
Enforces the Canonical Risk Scoring Contract:
- Calibrated Probability P in [0.0, 1.0]
- Integer Risk Score S = round(100 * P) in [0, 100]
- Deterministic operational action mapping:
    * S in [0, 39]   -> approve
    * S in [40, 69]  -> step_up
    * S in [70, 89]  -> cooling_period
    * S in [90, 100] -> block
Loads policy definitions from configs/risk_thresholds.yaml.
"""

import os
import yaml
import logging
from typing import Dict, List, Optional, Any, Union
import numpy as np

logger = logging.getLogger("finsure.decision_engine")

DEFAULT_POLICY_VERSION = "v1.0.0"
DEFAULT_CONFIG_PATH = os.path.join("configs", "risk_thresholds.yaml")


class FinSureDecisionEngine:
    """
    Deterministic risk decision engine implementing operational action thresholds
    and contract specifications.
    """
    def __init__(self, config_path: str = DEFAULT_CONFIG_PATH):
        self.config_path = config_path
        self.policy_version = DEFAULT_POLICY_VERSION
        self.cost_parameters = {
            "avg_fraud_loss_inr": 32000.0,
            "friction_cost_inr": 250.0
        }
        self.decision_thresholds = {
            "approve": {"min_score": 0, "max_score": 39, "action": "approve", "description": "Transaction approved instantly without customer friction."},
            "step_up": {"min_score": 40, "max_score": 69, "action": "step_up", "description": "Medium risk: Step-up authentication challenge required via verified channel (OTP)."},
            "cooling_period": {"min_score": 70, "max_score": 89, "action": "cooling_period", "description": "High risk: 2-hour cooling period imposed on high-value transfer to unverified/new beneficiary."},
            "block": {"min_score": 90, "max_score": 100, "action": "block", "description": "Critical risk: Transaction blocked immediately, alert generated, customer notified."}
        }
        self.risk_bands = {
            "low": {"min_score": 0, "max_score": 39, "display_label": "Low Risk", "badge_color": "#13A89E"},
            "medium": {"min_score": 40, "max_score": 69, "display_label": "Medium Risk", "badge_color": "#E8A33D"},
            "high": {"min_score": 70, "max_score": 89, "display_label": "High Risk", "badge_color": "#EA580C"},
            "critical": {"min_score": 90, "max_score": 100, "display_label": "Critical Risk", "badge_color": "#D64545"}
        }

        self._load_config()

    def _load_config(self):
        """Loads configuration from YAML if present."""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f)
                
                if "threshold_policy" in cfg and "version" in cfg["threshold_policy"]:
                    self.policy_version = str(cfg["threshold_policy"]["version"])
                
                if "cost_parameters" in cfg:
                    self.cost_parameters["avg_fraud_loss_inr"] = float(cfg["cost_parameters"].get("avg_fraud_loss_inr", 32000.0))
                    self.cost_parameters["friction_cost_inr"] = float(cfg["cost_parameters"].get("friction_cost_inr", 250.0))

                if "decision_thresholds" in cfg:
                    raw_dt = cfg["decision_thresholds"]
                    # normalize keys
                    normalized = {}
                    for k, v in raw_dt.items():
                        action = v.get("action", k)
                        normalized[action] = {
                            "min_score": int(v.get("min_score", 0)),
                            "max_score": int(v.get("max_score", 100)),
                            "action": action,
                            "description": str(v.get("description", ""))
                        }
                    self.decision_thresholds = normalized

                if "risk_bands" in cfg:
                    self.risk_bands = cfg["risk_bands"]
                logger.info(f"Loaded risk decision thresholds (version {self.policy_version}) from {self.config_path}")
            except Exception as e:
                logger.warning(f"Failed to parse config at {self.config_path}: {e}. Using deterministic defaults.")
        else:
            logger.info(f"Config path {self.config_path} not found. Using default thresholds.")

    @staticmethod
    def probability_to_score(probability: Union[float, np.floating, np.ndarray]) -> Union[int, np.ndarray]:
        """
        Canonical mapping: S = round(100 * P) clamped to [0, 100].
        """
        prob = np.clip(np.asarray(probability, dtype=np.float64), 0.0, 1.0)
        scores = np.round(prob * 100.0).astype(int)
        scores = np.clip(scores, 0, 100)
        if np.ndim(probability) == 0:
            return int(scores)
        return scores

    def get_risk_band(self, score: int) -> Dict[str, Any]:
        """Returns risk band metadata for a given risk score."""
        score = max(0, min(100, int(score)))
        for band_name, band_info in self.risk_bands.items():
            if band_info["min_score"] <= score <= band_info["max_score"]:
                return {
                    "band": band_name,
                    "display_label": band_info.get("display_label", band_name.capitalize()),
                    "badge_color": band_info.get("badge_color", "#888888")
                }
        return {"band": "low", "display_label": "Low Risk", "badge_color": "#13A89E"}

    def get_action(self, score: int) -> Dict[str, Any]:
        """Returns deterministic decision action metadata for a given risk score."""
        score = max(0, min(100, int(score)))
        for action_name, dt in self.decision_thresholds.items():
            if dt["min_score"] <= score <= dt["max_score"]:
                return {
                    "action": dt["action"],
                    "description": dt["description"]
                }
        return {"action": "approve", "description": "Transaction approved instantly."}

    def evaluate_decision(
        self,
        calibrated_probability: float,
        transaction_id: str = "TXN_SIMULATED",
        timestamp: Optional[str] = None,
        reason_codes: Optional[List[str]] = None,
        explanation: Optional[Dict[str, Any]] = None,
        hard_override_action: Optional[str] = None,
        override_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a transaction's calibrated probability and yields canonical decision contract.
        """
        prob = float(np.clip(calibrated_probability, 0.0, 1.0))
        score = int(self.probability_to_score(prob))
        band_info = self.get_risk_band(score)
        action_info = self.get_action(score)

        final_action = action_info["action"]
        final_description = action_info["description"]
        is_overridden = False

        if hard_override_action is not None and hard_override_action in ["approve", "step_up", "cooling_period", "block"]:
            final_action = hard_override_action
            final_description = f"Override applied: {override_reason or 'Policy Rule'}"
            is_overridden = True

        return {
            "transaction_id": str(transaction_id),
            "timestamp": timestamp or "2026-09-28T00:00:00Z",
            "calibrated_probability": round(prob, 4),
            "risk_score": score,
            "risk_band": band_info["band"],
            "risk_label": band_info["display_label"],
            "badge_color": band_info["badge_color"],
            "action": final_action,
            "action_description": final_description,
            "is_overridden": is_overridden,
            "policy_version": self.policy_version,
            "cost_parameters": dict(self.cost_parameters),
            "reason_codes": reason_codes or [],
            "explanation": explanation or {}
        }

    def evaluate_scores_batch(self, scores: np.ndarray) -> np.ndarray:
        """Vectorized decision mapping returning array of actions."""
        actions = np.empty(len(scores), dtype=object)
        scores_arr = np.asarray(scores, dtype=int)
        
        for action_name, dt in self.decision_thresholds.items():
            mask = (scores_arr >= dt["min_score"]) & (scores_arr <= dt["max_score"])
            actions[mask] = dt["action"]
        
        # default any remaining to approve
        actions[actions == None] = "approve"
        return actions
