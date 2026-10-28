"""
FinSure What-If Operational Threshold Simulator
Simulates business cost impact and decision mix across candidate operational threshold sets.
Enforces the Phase 3 Evaluation Integrity rule: NEVER optimizes thresholds on test set labels.
Reference: Master Prompt v2 Section 6.3 and FinSure SRS v2 Section 3.3.
"""

import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import pandas as pd

logger = logging.getLogger("finsure.simulator")

DEFAULT_FRAUD_LOSS_INR = 32000.0
DEFAULT_FRICTION_COST_INR = 250.0


class WhatIfThresholdSimulator:
    """
    Simulates operational decision distribution and expected business cost
    under alternative risk threshold policies.
    """
    def __init__(
        self,
        avg_fraud_loss_inr: float = DEFAULT_FRAUD_LOSS_INR,
        friction_cost_inr: float = DEFAULT_FRICTION_COST_INR
    ):
        self.avg_fraud_loss_inr = avg_fraud_loss_inr
        self.friction_cost_inr = friction_cost_inr

    def evaluate_policy(
        self,
        risk_scores: np.ndarray,
        y_true: Optional[np.ndarray] = None,
        approve_max: int = 39,
        step_up_max: int = 69,
        cooling_max: int = 89,
        policy_name: str = "custom_policy"
    ) -> Dict[str, Any]:
        """
        Evaluates a single threshold configuration.
        Score ranges:
          - [0, approve_max]: approve
          - [approve_max + 1, step_up_max]: step_up
          - [step_up_max + 1, cooling_max]: cooling_period
          - [cooling_max + 1, 100]: block
        """
        scores = np.asarray(risk_scores, dtype=int)
        N = len(scores)

        is_approve = scores <= approve_max
        is_step_up = (scores > approve_max) & (scores <= step_up_max)
        is_cooling = (scores > step_up_max) & (scores <= cooling_max)
        is_block = scores > cooling_max

        cnt_approve = int(np.sum(is_approve))
        cnt_step_up = int(np.sum(is_step_up))
        cnt_cooling = int(np.sum(is_cooling))
        cnt_block = int(np.sum(is_block))

        pct_approve = round((cnt_approve / max(1, N)) * 100.0, 2)
        pct_step_up = round((cnt_step_up / max(1, N)) * 100.0, 2)
        pct_cooling = round((cnt_cooling / max(1, N)) * 100.0, 2)
        pct_block = round((cnt_block / max(1, N)) * 100.0, 2)

        results = {
            "policy_name": policy_name,
            "sample_size": N,
            "thresholds": {
                "approve_range": [0, approve_max],
                "step_up_range": [approve_max + 1, step_up_max],
                "cooling_period_range": [step_up_max + 1, cooling_max],
                "block_range": [cooling_max + 1, 100]
            },
            "decision_mix": {
                "approve_count": cnt_approve,
                "approve_pct": pct_approve,
                "step_up_count": cnt_step_up,
                "step_up_pct": pct_step_up,
                "cooling_period_count": cnt_cooling,
                "cooling_period_pct": pct_cooling,
                "block_count": cnt_block,
                "block_pct": pct_block
            }
        }

        # If ground-truth labels are supplied, compute business cost & detection metrics
        if y_true is not None:
            y_arr = np.asarray(y_true, dtype=int)
            total_frauds = int(np.sum(y_arr == 1))
            total_legit = int(np.sum(y_arr == 0))

            # Frauds approved = False Negatives (financial loss)
            fn_frauds_approved = int(np.sum(is_approve & (y_arr == 1)))
            # Frauds challenged or blocked = True Positives (saved loss)
            tp_frauds_intercepted = total_frauds - fn_frauds_approved

            # Legitimate transactions challenged or blocked = False Positives (friction cost)
            fp_legit_step_up = int(np.sum(is_step_up & (y_arr == 0)))
            fp_legit_cooling = int(np.sum(is_cooling & (y_arr == 0)))
            fp_legit_blocked = int(np.sum(is_block & (y_arr == 0)))
            fp_total_friction = fp_legit_step_up + fp_legit_cooling + fp_legit_blocked

            fraud_loss_inr = fn_frauds_approved * self.avg_fraud_loss_inr
            friction_cost_inr = fp_total_friction * self.friction_cost_inr
            total_business_cost = fraud_loss_inr + friction_cost_inr

            fraud_catch_rate_pct = round((tp_frauds_intercepted / max(1, total_frauds)) * 100.0, 2)
            friction_rate_pct = round((fp_total_friction / max(1, total_legit)) * 100.0, 2)

            results["financial_impact"] = {
                "total_frauds": total_frauds,
                "total_legitimate": total_legit,
                "frauds_approved_missed": fn_frauds_approved,
                "frauds_intercepted": tp_frauds_intercepted,
                "fraud_catch_rate_pct": fraud_catch_rate_pct,
                "legitimate_friction_count": fp_total_friction,
                "legitimate_friction_rate_pct": friction_rate_pct,
                "fraud_loss_inr": round(fraud_loss_inr, 2),
                "friction_cost_inr": round(friction_cost_inr, 2),
                "total_expected_cost_inr": round(total_business_cost, 2)
            }

        return results

    def compare_policies(
        self,
        risk_scores: np.ndarray,
        y_true: Optional[np.ndarray] = None,
        candidate_policies: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Compares multiple threshold policies side-by-side.
        """
        if candidate_policies is None:
            candidate_policies = [
                {"name": "Standard Operational (v1.0.0)", "approve_max": 39, "step_up_max": 69, "cooling_max": 89},
                {"name": "Conservative (Low Friction)", "approve_max": 49, "step_up_max": 74, "cooling_max": 92},
                {"name": "Aggressive (High Catch)", "approve_max": 25, "step_up_max": 55, "cooling_max": 80}
            ]

        comparisons = []
        for pol in candidate_policies:
            res = self.evaluate_policy(
                risk_scores=risk_scores,
                y_true=y_true,
                approve_max=pol.get("approve_max", 39),
                step_up_max=pol.get("step_up_max", 69),
                cooling_max=pol.get("cooling_max", 89),
                policy_name=pol.get("name", "candidate")
            )
            comparisons.append(res)

        return {
            "comparison_count": len(comparisons),
            "policies": comparisons
        }
