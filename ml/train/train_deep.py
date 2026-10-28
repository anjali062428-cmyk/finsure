"""
FinSure Phase 3 Deep Model Training & Out-of-Fold Pipeline
Implements:
1. Autoencoder training (strictly on legitimate training data)
2. Scam Type Classifier training (6-class multi-task head)
3. Sequence Model training (GRU + Attention Pooling)
4. GraphSAGE training (temporal graph with cached node embeddings)
5. 5-Fold Stratified Out-of-Fold (OOF) prediction generation on Train set
6. Validation and Test inference for base models
7. Calibrated Meta-Learner (Ensemble Brain) fitting
"""

import os
import sys
import time
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

from ml.features.pipeline import FEATURE_COLUMNS
from ml.features.splits import create_temporal_splits, DEFAULT_SPLIT_BOUNDARIES
from ml.data.deep_datasets import (
    SequenceWindowBuilder,
    TemporalGraphBuilder,
    SCAM_TYPE_MAP,
    SCAM_CLASSES
)
from ml.models.sequence_model import FinSureSequenceModel
from ml.models.graph_model import FinSureGraphSAGE
from ml.models.autoencoder import FinSureAutoencoder
from ml.models.scam_classifier import ScamTypeClassifier
from ml.models.meta_learner import FinSureMetaLearner

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("finsure.train_deep")

KEY_GRAPH_FEATURES = [
    "log_amount",
    "hour",
    "is_night",
    "is_weekend",
    "is_new_payee",
    "is_new_device",
    "dist_from_prev_txn_km",
    "implied_travel_speed_kmh",
    "user_daily_limit_ratio",
    "amt_user_zscore"
]


def prepare_sequence_cache(
    df_txns: pd.DataFrame,
    cache_path: str = "data/processed/sequences_phase3.npz"
) -> Tuple[np.ndarray, np.ndarray]:
    """Generates or loads cached sequence arrays and masks."""
    if os.path.exists(cache_path):
        logger.info(f"Loading cached sequences from {cache_path}")
        data = np.load(cache_path)
        return data["sequences"], data["masks"]

    logger.info("Building sequence windows for all transactions (target excluded)...")
    builder = SequenceWindowBuilder(max_seq_len=50, step_dim=12)
    sequences, masks = builder.build_sequences_for_dataframe(df_txns)
    
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    np.savez_compressed(cache_path, sequences=sequences, masks=masks)
    logger.info(f"Saved sequences cache to {cache_path} (shape: {sequences.shape})")
    return sequences, masks


def train_autoencoder(
    X_train_legit: np.ndarray,
    X_val_legit: np.ndarray,
    epochs: int = 8,
    batch_size: int = 512,
    lr: float = 1e-3,
    seed: int = 42
) -> FinSureAutoencoder:
    """Trains Deep Autoencoder strictly on legitimate training data."""
    torch.manual_seed(seed)
    np.random.seed(seed)

    model = FinSureAutoencoder(input_dim=X_train_legit.shape[1])
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    criterion = nn.MSELoss()

    dataset = TensorDataset(torch.tensor(X_train_legit, dtype=torch.float32))
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model.train()
    for ep in range(epochs):
        total_loss = 0.0
        for (batch_x,) in loader:
            optimizer.zero_grad()
            x_rec, _ = model(batch_x)
            loss = criterion(x_rec, batch_x)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(batch_x)
        avg_loss = total_loss / len(X_train_legit)
        if (ep + 1) % 4 == 0 or ep == epochs - 1:
            logger.info(f"Autoencoder Epoch {ep+1}/{epochs} - Reconstruction Loss: {avg_loss:.5f}")

    # Fit normalizer on legitimate validation samples
    model.fit_normalizer(X_val_legit)
    return model


def train_scam_classifier(
    X_train_fraud: np.ndarray,
    y_scam_train: np.ndarray,
    epochs: int = 15,
    batch_size: int = 64,
    lr: float = 1e-3,
    seed: int = 42
) -> ScamTypeClassifier:
    """Trains multi-class scam type classifier on known fraud instances."""
    torch.manual_seed(seed)
    np.random.seed(seed)

    model = ScamTypeClassifier(input_dim=X_train_fraud.shape[1], num_classes=6)
    
    # Compute inverse class frequencies for weighted loss
    counts = np.bincount(y_scam_train, minlength=6)
    weights = np.zeros(6, dtype=np.float32)
    for c in range(6):
        weights[c] = (len(y_scam_train) / max(1, counts[c])) if counts[c] > 0 else 1.0
    weights = weights / np.mean(weights)
    class_weights_t = torch.tensor(weights, dtype=torch.float32)

    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(weight=class_weights_t)

    dataset = TensorDataset(
        torch.tensor(X_train_fraud, dtype=torch.float32),
        torch.tensor(y_scam_train, dtype=torch.long)
    )
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model.train()
    for ep in range(epochs):
        total_loss = 0.0
        for batch_x, batch_y in loader:
            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(batch_x)
        avg_loss = total_loss / len(X_train_fraud)

    logger.info(f"ScamTypeClassifier trained ({len(X_train_fraud)} fraud samples). Final loss: {avg_loss:.4f}")
    return model


def train_sequence_model(
    seqs: np.ndarray,
    masks: np.ndarray,
    feats: np.ndarray,
    labels: np.ndarray,
    epochs: int = 6,
    batch_size: int = 512,
    lr: float = 1e-3,
    seed: int = 42
) -> FinSureSequenceModel:
    """Trains sequence model (GRU + Attention Pooling)."""
    torch.manual_seed(seed)
    np.random.seed(seed)

    model = FinSureSequenceModel(
        step_dim=seqs.shape[2],
        current_dim=feats.shape[1],
        hidden_dim=64,
        encoder_type="gru"
    )

    pos_weight = torch.tensor([12.0], dtype=torch.float32)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    dataset = TensorDataset(
        torch.tensor(seqs, dtype=torch.float32),
        torch.tensor(masks, dtype=torch.bool),
        torch.tensor(feats, dtype=torch.float32),
        torch.tensor(labels, dtype=torch.float32).unsqueeze(1)
    )
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model.train()
    for ep in range(epochs):
        total_loss = 0.0
        for b_seq, b_mask, b_cur, b_y in loader:
            optimizer.zero_grad()
            logits, _ = model(b_seq, b_mask, b_cur)
            loss = criterion(logits, b_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(b_y)
        avg_loss = total_loss / len(labels)
        if (ep + 1) % 3 == 0 or ep == epochs - 1:
            logger.info(f"Sequence Model Epoch {ep+1}/{epochs} - Loss: {avg_loss:.4f}")

    return model


def train_graph_model(
    df_txns_train: pd.DataFrame,
    labels_train: np.ndarray,
    epochs: int = 6,
    batch_size: int = 512,
    lr: float = 1e-3,
    seed: int = 42
) -> Tuple[FinSureGraphSAGE, TemporalGraphBuilder]:
    """Trains GraphSAGE on train period transactions and caches node embeddings."""
    torch.manual_seed(seed)
    np.random.seed(seed)

    gb = TemporalGraphBuilder()
    edge_index, node_features = gb.build_graph_from_txns(df_txns_train)

    model = FinSureGraphSAGE(
        node_in_dim=5,
        hidden_dim=64,
        embed_dim=32,
        key_feat_dim=len(KEY_GRAPH_FEATURES)
    )

    pos_weight = torch.tensor([12.0], dtype=torch.float32)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    # Pre-extract user, payee, device IDs and key features
    u_ids = df_txns_train["user_id"].astype(str).tolist()
    p_ids = df_txns_train["payee_id"].astype(str).tolist()
    d_ids = df_txns_train["device_id"].astype(str).tolist()
    key_feats = df_txns_train[KEY_GRAPH_FEATURES].values.astype(np.float32)

    # Initial graph forward
    model.train()
    for ep in range(epochs):
        optimizer.zero_grad()
        # Compute node embeddings
        node_embeds = model.forward_graph(node_features, edge_index)

        # Batch sampling for edges to fit memory and optimize
        indices = np.random.choice(len(df_txns_train), size=min(4096, len(df_txns_train)), replace=False)
        
        batch_u_embeds = torch.stack([node_embeds[gb.node_to_id[f"user:{u_ids[i]}"]] for i in indices])
        batch_p_embeds = torch.stack([node_embeds[gb.node_to_id[f"payee:{p_ids[i]}"]] for i in indices])
        batch_d_embeds = torch.stack([node_embeds[gb.node_to_id[f"device:{d_ids[i]}"]] for i in indices])
        batch_key = torch.tensor(key_feats[indices], dtype=torch.float32)
        batch_y = torch.tensor(labels_train[indices], dtype=torch.float32).unsqueeze(1)

        logits = model.forward_edges(batch_u_embeds, batch_p_embeds, batch_d_embeds, batch_key)
        loss = criterion(logits, batch_y)
        loss.backward()
        optimizer.step()
        if (ep + 1) % 3 == 0 or ep == epochs - 1:
            logger.info(f"GraphSAGE Epoch {ep+1}/{epochs} - Loss: {loss.item():.4f}")

    # Cache node embeddings for inference
    model.cache_node_embeddings(node_features, edge_index, gb.id_to_node)
    logger.info(f"GraphSAGE cached {len(model.cached_embeddings)} node embeddings.")
    return model, gb


def run_phase3_pipeline(
    random_seed: int = 42
) -> Dict[str, Any]:
    """
    Executes complete Phase 3 deep learning and ensemble pipeline.
    """
    logger.info("=" * 60)
    logger.info("STARTING PHASE 3: DEEP MODELS & ENSEMBLE BRAIN PIPELINE")
    logger.info("=" * 60)

    # 1. Load data
    df_features = pd.read_csv("data/processed/features_phase2.csv")
    df_txns = pd.read_csv("data/processed/synthetic/transactions.csv")
    
    # Ensure txn_id matches exactly
    assert (df_features["txn_id"] == df_txns["txn_id"]).all(), "Mismatch between features and transactions!"

    # Add key graph features into df_txns from df_features
    for col in KEY_GRAPH_FEATURES:
        if col not in df_txns.columns:
            df_txns[col] = df_features[col]

    # Pre-build / load sequences
    sequences, masks = prepare_sequence_cache(df_txns)

    # Create temporal splits
    X_tr_df, y_tr_ser, X_va_df, y_va_ser, X_te_df, y_te_ser, split_meta = create_temporal_splits(df_features)
    
    train_idx = X_tr_df.index.values
    val_idx = X_va_df.index.values
    test_idx = X_te_df.index.values

    # Raw features for tree-based XGBoost (preserves exact Phase 2 split thresholds)
    X_train_raw = X_tr_df[FEATURE_COLUMNS].values.astype(np.float32)
    X_val_raw = X_va_df[FEATURE_COLUMNS].values.astype(np.float32)
    X_test_raw = X_te_df[FEATURE_COLUMNS].values.astype(np.float32)

    # Standard scaled features for neural models (Autoencoder, Sequence, Scam Classifier)
    scaler = joblib.load("ml/artifacts/feature_scaler.joblib")
    X_train_scaled = scaler.transform(X_tr_df[FEATURE_COLUMNS]).astype(np.float32)
    X_val_scaled = scaler.transform(X_va_df[FEATURE_COLUMNS]).astype(np.float32)
    X_test_scaled = scaler.transform(X_te_df[FEATURE_COLUMNS]).astype(np.float32)

    y_train = y_tr_ser.values.astype(int)
    y_val = y_va_ser.values.astype(int)
    y_test = y_te_ser.values.astype(int)

    # Scam type targets (map string to 0..5)
    scam_strings = df_features["scam_type"].fillna("none").values
    scam_encoded = np.array([SCAM_TYPE_MAP.get(s, 5) for s in scam_strings], dtype=int)
    y_scam_train = scam_encoded[train_idx]
    y_scam_val = scam_encoded[val_idx]
    y_scam_test = scam_encoded[test_idx]

    # -------------------------------------------------------------
    # 2. GENERATE OUT-OF-FOLD (OOF) PREDICTIONS ON TRAIN SET (5 FOLDS)
    # -------------------------------------------------------------
    logger.info("Starting 5-Fold Stratified Cross-Validation on Train set for OOF generation...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_seed)

    oof_preds_xgb = np.zeros(len(train_idx), dtype=np.float32)
    oof_preds_seq = np.zeros(len(train_idx), dtype=np.float32)
    oof_preds_gnn = np.zeros(len(train_idx), dtype=np.float32)
    oof_preds_ae = np.zeros(len(train_idx), dtype=np.float32)

    fold_manifest = []

    pos_count_total = int(y_train.sum())
    scale_pos = (len(y_train) - pos_count_total) / max(1, pos_count_total)

    for fold, (f_train_sub_idx, f_holdout_sub_idx) in enumerate(skf.split(X_train_raw, y_train)):
        t_fold_start = time.time()
        logger.info(f"--- FOLD {fold+1}/5: Train={len(f_train_sub_idx)}, Holdout={len(f_holdout_sub_idx)} ---")

        # 2a. XGBoost Fold (using unscaled features matching Phase 2 baseline)
        xgb_fold = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos,
            random_state=random_seed + fold,
            eval_metric="logloss"
        )
        xgb_fold.fit(X_train_raw[f_train_sub_idx], y_train[f_train_sub_idx])
        oof_preds_xgb[f_holdout_sub_idx] = xgb_fold.predict_proba(X_train_raw[f_holdout_sub_idx])[:, 1]

        # 2b. Autoencoder Fold (trained strictly on legitimate, scaled features)
        legit_mask_fold = y_train[f_train_sub_idx] == 0
        X_legit_fold = X_train_scaled[f_train_sub_idx][legit_mask_fold]
        ae_fold = train_autoencoder(
            X_legit_fold,
            X_train_scaled[f_holdout_sub_idx][y_train[f_holdout_sub_idx] == 0],
            epochs=5,
            batch_size=512,
            seed=random_seed + fold
        )
        oof_preds_ae[f_holdout_sub_idx] = ae_fold.get_anomaly_score(X_train_scaled[f_holdout_sub_idx])

        # 2c. Sequence Model Fold
        seq_fold = train_sequence_model(
            sequences[train_idx[f_train_sub_idx]],
            masks[train_idx[f_train_sub_idx]],
            X_train_scaled[f_train_sub_idx],
            y_train[f_train_sub_idx],
            epochs=5,
            batch_size=512,
            seed=random_seed + fold
        )
        oof_preds_seq[f_holdout_sub_idx] = seq_fold.predict_proba(
            torch.tensor(sequences[train_idx[f_holdout_sub_idx]], dtype=torch.float32),
            torch.tensor(masks[train_idx[f_holdout_sub_idx]], dtype=torch.bool),
            torch.tensor(X_train_scaled[f_holdout_sub_idx], dtype=torch.float32)
        )

        # 2d. Graph Model Fold
        df_tx_sub = df_txns.iloc[train_idx[f_train_sub_idx]].copy()
        gnn_fold, gb_fold = train_graph_model(
            df_tx_sub,
            y_train[f_train_sub_idx],
            epochs=5,
            seed=random_seed + fold
        )
        df_tx_hold = df_txns.iloc[train_idx[f_holdout_sub_idx]]
        oof_preds_gnn[f_holdout_sub_idx] = gnn_fold.predict_with_cache(
            df_tx_hold["user_id"].astype(str).tolist(),
            df_tx_hold["payee_id"].astype(str).tolist(),
            df_tx_hold["device_id"].astype(str).tolist(),
            df_tx_hold[KEY_GRAPH_FEATURES].values.astype(np.float32)
        )

        fold_time = time.time() - t_fold_start
        fold_manifest.append({
            "fold": fold + 1,
            "train_samples": len(f_train_sub_idx),
            "holdout_samples": len(f_holdout_sub_idx),
            "holdout_frauds": int(y_train[f_holdout_sub_idx].sum()),
            "elapsed_seconds": round(fold_time, 2)
        })
        logger.info(f"Fold {fold+1} finished in {fold_time:.1f}s.")

    # Save OOF manifest
    oof_manifest = {
        "dataset_name": "FinSure Synthetic UPI",
        "train_samples": len(train_idx),
        "n_folds": 5,
        "fold_details": fold_manifest,
        "oof_feature_names": ["prob_xgb", "prob_seq", "prob_gnn", "score_ae"]
    }
    with open("docs/results/phase3_oof_manifest.json", "w") as f:
        json.dump(oof_manifest, f, indent=2)
    logger.info("Saved OOF manifest to docs/results/phase3_oof_manifest.json")

    # -------------------------------------------------------------
    # 3. TRAIN FULL BASE MODELS ON 100% OF TRAIN SET
    # -------------------------------------------------------------
    logger.info("Training full base models on 100% of Train set...")
    
    # 3a. Full Autoencoder
    legit_mask_train = y_train == 0
    X_train_legit = X_train_scaled[legit_mask_train]
    X_val_legit = X_val_scaled[y_val == 0]
    full_ae = train_autoencoder(X_train_legit, X_val_legit, epochs=8, seed=random_seed)
    torch.save(full_ae.state_dict(), "ml/artifacts/autoencoder.pt")
    logger.info("Saved autoencoder model to ml/artifacts/autoencoder.pt")

    # 3b. Full Scam Type Classifier
    fraud_mask_train = y_train == 1
    X_train_fraud = X_train_scaled[fraud_mask_train]
    full_scam_clf = train_scam_classifier(
        X_train_fraud,
        y_scam_train[fraud_mask_train],
        epochs=18,
        seed=random_seed
    )
    torch.save(full_scam_clf.state_dict(), "ml/artifacts/scam_classifier.pt")
    logger.info("Saved scam classifier to ml/artifacts/scam_classifier.pt")

    # 3c. Full Sequence Model
    full_seq = train_sequence_model(
        sequences[train_idx],
        masks[train_idx],
        X_train_scaled,
        y_train,
        epochs=8,
        seed=random_seed
    )
    torch.save(full_seq.state_dict(), "ml/artifacts/sequence_model.pt")
    logger.info("Saved sequence model to ml/artifacts/sequence_model.pt")

    # 3d. Full Graph Model
    df_tx_train = df_txns.iloc[train_idx].copy()
    full_gnn, full_gb = train_graph_model(
        df_tx_train,
        y_train,
        epochs=8,
        seed=random_seed
    )
    torch.save(full_gnn.state_dict(), "ml/artifacts/graph_model.pt")
    joblib.dump(full_gnn.cached_embeddings, "ml/artifacts/cached_embeddings.joblib")
    logger.info("Saved GraphSAGE model & node embeddings to ml/artifacts/")

    # 3e. Load full Phase 2 XGBoost Baseline
    full_xgb = xgb.XGBClassifier()
    full_xgb.load_model("ml/artifacts/xgboost_baseline.json")

    # -------------------------------------------------------------
    # 4. PREDICT ON VALIDATION & TEST SETS FOR BASE MODELS
    # -------------------------------------------------------------
    logger.info("Generating predictions on Validation and Test splits...")
    
    # Validation predictions (raw features for XGBoost, scaled for neural)
    val_p_xgb = full_xgb.predict_proba(X_val_raw)[:, 1]
    val_p_ae = full_ae.get_anomaly_score(X_val_scaled)
    val_p_seq = full_seq.predict_proba(
        torch.tensor(sequences[val_idx], dtype=torch.float32),
        torch.tensor(masks[val_idx], dtype=torch.bool),
        torch.tensor(X_val_scaled, dtype=torch.float32)
    )
    df_tx_val = df_txns.iloc[val_idx]
    val_p_gnn = full_gnn.predict_with_cache(
        df_tx_val["user_id"].astype(str).tolist(),
        df_tx_val["payee_id"].astype(str).tolist(),
        df_tx_val["device_id"].astype(str).tolist(),
        df_tx_val[KEY_GRAPH_FEATURES].values.astype(np.float32)
    )

    # Test predictions (raw features for XGBoost, scaled for neural)
    test_p_xgb = full_xgb.predict_proba(X_test_raw)[:, 1]
    test_p_ae = full_ae.get_anomaly_score(X_test_scaled)
    test_p_seq = full_seq.predict_proba(
        torch.tensor(sequences[test_idx], dtype=torch.float32),
        torch.tensor(masks[test_idx], dtype=torch.bool),
        torch.tensor(X_test_scaled, dtype=torch.float32)
    )
    df_tx_test = df_txns.iloc[test_idx]
    test_p_gnn = full_gnn.predict_with_cache(
        df_tx_test["user_id"].astype(str).tolist(),
        df_tx_test["payee_id"].astype(str).tolist(),
        df_tx_test["device_id"].astype(str).tolist(),
        df_tx_test[KEY_GRAPH_FEATURES].values.astype(np.float32)
    )

    # -------------------------------------------------------------
    # 5. ASSEMBLE META-LEARNER MATRICES & TRAIN CALIBRATED ENSEMBLE
    # -------------------------------------------------------------
    # Feature matrix for meta-learner: [prob_xgb, prob_seq, prob_gnn, score_ae] + key tabular features
    meta_tab_cols = ["log_amount", "is_new_device", "is_new_payee", "amt_user_zscore"]
    tab_tr = df_features.iloc[train_idx][meta_tab_cols].values.astype(np.float32)
    tab_va = df_features.iloc[val_idx][meta_tab_cols].values.astype(np.float32)
    tab_te = df_features.iloc[test_idx][meta_tab_cols].values.astype(np.float32)

    Z_train = np.column_stack([oof_preds_xgb, oof_preds_seq, oof_preds_gnn, oof_preds_ae, tab_tr])
    Z_val = np.column_stack([val_p_xgb, val_p_seq, val_p_gnn, val_p_ae, tab_va])
    Z_test = np.column_stack([test_p_xgb, test_p_seq, test_p_gnn, test_p_ae, tab_te])
    
    meta_feature_names = ["prob_xgb", "prob_seq", "prob_gnn", "score_ae"] + meta_tab_cols

    # Save meta matrices
    meta_bundle = {
        "Z_train": Z_train,
        "y_train": y_train,
        "Z_val": Z_val,
        "y_val": y_val,
        "Z_test": Z_test,
        "y_test": y_test,
        "feature_names": meta_feature_names,
        "val_preds_dict": {
            "xgb": val_p_xgb,
            "seq": val_p_seq,
            "gnn": val_p_gnn,
            "ae": val_p_ae
        },
        "test_preds_dict": {
            "xgb": test_p_xgb,
            "seq": test_p_seq,
            "gnn": test_p_gnn,
            "ae": test_p_ae
        }
    }
    joblib.dump(meta_bundle, "ml/artifacts/oof_predictions.joblib")
    logger.info("Saved OOF prediction bundle to ml/artifacts/oof_predictions.joblib")

    # Train Calibrated Meta-Learner
    logger.info("Fitting Calibrated Meta-Learner (Isotonic)...")
    meta_learner = FinSureMetaLearner(
        base_learner_type="xgboost",
        calibration_method="isotonic",
        random_state=random_seed
    )
    cal_info = meta_learner.fit(Z_train, y_train, Z_val, y_val, feature_names=meta_feature_names)
    meta_learner.save("ml/artifacts/ensemble_meta_learner.joblib")
    logger.info(f"Meta-Learner fitted and saved to ml/artifacts/ensemble_meta_learner.joblib. Info: {cal_info}")

    return {
        "status": "SUCCESS",
        "train_rows": len(train_idx),
        "val_rows": len(val_idx),
        "test_rows": len(test_idx),
        "meta_features": meta_feature_names,
        "calibration_info": cal_info
    }


if __name__ == "__main__":
    run_phase3_pipeline()
