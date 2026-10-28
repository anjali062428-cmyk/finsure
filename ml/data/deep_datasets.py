"""
FinSure Deep Datasets and Graph Construction Module
Implements sequence window generation, graph construction, and scam-type encoding.
Enforces zero temporal leakage and strict exclusion of the target transaction from sequence history.
"""

import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

logger = logging.getLogger("finsure.deep_datasets")

# Scam types mapped to 6 canonical classes
SCAM_TYPE_MAP = {
    "account_takeover": 0,
    "collect_request_scam": 1,
    "mule_account": 2,
    "phishing_or_social_engineering": 3,
    "card_testing": 4,
    # Any other scam types (e.g. qr_code_proxy_tampering, unidentified_anomaly) map to 'other'
    "qr_code_proxy_tampering": 5,
    "unidentified_anomaly": 5,
    "other": 5
}

SCAM_CLASSES = [
    "account_takeover",
    "collect_request_scam",
    "mule_account",
    "phishing_or_social_engineering",
    "card_testing",
    "other"
]


class SequenceWindowBuilder:
    """
    Builds fixed-length sequence windows (up to N=50) of past transactions per user.
    Target transaction is STRICTLY EXCLUDED from its own sequence window.
    """
    def __init__(self, max_seq_len: int = 50, step_dim: int = 12):
        self.max_seq_len = max_seq_len
        self.step_dim = step_dim

    @staticmethod
    def extract_step_features(row: pd.Series) -> np.ndarray:
        """Extracts 12 normalized step features from a transaction row."""
        amt = float(row.get("amount", 0.0))
        log_amt = np.log1p(max(0.0, amt)) / 10.0
        
        # Hour and day
        hour = float(row.get("hour", 0)) / 24.0
        dow = float(row.get("dayofweek", 0)) / 7.0
        is_night = 1.0 if row.get("is_night", 0) else 0.0
        is_weekend = 1.0 if row.get("is_weekend", 0) else 0.0
        
        # Channel one-hot
        ch_upi = 1.0 if row.get("channel_upi", 0) or str(row.get("channel", "")).upper() == "UPI" else 0.0
        ch_card = 1.0 if row.get("channel_card", 0) or str(row.get("channel", "")).lower() == "card" else 0.0
        ch_bank = 1.0 if row.get("channel_bank_transfer", 0) or "bank" in str(row.get("channel", "")).lower() else 0.0
        
        # Behavioral & velocity
        time_delta = np.log1p(max(0.0, float(row.get("time_since_prev_txn_sec", 0.0)))) / 15.0
        new_payee = 1.0 if row.get("is_new_payee", 0) else 0.0
        new_device = 1.0 if row.get("is_new_device", 0) else 0.0
        dist_km = np.log1p(max(0.0, float(row.get("dist_from_prev_txn_km", 0.0)))) / 10.0
        
        return np.array([
            log_amt, hour, dow, is_night, is_weekend,
            ch_upi, ch_card, ch_bank,
            time_delta, new_payee, new_device, dist_km
        ], dtype=np.float32)

    def build_sequences_for_dataframe(
        self,
        df_txns: pd.DataFrame
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Processes transactions chronologically and builds sequence matrices.
        Returns:
            sequences: shape (N, max_seq_len, step_dim) float32
            masks: shape (N, max_seq_len) bool (True = valid event, False = pad)
        """
        N = len(df_txns)
        sequences = np.zeros((N, self.max_seq_len, self.step_dim), dtype=np.float32)
        masks = np.zeros((N, self.max_seq_len), dtype=bool)

        # Ensure sorted chronologically
        df_sorted = df_txns.copy()
        if not pd.api.types.is_datetime64_any_dtype(df_sorted["created_at"]):
            df_sorted["created_at_dt"] = pd.to_datetime(df_sorted["created_at"], format="ISO8601")
        else:
            df_sorted["created_at_dt"] = df_sorted["created_at"]
            
        df_sorted = df_sorted.sort_values(["user_id", "created_at_dt"]).reset_index()
        # 'index' in df_sorted now holds the original row position in df_txns
        
        # Group by user and collect history
        user_history: Dict[str, List[np.ndarray]] = {}
        
        for idx, row in df_sorted.iterrows():
            orig_idx = int(row["index"])
            user_id = str(row["user_id"])
            
            history = user_history.get(user_id, [])
            hist_len = len(history)
            
            if hist_len > 0:
                # Take up to max_seq_len recent transactions
                recent = history[-self.max_seq_len:]
                k = len(recent)
                # Place at the end of the window: [:k] or [max_seq_len-k:]
                # We place at [max_seq_len-k:] so the most recent is at max_seq_len-1
                start_pos = self.max_seq_len - k
                sequences[orig_idx, start_pos:, :] = np.array(recent, dtype=np.float32)
                masks[orig_idx, start_pos:] = True
            
            # Now append current transaction step features to user's history for FUTURE txns
            step_feats = self.extract_step_features(row)
            if user_id not in user_history:
                user_history[user_id] = [step_feats]
            else:
                user_history[user_id].append(step_feats)
                # Keep history bounded to avoid unbounded memory
                if len(user_history[user_id]) > 100:
                    user_history[user_id] = user_history[user_id][-100:]
                    
        return sequences, masks


class TemporalGraphBuilder:
    """
    Constructs a tripartite/heterogeneous graph over Users, Payees, and Devices.
    Strictly prevents future edge leakage by adding edges only up to the specified boundary.
    Caches node embeddings for ultra-fast serving.
    """
    def __init__(self):
        self.node_to_id: Dict[str, int] = {}
        self.id_to_node: Dict[int, str] = {}
        self.node_type: Dict[int, str] = {}  # 'user', 'payee', 'device'
        self.node_features: Optional[np.ndarray] = None
        self.edge_index: Optional[torch.Tensor] = None
        self.edge_attr: Optional[torch.Tensor] = None
        self.cached_embeddings: Optional[Dict[str, np.ndarray]] = None

    def get_or_add_node(self, entity_str: str, entity_type: str) -> int:
        node_key = f"{entity_type}:{entity_str}"
        if node_key not in self.node_to_id:
            nid = len(self.node_to_id)
            self.node_to_id[node_key] = nid
            self.id_to_node[nid] = node_key
            self.node_type[nid] = entity_type
        return self.node_to_id[node_key]

    def build_graph_from_txns(
        self,
        df_txns: pd.DataFrame,
        max_timestamp: Optional[str] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Builds graph edges using transactions up to max_timestamp (inclusive).
        Returns:
            edge_index: torch.LongTensor shape (2, E)
            node_features: torch.FloatTensor shape (N_nodes, F)
        """
        df = df_txns.copy()
        if max_timestamp is not None:
            max_dt = pd.to_datetime(max_timestamp)
            if not pd.api.types.is_datetime64_any_dtype(df["created_at"]):
                df["created_at_dt"] = pd.to_datetime(df["created_at"], format="ISO8601")
            else:
                df["created_at_dt"] = df["created_at"]
            df = df[df["created_at_dt"] <= max_dt]

        # Reset mappings
        self.node_to_id.clear()
        self.id_to_node.clear()
        self.node_type.clear()

        edges_src: List[int] = []
        edges_dst: List[int] = []

        # Degree & volume accumulators
        node_degrees: Dict[int, int] = {}
        node_amounts: Dict[int, float] = {}

        for _, row in df.iterrows():
            u_str = str(row["user_id"])
            p_str = str(row["payee_id"])
            d_str = str(row["device_id"])
            amt = float(row.get("amount", 0.0))

            u_id = self.get_or_add_node(u_str, "user")
            p_id = self.get_or_add_node(p_str, "payee")
            d_id = self.get_or_add_node(d_str, "device")

            # Bidirectional User <-> Payee
            edges_src.extend([u_id, p_id])
            edges_dst.extend([p_id, u_id])

            # Bidirectional User <-> Device
            edges_src.extend([u_id, d_id])
            edges_dst.extend([d_id, u_id])

            # Update degrees and amounts
            for nid in [u_id, p_id, d_id]:
                node_degrees[nid] = node_degrees.get(nid, 0) + 1
                node_amounts[nid] = node_amounts.get(nid, 0.0) + amt

        N_nodes = len(self.node_to_id)
        # Node features: [log(deg+1)/5.0, log(vol+1)/12.0, is_user, is_payee, is_device] (5 dims)
        feat_matrix = np.zeros((N_nodes, 5), dtype=np.float32)
        for nid in range(N_nodes):
            deg = float(node_degrees.get(nid, 0))
            vol = float(node_amounts.get(nid, 0.0))
            ntype = self.node_type[nid]
            feat_matrix[nid, 0] = np.log1p(deg) / 5.0
            feat_matrix[nid, 1] = np.log1p(vol) / 12.0
            feat_matrix[nid, 2] = 1.0 if ntype == "user" else 0.0
            feat_matrix[nid, 3] = 1.0 if ntype == "payee" else 0.0
            feat_matrix[nid, 4] = 1.0 if ntype == "device" else 0.0

        edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)
        node_features = torch.tensor(feat_matrix, dtype=torch.float32)

        self.edge_index = edge_index
        self.node_features = feat_matrix
        return edge_index, node_features

    def get_node_embedding(self, entity_str: str, entity_type: str, default_dim: int = 32) -> np.ndarray:
        """Retrieves cached embedding or zero vector if unseen."""
        node_key = f"{entity_type}:{entity_str}"
        if self.cached_embeddings is not None and node_key in self.cached_embeddings:
            return self.cached_embeddings[node_key]
        return np.zeros(default_dim, dtype=np.float32)


class FinSureTransactionDataset(Dataset):
    """
    PyTorch Dataset providing:
    - sequences: (max_seq_len, step_dim)
    - masks: (max_seq_len,)
    - current_features: (36,)
    - labels: (1,) binary fraud
    - scam_types: (1,) 6-class integer
    """
    def __init__(
        self,
        sequences: np.ndarray,
        masks: np.ndarray,
        current_features: np.ndarray,
        labels: np.ndarray,
        scam_types: np.ndarray
    ):
        self.sequences = torch.tensor(sequences, dtype=torch.float32)
        self.masks = torch.tensor(masks, dtype=torch.bool)
        self.current_features = torch.tensor(current_features, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)
        self.scam_types = torch.tensor(scam_types, dtype=torch.long)

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        return (
            self.sequences[idx],
            self.masks[idx],
            self.current_features[idx],
            self.labels[idx],
            self.scam_types[idx]
        )
