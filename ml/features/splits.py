"""
FinSure Temporal Splitting Module
Implements strict, chronological train/validation/test splits.
Enforces zero data leakage: validation and test data occur strictly in the future of training data.
"""

import os
import json
from typing import Tuple, Dict, Any
import pandas as pd
from ml.features.pipeline import FEATURE_COLUMNS


DEFAULT_SPLIT_BOUNDARIES = {
    "train_end": "2026-03-01T23:59:59",
    "val_end": "2026-03-16T23:59:59",
    "test_end": "2026-04-01T23:59:59"
}


def create_temporal_splits(
    df_features: pd.DataFrame,
    boundaries: Dict[str, str] = DEFAULT_SPLIT_BOUNDARIES
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, Dict[str, Any]]:
    """
    Splits features dataframe into chronological train, validation, and test partitions.
    Returns: (X_train, y_train, X_val, y_val, X_test, y_test, split_metadata)
    """
    df = df_features.copy()
    df["created_at_dt"] = pd.to_datetime(df["created_at"], format="ISO8601")
    
    t_train_end = pd.to_datetime(boundaries["train_end"])
    t_val_end = pd.to_datetime(boundaries["val_end"])
    
    train_mask = df["created_at_dt"] <= t_train_end
    val_mask = (df["created_at_dt"] > t_train_end) & (df["created_at_dt"] <= t_val_end)
    test_mask = df["created_at_dt"] > t_val_end
    
    df_train = df[train_mask].copy()
    df_val = df[val_mask].copy()
    df_test = df[test_mask].copy()
    
    # Assert strict non-overlapping temporal order
    assert df_train["created_at_dt"].max() < df_val["created_at_dt"].min(), "Leakage detected: Train and Val overlap in time!"
    assert df_val["created_at_dt"].max() < df_test["created_at_dt"].min(), "Leakage detected: Val and Test overlap in time!"
    
    X_train = df_train[FEATURE_COLUMNS]
    y_train = df_train["is_fraud"]
    
    X_val = df_val[FEATURE_COLUMNS]
    y_val = df_val["is_fraud"]
    
    X_test = df_test[FEATURE_COLUMNS]
    y_test = df_test["is_fraud"]
    
    meta = {
        "split_strategy": "Strict Chronological (Time-Based)",
        "boundaries": boundaries,
        "feature_count": len(FEATURE_COLUMNS),
        "train": {
            "start": str(df_train["created_at_dt"].min()),
            "end": str(df_train["created_at_dt"].max()),
            "total_rows": len(df_train),
            "fraud_count": int(y_train.sum()),
            "fraud_prevalence_pct": round(float(y_train.mean()) * 100, 3)
        },
        "validation": {
            "start": str(df_val["created_at_dt"].min()),
            "end": str(df_val["created_at_dt"].max()),
            "total_rows": len(df_val),
            "fraud_count": int(y_val.sum()),
            "fraud_prevalence_pct": round(float(y_val.mean()) * 100, 3)
        },
        "test": {
            "start": str(df_test["created_at_dt"].min()),
            "end": str(df_test["created_at_dt"].max()),
            "total_rows": len(df_test),
            "fraud_count": int(y_test.sum()),
            "fraud_prevalence_pct": round(float(y_test.mean()) * 100, 3)
        }
    }
    
    return X_train, y_train, X_val, y_val, X_test, y_test, meta
