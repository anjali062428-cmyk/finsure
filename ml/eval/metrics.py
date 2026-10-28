"""
FinSure Model Evaluation Metrics Module
Computes PR-AUC (primary metric), recall at fixed FPR, F1, F2, ROC-AUC, Brier score,
and latency percentiles. Accuracy is never used as the headline metric.
Reference: Master Prompt v2 Section 5.5 and FinSure SRS v2 Section 6.3.
"""

import time
from typing import Dict, Any, Tuple
import numpy as np
from sklearn.metrics import (
    precision_recall_curve,
    auc,
    roc_curve,
    roc_auc_score,
    confusion_matrix,
    brier_score_loss,
    fbeta_score,
    precision_score,
    recall_score
)


def compute_recall_at_fixed_fpr(y_true: np.ndarray, y_probs: np.ndarray, target_fpr: float = 0.01) -> float:
    """Computes the recall achieved at a fixed False Positive Rate (e.g. 1% FPR)."""
    fpr, tpr, _ = roc_curve(y_true, y_probs)
    # Find the highest TPR where FPR <= target_fpr
    valid_idx = np.where(fpr <= target_fpr)[0]
    if len(valid_idx) == 0:
        return 0.0
    return float(tpr[valid_idx[-1]])


def evaluate_fraud_model(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    threshold: float = 0.50,
    model_name: str = "Model"
) -> Dict[str, Any]:
    """
    Computes comprehensive evaluation metrics for a fraud detection model.
    """
    # 1. Scoring & Latency benchmarking
    t0 = time.perf_counter()
    y_probs = model.predict_proba(X_test)[:, 1]
    total_time = time.perf_counter() - t0
    
    latency_per_sample_ms = (total_time / len(X_test)) * 1000.0
    
    # Measure individual inference latency percentiles over 200 random samples
    sample_indices = np.random.choice(len(X_test), min(200, len(X_test)), replace=False)
    single_latencies = []
    for idx in sample_indices:
        single_x = X_test[idx:idx+1]
        t_start = time.perf_counter()
        _ = model.predict_proba(single_x)
        single_latencies.append((time.perf_counter() - t_start) * 1000.0)
        
    p50_lat = float(np.percentile(single_latencies, 50))
    p95_lat = float(np.percentile(single_latencies, 95))
    p99_lat = float(np.percentile(single_latencies, 99))
    
    # 2. PR-AUC (Primary Headline Metric)
    precision_arr, recall_arr, _ = precision_recall_curve(y_test, y_probs)
    pr_auc = float(auc(recall_arr, precision_arr))
    
    # 3. ROC-AUC (Secondary Metric)
    roc_auc = float(roc_auc_score(y_test, y_probs))
    
    # 4. Recall at 1% FPR (Critical banking metric)
    recall_at_1pct_fpr = compute_recall_at_fixed_fpr(y_test, y_probs, target_fpr=0.01)
    
    # 5. Threshold Operating Point Decisions
    y_pred = (y_probs >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(fbeta_score(y_test, y_pred, beta=1.0, zero_division=0))
    f2 = float(fbeta_score(y_test, y_pred, beta=2.0, zero_division=0))
    
    # 6. Calibration / Brier Score
    brier = float(brier_score_loss(y_test, y_probs))
    
    results = {
        "model_name": model_name,
        "operating_threshold": threshold,
        "primary_metric": {
            "name": "PR-AUC",
            "value": round(pr_auc, 4)
        },
        "secondary_metrics": {
            "roc_auc": round(roc_auc, 4),
            "recall_at_1pct_fpr": round(recall_at_1pct_fpr, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "f2_score": round(f2, 4),
            "brier_score": round(brier, 4)
        },
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "latency_ms": {
            "batch_avg_per_sample": round(latency_per_sample_ms, 3),
            "p50_ms": round(p50_lat, 3),
            "p95_ms": round(p95_lat, 3),
            "p99_ms": round(p99_lat, 3)
        }
    }
    return results
