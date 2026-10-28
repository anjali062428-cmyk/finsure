"""
FinSure Decision Cost Framework
Computes the total business cost: Total Cost = (FN * avg_fraud_loss) + (FP * friction_cost).
Evaluates threshold trade-offs between fraud losses and customer friction.
Reference: Master Prompt v2 Section 5.5 and FinSure SRS v2 Section 6.3.
"""

from typing import Dict, List, Any, Tuple
import numpy as np
from sklearn.metrics import confusion_matrix, precision_score, recall_score


def evaluate_cost_curve(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    avg_fraud_loss: float = 32000.0,
    friction_cost: float = 250.0,
    num_thresholds: int = 100
) -> Dict[str, Any]:
    """
    Evaluates business cost across candidate decision thresholds.
    Ensures standard baseline thresholds (0.40, 0.50, 0.89, 0.90) are explicitly included.
    Guarantees that the recommended optimal threshold is argmin(cost) on the evaluated partition.
    """
    # Dense threshold grid with explicit standard operational thresholds
    base_grid = np.linspace(0.01, 0.99, num_thresholds)
    standards = np.array([0.40, 0.50, 0.89, 0.90])
    thresholds = np.unique(np.sort(np.concatenate([base_grid, standards])))
    
    curve_data: List[Dict[str, Any]] = []
    
    min_cost = float("inf")
    optimal_thresh = 0.50
    optimal_point = {}
    default_point = {}
    
    for th in thresholds:
        th_val = round(float(th), 4)
        y_pred = (y_probs >= th_val).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        fraud_losses = int(fn) * avg_fraud_loss
        friction_losses = int(fp) * friction_cost
        total_cost = fraud_losses + friction_losses
        
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        
        point = {
            "threshold": th_val,
            "total_cost": round(total_cost, 2),
            "fraud_loss": round(fraud_losses, 2),
            "friction_loss": round(friction_losses, 2),
            "false_negatives": int(fn),
            "false_positives": int(fp),
            "true_positives": int(tp),
            "true_negatives": int(tn),
            "precision": round(prec, 4),
            "recall": round(rec, 4)
        }
        curve_data.append(point)
        
        if abs(th_val - 0.50) < 1e-4:
            default_point = point
            
        # Tie-breaking rule: if costs are equal, choose the point with lower FN (safer fraud protection)
        if total_cost < min_cost or (total_cost == min_cost and int(fn) < optimal_point.get("false_negatives", 999999)):
            min_cost = total_cost
            optimal_thresh = th_val
            optimal_point = point

    # Explicit assertion: optimal cost MUST be <= default cost on this dataset partition
    assert optimal_point["total_cost"] <= default_point.get("total_cost", float("inf")), (
        f"Cost optimization integrity failure: optimal cost {optimal_point['total_cost']} "
        f"> default cost {default_point.get('total_cost')}"
    )

    return {
        "parameters": {
            "avg_fraud_loss_inr": avg_fraud_loss,
            "friction_cost_inr": friction_cost
        },
        "default_operating_point": default_point,
        "optimal_operating_point": {
            "recommended_threshold": optimal_thresh,
            "minimum_cost_inr": optimal_point["total_cost"],
            "details": optimal_point
        },
        "curve_samples": curve_data[::5]  # Downsampled for concise reporting
    }
