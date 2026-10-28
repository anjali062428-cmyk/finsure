"""
FinSure Sequence Model: GRU / Transformer with Attention Pooling
Encodes user transaction history (up to 50 previous transactions) and exposes attention weights.
The target transaction is strictly excluded from the sequence input.
"""

import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional


class AttentionPooling(nn.Module):
    """
    Computes attention weights over the sequence steps and pools into a single representation.
    Returns:
        pooled: (batch_size, hidden_dim)
        attention_weights: (batch_size, seq_len)
    """
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn_net = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.Tanh(),
            nn.Linear(hidden_dim // 2, 1)
        )

    def forward(self, x: torch.Tensor, mask: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # x: (batch_size, seq_len, hidden_dim)
        # mask: (batch_size, seq_len) bool, True = valid, False = pad
        scores = self.attn_net(x).squeeze(-1)  # (batch_size, seq_len)
        
        # Mask out padded positions
        scores = scores.masked_fill(~mask, -1e9)
        
        # When entire sequence is masked (e.g. first transaction for user), avoid nan
        all_masked = (~mask).all(dim=-1, keepdim=True)  # (batch_size, 1)
        weights = F.softmax(scores, dim=-1)
        weights = torch.where(all_masked, torch.zeros_like(weights), weights)
        
        # Pooled representation
        pooled = torch.bmm(weights.unsqueeze(1), x).squeeze(1)  # (batch_size, hidden_dim)
        return pooled, weights


class FinSureSequenceModel(nn.Module):
    """
    Deep Sequence Model combining historical transaction sequence and current transaction features.
    Supports high-performance GRU with Attention Pooling (default) or Transformer encoder.
    Exposes attention weights for explainability and Threat Replay.
    """
    def __init__(
        self,
        step_dim: int = 12,
        current_dim: int = 36,
        hidden_dim: int = 64,
        num_layers: int = 1,
        dropout: float = 0.1,
        encoder_type: str = "gru"
    ):
        super().__init__()
        self.step_dim = step_dim
        self.current_dim = current_dim
        self.hidden_dim = hidden_dim
        self.encoder_type = encoder_type

        # Step feature projection
        self.step_proj = nn.Linear(step_dim, hidden_dim)
        
        if encoder_type == "gru":
            self.rnn = nn.GRU(
                input_size=hidden_dim,
                hidden_size=hidden_dim,
                num_layers=num_layers,
                batch_first=True,
                dropout=dropout if num_layers > 1 else 0.0
            )
        else:
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=hidden_dim,
                nhead=4,
                dim_feedforward=hidden_dim * 2,
                dropout=dropout,
                batch_first=True,
                activation="relu"
            )
            self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # Attention pooling
        self.pooling = AttentionPooling(hidden_dim)
        
        # Current transaction feature projection
        self.current_proj = nn.Sequential(
            nn.Linear(current_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 1)
        )

    def forward(
        self,
        seq: torch.Tensor,
        mask: torch.Tensor,
        current_feats: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        Args:
            seq: (batch_size, seq_len, step_dim)
            mask: (batch_size, seq_len) bool
            current_feats: (batch_size, current_dim)
        Returns:
            logits: (batch_size, 1)
            attention_weights: (batch_size, seq_len)
        """
        h_seq = self.step_proj(seq)
        
        if self.encoder_type == "gru":
            encoded, _ = self.rnn(h_seq)
        else:
            key_padding_mask = ~mask
            all_masked_rows = key_padding_mask.all(dim=1)
            safe_mask = key_padding_mask.clone()
            safe_mask[all_masked_rows, 0] = False
            encoded = self.transformer(h_seq, src_key_padding_mask=safe_mask)
            
        pooled_seq, attn_weights = self.pooling(encoded, mask)
        
        h_current = self.current_proj(current_feats)
        combined = torch.cat([pooled_seq, h_current], dim=-1)
        
        logits = self.classifier(combined)
        return logits, attn_weights

    def predict_proba(
        self,
        seq: torch.Tensor,
        mask: torch.Tensor,
        current_feats: torch.Tensor
    ) -> np.ndarray:
        """Inference helper returning numpy probabilities."""
        self.eval()
        with torch.no_grad():
            logits, _ = self.forward(seq, mask, current_feats)
            probs = torch.sigmoid(logits).cpu().numpy().flatten()
        return probs
